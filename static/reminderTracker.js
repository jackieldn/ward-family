document.addEventListener("DOMContentLoaded", function () {
    const reminderList = document.getElementById("appointments-list");
    const addReminderButton = document.getElementById("add-appointment");

    let selectedCat = null;

    // Detect cat selection
    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        fetchReminders();
    });

    function fetchReminders() {
        if (!selectedCat) return;

        fetch(`https://wardfamily.hopto.org/catify/get-reminders/${catId}`)
            .then(response => response.json())
            .then(data => {
                console.log("📌 Reminders Fetched:", data);
                updateReminderList(data);
            })
            .catch(error => console.error("❌ Error fetching reminders:", error));
    }

    function updateReminderList(reminders) {
        reminderList.innerHTML = ""; // Clear list

        if (reminders.length === 0) {
            reminderList.innerHTML = "<li>No reminders added</li>";
            return;
        }

        reminders.forEach(rem => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${rem.name}</strong> - Due: ${rem.next_date}
                <br>${rem.notes}
                <button class="delete-reminder button-delete" data-id="${rem.id}">❌</button>
            `;
            reminderList.appendChild(li);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll(".delete-reminder").forEach(button => {
            button.addEventListener("click", function () {
                const reminderId = this.getAttribute("data-id");
                deleteReminder(reminderId);
            });
        });
    }

    function addReminder() {
        if (!selectedCat) {
            alert("⚠️ Please select a cat first.");
            return;
        }

        const reminderTitle = document.getElementById("appointment-title").value.trim();
        const reminderDate = document.getElementById("appointment-date").value;
        const reminderNotes = document.getElementById("appointment-notes").value.trim();

        if (!reminderTitle || !reminderDate) {
            alert("⚠️ Please enter all required reminder details.");
            return;
        }

        fetch("/catify/add-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cat_id: selectedCat,
                name: reminderTitle,
                notes: reminderNotes,
                next_date: reminderDate
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Reminder added:", data);
            fetchReminders(); // Refresh the list
        })
        .catch(error => console.error("❌ Error adding reminder:", error));
    }

    function deleteReminder(reminderId) {
        fetch(`/catify/delete-reminder/${selectedCat}/${reminderId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ Reminder deleted:", data);
            fetchReminders(); // Refresh list
        })
        .catch(error => console.error("❌ Error deleting reminder:", error));
    }

    addReminderButton.addEventListener("click", addReminder);
});
