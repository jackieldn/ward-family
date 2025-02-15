document.addEventListener("DOMContentLoaded", function () {
    console.log("📊 Dashboard script loaded!");

    if (document.getElementById("utilitiesChart")) {
        fetchAndRenderMonthlyTotalChart();
    }

    if (document.getElementById("currentMonthData")) {
        fetchAndRenderCurrentMonthData(); // Ensure this function runs properly
    }
});

// ** Fetch and Render Charts Only If Needed **
function fetchAndRenderMonthlyTotalChart() {
    fetch("/get-monthly-total-data")
        .then(response => response.json())
        .then(data => renderMonthlyTotalChart(data.months, data.totals))
        .catch(error => console.error("Error fetching monthly total data:", error));
}

// ** Chart Rendering **
function renderMonthlyTotalChart(months, totals) {
    const ctx = document.getElementById("utilitiesChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: months.map(month => new Date(`${month}-01T00:00:00`).toLocaleString('en-GB', { month: 'short' })),
            datasets: [{ label: "Monthly Total", data: totals, backgroundColor: "rgba(207, 93, 162, 1)", borderRadius: 20 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 6
                    }
                }
            }
        }
        
    });
}

function fetchAndRenderCurrentMonthData() {
    fetch("/get-current-month-data")
        .then(response => response.json())
        .then(data => {
            console.log("✅ Current month data received:", data);
            const container = document.getElementById("currentMonthData");
            if (!container) return;
            
            container.innerHTML = "";
            if (!data || data.length === 0) {
                container.innerHTML = "<p>No data available for this month.</p>";
                return;
            }

            data.forEach(entry => {
                const div = document.createElement("div");
                div.classList.add("category-box-report");
                div.innerHTML = `<h3>${entry.category}</h3><p>£${(entry.total || 0).toFixed(2)}</p>`;
                container.appendChild(div);
            });
        })
        .catch(error => console.error("❌ Error fetching current month data:", error));
}

fetch("/get-current-month-data")
    .then(response => response.json())
    .then(data => {
        console.log("✅ Current month data received:", data);
        const container = document.getElementById("currentMonthData");
        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = "<p>No data available for this month.</p>";
            return;
        }

        data.forEach(entry => {
            const div = document.createElement("div");
            div.classList.add("category-box-report");
            div.innerHTML = `
                <h3>${entry.category}</h3>
                <p>£${(entry.total || 0).toFixed(2)}</p>
            `;
            container.appendChild(div);
        });
    })
    .catch(error => console.error("❌ Error fetching current month data:", error));

