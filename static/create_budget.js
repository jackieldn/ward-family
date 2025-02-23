document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed.");

    // Ensure elements exist before accessing them
    const categoriesContainer = document.querySelector("#categories-container");
    const saveButton = document.querySelector("#save-expenses");
    document.getElementById("save-expenses").addEventListener("click", saveExpenses);

    if (!categoriesContainer || !saveButton) {
        console.error("Required elements not found in DOM!");
        return;
    }

    // Your existing functions go here...

});

// ✅ Fetch and Display Categories
function loadCategories() {
    fetch("/get-categories")
        .then(response => response.json())
        .then(data => {
            console.log("📊 Categories from API:", data.categories);
            const container = document.getElementById("categories-container");

            if (!container) {
                console.error("❌ Categories container not found!");
                return;
            }

            container.innerHTML = ""; // Clear previous content

            data.categories.forEach(category => {
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("budget-widget");
                categoryDiv.id = `category-${category.replace(/\s+/g, '-')}`;  // Ensure ID is valid

                categoryDiv.innerHTML = `
                    <div class="widget-banner-header">${category}</div>
                    <div class="widget-content">
                        <select class="title-select">
                            <option value="">Select an expense</option>
                        </select>
                        <input type="text" class="custom-title-input" placeholder="Enter custom title" style="display:none;">
                        <input type="number" class="amount-input" placeholder="£">
                        <button onclick="addExpense('category-${category.replace(/\s+/g, '-')}')">Add</button>
                        <ul class="expense-list"></ul>
                    </div>
                `;

                container.appendChild(categoryDiv);
            });

            // ✅ Load Titles After Categories Are Loaded
            loadTitles();
        })
        .catch(error => console.error("❌ Error fetching categories:", error));
}



document.addEventListener("DOMContentLoaded", loadCategories);



// ✅ Fetch and Display Titles
function loadTitles() {
    fetch("/get-titles")
        .then(response => response.json())
        .then(data => {
            console.log("📊 Titles received:", data.titles);
            if (!data.titles || data.titles.length === 0) {
                console.warn("⚠️ No titles found.");
                return;
            }

            document.querySelectorAll(".title-select").forEach(select => {
                select.innerHTML = `<option value="">Select an expense</option>`; // Reset dropdown

                data.titles.forEach(title => {
                    const option = document.createElement("option");
                    option.value = title;
                    option.textContent = title;
                    select.appendChild(option);
                });

                // Add 'Other' option to allow custom title input
                const otherOption = document.createElement("option");
                otherOption.value = "other";
                otherOption.textContent = "Other (Custom)";
                select.appendChild(otherOption);

                select.addEventListener("change", function () {
                    const customInput = this.closest(".widget-content").querySelector(".custom-title-input");
                    customInput.style.display = this.value === "other" ? "block" : "none";
                });
            });
        })
        .catch(error => console.error("❌ Error loading titles:", error));
}


// ✅ Handle title selection
function handleTitleSelection(selectElement) {
    const customInput = selectElement.closest(".expense-item").querySelector(".custom-title-input");
    customInput.style.display = selectElement.value === "other" ? "block" : "none";
}

// ✅ Add new expense to the UI
function addExpense(categoryId) {
    const categoryDiv = document.getElementById(categoryId);
    if (!categoryDiv) {
        console.error(`❌ addExpense: Category container not found for ID ${categoryId}`);
        return;
    }

    const selectElement = categoryDiv.querySelector(".title-select");
    const customInput = categoryDiv.querySelector(".custom-title-input");
    const amountInput = categoryDiv.querySelector(".amount-input");

    if (!selectElement || !customInput || !amountInput) {
        console.error("❌ addExpense: Missing one or more input elements in", categoryDiv);
        return;
    }

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

    // ✅ Debugging Log
    console.log(`📌 Adding Expense → Category: ${categoryId}, Title: ${title}, Amount: ${amount}`);

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
        const category = categoryDiv.id.replace("category-", "").replace(/-/g, ' ');  // Ensure format matches Firestore
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

    console.log("📊 Saving Expenses:", expenses);

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
