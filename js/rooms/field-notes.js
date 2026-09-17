function formatDate(timestamp) {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(timestamp)).toUpperCase();
}

const thumbnailFor = (source) => source.replace(/\/[^/]+$/, "/thumb.webp");

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
    const coverSource = note.images[0];
    image.src = thumbnailFor(coverSource);
    image.addEventListener("error", () => {
        if (image.src.endsWith("/thumb.webp")) image.src = coverSource;
    }, { once: true });
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
    viewer.setAttribute("aria-label", "Behind The Scenes diary entry");
    const windowElement = document.createElement("div");
    windowElement.className = "field-note-viewer-window";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "room-return field-note-viewer-back";
    close.setAttribute("aria-label", "Return to Behind The Scenes entries");
    const header = document.createElement("header");
    // Uses the archive header wrapper so the return emblem retains its exact
    // room-level position and interaction treatment.
    header.className = "field-note-viewer-header archive-heading-right";
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
    details.append(caption, link);
    header.append(close, meta);
    const gallery = document.createElement("div");
    gallery.className = "field-note-viewer-gallery";
    gallery.setAttribute("aria-label", "Entry images. Select an image to enlarge it.");
    const galleryWrap = document.createElement("div");
    galleryWrap.className = "field-note-viewer-gallery-wrap";
    const textScrollHint = document.createElement("span");
    textScrollHint.className = "field-note-viewer-scroll-hint is-text";
    textScrollHint.setAttribute("aria-hidden", "true");
    const galleryScrollHint = document.createElement("span");
    galleryScrollHint.className = "field-note-viewer-scroll-hint is-gallery";
    galleryScrollHint.setAttribute("aria-hidden", "true");
    galleryWrap.append(gallery);
    // Keep the carousel cue as a sibling of the scrolling track: mobile
    // browsers composite overflow content above descendants of that track.
    windowElement.append(details, galleryWrap, textScrollHint, galleryScrollHint);
    viewer.append(header, windowElement);
    room.append(viewer);

    const lightbox = document.createElement("section");
    lightbox.className = "field-note-image-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.tabIndex = -1;
    const lightboxImage = document.createElement("img");
    lightboxImage.alt = "";
    lightbox.append(lightboxImage);
    room.append(lightbox);

    let activeNote = null;
    let lightboxIndex = 0;
    let lightboxPointer = null;
    let returnFocus = null;
    let returnAnimationTimer;
    const updateScrollHints = () => {
        const textScrollable = details.scrollHeight > details.clientHeight + 2;
        textScrollHint.hidden = !textScrollable;
        if (textScrollable) {
            textScrollHint.dataset.direction = details.scrollTop + details.clientHeight >= details.scrollHeight - 2 ? "up" : "down";
        }
        const galleryScrollable = gallery.scrollWidth > gallery.clientWidth + 2;
        galleryScrollHint.hidden = !galleryScrollable;
        if (galleryScrollable) {
            const direction = gallery.scrollLeft + gallery.clientWidth >= gallery.scrollWidth - 2 ? "left" : "right";
            galleryScrollHint.dataset.direction = direction;
            galleryWrap.dataset.scrollDirection = direction;
            // The cue is a sibling overlay. Measure against the thumbnail
            // frame itself so it remains exactly vertically centred.
            galleryScrollHint.style.top = `${galleryWrap.offsetTop + galleryWrap.clientHeight / 2}px`;
        } else {
            delete galleryWrap.dataset.scrollDirection;
            galleryScrollHint.style.removeProperty("top");
        }
    };
    const closeLightbox = () => {
        lightbox.hidden = true;
        lightbox.classList.remove("is-dragging");
        lightboxPointer = null;
    };
    const showLightboxImage = (index) => {
        if (!activeNote?.images?.length) return;
        const imageCount = activeNote.images.length;
        lightboxIndex = (index + imageCount) % imageCount;
        lightboxImage.src = activeNote.images[lightboxIndex];
        lightboxImage.alt = `${activeNote.entry}, image ${lightboxIndex + 1} of ${imageCount}`;
        lightbox.setAttribute("aria-label", `Enlarged diary image ${lightboxIndex + 1} of ${imageCount}. Swipe or drag left and right to navigate. Tap or click to close.`);
        [-1, 1].forEach((offset) => {
            const preload = new Image();
            preload.src = activeNote.images[(lightboxIndex + offset + imageCount) % imageCount];
        });
    };
    const navigateLightbox = (direction) => showLightboxImage(lightboxIndex + direction);
    const openLightbox = (index) => {
        showLightboxImage(index);
        lightbox.hidden = false;
        lightbox.focus({ preventScroll: true });
    };
    const closeViewer = () => {
        if (viewer.hidden) return;
        viewer.hidden = true;
        closeLightbox();
        room.classList.remove("is-entry-open");
        returnFocus?.focus({ preventScroll: true });
    };
    const animateReturn = () => {
        window.clearTimeout(returnAnimationTimer);
        close.classList.add("is-emblem-pressed");
        returnAnimationTimer = window.setTimeout(() => close.classList.remove("is-emblem-pressed"), 260);
    };
    const returnToArchive = () => {
        animateReturn();
        // Give the emblem rotation one deliberate beat before the entry exits.
        window.setTimeout(closeViewer, 180);
    };
    const openViewer = (note, trigger) => {
        activeNote = note;
        returnFocus = trigger;
        entry.textContent = note.entry;
        date.dateTime = note.timestamp;
        date.textContent = formatDate(note.timestamp);
        caption.textContent = note.caption || "UNTITLED ENTRY";
        link.href = note.instagramUrl;
        gallery.replaceChildren(...note.images.map((src, index) => {
            const imageButton = document.createElement("button");
            imageButton.type = "button";
            imageButton.className = "field-note-viewer-gallery-image";
            imageButton.setAttribute("aria-label", `Enlarge image ${index + 1} of ${note.images.length}`);
            const galleryImage = document.createElement("img");
            galleryImage.src = src;
            galleryImage.alt = `${note.entry}, image ${index + 1} of ${note.images.length}`;
            galleryImage.loading = index > 2 ? "lazy" : "eager";
            galleryImage.decoding = "async";
            imageButton.append(galleryImage);
            imageButton.addEventListener("click", () => openLightbox(index));
            return imageButton;
        }));
        viewer.hidden = false;
        room.classList.add("is-entry-open");
        details.scrollTop = 0;
        gallery.scrollLeft = 0;
        requestAnimationFrame(() => {
            updateScrollHints();
            // Mobile browsers can settle horizontal flex dimensions one paint later.
            requestAnimationFrame(updateScrollHints);
        });
        close.focus({ preventScroll: true });
    };
    details.addEventListener("scroll", updateScrollHints, { passive: true });
    gallery.addEventListener("scroll", updateScrollHints, { passive: true });
    window.addEventListener("resize", updateScrollHints);
    new ResizeObserver(updateScrollHints).observe(gallery);
    new ResizeObserver(updateScrollHints).observe(details);
    close.addEventListener("pointerdown", animateReturn);
    close.addEventListener("pointercancel", () => close.classList.remove("is-emblem-pressed"));
    close.addEventListener("click", returnToArchive);
    lightbox.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button > 0) return;
        lightboxPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        lightbox.classList.add("is-dragging");
        try { lightbox.setPointerCapture?.(event.pointerId); } catch { /* Synthetic pointers may not be capturable. */ }
    });
    lightbox.addEventListener("pointerup", (event) => {
        if (!lightboxPointer || lightboxPointer.id !== event.pointerId) return;
        const deltaX = event.clientX - lightboxPointer.x;
        const deltaY = event.clientY - lightboxPointer.y;
        const horizontalSwipe = Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
        const tap = Math.hypot(deltaX, deltaY) < 10;
        try { lightbox.releasePointerCapture?.(event.pointerId); } catch { /* The pointer may already be released. */ }
        lightbox.classList.remove("is-dragging");
        lightboxPointer = null;
        if (horizontalSwipe) navigateLightbox(deltaX < 0 ? 1 : -1);
        else if (tap) closeLightbox();
    });
    lightbox.addEventListener("pointercancel", () => {
        lightbox.classList.remove("is-dragging");
        lightboxPointer = null;
    });
    viewer.addEventListener("pointerdown", (event) => {
        if (event.target === viewer) closeViewer();
    });
    viewer.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeViewer();
        }
    });
    lightbox.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            navigateLightbox(event.key === "ArrowRight" ? 1 : -1);
        } else if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeLightbox();
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
            const chapter = document.createElement("div");
            chapter.className = "field-notes-chapter";
            const notes = [...payload.notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            chapter.replaceChildren(...notes.map((note) => createNote(note, viewer.open)));
            list.replaceChildren(chapter);
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
