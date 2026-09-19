import { test, expect } from "@playwright/test";

test("selects an appropriate launch asset and performance tier for the device", async ({ page }) => {
    await page.goto("/");
    const loadingVideo = page.locator("#pog-launch-loading-video");
    await expect(loadingVideo).not.toHaveAttribute("src", /.+/);
    await expect(loadingVideo).toHaveAttribute("preload", "none");
    await expect(loadingVideo).toHaveAttribute("data-mobile-src", /pog-launch-loading-mobile-optimized\.mp4$/);
    await expect(loadingVideo).toHaveAttribute("data-desktop-src", /pog-launch-loading-desktop-optimized\.mp4$/);
    await expect(page.locator("html")).toHaveAttribute("data-performance-tier", /^(low|balanced|high)$/);
});

test("loading preview opens the main menu after the launch screen", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("pog:founder-introduction:v2"));
    await page.goto("/?preview=loading");
    await expect(page.locator("#pog-launch-loading")).toBeVisible({ timeout: 2500 });
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 5000 });
    await expect(page.locator("#founder-introduction")).not.toHaveClass(/is-open/);
    await expect(page.locator("#pog-launch-loading")).toBeHidden({ timeout: 2500 });
    await page.getByRole("menuitem", { name: "EXIT" }).click();
    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-open/);
    await expect(page.locator("#pog-desktop")).toHaveCSS("visibility", "visible");
});

test("the launch instruction matches the input mode and is remembered after use", async ({ page }) => {
    await page.goto("/");
    const isTouch = page.viewportSize()?.width <= 680;
    const hint = page.locator("#pog-exe-hint");
    const shortcut = page.locator("#pog-exe-shortcut");
    await expect(hint).toHaveText(isTouch ? "TAP TO OPEN" : "DOUBLE CLICK TO OPEN");
    await expect(shortcut).toHaveAttribute("aria-label", isTouch ? /Tap to enter/ : /Double click or press Enter/);
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    if (isTouch) await shortcut.tap();
    else await shortcut.dblclick();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("pog:desktop-shortcut-hint:v1")), { timeout: 3000 })
        .toBe("dismissed");
    await expect(hint).not.toHaveClass(/is-visible/);
    await page.reload();
    await expect(hint).not.toHaveClass(/is-visible/);
});

test("the main menu fades in but hard-cuts when exiting", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    const menu = page.locator("#menu-overlay");
    await expect(menu).toHaveClass(/is-open/);
    await expect(menu).toHaveCSS("transition-duration", "0.22s");
    await page.getByRole("menuitem", { name: "EXIT" }).click();
    await expect(menu).not.toHaveClass(/is-open/);
    await expect(menu).not.toHaveClass(/is-opening/);
    await expect(menu).toHaveCSS("transition-duration", "0s");
    await expect(menu).toHaveCSS("opacity", "0");
    await expect(menu).toHaveCSS("visibility", "hidden");
});

test("PoG.EXE behaves like a persistent desktop shortcut", async ({ page }) => {
    test.skip(page.viewportSize()?.width <= 680, "Mobile uses single-tap launch.");
    await page.goto("/");
    const shortcut = page.locator("#pog-exe-shortcut");
    await expect(shortcut).toBeVisible();
    await expect(shortcut).toHaveText("PoG.EXE");
    await shortcut.hover();
    await expect(shortcut).toHaveCSS("color", "rgb(255, 255, 255)");
    await shortcut.click();
    await expect(shortcut).toHaveClass(/is-selected/);

    const before = await shortcut.evaluate((element) => element.style.transform);
    await shortcut.dragTo(page.locator("#pog-desktop"), { targetPosition: { x: 220, y: 240 } });
    const after = await shortcut.evaluate((element) => element.style.transform);
    expect(after).not.toBe(before);
    await page.reload();
    await expect(shortcut).toHaveCSS("transform", /matrix/);
});

test("double clicking PoG.EXE starts the returning entry path", async ({ page }) => {
    test.skip(page.viewportSize()?.width <= 680, "Touch launch uses a single tap.");
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    const progress = page.locator("#pog-launch-progress");
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    const progressAtStart = page.evaluate(() => new Promise((resolve) => {
        window.addEventListener("pog:start-requested", () => {
            resolve(document.getElementById("pog-launch-progress")?.getAttribute("aria-valuenow"));
        }, { once: true });
    }));
    const loadingStates = page.evaluate(() => new Promise((resolve) => {
        const loadingElement = document.getElementById("pog-launch-loading");
        const states = { visible: !loadingElement.hidden, blackout: loadingElement.classList.contains("is-blackout") };
        const observer = new MutationObserver(() => {
            states.visible ||= !loadingElement.hidden;
            states.blackout ||= loadingElement.classList.contains("is-blackout");
            if (!states.visible || !states.blackout) return;
            observer.disconnect();
            resolve(states);
        });
        observer.observe(loadingElement, { attributes: true, attributeFilter: ["class", "hidden"] });
        setTimeout(() => { observer.disconnect(); resolve(states); }, 5000);
    }));
    await page.locator("#pog-exe-shortcut").dblclick();
    const loading = page.locator("#pog-launch-loading");
    expect(await loadingStates).toEqual({ visible: true, blackout: true });
    expect(await progressAtStart).toBe("100");
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(loading).toBeHidden({ timeout: 2500 });
});

test("a mobile tap selects PoG.EXE briefly then launches", async ({ page }) => {
    test.skip(page.viewportSize()?.width > 680, "Touch-launch behavior is mobile only.");
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    const shortcut = page.locator("#pog-exe-shortcut");
    const sawSelected = page.evaluate(() => new Promise((resolve) => {
        const shortcutElement = document.getElementById("pog-exe-shortcut");
        if (shortcutElement?.classList.contains("is-selected")) return resolve(true);
        const observer = new MutationObserver(() => {
            if (!shortcutElement?.classList.contains("is-selected")) return;
            observer.disconnect();
            resolve(true);
        });
        observer.observe(shortcutElement, { attributes: true, attributeFilter: ["class"] });
        setTimeout(() => { observer.disconnect(); resolve(false); }, 1000);
    }));
    await shortcut.tap();
    expect(await sawSelected).toBe(true);
    await expect(page.locator("#pog-launch-loading")).toBeVisible();
    await expect(page.locator("#pog-launch-loading-video")).toHaveAttribute("src", /pog-launch-loading-mobile-optimized\.mp4$/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 5000 });
});

test("the narrated poem retains every word already spoken", async ({ page }) => {
    test.skip(page.viewportSize()?.width <= 680, "Desktop timing diagnostic.");
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("pog:founder-introduction:v2"));
    await page.reload();
    await page.locator("#pog-exe-shortcut").dblclick();
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector("#founder-poem-narration")?.currentTime >= 5.8, null, { timeout: 15000 });
    const state = await page.locator("#founder-introduction-copy .is-active").evaluate((element) => ({
        text: element.textContent,
        words: [...element.querySelectorAll(".founder-narrated-word")].map((word) => ({
            text: word.textContent,
            color: getComputedStyle(word).color,
            opacity: getComputedStyle(word).opacity
        }))
    }));
    expect(state.words).toHaveLength(22);
    expect(state.words.slice(0, 19).every((word) => word.opacity === "1" && word.color !== "rgba(0, 0, 0, 0)")).toBe(true);
});

test("the first-visit poem reveals a clean delayed skip path", async ({ page }) => {
    test.skip(page.viewportSize()?.width <= 680, "One desktop timing check covers the shared poem controller.");
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("pog:founder-introduction:v2"));
    await page.reload();
    await page.locator("#pog-exe-shortcut").dblclick();
    const introduction = page.locator("#founder-introduction");
    const skip = page.locator("#founder-introduction-skip");
    await expect(introduction).toHaveClass(/is-open/, { timeout: 5000 });
    await expect(skip).toBeHidden();
    await expect(skip).toBeVisible({ timeout: 8000 });
    const skipBox = await skip.boundingBox();
    expect(skipBox.width).toBeGreaterThanOrEqual(44);
    expect(skipBox.height).toBeGreaterThanOrEqual(44);
    await skip.click();
    await expect(introduction).not.toHaveClass(/is-open/, { timeout: 3000 });
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#pog-launch-loading")).toBeHidden();
    await expect.poll(() => page.locator("#founder-poem-narration").evaluate((audio) => audio.paused)).toBe(true);
});
