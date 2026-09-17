function formatDate(timestamp) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();
}

function createNote(note, openEntry) {
    const article = document.createElement("article");
    article.className = "field-note";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "field-note-card";
    button.setAttribute("aria-label", `Open ${note.entry}`);
    const media = document.createElement("span");
    media.className = "field-note-media";
    const image = document.createElement("img");
    image.src = note.images[0];
    image.alt = `Cover image for ${note.entry}`;
    image.loading = "lazy";
    image.decoding = "async";
    const entry = document.createElement("span");
    entry.className = "field-note-grid-entry";
    entry.textContent = note.entry;
    media.append(image, entry);
    button.append(media);
    button.addEventListener("click", () => openEntry(note, button));
    article.append(button);
    return article;
}

function createEntryViewer(room) {
    const viewer = document.createElement("section");
    viewer.className = "field-note-viewer";
    viewer.hidden = true;
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Instagram post viewer");
    const windowElement = document.createElement("div");
    windowElement.className = "field-note-viewer-window";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "field-note-viewer-close";
    close.setAttribute("aria-label", "Close Instagram post");
    close.textContent = "×";
    const media = document.createElement("div");
    media.className = "field-note-viewer-media";
    const image = document.createElement("img");
    image.alt = "";
    const previous = document.createElement("button");
    const next = document.createElement("button");
    previous.type = next.type = "button";
    previous.className = "field-note-viewer-nav is-previous";
    next.className = "field-note-viewer-nav is-next";
    previous.setAttribute("aria-label", "Previous carousel image");
    next.setAttribute("aria-label", "Next carousel image");
    previous.textContent = next.textContent = "➔";
    const count = document.createElement("span");
    count.className = "field-note-viewer-count";
    media.append(image, previous, next, count);
    const details = document.createElement("div");
    details.className = "field-note-viewer-details";
    const meta = document.createElement("div");
    meta.className = "field-note-viewer-meta";
    const entry = document.createElement("span");
    const date = document.createElement("time");
    meta.append(entry, date);
    const caption = document.createElement("p");
    caption.className = "field-note-viewer-caption";
    const link = document.createElement("a");
    link.className = "field-note-viewer-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "OPEN ENTRY";
    details.append(meta, caption, link);
    windowElement.append(close, media, details);
    viewer.append(windowElement);
    room.append(viewer);

    let activeNote = null;
    let current = 0;
    let returnFocus = null;
    const render = () => {
        if (!activeNote) return;
        image.src = activeNote.images[current];
        image.alt = `${activeNote.entry}, image ${current + 1} of ${activeNote.images.length}`;
        count.textContent = `${current + 1} / ${activeNote.images.length}`;
        previous.hidden = next.hidden = activeNote.images.length < 2;
    };
    const move = (step) => {
        if (!activeNote?.images.length) return;
        current = (current + step + activeNote.images.length) % activeNote.images.length;
        render();
    };
    const closeViewer = () => {
        if (viewer.hidden) return;
        viewer.hidden = true;
        room.classList.remove("is-entry-open");
        returnFocus?.focus({ preventScroll: true });
    };
    const openViewer = (note, trigger) => {
        activeNote = note;
        current = 0;
        returnFocus = trigger;
        entry.textContent = note.entry;
        date.dateTime = note.timestamp;
        date.textContent = formatDate(note.timestamp);
        caption.textContent = note.caption || "UNTITLED ENTRY";
        link.href = note.instagramUrl;
        render();
        viewer.hidden = false;
        room.classList.add("is-entry-open");
        close.focus({ preventScroll: true });
    };
    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    close.addEventListener("click", closeViewer);
    viewer.addEventListener("pointerdown", (event) => {
        if (event.target === viewer) closeViewer();
    });
    viewer.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeViewer();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
        }
    });
    window.addEventListener("pog:room-closing", (event) => {
        if (event.detail?.roomId === "field-notes-room") closeViewer();
    });
    return { open: openViewer };
}

export async function initFieldNotes() {
    const room = document.getElementById("field-notes-room");
    const list = document.getElementById("field-notes-list");
    if (!room || !list) return;
    const viewer = createEntryViewer(room);
    let initialized = false;
    const waitForFirstImage = async () => {
        const image = list.querySelector(".field-note-media img");
        if (!image || image.complete) return;
        await Promise.race([
            new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            }),
            new Promise((resolve) => window.setTimeout(resolve, 4000))
        ]);
    };
    const showState = (message) => { const state = document.createElement("p"); state.className = "field-notes-state"; state.textContent = message; list.replaceChildren(state); };
    const load = async () => {
        if (initialized) return;
        initialized = true;
        showState("OPENING ARCHIVE...");
        try {
            const response = await fetch("data/field-notes.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Field Notes request failed: ${response.status}`);
            const payload = await response.json();
            if (!Array.isArray(payload.notes) || !payload.notes.length) { showState("ARCHIVE SYNC PENDING"); return; }
            const years = new Map();
            payload.notes.forEach((note) => {
                const year = String(new Date(note.timestamp).getFullYear());
                if (!years.has(year)) years.set(year, []);
                years.get(year).push(note);
            });
            const yearEntries = [...years.entries()].sort(([a], [b]) => Number(b) - Number(a));
            const controls = document.createElement("nav");
            controls.className = "field-notes-years";
            controls.setAttribute("aria-label", "Field Notes chapters by year");
            const trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "field-notes-year-trigger";
            trigger.setAttribute("aria-label", "Select Field Notes year");
            trigger.setAttribute("aria-haspopup", "listbox");
            trigger.setAttribute("aria-expanded", "false");
            const options = document.createElement("div");
            options.className = "field-notes-year-options";
            options.setAttribute("role", "listbox");
            options.setAttribute("aria-label", "Field Notes years");
            options.hidden = true;
            const chapter = document.createElement("div");
            chapter.className = "field-notes-chapter";
            const notesByYear = new Map(yearEntries);
            let selectedYear = yearEntries[0][0];
            let optionButtons = [];
            const setOpen = (open) => {
                controls.classList.toggle("is-open", open);
                trigger.setAttribute("aria-expanded", String(open));
                options.hidden = !open;
            };
            const selectYear = (year) => {
                selectedYear = year;
                trigger.textContent = year;
                optionButtons.forEach((button) => {
                    const selected = button.dataset.year === year;
                    button.classList.toggle("is-selected", selected);
                    button.setAttribute("aria-selected", String(selected));
                });
                chapter.replaceChildren(...notesByYear.get(year).map((note) => createNote(note, viewer.open)));
                chapter.scrollTop = 0;
            };
            optionButtons = yearEntries.map(([year]) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "field-notes-year-option";
                option.dataset.year = year;
                option.setAttribute("role", "option");
                option.textContent = year;
                option.addEventListener("click", () => {
                    selectYear(year);
                    setOpen(false);
                    trigger.focus();
                });
                options.append(option);
                return option;
            });
            trigger.addEventListener("click", () => {
                const open = trigger.getAttribute("aria-expanded") !== "true";
                setOpen(open);
                if (open) optionButtons.find((button) => button.dataset.year === selectedYear)?.focus();
            });
            options.addEventListener("keydown", (event) => {
                const current = optionButtons.indexOf(document.activeElement);
                if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    let next = event.key === "Home" ? 0 : event.key === "End" ? optionButtons.length - 1 : current + (event.key === "ArrowDown" ? 1 : -1);
                    optionButtons[(next + optionButtons.length) % optionButtons.length].focus();
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                    trigger.focus();
                }
            });
            document.addEventListener("pointerdown", (event) => {
                if (!controls.contains(event.target)) setOpen(false);
            });
            controls.append(trigger, options);
            list.replaceChildren(controls, chapter);
            selectYear(selectedYear);
        } catch (error) {
            initialized = false;
            console.error("Field Notes could not be loaded.", error);
            showState("ARCHIVE TEMPORARILY UNAVAILABLE");
        }
    };
    window.addEventListener("pog:room-opened", async (event) => {
        if (event.detail?.roomId !== "field-notes-room") return;
        await load();
        await waitForFirstImage();
        window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: "field-notes-room" } }));
    });
}
