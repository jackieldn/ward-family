document.addEventListener("DOMContentLoaded", function () {
    const lineContainer = document.getElementById("line-status-container");

    // WIDGET 1 - Live TfL status //

    // Fetch real-time status from Flask API
    async function fetchLineStatus() {
      try {
        const response = await fetch('/get-tfl-status');
        const data = await response.json();
  
        // Clear existing line items
        lineContainer.innerHTML = `
          <div class="widget-banner">Line Status</div>
        `;
  
        // Filter for only District, Central, Victoria, and Northern lines
        const selectedLines = ['District', 'Central', 'Victoria', 'Northern'];
        const filteredLines = data.filter(line =>
          selectedLines.includes(line.name)
        );
  
        // Create line status elements
        filteredLines.forEach(line => {
          const lineItem = document.createElement('div');
          lineItem.classList.add('line-item');
          lineItem.classList.add(
            line.lineStatuses[0]?.statusSeverityDescription === 'Good Service'
              ? 'good-service'
              : 'disruption'
          );
  
          lineItem.innerHTML = `
            <span class="line-name">${line.name}</span>
            <span class="line-status">${line.lineStatuses[0]?.statusSeverityDescription || 'Unknown'}</span>
          `;
  
          lineContainer.appendChild(lineItem);
        });
  
        // Add final spacing
        const lastItem = document.querySelector('.line-item:last-child');
        if (lastItem) {
          lastItem.style.marginBottom = '15px';
        }
  
      } catch (error) {
        console.error('Failed to fetch line status:', error);
        lineContainer.innerHTML += `
          <div class="line-item disruption">
            <span class="line-name">Error</span>
            <span class="line-status">Unable to load updates</span>
          </div>
        `;
      }
    }
  
    // Fetch status on page load and every 30 seconds
    fetchLineStatus();
    setInterval(fetchLineStatus, 30000); // Refresh every 30 seconds
  });

  // WIDGET 2 - Stations and trains //
  document.addEventListener("DOMContentLoaded", function () {
    const stationContainer = document.getElementById("station-arrivals");
    const stationTabs = document.querySelectorAll(".station-tab");

    const stationIds = {
        bow: "940GZZLUBWR",
        vauxhall: "940GZZLUVXL",
        embankment: "940GZZLUEMB",
        finchley: "940GZZLUFYC"
      };
  
    const stationFilters = {
        bow: { id: "940GZZLUBWR", line: "District", direction: "westbound" },
        vauxhall: { id: "940GZZLUVXL", line: "Victoria", direction: "northbound" },
        embankment: { id: "940GZZLUEMB", line: "Northern", direction: "northbound" },
        finchley: { id: "940GZZLUFYC", line: "Northern", direction: "southbound" }
      };
      
      // Load station data on tab click
      stationTabs.forEach(tab => {
        tab.addEventListener("click", () => {
          const stationKey = tab.dataset.station; // Define stationKey here
          const { id, line, direction } = stationFilters[stationKey]; // Use correct station filter
      
          // Add log INSIDE the same scope
          console.log(`Fetching arrivals for ${stationKey}: Line ${line}, Direction ${direction}`);
      
          fetchArrivals(id, line, direction);
          
          // Set active state
          stationTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        });
      });   
  
// Fetch arrivals from Flask API
async function fetchArrivals(stationId, line, direction) {
    try {
      const response = await fetch(`/get-station-arrivals?stationId=${stationId}`);
      const arrivals = await response.json();
  
      // Filter by line and direction with safe checks
      const filteredArrivals = arrivals.filter(train =>
        (typeof train.line === 'string' && train.line.toLowerCase() === line.toLowerCase()) &&
        (typeof train.direction === 'string' && train.direction.toLowerCase() === direction.toLowerCase())
      );

      console.log("Received Arrivals Data:", arrivals);
        console.log("Filtered Arrivals Data:", filteredArrivals);

  
      // Display only first 3 trains
      const firstThree = filteredArrivals.slice(0, 3);
  
      stationContainer.innerHTML = firstThree.length > 0 ? firstThree.map((train, index) => `
        <div class="arrival-item">
          <span class="arrival-number ${train.line?.toLowerCase() || 'unknown'}">${index + 1}</span>
          <span class="arrival-destination">${train.destination || 'Unknown'}</span>
          <span class="arrival-time">${train.eta || '?'} mins</span>
        </div>
      `).join('') : `<div class="arrival-item disruption">No upcoming trains</div>`;
  
    } catch (error) {
      console.error("Failed to fetch station arrivals:", error);
      stationContainer.innerHTML = `<div class="arrival-item disruption">Failed to load arrivals</div>`;
    }
  }
  
  
// Auto-load Bow Road (District Westbound) arrivals
    const { id, line, direction } = stationFilters.bow;
    fetchArrivals(id, line, direction);
    document.querySelector('.station-tab[data-station="bow"]').classList.add('active');
  });

  // WIDGET 3 - Line Disruptions //

document.addEventListener("DOMContentLoaded", function () {
    const disruptionsContainer = document.getElementById("disruptions-list");
  
    // Lines we are tracking
    const disruptionLines = ['District', 'Central', 'Victoria', 'Northern'];
  
    // Fetch disruptions from Flask API
    async function fetchDisruptions() {
      try {
          const response = await fetch('/get-tfl-status');
          const data = await response.json();
          const disruptionsContainer = document.getElementById("disruptions-list");
  
          const disruptionLines = ['District', 'Central', 'Victoria', 'Northern'];
          const disruptions = data.filter(line =>
              disruptionLines.includes(line.name) && line.lineStatuses[0]?.statusSeverityDescription !== 'Good Service'
          );
  
          disruptionsContainer.innerHTML = disruptions.length > 0 ? disruptions.map(disruption => `
              <div class="disruption-item">
                  <div class="disruption-title">${disruption.name}</div>
                  <div class="disruption-description">${disruption.lineStatuses[0]?.reason || 'Service disruption reported'}</div>
              </div>
          `).join('') : `<div class="disruption-item">No current disruptions.</div>`;
  
      } catch (error) {
          console.error("Failed to fetch disruptions:", error);
      }
  }
  
  // Refresh every 60 seconds
  fetchDisruptions();
  setInterval(fetchDisruptions, 60000);
  });  