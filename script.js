const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjvkTDouoDXWbSvmKCsznmiRc51S5uP9BDBzBJ8CnEaHGTDFPODgH39ZJWg2XtSgQdUg/exec";

function startScrolling() {

    const placeholder = document.getElementById("animated-placeholder");

    if (!placeholder) return;

    const text = "ENTER EMAIL TO JOIN THE WAITLIST...";

    const container = document.createElement("div");
    container.className = "scrolling-text-container";

    const span1 = document.createElement("span");
    span1.className = "scrolling-text";
    span1.textContent = text;

    const span2 = document.createElement("span");
    span2.className = "scrolling-text";
    span2.textContent = text;

    container.appendChild(span1);
    container.appendChild(span2);

    placeholder.innerHTML = "";
    placeholder.appendChild(container);

}

document.addEventListener("DOMContentLoaded", () => {

    startScrolling();

    const form = document.getElementById("email-form");
    const emailInput = document.getElementById("email");
    const status = document.getElementById("status");
    const placeholder = document.getElementById("animated-placeholder");

    emailInput.addEventListener("focus", () => {

        placeholder.style.display = "none";

    });

    emailInput.addEventListener("blur", () => {

        if(emailInput.value === ""){

            placeholder.style.display = "block";

        }

    });

    form.addEventListener("submit", async function(e){

        e.preventDefault();

        const email = emailInput.value.trim();

        if(email === ""){

            status.textContent = "Please enter an email.";

            return;

        }

        status.textContent = "Joining...";

        const formData = new FormData();

        formData.append("email", email);

        try{

            const response = await fetch(SCRIPT_URL,{

                method:"POST",

                body:formData

            });

            const data = await response.json();

switch (data.status) {

    case "success":

        status.textContent = "Welcome to the movement.";
        status.style.color = "#7dff7d";

        emailInput.value = "";
        placeholder.style.display = "block";

        break;

    case "duplicate":

        status.textContent = "Already signed up.";
        status.style.color = "#ffbf47";

        break;

    default:

        status.textContent = "Something went wrong.";
        status.style.color = "#ff6b6b";

}

        }

        catch(err){

            console.error(err);

            status.textContent = "Unable to connect.";

        }

    });

});
// Fullscreen menu overlay controls. Kept separate from the waitlist logic.
document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.querySelector(".menu-toggle");
    const menuOverlay = document.getElementById("menu-overlay");
    const menuPanel = menuOverlay?.querySelector(".menu-panel");
    const menuList = menuPanel?.querySelector(".menu-list");
    const menuAudioButton = menuPanel?.querySelector(".audio-toggle");
    const menuItems = Array.from(menuPanel?.querySelectorAll(".menu-item") ?? []);
    const pageRegions = document.querySelectorAll("nav, #container, .container, .copyright");
    let selectedIndex = Math.max(0, menuItems.findIndex((item) => item.classList.contains("is-selected")));

    if (!menuButton || !menuOverlay || !menuPanel || !menuList || menuItems.length === 0) return;

    function updateSelection(nextIndex) {

        selectedIndex = (nextIndex + menuItems.length) % menuItems.length;

        menuItems.forEach((item, index) => {

            const isSelected = index === selectedIndex;
            item.classList.toggle("is-selected", isSelected);
            item.classList.remove("is-activated");
            item.tabIndex = isSelected ? 0 : -1;
            isSelected ? item.setAttribute("aria-current", "true") : item.removeAttribute("aria-current");

        });

    }

    updateSelection(selectedIndex);

    function openMenu() {

        menuOverlay.classList.add("is-open");
        menuOverlay.setAttribute("aria-hidden", "false");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Close menu");
        pageRegions.forEach((region) => { region.inert = true; });
        menuList.classList.remove("is-keyboard-nav");
        updateSelection(selectedIndex);
        menuItems[selectedIndex].focus();

    }

    function closeMenu() {

        menuOverlay.classList.remove("is-open");
        menuOverlay.setAttribute("aria-hidden", "true");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open menu");
        pageRegions.forEach((region) => { region.inert = false; });
        menuButton.focus();

    }

    menuButton.addEventListener("click", () => {

        const isOpen = menuOverlay.classList.contains("is-open");
        isOpen ? closeMenu() : openMenu();

    });

    window.addEventListener("pog:return-to-menu", openMenu);

    menuPanel.addEventListener("click", (event) => {

        const menuItem = event.target.closest(".menu-item");

        if (!menuItem) return;

        updateSelection(menuItems.indexOf(menuItem));

        if (menuItem.getAttribute("aria-disabled") === "true") return;

        menuItem.classList.add("is-activated");
        const action = menuItem.dataset.menuAction;

        if (action === "waitlist") {

            closeMenu();
            document.getElementById("email")?.focus();

        } else if (action === "external") {

            const destination = menuItem.dataset.menuUrl;
            if (destination) window.open(destination, "_blank", "noopener,noreferrer");

        } else if (action === "room") {

            const roomId = menuItem.dataset.roomTarget;
            closeMenu();
            window.dispatchEvent(new CustomEvent("pog:open-room", { detail: { roomId } }));

        } else if (action === "exit") {

            closeMenu();

        }

    });

    menuPanel.addEventListener("pointerover", (event) => {

        menuList.classList.remove("is-keyboard-nav");

        const menuItem = event.target.closest(".menu-item");

        if (!menuItem) return;

        updateSelection(menuItems.indexOf(menuItem));

    });

    document.addEventListener("keydown", (event) => {

        if (!menuOverlay.classList.contains("is-open")) return;

        if (["ArrowUp", "ArrowDown"].includes(event.key)) {
            menuList.classList.add("is-keyboard-nav");
        }

        if (event.key === "Tab") {

            event.preventDefault();

            if (document.activeElement === menuAudioButton) {
                menuList.classList.add("is-keyboard-nav");
                menuItems[selectedIndex].focus();
            } else {
                menuList.classList.remove("is-keyboard-nav");
                menuAudioButton.focus();
            }

            return;

        }

        if (event.key === "ArrowUp") {

            event.preventDefault();
            updateSelection(selectedIndex - 1);
            menuItems[selectedIndex].focus();

        } else if (event.key === "ArrowDown") {

            event.preventDefault();
            updateSelection(selectedIndex + 1);
            menuItems[selectedIndex].focus();

        } else if (event.key === "Enter") {

            event.preventDefault();
            menuItems[selectedIndex].click();

        } else if (event.key === "Escape") {

            event.preventDefault();
            closeMenu();

        }

    });

});

// Background audio starts muted so autoplay remains reliable across browsers.
document.addEventListener("DOMContentLoaded", () => {

    const backgroundVideo = document.querySelector(".background-video");
    const audioButton = document.querySelector(".audio-toggle");
    const audioLabel = audioButton?.querySelector(".audio-label");

    if (!backgroundVideo || !audioButton || !audioLabel) return;

    function updateAudioControl() {

        const soundIsOn = !backgroundVideo.muted;
        audioButton.setAttribute("aria-pressed", String(soundIsOn));
        audioButton.setAttribute("aria-label", soundIsOn ? "Mute background audio" : "Turn background audio on");
        audioLabel.textContent = soundIsOn ? "SOUND ON" : "SOUND OFF";

    }

    backgroundVideo.muted = true;
    updateAudioControl();

    audioButton.addEventListener("click", async () => {

        backgroundVideo.muted = !backgroundVideo.muted;

        if (backgroundVideo.paused) {

            try {
                await backgroundVideo.play();
            } catch (error) {
                console.error("Background video could not resume.", error);
            }

        }

        updateAudioControl();

    });

    backgroundVideo.addEventListener("volumechange", updateAudioControl);

});

// Reusable PoG World room controller. Independent from waitlist and media logic.
document.addEventListener("DOMContentLoaded", () => {

    const rooms = Array.from(document.querySelectorAll(".world-room"));
    const roomTransition = document.getElementById("room-transition");
    const backgroundRegions = document.querySelectorAll("nav, #container, .container, .copyright, #menu-overlay");
    let activeRoom = null;
    let transitionTimers = [];

    if (rooms.length === 0 || !roomTransition) return;

    function clearTransitionTimers() {

        transitionTimers.forEach((timer) => window.clearTimeout(timer));
        transitionTimers = [];

    }

    function setBackgroundInert(isInert) {

        backgroundRegions.forEach((region) => { region.inert = isInert; });

    }

    function showTransition() {

        roomTransition.classList.add("is-active");
        roomTransition.setAttribute("aria-hidden", "false");

    }

    function hideTransition() {

        roomTransition.classList.remove("is-active");
        roomTransition.setAttribute("aria-hidden", "true");

    }

    function openRoom(roomId) {

        const nextRoom = rooms.find((room) => room.id === roomId);
        if (!nextRoom) return;

        clearTransitionTimers();
        setBackgroundInert(true);
        showTransition();

        transitionTimers.push(window.setTimeout(() => {

            rooms.forEach((room) => {
                const isActive = room === nextRoom;
                room.classList.toggle("is-open", isActive);
                room.setAttribute("aria-hidden", String(!isActive));
            });

            activeRoom = nextRoom;
            activeRoom.querySelector("[data-room-close]")?.focus();

        }, 320));

        transitionTimers.push(window.setTimeout(hideTransition, 520));

    }

    function returnToMenu() {

        if (!activeRoom) return;

        clearTransitionTimers();
        showTransition();

        transitionTimers.push(window.setTimeout(() => {

            activeRoom.classList.remove("is-open");
            activeRoom.setAttribute("aria-hidden", "true");
            activeRoom = null;
            setBackgroundInert(false);
            window.dispatchEvent(new CustomEvent("pog:return-to-menu"));

        }, 240));

        transitionTimers.push(window.setTimeout(hideTransition, 440));

    }

    window.addEventListener("pog:open-room", (event) => {

        openRoom(event.detail?.roomId);

    });

    rooms.forEach((room) => {

        room.querySelector("[data-room-close]")?.addEventListener("click", returnToMenu);

    });

    document.addEventListener("keydown", (event) => {

        if (!activeRoom) return;

        if (event.key === "Escape") {

            event.preventDefault();
            returnToMenu();
            return;

        }

        if (event.key !== "Tab") return;

        const focusable = Array.from(activeRoom.querySelectorAll("button:not([disabled]), a[href]"));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }

    });

});

// Field Notes renderer. Content is generated by the private Instagram sync workflow.
document.addEventListener("DOMContentLoaded", () => {

    const list = document.getElementById("field-notes-list");

    if (!list) return;

    function showState(message) {

        const state = document.createElement("p");
        state.className = "field-notes-state";
        state.textContent = message;
        list.replaceChildren(state);

    }

    function formatDate(timestamp) {

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date(timestamp)).toUpperCase();

    }

    function createFieldNote(note) {

        const article = document.createElement("article");
        article.className = "field-note";

        const media = document.createElement("div");
        media.className = "field-note-media";

        const image = document.createElement("img");
        image.src = note.images[0];
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        media.append(image);

        if (note.images.length > 1) {
            const count = document.createElement("span");
            count.className = "field-note-count";
            count.textContent = `1 / ${note.images.length}`;
            count.setAttribute("aria-label", `${note.images.length} images`);
            media.append(count);
        }

        const meta = document.createElement("div");
        meta.className = "field-note-meta";

        const entry = document.createElement("span");
        entry.textContent = note.entry;

        const date = document.createElement("time");
        date.dateTime = note.timestamp;
        date.textContent = formatDate(note.timestamp);
        meta.append(entry, date);

        const caption = document.createElement("p");
        caption.className = "field-note-caption";
        caption.textContent = note.caption || "UNTITLED FIELD NOTE";

        const link = document.createElement("a");
        link.className = "field-note-link";
        link.href = note.instagramUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "OPEN ENTRY";

        article.append(media, meta, caption, link);
        return article;

    }

    async function loadFieldNotes() {

        try {
            const response = await fetch("data/field-notes.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Field Notes request failed: ${response.status}`);

            const payload = await response.json();
            const notes = Array.isArray(payload.notes) ? payload.notes : [];

            if (notes.length === 0) {
                showState("ARCHIVE SYNC PENDING");
                return;
            }

            list.replaceChildren(...notes.map(createFieldNote));

        } catch (error) {
            console.error("Field Notes could not be loaded.", error);
            showState("ARCHIVE TEMPORARILY UNAVAILABLE");
        }

    }

    loadFieldNotes();

});

// UNCUT Documentary renderer. The public YouTube playlist remains the source of truth.
document.addEventListener("DOMContentLoaded", () => {

    const feature = document.getElementById("documentary-feature");
    const list = document.getElementById("documentary-list");

    if (!feature || !list) return;

    let episodes = [];
    let selectedIndex = 0;

    function showState(message) {

        const state = document.createElement("p");
        state.className = "documentary-state";
        state.textContent = message;
        feature.replaceChildren(state);
        list.replaceChildren();

    }

    function formatDate(timestamp) {

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(new Date(timestamp)).toUpperCase();

    }

    function selectEpisode(nextIndex, shouldFocus = false) {

        selectedIndex = (nextIndex + episodes.length) % episodes.length;
        const episode = episodes[selectedIndex];

        const player = document.createElement("iframe");
        player.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(episode.videoId)}?rel=0`;
        player.title = `UNCUT — ${episode.title}`;
        player.loading = "lazy";
        player.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        player.referrerPolicy = "strict-origin-when-cross-origin";
        player.allowFullscreen = true;

        const frame = document.createElement("div");
        frame.className = "documentary-player";
        frame.append(player);

        const meta = document.createElement("div");
        meta.className = "documentary-feature-meta";

        const number = document.createElement("span");
        number.textContent = episode.episode;

        const date = document.createElement("time");
        date.dateTime = episode.publishedAt;
        date.textContent = formatDate(episode.publishedAt);
        meta.append(number, date);

        const title = document.createElement("h2");
        title.textContent = episode.title;

        feature.replaceChildren(frame, meta, title);

        Array.from(list.children).forEach((item, index) => {
            const isSelected = index === selectedIndex;
            item.classList.toggle("is-current", isSelected);
            item.querySelector("button")?.setAttribute("aria-pressed", String(isSelected));
            const status = item.querySelector(".documentary-episode-status");
            if (status) status.textContent = isSelected ? "NOW SHOWING" : "SELECT";
        });

        if (shouldFocus) list.children[selectedIndex]?.querySelector("button")?.focus();

    }

    function createEpisodeItem(episode, index) {

        const item = document.createElement("li");
        item.className = "documentary-episode";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "documentary-episode-button";
        button.setAttribute("aria-pressed", "false");

        const number = document.createElement("span");
        number.className = "documentary-episode-number";
        number.textContent = episode.episode;

        const title = document.createElement("span");
        title.className = "documentary-episode-title";
        title.textContent = episode.title;

        const status = document.createElement("span");
        status.className = "documentary-episode-status";
        status.textContent = "SELECT";

        button.append(number, title, status);
        button.addEventListener("click", () => selectEpisode(index));
        button.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            selectEpisode(selectedIndex + (event.key === "ArrowDown" ? 1 : -1), true);
        });
        item.append(button);
        return item;

    }

    async function loadDocumentary() {

        try {
            const response = await fetch("data/documentary.json", { cache: "no-cache" });
            if (!response.ok) throw new Error(`Documentary request failed: ${response.status}`);

            const payload = await response.json();
            episodes = Array.isArray(payload.episodes) ? payload.episodes : [];

            if (episodes.length === 0) {
                showState("UNCUT ARCHIVE SYNC PENDING");
                return;
            }

            list.replaceChildren(...episodes.map(createEpisodeItem));
            selectEpisode(0);

        } catch (error) {
            console.error("UNCUT archive could not be loaded.", error);
            showState("SCREENING ROOM TEMPORARILY UNAVAILABLE");
        }

    }

    loadDocumentary();

});
