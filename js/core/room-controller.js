import { isKnownRoom } from "../room-registry.js";

export function initRoomController() {
    const rooms = [...document.querySelectorAll(".world-room")];
    const transition = document.getElementById("room-transition");
    const background = document.querySelectorAll("nav, #container, .container, .copyright, #menu-overlay");
    if (!rooms.length || !transition) return;
    let activeRoom = null;
    let timers = [];
    let transitionEntry = null;
    let entrySequence = 0;
    // The veil stays for at least one second, and remains until the destination
    // has built its first visible state. The fallback prevents a failed room
    // from trapping a visitor behind LOADING forever.
    const minimumEntryDelay = 1000;
    const maximumEntryDelay = 6000;
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const inert = (value) => background.forEach((region) => { region.inert = value; });
    const showTransition = () => {
        transition.classList.add("is-active");
        transition.setAttribute("aria-hidden", "false");
    };
    const hideTransition = () => { transition.classList.remove("is-active"); transition.setAttribute("aria-hidden", "true"); };
    const revealRoom = (next, roomId) => {
        rooms.forEach((room) => {
            const open = room === next;
            room.classList.toggle("is-open", open);
            room.setAttribute("aria-hidden", String(!open));
        });
        activeRoom = next;
        activeRoom.querySelector("[data-room-close]")?.focus();
        window.dispatchEvent(new CustomEvent("pog:room-opened", { detail: { roomId } }));
    };
    const openRoom = (roomId, { skipTransition = false } = {}) => {
        if (!isKnownRoom(roomId)) return;
        const next = rooms.find((room) => room.id === roomId);
        if (!next) return;
        clearTimers();
        entrySequence += 1;
        transitionEntry = null;
        inert(true);
        if (skipTransition) {
            hideTransition();
            revealRoom(next, roomId);
            return;
        }
        showTransition();
        const token = entrySequence;
        const startedAt = performance.now();
        let completed = false;
        const complete = () => {
            if (completed || token !== entrySequence) return;
            completed = true;
            const remaining = Math.max(0, minimumEntryDelay - (performance.now() - startedAt));
            timers.push(setTimeout(() => {
                if (token === entrySequence) hideTransition();
            }, remaining));
        };
        transitionEntry = { roomId, token, complete };
        timers.push(setTimeout(complete, maximumEntryDelay));
        // Build the destination underneath the loading veil immediately.
        revealRoom(next, roomId);
    };
    const closeRoom = () => {
        if (!activeRoom) return;
        const room = activeRoom;
        clearTimers();
        entrySequence += 1;
        transitionEntry = null;
        hideTransition();
        window.dispatchEvent(new CustomEvent("pog:room-closing", { detail: { roomId: room.id } }));
        room.classList.remove("is-open"); room.setAttribute("aria-hidden", "true"); activeRoom = null;
        inert(false);
        window.dispatchEvent(new CustomEvent("pog:room-closed", { detail: { roomId: room.id } }));
        window.dispatchEvent(new CustomEvent("pog:return-to-menu"));
    };
    window.addEventListener("pog:open-room", (event) => openRoom(event.detail?.roomId, {
        skipTransition: event.detail?.skipTransition === true
    }));
    window.addEventListener("pog:room-ready", (event) => {
        if (event.detail?.roomId === transitionEntry?.roomId) transitionEntry.complete();
    });
    window.addEventListener("pog:show-transition", showTransition);
    window.addEventListener("pog:hide-transition", hideTransition);
    rooms.forEach((room) => {
        room.querySelectorAll("[data-room-close]").forEach((button) => button.addEventListener("click", closeRoom));
    });
    document.addEventListener("keydown", (event) => {
        if (!activeRoom) return;
        if (event.key === "Escape") { event.preventDefault(); closeRoom(); return; }
        if (event.key !== "Tab") return;
        const focusable = [...activeRoom.querySelectorAll("button:not([disabled]), a[href]")]
            .filter((element) => !element.closest("[hidden]") && element.getClientRects().length);
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
}
