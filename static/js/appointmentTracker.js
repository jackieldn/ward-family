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
        fetch(`/get-appointments/${selectedCat}`)
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

        fetch("/add-appointment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cat_name: selectedCat, title, date, time, notes })
        })
        .then(() => fetchAppointments())
        .catch(error => console.error("Error saving appointment:", error));
    });

    function deleteAppointment(apptId) {
        fetch(`/delete-appointment/${apptId}`, { method: "DELETE" })
            .then(() => fetchAppointments())
            .catch(error => console.error("Error deleting appointment:", error));
    }

    function updateAppointmentsList(appts) {
        appointmentsList.innerHTML = appts.length ? "" : "<li>No upcoming appointments</li>";
        appts.forEach(appt => {
            const li = document.createElement("li");
            li.innerHTML = `${appt.date} - ${appt.title} 
                <button class="remove-appointment" onclick="deleteAppointment(${appt.id})">X</button>`;
            appointmentsList.appendChild(li);
        });
    }

    fetchAppointments();
});
