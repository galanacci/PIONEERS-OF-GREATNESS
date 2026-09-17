const ROOT = document.documentElement;

export function getPerformanceTier() {
    return ROOT.dataset.performanceTier || "balanced";
}

export function initPerformanceTier() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    ROOT.dataset.performanceTier = reducedMotion ? "low" : touchDevice ? "balanced" : "high";

    if (reducedMotion || !touchDevice) return;

    const samples = [];
    let previous = performance.now();
    const sample = (now) => {
        const delta = now - previous;
        previous = now;
        if (delta > 0 && delta < 100) samples.push(delta);
        if (samples.length < 28) {
            requestAnimationFrame(sample);
            return;
        }
        const ordered = [...samples].sort((a, b) => a - b);
        const median = ordered[Math.floor(ordered.length / 2)];
        const slowFrames = samples.filter((duration) => duration > 24).length / samples.length;
        const tier = median <= 12.5 && slowFrames < .08
            ? "high"
            : median <= 19.5 && slowFrames < .18
                ? "balanced"
                : "low";
        ROOT.dataset.performanceTier = tier;
        window.dispatchEvent(new CustomEvent("pog:performance-tier", { detail: { tier, median, slowFrames } }));
    };
    requestAnimationFrame(sample);
}
