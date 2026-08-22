const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTAn7Ud_iKrspHrP_hUlrrGUGW7fnjbE2SLikfHq3ppeRJyFp8nYLzqZ1IjgtRePIn2A/exec";

function startScrolling() {
    const placeholder = document.getElementById("animated-placeholder");
    if (!placeholder) return;

    const text = "ENTER YOUR EMAIL HERE...";

    const container = document.createElement("div");
    container.className = "scrolling-text-container";

    const span1 = document.createElement("span");
    span1.className = "scrolling-text";
    span1.textContent = text;

    const span2 = document.createElement("span");
    span2.className = "scrolling-text";
    span2.textContent = text;

    container.appendChild(span1);
    container.appendChild(span2);

    placeholder.innerHTML = "";
    placeholder.appendChild(container);
}

document.addEventListener("DOMContentLoaded", () => {

    const emailInput = document.getElementById("email");
    const animatedPlaceholder = document.getElementById("animated-placeholder");
    const emailForm = document.getElementById("email-form");
    const statusDiv = document.getElementById("status");

    startScrolling();

    emailInput.addEventListener("focus", () => {
        animatedPlaceholder.style.display = "none";
    });

    emailInput.addEventListener("blur", () => {
        if (emailInput.value === "") {
            animatedPlaceholder.style.display = "block";
        }
    });

    emailForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = emailInput.value.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            statusDiv.textContent = "Please enter a valid email.";
            statusDiv.style.color = "#ff5555";
            return;
        }

        statusDiv.textContent = "Joining...";
        statusDiv.style.color = "#ffffff";

        try {

            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email
                })
            });

            const result = await response.json();

            switch (result.status) {

                case "success":

                    statusDiv.textContent = result.message;
                    statusDiv.style.color = "#8cff8c";

                    emailInput.value = "";
                    animatedPlaceholder.style.display = "block";

                    break;

                case "duplicate":

                    statusDiv.textContent = result.message;
                    statusDiv.style.color = "#ffd966";

                    break;

                default:

                    statusDiv.textContent = result.message || "Something went wrong.";
                    statusDiv.style.color = "#ff5555";

            }

        } catch (error) {

            console.error(error);

            statusDiv.textContent = "Unable to connect. Please try again.";
            statusDiv.style.color = "#ff5555";

        }

    });

});
