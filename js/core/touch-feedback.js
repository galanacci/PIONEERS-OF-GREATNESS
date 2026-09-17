const TOUCH_QUERY = "(hover: none), (pointer: coarse)";
const PERSISTENT_STATE = ".is-selected, .is-current, .is-active, [aria-current='true'], [aria-expanded='true'], [aria-disabled='true']";

export function initTouchFeedback() {
    if (!window.matchMedia(TOUCH_QUERY).matches) return;

    const interactive = (target) => target instanceof Element
        ? target.closest("button, a[href], [role='button'], [role='menuitem'], [role='option']")
        : null;

    document.addEventListener("pointerdown", (event) => {
        if (event.pointerType && event.pointerType !== "touch") return;
        const control = interactive(event.target);
        if (!control || control.matches(PERSISTENT_STATE)) return;
        control.classList.remove("is-touch-resting");
        control.classList.add("is-touch-feedback");
        window.setTimeout(() => {
            control.classList.remove("is-touch-feedback");
            if (!control.matches(PERSISTENT_STATE)) control.classList.add("is-touch-resting");
        }, 170);
    }, { capture: true });
}
