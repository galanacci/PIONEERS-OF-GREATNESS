export function initPresentationLock() {
    const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const touchPointer = window.matchMedia("(pointer: coarse)");

    document.addEventListener("contextmenu", (event) => {
        if (desktopPointer.matches) event.preventDefault();
    });

    const blockMultiTouch = (event) => {
        if (touchPointer.matches && event.touches?.length > 1) event.preventDefault();
    };
    const blockGesture = (event) => {
        if (touchPointer.matches) event.preventDefault();
    };

    document.addEventListener("touchstart", blockMultiTouch, { passive: false });
    document.addEventListener("touchmove", blockMultiTouch, { passive: false });
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
}
