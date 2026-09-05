const ROOM_ID = "founder-room";

export function initFounderMission() {
    const video = document.getElementById("founder-mission-video");
    const play = document.querySelector(".founder-mission-play");
    const label = play?.querySelector("[data-founder-play-label]");
    const backgroundVideo = document.querySelector(".background-video");
    if (!video || !play || !label) return;

    let backgroundWasPlaying = false;

    const showPlayControl = (text = "PLAY") => {
        play.hidden = false;
        label.textContent = text;
        video.controls = false;
    };

    const stop = () => {
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
    window.addEventListener("pog:room-closing", (event) => {
        if (event.detail?.roomId === ROOM_ID) stop();
    });
}
