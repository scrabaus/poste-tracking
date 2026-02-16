document.getElementById('trackBtn').addEventListener('click', trackPackage);
document.getElementById('trackingCode').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        trackPackage();
    }
});

async function trackPackage() {
    const code = document.getElementById('trackingCode').value.trim();
    const btn = document.getElementById('trackBtn');
    const btnText = btn.querySelector('.btn-text');
    const loader = document.getElementById('btnLoader');
    const results = document.getElementById('results');
    const errorMsg = document.getElementById('error-message');
    const errorText = document.getElementById('errorText');

    if (!code) return;

    // Reset UI
    results.classList.add('hidden');
    errorMsg.classList.add('hidden');

    // Loading State
    btnText.style.display = 'none';
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/track/${code}`);
        const data = await response.json();

        if (response.ok) {
            displayResults(data);
        } else {
            throw new Error(data.error || 'Errore durante il tracciamento');
        }

    } catch (error) {
        console.error(error);
        errorText.textContent = error.message;
        errorMsg.classList.remove('hidden');
    } finally {
        // Reset Loading State
        btnText.style.display = 'block';
        loader.style.display = 'none';
        btn.disabled = false;
    }
}

function displayResults(data) {
    const results = document.getElementById('results');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const timeline = document.getElementById('timeline');
    const rawData = document.getElementById('rawData');

    results.classList.remove('hidden');

    // Show raw data for debug
    rawData.textContent = JSON.stringify(data, null, 2);

    // Update Status Card
    statusTitle.textContent = data.status || "Stato Sconosciuto";
    statusDesc.textContent = `Codice: ${data.code}`;

    // Clear previous timeline
    timeline.innerHTML = '';

    // Display timeline from server response
    if (data.raw_response && data.raw_response.timeline && data.raw_response.timeline.length > 0) {
        data.raw_response.timeline.forEach(event => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-date">${event.date || 'Data N/D'}</div>
                <div class="timeline-content">
                    <strong>${event.status}</strong>
                    ${event.location ? `<br><small>${event.location}</small>` : ''}
                </div>
            `;
            timeline.appendChild(item);
        });
    } else if (data.history && data.history.length > 0) {
        // Fallback for old response format
        data.history.forEach(event => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-date">${event.date || 'Data N/D'}</div>
                <div class="timeline-content">${event.description || event.status}</div>
            `;
            timeline.appendChild(item);
        });
    } else {
        // No timeline available
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-date">-</div>
            <div class="timeline-content">Dettagli cronologia non disponibili</div>
        `;
        timeline.appendChild(item);
    }
}
