const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promisify database operations
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Database transaction wrapper
const transaction = async (callback) => {
    await run('BEGIN TRANSACTION');
    try {
        const result = await callback();
        await run('COMMIT');
        return result;
    } catch (err) {
        await run('ROLLBACK');
        throw err;
    }
};

// Initialize schema
async function initDb() {
    // 1. Configuration Table (Single Row)
    await run(`
        CREATE TABLE IF NOT EXISTS event_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            venue TEXT NOT NULL,
            start_time TEXT NOT NULL,
            max_capacity INTEGER NOT NULL,
            enforce_capacity INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Guest List Table
    await run(`
        CREATE TABLE IF NOT EXISTS guests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            ticket_tier TEXT DEFAULT 'general',
            signature TEXT NOT NULL,
            is_scanned INTEGER DEFAULT 0,
            scanned_at TEXT DEFAULT NULL,
            scanner_id TEXT DEFAULT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Audit/Scan Logs
    await run(`
        CREATE TABLE IF NOT EXISTS scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id TEXT,
            scanner_id TEXT NOT NULL,
            result_status TEXT NOT NULL,
            scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(guest_id) REFERENCES guests(id) ON DELETE SET NULL
        )
    `);

    // Seed default event config if empty
    const configExists = await get('SELECT id FROM event_config LIMIT 1');
    if (!configExists) {
        const defaultStartTime = new Date();
        defaultStartTime.setDate(defaultStartTime.getDate() + 1); // Set to tomorrow
        
        await run(`
            INSERT INTO event_config (event_name, venue, start_time, max_capacity, enforce_capacity)
            VALUES (?, ?, ?, ?, ?)
        `, [
            'Private Rooftop Celebration',
            'Skyline Terrace Lounge',
            defaultStartTime.toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
            150,
            1
        ]);
    }
}

module.exports = {
    db,
    run,
    get,
    all,
    transaction,
    initDb
};
