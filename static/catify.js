document.addEventListener("DOMContentLoaded", function () {
    fetch("http://127.0.0.1:5000/catify/get-cats")
    console.log("✅ catify.js loaded and ready.");
});
