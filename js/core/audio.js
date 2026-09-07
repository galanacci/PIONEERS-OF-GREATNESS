export function initAudio() {
    const video = document.querySelector(".background-video");
    const ambience = document.getElementById("site-ambience");
    const button = document.querySelector(".audio-toggle");
    const label = button?.querySelector(".audio-label");
    if (!video || !ambience || !button || !label) return;
    const ambienceVolume = 0.12;
    let visitorMuted = false;

    const render = () => {
        const enabled = !ambience.paused && !ambience.muted;
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", enabled ? "Turn training ambience off" : "Turn training ambience on");
        label.textContent = enabled ? "SOUND ON" : "SOUND OFF";
    };

    const randomStartTime = () => {
        if (!Number.isFinite(ambience.duration) || ambience.duration <= 1) return null;
        return Math.random() * (ambience.duration - 1);
    };

    const playFromRandomPoint = async () => {
        ambience.muted = visitorMuted;
        let startTime = randomStartTime();
        const seekToStart = () => {
            if (startTime === null) startTime = randomStartTime();
            if (startTime !== null) ambience.currentTime = startTime;
        };
        if (startTime === null) {
            ambience.addEventListener("loadedmetadata", seekToStart, { once: true });
        } else {
            seekToStart();
        }
        const playback = ambience.play();
        // Chromium can reset an audio element to zero as playback begins, so
        // reapply the chosen offset both immediately and once play settles.
        seekToStart();
        await playback.catch((error) => console.error("Training ambience could not begin.", error));
        seekToStart();
        render();
    };

    const stop = () => {
        ambience.pause();
        ambience.currentTime = 0;
        render();
    };

    video.defaultMuted = true;
    video.muted = true;
    ambience.volume = ambienceVolume;
    render();

    button.addEventListener("click", async () => {
        if (ambience.paused) {
            visitorMuted = false;
            ambience.muted = false;
            await playFromRandomPoint();
        } else {
            visitorMuted = !ambience.muted;
            ambience.muted = visitorMuted;
            render();
        }
    });

    // The visual background must never become the site's sound source.
    video.addEventListener("volumechange", () => {
        if (!video.muted) video.muted = true;
    });
    ambience.addEventListener("play", render);
    ambience.addEventListener("pause", render);
    window.addEventListener("pog:menu-opened", (event) => {
        if (event.detail?.randomizeAmbience) playFromRandomPoint();
    });
    window.addEventListener("pog:start-requested", playFromRandomPoint);
    window.addEventListener("pog:ambience-stop", stop);
}
