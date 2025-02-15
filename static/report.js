document.addEventListener("DOMContentLoaded", function () {
    console.log("📊 Report script loaded!");

    const fetchReportBtn = document.getElementById("fetch-report");
    if (fetchReportBtn) {
        fetchReportBtn.addEventListener("click", fetchBudgetData);
    } else {
        console.error("❌ Button #fetch-report not found!");
    }

    // Ensure the send email button works
    const sendEmailBtn = document.getElementById("send-email");
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener("click", function () {
            const email = document.getElementById("email-address").value;
            const month = document.getElementById("month").value;
            const year = document.getElementById("year").value;

            if (!email) {
                showNotification("❌ Please enter an email address.", "error");
                return;
            }

            console.log(`📧 Sending report to ${email} for ${month}/${year}`);

            fetch("/send-report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, year, month })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification("✅ Report sent successfully!", "success");
                } else {
                    showNotification(`❌ Failed to send report: ${data.message}`, "error");
                }
            })
            .catch(error => showNotification("❌ Error sending email.", "error"));
        });
    } else {
        console.error("❌ Button #send-email not found!");
    }
});

/* ==========================
    BANNER NOTIFICATION
========================== */

function showNotification(message, type = "success") {
    const banner = document.getElementById("notification-banner");
    const messageElement = document.getElementById("notification-message");

    // Set the message and styling
    messageElement.innerHTML = message;
    banner.classList.remove("hidden", "error", "success");
    banner.classList.add(type);

    // Show banner
    banner.style.display = "block";

    // Hide after 3 seconds
    setTimeout(() => {
        banner.classList.add("hidden");
    }, 3000);
}

/* ==========================
    FETCH BUDGET DATA
========================== */

function fetchBudgetData() {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;

    console.log(`📅 Fetching data for: ${year}-${month}`);

    fetch(`/report-data/${year}/${month}`)
        .then(response => response.json())
        .then(data => {
            console.log("✅ Report data received:", data);
            
            if (!Array.isArray(data)) {
                console.error("❌ Unexpected response format:", data);
                showNotification("❌ Error: Report data is not in the expected format.", "error");
                return;
            }
        
            const container = document.getElementById("budget-summary");
            container.innerHTML = "";
        
            let total = 0;
            let savingsTotal = 0;
            let sharedExpenses = 0;
            let jointSavings = 0;
            let giftPot = 0;
            let jackSavings = 0;
            let richardSavings = 0;
        
            const categoryMap = {};
            
            // Update for array response (no 'expenses' property)
            data.forEach(expense => {
                total += parseFloat(expense.amount);
                
                if (["Housing", "Food", "Utilities", "Pet", "Miscellaneous"].includes(expense.category)) {
                    sharedExpenses += parseFloat(expense.amount);
                }
                if (expense.title === "Joint Savings") {
                    jointSavings += parseFloat(expense.amount);
                }
                if (expense.title === "Gift Pot") {
                    giftPot += parseFloat(expense.amount);
                }
                if (expense.title === "Jack Savings") {
                    jackSavings += parseFloat(expense.amount);
                }
                if (expense.title === "Richard Savings") {
                    richardSavings += parseFloat(expense.amount);
                }
                if (expense.category === "Savings") {
                    savingsTotal += parseFloat(expense.amount);
                }
        
                if (!categoryMap[expense.category]) {
                    categoryMap[expense.category] = [];
                }
                categoryMap[expense.category].push(expense);
            });
        
            // ✅ Restore Transfer Calculations
            const sharedTotal = (sharedExpenses + jointSavings + giftPot) / 2;
            const jackTransfer = sharedTotal + jackSavings;
            const richardTransfer = sharedTotal + richardSavings;
        
            document.getElementById("jack-transfer").innerText = `£${jackTransfer.toFixed(2)}`;
            document.getElementById("richard-transfer").innerText = `£${richardTransfer.toFixed(2)}`;
            document.getElementById("overall-total").innerText = `£${total.toFixed(2)}`;
            document.getElementById("total-savings").innerText = `£${savingsTotal.toFixed(2)}`;
        
            // ✅ Generate Budget Categories
            Object.keys(categoryMap).forEach(category => {
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("budget-category-box");
            
                let titleHTML = `<div class='category-header'>${category}</div>`;
                let itemsHTML = "<div class='budget-items-container'>";
                let categoryTotal = 0;
            
                categoryMap[category].forEach(expense => {
                    itemsHTML += `<div class="budget-item">
                        <span class="item-title">${expense.title}</span>
                        <span class="item-amount">£${expense.amount.toFixed(2)}</span>
                    </div>`;
                    categoryTotal += expense.amount;
                });
            
                itemsHTML += "</div>";
            
                const totalHTML = `<div class='budget-total'>Total: £${categoryTotal.toFixed(2)}</div>`;
            
                categoryDiv.innerHTML = titleHTML + itemsHTML + totalHTML;
                container.appendChild(categoryDiv);
            });
        })
        .catch(error => {
            console.error("❌ Error loading budget data:", error);
            showNotification("❌ Failed to load budget data.", "error");
        });
    }