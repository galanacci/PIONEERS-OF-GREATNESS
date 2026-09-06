function formatDate(timestamp) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();
}

function createNote(note) {
    const article = document.createElement("article");
    article.className = "field-note";
    const media = document.createElement("div");
    media.className = "field-note-media";
    media.tabIndex = note.images.length > 1 ? 0 : -1;
    const image = document.createElement("img");
    image.alt = note.caption ? `Image from ${note.entry}` : note.entry;
    image.loading = "lazy";
    image.decoding = "async";
    let current = 0;
    const counter = document.createElement("span");
    counter.className = "field-note-count";
    const renderImage = () => {
        image.src = note.images[current];
        counter.textContent = `${current + 1} / ${note.images.length}`;
        counter.setAttribute("aria-label", `Image ${current + 1} of ${note.images.length}`);
    };
    media.append(image);
    if (note.images.length > 1) {
        const previous = document.createElement("button");
        const next = document.createElement("button");
        previous.type = next.type = "button";
        previous.className = "field-note-nav field-note-nav--previous";
        next.className = "field-note-nav field-note-nav--next";
        previous.setAttribute("aria-label", `Previous image in ${note.entry}`);
        next.setAttribute("aria-label", `Next image in ${note.entry}`);
        const move = (step) => { current = (current + step + note.images.length) % note.images.length; renderImage(); };
        previous.addEventListener("click", () => move(-1));
        next.addEventListener("click", () => move(1));
        media.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1);
        });
        media.append(previous, next, counter);
    }
    renderImage();
    const meta = document.createElement("div");
    meta.className = "field-note-meta";
    const entry = document.createElement("span"); entry.textContent = note.entry;
    const date = document.createElement("time"); date.dateTime = note.timestamp; date.textContent = formatDate(note.timestamp);
    meta.append(entry, date);
    const caption = document.createElement("p"); caption.className = "field-note-caption"; caption.textContent = note.caption || "UNTITLED FIELD NOTE";
    const link = document.createElement("a"); link.className = "field-note-link"; link.href = note.instagramUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "OPEN ENTRY";
    article.append(media, meta, caption, link);
    return article;
}

export async function initFieldNotes() {
    const list = document.getElementById("field-notes-list");
    if (!list) return;
    let initialized = false;
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
                chapter.replaceChildren(...notesByYear.get(year).map(createNote));
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
    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId === "field-notes-room") load();
    });
}
