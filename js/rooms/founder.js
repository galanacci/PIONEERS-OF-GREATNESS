const COMPLETION_KEY = "pog:founder-introduction:v1";
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

export function initFounder() {
    const introduction = document.getElementById("founder-introduction");
    const copy = document.getElementById("founder-introduction-copy");
    const actions = document.getElementById("founder-introduction-actions");
    const enter = document.getElementById("founder-introduction-enter");
    const replay = introduction?.querySelector("[data-founder-replay]");
    const enterFounder = introduction?.querySelector("[data-founder-enter]");
    if (!introduction || !copy || !actions || !enter || !replay || !enterFounder) return;

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
        copy.append(element);
        if (reducedMotion) {
            element.textContent = paragraph;
            await wait(500);
            return;
        }
        for (const character of paragraph) {
            if (token !== sequence) return;
            element.textContent += character;
            await wait(character === " " ? 22 : 38);
        }
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
            for (const paragraph of content.paragraphs) {
                if (token !== sequence) return;
                await typeParagraph(paragraph, token);
                await wait(reducedMotion ? 350 : 1400);
            }
            if (token !== sequence) return;
            await wait(reducedMotion ? 200 : 1000);
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

    window.addEventListener("pog:founder-requested", () => {
        if (hasCompletedIntroduction()) showReturningChoice();
        else playIntroduction();
    });
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
