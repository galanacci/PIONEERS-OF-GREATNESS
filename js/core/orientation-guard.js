const PHONE_SHORT_EDGE_MAX = 600;

export function initOrientationGuard() {
    const guard = document.getElementById("mobile-orientation-guard");
    if (!guard) return;

    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const landscape = window.matchMedia("(orientation: landscape)");
    const inertState = new Map();
    let mediaToResume = [];
    let locked = false;

    const isPhoneLandscape = () => (
        (coarsePointer.matches || navigator.maxTouchPoints > 0)
        && landscape.matches
        && Math.min(window.innerWidth, window.innerHeight) <= PHONE_SHORT_EDGE_MAX
    );

    const lock = () => {
        if (locked) return;
        locked = true;
        mediaToResume = [...document.querySelectorAll("audio, video")]
            .filter((media) => !media.paused && !media.ended);
        mediaToResume.forEach((media) => media.pause());
        [...document.body.children].forEach((element) => {
            if (element === guard || element.tagName === "SCRIPT") return;
            inertState.set(element, element.inert);
            element.inert = true;
        });
        document.body.classList.add("is-mobile-orientation-locked");
        guard.setAttribute("aria-hidden", "false");
        guard.focus({ preventScroll: true });
    };

    const unlock = () => {
        if (!locked) return;
        locked = false;
        inertState.forEach((wasInert, element) => { element.inert = wasInert; });
        inertState.clear();
        document.body.classList.remove("is-mobile-orientation-locked");
        guard.setAttribute("aria-hidden", "true");
        mediaToResume.forEach((media) => media.play().catch(() => {}));
        mediaToResume = [];
    };

    const update = () => {
        if (isPhoneLandscape()) lock();
        else unlock();
    };

    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    coarsePointer.addEventListener?.("change", update);
    landscape.addEventListener?.("change", update);
    update();
}
