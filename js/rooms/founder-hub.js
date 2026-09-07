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
    let originFrame = 0;
    let journeySelected = 0;
    let journeyEntry = 0;
    let activeExperience = null;
    let buttons = [];
    let content = null;

    const updateTopReturn = () => {
        const destination = activeExperience === "journey-entry"
            ? { state: "journey", label: "← RETURN TO JOURNEY", accessible: "Return to Journey" }
            : activeExperience !== null
                ? { state: "founder", label: "← RETURN TO FOUNDER", accessible: "Return to Founder" }
                : { state: "", label: "← RETURN TO MENU", accessible: "Return to menu" };
        topReturn.dataset.roomClose = destination.state;
        topReturn.textContent = destination.label;
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

    const stopExperienceMedia = () => {
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
        if (frame.media.type === "image") {
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

    const renderOrigin = (index, focus = true) => {
        stopExperienceMedia();
        activeExperience = "origin";
        updateTopReturn();
        originFrame = Math.max(0, Math.min(index, content.origin.length - 1));
        const frame = content.origin[originFrame];
        const shell = document.createElement("div");
        shell.className = "founder-origin-frame";
        shell.classList.toggle("is-visual-only", !frame.copy?.length);
        const header = document.createElement("header");
        header.className = "founder-origin-frame-header";
        const count = document.createElement("p");
        count.className = "founder-origin-frame-count";
        count.textContent = `FRAME ${frame.number} / ${String(content.origin.length).padStart(2, "0")}`;
        const title = document.createElement("h2");
        title.id = "founder-origin-frame-title";
        title.textContent = frame.title;
        header.append(count, title);
        if (frame.date) {
            const date = document.createElement("p");
            date.className = "founder-origin-frame-date";
            date.textContent = frame.date;
            header.append(date);
        }
        const media = createExperienceMedia(frame);
        if (frame.id === "first-physical-expression") {
            const image = media.querySelector("img");
            if (image) {
                const poemTrigger = document.createElement("button");
                poemTrigger.type = "button";
                poemTrigger.className = "founder-origin-poem-trigger";
                poemTrigger.setAttribute("aria-label", "Replay the animated GREATNESS POEM");
                poemTrigger.addEventListener("click", () => {
                    window.dispatchEvent(new CustomEvent("pog:poem-replay-requested", {
                        detail: { trigger: poemTrigger }
                    }));
                });
                poemTrigger.append(image);
                media.append(poemTrigger);
            }
        }
        const copy = document.createElement("div");
        copy.className = "founder-origin-copy";
        frame.copy?.forEach((paragraph) => {
            const line = document.createElement("p");
            line.textContent = paragraph;
            copy.append(line);
        });
        const controls = document.createElement("div");
        controls.className = "founder-origin-controls";
        const previous = document.createElement("button");
        previous.type = "button";
        previous.className = "founder-origin-control is-previous";
        previous.textContent = "← PREVIOUS";
        previous.disabled = originFrame === 0;
        previous.addEventListener("click", () => renderOrigin(originFrame - 1));
        const back = document.createElement("button");
        back.type = "button";
        back.className = "founder-origin-control founder-origin-return";
        back.textContent = "RETURN TO MENU";
        back.addEventListener("click", () => window.dispatchEvent(new CustomEvent("pog:close-room")));
        const next = document.createElement("button");
        next.type = "button";
        next.className = "founder-origin-control is-next";
        next.textContent = "NEXT →";
        next.disabled = originFrame === content.origin.length - 1;
        next.addEventListener("click", () => renderOrigin(originFrame + 1));
        controls.append(previous, back, next);
        shell.append(header, media);
        if (frame.copy?.length) shell.append(copy);
        shell.append(controls);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        experience.querySelectorAll("[data-founder-video-player]").forEach((player) => {
            window.dispatchEvent(new CustomEvent("pog:founder-video-ready", { detail: { player } }));
        });
        if (focus) back.focus();
    };

    const openOrigin = () => {
        hub.hidden = true;
        originFrame = 0;
        renderOrigin(0);
    };

    const selectJourney = (index, focus = false) => {
        const journeyButtons = [...experience.querySelectorAll(".founder-journey-item")];
        if (!journeyButtons.length) return;
        journeySelected = (index + journeyButtons.length) % journeyButtons.length;
        journeyButtons.forEach((button, buttonIndex) => {
            const current = buttonIndex === journeySelected;
            button.classList.toggle("is-selected", current);
            button.tabIndex = current ? 0 : -1;
            button.toggleAttribute("aria-current", current);
        });
        if (focus) journeyButtons[journeySelected]?.focus();
    };

    const renderJourneyEntry = (index, focus = true) => {
        activeExperience = "journey-entry";
        updateTopReturn();
        journeyEntry = Math.max(0, Math.min(index, content.journey.length - 1));
        const memory = content.journey[journeyEntry];
        const shell = document.createElement("article");
        shell.className = "founder-journey-entry";
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
        previous.textContent = "← PREVIOUS";
        previous.disabled = journeyEntry === 0;
        previous.addEventListener("click", () => renderJourneyEntry(journeyEntry - 1));
        const back = document.createElement("button");
        back.type = "button";
        back.className = "founder-journey-control founder-journey-return";
        back.textContent = "RETURN TO MENU";
        back.addEventListener("click", () => window.dispatchEvent(new CustomEvent("pog:close-room")));
        const next = document.createElement("button");
        next.type = "button";
        next.className = "founder-journey-control is-next";
        next.textContent = "NEXT →";
        next.disabled = journeyEntry === content.journey.length - 1;
        next.addEventListener("click", () => renderJourneyEntry(journeyEntry + 1));
        controls.append(previous, back, next);
        shell.append(header, media, copy, controls);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        if (focus) back.focus();
    };

    function renderJourneyMenu(focus = true) {
        activeExperience = "journey-menu";
        updateTopReturn();
        const shell = document.createElement("section");
        shell.className = "founder-journey-menu";
        const header = document.createElement("header");
        header.className = "founder-journey-menu-header";
        const kicker = document.createElement("p");
        kicker.className = "founder-journey-kicker";
        kicker.textContent = "SAVE HISTORY";
        const title = document.createElement("h2");
        title.id = "founder-journey-menu-title";
        title.textContent = "THE JOURNEY";
        header.append(kicker, title);
        const journeyList = document.createElement("div");
        journeyList.className = "founder-journey-list";
        journeyList.setAttribute("role", "menu");
        journeyList.setAttribute("aria-label", "Founder Journey memories");
        content.journey.forEach((memory, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "founder-journey-item";
            button.dataset.journeyEntry = memory.id;
            button.setAttribute("role", "menuitem");
            const number = document.createElement("span");
            number.className = "founder-journey-item-number";
            number.textContent = memory.number;
            const label = document.createElement("span");
            label.className = "founder-journey-item-label";
            label.textContent = memory.title;
            button.append(number, label);
            // A stationary pointer may already sit over the newly rendered list;
            // require deliberate movement before it changes the initial save slot.
            button.addEventListener("pointermove", () => selectJourney(index));
            button.addEventListener("click", () => renderJourneyEntry(index));
            journeyList.append(button);
        });
        const footer = document.createElement("footer");
        footer.className = "founder-journey-menu-footer";
        const back = document.createElement("button");
        back.type = "button";
        back.className = "founder-journey-menu-return";
        back.textContent = "← RETURN TO FOUNDER";
        back.addEventListener("click", () => showHub());
        const instructions = document.createElement("p");
        instructions.textContent = "↑ ↓ SELECT   ENTER OPEN   ESC RETURN";
        footer.append(back, instructions);
        shell.append(header, journeyList, footer);
        experience.replaceChildren(shell);
        experience.setAttribute("aria-labelledby", title.id);
        experience.hidden = false;
        selectJourney(journeySelected, focus);
    }

    const openJourney = () => {
        hub.hidden = true;
        journeySelected = 0;
        renderJourneyMenu();
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
            if (!Array.isArray(content.hub) || content.hub.length !== 5 || !Array.isArray(content.origin) || !Array.isArray(content.journey)) throw new Error("Founder Room is incomplete.");
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
        if (activeExperience === "origin" && event.key === "ArrowLeft" && originFrame > 0) {
            event.preventDefault();
            renderOrigin(originFrame - 1);
        } else if (activeExperience === "origin" && event.key === "ArrowRight" && originFrame < content.origin.length - 1) {
            event.preventDefault();
            renderOrigin(originFrame + 1);
        } else if (activeExperience === "journey-menu" && ["ArrowUp", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            selectJourney(journeySelected + (event.key === "ArrowDown" ? 1 : -1), true);
        } else if (activeExperience === "journey-menu" && event.key === "Enter") {
            event.preventDefault();
            renderJourneyEntry(journeySelected);
        } else if (activeExperience === "journey-entry" && event.key === "ArrowLeft" && journeyEntry > 0) {
            event.preventDefault();
            renderJourneyEntry(journeyEntry - 1);
        } else if (activeExperience === "journey-entry" && event.key === "ArrowRight" && journeyEntry < content.journey.length - 1) {
            event.preventDefault();
            renderJourneyEntry(journeyEntry + 1);
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
