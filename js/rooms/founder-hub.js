const ROOM_ID = "founder-room";

export function initFounderHub() {
    const room = document.getElementById(ROOM_ID);
    const hub = document.getElementById("founder-hub");
    const list = document.getElementById("founder-hub-list");
    const status = document.getElementById("founder-hub-status");
    if (!room || !hub || !list || !status) return;

    let initialized = false;
    let selected = 0;
    let buttons = [];

    const select = (index, focus = false) => {
        if (!buttons.length) return;
        selected = (index + buttons.length) % buttons.length;
        buttons.forEach((button, buttonIndex) => {
            const current = buttonIndex === selected;
            button.classList.toggle("is-selected", current);
            button.tabIndex = current ? 0 : -1;
            button.toggleAttribute("aria-current", current);
        });
        status.textContent = "SELECT A CHAPTER";
        if (focus) buttons[selected].focus();
    };

    const activate = (button) => {
        select(buttons.indexOf(button));
        const label = button.querySelector(".founder-hub-item-label")?.textContent || "CHAPTER";
        button.classList.add("is-activated");
        status.textContent = `${label} — CHAPTER IN DEVELOPMENT`;
        window.setTimeout(() => button.classList.remove("is-activated"), 220);
    };

    const createItem = (item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "founder-hub-item";
        button.setAttribute("role", "menuitem");
        button.dataset.founderSection = item.id;
        const number = document.createElement("span");
        number.className = "founder-hub-item-number";
        number.textContent = item.number;
        const label = document.createElement("span");
        label.className = "founder-hub-item-label";
        label.textContent = item.label;
        button.append(number, label);
        button.addEventListener("pointerover", () => select(index));
        button.addEventListener("click", () => activate(button));
        return button;
    };

    const load = async () => {
        if (initialized) return;
        initialized = true;
        status.textContent = "OPENING FOUNDER FILE...";
        try {
            const response = await fetch("data/founder-room.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Founder Room request failed: ${response.status}`);
            const payload = await response.json();
            if (!Array.isArray(payload.hub) || payload.hub.length !== 5) throw new Error("Founder Hub is incomplete.");
            buttons = payload.hub.map(createItem);
            list.replaceChildren(...buttons);
            select(0);
        } catch (error) {
            initialized = false;
            console.error("Founder Hub could not be loaded.", error);
            list.replaceChildren();
            status.textContent = "FOUNDER FILE TEMPORARILY UNAVAILABLE";
        }
    };

    hub.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            select(selected + (event.key === "ArrowDown" ? 1 : -1), true);
        } else if (event.key === "Enter" && buttons.includes(document.activeElement)) {
            event.preventDefault();
            activate(document.activeElement);
        }
    });

    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId !== ROOM_ID) return;
        load().then(() => buttons[selected]?.focus());
    });
}
