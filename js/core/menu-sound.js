const SOUND_SHAPES = {
    select: [
        { frequency: 430, endFrequency: 560, duration: 0.045, gain: 0.022, type: "triangle" }
    ],
    confirm: [
        { frequency: 310, endFrequency: 430, duration: 0.07, gain: 0.026, type: "triangle" },
        { frequency: 620, endFrequency: 760, duration: 0.055, gain: 0.018, type: "sine", delay: 0.035 }
    ],
    boot: [
        { frequency: 58, endFrequency: 116, duration: 0.42, gain: 0.022, type: "sine" },
        { frequency: 145, endFrequency: 290, duration: 0.2, gain: 0.026, type: "triangle", delay: 0.14 },
        { frequency: 290, endFrequency: 580, duration: 0.18, gain: 0.028, type: "square", delay: 0.3 },
        { frequency: 580, endFrequency: 880, duration: 0.24, gain: 0.022, type: "sine", delay: 0.44 }
    ],
    locked: [
        { frequency: 190, endFrequency: 105, duration: 0.16, gain: 0.032, type: "square" },
        { frequency: 95, endFrequency: 70, duration: 0.18, gain: 0.018, type: "triangle", delay: 0.025 }
    ],
    shutdown: [
        { frequency: 520, endFrequency: 360, duration: 0.14, gain: 0.026, type: "square" },
        { frequency: 360, endFrequency: 220, duration: 0.18, gain: 0.03, type: "triangle", delay: 0.11 },
        { frequency: 220, endFrequency: 82, duration: 0.34, gain: 0.034, type: "sawtooth", delay: 0.25 },
        { frequency: 110, endFrequency: 48, duration: 0.42, gain: 0.022, type: "sine", delay: 0.34 }
    ],
    crtPower: [
        { frequency: 72, endFrequency: 48, duration: .16, gain: .05, type: "sine" },
        { frequency: 185, endFrequency: 92, duration: .11, gain: .03, type: "square", delay: .035 }
    ]
};

const NOISE_SHAPES = {
    crtStatic: { duration: .92, gain: .032, startFrequency: 7800, endFrequency: 7200 },
    crtTune: { duration: .24, gain: .034, startFrequency: 5200, endFrequency: 1700 }
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
    let pressedBootControl = null;
    let bootPressTimer = null;
    let crtHum = null;
    let crtStaticSource = null;

    const interactiveFrom = (target) => target instanceof Element && !target.closest('.journey-object')
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

    const playNoise = ({ duration, gain, startFrequency, endFrequency }, onSource) => {
        const length = Math.ceil(context.sampleRate * duration);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) {
            const decay = 1 - (index / length) * .24;
            samples[index] = ((Math.random() * 2) - 1) * decay;
        }
        const source = context.createBufferSource();
        const highpass = context.createBiquadFilter();
        const lowpass = context.createBiquadFilter();
        const envelope = context.createGain();
        const start = context.currentTime;
        source.buffer = buffer;
        highpass.type = "highpass";
        highpass.frequency.setValueAtTime(420, start);
        lowpass.type = "lowpass";
        lowpass.frequency.setValueAtTime(startFrequency, start);
        lowpass.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(gain * effectsGain, start + .012);
        envelope.gain.setValueAtTime(gain * effectsGain, start + Math.max(.018, duration - .06));
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        source.connect(highpass).connect(lowpass).connect(envelope).connect(context.destination);
        source.start(start);
        source.stop(start + duration + .01);
        onSource?.(source);
        return source;
    };

    const stopCrtStatic = () => {
        if (!crtStaticSource) return;
        try { crtStaticSource.stop(); } catch {}
        crtStaticSource = null;
    };

    const startCrtHum = () => {
        if (crtHum) return;
        const master = context.createGain();
        const fundamental = context.createOscillator();
        const harmonic = context.createOscillator();
        const hiss = context.createBufferSource();
        const hissFilter = context.createBiquadFilter();
        const hissGain = context.createGain();
        const hissBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = hissBuffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2) - 1;
        const start = context.currentTime;
        const humLevel = mobileAudioMix ? .014 : .009;
        master.gain.setValueAtTime(.0001, start);
        master.gain.exponentialRampToValueAtTime(humLevel, start + .32);
        fundamental.type = "sine";
        fundamental.frequency.value = 50;
        harmonic.type = "triangle";
        harmonic.frequency.value = 100;
        const harmonicGain = context.createGain();
        harmonicGain.gain.value = .28;
        hiss.buffer = hissBuffer;
        hiss.loop = true;
        hissFilter.type = "bandpass";
        hissFilter.frequency.value = 3400;
        hissFilter.Q.value = .42;
        hissGain.gain.value = .055;
        fundamental.connect(master);
        harmonic.connect(harmonicGain).connect(master);
        hiss.connect(hissFilter).connect(hissGain).connect(master);
        master.connect(context.destination);
        fundamental.start(start);
        harmonic.start(start);
        hiss.start(start);
        crtHum = { master, fundamental, harmonic, hiss };
    };

    const stopCrtHum = () => {
        if (!crtHum) return;
        const active = crtHum;
        crtHum = null;
        const now = context.currentTime;
        active.master.gain.cancelScheduledValues(now);
        active.master.gain.setValueAtTime(Math.max(.0001, active.master.gain.value), now);
        active.master.gain.exponentialRampToValueAtTime(.0001, now + .24);
        window.setTimeout(() => {
            [active.fundamental, active.harmonic, active.hiss].forEach((source) => {
                try { source.stop(); } catch {}
            });
            active.master.disconnect();
        }, 280);
    };

    window.addEventListener("pog:menu-sound", async (event) => {
        const shape = SOUND_SHAPES[event.detail?.name];
        const noise = NOISE_SHAPES[event.detail?.name];
        if (!shape && !noise) return;
        const request = ++soundSequence;
        await unlockAudio();
        if (request !== soundSequence || context.state !== "running") return;
        if (shape) shape.forEach(playTone);
        if (noise) playNoise(noise);
    });

    window.addEventListener("pog:crt-audio", async (event) => {
        const action = event.detail?.action;
        if (!action) return;
        await unlockAudio();
        if (context.state !== "running") return;
        if (action === "power") {
            stopCrtStatic();
            SOUND_SHAPES.crtPower.forEach(playTone);
            startCrtHum();
        } else if (action === "static-start") {
            stopCrtStatic();
            const requestedDuration = Number(event.detail?.duration) / 1000;
            const shape = { ...NOISE_SHAPES.crtStatic, duration: Number.isFinite(requestedDuration) ? requestedDuration : NOISE_SHAPES.crtStatic.duration };
            playNoise(shape, (source) => {
                crtStaticSource = source;
                source.addEventListener("ended", () => {
                    if (crtStaticSource === source) crtStaticSource = null;
                }, { once: true });
            });
        } else if (action === "static-stop") {
            stopCrtStatic();
        } else if (action === "tune") {
            playNoise(NOISE_SHAPES.crtTune);
        } else if (action === "stop") {
            stopCrtStatic();
            stopCrtHum();
        }
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
        if (control?.matches(".menu-toggle")) {
            window.clearTimeout(bootPressTimer);
            pressedBootControl = control;
            bootPressTimer = window.setTimeout(() => { pressedBootControl = null; }, 800);
            emit("boot");
            return;
        }
        if (event.pointerType === "touch" && control && !isMainMenuControl(control)) emit("select");
    }, true);

    document.addEventListener("pointercancel", () => {
        window.clearTimeout(bootPressTimer);
        pressedBootControl = null;
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
        if (control.matches("[data-crt-sound]")) return;
        if (control.matches("#pog-exe-shortcut")) return;
        if (control.matches(".menu-toggle")) {
            if (pressedBootControl === control) {
                window.clearTimeout(bootPressTimer);
                pressedBootControl = null;
                return;
            }
            emit("boot");
            return;
        }
        emit(isLocked(control) ? "locked" : "confirm");
    });
}
