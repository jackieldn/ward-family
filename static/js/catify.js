document.addEventListener("DOMContentLoaded", function () {
    const greyImage = document.getElementById("select-grey");
    const pumpkinImage = document.getElementById("select-pumpkin");

    const greyProfile = document.getElementById("profile-grey");
    const pumpkinProfile = document.getElementById("profile-pumpkin");

    let selectedCat = "Grey"; // Default

    function updateSelection(cat) {
        selectedCat = cat;
        greyImage.classList.toggle("active", cat === "Grey");
        pumpkinImage.classList.toggle("active", cat === "Pumpkin");

        // Show the correct cat profile
        greyProfile.style.display = cat === "Grey" ? "block" : "none";
        pumpkinProfile.style.display = cat === "Pumpkin" ? "block" : "none";

        // Notify all tracking scripts
        document.dispatchEvent(new CustomEvent("catChanged", { detail: selectedCat }));
    }

    // Default: Show Grey's profile and load corresponding data
    updateSelection("Grey");

    greyImage.addEventListener("click", () => updateSelection("Grey"));
    pumpkinImage.addEventListener("click", () => updateSelection("Pumpkin"));
});
