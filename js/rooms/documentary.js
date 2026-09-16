const formatDate = (timestamp) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();
const sound = (name) => window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name } }));
const crtAudio = (action, detail = {}) => window.dispatchEvent(new CustomEvent("pog:crt-audio", { detail: { action, ...detail } }));

export async function initDocumentary() {
    const room = document.getElementById("documentary-room");
    const environment = document.getElementById("documentary-environment");
    const sceneHost = document.getElementById("documentary-scene");
    const sceneStatus = document.getElementById("documentary-scene-status");
    const crtPlayer = document.getElementById("documentary-crt-player");
    const crtState = document.getElementById("documentary-crt-state");
    const tvTrigger = document.getElementById("documentary-tv-trigger");
    const crtControls = document.getElementById("documentary-crt-controls");
    const crtPrevious = document.getElementById("documentary-crt-previous");
    const crtNext = document.getElementById("documentary-crt-next");
    const crtArchiveToggle = document.getElementById("documentary-crt-archive-toggle");
    const crtArchiveMenu = document.getElementById("documentary-crt-archive-menu");
    const content = room?.querySelector(".documentary-content");
    const feature = document.getElementById("documentary-feature");
    const archive = document.getElementById("documentary-list");
    if (!room || !environment || !sceneHost || !sceneStatus || !crtPlayer || !crtState || !tvTrigger || !crtControls || !crtPrevious || !crtNext || !crtArchiveToggle || !crtArchiveMenu || !content || !feature || !archive) return;
    let episodes = [];
    let selected = 0;
    let visibleEpisodeIndexes = [];
    let buttons = [];
    let initialized = false;
    let archiveOpen = false;
    let booting = false;
    let crtPlaying = false;
    let scene;
    let sceneLoading;
    let crtArchiveYear = "";

    const waitForFeature = async () => {
        const iframe = feature.querySelector("iframe");
        if (!iframe || iframe.dataset.ready === "true") return;
        await Promise.race([
            new Promise((resolve) => iframe.addEventListener("load", resolve, { once: true })),
            new Promise((resolve) => window.setTimeout(resolve, 4000))
        ]);
    };
    const stopPlayback = () => feature.querySelector("iframe")?.remove();
    const stopCrtPlayback = () => {
        crtPlaying = false;
        crtPlayer.classList.remove("is-playing");
        crtPlayer.setAttribute("aria-hidden", "true");
        crtPlayer.replaceChildren();
    };
    const episodeNumber = (episode, index = 0) => {
        const parsed = Number(String(episode?.episode || "").match(/\d+/)?.[0]);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : episodes.length - index;
    };
    const updateCrtMetadata = () => {
        const episode = episodes[selected] || episodes[0];
        if (!episode) return;
        const currentNumber = episodeNumber(episode, selected);
        crtArchiveToggle.setAttribute("aria-label", `Episodes, current episode ${currentNumber}`);
        crtState.textContent = `NOW PLAYING — ${episode.title}`;
        crtState.hidden = false;
        crtPrevious.disabled = selected >= episodes.length - 1;
        crtNext.disabled = selected <= 0;
    };
    const closeCrtArchive = (restoreFocus = false) => {
        crtArchiveMenu.classList.remove("is-open");
        crtArchiveMenu.setAttribute("aria-hidden", "true");
        crtArchiveMenu.inert = true;
        crtArchiveToggle.setAttribute("aria-expanded", "false");
        if (restoreFocus) crtArchiveToggle.focus();
    };
    const chooseCrtEpisode = (index) => {
        selected = index;
        sound("crtTune");
        startCrtPlayback(true);
        closeCrtArchive(true);
    };
    const renderCrtArchiveEpisodes = () => {
        const list = crtArchiveMenu.querySelector(".documentary-crt-episode-list");
        if (!list) return;
        const indexes = episodes
            .map((episode, index) => ({ episode, index }))
            .filter(({ episode }) => String(new Date(episode.publishedAt).getFullYear()) === crtArchiveYear);
        list.replaceChildren(...indexes.map(({ episode, index }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "documentary-crt-episode-option";
            button.dataset.crtSound = "";
            button.dataset.episodeIndex = String(index);
            button.classList.toggle("is-current", index === selected);
            button.setAttribute("aria-pressed", String(index === selected));
            const number = document.createElement("span");
            number.textContent = String(episodeNumber(episode, index)).padStart(3, "0");
            const title = document.createElement("strong");
            title.textContent = episode.title;
            const date = document.createElement("time");
            date.dateTime = episode.publishedAt;
            date.textContent = formatDate(episode.publishedAt);
            button.append(number, title, date);
            button.addEventListener("click", () => chooseCrtEpisode(index));
            return button;
        }));
    };
    const buildCrtArchive = () => {
        const years = [...new Set(episodes.map((episode) => String(new Date(episode.publishedAt).getFullYear())))].sort((a, b) => Number(b) - Number(a));
        crtArchiveYear = years[0] || "";
        const header = document.createElement("header");
        const label = document.createElement("p");
        label.textContent = "EPISODE ARCHIVE";
        const year = document.createElement("select");
        year.className = "documentary-crt-year-filter";
        year.setAttribute("aria-label", "Filter Video Journal episodes by year");
        years.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            year.append(option);
        });
        year.addEventListener("change", () => {
            crtArchiveYear = year.value;
            renderCrtArchiveEpisodes();
        });
        header.append(label, year);
        const list = document.createElement("div");
        list.className = "documentary-crt-episode-list";
        crtArchiveMenu.replaceChildren(header, list);
        renderCrtArchiveEpisodes();
    };
    const startCrtPlayback = (autoplay = false) => {
        const episode = episodes[selected] || episodes[0];
        if (!episode) return;
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.videoId)}?playsinline=1&rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}`;
        iframe.title = `Playing on the workspace CRT: ${episode.title}`;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.allowFullscreen = true;
        iframe.addEventListener("load", () => {
            window.requestAnimationFrame(() => iframe.classList.add("is-signal-ready"));
        }, { once: true });
        crtPlayer.replaceChildren(iframe);
        updateCrtMetadata();
    };
    const moveCrtEpisode = (step) => {
        if (!episodes.length || !crtPlaying) return;
        const next = Math.max(0, Math.min(episodes.length - 1, selected + step));
        if (next === selected) return;
        selected = next;
        sound("crtTune");
        startCrtPlayback(true);
    };
    const selectEpisode = (index, focus = false) => {
        selected = index;
        const episode = episodes[selected];
        if (!episode) return;
        buttons.forEach((button) => {
            const current = Number(button.dataset.episodeIndex) === selected;
            button.closest(".documentary-episode").classList.toggle("is-current", current);
            button.setAttribute("aria-pressed", String(current));
            button.querySelector(".documentary-episode-status").textContent = current ? "NOW SHOWING" : "SELECT";
        });
        if (!archiveOpen) {
            stopPlayback();
            return;
        }
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
        const summary = document.createElement("p");
        summary.className = "documentary-feature-summary";
        summary.textContent = episode.summary || "";
        feature.replaceChildren(player, meta, title, summary);
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
            episodes = Array.isArray(payload.episodes)
                ? [...payload.episodes].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
                : [];
            if (!episodes.length) throw new Error("Documentary archive is empty.");
            buildCrtArchive();

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

    const showEnvironment = () => {
        archiveOpen = false;
        booting = false;
        room.classList.remove("is-archive-open");
        environment.setAttribute("aria-hidden", "false");
        environment.inert = false;
        content.setAttribute("aria-hidden", "true");
        content.inert = true;
        tvTrigger.classList.remove("is-booting");
        tvTrigger.disabled = !scene?.loaded;
        tvTrigger.querySelector("span").textContent = "POWER ON";
        tvTrigger.querySelector("small").textContent = "ENTER VIDEO JOURNAL";
        tvTrigger.hidden = true;
        crtControls.hidden = true;
        closeCrtArchive();
        crtState.hidden = true;
        crtState.textContent = scene?.loaded ? "CRT OFFLINE" : "CALIBRATING CRT…";
        stopPlayback();
        stopCrtPlayback();
        scene?.reset();
    };

    const revealArchive = async () => {
        archiveOpen = true;
        stopCrtPlayback();
        room.classList.add("is-archive-open");
        environment.setAttribute("aria-hidden", "true");
        environment.inert = true;
        content.setAttribute("aria-hidden", "false");
        content.inert = false;
        if (episodes.length) selectEpisode(selected);
        await waitForFeature();
        content.querySelector(".room-return")?.focus({ preventScroll: true });
        window.dispatchEvent(new CustomEvent("pog:dismiss-quick-menu"));
    };

    const powerOn = async () => {
        if (booting || archiveOpen) return;
        if (crtPlaying) return;
        booting = true;
        tvTrigger.classList.add("is-booting");
        tvTrigger.querySelector("span").textContent = "BOOTING";
        crtState.textContent = "POWER · STATIC · TRACKING";
        updateCrtMetadata();
        startCrtPlayback();
        crtState.hidden = true;
        crtControls.hidden = false;
        try {
            await scene?.boot();
            scene?.beginPlayback();
            crtPlaying = true;
            crtPlayer.classList.add("is-playing");
            crtPlayer.setAttribute("aria-hidden", "false");
            updateCrtMetadata();
            tvTrigger.hidden = true;
        } finally {
            booting = false;
            tvTrigger.classList.remove("is-booting");
        }
    };

    const sceneHooks = {
        onReady() {
            sceneHost.classList.add("is-ready");
            sceneStatus.textContent = "";
            tvTrigger.disabled = false;
            crtState.textContent = "POWER · STATIC · TRACKING";
            window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: "documentary-room" } }));
            if (room.classList.contains("is-open")) powerOn();
        },
        onHover(hovered) {
            if (!booting && !crtPlaying) crtState.textContent = hovered ? "PRESS TO POWER ON" : "CRT OFFLINE";
        },
        onCrtPower() {
            crtAudio("power");
        },
        onCrtStaticStart(duration) {
            crtAudio("static-start", { duration });
        },
        onCrtStaticEnd() {
            crtAudio("static-stop");
        },
        onScreenRect(rect) {
            const insetX = rect.width * .062;
            const insetY = rect.height * .042;
            environment.style.setProperty("--crt-left", `${rect.left + insetX}px`);
            environment.style.setProperty("--crt-top", `${rect.top + insetY}px`);
            environment.style.setProperty("--crt-width", `${Math.max(0, rect.width - insetX * 2)}px`);
            environment.style.setProperty("--crt-height", `${Math.max(0, rect.height - insetY * 2)}px`);
        },
        onActivate: powerOn,
        onError() {
            sceneStatus.textContent = "WORKSPACE RECONSTRUCTION UNAVAILABLE";
            tvTrigger.disabled = false;
            tvTrigger.querySelector("small").textContent = "ENTER ARCHIVE DIRECTLY";
            crtState.textContent = "FALLBACK SIGNAL READY";
            window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: "documentary-room" } }));
        }
    };

    const mountScene = () => {
        if (scene) {
            scene.attach(sceneHost, sceneHooks);
            return Promise.resolve(scene);
        }
        sceneLoading ||= import("./video-journal-scene.js").then(({ mountVideoJournalScene }) => {
            scene = mountVideoJournalScene(sceneHost, sceneHooks);
            return scene;
        });
        return sceneLoading;
    };

    tvTrigger.addEventListener("click", powerOn);
    crtPrevious.addEventListener("click", () => moveCrtEpisode(1));
    crtNext.addEventListener("click", () => moveCrtEpisode(-1));
    crtArchiveToggle.addEventListener("click", () => {
        const open = crtArchiveToggle.getAttribute("aria-expanded") !== "true";
        crtArchiveMenu.classList.toggle("is-open", open);
        crtArchiveMenu.setAttribute("aria-hidden", String(!open));
        crtArchiveMenu.inert = !open;
        crtArchiveToggle.setAttribute("aria-expanded", String(open));
        if (open) {
            renderCrtArchiveEpisodes();
            crtArchiveMenu.querySelector(".documentary-crt-episode-option.is-current")?.scrollIntoView({ block: "nearest" });
        }
    });
    document.addEventListener("pointerdown", (event) => {
        if (crtArchiveMenu.classList.contains("is-open") && !crtArchiveMenu.contains(event.target) && !crtArchiveToggle.contains(event.target)) closeCrtArchive();
    });
    crtArchiveMenu.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        closeCrtArchive(true);
    });
    window.addEventListener("pog:room-closing", (event) => {
        if (event.detail?.roomId !== "documentary-room") return;
        stopPlayback();
        stopCrtPlayback();
        crtAudio("stop");
        scene?.detach();
    });
    window.addEventListener("pog:room-opened", async (event) => {
        if (event.detail?.roomId !== "documentary-room") return;
        showEnvironment();
        if (!initialized) await load();
        await mountScene();
        if (scene?.loaded && !crtPlaying) powerOn();
    });
}
