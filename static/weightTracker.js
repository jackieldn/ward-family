document.addEventListener("DOMContentLoaded", function () {
    console.log("📌 weightTracker.js loaded");

    const weightDisplay = document.getElementById("weight-display");
    const weightInput = document.getElementById("weight-input");
    const weightDateInput = document.getElementById("weight-date");
    const saveWeightButton = document.getElementById("save-weight");
    const weightHistoryList = document.getElementById("weight-history");
    const toggleWeightHistoryButton = document.getElementById("toggle-weight-history");

    let selectedCat = null; // Stores the currently selected cat

    // Listen for cat selection changes
    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        console.log(`🐱 Switched to ${selectedCat}, fetching weight history...`);
        fetchWeightHistory(selectedCat);
    });

    // Fetch Weight History for the Selected Cat
    window.fetchWeightHistory = function (catId) {
        if (!catId) return;
        
        console.log(`📌 Fetching latest weight for cat: ${catId}`);
    
        fetch(`/catify/get-weights/${catId}`)
            .then(response => response.json())
            .then(data => {
                console.log("📊 Weight Data for", catId, ":", data);
                
                if (data.length > 0) {
                    // Sort by date to ensure we get the latest weight entry
                    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
                    const latestWeight = data[0];
                    document.getElementById("weight-display").textContent = `${latestWeight.weight} kg`; // ✅ Update weight display
                    updateWeightHistoryList(data);
                } else {
                    document.getElementById("weight-display").textContent = "No records"; // ✅ Properly resets display
                    weightHistoryList.innerHTML = "<li>No previous records</li>";
                }
            })
            .catch(error => console.error("❌ Error fetching weight history:", error));
    };
    

    // Update the Weight History List UI
    function updateWeightHistoryList(weights) {
        weightHistoryList.innerHTML = ""; // Clear existing list

        weights.slice(0, 10).forEach(entry => { // Show last 10 entries
            const li = document.createElement("li");
            li.textContent = `${entry.date}: ${entry.weight} kg`;
            weightHistoryList.appendChild(li);
        });
    }

    // Save a New Weight Entry
    function addWeight() {
        if (!selectedCat) {
            alert("⚠️ Please select a cat first.");
            return;
        }

        const weightValue = weightInput.value.trim();
        const dateValue = weightDateInput.value;

        if (!weightValue || !dateValue) {
            alert("⚠️ Please enter both weight and date.");
            return;
        }

        fetch("/catify/add-weight", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cat_id: selectedCat,
                weight: parseFloat(weightValue),
                date: dateValue
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Weight added:", data);
            fetchWeightHistory(selectedCat); // Refresh weight list
        })
        .catch(error => console.error("❌ Error saving weight:", error));
    }

    // Toggle Visibility of Weight History
    toggleWeightHistoryButton.addEventListener("click", function (event) {
        event.preventDefault();
        weightHistoryList.classList.toggle("hidden");

        if (weightHistoryList.classList.contains("hidden")) {
            toggleWeightHistoryButton.textContent = "Show Last 10 Measurements ▼";
        } else {
            toggleWeightHistoryButton.textContent = "Hide Last 10 Measurements ▲";
        }
    });

    // Attach Event Listeners
    saveWeightButton.addEventListener("click", addWeight);
});
