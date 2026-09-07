const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjvkTDouoDXWbSvmKCsznmiRc51S5uP9BDBzBJ8CnEaHGTDFPODgH39ZJWg2XtSgQdUg/exec";

export function initWaitlist() {
    const form = document.getElementById("email-form");
    const email = document.getElementById("email");
    const status = document.getElementById("status");
    const placeholder = document.getElementById("animated-placeholder");
    if (!form || !email || !status || !placeholder) return;

    const marquee = document.createElement("span");
    marquee.className = "scrolling-text-container";
    for (let index = 0; index < 2; index += 1) {
        const text = document.createElement("span");
        text.className = "scrolling-text";
        text.textContent = "ENTER EMAIL TO JOIN THE WAITLIST...";
        marquee.append(text);
    }
    placeholder.replaceChildren(marquee);

    window.addEventListener("pog:waitlist-requested", () => {
        form.classList.add("is-direct-entry");
        placeholder.hidden = true;
        status.textContent = "";
        status.style.removeProperty("color");
    });
    window.addEventListener("pog:waitlist-dismissed", () => {
        status.textContent = "";
        status.style.removeProperty("color");
        form.classList.remove("is-direct-entry");
        placeholder.hidden = email.value !== "";
    });
    email.addEventListener("input", () => { placeholder.hidden = form.classList.contains("is-direct-entry") || email.value !== ""; });
    email.addEventListener("blur", () => {
        if (email.value !== "") return;
        form.classList.remove("is-direct-entry");
        placeholder.hidden = false;
    });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const value = email.value.trim();
        if (!value) { status.textContent = "Please enter an email."; return; }
        status.textContent = "Joining...";
        try {
            const body = new FormData();
            body.append("email", value);
            const response = await fetch(SCRIPT_URL, { method: "POST", body });
            const data = await response.json();
            const states = { success: "Welcome to the movement.", duplicate: "Already signed up." };
            const message = states[data.status] || "Something went wrong.";
            status.textContent = message;
            status.style.removeProperty("color");
            if (data.status === "success" || data.status === "duplicate") {
                email.value = "";
                form.classList.remove("is-direct-entry");
                placeholder.hidden = false;
                status.textContent = "";
                window.dispatchEvent(new CustomEvent("pog:waitlist-complete", { detail: { status: data.status } }));
            }
        } catch (error) {
            console.error("Waitlist request failed.", error);
            status.textContent = "Unable to connect.";
            status.style.removeProperty("color");
        }
    });
}
