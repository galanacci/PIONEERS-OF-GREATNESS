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

    const accelerateCurrentParagraph = () => {
        if (replayDestination !== "menu" || !activeTyping || activeTyping.token !== sequence) return;
        activeTyping.speed = Math.max(0.08, activeTyping.speed * 0.25);
        activeTyping.wake?.();
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
            skip.hidden = !allowSkip;
            for (const [index, paragraph] of content.paragraphs.entries()) {
                if (token !== sequence) return;
                const pacing = pacingFor(index);
                const element = await typeParagraph(paragraph, token, pacing);
                if (!element || token !== sequence) return;
                await wait(pacing.hold);
                const isFinalParagraph = index === content.paragraphs.length - 1;
                if (!isFinalParagraph) {
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

    async function enterOpeningPath() {
        replaying = false;
        const returning = hasCompletedIntroduction();
        replayDestination = returning ? "reveal" : "menu";
        returnFocus = null;
        window.dispatchEvent(new CustomEvent("pog:show-transition"));
        if (returning) {
            window.dispatchEvent(new CustomEvent("pog:ambience-prime"));
            window.dispatchEvent(new CustomEvent("pog:opening-complete"));
            await wait(1000);
            window.dispatchEvent(new CustomEvent("pog:ambience-reveal"));
            window.dispatchEvent(new CustomEvent("pog:hide-transition"));
            return;
        }
        const poemReady = loadPoem().catch(() => null);
        playIntroduction({ allowSkip: false });
        await Promise.all([wait(1000), poemReady]);
        window.dispatchEvent(new CustomEvent("pog:hide-transition"));
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
    introduction.addEventListener("pointerdown", accelerateCurrentParagraph);
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
