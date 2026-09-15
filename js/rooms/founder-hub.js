import { createJourneyArtefact } from './journey-artefact.js';
import { pageControls, openMenu, roomNavigationCredit } from './page-template.js';
import { createJourneySelector } from './journey-selector.js';
import { createOriginArchive } from './origin-archive.js';
const ROOM_ID = "founder-room";

export function initFounderHub() {
    const room = document.getElementById(ROOM_ID);
    const hub = document.getElementById("founder-hub");
    const list = document.getElementById("founder-hub-list");
    const status = document.getElementById("founder-hub-status");
    const experience = document.getElementById("founder-experience");
    const topReturn = room?.querySelector(".room-return[data-room-close]");
    if (!room || !hub || !list || !status || !experience || !topReturn) return;

    let initialized = false;
    let selected = 0;
    let journeySelected = 0;
    let journeyEntry = 0;
    let codeEntry = 0;
    let missionEntry = 0;
    let activeExperience = null;
    let buttons = [];
    let content = null;
    let artefact = null;
    let collection = null;
    let originArchive = null;
    let codeSource = null;
    let missionTypingRun = 0;
    const viewedMissions = new Set();
    const stopArtefact = ({ preserveCodeSource = false } = {}) => {
        if (!preserveCodeSource) {
            codeSource?.dispose();
            codeSource = null;
        }
        originArchive?.dispose();
        originArchive = null;
        collection?.dispose();
        collection = null;
        artefact?.dispose();
        artefact = null;
    };

    const updateTopReturn = () => {
        const destination = activeExperience === "journey-entry"
            ? { state: "journey", label: "BACK", accessible: "Back to Journey" }
            : activeExperience !== null
                ? { state: "founder", label: "BACK", accessible: "Back to Founder" }
                : { state: "", label: "BACK", accessible: "Back to menu" };
        topReturn.dataset.roomClose = destination.state;
        topReturn.textContent = '';
        topReturn.setAttribute("aria-label", destination.accessible);
    };

    const select = (index, focus = false) => {
        if (!buttons.length) return;
        selected = (index + buttons.length) % buttons.length;
        buttons.forEach((button, buttonIndex) => {
            const current = buttonIndex === selected;
            button.classList.toggle("is-selected", current);
            button.tabIndex = current ? 0 : -1;
            button.toggleAttribute("aria-current", current);
        });
        status.textContent = "SELECT A CHAPTER";
        if (focus) buttons[selected].focus();
    };

    const stopExperienceMedia = (options) => {
        missionTypingRun += 1;
        stopArtefact(options);
        experience.querySelectorAll("video[data-founder-background-video]").forEach((video) => {
            video.pause();
            video.currentTime = 0;
        });
        experience.querySelectorAll("[data-founder-video-player]").forEach((player) => {
            window.dispatchEvent(new CustomEvent("pog:founder-video-stop", { detail: { player } }));
        });
    };

    const showHub = (focus = true) => {
        stopExperienceMedia();
        activeExperience = null;
        updateTopReturn();
        experience.hidden = true;
        experience.replaceChildren();
        hub.hidden = false;
        if (focus) buttons[selected]?.focus();
    };

    const createExperienceMedia = (frame, className = "founder-origin-media") => {
        const media = document.createElement("div");
        media.className = `${className} is-${frame.media.type}`;
        if (frame.media.type === "model") {
            artefact = createJourneyArtefact(frame);
            media.append(artefact);
        } else if (frame.media.type === "image") {
            const image = document.createElement("img");
            image.src = frame.media.src;
            image.alt = frame.media.alt;
            image.width = frame.media.width;
            image.height = frame.media.height;
            image.decoding = "async";
            media.append(image);
        } else if (frame.media.type === "video") {
            const player = document.createElement("div");
            player.className = "founder-mission-player founder-origin-video";
            player.dataset.founderVideoPlayer = "";
            const video = document.createElement("video");
            video.id = "founder-origin-mission-video";
            video.preload = "metadata";
            video.playsInline = true;
            video.poster = frame.media.poster;
            const source = document.createElement("source");
            source.src = frame.media.src;
            source.type = "video/mp4";
            video.append(source);
            const play = document.createElement("button");
            play.type = "button";
            play.className = "founder-mission-play";
            play.dataset.founderVideoPlay = "";
            play.setAttribute("aria-controls", video.id);
            const symbol = document.createElement("span");
            symbol.className = "founder-play-symbol";
            symbol.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.dataset.founderPlayLabel = "";
            label.textContent = "PLAY";
            play.append(symbol, label);
            player.append(video, play);
            media.append(player);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "founder-media-placeholder";
            placeholder.textContent = `[${frame.media.label}]`;
            placeholder.setAttribute("role", "img");
            placeholder.setAttribute("aria-label", `Image placeholder: ${frame.media.label}`);
            media.append(placeholder);
        }
        return media;
    };

    const openOrigin = () => {
        stopExperienceMedia();
        activeExperience = "origin";
        updateTopReturn();
        hub.hidden = true;
        originArchive = createOriginArchive();
        experience.replaceChildren(originArchive);
        experience.removeAttribute("aria-labelledby");
        experience.setAttribute("aria-label", "Pre-PoG visual archive");
        experience.hidden = false;
        requestAnimationFrame(() => originArchive?.focus({ preventScroll: true }));
    };

    const renderJourneyEntry = (index, focus = true) => {
        stopExperienceMedia();
        activeExperience = "journey-entry";
        updateTopReturn();
        journeyEntry = Math.max(0, Math.min(index, content.journey.length - 1));
        journeySelected = journeyEntry;
        const memory = content.journey[journeyEntry];
        const shell = document.createElement("article");
        shell.className = "founder-journey-entry";
        let backgroundVideo = null;
        if (memory.backgroundVideo) {
            shell.classList.add("has-background-video");
            backgroundVideo = document.createElement("video");
            backgroundVideo.className = "founder-journey-background-video";
            backgroundVideo.dataset.founderBackgroundVideo = "";
            backgroundVideo.src = memory.backgroundVideo;
            backgroundVideo.autoplay = true;
            backgroundVideo.loop = true;
            backgroundVideo.muted = true;
            backgroundVideo.defaultMuted = true;
            backgroundVideo.playsInline = true;
            backgroundVideo.preload = "auto";
            backgroundVideo.tabIndex = -1;
            backgroundVideo.setAttribute("muted", "");
            backgroundVideo.setAttribute("playsinline", "");
            backgroundVideo.setAttribute("aria-hidden", "true");
            const backgroundShade = document.createElement("div");
            backgroundShade.className = "founder-journey-background-shade";
            backgroundShade.setAttribute("aria-hidden", "true");
            shell.append(backgroundVideo, backgroundShade);
        }
        const header = document.createElement("header");
        header.className = "founder-journey-entry-header";
        const count = document.createElement("p");
        count.className = "founder-journey-count";
        count.textContent = `${memory.number} / ${String(content.journey.length).padStart(2, "0")}`;
        const title = document.createElement("h2");
        title.id = "founder-journey-entry-title";
        title.textContent = memory.title;
        header.append(count, title);
        const media = createExperienceMedia(memory, "founder-journey-media");
        const copy = document.createElement("div");
        copy.className = "founder-journey-copy";
        memory.copy.forEach((paragraph) => {
            const line = document.createElement("p");
            line.textContent = paragraph;
            copy.append(line);
        });
        const controls = document.createElement("div");
        controls.className = "founder-journey-controls";
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "founder-journey-control is-previous";
        previous.textContent = "PREVIOUS";
        previous.disabled = journeyEntry === 0;
        previous.addEventListener("click", () => renderJourneyEntry(journeyEntry - 1));
        const back = document.createElement("button");
        back.type = "button";
        back.className = "founder-journey-control founder-journey-return";
        back.textContent = "MENU";
        back.addEventListener("click", openMenu);
        const next = document.createElement("button");
        next.type = "button";
        next.className = "founder-journey-control is-next";
        next.textContent = "NEXT";
        next.disabled = journeyEntry === content.journey.length - 1;
        next.addEventListener("click", () => renderJourneyEntry(journeyEntry + 1));
        controls.append(previous, back, next, roomNavigationCredit());
        header.append(copy);
        shell.append(header, media, controls);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        backgroundVideo?.play().catch(() => {});
        if (focus) back.focus();
    };

    function renderJourneyMenu(focus = true) {
        stopExperienceMedia();
        activeExperience = "journey-menu";
        updateTopReturn();
        collection = createJourneySelector(content.journey, {
            selected: journeySelected,
            onSelect: index => { journeySelected = index; },
            onOpen: index => renderJourneyEntry(index),
            onReturn: openMenu
        });
        experience.replaceChildren(collection);
        experience.setAttribute("aria-labelledby", "founder-journey-menu-title");
        experience.hidden = false;
        if (focus) collection.focusSelected();
    }

    const openJourney = () => {
        hub.hidden = true;
        journeySelected = 0;
        renderJourneyMenu();
    };

    const createCodeSource = (stage) => {
        let currentStage = stage;
        const backdrop = document.createElement("div");
        backdrop.className = "founder-code-source-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "founder-code-source";
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", `View ${content.codeArchive.alt}`);
        const image = document.createElement("img");
        image.className = "founder-code-archive-image";
        image.src = content.codeArchive.src;
        image.alt = content.codeArchive.alt;
        image.width = content.codeArchive.width;
        image.height = content.codeArchive.height;
        image.decoding = "async";
        button.append(image);
        currentStage.append(backdrop, button);

        let disposed = false;
        let frame = 0;
        let previousTime = performance.now();
        let focused = false;
        let x = 0;
        let y = 0;
        let home = null;
        const angle = Math.random() * Math.PI * 2;
        const speed = 22 + Math.random() * 14;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        if (Math.abs(vx) < 8) vx = Math.sign(vx || 1) * 8;
        if (Math.abs(vy) < 8) vy = Math.sign(vy || 1) * 8;

        const area = () => ({ width: currentStage.clientWidth, height: currentStage.clientHeight });
        const paint = () => { button.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
        const place = () => {
            const bounds = area();
            x = Math.random() * Math.max(0, bounds.width - button.offsetWidth);
            y = Math.random() * Math.max(0, bounds.height - button.offsetHeight);
            paint();
        };
        const positionFocused = () => {
            const bounds = area();
            const ratio = content.codeArchive.width / content.codeArchive.height;
            const width = Math.min(bounds.width * 0.76, bounds.height * 0.86 * ratio);
            button.style.width = `${width}px`;
            x = (bounds.width - width) / 2;
            y = (bounds.height - width / ratio) / 2;
            paint();
        };
        const close = () => {
            if (!focused) return false;
            focused = false;
            currentStage.classList.remove("is-source-focused");
            button.classList.remove("is-focused");
            button.setAttribute("aria-pressed", "false");
            button.setAttribute("aria-label", `View ${content.codeArchive.alt}`);
            button.style.width = `${home.width}px`;
            x = home.x;
            y = home.y;
            paint();
            button.focus({ preventScroll: true });
            return true;
        };
        const open = () => {
            home = { x, y, width: button.offsetWidth };
            focused = true;
            currentStage.classList.add("is-source-focused");
            button.classList.add("is-focused");
            button.setAttribute("aria-pressed", "true");
            button.setAttribute("aria-label", `Close ${content.codeArchive.alt}`);
            positionFocused();
        };
        button.addEventListener("click", () => { if (!close()) open(); });
        button.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && focused) {
                event.preventDefault();
                event.stopPropagation();
                close();
            } else if (focused && event.key.startsWith("Arrow")) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        const resize = () => {
            if (focused) return positionFocused();
            const bounds = area();
            x = Math.min(Math.max(0, x), Math.max(0, bounds.width - button.offsetWidth));
            y = Math.min(Math.max(0, y), Math.max(0, bounds.height - button.offsetHeight));
            paint();
        };
        const update = (time) => {
            if (disposed) return;
            const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
            previousTime = time;
            if (!focused && !document.hidden) {
                const bounds = area();
                x += vx * delta;
                y += vy * delta;
                if (x <= 0 || x + button.offsetWidth >= bounds.width) {
                    vx *= -1;
                    x = Math.min(Math.max(0, x), Math.max(0, bounds.width - button.offsetWidth));
                }
                if (y <= 0 || y + button.offsetHeight >= bounds.height) {
                    vy *= -1;
                    y = Math.min(Math.max(0, y), Math.max(0, bounds.height - button.offsetHeight));
                }
                paint();
            }
            frame = requestAnimationFrame(update);
        };
        window.addEventListener("resize", resize);
        requestAnimationFrame(() => {
            if (disposed) return;
            place();
            previousTime = performance.now();
            frame = requestAnimationFrame(update);
        });
        return {
            button,
            attach(nextStage) {
                currentStage.classList.remove("is-source-focused");
                currentStage = nextStage;
                currentStage.append(backdrop, button);
                if (focused) currentStage.classList.add("is-source-focused");
                requestAnimationFrame(() => {
                    if (disposed) return;
                    if (focused) positionFocused();
                    else resize();
                });
            },
            dispose() {
                disposed = true;
                cancelAnimationFrame(frame);
                window.removeEventListener("resize", resize);
            }
        };
    };

    const renderCodeEntry = (index, focus = true) => {
        stopExperienceMedia({ preserveCodeSource: true });
        activeExperience = "code-entry";
        updateTopReturn();
        codeEntry = Math.max(0, Math.min(index, content.code.length - 1));
        const law = content.code[codeEntry];

        const shell = document.createElement("article");
        shell.className = "founder-code-entry";

        const header = document.createElement("header");
        header.className = "founder-code-header";
        const kicker = document.createElement("p");
        kicker.className = "room-kicker";
        kicker.textContent = "PIONEERS OF GREATNESS";
        const title = document.createElement("h2");
        title.id = "founder-code-title";
        title.textContent = "THE 13 LAWS";
        header.append(kicker, title);

        const stage = document.createElement("div");
        stage.className = "founder-code-stage";
        stage.tabIndex = -1;
        const statementLockup = document.createElement("div");
        statementLockup.className = "founder-code-statement";
        const lawNumber = document.createElement("span");
        lawNumber.className = "founder-code-law-number";
        lawNumber.setAttribute("aria-hidden", "true");
        lawNumber.textContent = law.number;
        const statement = document.createElement("p");
        statement.className = "founder-code-law";
        statement.textContent = law.statement;
        statementLockup.append(lawNumber, statement);
        stage.append(statementLockup);
        if (codeSource) codeSource.attach(stage);
        else codeSource = createCodeSource(stage);

        const controls = pageControls(
            codeEntry > 0 ? () => renderCodeEntry(codeEntry - 1) : null,
            codeEntry < content.code.length - 1 ? () => renderCodeEntry(codeEntry + 1) : null
        );
        shell.append(header, stage, controls.bar);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        if (focus) stage.focus({ preventScroll: true });
    };

    const openCode = () => {
        hub.hidden = true;
        renderCodeEntry(0);
    };

    const queueMissionText = (element, value, speed = 5) => {
        element.dataset.missionType = value;
        element.dataset.missionSpeed = String(speed);
        element.setAttribute("aria-label", value);
        element.textContent = "";
    };

    const playMissionTyping = async (terminal, run, animate = true) => {
        const targets = [...terminal.querySelectorAll("[data-mission-type]")];
        const revealAll = () => {
            targets.forEach((target) => {
                target.textContent = target.dataset.missionType;
                target.classList.remove("is-typing");
            });
            terminal.classList.remove("is-typing");
        };
        if (!animate) {
            revealAll();
            return;
        }
        terminal.classList.add("is-typing");
        for (const target of targets) {
            if (run !== missionTypingRun || !terminal.isConnected) return;
            const value = target.dataset.missionType;
            const speed = Number(target.dataset.missionSpeed) || 5;
            target.classList.add("is-typing");
            for (const character of value) {
                if (run !== missionTypingRun || !terminal.isConnected) return;
                target.textContent += character;
                await new Promise((resolve) => window.setTimeout(resolve, speed));
            }
            target.classList.remove("is-typing");
            await new Promise((resolve) => window.setTimeout(resolve, 18));
        }
        if (run === missionTypingRun) terminal.classList.remove("is-typing");
    };

    const renderMissionEntry = (index, focus = true) => {
        stopExperienceMedia();
        activeExperience = "mission-entry";
        updateTopReturn();
        missionEntry = Math.max(0, Math.min(index, content.missions.length - 1));
        const mission = content.missions[missionEntry];

        const shell = document.createElement("article");
        shell.className = `founder-mission-entry is-${mission.state}`;
        const header = document.createElement("header");
        header.className = "founder-mission-entry-header";
        const count = document.createElement("p");
        count.className = "founder-mission-count";
        count.textContent = `${mission.number} / ${String(content.missions.length).padStart(2, "0")}`;
        const kicker = document.createElement("p");
        kicker.className = "room-kicker founder-mission-state";
        kicker.textContent = mission.label;
        const title = document.createElement("h2");
        title.id = "founder-mission-title";
        title.textContent = mission.title;
        const phase = document.createElement("p");
        phase.className = "founder-mission-phase";
        phase.textContent = mission.phase;
        header.append(count, kicker, title, phase);

        const stage = document.createElement("div");
        stage.className = "founder-mission-stage";
        stage.tabIndex = -1;
        const terminal = document.createElement("section");
        terminal.className = "founder-mission-terminal";
        const terminalLabel = document.createElement("p");
        terminalLabel.className = "founder-mission-terminal-label";
        queueMissionText(terminalLabel, "MISSION BRIEF", 8);
        const objective = document.createElement("h3");
        objective.className = "founder-mission-objective";
        queueMissionText(objective, mission.objective, 6);
        const brief = document.createElement("p");
        brief.className = "founder-mission-brief";
        queueMissionText(brief, mission.brief, 2);
        const details = document.createElement("dl");
        details.className = "founder-mission-details";
        mission.details.forEach(([term, description]) => {
            const row = document.createElement("div");
            const key = document.createElement("dt");
            queueMissionText(key, term, 4);
            const value = document.createElement("dd");
            queueMissionText(value, description, 3);
            row.append(key, value);
            details.append(row);
        });
        terminal.append(terminalLabel, objective, brief, details);
        if (mission.priorities?.length) {
            const priorities = document.createElement("div");
            priorities.className = "founder-mission-priorities";
            const prioritiesLabel = document.createElement("p");
            queueMissionText(prioritiesLabel, "CURRENT PRIORITIES", 4);
            const list = document.createElement("ol");
            mission.priorities.forEach((priority) => {
                const item = document.createElement("li");
                queueMissionText(item, priority, 3);
                list.append(item);
            });
            priorities.append(prioritiesLabel, list);
            terminal.append(priorities);
        }
        const signal = document.createElement("p");
        signal.className = "founder-mission-signal";
        queueMissionText(signal, mission.state === "active" ? "SIGNAL LIVE" : "ARCHIVE LOCKED", 5);
        terminal.append(signal);
        stage.append(terminal);

        const controls = pageControls(
            missionEntry > 0 ? () => renderMissionEntry(missionEntry - 1) : null,
            missionEntry < content.missions.length - 1 ? () => renderMissionEntry(missionEntry + 1) : null
        );
        shell.append(header, stage, controls.bar);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        const shouldType = !viewedMissions.has(mission.id);
        viewedMissions.add(mission.id);
        playMissionTyping(terminal, missionTypingRun, shouldType);
        if (focus) stage.focus({ preventScroll: true });
    };

    const openMission = () => {
        hub.hidden = true;
        renderMissionEntry(content.missions.length - 1);
    };

    const activate = (button) => {
        select(buttons.indexOf(button));
        const item = content.hub[selected];
        button.classList.add("is-activated");
        window.setTimeout(() => button.classList.remove("is-activated"), 220);
        if (item.status === "available" && item.id === "origin") {
            openOrigin();
            return;
        }
        if (item.status === "available" && item.id === "journey") {
            openJourney();
            return;
        }
        if (item.status === "available" && item.id === "code") {
            openCode();
            return;
        }
        if (item.status === "available" && item.id === "mission") {
            openMission();
            return;
        }
        status.textContent = `${item.label} — CHAPTER IN DEVELOPMENT`;
    };

    const createItem = (item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "founder-hub-item";
        button.setAttribute("role", "menuitem");
        button.dataset.founderSection = item.id;
        button.dataset.status = item.status;
        if (item.status !== "available") button.setAttribute("aria-disabled", "true");
        const number = document.createElement("span");
        number.className = "founder-hub-item-number";
        number.textContent = item.number;
        const label = document.createElement("span");
        label.className = "founder-hub-item-label";
        label.textContent = item.label;
        button.append(number, label);
        button.addEventListener("pointerover", () => select(index));
        button.addEventListener("click", () => activate(button));
        return button;
    };

    const load = async () => {
        if (initialized) return;
        initialized = true;
        status.textContent = "OPENING FOUNDER FILE...";
        try {
            const response = await fetch("data/founder-room.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Founder Room request failed: ${response.status}`);
            content = await response.json();
            if (!Array.isArray(content.hub) || content.hub.length !== 4 || !Array.isArray(content.code) || content.code.length !== 13 || !Array.isArray(content.origin) || !Array.isArray(content.journey) || !Array.isArray(content.missions) || !content.missions.length) throw new Error("Founder Room is incomplete.");
            buttons = content.hub.map(createItem);
            list.replaceChildren(...buttons);
            select(0);
        } catch (error) {
            initialized = false;
            console.error("Founder Hub could not be loaded.", error);
            list.replaceChildren();
            status.textContent = "FOUNDER FILE TEMPORARILY UNAVAILABLE";
        }
    };

    hub.append(pageControls(() => select(selected - 1, true), () => select(selected + 1, true)).bar);
    hub.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            select(selected + (event.key === "ArrowDown" ? 1 : -1), true);
        } else if (event.key === "Enter" && buttons.includes(document.activeElement)) {
            event.preventDefault();
            activate(document.activeElement);
        }
    });

    topReturn.addEventListener("click", () => {
        if (topReturn.dataset.roomClose === "journey") renderJourneyMenu();
        else if (topReturn.dataset.roomClose === "founder") showHub();
    });

    experience.addEventListener("keydown", (event) => {
        if (activeExperience === "journey-entry" && event.key === "ArrowLeft" && journeyEntry > 0) {
            event.preventDefault();
            renderJourneyEntry(journeyEntry - 1);
        } else if (activeExperience === "journey-entry" && event.key === "ArrowRight" && journeyEntry < content.journey.length - 1) {
            event.preventDefault();
            renderJourneyEntry(journeyEntry + 1);
        } else if (activeExperience === "code-entry" && event.key === "ArrowLeft" && codeEntry > 0) {
            event.preventDefault();
            renderCodeEntry(codeEntry - 1);
        } else if (activeExperience === "code-entry" && event.key === "ArrowRight" && codeEntry < content.code.length - 1) {
            event.preventDefault();
            renderCodeEntry(codeEntry + 1);
        } else if (activeExperience === "mission-entry" && event.key === "ArrowLeft" && missionEntry > 0) {
            event.preventDefault();
            renderMissionEntry(missionEntry - 1);
        } else if (activeExperience === "mission-entry" && event.key === "ArrowRight" && missionEntry < content.missions.length - 1) {
            event.preventDefault();
            renderMissionEntry(missionEntry + 1);
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (activeExperience === "journey-entry") renderJourneyMenu();
            else showHub();
        }
    });

    window.addEventListener("pog:room-opened", (event) => {
        if (event.detail?.roomId !== ROOM_ID) return;
        load().then(() => {
            showHub(false);
            buttons[selected]?.focus();
            window.dispatchEvent(new CustomEvent("pog:room-ready", { detail: { roomId: ROOM_ID } }));
        });
    });
    window.addEventListener("pog:room-closing", (event) => {
        if (event.detail?.roomId === ROOM_ID) showHub(false);
    });
}
