const POSITION_KEY = "pog:desktop-shortcut-position:v1";
const GRID = 16;
const EDGE = 20;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const snap = (value) => Math.round(value / GRID) * GRID;

function positionBounds(shortcut) {
    return {
        x: Math.max(EDGE, window.innerWidth - shortcut.offsetWidth - EDGE),
        y: Math.max(EDGE, window.innerHeight - shortcut.offsetHeight - EDGE - 28)
    };
}

export function initLauncher() {
    const desktop = document.getElementById("pog-desktop");
    const shortcut = document.getElementById("pog-exe-shortcut");
    if (!desktop || !shortcut) return;

    let position = null;
    let dragging = false;
    let pointerStart = null;
    let origin = null;
    let moved = false;
    let mobileLaunchTimer = null;
    const isTouchLauncher = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    const save = () => {
        try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* persistence is optional */ }
    };
    const render = () => {
        if (!position) return;
        const bounds = positionBounds(shortcut);
        position = { x: clamp(snap(position.x), EDGE, bounds.x), y: clamp(snap(position.y), EDGE, bounds.y) };
        shortcut.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    };
    const initialise = () => {
        try { position = JSON.parse(localStorage.getItem(POSITION_KEY)); } catch { position = null; }
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            const bounds = positionBounds(shortcut);
            position = {
                x: snap(EDGE + Math.random() * Math.max(0, bounds.x - EDGE)),
                y: snap(EDGE + Math.random() * Math.max(0, bounds.y - EDGE))
            };
            save();
        }
        render();
        // Do not expose the browser's default 0,0 placement before the saved grid
        // coordinate has painted; it reads as a flicker on refresh.
        requestAnimationFrame(() => requestAnimationFrame(() => shortcut.classList.add("is-ready")));
    };
    const select = () => shortcut.classList.add("is-selected");
    const launch = () => {
        window.clearTimeout(mobileLaunchTimer);
        mobileLaunchTimer = null;
        shortcut.classList.remove("is-selected");
        window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name: "boot" } }));
        window.dispatchEvent(new CustomEvent("pog:start-requested"));
    };

    shortcut.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        select();
        window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name: "select" } }));
        dragging = true;
        moved = false;
        pointerStart = { x: event.clientX, y: event.clientY };
        origin = { ...position };
        shortcut.setPointerCapture?.(event.pointerId);
    });
    shortcut.addEventListener("pointermove", (event) => {
        if (!dragging || !pointerStart || !origin) return;
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        if (moved) {
            window.clearTimeout(mobileLaunchTimer);
            mobileLaunchTimer = null;
        }
        if (!moved) return;
        const bounds = positionBounds(shortcut);
        position = { x: clamp(origin.x + dx, EDGE, bounds.x), y: clamp(origin.y + dy, EDGE, bounds.y) };
        render();
    });
    const finishDrag = (event) => {
        if (!dragging) return;
        dragging = false;
        shortcut.releasePointerCapture?.(event.pointerId);
        if (moved) save();
        else if (isTouchLauncher) {
            window.clearTimeout(mobileLaunchTimer);
            mobileLaunchTimer = window.setTimeout(launch, 150);
        }
    };
    shortcut.addEventListener("pointerup", finishDrag);
    shortcut.addEventListener("pointercancel", finishDrag);
    shortcut.addEventListener("dblclick", (event) => {
        event.preventDefault();
        if (!isTouchLauncher && !moved) launch();
    });
    shortcut.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); launch(); }
    });
    desktop.addEventListener("pointerdown", (event) => { if (event.target === desktop) shortcut.classList.remove("is-selected"); });
    window.addEventListener("resize", () => { render(); save(); });
    initialise();
}
