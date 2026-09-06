const ROOM_ID = "founder-room";

export function initFounderMission() {
    const backgroundVideo = document.querySelector(".background-video");
    const players = new Set();
    const initialized = new WeakSet();

    const setup = (player) => {
        if (!player || initialized.has(player)) return;
        const video = player.querySelector("video");
        const play = player.querySelector("[data-founder-video-play]");
        const label = play?.querySelector("[data-founder-play-label]");
        if (!video || !play || !label) return;
        initialized.add(player);
        players.add(player);
        let backgroundWasPlaying = false;
        const showPlayControl = (text = "PLAY") => {
            play.hidden = false;
            label.textContent = text;
            video.controls = false;
        };
        player.stopFounderVideo = () => {
            video.pause();
            video.currentTime = 0;
            showPlayControl();
            if (backgroundWasPlaying) backgroundVideo?.play().catch(() => {});
            backgroundWasPlaying = false;
        };
        play.addEventListener("click", async () => {
            backgroundWasPlaying = Boolean(backgroundVideo && !backgroundVideo.paused);
            backgroundVideo?.pause();
            play.hidden = true;
            video.controls = true;
            await video.play().catch((error) => {
                console.error("Founder mission video could not play.", error);
                showPlayControl();
            });
        });
        video.addEventListener("ended", () => showPlayControl("REPLAY"));
    };

    document.querySelectorAll("[data-founder-video-player]").forEach(setup);
    window.addEventListener("pog:founder-video-ready", (event) => setup(event.detail?.player));
    window.addEventListener("pog:founder-video-stop", (event) => {
        const player = event.detail?.player;
        player?.stopFounderVideo?.();
        players.delete(player);
    });
    window.addEventListener("pog:room-closing", (event) => {
        if (event.detail?.roomId === ROOM_ID) players.forEach((player) => player.stopFounderVideo?.());
    });
}
