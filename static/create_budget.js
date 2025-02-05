document.addEventListener("DOMContentLoaded", function () {
    console.log("📂 Create Budget script loaded!");

    fetchCategories();  // This will now call loadTitles() after categories are fetched

    document.querySelector(".save")?.addEventListener("click", saveExpenses);
});

// ✅ Fetch categories from the backend
function fetchCategories() {
    fetch("/get-categories")
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById("categories-container");
            container.innerHTML = "";

            data.categories.forEach(category => {
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("category");
                categoryDiv.id = category;

                categoryDiv.innerHTML = `
                    <h2>${category}</h2>
                    <div class="expense-item">
                        <select class="title-select" onchange="handleTitleSelection(this)">
                            <option value="">Select an expense</option>
                            <option value="other">Other</option>
                        </select>
                        <input type="text" class="custom-title-input" placeholder="Enter new expense" style="display: none;">
                        <input type="number" class="amount-input" placeholder="£">
                    </div>
                    <button onclick="addExpense('${category}')">Add</button>`;

                container.appendChild(categoryDiv);
            });

            loadTitles(); // ✅ Call loadTitles() instead of fetchTitles()
        })
        .catch(error => console.error("Error loading categories:", error));
}

// ✅ Fetch saved expense titles from the backend
function loadTitles() {
    fetch("/get-titles")
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll(".title-select").forEach(select => {
                data.titles.forEach(title => {
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
    const date = `${year}-${month}-01`; // Use first day of selected month

    const expenses = [];

    document.querySelectorAll(".category").forEach(categoryDiv => {
        const category = categoryDiv.id;
        categoryDiv.querySelectorAll(".expense-item").forEach(item => {
            const text = item.querySelector("span")?.innerText;
            if (text) {
                const [title, amount] = text.split(": £");
                expenses.push({ title: title.trim(), category, amount: parseFloat(amount) });
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
        body: JSON.stringify({ date, expenses })  // ✅ Now using user-selected date
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        location.reload(); // Refresh the page after saving
    })
    .catch(error => console.error("Error saving expenses:", error));
}

