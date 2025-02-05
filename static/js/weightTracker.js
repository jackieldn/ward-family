document.addEventListener("DOMContentLoaded", function () {
    const weightInput = document.getElementById("weight-input");
    const weightDate = document.getElementById("weight-date");
    const saveWeightButton = document.getElementById("save-weight");
    const weightDisplay = document.getElementById("weight-display");
    const toggleHistory = document.getElementById("toggle-weight-history");
    const weightHistoryList = document.getElementById("weight-history");

    let selectedCat = "Grey"; // Default cat

    // Listen for cat selection changes
    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        fetchWeightHistory();
    });

    // Fetch weight history from API
    function fetchWeightHistory() {
        fetch(`/get-weights/${selectedCat}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    weightDisplay.textContent = `${data[0].weight} kg`;
                } else {
                    weightDisplay.textContent = "---";
                }
                updateWeightHistory(data);
            })
            .catch(error => console.error("Error fetching weight history:", error));
    }

    // Save new weight entry to API
    saveWeightButton.addEventListener("click", () => {
        const weight = weightInput.value.trim();
        const date = weightDate.value;

        if (!weight || !date) {
            alert("Please enter both weight and date.");
            return;
        }

        fetch("/add-weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cat_name: selectedCat, date: date, weight: parseFloat(weight) })
        })
        .then(response => response.json())
        .then(() => {
            fetchWeightHistory(); // Refresh history after saving
        })
        .catch(error => console.error("Error saving weight:", error));
    });

    // Update weight history UI
    function updateWeightHistory(data) {
        weightHistoryList.innerHTML = "";
        data.forEach(entry => {
            const li = document.createElement("li");
            li.textContent = `${entry.date}: ${entry.weight} kg`;
            weightHistoryList.appendChild(li);
        });

        if (data.length === 0) {
            weightHistoryList.innerHTML = "<li>No previous records</li>";
        }
    }

    toggleHistory.addEventListener("click", function (e) {
        e.preventDefault();
        weightHistoryList.classList.toggle("hidden");
        toggleHistory.textContent = weightHistoryList.classList.contains("hidden") ? 
            "Show Last 10 Measurements ▼" : "Hide Last 10 Measurements ▲";
    });

    fetchWeightHistory(); // Load history on page load
});
