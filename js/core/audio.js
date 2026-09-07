export function initAudio() {
    const video = document.querySelector(".background-video");
    const ambience = document.getElementById("site-ambience");
    const button = document.querySelector(".audio-toggle");
    const label = button?.querySelector(".audio-label");
    if (!video || !ambience || !button || !label) return;

    const ambienceVolume = 0.09;
    const entryFadeDuration = 1200;
    const stateFadeDuration = 800;
    let visitorMuted = false;
    let suspendedByPage = false;
    let documentaryDucked = false;
    let hasStarted = false;
    let playbackSequence = 0;
    let fadeWhenReady = false;
    let fadeSequence = 0;
    let fadeInterval = null;
    let fadeFallback = null;
    const OutputAudioContext = window.AudioContext || window.webkitAudioContext;
    let outputContext = null;
    let outputSource = null;
    let outputGain = null;
    let outputLevel = 0;
    let outputGraphFailed = false;

    const setOutputLevel = (level) => {
        outputLevel = Math.max(0, Math.min(1, level));
        ambience.dataset.outputLevel = outputLevel.toFixed(4);
        if (outputGain) outputGain.gain.value = outputLevel;
        else ambience.volume = outputLevel;
        window.dispatchEvent(new CustomEvent("pog:ambience-level", {
            detail: { level: outputLevel }
        }));
    };

    const ensureOutputGraph = async () => {
        if (!OutputAudioContext || outputGraphFailed) return false;
        if (!outputContext) {
            try {
                outputContext = new OutputAudioContext();
                outputSource = outputContext.createMediaElementSource(ambience);
                outputGain = outputContext.createGain();
                outputGain.gain.value = outputLevel;
                outputSource.connect(outputGain).connect(outputContext.destination);
                ambience.volume = 1;
                ambience.dataset.outputMode = "webaudio";
            } catch (error) {
                outputGraphFailed = true;
                outputGain = null;
                ambience.dataset.outputMode = "element";
                ambience.volume = outputLevel;
                console.warn("Web Audio ambience gain unavailable; using element volume.", error);
                return false;
            }
        }
        try {
            if (outputContext.state !== "running") await outputContext.resume();
            return outputContext.state === "running";
        } catch (error) {
            console.warn("Web Audio ambience gain could not resume yet.", error);
            return false;
        }
    };

    const render = () => {
        const enabled = hasStarted && !visitorMuted;
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", enabled ? "Turn training ambience off" : "Turn training ambience on");
        label.textContent = enabled ? "SOUND ON" : "SOUND OFF";
    };

    const cancelFade = () => {
        fadeSequence += 1;
        if (fadeInterval !== null) window.clearInterval(fadeInterval);
        if (fadeFallback !== null) window.clearTimeout(fadeFallback);
        fadeInterval = null;
        fadeFallback = null;
    };

    const fadeTo = (target, duration, onComplete) => {
        cancelFade();
        const token = fadeSequence;
        const initial = outputLevel;
        const startedAt = performance.now();
        let complete = false;
        const finish = () => {
            if (complete || token !== fadeSequence) return;
            complete = true;
            if (fadeInterval !== null) window.clearInterval(fadeInterval);
            if (fadeFallback !== null) window.clearTimeout(fadeFallback);
            fadeInterval = null;
            fadeFallback = null;
            setOutputLevel(target);
            onComplete?.();
        };
        if (duration <= 0 || Math.abs(target - initial) < 0.001) {
            finish();
            return;
        }
        const step = () => {
            if (token !== fadeSequence) return;
            const progress = Math.min(1, (performance.now() - startedAt) / duration);
            const eased = 1 - ((1 - progress) ** 2);
            setOutputLevel(initial + ((target - initial) * eased));
            if (progress >= 1) finish();
        };
        fadeInterval = window.setInterval(step, 32);
        fadeFallback = window.setTimeout(finish, duration + 80);
        step();
    };

    const randomStartTime = () => {
        if (!Number.isFinite(ambience.duration) || ambience.duration <= 1) return null;
        return Math.random() * (ambience.duration - 1);
    };

    const beginPlayback = async (fadeIn) => {
        cancelFade();
        const token = ++playbackSequence;
        fadeWhenReady = fadeIn;
        hasStarted = true;
        suspendedByPage = false;
        await ensureOutputGraph();
        if (token !== playbackSequence || !hasStarted) return;
        setOutputLevel(0);
        ambience.muted = visitorMuted;
        let startTime = randomStartTime();
        const seekToStart = () => {
            if (startTime === null) startTime = randomStartTime();
            if (startTime !== null) ambience.currentTime = startTime;
        };
        if (startTime === null) ambience.addEventListener("loadedmetadata", seekToStart, { once: true });
        else seekToStart();
        try {
            await ambience.play();
            if (token !== playbackSequence || !hasStarted) return;
            seekToStart();
            if (!visitorMuted && fadeWhenReady) fadeTo(ambienceVolume, entryFadeDuration);
        } catch (error) {
            hasStarted = false;
            console.error("Training ambience could not begin.", error);
        }
        render();
    };

    const stopWithFade = () => {
        if (!hasStarted) return;
        playbackSequence += 1;
        fadeWhenReady = false;
        hasStarted = false;
        suspendedByPage = false;
        ambience.muted = false;
        fadeTo(0, stateFadeDuration, () => {
            ambience.pause();
            ambience.currentTime = 0;
            ambience.muted = visitorMuted;
            render();
        });
        render();
    };

    const suspendForPage = () => {
        if (!hasStarted || suspendedByPage || ambience.paused) return;
        suspendedByPage = true;
        ambience.muted = false;
        fadeTo(0, stateFadeDuration, () => {
            if (!suspendedByPage) return;
            ambience.pause();
            ambience.muted = visitorMuted;
            render();
        });
    };

    const resumeForPage = async () => {
        if (!hasStarted || !suspendedByPage || document.hidden || !document.hasFocus()) return;
        const token = playbackSequence;
        suspendedByPage = false;
        cancelFade();
        await ensureOutputGraph();
        if (ambience.paused) setOutputLevel(0);
        ambience.muted = visitorMuted;
        try {
            await ambience.play();
            if (token !== playbackSequence || !hasStarted || suspendedByPage) return;
            if (!visitorMuted && !documentaryDucked) {
                ambience.muted = false;
                fadeTo(ambienceVolume, stateFadeDuration);
            }
        } catch (error) {
            suspendedByPage = true;
            console.error("Training ambience could not resume.", error);
        }
        render();
    };

    video.defaultMuted = true;
    video.muted = true;
    ambience.dataset.outputMode = "element";
    setOutputLevel(0);
    render();

    button.addEventListener("click", () => {
        if (!hasStarted) return;
        visitorMuted = !visitorMuted;
        render();
        if (visitorMuted) {
            ambience.muted = false;
            fadeTo(0, stateFadeDuration, () => {
                ambience.muted = true;
                render();
            });
        } else {
            ambience.muted = false;
            if (!suspendedByPage && !ambience.paused) fadeTo(ambienceVolume, stateFadeDuration);
        }
    });

    const duckForDocumentary = () => {
        documentaryDucked = true;
        if (!hasStarted) return;
        if (visitorMuted) {
            setOutputLevel(0);
            ambience.muted = true;
            return;
        }
        ambience.muted = false;
        fadeTo(0, stateFadeDuration, () => {
            if (documentaryDucked) ambience.muted = true;
        });
    };

    const restoreAfterDocumentary = () => {
        documentaryDucked = false;
        if (!hasStarted || suspendedByPage) return;
        ambience.muted = visitorMuted;
        if (!visitorMuted && !ambience.paused) {
            ambience.muted = false;
            fadeTo(ambienceVolume, stateFadeDuration);
        }
    };

    // The visual background must never become the site's sound source.
    video.addEventListener("volumechange", () => {
        if (!video.muted) video.muted = true;
    });
    window.addEventListener("pog:ambience-prime", () => beginPlayback(false));
    window.addEventListener("pog:ambience-reveal", () => {
        fadeWhenReady = true;
        if (hasStarted && !suspendedByPage && !ambience.paused && !visitorMuted) {
            ambience.muted = false;
            fadeTo(ambienceVolume, entryFadeDuration);
        }
    });
    window.addEventListener("pog:ambience-start", () => beginPlayback(true));
    window.addEventListener("pog:ambience-stop", stopWithFade);
    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId === "documentary-room") duckForDocumentary();
    });
    window.addEventListener("pog:room-closed", (event) => {
        if (event.detail?.roomId === "documentary-room") restoreAfterDocumentary();
    });
    window.addEventListener("blur", suspendForPage);
    window.addEventListener("focus", resumeForPage);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) suspendForPage();
        else resumeForPage();
    });
    window.addEventListener("pagehide", suspendForPage);
}
