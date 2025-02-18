document.addEventListener("DOMContentLoaded", function () {
    console.log("📂 Create Budget script loaded!");

    fetchCategories();  // This will now call loadTitles() after categories are fetched

    const saveButton = document.getElementById('save-expenses');
    if (saveButton) {
        saveButton.addEventListener("click", saveExpenses);
    } else {
        console.error("Save button not found!");
    }
    document.querySelector(".save")?.addEventListener("click", saveExpenses);
});

// ✅ Fetch and Display Categories
function fetchCategories() {
    fetch("/get-categories")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("categories-container");
            container.innerHTML = ""; // Clear previous categories

            data.categories.forEach(category => {
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("budget-widget");
                categoryDiv.id = `category-${category}`;

                categoryDiv.innerHTML = `
                    <div class="widget-banner-header">${category}</div>
                    <div class="widget-content">
                        <select class="title-select">
                            <option value="">Select an expense</option>
                        </select>
                        <input type="text" class="custom-title-input" placeholder="Enter custom title" style="display:none;">
                        <input type="number" class="amount-input" placeholder="£">
                        <button onclick="addExpense('${category}')">Add</button>
                        <ul class="expense-list"></ul>
                    </div>
                `;

                container.appendChild(categoryDiv);
            });

            // ✅ Load Titles After Categories Are Loaded
            loadTitles();
        })
        .catch(error => console.error("Error loading categories:", error));
}


// ✅ Fetch and Display Titles
function loadTitles() {
    fetch("/get-titles")
        .then(response => response.json())
        .then(data => {
            const titles = data.titles;

            document.querySelectorAll(".title-select").forEach(select => {
                titles.forEach(title => {
                    const option = document.createElement("option");
                    option.value = title;
                    option.textContent = title;
                    select.appendChild(option);
                });
            });
        })
        .catch(error => console.error("Error loading titles:", error));
}


// ✅ Handle title selection
function handleTitleSelection(selectElement) {
    const customInput = selectElement.closest(".expense-item").querySelector(".custom-title-input");
    customInput.style.display = selectElement.value === "other" ? "block" : "none";
}

// ✅ Add new expense to the UI
function addExpense(categoryId) {
    const categoryDiv = document.getElementById(categoryId);
    const selectElement = categoryDiv.querySelector(".title-select");
    const customInput = categoryDiv.querySelector(".custom-title-input");
    const amountInput = categoryDiv.querySelector(".amount-input");

    let title = selectElement.value;
    if (title === "other") {
        title = customInput.value.trim();
        if (!title) {
            alert("Please enter a title for your expense.");
            return;
        }
    }

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid expense amount.");
        return;
    }

    const expenseList = categoryDiv.querySelector(".expense-list") || document.createElement("div");
    expenseList.classList.add("expense-list");

    const expenseItem = document.createElement("div");
    expenseItem.classList.add("expense-item");
    expenseItem.innerHTML = `
        <span>${title}: £${amount.toFixed(2)}</span>
        <button class="delete-expense" onclick="this.parentElement.remove()">❌</button>`;

    expenseList.appendChild(expenseItem);
    categoryDiv.appendChild(expenseList);

    selectElement.value = "";
    customInput.style.display = "none";
    customInput.value = "";
    amountInput.value = "";
}

// ✅ Save all expenses to the backend
function saveExpenses() {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;
    const date = `${year}-${month}-01`;

    const expenses = [];

    document.querySelectorAll(".budget-widget").forEach(categoryDiv => {
        const category = categoryDiv.id.replace("category-", "");
        categoryDiv.querySelectorAll(".expense-item").forEach(item => {
            const text = item.querySelector("span")?.innerText;
            if (text) {
                const [title, amount] = text.split(": £");
                expenses.push({
                    category: category,
                    title: title.trim(),
                    amount: parseFloat(amount)
                });
            }
        });
    });

    if (expenses.length === 0) {
        alert("No expenses to save.");
        return;
    }

    fetch("/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, expenses })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        location.reload(); // Refresh the page after saving
    })
    .catch(error => console.error("Error saving expenses:", error));
}
