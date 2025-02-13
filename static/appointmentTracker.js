document.addEventListener("DOMContentLoaded", function () {
    const appointmentTitle = document.getElementById("appointment-title");
    const appointmentDate = document.getElementById("appointment-date");
    const appointmentTime = document.getElementById("appointment-time");
    const appointmentNotes = document.getElementById("appointment-notes");
    const addAppointmentButton = document.getElementById("add-appointment");
    const appointmentsList = document.getElementById("appointments-list");

    let selectedCat = "Grey"; // Default

    document.addEventListener("catChanged", function (event) {
        selectedCat = event.detail;
        fetchAppointments();
    });

    function fetchAppointments() {
        fetch(`/catify/get-appointments/${selectedCat}`)
            .then(response => response.json())
            .then(updateAppointmentsList)
            .catch(error => console.error("Error fetching appointments:", error));
    }

    addAppointmentButton.addEventListener("click", function () {
        const title = appointmentTitle.value.trim();
        const date = appointmentDate.value;
        const time = appointmentTime.value;
        const notes = appointmentNotes.value.trim();

        if (!title || !date || !time) {
            alert("Please enter title, date, and time.");
            return;
        }

        fetch("/catify/add-appointment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cat_name: selectedCat, title, date, time, notes })
        })
        .then(() => fetchAppointments())
        .catch(error => console.error("Error saving appointment:", error));
    });

    function updateAppointmentsList(appts) {
        appointmentsList.innerHTML = appts.length ? "" : "<li>No reminders</li>";
        appts.forEach(appt => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${appt.date}</strong> - ${appt.title}
                ${appt.notes ? `<p class="appt-notes">${appt.notes}</p>` : ""}
            `;
            appointmentsList.appendChild(li);
        });
    }

    fetchAppointments();
});
