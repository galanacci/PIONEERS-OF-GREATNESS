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

    const playTone = ({ frequency, endFrequency, duration, gain, type, delay = 0 }) => {
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
    };

    window.addEventListener("pog:menu-sound", async (event) => {
        const shape = SOUND_SHAPES[event.detail?.name];
        if (!shape) return;
        context ||= new AudioContext();
        if (context.state === "suspended") await context.resume();
        shape.forEach(playTone);
    });
}
