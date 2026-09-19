import { runPoGBoot } from "./boot.js";

const POSITION_KEY = "pog:desktop-shortcut-position:v1";
const HINT_KEY = "pog:desktop-shortcut-hint:v1";
const GRID = 16;
const EDGE = 20;
const LAUNCH_START_DELAY = 180;

const LOADING_PREVIEW_ENABLED =
    new URLSearchParams(window.location.search).get("preview") === "loading";

if (LOADING_PREVIEW_ENABLED) {
    document.documentElement.classList.add("loading-preview");
}

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
    const shortcutHint = document.getElementById("pog-exe-hint");
    const shortcutInstruction = document.getElementById("pog-exe-instruction");

    if (!desktop || !shortcut) return;

    let position = null;
    let dragging = false;
    let pointerStart = null;
    let origin = null;
    let moved = false;
    let mobileLaunchTimer = null;
    let launching = false;

    const isTouchLauncher =
        window.matchMedia("(hover: none), (pointer: coarse)").matches;

    let hintDismissed = false;
    try {
        hintDismissed = localStorage.getItem(HINT_KEY) === "dismissed";
    } catch {
        // Persistence is optional.
    }

    const positionHint = () => {
        if (!shortcutHint || !position) return;

        const width = 200;
        const x = clamp(
            position.x + (shortcut.offsetWidth / 2) - (width / 2),
            8,
            Math.max(8, window.innerWidth - width - 8)
        );
        const below = position.y + shortcut.offsetHeight + 9;
        const y = below + 24 <= window.innerHeight
            ? below
            : Math.max(8, position.y - 27);

        shortcutHint.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const dismissHint = () => {
        if (!shortcutHint || hintDismissed) return;

        hintDismissed = true;
        shortcutHint.classList.add("is-dismissing");
        shortcutHint.classList.remove("is-visible");

        try {
            localStorage.setItem(HINT_KEY, "dismissed");
        } catch {
            // Persistence is optional.
        }
    };

    const save = () => {
        try {
            localStorage.setItem(POSITION_KEY, JSON.stringify(position));
        } catch {
            // Persistence is optional.
        }
    };

    const render = () => {
        if (!position) return;

        const bounds = positionBounds(shortcut);
        position = {
            x: clamp(snap(position.x), EDGE, bounds.x),
            y: clamp(snap(position.y), EDGE, bounds.y)
        };

        shortcut.style.transform =
            `translate3d(${position.x}px, ${position.y}px, 0)`;

        positionHint();
    };

    const initialise = () => {
        try {
            position = JSON.parse(localStorage.getItem(POSITION_KEY));
        } catch {
            position = null;
        }

        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            const bounds = positionBounds(shortcut);
            position = {
                x: snap(EDGE + Math.random() * Math.max(0, bounds.x - EDGE)),
                y: snap(EDGE + Math.random() * Math.max(0, bounds.y - EDGE))
            };
            save();
        }

        render();

        // Do not expose the browser's default 0,0 placement before the saved
        // grid coordinate has painted; it reads as a flicker on refresh.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            shortcut.classList.add("is-ready");

            if (!hintDismissed && shortcutHint) {
                shortcutHint.classList.add("is-visible");
            }
        }));
    };

    const select = () => shortcut.classList.add("is-selected");
    const wait = (duration) =>
        new Promise((resolve) => window.setTimeout(resolve, duration));

    const launch = async () => {
        if (launching) return;

        launching = true;
        window.clearTimeout(mobileLaunchTimer);
        mobileLaunchTimer = null;

        await wait(LAUNCH_START_DELAY);

        dismissHint();
        shortcut.classList.remove("is-selected");

        try {
            await runPoGBoot({
                source: "launcher",
                preview: LOADING_PREVIEW_ENABLED ? "loading" : null
            });
        } finally {
            launching = false;
        }
    };

    shortcut.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;

        select();
        window.dispatchEvent(new CustomEvent("pog:menu-sound", {
            detail: { name: "select" }
        }));

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

        position = {
            x: clamp(origin.x + dx, EDGE, bounds.x),
            y: clamp(origin.y + dy, EDGE, bounds.y)
        };

        render();
    });

    const finishDrag = (event) => {
        if (!dragging) return;

        dragging = false;
        shortcut.releasePointerCapture?.(event.pointerId);

        if (moved) {
            save();
        } else if (isTouchLauncher) {
            window.clearTimeout(mobileLaunchTimer);
            mobileLaunchTimer = window.setTimeout(launch, 0);
        }
    };

    shortcut.addEventListener("pointerup", finishDrag);
    shortcut.addEventListener("pointercancel", finishDrag);

    shortcut.addEventListener("dblclick", (event) => {
        event.preventDefault();
        if (!isTouchLauncher && !moved) launch();
    });

    shortcut.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            launch();
        }
    });

    // Keep the existing developer-only loading preview route intact.
    if (LOADING_PREVIEW_ENABLED) {
        window.setTimeout(() => launch(), 0);
    }

    desktop.addEventListener("pointerdown", (event) => {
        if (event.target === desktop) {
            shortcut.classList.remove("is-selected");
        }
    });

    window.addEventListener("resize", () => {
        render();
        save();
    });

    if (shortcutHint) {
        shortcutHint.textContent =
            isTouchLauncher ? "TAP TO OPEN" : "DOUBLE CLICK TO OPEN";
    }

    if (shortcutInstruction) {
        shortcutInstruction.textContent = isTouchLauncher
            ? "Tap the shortcut to enter PIONEERS OF GREATNESS."
            : "Select the shortcut, then double click or press Enter to enter PIONEERS OF GREATNESS.";
    }

    shortcut.setAttribute(
        "aria-label",
        isTouchLauncher
            ? "PoG.EXE shortcut. Tap to enter."
            : "PoG.EXE shortcut. Double click or press Enter to enter."
    );

    initialise();
}
