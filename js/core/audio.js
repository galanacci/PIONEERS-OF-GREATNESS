export function initAudio() {
    const video = document.querySelector(".background-video");
    const button = document.querySelector(".audio-toggle");
    const label = button?.querySelector(".audio-label");
    if (!video || !button || !label) return;
    const render = () => {
        const enabled = !video.muted;
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", enabled ? "Mute background audio" : "Turn background audio on");
        label.textContent = enabled ? "SOUND ON" : "SOUND OFF";
    };
    video.muted = true;
    render();
    button.addEventListener("click", async () => {
        video.muted = !video.muted;
        if (video.paused) await video.play().catch((error) => console.error("Background video could not resume.", error));
        render();
    });
    video.addEventListener("volumechange", render);
}
