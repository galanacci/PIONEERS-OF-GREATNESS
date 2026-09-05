import { isKnownRoom } from "../room-registry.js";

export function initRoomController() {
    const rooms = [...document.querySelectorAll(".world-room")];
    const transition = document.getElementById("room-transition");
    const transitionArt = document.getElementById("room-transition-art");
    const background = document.querySelectorAll("nav, #container, .container, .copyright, #menu-overlay");
    if (!rooms.length || !transition) return;
    let activeRoom = null;
    let timers = [];
    let transitionIndex = 0;
    const transitionGraphics = ["src/ui/loader-a7f3.webp", "src/ui/loader-c2d8.webp"];
    transitionGraphics.forEach((source) => { const image = new Image(); image.src = source; });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Room entry holds on LOADING... long enough to feel like crossing a threshold.
    const delay = reduced ? { open: 350, finish: 350, close: 0 } : { open: 900, finish: 1150, close: 240 };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const inert = (value) => background.forEach((region) => { region.inert = value; });
    const showTransition = () => {
        if (transitionArt) {
            transitionArt.src = transitionGraphics[transitionIndex];
            transitionArt.classList.toggle("is-pattern", transitionIndex === 1);
            transitionIndex = (transitionIndex + 1) % transitionGraphics.length;
        }
        transition.classList.add("is-active");
        transition.setAttribute("aria-hidden", "false");
    };
    const hideTransition = () => { transition.classList.remove("is-active"); transition.setAttribute("aria-hidden", "true"); };
    const openRoom = (roomId) => {
        if (!isKnownRoom(roomId)) return;
        const next = rooms.find((room) => room.id === roomId);
        if (!next) return;
        clearTimers(); inert(true); showTransition();
        timers.push(setTimeout(() => {
            rooms.forEach((room) => {
                const open = room === next;
                room.classList.toggle("is-open", open);
                room.setAttribute("aria-hidden", String(!open));
            });
            activeRoom = next;
            activeRoom.querySelector("[data-room-close]")?.focus();
            window.dispatchEvent(new CustomEvent("pog:room-opened", { detail: { roomId } }));
        }, delay.open));
        timers.push(setTimeout(hideTransition, delay.finish));
    };
    const closeRoom = () => {
        if (!activeRoom) return;
        const room = activeRoom;
        clearTimers(); showTransition();
        window.dispatchEvent(new CustomEvent("pog:room-closing", { detail: { roomId: room.id } }));
        timers.push(setTimeout(() => {
            room.classList.remove("is-open"); room.setAttribute("aria-hidden", "true"); activeRoom = null;
            inert(false);
            window.dispatchEvent(new CustomEvent("pog:room-closed", { detail: { roomId: room.id } }));
            window.dispatchEvent(new CustomEvent("pog:return-to-menu"));
        }, delay.close));
        timers.push(setTimeout(hideTransition, reduced ? 0 : delay.close + 200));
    };
    window.addEventListener("pog:open-room", (event) => openRoom(event.detail?.roomId));
    window.addEventListener("pog:show-transition", showTransition);
    window.addEventListener("pog:hide-transition", hideTransition);
    rooms.forEach((room) => {
        room.querySelectorAll("[data-room-close]").forEach((button) => button.addEventListener("click", closeRoom));
    });
    document.addEventListener("keydown", (event) => {
        if (!activeRoom) return;
        if (event.key === "Escape") { event.preventDefault(); closeRoom(); return; }
        if (event.key !== "Tab") return;
        const focusable = [...activeRoom.querySelectorAll("button:not([disabled]), a[href]")];
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
}
