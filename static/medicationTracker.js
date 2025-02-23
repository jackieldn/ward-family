document.addEventListener("DOMContentLoaded", function () {
    const medicationList = document.getElementById("medication-list");
    const addMedButton = document.getElementById("add-med");

    let selectedCat = null;

    // Detect cat selection changes
    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        console.log("🔄 Switching to cat:", selectedCat);
        fetchMedications(selectedCat); // ✅ Now correctly passes the cat ID
        if (selectedCat) {
            fetchMedications(selectedCat);
        } else {
            console.warn("⚠️ No cat selected.");
        }
    });

    function fetchMedications(catId) {
        if (!catId) return;

        fetch(`https://wardfamily.hopto.org/catify/get-medications/${catId}`)
            .then(response => response.json())
            .then(data => {
                console.log("📌 Medications Fetched:", data);
                updateMedicationList(data);
            })
            .catch(error => console.error("❌ Error fetching medications:", error));
    }

    function updateMedicationList(medications) {
        medicationList.innerHTML = ""; // Clear list

        if (!medications || medications.length === 0) {
            medicationList.innerHTML = "<li>No medications added</li>";
            return;
        }

        medications.forEach(med => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${med.medication_name}</strong> - ${med.dosage}, ${med.frequency}
                <br>Next Application: ${med.next_application}
                <button class="delete-med button-delete" data-id="${med.id}">❌</button>
            `;
            medicationList.appendChild(li);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll(".delete-med").forEach(button => {
            button.addEventListener("click", function () {
                const medId = this.getAttribute("data-id");
                deleteMedication(medId);
            });
        });
    }

    function addMedication() {
        if (!selectedCat) {
            alert("⚠️ Please select a cat first.");
            return;
        }

        const medName = document.getElementById("med-name").value.trim();
        const medDosage = document.getElementById("med-dosage").value.trim();
        const medFrequency = document.getElementById("med-frequency").value;
        const medStartDate = document.getElementById("med-start-date").value;

        if (!medName || !medDosage || !medFrequency || !medStartDate) {
            alert("⚠️ Please enter all medication details.");
            return;
        }

        fetch("/catify/add-medication", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cat_id: selectedCat,
                medication_name: medName,
                dosage: parseFloat(medDosage),
                frequency: medFrequency,
                next_application: medStartDate
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Medication added:", data);
            fetchMedications(selectedCat); // ✅ Refresh the list with the correct cat
        })
        .catch(error => console.error("❌ Error adding medication:", error));
    }

    function deleteMedication(medicationId) {
        fetch(`/catify/delete-medication/${selectedCat}/${medicationId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Medication deleted:", data);
            fetchMedications(selectedCat); // ✅ Refresh list with the correct cat
        })
        .catch(error => console.error("❌ Error deleting medication:", error));
    }

    addMedButton.addEventListener("click", addMedication);
});
