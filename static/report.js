document.addEventListener("DOMContentLoaded", function () {
    console.log("📊 Report script loaded!");

    // Attach event listener to the "Fetch Report" button.
    const fetchReportBtn = document.getElementById("fetch-report");
    if (fetchReportBtn) {
        fetchReportBtn.addEventListener("click", fetchBudgetData);
    } else {
        console.error("❌ Fetch report button not found!");
    }

    // Attach event listener to the "Send Report" (email) button.
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
                headers: { "Content-Type": "application/json" },
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
        console.error("❌ Send email button not found!");
    }
});

// Function to show notifications.
function showNotification(message, type = "success") {
    const banner = document.getElementById("notification-banner");
    const messageElement = document.getElementById("notification-message");
    if (banner && messageElement) {
        messageElement.innerText = message;
        banner.className = ""; // Reset classes.
        banner.classList.add(type);
        banner.style.display = "block";
        setTimeout(() => { banner.style.display = "none"; }, 3000);
    } else {
        console.log("Notification:", message);
    }
}

// Function to display data along with transfer calculations.
function displayData(data) {
    const container = document.getElementById("budget-summary");
    if (!container) {
        console.error("❌ Budget summary element not found!");
        return;
    }
    container.innerHTML = "";  // Clear previous data

    // Ensure budgetMonth is correctly defined.
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    const budgetMonth = `${year}-${month}`; // Format as YYYY-MM

    console.log(`📅 Processing data for: ${budgetMonth}`);

    let total = 0;
    let categoryTotals = {};
    let titleTotals = {};

    // Calculate totals for each category and title.
    data.forEach(expense => {
        const amount = parseFloat(expense.amount);
        total += amount;

        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += amount;

        if (!titleTotals[expense.title]) {
            titleTotals[expense.title] = 0;
        }
        titleTotals[expense.title] += amount;
    });

    // Compute Jack and Richard Transfers.
    const sharedCategories = ["Housing", "Pet", "Shopping", "Miscellaneous", "Utilities"];
    const sharedTitles = ["Joint Savings", "Gift Pot", "Additional Savings"];

    let sharedTotal = 0;
    sharedCategories.forEach(cat => {
        if (categoryTotals[cat]) sharedTotal += categoryTotals[cat];
    });
    sharedTitles.forEach(title => {
        if (titleTotals[title]) sharedTotal += titleTotals[title];
    });

    // Compute individual savings.
    const jackSavings = titleTotals["Jack Savings"] || 0;
    const richardSavings = titleTotals["Richard Savings"] || 0;

    // Compute final values.
    const jackTransfer = (sharedTotal / 2) + jackSavings;
    const richardTransfer = (sharedTotal / 2) + richardSavings;
    const totalSavings = categoryTotals["Savings"] || 0;

    // Update UI for totals.
    document.getElementById("overall-total").innerText = `£${total.toFixed(2)}`;
    document.getElementById("jack-transfer").innerText = `£${jackTransfer.toFixed(2)}`;
    document.getElementById("richard-transfer").innerText = `£${richardTransfer.toFixed(2)}`;
    document.getElementById("total-savings").innerText = `£${totalSavings.toFixed(2)}`;

    // Generate Budget Categories in UI.
    Object.keys(categoryTotals).forEach(category => {
        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("budget-category-box");

        // Category header.
        const header = document.createElement("div");
        header.classList.add("category-header");
        header.innerText = category;
        categoryDiv.appendChild(header);

        // Container for expense items.
        const itemsContainer = document.createElement("div");
        itemsContainer.classList.add("budget-items-container");

        // Add each expense under the category.
        data.filter(expense => expense.category === category)
            .forEach(expense => {
                const itemDiv = document.createElement("div");
                itemDiv.classList.add("budget-item");

                const titleSpan = document.createElement("span");
                titleSpan.classList.add("item-title");
                titleSpan.innerText = expense.title;
                itemDiv.appendChild(titleSpan);

                const amountSpan = document.createElement("span");
                amountSpan.classList.add("item-amount");
                amountSpan.innerText = `£${parseFloat(expense.amount).toFixed(2)}`;
                itemDiv.appendChild(amountSpan);

                const deleteBtn = document.createElement("button");
                deleteBtn.classList.add("delete-title", "button-delete");
                deleteBtn.setAttribute("data-id", expense.id);
                deleteBtn.setAttribute("data-month", budgetMonth);
                deleteBtn.innerText = "❌";
                deleteBtn.addEventListener("click", function () {
                    const expId = this.getAttribute("data-id");
                    const bMonth = this.getAttribute("data-month");
                    deleteTitle(bMonth, expId);
                });
                itemDiv.appendChild(deleteBtn);

                itemsContainer.appendChild(itemDiv);
            });
        categoryDiv.appendChild(itemsContainer);

        // Display the total for this category.
        const totalDiv = document.createElement("div");
        totalDiv.classList.add("budget-total");
        totalDiv.innerText = `Total: £${categoryTotals[category].toFixed(2)}`;
        categoryDiv.appendChild(totalDiv);

        container.appendChild(categoryDiv);
    });
}

// Function to fetch budget data from the server.
function fetchBudgetData() {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    console.log(`📅 Fetching data for: ${year}-${month}`);
    fetch(`/report-data/${year}/${month}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("📊 Fetched Data:", data);
            if (!Array.isArray(data) || data.length === 0) {
                console.warn("⚠️ No data found for the selected month.");
                document.getElementById("budget-summary").innerText = "No data available for this period.";
                return;
            }
            displayData(data);
        })
        .catch(error => {
            console.error("❌ Error loading budget data:", error);
            showNotification("❌ Failed to load budget data.", "error");
        });
}

// Function to delete an expense.
function deleteTitle(budgetMonth, expenseId) {
    console.log(`Deleting expense ${expenseId} for ${budgetMonth}`);
    fetch(`/delete-title/${budgetMonth}/${expenseId}`, {
        method: "DELETE"
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error("❌ Error deleting:", data.error);
            alert(`Error: ${data.error}`);
        } else {
            console.log(`✅ Expense ${expenseId} deleted successfully!`);
            alert("Title deleted successfully!");
            fetchBudgetData(); // Refresh the report after deletion.
        }
    })
    .catch(error => {
        console.error("❌ Fetch error during deletion:", error);
    });
}
