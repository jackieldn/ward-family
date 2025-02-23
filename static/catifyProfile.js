document.addEventListener("DOMContentLoaded", function () {
    const catSelector = document.querySelector(".cat-selector");
    const profileContainer = document.querySelector(".cat-profile-container");
    let selectedCat = null;
    let data = {}; // ✅ Ensure data is declared globally

    function fetchCatProfiles() {
        fetch("/catify/get-cats")
            .then(response => response.json())
            .then(profiles => {
                console.log("📌 Fetched Cat Profiles:", profiles);
                data = profiles;

                if (!profiles || Object.keys(profiles).length === 0) {
                    console.warn("⚠️ No cat profiles found!");
                    return;
                }

                profileContainer.innerHTML = "";
                catSelector.innerHTML = "";

                Object.entries(data).forEach(([catId, catInfo]) => {
                    // Create profile image
                    const img = document.createElement("img");
                    img.classList.add("cat-image");
                    img.src = catInfo.profile_picture || "/static/images/default-cat.jpg";
                    img.alt = catInfo.name;

                    img.onerror = function() {
                        img.src = "/static/images/default-cat.jpg";
                    };

                    img.addEventListener("click", () => updateSelection(catId));
                    catSelector.appendChild(img);

                    // Ensure insurance data exists
                    const insurance = catInfo.insurance || {
                        annual_limit: "N/A",
                        excess: "N/A",
                        monthly_payment: "N/A",
                        policy_end_date: "N/A"
                    };

                    // Create profile HTML
                    const profileDiv = document.createElement("div");
                    profileDiv.classList.add("cat-profile");
                    profileDiv.id = `profile-${catId}`;
                    profileDiv.style.display = "none";

                    profileDiv.innerHTML = `
                        <h3>${catInfo.name}</h3>
                        <div class="profile-columns">
                            <div class="profile-left">
                                <h4>Cat Details</h4>
                                <p><strong>Date of Birth:</strong> ${new Date(catInfo.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p><strong>Breed:</strong> ${catInfo.breed}</p>
                                <p><strong>Sex:</strong> ${catInfo.sex}</p>
                            </div>
                            <div class="profile-right">
                                <h4>Insurance</h4>
                                <p><strong>Annual limit:</strong> £${insurance.annual_limit}</p>
                                <p><strong>Excess:</strong> £${insurance.excess}</p>
                                <p><strong>Monthly Payment:</strong> £${insurance.monthly_payment}</p>
                                <p><strong>Policy active:</strong> ${new Date(insurance.policy_end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    `;

                    profileContainer.appendChild(profileDiv);
                });

                if (Object.keys(data).length > 0) {
                    updateSelection(Object.keys(data)[0]);
                } else {
                    console.warn("⚠️ No cat profiles available to select.");
                }
            })
            .catch(error => console.error("❌ Error fetching cat profiles:", error));
    }

    function updateSelection(catId) {
        selectedCat = catId;

        document.querySelectorAll(".cat-image").forEach(img => img.classList.remove("active"));
        document.querySelectorAll(".cat-profile").forEach(profile => (profile.style.display = "none"));

        const selectedProfile = document.querySelector(`#profile-${catId}`);
        const selectedImage = document.querySelector(`.cat-selector img[alt='${data[catId].name}']`);

        if (selectedProfile) {
            selectedProfile.style.display = "block";
        } else {
            console.warn(`⚠️ No profile found for catId: ${catId}`);
        }

        if (selectedImage) {
            selectedImage.classList.add("active");
        } else {
            console.warn(`⚠️ No image found for catId: ${catId}`);
        }

        console.log("🔄 Switching Profile to:", catId);

        document.dispatchEvent(new CustomEvent("catChanged", { detail: selectedCat }));

        // ✅ Ensure weight updates when switching profiles
        if (typeof window.fetchWeightHistory === "function") {
            console.log("📊 Updating Weight for:", catId);
            
            // Delay to ensure UI elements are updated before weight is fetched
            setTimeout(() => window.fetchWeightHistory(catId), 100);
        } else {
            console.error("❌ fetchWeightHistory is not defined!");
        }
        

        // ✅ Ensure medication updates when switching profiles
        if (typeof window.fetchMedications === "function") {
            console.log("💊 Updating Medications for:", catId);
            window.fetchMedications(catId);
        } else {
            console.error("❌ fetchMedications is not defined!");
        }

        // ✅ Ensure reminders update when switching profiles
        if (typeof window.fetchReminders === "function") {
            console.log("📅 Updating Reminders for:", catId);
            window.fetchReminders(catId);
        } else {
            console.error("❌ fetchReminders is not defined!");
        }
    }

    fetchCatProfiles();
});
