document.addEventListener("DOMContentLoaded", function () {
    loadEquityData();

    // Ensure the button exists before adding the event listener
    const submitButton = document.getElementById("submit-equity");
    if (submitButton) {
        submitButton.addEventListener("click", function (event) {
            event.preventDefault();
            saveEquityData();
        });
    } else {
        console.error("Submit button not found!");
    }
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

            let equityEntries = data.equity_data;
            let totalPrincipal = data.total_principal_paid || 0;
            let totalInterest = data.total_interest_paid || 0;
            let remainingMortgage = 0;

            equityEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

            const historyContainer = document.getElementById("equity-history");
            historyContainer.innerHTML = "";

            equityEntries.forEach(entry => {
                remainingMortgage = entry.remaining_mortgage;

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
                            Equity: ${entry.equity_percent.toFixed(2)}%
                        </div>
                    </div>
                `;

                historyContainer.appendChild(categoryBox);
            });

            // Update Summary Boxes
            document.getElementById("remaining-mortgage-summary").innerText = `£${remainingMortgage.toLocaleString()}`;
            document.getElementById("total-principal-summary").innerText = `£${totalPrincipal.toLocaleString()}`;
            document.getElementById("total-interest-summary").innerText = `£${totalInterest.toLocaleString()}`;
        })
        .catch(error => console.error("Error fetching equity data:", error));
}


function saveEquityData() {
    const date = document.getElementById("equity-date").value;
    const currentValuation = document.getElementById("current-valuation").value;
    const principalPayment = document.getElementById("principal-payment").value;

    console.log("Sending data:", { date, currentValuation, principalPayment });

    if (!date || !currentValuation || !principalPayment) {
        alert("Please enter valid values for all fields.");
        return;
    }

    fetch("/add-equity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            date: date,
            current_valuation: parseFloat(currentValuation),
            principal_payment: parseFloat(principalPayment)
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        document.getElementById("equity-form").reset();
        loadEquityData();
    })
    .catch(error => console.error("Error saving equity data:", error));
}