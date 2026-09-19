import { ENTRY_CONTEXT } from "./entry-context.js";
import { runPoGBoot } from "./boot.js";

let started = false;

export function initExternalEntry() {
    if (!ENTRY_CONTEXT.bypassDesktop || started) return;

    started = true;

    void runPoGBoot({
        source: ENTRY_CONTEXT.source,
        destination: ENTRY_CONTEXT.destination
    }).finally(() => {
        started = false;
    });
}
