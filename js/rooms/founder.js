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

export function initFounder() {
    const introduction = document.getElementById("founder-introduction");
    const copy = document.getElementById("founder-introduction-copy");
    const poemReveal = document.getElementById("founder-poem-reveal");
    const actions = document.getElementById("founder-introduction-actions");
    const enter = document.getElementById("founder-introduction-enter");
    const replay = introduction?.querySelector("[data-founder-replay]");
    const enterFounder = introduction?.querySelector("[data-founder-enter]");
    const transition = document.getElementById("room-transition");
    if (!introduction || !copy || !poemReveal || !actions || !enter || !replay || !enterFounder || !transition) return;

    const background = [...document.body.children].filter((element) => (
        element !== introduction && element.tagName !== "SCRIPT"
    ));
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

    async function typeParagraph(paragraph, token, pacing) {
        const element = document.createElement("p");
        element.className = "is-active";
        copy.replaceChildren(element);
        for (const character of paragraph) {
            if (token !== sequence) return;
            element.textContent += character;
            let delay = character === " " ? pacing.space : pacing.character;
            if (character === ",") delay += pacing.comma;
            else if (character === "?") delay += pacing.question;
            else if (/[.!]/.test(character)) delay += pacing.sentence;
            else if (/[—;]/.test(character)) delay += pacing.comma + 120;
            await wait(delay);
        }
        return element;
    }

    async function playIntroduction() {
        openIntroduction();
        const token = sequence;
        copy.hidden = false;
        copy.replaceChildren();
        poemReveal.hidden = true;
        copy.setAttribute("aria-busy", "true");
        actions.hidden = true;
        enter.hidden = true;
        try {
            const content = await loadPoem();
            await wait(1200);
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
            await wait(700);
            copy.replaceChildren();
            copy.hidden = true;
            poemReveal.hidden = false;
            copy.setAttribute("aria-busy", "false");
            enter.hidden = false;
            enter.focus();
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

    function showReturningChoice() {
        openIntroduction();
        copy.hidden = false;
        copy.replaceChildren();
        poemReveal.hidden = true;
        copy.setAttribute("aria-busy", "false");
        enter.hidden = true;
        actions.hidden = false;
        enterFounder.focus();
    }

    async function enterFounderPath() {
        window.dispatchEvent(new CustomEvent("pog:show-transition"));
        await wait(1000);
        if (hasCompletedIntroduction()) showReturningChoice();
        else playIntroduction();
        window.dispatchEvent(new CustomEvent("pog:hide-transition"));
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
