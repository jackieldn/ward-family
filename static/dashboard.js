document.addEventListener("DOMContentLoaded", function () {
    console.log("📊 Dashboard script loaded!");

    if (document.getElementById("utilitiesChart")) {
        fetchAndRenderMonthlyTotalChart();
    }
    if (document.getElementById("savingsChart")) {
        fetchAndRenderSavingsChart();
    }
    if (document.getElementById("currentMonthData")) {
        fetchAndRenderCurrentMonthData();
    }
});

// ** Fetch and Render Charts Only If Needed **
function fetchAndRenderMonthlyTotalChart() {
    fetch("/get-monthly-total-data")
        .then(response => response.json())
        .then(data => renderMonthlyTotalChart(data.months, data.totals))
        .catch(error => console.error("Error fetching monthly total data:", error));
}

function fetchAndRenderSavingsChart() {
    fetch("/get-monthly-savings-data")
        .then(response => response.json())
        .then(data => renderSavingsChart(data.months, data.totals))
        .catch(error => console.error("Error fetching monthly savings data:", error));
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
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderSavingsChart(months, totals) {
    const ctx = document.getElementById("savingsChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: months.map(month => new Date(`${month}-01T00:00:00`).toLocaleString('en-GB', { month: 'short' })),
            datasets: [{ label: "Savings", data: totals, backgroundColor: "rgba(116, 136, 43, 1)", borderRadius: 20 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}
