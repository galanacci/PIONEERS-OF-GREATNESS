const SOUND_SHAPES = {
    select: [
        { frequency: 430, endFrequency: 560, duration: 0.045, gain: 0.022, type: "triangle" }
    ],
    confirm: [
        { frequency: 310, endFrequency: 430, duration: 0.07, gain: 0.026, type: "triangle" },
        { frequency: 620, endFrequency: 760, duration: 0.055, gain: 0.018, type: "sine", delay: 0.035 }
    ],
    locked: [
        { frequency: 190, endFrequency: 105, duration: 0.16, gain: 0.032, type: "square" },
        { frequency: 95, endFrequency: 70, duration: 0.18, gain: 0.018, type: "triangle", delay: 0.025 }
    ]
};

export function initMenuSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    let context;
    const mobileAudioMix = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const effectsGain = mobileAudioMix ? 3 : 1.18;
    let keyboardNavigation = false;
    let hoveredControl = null;
    let soundSequence = 0;
    let unlockPromise = null;
    let audioWarmed = false;

    const interactiveFrom = (target) => target instanceof Element
        ? target.closest("button, a[href], [role='button'], [role='option'], [role='menuitem']")
        : null;
    const isMainMenuControl = (control) => control?.matches(".menu-item");
    const isLocked = (control) => control?.matches("[aria-disabled='true'], [disabled]")
        || control?.dataset.status === "development";
    const emit = (name) => window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name } }));

    const warmAudioPath = () => {
        if (audioWarmed || !context || context.state !== "running") return;
        audioWarmed = true;
        const buffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
    };

    const unlockAudio = () => {
        context ||= window.__pogAudioContext || new AudioContext();
        window.__pogAudioContext = context;
        if (context.state === "running") {
            warmAudioPath();
            return Promise.resolve();
        }
        unlockPromise ||= context.resume()
            .then(() => warmAudioPath())
            .finally(() => { unlockPromise = null; });
        return unlockPromise;
    };

    const playTone = ({ frequency, endFrequency, duration, gain, type, delay = 0 }) => {
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(gain * effectsGain, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
    };

    window.addEventListener("pog:menu-sound", async (event) => {
        const shape = SOUND_SHAPES[event.detail?.name];
        if (!shape) return;
        const request = ++soundSequence;
        await unlockAudio();
        if (request !== soundSequence || context.state !== "running") return;
        shape.forEach(playTone);
    });

    document.addEventListener("keydown", (event) => {
        if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            keyboardNavigation = true;
        }
    }, true);

    document.addEventListener("pointerdown", (event) => {
        // Mobile browsers only authorize Web Audio from a direct physical gesture.
        // Unlock before delegated menu and room handlers emit their feedback tone.
        unlockAudio().catch(() => {});
        keyboardNavigation = false;
        const control = interactiveFrom(event.target);
        if (event.pointerType === "touch" && control && !isMainMenuControl(control)) emit("select");
    }, true);

    document.addEventListener("touchstart", () => {
        unlockAudio().catch(() => {});
    }, { capture: true, passive: true });

    document.addEventListener("pointerover", (event) => {
        if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        const control = interactiveFrom(event.target);
        if (!control || isMainMenuControl(control) || control === hoveredControl) return;
        hoveredControl = control;
        emit("select");
    }, true);

    document.addEventListener("pointerout", (event) => {
        const remainsInside = event.relatedTarget instanceof Node && hoveredControl?.contains(event.relatedTarget);
        if (hoveredControl && !remainsInside) hoveredControl = null;
    }, true);

    document.addEventListener("focusin", (event) => {
        if (!keyboardNavigation) return;
        const control = interactiveFrom(event.target);
        if (control && !isMainMenuControl(control)) emit("select");
    }, true);

    document.addEventListener("click", (event) => {
        const control = interactiveFrom(event.target);
        if (!control || isMainMenuControl(control)) return;
        emit(isLocked(control) ? "locked" : "confirm");
    });
}
