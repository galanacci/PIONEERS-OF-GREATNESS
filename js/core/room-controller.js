import { isKnownRoom } from "../room-registry.js";

export function initRoomController() {
    const rooms = [...document.querySelectorAll(".world-room")];
    const transition = document.getElementById("room-transition");
    const background = document.querySelectorAll("nav, #container, .container, .copyright, #menu-overlay");
    if (!rooms.length || !transition) return;
    let activeRoom = null;
    let timers = [];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? { open: 0, finish: 0, close: 0 } : { open: 320, finish: 520, close: 240 };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const inert = (value) => background.forEach((region) => { region.inert = value; });
    const showTransition = () => { transition.classList.add("is-active"); transition.setAttribute("aria-hidden", "false"); };
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
    rooms.forEach((room) => room.querySelector("[data-room-close]")?.addEventListener("click", closeRoom));
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
