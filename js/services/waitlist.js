const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjvkTDouoDXWbSvmKCsznmiRc51S5uP9BDBzBJ8CnEaHGTDFPODgH39ZJWg2XtSgQdUg/exec";

export function initWaitlist() {
    const form = document.getElementById("email-form");
    const email = document.getElementById("email");
    const status = document.getElementById("status");
    const placeholder = document.getElementById("animated-placeholder");
    if (!form || !email || !status || !placeholder) return;
    const marquee = document.createElement("div");
    marquee.className = "scrolling-text-container";
    for (let index = 0; index < 2; index += 1) {
        const text = document.createElement("span");
        text.className = "scrolling-text";
        text.textContent = "ENTER EMAIL TO JOIN THE WAITLIST...";
        marquee.append(text);
    }
    placeholder.replaceChildren(marquee);
    email.addEventListener("focus", () => { placeholder.hidden = true; });
    email.addEventListener("blur", () => { placeholder.hidden = email.value !== ""; });
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
            const states = { success: ["Welcome to the movement.", "#7dff7d"], duplicate: ["Already signed up.", "#ffbf47"] };
            const [message, color] = states[data.status] || ["Something went wrong.", "#ff6b6b"];
            status.textContent = message;
            status.style.color = color;
            if (data.status === "success") { email.value = ""; placeholder.hidden = false; }
        } catch (error) {
            console.error("Waitlist request failed.", error);
            status.textContent = "Unable to connect.";
            status.style.color = "#ff6b6b";
        }
    });
}
