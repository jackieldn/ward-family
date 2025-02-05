function fetchBudgetData() {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;

    fetch(`/report-data/${year}/${month}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById("budget-summary").innerHTML = "";
            document.getElementById("email-container").style.display = "flex";
        })
        .catch(error => console.error("Error loading budget data:", error));
}
