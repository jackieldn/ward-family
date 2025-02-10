async function fetchTflStatus() {
    try {
        let response = await fetch('/get-tfl-status');
        let data = await response.json();
        let statusContainer = document.getElementById('tfl-status');
        let lastUpdated = document.getElementById('last-updated');
        statusContainer.innerHTML = '';

        // Update last updated timestamp
        let now = new Date();
        lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;

        // Filter for selected lines
        const selectedLines = ["Central", "District", "Northern", "Victoria", "Hammersmith & City"];
        let filteredData = data.filter(line => selectedLines.includes(line.name));

        filteredData.forEach(line => {
            let className = line.name.toLowerCase().replace(/\s+/g, '-'); // Convert name to class format
            let status = line.lineStatuses[0].statusSeverityDescription;
            let statusClass = status.toLowerCase() === "good service" ? "good-service" : "disruption";

            let statusHTML = `
                <div class="status-box ${className} ${statusClass} fade-in">
                    <h3>${line.name}</h3>
                    <p>${status}</p>
                </div>
            `;
            statusContainer.innerHTML += statusHTML;
        });
    } catch (error) {
        console.error('Error fetching TfL status:', error);
        document.getElementById('tfl-status').innerHTML = '<p>Failed to load TfL updates.</p>';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    fetchTflStatus();
    setInterval(fetchTflStatus, 60000); // Auto-refresh every 10 seconds
});