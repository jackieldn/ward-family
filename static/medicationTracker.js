document.addEventListener("DOMContentLoaded", function () {
    const medName = document.getElementById("med-name");
    const medDosage = document.getElementById("med-dosage");
    const medFrequency = document.getElementById("med-frequency");
    const medDailyCount = document.getElementById("med-daily-count");
    const medStartDate = document.getElementById("med-start-date"); 
    const addMedButton = document.getElementById("add-med");
    const medList = document.getElementById("medication-list");

    let selectedCat = "Grey"; // Default

    // Listen for cat selection changes
    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        fetchMedications();
    });

    // Ensure daily count selector is hidden by default (because Monthly is now selected)
    if (medFrequency.value !== "daily") {
        medDailyCount.classList.add("hidden");
    }

    // Show/hide daily frequency dropdown based on selection
    medFrequency.addEventListener("change", function () {
        if (medFrequency.value === "daily") {
            medDailyCount.classList.remove("hidden");
        } else {
            medDailyCount.classList.add("hidden");
        }
    });

    // Fetch medications from API
    function fetchMedications() {
        fetch(`/catify/get-medications/${selectedCat}`)
            .then(response => response.json())
            .then(updateMedicationList)
            .catch(error => console.error("Error fetching medications:", error));
    }

    // Save new medication entry
    addMedButton.addEventListener("click", function () {
        const name = medName.value.trim();
        const dosage = medDosage.value.trim();
        const frequency = medFrequency.value;
        const dailyCount = frequency === "daily" ? medDailyCount.value : 1; // Default to 1
        const startDate = medStartDate.value; // Get the selected date

        if (!name || !dosage || !startDate) {
            alert("Please enter medication name, dosage, and start date.");
            return;
        }

        fetch("/catify/add-medication", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                cat_name: selectedCat, 
                name, 
                dosage, 
                frequency, 
                daily_count: parseInt(dailyCount),
                start_date: startDate
            })
        })
        .then(response => response.json())
        .then(() => fetchMedications()) // Refresh list
        .catch(error => console.error("Error saving medication:", error));
    });

    // Update medication list UI
    function updateMedicationList(meds) {
        medList.innerHTML = meds.length ? "" : "<li>No medications added</li>";
        meds.forEach(med => {
            const li = document.createElement("li");
            li.innerHTML = `${med.name} - ${med.dosage} (${med.frequency}, ${med.daily_count}x) - Starts on ${med.start_date}`;
            medList.appendChild(li);
        });
    }

    fetchMedications(); // Load medications on page load
});
