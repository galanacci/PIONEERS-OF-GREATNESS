const LAUNCH_LOADING_DURATION = 1500;
const LAUNCH_BLACKOUT_FADE_DURATION = 250;
const LAUNCH_BLACK_HOLD_DURATION = 100;

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

function getLoadingElements() {
    const loading = document.getElementById("pog-launch-loading");
    const loadingVideo = document.getElementById("pog-launch-loading-video");
    const loadingProgress = document.getElementById("pog-launch-progress");

    return {
        loading,
        loadingVideo,
        loadingProgress,
        loadingProgressFill: loadingProgress?.querySelector(".pog-launch-progress-fill"),
        loadingProgressValue: loadingProgress?.querySelector(".pog-launch-progress-value")
    };
}

function setLoadingProgress(elements, value) {
    const progress = clamp(value, 0, 100);
    const rounded = Math.round(progress);

    elements.loadingProgress?.setAttribute("aria-valuenow", String(rounded));
    if (elements.loadingProgressFill) {
        elements.loadingProgressFill.style.transform = `scaleX(${progress / 100})`;
    }
    if (elements.loadingProgressValue) {
        elements.loadingProgressValue.textContent = `${String(rounded).padStart(3, "0")}%`;
    }
}

function runLoadingProgress(elements, startedAt) {
    return new Promise((resolve) => {
        setLoadingProgress(elements, 0);

        const update = (now) => {
            const progress = Math.min(1, (now - startedAt) / LAUNCH_LOADING_DURATION);
            setLoadingProgress(elements, progress * 100);

            if (progress >= 1) {
                resolve();
                return;
            }

            requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
    });
}

function prepareLoadingVideo(loadingVideo) {
    if (!loadingVideo || loadingVideo.src) return;

    const mobile = window.matchMedia(
        "(max-width: 760px), (hover: none), (pointer: coarse)"
    ).matches;

    loadingVideo.src = mobile
        ? loadingVideo.dataset.mobileSrc
        : loadingVideo.dataset.desktopSrc;

    loadingVideo.load();
}

function waitForDestination() {
    return new Promise((resolve) => {
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
}

function openDestination({ source, destination, preview }) {
    if (destination === "menu") {
        // External launch is deterministic: the GALANACCI desktop has already
        // performed the "open app" action, so PoG boots straight to its menu
        // without consulting the first-visit poem state.
        window.dispatchEvent(new CustomEvent("pog:ambience-prime"));
        window.dispatchEvent(new CustomEvent("pog:opening-complete"));

        window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("pog:ambience-reveal"));
        }, 1000);

        return;
    }

    // Normal PoG desktop launches keep the existing first-visit / returning
    // visitor logic owned by founder.js.
    window.dispatchEvent(new CustomEvent("pog:start-requested", {
        detail: { source, preview }
    }));
}

function releasePreviewAfterExit(preview) {
    if (preview !== "loading") return;

    window.addEventListener("pog:ambience-stop", () => {
        document.documentElement.classList.remove("loading-preview");
    }, { once: true });
}

export async function runPoGBoot({
    source = "launcher",
    destination = null,
    preview = null
} = {}) {
    const elements = getLoadingElements();
    const { loading, loadingVideo } = elements;

    window.dispatchEvent(new CustomEvent("pog:menu-sound", {
        detail: { name: "boot" }
    }));

    if (!loading || !loadingVideo) {
        openDestination({ source, destination, preview });
        releasePreviewAfterExit(preview);
        return;
    }

    prepareLoadingVideo(loadingVideo);

    const loadingStartedAt = performance.now();
    const progressComplete = runLoadingProgress(elements, loadingStartedAt);

    loading.hidden = false;
    loading.setAttribute("aria-hidden", "false");
    loading.classList.remove("is-blackout", "is-exiting");

    requestAnimationFrame(() => loading.classList.add("is-open"));

    if (loadingVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
        await Promise.race([
            new Promise((resolve) => {
                loadingVideo.addEventListener("loadedmetadata", resolve, { once: true });
            }),
            wait(1000)
        ]);
    }

    const loadingDurationSeconds = LAUNCH_LOADING_DURATION / 1000;
    const playableDuration = Math.max(
        0,
        (Number.isFinite(loadingVideo.duration)
            ? loadingVideo.duration
            : loadingDurationSeconds) - loadingDurationSeconds
    );

    loadingVideo.currentTime = Math.random() * playableDuration;
    loadingVideo.play().catch(() => {
        // Muted playback may still be restricted on some browsers.
    });

    await progressComplete;

    loading.classList.add("is-blackout");
    await wait(LAUNCH_BLACKOUT_FADE_DURATION + LAUNCH_BLACK_HOLD_DURATION);

    loadingVideo.pause();

    // Build/open the destination underneath the solid-black boot layer.
    openDestination({ source, destination, preview });
    await waitForDestination();
    releasePreviewAfterExit(preview);

    loading.classList.add("is-exiting");
    loading.classList.remove("is-open");
    loading.setAttribute("aria-hidden", "true");
    loading.hidden = true;
    loading.classList.remove("is-blackout", "is-exiting");
}
