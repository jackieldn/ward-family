document.addEventListener("DOMContentLoaded", function () {
    loadEquityData(); // Ensure data loads on page load

    setTimeout(() => {
        const submitButton = document.getElementById("submit-equity");
        if (submitButton) {
            submitButton.addEventListener("click", function (event) {
                event.preventDefault();
                saveEquityData();
            });
        } else {
            console.error("Submit button not found!");
        }
    }, 500);
});


// Fetch and display existing house equity records
function loadEquityData() {
    fetch("/get-equity")
        .then(response => response.json())
        .then(data => {
            if (!data || !data.equity_data) {
                console.error("Invalid data format received:", data);
                return;
            }

            console.log("Equity data received:", data); // Debugging Log

            let equityEntries = data.equity_data;
            let totalPrincipal = data.total_principal_paid || 0;
            let totalInterest = data.total_interest_paid || 0;
            let remainingMortgage = equityEntries.length > 0 ? equityEntries[0].remaining_mortgage : INITIAL_MORTGAGE;

            equityEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

            const historyContainer = document.getElementById("equity-history");
            historyContainer.innerHTML = "";

            equityEntries.forEach(entry => {
                remainingMortgage = entry.remaining_mortgage;
                let equityPercent = entry.equity_percent !== undefined ? entry.equity_percent.toFixed(2) : "N/A";

                const categoryBox = document.createElement("div");
                categoryBox.classList.add("budget-category-box");

                categoryBox.innerHTML = `
                    <div class="category-header">${entry.date}</div>
                    <div class="budget-items-container">
                        <div class="budget-item">
                            <span>Current Valuation</span>
                            <span>£${entry.current_valuation.toLocaleString()}</span>
                        </div>
                        <div class="budget-item">
                            <span>Principal Payment</span>
                            <span>£${entry.principal_payment.toLocaleString()}</span>
                        </div>
                        <div class="budget-item">
                            <span>Remaining Mortgage</span>
                            <span>£${entry.remaining_mortgage.toLocaleString()}</span>
                        </div>
                        <div class="budget-total">
                            Equity: ${equityPercent}%
                        </div>
                    </div>
                `;

                historyContainer.appendChild(categoryBox);
            });

            // Update Summary Boxes
            document.getElementById("remaining-mortgage-summary").innerText = `£${remainingMortgage.toLocaleString()}`;
            document.getElementById("total-principal-summary").innerText = `£${totalPrincipal.toLocaleString()}`;
            document.getElementById("total-interest-summary").innerText = `£${totalInterest.toFixed(2)}`;
        })
        .catch(error => console.error("Error fetching equity data:", error));
}


function saveEquityData() {
    let date = document.getElementById("equity-date").value;
    let valuation = document.getElementById("current-valuation").value;
    let principal = document.getElementById("principal-payment").value;

    fetch("/add-equity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            date: date,
            current_valuation: valuation,
            principal_payment: principal
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);
        if (data.message) {
            alert("Equity data added successfully!");
            document.getElementById("equity-form").reset();  // Ensure form has correct ID
        }
    })
    .catch(error => console.error("Error saving equity data:", error));
}


    fetch("/add-equity", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(equityData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Server response:", data);
        if (data.error) {
            alert("Error: " + data.message);
        } else {
            alert("Equity data added successfully!");
            loadEquityData(); // Refresh displayed data
            document.getElementById("equity-form").reset(); // Reset form
        }
    })
    .catch(error => console.error("Error saving equity data:", error));

