document.addEventListener("DOMContentLoaded", function() {
    console.log("balances.js is loaded and running!"); // Debugging log

    const monthSelect = document.getElementById("month");
    const yearInput = document.getElementById("year");
    const fetchBalancesBtn = document.getElementById("fetch-balances");
    const updateBalancesBtn = document.getElementById("update-balances");
    const balancesList = document.getElementById("balances-list");
    const newMonthSelect = document.getElementById("new-month");
    const newYearInput = document.getElementById("new-year");
    const addNewBalancesBtn = document.getElementById("add-new-balances");

    if (!monthSelect || !yearInput || !fetchBalancesBtn || !balancesList) {
        console.error("One or more elements are missing from the DOM.");
        return;
    }

    console.log("All necessary elements found!");

    // Populate month dropdowns
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    months.forEach((month, index) => {
        const option = document.createElement("option");
        option.value = String(index + 1).padStart(2, '0');
        option.textContent = month;
        monthSelect.appendChild(option);

        const newOption = option.cloneNode(true);
        newMonthSelect.appendChild(newOption);
    });

    function fetchBalances() {
        const month = monthSelect.value;
        const year = yearInput.value;
        const formattedMonth = `${month}-${year}`;

        fetch(`/get-savings/${formattedMonth}`)
            .then(response => response.json())
            .then(data => {
                console.log("Fetched data:", data);
                balancesList.innerHTML = "";
                data.forEach(entry => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${entry.account_name}</td>
                        <td><input type="number" value="${entry.current_balance}" data-account="${entry.account_name}"></td>
                    `;
                    balancesList.appendChild(row);
                });
            });
    }

    function updateBalances() {
        const month = monthSelect.value;
        const year = yearInput.value;
        const formattedMonth = `${month}-${year}`;
        const updatedBalances = [];

        document.querySelectorAll("#balances-list input").forEach(input => {
            updatedBalances.push({
                account_name: input.dataset.account,
                current_balance: parseFloat(input.value)
            });
        });

        console.log("Updating balances:", updatedBalances);

        fetch("/add-savings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month: formattedMonth, savings: updatedBalances })
        }).then(response => response.json())
          .then(data => {
              alert(data.message);
              fetchBalances();
          });
    }

    function addNewBalances() {
        const month = newMonthSelect.value;
        const year = newYearInput.value;
        const formattedMonth = `${month}-${year}`;
        const newBalances = [
            { account_name: "Joint Savings", current_balance: parseFloat(document.getElementById("new-joint-savings").value) },
            { account_name: "Jack LISA", current_balance: parseFloat(document.getElementById("new-jack-lisa").value) },
            { account_name: "Richard LISA", current_balance: parseFloat(document.getElementById("new-richard-lisa").value) }
        ];

        console.log("Adding new balances:", formattedMonth, newBalances);

        fetch("/add-savings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month: formattedMonth, savings: newBalances })
        }).then(response => response.json())
          .then(data => {
              alert(data.message);
              if (formattedMonth === `${monthSelect.value}-${yearInput.value}`) {
                  fetchBalances();
              }
          });
    }

    fetchBalancesBtn.addEventListener("click", fetchBalances);
    updateBalancesBtn.addEventListener("click", () => {
        if (!updateBalancesBtn.disabled) {
            updateBalancesBtn.disabled = true;
            updateBalances().then(() => {
                updateBalancesBtn.disabled = false;
            });
        }
    });
    addNewBalancesBtn.addEventListener("click", () => {
        if (!addNewBalancesBtn.disabled) {
            addNewBalancesBtn.disabled = true;
            addNewBalances().then(() => {
                addNewBalancesBtn.disabled = false;
            });
        }
    });
});
