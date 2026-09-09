const formatDate = (timestamp) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();

export async function initDocumentary() {
    const feature = document.getElementById("documentary-feature");
    const archive = document.getElementById("documentary-list");
    if (!feature || !archive) return;
    let episodes = [];
    let selected = 0;
    let visibleEpisodeIndexes = [];
    let buttons = [];
    let initialized = false;

    const waitForFeature = async () => {
        const iframe = feature.querySelector("iframe");
        if (!iframe || iframe.dataset.ready === "true") return;
        await Promise.race([
            new Promise((resolve) => iframe.addEventListener("load", resolve, { once: true })),
            new Promise((resolve) => window.setTimeout(resolve, 4000))
        ]);
    };
    const stopPlayback = () => feature.querySelector("iframe")?.remove();
    const selectEpisode = (index, focus = false) => {
        selected = index;
        const episode = episodes[selected];
        if (!episode) return;
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.videoId)}?rel=0`;
        iframe.title = `UNCUT — ${episode.title}`;
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        iframe.addEventListener("load", () => { iframe.dataset.ready = "true"; });
        const player = document.createElement("div"); player.className = "documentary-player"; player.append(iframe);
        const meta = document.createElement("div"); meta.className = "documentary-feature-meta";
        const number = document.createElement("span"); number.textContent = episode.episode;
        const date = document.createElement("time"); date.dateTime = episode.publishedAt; date.textContent = formatDate(episode.publishedAt);
        meta.append(number, date);
        const title = document.createElement("h2"); title.textContent = episode.title;
        feature.replaceChildren(player, meta, title);
        buttons.forEach((button) => {
            const current = Number(button.dataset.episodeIndex) === selected;
            button.closest(".documentary-episode").classList.toggle("is-current", current);
            button.setAttribute("aria-pressed", String(current));
            button.querySelector(".documentary-episode-status").textContent = current ? "NOW SHOWING" : "SELECT";
        });
        if (focus) buttons.find((button) => Number(button.dataset.episodeIndex) === selected)?.focus();
    };
    const moveEpisode = (step) => {
        const current = Math.max(0, visibleEpisodeIndexes.indexOf(selected));
        const next = (current + step + visibleEpisodeIndexes.length) % visibleEpisodeIndexes.length;
        selectEpisode(visibleEpisodeIndexes[next], true);
    };
    const createEpisode = (episode, index) => {
        const item = document.createElement("li"); item.className = "documentary-episode";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "documentary-episode-button";
        button.dataset.episodeIndex = String(index);
        button.setAttribute("aria-pressed", "false");
        const number = document.createElement("span"); number.className = "documentary-episode-number"; number.textContent = episode.episode;
        const title = document.createElement("span"); title.className = "documentary-episode-title"; title.textContent = episode.title;
        const status = document.createElement("span"); status.className = "documentary-episode-status"; status.textContent = "SELECT";
        button.append(number, title, status);
        button.addEventListener("click", () => selectEpisode(index));
        button.addEventListener("keydown", (event) => {
            if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            moveEpisode(event.key === "ArrowDown" ? 1 : -1);
        });
        item.append(button);
        buttons.push(button);
        return item;
    };
    const load = async () => {
        if (initialized) return;
        initialized = true;
        try {
            const response = await fetch("data/documentary.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Documentary request failed: ${response.status}`);
            const payload = await response.json();
            episodes = Array.isArray(payload.episodes) ? payload.episodes : [];
            if (!episodes.length) throw new Error("Documentary archive is empty.");

            const years = new Map();
            episodes.forEach((episode, index) => {
                const year = String(new Date(episode.publishedAt).getFullYear());
                if (!years.has(year)) years.set(year, []);
                years.get(year).push({ episode, index });
            });
            const yearEntries = [...years.entries()].sort(([a], [b]) => Number(b) - Number(a));
            const entriesByYear = new Map(yearEntries);
            let selectedYear = yearEntries[0][0];

            const controls = document.createElement("nav");
            controls.className = "documentary-years";
            controls.setAttribute("aria-label", "UNCUT chapters by year");
            const trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "documentary-year-trigger";
            trigger.setAttribute("aria-label", "Select UNCUT year");
            trigger.setAttribute("aria-haspopup", "listbox");
            trigger.setAttribute("aria-expanded", "false");
            const options = document.createElement("div");
            options.className = "documentary-year-options";
            options.setAttribute("role", "listbox");
            options.setAttribute("aria-label", "UNCUT years");
            options.hidden = true;
            const chapter = document.createElement("section");
            chapter.className = "documentary-chapter";
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
                    const current = button.dataset.year === year;
                    button.classList.toggle("is-selected", current);
                    button.setAttribute("aria-selected", String(current));
                });
                const entries = entriesByYear.get(year);
                visibleEpisodeIndexes = entries.map(({ index }) => index);
                buttons = [];
                const list = document.createElement("ol");
                list.className = "documentary-list";
                list.setAttribute("aria-label", `UNCUT episodes from ${year}`);
                list.append(...entries.map(({ episode, index }) => createEpisode(episode, index)));
                chapter.replaceChildren(list);
                selectEpisode(visibleEpisodeIndexes[0]);
            };
            optionButtons = yearEntries.map(([year]) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "documentary-year-option";
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
            document.getElementById('documentary-archive-heading').append(controls);
            archive.replaceChildren(chapter);
            selectYear(selectedYear);
        } catch (error) {
            initialized = false;
            console.error("Documentary could not be loaded.", error);
            const state = document.createElement("p"); state.className = "documentary-state"; state.textContent = "SCREENING ROOM TEMPORARILY UNAVAILABLE";
            feature.replaceChildren(state); archive.replaceChildren();
        }
    };
    window.addEventListener("pog:room-closing", (event) => { if (event.detail?.roomId === "documentary-room") stopPlayback(); });
    window.addEventListener("pog:room-opened", async (event) => {
        if (event.detail?.roomId !== "documentary-room") return;
        if (!initialized) await load();
        else if (episodes.length && !feature.querySelector("iframe")) selectEpisode(selected);
        await waitForFeature();
        window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: "documentary-room" } }));
    });
}
