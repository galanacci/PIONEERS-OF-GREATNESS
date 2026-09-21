const params = new URLSearchParams(window.location.search);
const requestedEntry = params.get("entry");

const SOURCE_CONFIG = Object.freeze({
    galanacci: Object.freeze({
        source: "galanacci",
        bypassDesktop: true,
        destination: "menu",
        returnUrl: "https://galanacci.com/?entry=pog"
    })
});

const config = SOURCE_CONFIG[requestedEntry] || Object.freeze({
    source: "pog",
    bypassDesktop: false,
    destination: null,
    returnUrl: null
});

export const ENTRY_CONTEXT = Object.freeze({
    ...config,
    isExternal: config.source !== "pog"
});

if (ENTRY_CONTEXT.isExternal) {
    document.documentElement.classList.add("external-entry");
}

export function exitToEntrySource() {
    if (!ENTRY_CONTEXT.returnUrl) return false;

    // Closing an externally launched PoG.EXE returns to the desktop that
    // launched it. replace() avoids leaving the PoG app as an extra history
    // step between the visitor and GALANACCI.
    window.location.replace(ENTRY_CONTEXT.returnUrl);
    return true;
}
