const formatDate = (timestamp) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();

export async function initDocumentary() {
    const feature = document.getElementById("documentary-feature");
    const archive = document.getElementById("documentary-list");
    if (!feature || !archive) return;
    let episodes = [];
    let selected = 0;
    let buttons = [];
    let initialized = false;
    const stopPlayback = () => feature.querySelector("iframe")?.remove();
    const selectEpisode = (index, focus = false) => {
        selected = (index + episodes.length) % episodes.length;
        const episode = episodes[selected];
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.videoId)}?rel=0`;
        iframe.title = `UNCUT — ${episode.title}`;
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        const player = document.createElement("div"); player.className = "documentary-player"; player.append(iframe);
        const meta = document.createElement("div"); meta.className = "documentary-feature-meta";
        const number = document.createElement("span"); number.textContent = episode.episode;
        const date = document.createElement("time"); date.dateTime = episode.publishedAt; date.textContent = formatDate(episode.publishedAt);
        meta.append(number, date);
        const title = document.createElement("h2"); title.textContent = episode.title;
        feature.replaceChildren(player, meta, title);
        buttons.forEach((button, buttonIndex) => {
            const current = buttonIndex === selected;
            button.closest(".documentary-episode").classList.toggle("is-current", current);
            button.setAttribute("aria-pressed", String(current));
            button.querySelector(".documentary-episode-status").textContent = current ? "NOW SHOWING" : "SELECT";
        });
        if (focus) buttons[selected]?.focus();
    };
    const createEpisode = (episode, index) => {
        const item = document.createElement("li"); item.className = "documentary-episode";
        const button = document.createElement("button"); button.type = "button"; button.className = "documentary-episode-button"; button.setAttribute("aria-pressed", "false");
        const number = document.createElement("span"); number.className = "documentary-episode-number"; number.textContent = episode.episode;
        const title = document.createElement("span"); title.className = "documentary-episode-title"; title.textContent = episode.title;
        const status = document.createElement("span"); status.className = "documentary-episode-status"; status.textContent = "SELECT";
        button.append(number, title, status);
        button.addEventListener("click", () => selectEpisode(index));
        button.addEventListener("keydown", (event) => {
            if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault(); selectEpisode(selected + (event.key === "ArrowDown" ? 1 : -1), true);
        });
        item.append(button); buttons.push(button); return item;
    };
    const load = async () => {
        if (initialized) return;
        initialized = true;
        try {
            const response = await fetch("data/documentary.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Documentary request failed: ${response.status}`);
            const payload = await response.json(); episodes = Array.isArray(payload.episodes) ? payload.episodes : [];
            if (!episodes.length) throw new Error("Documentary archive is empty.");
            const years = new Map();
            episodes.forEach((episode, index) => {
                const year = new Date(episode.publishedAt).getFullYear();
                if (!years.has(year)) years.set(year, []);
                years.get(year).push({ episode, index });
            });
            const chapters = [...years.entries()].map(([year, entries]) => {
                const section = document.createElement("section"); section.className = "documentary-chapter";
                const heading = document.createElement("h3"); heading.className = "documentary-year"; heading.textContent = String(year);
                const list = document.createElement("ol"); list.className = "documentary-list"; list.setAttribute("aria-label", `UNCUT episodes from ${year}`);
                list.append(...entries.map(({ episode, index }) => createEpisode(episode, index)));
                section.append(heading, list); return section;
            });
            archive.replaceChildren(...chapters);
            if (feature.closest(".world-room")?.classList.contains("is-open")) selectEpisode(0);
        } catch (error) {
            initialized = false;
            console.error("Documentary could not be loaded.", error);
            const state = document.createElement("p"); state.className = "documentary-state"; state.textContent = "SCREENING ROOM TEMPORARILY UNAVAILABLE";
            feature.replaceChildren(state); archive.replaceChildren();
        }
    };
    window.addEventListener("pog:room-closing", (event) => { if (event.detail?.roomId === "documentary-room") stopPlayback(); });
    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId !== "documentary-room") return;
        if (!initialized) load();
        else if (episodes.length && !feature.querySelector("iframe")) selectEpisode(selected);
    });
}
