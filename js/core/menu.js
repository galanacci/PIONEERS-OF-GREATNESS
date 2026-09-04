import { isKnownRoom } from "../room-registry.js";

export function initMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const overlay = document.getElementById("menu-overlay");
    const panel = overlay?.querySelector(".menu-panel");
    const list = panel?.querySelector(".menu-list");
    const audio = panel?.querySelector(".audio-toggle");
    const items = [...(panel?.querySelectorAll(".menu-item") || [])];
    const regions = document.querySelectorAll("nav, #container, .container, .copyright");
    if (!toggle || !overlay || !panel || !list || !items.length) return;
    let selected = Math.max(0, items.findIndex((item) => item.classList.contains("is-selected")));
    const select = (index) => {
        selected = (index + items.length) % items.length;
        items.forEach((item, i) => {
            const active = i === selected;
            item.classList.toggle("is-selected", active);
            item.classList.remove("is-activated");
            item.tabIndex = active ? 0 : -1;
            item.toggleAttribute("aria-current", active);
        });
    };
    const open = () => {
        overlay.classList.add("is-open"); overlay.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "true"); toggle.setAttribute("aria-label", "Close menu");
        regions.forEach((region) => { region.inert = true; });
        list.classList.remove("is-keyboard-nav"); select(selected); items[selected].focus();
    };
    const close = (focusToggle = true) => {
        overlay.classList.remove("is-open"); overlay.setAttribute("aria-hidden", "true");
        toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open menu");
        regions.forEach((region) => { region.inert = false; });
        if (focusToggle) toggle.focus();
    };
    const activate = (item) => {
        select(items.indexOf(item));
        if (item.getAttribute("aria-disabled") === "true") return;
        item.classList.add("is-activated");
        if (item.dataset.menuAction === "waitlist") { close(false); document.getElementById("email")?.focus(); }
        else if (item.dataset.menuAction === "room" && isKnownRoom(item.dataset.roomTarget)) {
            close(false);
            window.dispatchEvent(new CustomEvent("pog:open-room", { detail: { roomId: item.dataset.roomTarget } }));
        } else if (item.dataset.menuAction === "exit") close();
    };
    select(selected);
    toggle.addEventListener("click", () => overlay.classList.contains("is-open") ? close() : open());
    window.addEventListener("pog:return-to-menu", open);
    panel.addEventListener("click", (event) => { const item = event.target.closest(".menu-item"); if (item) activate(item); });
    panel.addEventListener("pointerover", (event) => { list.classList.remove("is-keyboard-nav"); const item = event.target.closest(".menu-item"); if (item) select(items.indexOf(item)); });
    document.addEventListener("keydown", (event) => {
        if (!overlay.classList.contains("is-open")) return;
        if (["ArrowUp", "ArrowDown"].includes(event.key)) list.classList.add("is-keyboard-nav");
        if (event.key === "Tab") {
            event.preventDefault();
            if (document.activeElement === audio) { list.classList.add("is-keyboard-nav"); items[selected].focus(); }
            else { list.classList.remove("is-keyboard-nav"); audio?.focus(); }
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault(); select(selected + (event.key === "ArrowDown" ? 1 : -1)); items[selected].focus();
        } else if (event.key === "Enter") { event.preventDefault(); activate(items[selected]); }
        else if (event.key === "Escape") { event.preventDefault(); close(); }
    });
}
