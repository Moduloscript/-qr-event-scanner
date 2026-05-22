document.addEventListener('DOMContentLoaded', async () => {
    const ticketContainer = document.getElementById('ticket-container');
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');

    // Parse Query Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const name = urlParams.get('name');
    const sig = urlParams.get('sig');
    const tier = urlParams.get('tier') || 'General';

    if (!id || !name || !sig) {
        showError('Invalid ticket URL. Please ensure the ticket link contains the correct ID, Name, and Signature.');
        return;
    }

    try {
        // Fetch Public Event Details
        const response = await fetch('/api/event/info');
        if (!response.ok) {
            throw new Error('Failed to load event details.');
        }
        
        const eventConfig = await response.json();
        
        if (!eventConfig || !eventConfig.event_name) {
            showError('No event configuration is active at the moment.');
            return;
        }

        // Render details on ticket
        document.getElementById('event-name').textContent = eventConfig.event_name;
        document.getElementById('event-venue').textContent = eventConfig.venue;
        document.getElementById('guest-name').textContent = name;
        document.getElementById('ticket-tier').textContent = tier;
        
        // Format start time
        if (eventConfig.start_time) {
            const date = new Date(eventConfig.start_time);
            document.getElementById('event-time').textContent = date.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Prepare QR Code payload
        const qrPayload = JSON.stringify({
            ticketId: id,
            guestName: name,
            signature: sig
        });

        // Generate QR code inside #qrcode
        new QRCode(document.getElementById('qrcode'), {
            text: qrPayload,
            width: 220,
            height: 220,
            colorDark: '#0e0f17',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        ticketContainer.style.display = 'block';
    } catch (err) {
        console.error(err);
        showError('Unable to display ticket details. System failed to fetch event configuration: ' + err.message);
    }

    function showError(message) {
        errorText.textContent = message;
        errorContainer.style.display = 'block';
    }
});
