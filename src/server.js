require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
const cryptoHelper = require('./crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const SIGNING_KEY = process.env.SIGNING_KEY || 'supersecretcryptokey';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SCANNER_TOKEN = process.env.SCANNER_TOKEN || 'scansecret123';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// MIDDLEWARES
// ==========================================

// Admin Authentication Middleware
function adminAuth(req, res, next) {
    const password = req.headers['x-admin-password'] || req.query.admin_password;
    if (password === ADMIN_PASSWORD) {
        return next();
    }
    
    // Check Authorization header (Bearer token style)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === ADMIN_PASSWORD) {
            return next();
        }
    }
    
    res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
}

// Scanner Token Middleware
function scannerAuth(req, res, next) {
    const token = req.headers['x-scanner-token'] || req.query.token || req.body.token;
    if (token === SCANNER_TOKEN) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: Invalid Scanner Token' });
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Public Event Information (No authentication required)
app.get('/api/event/info', async (req, res) => {
    try {
        const config = await db.get('SELECT event_name, venue, start_time FROM event_config ORDER BY id DESC LIMIT 1');
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve event information', details: err.message });
    }
});

// 1. Get Event Configuration
app.get('/api/admin/config', adminAuth, async (req, res) => {
    try {
        const config = await db.get('SELECT * FROM event_config ORDER BY id DESC LIMIT 1');
        res.json({ ...config, scanner_token: SCANNER_TOKEN });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve event configuration', details: err.message });
    }
});

// 2. Update Event Configuration
app.post('/api/admin/config', adminAuth, async (req, res) => {
    const { event_name, venue, start_time, max_capacity, enforce_capacity } = req.body;
    
    if (!event_name || !venue || !start_time || max_capacity === undefined) {
        return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    try {
        const enforce = enforce_capacity ? 1 : 0;
        // Insert a new config row or update the latest (we just keep a single row)
        const latest = await db.get('SELECT id FROM event_config ORDER BY id DESC LIMIT 1');
        if (latest) {
            await db.run(
                `UPDATE event_config 
                 SET event_name = ?, venue = ?, start_time = ?, max_capacity = ?, enforce_capacity = ?
                 WHERE id = ?`,
                [event_name, venue, start_time, parseInt(max_capacity), enforce, latest.id]
            );
        } else {
            await db.run(
                `INSERT INTO event_config (event_name, venue, start_time, max_capacity, enforce_capacity)
                 VALUES (?, ?, ?, ?, ?)`,
                [event_name, venue, start_time, parseInt(max_capacity), enforce]
            );
        }
        res.json({ message: 'Configuration updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update configuration', details: err.message });
    }
});

// 3. Get Guest List & Stats
app.get('/api/admin/guests', adminAuth, async (req, res) => {
    try {
        const guests = await db.all('SELECT * FROM guests ORDER BY created_at DESC');
        
        // Compute stats
        const total = guests.length;
        const scanned = guests.filter(g => g.is_scanned === 1).length;
        
        res.json({ guests, stats: { total, scanned } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve guest list', details: err.message });
    }
});

// 4. Add Single Guest
app.post('/api/admin/guests', adminAuth, async (req, res) => {
    const { name, email, ticket_tier } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required' });
    }

    try {
        const id = uuidv4();
        const tier = ticket_tier || 'general';
        const signature = cryptoHelper.generateSignature(id, name, SIGNING_KEY);

        await db.run(
            `INSERT INTO guests (id, name, email, ticket_tier, signature)
             VALUES (?, ?, ?, ?, ?)`,
            [id, name.trim(), email.trim().toLowerCase(), tier.trim(), signature]
        );

        res.status(201).json({
            id,
            name,
            email,
            ticket_tier: tier,
            signature,
            ticketUrl: `/ticket.html?id=${id}&name=${encodeURIComponent(name)}&sig=${signature}`
        });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A guest with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to register guest', details: err.message });
    }
});

// 5. Bulk Import Guests via CSV
app.post('/api/admin/guests/bulk', adminAuth, async (req, res) => {
    const { csvData } = req.body;
    if (!csvData) {
        return res.status(400).json({ error: 'CSV data is required' });
    }

    try {
        // Simple CSV parser
        const lines = csvData.split(/\r?\n/);
        const addedGuests = [];
        const errors = [];

        await db.transaction(async () => {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Handle header row detection
                if (i === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
                    continue;
                }

                // Split by comma or semicolon
                const parts = line.split(/[,;]/).map(p => p.replace(/^["']|["']$/g, '').trim());
                if (parts.length < 2) {
                    errors.push(`Row ${i + 1}: Insufficient fields (minimum Name and Email required)`);
                    continue;
                }

                const name = parts[0];
                const email = parts[1];
                const tier = parts[2] || 'general';

                if (!name || !email) {
                    errors.push(`Row ${i + 1}: Name or Email cannot be blank`);
                    continue;
                }

                const id = uuidv4();
                const signature = cryptoHelper.generateSignature(id, name, SIGNING_KEY);

                try {
                    await db.run(
                        `INSERT INTO guests (id, name, email, ticket_tier, signature)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id, name, email.toLowerCase(), tier, signature]
                    );
                    addedGuests.push({ id, name, email, ticket_tier: tier, signature });
                } catch (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        errors.push(`Row ${i + 1}: Email '${email}' is already registered`);
                    } else {
                        errors.push(`Row ${i + 1}: DB Error - ${err.message}`);
                    }
                }
            }
        });

        res.json({
            successCount: addedGuests.length,
            errors,
            added: addedGuests
        });
    } catch (err) {
        res.status(500).json({ error: 'Transaction failed during bulk import', details: err.message });
    }
});

// 6. Delete Guest
app.delete('/api/admin/guests/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.run('DELETE FROM guests WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Guest not found' });
        }
        res.json({ message: 'Guest deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete guest', details: err.message });
    }
});

// 6.1. Edit Guest
app.put('/api/admin/guests/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { name, email, ticket_tier } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required' });
    }

    try {
        // Check guest exists
        const existing = await db.get('SELECT * FROM guests WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        // Check email uniqueness (if changed)
        const emailLower = email.trim().toLowerCase();
        if (emailLower !== existing.email) {
            const emailConflict = await db.get('SELECT id FROM guests WHERE email = ? AND id != ?', [emailLower, id]);
            if (emailConflict) {
                return res.status(400).json({ error: 'A guest with this email already exists' });
            }
        }

        // Re-generate signature if name changed (name is part of signed payload)
        const nameTrimmed = name.trim();
        const tier = (ticket_tier || existing.ticket_tier).trim();
        let signature = existing.signature;
        if (nameTrimmed !== existing.name.trim()) {
            signature = cryptoHelper.generateSignature(id, nameTrimmed, SIGNING_KEY);
        }

        await db.run(
            `UPDATE guests SET name = ?, email = ?, ticket_tier = ?, signature = ? WHERE id = ?`,
            [nameTrimmed, emailLower, tier, signature, id]
        );

        res.json({
            id,
            name: nameTrimmed,
            email: emailLower,
            ticket_tier: tier,
            signature,
            ticketUrl: `/ticket.html?id=${id}&name=${encodeURIComponent(nameTrimmed)}&sig=${signature}`
        });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'A guest with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to update guest', details: err.message });
    }
});

// 6.5. Get Guest List for Scanner Manual Lookup (Scanner Token Required)
app.get('/api/scanner/guests', scannerAuth, async (req, res) => {
    const search = req.query.search || '';
    try {
        let guests;
        if (search) {
            const queryParam = `%${search}%`;
            guests = await db.all(
                `SELECT id, name, email, ticket_tier, is_scanned, scanned_at 
                 FROM guests 
                 WHERE name LIKE ? OR email LIKE ?
                 ORDER BY name ASC`,
                [queryParam, queryParam]
            );
        } else {
            guests = await db.all(
                `SELECT id, name, email, ticket_tier, is_scanned, scanned_at 
                 FROM guests 
                 ORDER BY name ASC`
            );
        }
        res.json({ guests });
    } catch (err) {
        res.status(500).json({ error: 'Failed to search guest list', details: err.message });
    }
});

// 6.6. Manual Check-in for Scanner (Scanner Token Required)
app.post('/api/scanner/checkin', scannerAuth, async (req, res) => {
    const { guestId, scannerId } = req.body;
    const sId = scannerId || 'manual-lookup';

    if (!guestId) {
        return res.status(400).json({ error: 'guestId is required' });
    }

    try {
        const result = await db.transaction(async () => {
            const guest = await db.get('SELECT * FROM guests WHERE id = ?', [guestId]);
            if (!guest) {
                return {
                    httpStatus: 404,
                    response: { error: 'Guest not found' }
                };
            }

            if (guest.is_scanned === 1) {
                await db.run(
                    'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                    [guest.id, sId, 'DUPLICATE']
                );
                return {
                    httpStatus: 200,
                    response: {
                        status: 'DUPLICATE',
                        error: 'This ticket has already been checked in.',
                        guest: { name: guest.name, ticketTier: guest.ticket_tier },
                        firstScannedAt: guest.scanned_at
                    }
                };
            }

            // Check Capacity Constraints
            const config = await db.get('SELECT max_capacity, enforce_capacity FROM event_config LIMIT 1');
            if (config && config.enforce_capacity === 1) {
                const countRow = await db.get('SELECT COUNT(*) as count FROM guests WHERE is_scanned = 1');
                if (countRow.count >= config.max_capacity) {
                    await db.run(
                        'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                        [guest.id, sId, 'CAPACITY_EXCEEDED']
                    );
                    return {
                        httpStatus: 200,
                        response: {
                            status: 'CAPACITY_EXCEEDED',
                            error: 'Check-in blocked: Venue has reached maximum capacity.',
                            guest: { name: guest.name, ticketTier: guest.ticket_tier }
                        }
                    };
                }
            }

            const scannedTime = new Date().toISOString();
            await db.run(
                'UPDATE guests SET is_scanned = 1, scanned_at = ?, scanner_id = ? WHERE id = ?',
                [scannedTime, sId, guest.id]
            );
            await db.run(
                'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                [guest.id, sId, 'VALID']
            );

            return {
                httpStatus: 200,
                response: {
                    status: 'VALID',
                    guest: { name: guest.name, ticketTier: guest.ticket_tier }
                }
            };
        });

        res.status(result.httpStatus).json(result.response);
    } catch (err) {
        res.status(500).json({ error: 'Manual check-in transaction error', details: err.message });
    }
});

// 7. Atomic Ticket Scan Validation
app.post('/api/scanner/validate', scannerAuth, async (req, res) => {
    const { ticketId, guestName, signature, scannerId } = req.body;
    const sId = scannerId || 'web-scanner-01';

    if (!ticketId || !guestName || !signature) {
        return res.status(400).json({
            status: 'INVALID_SIGNATURE',
            error: 'Missing verification fields: ticketId, guestName, and signature are required.'
        });
    }

    // Cryptographic validation of signature offline first to prevent DB lookup overhead on bad scans
    const isAuthentic = cryptoHelper.verifySignature(ticketId, guestName, signature, SIGNING_KEY);
    if (!isAuthentic) {
        try {
            await db.run(
                'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (NULL, ?, ?)',
                [sId, 'INVALID_SIGNATURE']
            );
        } catch (err) { /* ignore audit write error here */ }

        return res.status(400).json({
            status: 'INVALID_SIGNATURE',
            error: 'Counterfeit ticket verification failed. Mismatched security signature.'
        });
    }

    try {
        const result = await db.transaction(async () => {
            // Find guest
            const guest = await db.get('SELECT * FROM guests WHERE id = ?', [ticketId]);
            if (!guest) {
                return {
                    httpStatus: 404,
                    response: {
                        status: 'INVALID_SIGNATURE',
                        error: 'Ticket valid cryptographically but guest record not found in system.'
                    }
                };
            }

            // Check if name matches exactly what's on the ticket database records
            if (guest.name.trim().toLowerCase() !== guestName.trim().toLowerCase()) {
                await db.run(
                    'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                    [guest.id, sId, 'INVALID_SIGNATURE']
                );
                return {
                    httpStatus: 400,
                    response: {
                        status: 'INVALID_SIGNATURE',
                        error: 'Ticket name mismatch.'
                    }
                };
            }

            // Check duplicate check-in
            if (guest.is_scanned === 1) {
                await db.run(
                    'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                    [guest.id, sId, 'DUPLICATE']
                );
                return {
                    httpStatus: 200,
                    response: {
                        status: 'DUPLICATE',
                        error: 'This ticket has already been scanned.',
                        guest: { name: guest.name, ticketTier: guest.ticket_tier },
                        firstScannedAt: guest.scanned_at
                    }
                };
            }

            // Check Capacity Constraints
            const config = await db.get('SELECT max_capacity, enforce_capacity FROM event_config LIMIT 1');
            if (config && config.enforce_capacity === 1) {
                const countRow = await db.get('SELECT COUNT(*) as count FROM guests WHERE is_scanned = 1');
                if (countRow.count >= config.max_capacity) {
                    await db.run(
                        'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                        [guest.id, sId, 'CAPACITY_EXCEEDED']
                    );
                    return {
                        httpStatus: 200,
                        response: {
                            status: 'CAPACITY_EXCEEDED',
                            error: 'Check-in blocked: Venue has reached maximum capacity.',
                            guest: { name: guest.name, ticketTier: guest.ticket_tier }
                        }
                    };
                }
            }

            // Accept entry
            const scannedTime = new Date().toISOString();
            await db.run(
                'UPDATE guests SET is_scanned = 1, scanned_at = ?, scanner_id = ? WHERE id = ?',
                [scannedTime, sId, guest.id]
            );
            await db.run(
                'INSERT INTO scan_logs (guest_id, scanner_id, result_status) VALUES (?, ?, ?)',
                [guest.id, sId, 'VALID']
            );

            return {
                httpStatus: 200,
                response: {
                    status: 'VALID',
                    guest: { name: guest.name, ticketTier: guest.ticket_tier }
                }
            };
        });

        res.status(result.httpStatus).json(result.response);
    } catch (err) {
        res.status(500).json({ error: 'Server database transaction error', details: err.message });
    }
});

// Handle fallback SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
db.initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`[QR SCANNER SERVER] Running at http://localhost:${PORT}`);
        console.log(`[QR SCANNER SERVER] Admin Password: ${ADMIN_PASSWORD}`);
        console.log(`[QR SCANNER SERVER] Scanner Token: ${SCANNER_TOKEN}`);
    });
}).catch(err => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
});
