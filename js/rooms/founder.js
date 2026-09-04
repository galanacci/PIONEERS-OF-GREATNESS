const COMPLETION_KEY = "pog:founder-introduction:v2";
const ROOM_ID = "founder-room";

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

function readingPause(paragraph) {
    const wordCount = paragraph.trim().split(/\s+/).length;
    return Math.min(9500, Math.max(5500, wordCount * 320));
}

export function initFounder() {
    const introduction = document.getElementById("founder-introduction");
    const copy = document.getElementById("founder-introduction-copy");
    const actions = document.getElementById("founder-introduction-actions");
    const enter = document.getElementById("founder-introduction-enter");
    const replay = introduction?.querySelector("[data-founder-replay]");
    const enterFounder = introduction?.querySelector("[data-founder-enter]");
    const transition = document.getElementById("room-transition");
    if (!introduction || !copy || !actions || !enter || !replay || !enterFounder || !transition) return;

    const background = [...document.body.children].filter((element) => (
        element !== introduction && element.tagName !== "SCRIPT"
    ));
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sequence = 0;
    let poem = null;

    async function loadPoem() {
        if (poem) return poem;
        const response = await fetch("data/greatness-poem.json", { cache: "no-cache" });
        if (!response.ok) throw new Error(`GREATNESS poem request failed: ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.paragraphs) || payload.paragraphs.length === 0) {
            throw new Error("GREATNESS poem contains no paragraphs.");
        }
        poem = payload;
        return poem;
    }

    function openIntroduction() {
        sequence += 1;
        document.body.classList.add("founder-introduction-active");
        introduction.classList.add("is-open");
        introduction.setAttribute("aria-hidden", "false");
        background.forEach((element) => { element.inert = true; });
    }

    function closeIntroduction() {
        sequence += 1;
        introduction.classList.remove("is-open");
        introduction.setAttribute("aria-hidden", "true");
        document.body.classList.remove("founder-introduction-active");
        background.forEach((element) => { element.inert = false; });
    }

    function enterRoom() {
        rememberCompletion();
        closeIntroduction();
        window.dispatchEvent(new CustomEvent("pog:open-room", { detail: { roomId: ROOM_ID } }));
    }

    async function typeParagraph(paragraph, token) {
        const element = document.createElement("p");
        copy.replaceChildren(element);
        if (reducedMotion) {
            element.textContent = paragraph;
            return element;
        }
        for (const character of paragraph) {
            if (token !== sequence) return;
            element.textContent += character;
            const punctuationPause = /[.!?]/.test(character) ? 240 : 0;
            await wait((character === " " ? 28 : 48) + punctuationPause);
        }
        return element;
    }

    async function playIntroduction() {
        openIntroduction();
        const token = sequence;
        copy.replaceChildren();
        actions.hidden = true;
        enter.hidden = true;
        try {
            const content = await loadPoem();
            await wait(reducedMotion ? 200 : 1200);
            for (const [index, paragraph] of content.paragraphs.entries()) {
                if (token !== sequence) return;
                const element = await typeParagraph(paragraph, token);
                if (!element || token !== sequence) return;
                await wait(readingPause(paragraph));
                const isFinalParagraph = index === content.paragraphs.length - 1;
                if (!isFinalParagraph && !reducedMotion) {
                    element.classList.add("is-leaving");
                    await wait(700);
                }
            }
            if (token !== sequence) return;
            await wait(reducedMotion ? 800 : 2200);
            enter.hidden = false;
            enter.focus();
        } catch (error) {
            console.error("THE BEGINNING could not be loaded.", error);
            const state = document.createElement("p");
            state.textContent = "THE BEGINNING IS TEMPORARILY UNAVAILABLE.";
            copy.replaceChildren(state);
            enter.hidden = false;
            enter.focus();
        }
    }

    function showReturningChoice() {
        openIntroduction();
        copy.replaceChildren();
        enter.hidden = true;
        actions.hidden = false;
        enterFounder.focus();
    }

    async function enterFounderPath() {
        transition.classList.add("is-active");
        transition.setAttribute("aria-hidden", "false");
        await wait(reducedMotion ? 350 : 900);
        if (hasCompletedIntroduction()) showReturningChoice();
        else playIntroduction();
        await wait(reducedMotion ? 0 : 250);
        transition.classList.remove("is-active");
        transition.setAttribute("aria-hidden", "true");
    }

    window.addEventListener("pog:founder-requested", enterFounderPath);
    replay.addEventListener("click", playIntroduction);
    enterFounder.addEventListener("click", enterRoom);
    enter.addEventListener("click", enterRoom);
    introduction.addEventListener("keydown", (event) => {
        if (event.key === "Escape") event.preventDefault();
        if (event.key === "Enter" && !enter.hidden) { event.preventDefault(); enterRoom(); }
        if (event.key !== "Tab") return;
        const focusable = [...introduction.querySelectorAll("button:not([hidden])")];
        if (!focusable.length) { event.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
}
