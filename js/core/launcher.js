const POSITION_KEY = "pog:desktop-shortcut-position:v1";
const HINT_KEY = "pog:desktop-shortcut-hint:v1";
const GRID = 16;
const EDGE = 20;
const LAUNCH_START_DELAY = 180;
const LAUNCH_LOADING_DURATION = 1500;
const LAUNCH_BLACKOUT_FADE_DURATION = 250;
const LAUNCH_BLACK_HOLD_DURATION = 100;
const LOADING_PREVIEW_ENABLED = new URLSearchParams(window.location.search).get("preview") === "loading";

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
    const loading = document.getElementById("pog-launch-loading");
    const loadingVideo = document.getElementById("pog-launch-loading-video");
    const loadingProgress = document.getElementById("pog-launch-progress");
    const loadingProgressFill = loadingProgress?.querySelector(".pog-launch-progress-fill");
    const loadingProgressValue = loadingProgress?.querySelector(".pog-launch-progress-value");
    if (!desktop || !shortcut) return;

    let position = null;
    let dragging = false;
    let pointerStart = null;
    let origin = null;
    let moved = false;
    let mobileLaunchTimer = null;
    let launching = false;
    const isTouchLauncher = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    let hintDismissed = false;
    try { hintDismissed = localStorage.getItem(HINT_KEY) === "dismissed"; } catch { /* persistence is optional */ }

    const positionHint = () => {
        if (!shortcutHint || !position) return;
        const width = 200;
        const x = clamp(position.x + (shortcut.offsetWidth / 2) - (width / 2), 8, Math.max(8, window.innerWidth - width - 8));
        const below = position.y + shortcut.offsetHeight + 9;
        const y = below + 24 <= window.innerHeight ? below : Math.max(8, position.y - 27);
        shortcutHint.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const dismissHint = () => {
        if (!shortcutHint || hintDismissed) return;
        hintDismissed = true;
        shortcutHint.classList.add("is-dismissing");
        shortcutHint.classList.remove("is-visible");
        try { localStorage.setItem(HINT_KEY, "dismissed"); } catch { /* persistence is optional */ }
    };

    const save = () => {
        try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* persistence is optional */ }
    };
    const render = () => {
        if (!position) return;
        const bounds = positionBounds(shortcut);
        position = { x: clamp(snap(position.x), EDGE, bounds.x), y: clamp(snap(position.y), EDGE, bounds.y) };
        shortcut.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        positionHint();
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
        requestAnimationFrame(() => requestAnimationFrame(() => {
            shortcut.classList.add("is-ready");
            if (!hintDismissed && shortcutHint) shortcutHint.classList.add("is-visible");
        }));
    };
    const select = () => shortcut.classList.add("is-selected");
    const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
    const setLoadingProgress = (value) => {
        const progress = clamp(value, 0, 100);
        const rounded = Math.round(progress);
        loadingProgress?.setAttribute("aria-valuenow", String(rounded));
        if (loadingProgressFill) loadingProgressFill.style.transform = `scaleX(${progress / 100})`;
        if (loadingProgressValue) loadingProgressValue.textContent = `${String(rounded).padStart(3, "0")}%`;
    };
    const runLoadingProgress = (startedAt) => new Promise((resolve) => {
        setLoadingProgress(0);
        const update = (now) => {
            const progress = Math.min(1, (now - startedAt) / LAUNCH_LOADING_DURATION);
            setLoadingProgress(progress * 100);
            if (progress >= 1) {
                resolve();
                return;
            }
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    });
    const prepareLoadingVideo = () => {
        if (!loadingVideo || loadingVideo.src) return;
        const mobile = window.matchMedia("(max-width: 760px), (hover: none), (pointer: coarse)").matches;
        loadingVideo.src = mobile ? loadingVideo.dataset.mobileSrc : loadingVideo.dataset.desktopSrc;
        loadingVideo.load();
    };
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
        await wait(LAUNCH_START_DELAY);
        dismissHint();
        prepareLoadingVideo();
        shortcut.classList.remove("is-selected");
        window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name: "boot" } }));
        if (loading && loadingVideo) {
            const loadingStartedAt = performance.now();
            const progressComplete = runLoadingProgress(loadingStartedAt);
            loading.hidden = false;
            loading.setAttribute("aria-hidden", "false");
            loading.classList.remove("is-blackout", "is-exiting");
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
            await progressComplete;
            // Fade the loading artwork into the layer's solid black background,
            // then keep that layer mounted while the destination opens beneath it.
            loading.classList.add("is-blackout");
            await wait(LAUNCH_BLACKOUT_FADE_DURATION + LAUNCH_BLACK_HOLD_DURATION);
            loadingVideo.pause();
            // Keep the loading layer mounted until the destination is fully
            // visible. Removing it after an arbitrary frame count exposed the
            // desktop for a single frame while the menu was still fading in.
            window.dispatchEvent(new CustomEvent("pog:start-requested", { detail: { source: "launcher", preview: LOADING_PREVIEW_ENABLED ? "loading" : null } }));
            await waitForDestination();
            loading.classList.add("is-exiting");
            loading.classList.remove("is-open");
            loading.setAttribute("aria-hidden", "true");
            loading.hidden = true;
            loading.classList.remove("is-blackout", "is-exiting");
        } else {
            window.dispatchEvent(new CustomEvent("pog:start-requested", { detail: { source: "launcher", preview: LOADING_PREVIEW_ENABLED ? "loading" : null } }));
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
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); launch(); }
    });
    if (LOADING_PREVIEW_ENABLED) window.setTimeout(() => launch(), 0);
    desktop.addEventListener("pointerdown", (event) => { if (event.target === desktop) shortcut.classList.remove("is-selected"); });
    window.addEventListener("resize", () => { render(); save(); });
    if (shortcutHint) shortcutHint.textContent = isTouchLauncher ? "TAP TO OPEN" : "DOUBLE CLICK TO OPEN";
    if (shortcutInstruction) {
        shortcutInstruction.textContent = isTouchLauncher
            ? "Tap the shortcut to enter PIONEERS OF GREATNESS."
            : "Select the shortcut, then double click or press Enter to enter PIONEERS OF GREATNESS.";
    }
    shortcut.setAttribute("aria-label", isTouchLauncher
        ? "PoG.EXE shortcut. Tap to enter."
        : "PoG.EXE shortcut. Double click or press Enter to enter.");
    initialise();
}
