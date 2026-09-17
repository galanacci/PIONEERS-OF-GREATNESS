const POSITION_KEY = "pog:desktop-shortcut-position:v1";
const GRID = 16;
const EDGE = 20;
const LAUNCH_LOADING_DURATION = 1500;

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
    const loading = document.getElementById("pog-launch-loading");
    const loadingVideo = document.getElementById("pog-launch-loading-video");
    if (!desktop || !shortcut) return;

    let position = null;
    let dragging = false;
    let pointerStart = null;
    let origin = null;
    let moved = false;
    let mobileLaunchTimer = null;
    let launching = false;
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
    const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
    const waitForDestination = () => new Promise((resolve) => {
        const startedAt = performance.now();
        const check = () => {
            const menu = document.getElementById("menu-overlay");
            const poem = document.getElementById("founder-introduction");
            const menuReady = menu?.classList.contains("is-open")
                && Number.parseFloat(getComputedStyle(menu).opacity) >= 0.99;
            const poemReady = poem?.classList.contains("is-open")
                && getComputedStyle(poem).visibility === "visible";
            if (menuReady || poemReady || performance.now() - startedAt >= 1000) {
                resolve();
                return;
            }
            requestAnimationFrame(check);
        };
        check();
    });
    const launch = async () => {
        if (launching) return;
        launching = true;
        window.clearTimeout(mobileLaunchTimer);
        mobileLaunchTimer = null;
        shortcut.classList.remove("is-selected");
        window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name: "boot" } }));
        if (loading && loadingVideo) {
            const loadingStartedAt = performance.now();
            loading.hidden = false;
            loading.setAttribute("aria-hidden", "false");
            requestAnimationFrame(() => loading.classList.add("is-open"));
            if (loadingVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
                await Promise.race([
                    new Promise((resolve) => loadingVideo.addEventListener("loadedmetadata", resolve, { once: true })),
                    wait(1000)
                ]);
            }
            const loadingDurationSeconds = LAUNCH_LOADING_DURATION / 1000;
            const playableDuration = Math.max(0, (Number.isFinite(loadingVideo.duration) ? loadingVideo.duration : loadingDurationSeconds) - loadingDurationSeconds);
            loadingVideo.currentTime = Math.random() * playableDuration;
            loadingVideo.play().catch(() => { /* Muted playback may still be restricted on some browsers. */ });
            // The loading screen is intentional pacing, not merely a network wait.
            await wait(Math.max(0, LAUNCH_LOADING_DURATION - (performance.now() - loadingStartedAt)));
            // Keep the loading layer mounted until the destination is fully
            // visible. Removing it after an arbitrary frame count exposed the
            // desktop for a single frame while the menu was still fading in.
            window.dispatchEvent(new CustomEvent("pog:start-requested", { detail: { source: "launcher" } }));
            await waitForDestination();
            loading.classList.remove("is-open");
            loading.setAttribute("aria-hidden", "true");
            loadingVideo.pause();
            loading.hidden = true;
        } else {
            window.dispatchEvent(new CustomEvent("pog:start-requested", { detail: { source: "launcher" } }));
        }
        launching = false;
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
