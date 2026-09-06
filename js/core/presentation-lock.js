export function initPresentationLock() {
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    document.addEventListener("contextmenu", (event) => {
        if (desktopPointer.matches) event.preventDefault();
    });
}
