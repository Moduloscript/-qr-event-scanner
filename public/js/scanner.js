let html5QrcodeScanner = null;
let scannerToken = '';
let isOverlayActive = false;
let overlayTimeout = null;
let guestList = [];

// Web Audio API Sound Synthesizer
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSuccessSound() {
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, audioCtx.currentTime); // High pitch pleasant beep
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
        console.error('Failed to play sound:', e);
    }
}

function playErrorSound() {
    try {
        initAudio();
        // Play double low buzzer sound
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.15);

        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(150, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.15);
        }, 200);
    } catch (e) {
        console.error('Failed to play sound:', e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    scannerToken = urlParams.get('token');

    if (!scannerToken) {
        document.getElementById('auth-warning').style.display = 'block';
        return;
    }

    document.getElementById('scanner-interface').style.display = 'block';
    
    // Load Event Info
    await loadEventInfo();
    
    // Initialize QR Code Scanner
    startCameraScanner();
});

async function loadEventInfo() {
    try {
        const response = await fetch('/api/event/info');
        if (response.ok) {
            const data = await response.json();
            if (data && data.event_name) {
                document.getElementById('scanner-subtitle').textContent = `${data.event_name} @ ${data.venue}`;
            }
        }
    } catch (err) {
        console.error('Error fetching event info:', err);
    }
}

// -------------------------------------------------------------
// QR SCANNER CONTROLLER
// -------------------------------------------------------------
function startCameraScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }

    html5QrcodeScanner = new Html5Qrcode('reader');
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Camera startup failed, requesting choices", err);
        // Fallback to manual selection button if facingMode environment fails
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                html5QrcodeScanner.start(
                    devices[0].id,
                    config,
                    onScanSuccess,
                    onScanFailure
                );
            }
        });
    });
}

function stopCameraScanner() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch(err => console.error(err));
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    if (isOverlayActive) return;

    let payload;
    try {
        payload = JSON.parse(decodedText);
    } catch (e) {
        showFeedbackOverlay('INVALID_SIGNATURE', 'Invalid QR Code format - payload is not valid JSON.');
        playErrorSound();
        return;
    }

    if (!payload.ticketId || !payload.guestName || !payload.signature) {
        showFeedbackOverlay('INVALID_SIGNATURE', 'Incomplete QR Ticket: Missing signature metadata.');
        playErrorSound();
        return;
    }

    // Call API validation endpoint
    try {
        isOverlayActive = true;
        const response = await fetch('/api/scanner/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scanner-token': scannerToken
            },
            body: JSON.stringify({
                ticketId: payload.ticketId,
                guestName: payload.guestName,
                signature: payload.signature,
                scannerId: 'web-camera'
            })
        });

        const data = await response.json();
        
        if (response.ok && data.status === 'VALID') {
            playSuccessSound();
            showFeedbackOverlay('VALID', `Welcome, ${data.guest.name}`, data.guest.ticketTier);
        } else {
            playErrorSound();
            const message = data.error || 'Check-in failed.';
            showFeedbackOverlay(data.status || 'INVALID_SIGNATURE', message, data.guest ? data.guest.name : null);
        }
    } catch (err) {
        playErrorSound();
        showFeedbackOverlay('INVALID_SIGNATURE', 'Network Error: Cannot connect to check-in server.');
        isOverlayActive = false;
    }
}

function onScanFailure(error) {
    // Silent failure on scanning frames (standard behavior for html5-qrcode)
}

// -------------------------------------------------------------
// OVERLAY SYSTEM
// -------------------------------------------------------------
function showFeedbackOverlay(status, message, subDetail = '') {
    const overlay = document.getElementById('scan-overlay');
    const title = document.getElementById('overlay-title');
    const desc = document.getElementById('overlay-desc');
    const icon = document.getElementById('overlay-icon');

    // Clean previous class list
    overlay.className = 'scan-overlay';
    isOverlayActive = true;

    if (status === 'VALID') {
        overlay.classList.add('scan-overlay-success');
        icon.textContent = '✅';
        title.textContent = 'VALID TICKET';
        desc.innerHTML = `<strong>${message}</strong><br><span style="font-size: 0.9em; text-transform: uppercase;">Tier: ${subDetail}</span>`;
        
        // Auto-dismiss valid scan after 2.5 seconds
        triggerAutoDismiss(2500);
    } else {
        overlay.classList.add('scan-overlay-error');
        icon.textContent = status === 'DUPLICATE' ? '❌' : '⚠️';
        title.textContent = status.replace('_', ' ');
        
        if (status === 'DUPLICATE') {
            desc.innerHTML = `<strong>${message}</strong><br>Guest: ${subDetail}`;
        } else if (status === 'CAPACITY_EXCEEDED') {
            desc.innerHTML = `<strong>${message}</strong><br>Guest: ${subDetail}`;
        } else {
            desc.textContent = message;
        }

        // Auto-dismiss errors after 4 seconds
        triggerAutoDismiss(4000);
    }

    overlay.classList.add('show');
}

function triggerAutoDismiss(delay) {
    if (overlayTimeout) clearTimeout(overlayTimeout);
    overlayTimeout = setTimeout(dismissOverlay, delay);
}

function dismissOverlay() {
    const overlay = document.getElementById('scan-overlay');
    overlay.classList.remove('show');
    if (overlayTimeout) clearTimeout(overlayTimeout);
    
    // Tiny delay to ensure overlay hides before re-allowing scans
    setTimeout(() => {
        isOverlayActive = false;
    }, 300);
}

// -------------------------------------------------------------
// TAB CONTROLLER & GUEST LOOKUP
// -------------------------------------------------------------
function switchTab(tabId) {
    // Reset tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Set target tab active
    const targetTab = document.getElementById(tabId);
    targetTab.classList.add('active');
    
    // Update active button
    const btnIndex = tabId === 'scan-tab' ? 0 : 1;
    document.querySelectorAll('.tab-btn')[btnIndex].classList.add('active');

    if (tabId === 'scan-tab') {
        startCameraScanner();
    } else {
        stopCameraScanner();
        loadLookupGuests();
    }
}

async function loadLookupGuests(searchVal = '') {
    try {
        const response = await fetch(`/api/scanner/guests?token=${scannerToken}&search=${encodeURIComponent(searchVal)}`);
        if (!response.ok) throw new Error('Failed to retrieve guest list.');
        
        const data = await response.json();
        guestList = data.guests;
        renderLookupList();
    } catch (err) {
        console.error(err);
        document.getElementById('guest-lookup-results').innerHTML = `<p style="color: var(--error); text-align: center; padding: 20px;">Error: ${err.message}</p>`;
    }
}

function renderLookupList() {
    const container = document.getElementById('guest-lookup-results');
    
    if (guestList.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">No guests matching search</p>`;
        return;
    }

    container.innerHTML = guestList.map(guest => `
        <div class="guest-item">
            <div>
                <div style="font-weight: 600; color: #ffffff;">${escapeHTML(guest.name)}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHTML(guest.email)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; text-transform: uppercase;">
                    Tier: ${escapeHTML(guest.ticket_tier)}
                </div>
            </div>
            <div>
                ${guest.is_scanned === 1 
                    ? `<span class="badge badge-success" style="font-size: 0.7rem;">Scanned</span>`
                    : `<button class="btn btn-primary btn-sm" onclick="manualCheckIn('${guest.id}', '${escapeJS(guest.name)}')">Check In</button>`
                }
            </div>
        </div>
    `).join('');
}

let searchTimeout = null;
function handleSearch() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const val = document.getElementById('search-input').value;
        loadLookupGuests(val);
    }, 300);
}

async function manualCheckIn(guestId, name) {
    if (!confirm(`Are you sure you want to manually check-in guest: "${name}"?`)) {
        return;
    }

    try {
        const response = await fetch('/api/scanner/checkin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scanner-token': scannerToken
            },
            body: JSON.stringify({
                guestId: guestId,
                scannerId: 'manual-lookup'
            })
        });

        const data = await response.json();
        
        if (response.ok && data.status === 'VALID') {
            playSuccessSound();
            showFeedbackOverlay('VALID', `Checked In: ${data.guest.name}`, data.guest.ticketTier);
            // Refresh lookup list
            loadLookupGuests(document.getElementById('search-input').value);
        } else {
            playErrorSound();
            showFeedbackOverlay(data.status || 'INVALID_SIGNATURE', data.error || 'Manual check-in failed.');
        }
    } catch (err) {
        playErrorSound();
        showFeedbackOverlay('INVALID_SIGNATURE', 'Network error checking in guest.');
    }
}

// Helpers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function escapeJS(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
}
