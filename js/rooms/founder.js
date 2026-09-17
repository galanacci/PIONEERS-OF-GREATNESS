const COMPLETION_KEY = "pog:founder-introduction:v2";
function hasCompletedIntroduction() {
    try {
        return localStorage.getItem(COMPLETION_KEY) === "complete";
    } catch {
        return false;
    }
}

function rememberCompletion() {
    try {
        localStorage.setItem(COMPLETION_KEY, "complete");
    } catch {
        // Storage can be unavailable in strict privacy modes; entry must still work.
    }
}

function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

// Each passage has its own spoken rhythm. Longer passages move a little faster,
// and every completed paragraph holds for the same deliberate second.
const POEM_PACING = [
    { character: 52, space: 30, comma: 170, sentence: 520, question: 900, hold: 1000 },
    { character: 47, space: 27, comma: 240, sentence: 620, question: 620, hold: 1000 },
    { character: 54, space: 32, comma: 260, sentence: 760, question: 760, hold: 1000 },
    { character: 50, space: 30, comma: 220, sentence: 680, question: 680, hold: 1000 },
    { character: 42, space: 24, comma: 190, sentence: 720, question: 720, hold: 1000 },
    { character: 49, space: 29, comma: 300, sentence: 900, question: 900, hold: 1000 }
];

// Word-level cues aligned directly against the supplied narration. These are
// absolute media times; each array maps one-to-one to its poem paragraph.
const NARRATION_WORD_CUES = [
    [0, 0.2, 0.2, 0.5, 0.84, 1.96, 2, 2.34, 2.64, 2.72, 2.94, 3.2, 3.42, 4.42, 4.72, 4.82, 5.18, 5.46, 5.76, 5.96, 6.1, 6.24],
    [6.58, 7.1, 7.44, 7.64, 7.84, 8.08, 8.3, 9.2, 9.26, 9.54, 9.72, 10.32, 10.58, 10.68, 11, 11.32, 11.4, 11.7, 11.94],
    [13.04, 13.22, 13.34, 13.6, 13.94, 14.74, 15, 15.24, 15.44, 15.68, 16.02, 16.1, 16.36, 16.68, 17.38, 17.42, 17.74, 18.04, 18.4, 18.56, 18.96, 19.06, 19.34, 19.58, 19.68],
    [20.62, 20.72, 20.86, 21.02, 21.18, 21.48, 21.88, 22.14, 22.3, 22.54, 22.98, 23.06, 23.32, 24.3, 24.36, 24.66, 24.94, 25.28, 25.68, 25.84, 26.12, 26.52, 26.88, 27.1, 27.38, 27.44, 27.64, 27.88, 28.5, 28.88],
    [29.84, 30.36, 30.6, 30.92, 31.18, 31.38, 32.18, 32.24, 32.56, 32.86, 33.04, 33.72, 34, 34.24, 34.34, 34.52, 34.72, 34.94, 35.2, 35.46, 35.6, 36, 36.66, 36.74, 36.8, 37.1, 37.44, 37.66, 37.76, 38.04, 38.34, 38.54, 38.86, 39.1, 39.36, 39.7],
    [40.96, 41.02, 41.22, 41.44, 41.66, 42.8, 42.84, 43.12, 43.32, 43.5, 43.8, 44.02, 44.28, 44.52, 44.84, 45.02, 45.2, 45.54, 45.72, 45.84, 46.02, 46.16, 47.32, 47.34, 47.54, 47.94, 48.22, 48.42, 49.54, 49.56, 49.94, 50.34, 50.62, 50.8]
];
const NARRATION_CUES = [...NARRATION_WORD_CUES.map((paragraph) => paragraph[0]), 51.2];
const POEM_PUNCHLINE_WORDS = new Set([
    "greatness", "knowing", "world",
    "sail", "ablaze", "flame", "prevail",
    "turmoil", "chaos", "knife",
    "roaring", "faint", "glow", "darkened", "soul", "reignite",
    "brave", "bold", "fight", "light", "shine", "starry", "night", "inspire", "dark", "sight",
    "child", "fan", "dying", "burn", "bright", "sun", "mid-july", "awaits", "you", "i"
]);

function normalisePoemWord(word) {
    return word.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function pacingFor(index) {
    return POEM_PACING[index] ?? POEM_PACING.at(-1);
}

export function initOpening() {
    const entryButton = document.querySelector(".menu-toggle");
    const entryLabel = entryButton?.querySelector(".menu-toggle-label");
    const introduction = document.getElementById("founder-introduction");
    const copy = document.getElementById("founder-introduction-copy");
    const poemReveal = document.getElementById("founder-poem-reveal");
    const actions = document.getElementById("founder-introduction-actions");
    const enter = document.getElementById("founder-introduction-enter");
    const skip = document.getElementById("founder-introduction-skip");
    const replay = introduction?.querySelector("[data-opening-replay]");
    const enterMenu = introduction?.querySelector("[data-opening-enter]");
    const transition = document.getElementById("room-transition");
    const narration = document.getElementById("founder-poem-narration");
    if (!entryButton || !entryLabel || !introduction || !copy || !poemReveal || !actions || !enter || !skip || !replay || !enterMenu || !transition) return;

    const background = [...document.body.children].filter((element) => (
        element !== introduction && element.tagName !== "SCRIPT"
    ));
    let sequence = 0;
    let poem = null;
    let poemPromise = null;
    let replaying = false;
    let replayDestination = "reveal";
    let returnFocus = null;
    let backgroundState = new Map();
    let activeTyping = null;
    let narrationClockStartedAt = 0;

    function renderEntryState() {
        entryLabel.textContent = "ENTER";
        entryButton.setAttribute("aria-label", "Enter experience");
    }

    async function loadPoem() {
        if (poem) return poem;
        if (!poemPromise) {
            poemPromise = fetch("data/greatness-poem.json", { cache: "no-cache" })
                .then((response) => {
                    if (!response.ok) throw new Error(`GREATNESS poem request failed: ${response.status}`);
                    return response.json();
                })
                .then((payload) => {
                    if (!Array.isArray(payload.paragraphs) || payload.paragraphs.length === 0) {
                        throw new Error("GREATNESS poem contains no paragraphs.");
                    }
                    poem = payload;
                    return poem;
                })
                .catch((error) => {
                    poemPromise = null;
                    throw error;
                });
        }
        return poemPromise;
    }

    function openIntroduction() {
        sequence += 1;
        copy.classList.remove("is-dismissing");
        if (!introduction.classList.contains("is-open")) {
            backgroundState = new Map([...background].map((element) => [element, element.inert]));
        }
        document.body.classList.add("founder-introduction-active");
        introduction.classList.add("is-open");
        introduction.setAttribute("aria-hidden", "false");
        background.forEach((element) => { element.inert = true; });
    }

    function closeIntroduction() {
        activeTyping?.wake?.();
        activeTyping = null;
        sequence += 1;
        introduction.classList.remove("is-open");
        introduction.setAttribute("aria-hidden", "true");
        document.body.classList.remove("founder-introduction-active");
        background.forEach((element) => { element.inert = backgroundState.get(element) ?? false; });
        backgroundState.clear();
        if (narration) {
            narration.pause();
            narration.currentTime = 0;
        }
    }

    function enterSite() {
        rememberCompletion();
        renderEntryState();
        replaying = false;
        closeIntroduction();
        window.dispatchEvent(new CustomEvent("pog:ambience-start"));
        window.dispatchEvent(new CustomEvent("pog:opening-complete"));
    }

    function showFinalReveal() {
        openIntroduction();
        copy.hidden = true;
        copy.replaceChildren();
        poemReveal.hidden = false;
        copy.setAttribute("aria-busy", "false");
        actions.hidden = true;
        skip.hidden = true;
        enter.hidden = false;
        enter.focus();
    }

    function returnToOrigin() {
        const target = returnFocus;
        replaying = false;
        replayDestination = "reveal";
        returnFocus = null;
        closeIntroduction();
        window.dispatchEvent(new CustomEvent("pog:ambience-poem-restore"));
        target?.focus();
        window.setTimeout(() => {
            if (!introduction.classList.contains("is-open")) {
                copy.classList.remove("is-dismissing");
                copy.replaceChildren();
            }
        }, 650);
    }

    const waitForTypingDelay = (milliseconds, token) => new Promise((resolve) => {
        const typing = activeTyping;
        if (!typing || typing.token !== token || token !== sequence) {
            resolve();
            return;
        }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            if (typing.wake === finish) typing.wake = null;
            resolve();
        };
        const timer = window.setTimeout(finish, milliseconds * typing.speed);
        typing.wake = finish;
    });

    async function typeParagraph(paragraph, token, pacing) {
        const element = document.createElement("p");
        element.className = "is-active";
        copy.replaceChildren(element);
        const typing = { token, speed: 1, wake: null };
        activeTyping = typing;
        for (const character of paragraph) {
            if (token !== sequence) {
                if (activeTyping === typing) activeTyping = null;
                return;
            }
            element.textContent += character;
            let delay = character === " " ? pacing.space : pacing.character;
            if (character === ",") delay += pacing.comma;
            else if (character === "?") delay += pacing.question;
            else if (/[.!]/.test(character)) delay += pacing.sentence;
            else if (/[—;]/.test(character)) delay += pacing.comma + 120;
            await waitForTypingDelay(delay, token);
        }
        if (activeTyping === typing) activeTyping = null;
        return element;
    }

    const narrationTime = () => {
        if (narration && !narration.paused) return narration.currentTime;
        return (performance.now() - narrationClockStartedAt) / 1000;
    };

    const waitForNarrationTime = (target, token) => new Promise((resolve) => {
        const tick = () => {
            if (token !== sequence || narrationTime() >= target) return resolve();
            requestAnimationFrame(tick);
        };
        tick();
    });

    async function revealNarratedParagraph(paragraph, index, token) {
        const element = document.createElement("p");
        element.className = "is-active is-narrated";
        copy.replaceChildren(element);
        const words = paragraph.match(/\S+\s*/g) ?? [];
        // Reserve the final line breaks before the first word appears. This
        // prevents every spoken word from reflowing the paragraph beneath it.
        const start = NARRATION_CUES[index];
        const end = NARRATION_CUES[index + 1];
        const wordCues = NARRATION_WORD_CUES[index] ?? [];
        const wordNodes = words.map((word) => {
            const node = document.createElement("span");
            node.className = "founder-narrated-word";
            if (POEM_PUNCHLINE_WORDS.has(normalisePoemWord(word))) {
                node.classList.add("is-punchline");
            }
            node.textContent = word;
            element.append(node);
            return node;
        });
        await waitForNarrationTime(start, token);
        if (token !== sequence) return null;
        for (let wordIndex = 0; wordIndex < wordNodes.length; wordIndex += 1) {
            await waitForNarrationTime(wordCues[wordIndex] ?? start, token);
            if (token !== sequence) return null;
            wordNodes[wordIndex].classList.add("is-visible");
        }
        await waitForNarrationTime(end, token);
        if (token !== sequence) return null;
        return element;
    };

    async function playIntroduction({
        allowSkip = hasCompletedIntroduction(),
        openingDelay = 1200
    } = {}) {
        openIntroduction();
        const token = sequence;
        copy.hidden = false;
        copy.replaceChildren();
        poemReveal.hidden = true;
        copy.setAttribute("aria-busy", "true");
        actions.hidden = true;
        enter.hidden = true;
        skip.hidden = true;
        try {
            const [content] = await Promise.all([
                loadPoem(),
                openingDelay > 0 ? wait(openingDelay) : Promise.resolve()
            ]);
            if (narration) {
                narration.pause();
                narration.currentTime = 0;
                narrationClockStartedAt = performance.now();
                try {
                    // Do not begin the text clock until the recording is
                    // genuinely playing; buffering here would desynchronise
                    // every word that follows.
                    await narration.play();
                } catch {
                    // Autoplay restrictions still receive the same timeline.
                }
                narrationClockStartedAt = performance.now() - (narration.currentTime * 1000);
            }
            skip.hidden = !allowSkip;
            for (const [index, paragraph] of content.paragraphs.entries()) {
                if (token !== sequence) return;
                const pacing = pacingFor(index);
                const element = narration
                    ? await revealNarratedParagraph(paragraph, index, token)
                    : await typeParagraph(paragraph, token, pacing);
                if (!element || token !== sequence) return;
                await wait(narration ? 0 : pacing.hold);
                const isFinalParagraph = index === content.paragraphs.length - 1;
                if (!isFinalParagraph && !narration) {
                    element.classList.add("is-leaving");
                    await wait(700);
                }
            }
            if (token !== sequence) return;
            const finalParagraph = copy.querySelector(".is-active");
            finalParagraph?.classList.remove("is-active");
            finalParagraph?.classList.add("is-leaving");
            copy.setAttribute("aria-busy", "false");
            await wait(700);
            if (replayDestination === "origin") returnToOrigin();
            else if (replayDestination === "menu") enterSite();
            else showFinalReveal();
        } catch (error) {
            console.error("THE BEGINNING could not be loaded.", error);
            const state = document.createElement("p");
            state.textContent = "THE BEGINNING IS TEMPORARILY UNAVAILABLE.";
            copy.replaceChildren(state);
            copy.setAttribute("aria-busy", "false");
            enter.hidden = false;
            enter.focus();
        }
    }

    async function enterOpeningPath(event) {
        replaying = false;
        const returning = hasCompletedIntroduction();
        const launchedFromDesktop = event?.detail?.source === "launcher";
        replayDestination = returning ? "reveal" : "menu";
        returnFocus = null;
        if (!launchedFromDesktop) window.dispatchEvent(new CustomEvent("pog:show-transition"));
        if (returning) {
            window.dispatchEvent(new CustomEvent("pog:ambience-prime"));
            window.dispatchEvent(new CustomEvent("pog:opening-complete"));
            await wait(1000);
            window.dispatchEvent(new CustomEvent("pog:ambience-reveal"));
            if (!launchedFromDesktop) window.dispatchEvent(new CustomEvent("pog:hide-transition"));
            return;
        }
        const poemReady = loadPoem().catch(() => null);
        playIntroduction({ allowSkip: false });
        await Promise.all([wait(1000), poemReady]);
        if (!launchedFromDesktop) window.dispatchEvent(new CustomEvent("pog:hide-transition"));
    }

    function replayPoem() {
        replaying = true;
        replayDestination = "reveal";
        playIntroduction({ allowSkip: true });
    }

    function replayFromOrigin(event) {
        replaying = true;
        replayDestination = "origin";
        returnFocus = event.detail?.trigger || null;
        window.dispatchEvent(new CustomEvent("pog:ambience-poem-mute"));
        playIntroduction({ allowSkip: true, openingDelay: 600 });
    }

    async function skipPoem() {
        if (replayDestination === "origin") {
            sequence += 1;
            skip.hidden = true;
            copy.setAttribute("aria-busy", "false");
            copy.classList.add("is-dismissing");
            await wait(600);
            returnToOrigin();
            return;
        }
        if (replaying) {
            replaying = false;
            showFinalReveal();
            return;
        }
        enterSite();
    }

    renderEntryState();
    window.addEventListener("pog:start-requested", enterOpeningPath);
    window.addEventListener("pog:poem-replay-requested", replayFromOrigin);
    replay.addEventListener("click", replayPoem);
    enterMenu.addEventListener("click", enterSite);
    enter.addEventListener("click", enterSite);
    skip.addEventListener("click", skipPoem);
    introduction.addEventListener("keydown", (event) => {
        if (event.key === "Escape") event.preventDefault();
        if (event.key === "Enter" && !enter.hidden) { event.preventDefault(); enterSite(); }
        if (event.key !== "Tab") return;
        const focusable = [...introduction.querySelectorAll("button:not([hidden])")];
        if (!focusable.length) { event.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
}
