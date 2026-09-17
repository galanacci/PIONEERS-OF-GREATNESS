import { COLLECTIONS_PREVIEW_ENABLED, isKnownRoom } from "../room-registry.js";

export function initMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const overlay = document.getElementById("menu-overlay");
    const panel = overlay?.querySelector(".menu-panel");
    const list = panel?.querySelector(".menu-list");
    const waitlist = panel?.querySelector(".menu-waitlist");
    const audio = panel?.querySelector(".audio-toggle");
    const backgroundVideo = overlay?.querySelector(".background-video");
    const items = [...(panel?.querySelectorAll(".menu-item") || [])];
    const collections = panel?.querySelector('[data-preview-room="collections-room"]');
    const form = document.getElementById("email-form");
    const status = document.getElementById("status");
    const waitlistHome = form?.parentElement;
    const regions = document.querySelectorAll(".menu-infrastructure, .copyright, #pog-desktop");
    if (!toggle || !overlay || !panel || !list || !waitlist || !form || !status || !waitlistHome || !items.length) return;
    if (COLLECTIONS_PREVIEW_ENABLED && collections) {
        collections.dataset.menuAction = "room";
        collections.dataset.roomTarget = "collections-room";
        collections.removeAttribute("aria-disabled");
    }
    let selected = Math.max(0, items.findIndex((item) => item.classList.contains("is-selected")));
    let waitlistOpen = false;
    let pageWaitlist = null;
    const sound = (name) => window.dispatchEvent(new CustomEvent("pog:menu-sound", { detail: { name } }));
    const select = (index, withSound = false) => {
        const next = (index + items.length) % items.length;
        if (withSound && next !== selected) sound("select");
        selected = next;
        items.forEach((item, i) => {
            const active = i === selected;
            item.classList.toggle("is-selected", active);
            item.classList.remove("is-activated");
            item.tabIndex = active ? 0 : -1;
            item.toggleAttribute("aria-current", active);
        });
    };
    const open = () => {
        overlay.classList.add("is-open"); overlay.setAttribute("aria-hidden", "false");
        backgroundVideo?.play().catch(() => {});
        toggle.setAttribute("aria-expanded", "true");
        regions.forEach((region) => { region.inert = true; });
        list.classList.remove("is-keyboard-nav"); select(selected); items[selected].focus();
        window.dispatchEvent(new CustomEvent("pog:menu-opened"));
    };
    const hideWaitlist = (focusMenu = true) => {
        if (!waitlistOpen) return;
        waitlistOpen = false;
        overlay.classList.remove("is-waitlist-open");
        waitlistHome.append(form, status);
        waitlist.hidden = true;
        list.inert = false;
        window.dispatchEvent(new CustomEvent("pog:waitlist-dismissed"));
        if(pageWaitlist){
            const saved=pageWaitlist;pageWaitlist=null;
            overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');
            backgroundVideo?.pause();
            overlay.style.removeProperty('z-index');overlay.inert=saved.overlayInert;
            saved.room.inert=saved.roomInert;
            saved.focus?.focus({preventScroll:true});
            return;
        }
        if (focusMenu) items[selected].focus();
    };
    const showWaitlist = () => {
        waitlistOpen = true;
        overlay.classList.add("is-waitlist-open");
        waitlist.hidden = false;
        waitlist.append(form, status);
        list.inert = true;
        window.dispatchEvent(new CustomEvent("pog:waitlist-requested", { detail: { source: "menu" } }));
        document.getElementById("email")?.focus();
    };
    const close = (focusToggle = true, keepAmbience = false) => {
        hideWaitlist(false);
        overlay.classList.remove("is-open"); overlay.setAttribute("aria-hidden", "true");
        backgroundVideo?.pause();
        toggle.setAttribute("aria-expanded", "false");
        regions.forEach((region) => { region.inert = false; });
        if (!keepAmbience) window.dispatchEvent(new CustomEvent("pog:ambience-stop"));
        if (focusToggle) toggle.focus();
    };
    const activate = (item) => {
        select(items.indexOf(item));
        if (item.getAttribute("aria-disabled") === "true") {
            sound("locked");
            return;
        }
        sound(item.dataset.menuAction === "exit" ? "shutdown" : "confirm");
        item.classList.add("is-activated");
        if (item.dataset.menuAction === "waitlist") {
            showWaitlist();
        }
        else if (item.dataset.menuAction === "founder") {
            close(false, true);
            window.dispatchEvent(new CustomEvent("pog:open-room", { detail: { roomId: "founder-room" } }));
        }
        else if (item.dataset.menuAction === "room" && isKnownRoom(item.dataset.roomTarget)) {
            close(false, true);
            window.dispatchEvent(new CustomEvent("pog:open-room", { detail: { roomId: item.dataset.roomTarget } }));
        } else if (item.dataset.menuAction === "exit") close();
    };
    select(selected);
    window.addEventListener('pog:page-waitlist',event=>{
        const room=document.querySelector('.world-room.is-open');
        if(!room||pageWaitlist)return;
        pageWaitlist={room,roomInert:room.inert,overlayInert:overlay.inert,focus:event.detail?.returnFocus};
        room.inert=true;overlay.inert=false;
        overlay.style.zIndex='2100';overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');
        showWaitlist();
    });
    toggle.addEventListener("click", () => {
        if (!overlay.classList.contains("is-open")) {
            window.dispatchEvent(new CustomEvent("pog:start-requested"));
        }
    });
    window.addEventListener("pog:opening-complete", open);
    window.addEventListener("pog:return-to-menu", open);
    window.addEventListener("pog:waitlist-complete", () => hideWaitlist());
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) backgroundVideo?.pause();
        else if (overlay.classList.contains("is-open")) backgroundVideo?.play().catch(() => {});
    });
    overlay.addEventListener("click", (event) => {
        if (!waitlistOpen || event.target.closest("#email-form, .audio-toggle, .menu-item")) return;
        hideWaitlist();
    });
    panel.addEventListener("click", (event) => { const item = event.target.closest(".menu-item"); if (item) activate(item); });
    panel.addEventListener("pointerover", (event) => {
        if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        list.classList.remove("is-keyboard-nav");
        const item = event.target.closest(".menu-item");
        if (item) select(items.indexOf(item), true);
    });
    panel.addEventListener("pointerdown", (event) => {
        if (event.pointerType !== "touch") return;
        list.classList.remove("is-keyboard-nav");
        const item = event.target.closest(".menu-item");
        if (item) select(items.indexOf(item), true);
    });
    document.addEventListener("keydown", (event) => {
        if (!overlay.classList.contains("is-open")) return;
        if (waitlistOpen) {
            if (event.key === "Escape") {
                event.preventDefault();
                hideWaitlist();
            }
            return;
        }
        if (["ArrowUp", "ArrowDown"].includes(event.key)) list.classList.add("is-keyboard-nav");
        if (event.key === "Tab") {
            event.preventDefault();
            if (document.activeElement === audio) { list.classList.add("is-keyboard-nav"); items[selected].focus(); }
            else { list.classList.remove("is-keyboard-nav"); audio?.focus(); }
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault(); select(selected + (event.key === "ArrowDown" ? 1 : -1), true); items[selected].focus();
        } else if (event.key === "Enter") { event.preventDefault(); activate(items[selected]); }
        else if (event.key === "Escape") { event.preventDefault(); close(); }
    });
}
