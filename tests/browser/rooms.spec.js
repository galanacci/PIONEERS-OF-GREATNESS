import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("presentation controls match the viewing device", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator(".room-transition-label")).toHaveText("LOADING");
    expect(await page.locator(".room-transition-label").evaluate((element) => (
        getComputedStyle(element, "::after").animationName
    ))).toBe("room-loading-dots");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:show-transition")));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    expect(await page.locator("#room-transition").evaluate((element) => (
        getComputedStyle(element).transitionDuration
    ))).toBe("0s");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:hide-transition")));
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /maximum-scale=1, user-scalable=no/);
    expect(await page.locator("body").evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
    expect(await page.locator("#email").evaluate((element) => getComputedStyle(element).userSelect)).toBe("text");
    const contextMenuAllowed = await page.evaluate(() => document.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true
    })));
    expect(contextMenuAllowed).toBe(testInfo.project.name !== "desktop");
    const zoomGestures = await page.evaluate(() => {
        const gestureAllowed = document.dispatchEvent(new Event("gesturestart", { bubbles: true, cancelable: true }));
        const multiTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(multiTouch, "touches", { value: [{}, {}] });
        const multiTouchAllowed = document.dispatchEvent(multiTouch);
        const singleTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(singleTouch, "touches", { value: [{}] });
        const singleTouchAllowed = document.dispatchEvent(singleTouch);
        return { gestureAllowed, multiTouchAllowed, singleTouchAllowed };
    });
    if (testInfo.project.name === "mobile") {
        expect(zoomGestures).toEqual({ gestureAllowed: false, multiTouchAllowed: false, singleTouchAllowed: true });
    } else {
        const scrollbar = await page.locator("#founder-room").evaluate((element) => ({
            color: getComputedStyle(element).scrollbarColor,
            width: getComputedStyle(element).scrollbarWidth
        }));
        expect(scrollbar.width).toBe("thin");
        expect(scrollbar.color).toContain("rgba(0, 0, 0, 0)");
    }
});

test("menu opens and JOIN WAITLIST focuses the email field", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#email")).toBeFocused();
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "ENTER EMAIL HERE...");
});

test("Founder mission film leads its statement", async ({ page }) => {
    await page.goto("/");
    const filmLeads = await page.locator(".founder-mission-film").evaluate((section) => (
        section.firstElementChild?.classList.contains("founder-mission-player")
        && section.lastElementChild?.classList.contains("founder-mission-film-intro")
    ));
    expect(filmLeads).toBe(true);
});

test("the poem is unskippable once and skippable on return without another loading screen", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:founder-requested")));
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#founder-introduction-skip")).toBeHidden();

    await page.reload();
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:founder-requested")));
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#founder-introduction-skip")).toBeVisible();
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator("#founder-introduction-skip").click();
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/);
});

test("Founder opens into the interactive five-chapter hub", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator(".founder-hub-item")).toHaveCount(5);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator(".founder-legacy")).toBeHidden();
    if (page.viewportSize()?.width < 560) {
        const hubFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
        expect(hubFits).toBe(true);
    }
    await expect(page.locator(".founder-hub-item").first()).toHaveClass(/is-selected/);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".founder-hub-item").nth(1)).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-hub")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Founder Origin moves through three finite cinematic frames", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await page.locator('[data-founder-section="origin"]').click();
    await expect(page.locator("#founder-hub")).toBeHidden();
    await expect(page.locator("#founder-experience")).toBeVisible();
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 01 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE SHARED BEDROOM, WHERE IT STARTED");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("24 NOVEMBER 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/the-beginning-room.webp");
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    await expect(page.locator(".founder-origin-control.is-previous")).toBeDisabled();
    let frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await page.locator(".founder-origin-control.is-next").click();
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 02 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE POEM BEFORE THE BRAND");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("27 JUNE 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/greatness-poem-original.webp");
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-origin-frame-count")).toHaveText("FRAME 03 / 03");
    await expect(page.locator("#founder-origin-frame-title")).toHaveText("THE FIRST PHYSICAL EXPRESSION");
    await expect(page.locator(".founder-origin-frame-date")).toHaveText("13 OCTOBER 2021");
    await expect(page.locator(".founder-origin-media img")).toHaveAttribute("src", "src/founder/greatness-tee.webp");
    await expect(page.locator(".founder-origin-video")).toHaveCount(0);
    await expect(page.locator(".founder-origin-copy")).toHaveCount(0);
    await expect(page.locator(".founder-origin-control.is-next")).toBeDisabled();
    if (page.viewportSize()?.width >= 560) {
        const composition = await page.locator(".founder-origin-frame").evaluate((frame) => {
            const media = frame.querySelector(".founder-origin-media")?.getBoundingClientRect();
            const header = frame.querySelector(".founder-origin-frame-header")?.getBoundingClientRect();
            const menu = document.querySelector("#founder-room .room-return")?.getBoundingClientRect();
            return {
                mediaTop: media?.top ?? Infinity,
                mediaHeight: media?.height ?? 0,
                headerTop: header?.top ?? Infinity,
                headerRight: header?.right ?? 0,
                menuTop: menu?.top ?? -Infinity,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth
            };
        });
        expect(composition.mediaTop).toBeLessThan(composition.viewportHeight * 0.3);
        expect(composition.mediaHeight).toBeGreaterThan(composition.viewportHeight * 0.5);
        expect(Math.abs(composition.headerTop - composition.menuTop)).toBeLessThanOrEqual(1);
        expect(composition.viewportWidth - composition.headerRight).toBe(40);
    }
    frameFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(frameFits).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-hub")).toBeVisible();
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
});

test("Founder Journey behaves like an eight-slot save history", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator('[data-founder-section="journey"]').click();
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await expect(page.locator(".founder-journey-item")).toHaveCount(8);
    await expect(page.locator(".founder-journey-item").first()).toHaveClass(/is-selected/);
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowDown");
    await expect(page.locator('.founder-journey-item[data-journey-entry="the-pivot"]')).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator(".founder-journey-count")).toHaveText("02 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("THE PIVOT");
    await expect(page.locator(".founder-media-placeholder")).toContainText("THE PIVOT");
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-journey-count")).toHaveText("03 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("GALANACCI");
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-journey-menu-title")).toBeVisible();
    await page.locator('[data-journey-entry="greatness"]').click();
    await expect(page.locator(".founder-journey-media img")).toHaveAttribute("src", "src/founder/greatness-poem-original.webp");
    await page.locator(".founder-journey-return").click();
    await page.locator('[data-journey-entry="the-first-piece"]').click();
    await expect(page.locator(".founder-journey-media img")).toHaveAttribute("src", "src/founder/greatness-tee.webp");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-hub")).toBeVisible();
});

test("Field Notes waits for entry and renders one year chapter", async ({ page }, testInfo) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/field-notes.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "FIELD NOTES" }).click();
    await expect(page.locator("#field-notes-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator(".field-notes-year-trigger")).toBeVisible();
    await expect(page.locator(".field-notes-year-trigger")).toHaveText("2026");
    const returnBox = await page.locator("#field-notes-room [data-room-close]").boundingBox();
    const yearBox = await page.locator(".field-notes-year-trigger").boundingBox();
    expect(returnBox.x + returnBox.width).toBeLessThan(yearBox.x);
    const viewport = page.viewportSize();
    const expectedEdge = testInfo.project.name === "mobile" ? 24 : 40;
    expect(Math.abs(viewport.width - yearBox.x - yearBox.width - expectedEdge)).toBeLessThanOrEqual(1);
    expect(Math.abs(returnBox.y - yearBox.y)).toBeLessThanOrEqual(4);
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").hover();
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").click();
    expect(await page.locator(".field-notes-years").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    await expect(page.locator(".field-notes-year-options")).toBeVisible();
    expect(await page.locator(".field-notes-year-options").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-option.is-selected").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    const unselectedYear = page.locator(".field-notes-year-option:not(.is-selected)").first();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).color)).toBe("rgba(255, 255, 255, 0.45)");
    await unselectedYear.hover();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.keyboard.press("Escape");
    if (testInfo.project.name === "desktop") {
        await page.setViewportSize({ width: 625, height: 900 });
        const mediumReturnBox = await page.locator("#field-notes-room [data-room-close]").boundingBox();
        const mediumYearBox = await page.locator(".field-notes-year-trigger").boundingBox();
        expect(Math.abs(mediumReturnBox.y - mediumYearBox.y)).toBeLessThanOrEqual(4);
    }
    await expect(page.locator(".field-notes-chapter .field-note").first()).toBeVisible();
    expect(requests).toBe(1);
});

test("Documentary waits for entry and removes playback on exit", async ({ page }) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/documentary.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "DOCUMENTARY" }).click();
    await expect(page.locator("#documentary-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(1);
    await page.locator("#documentary-room [data-room-close]").first().click();
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);
    expect(requests).toBe(1);
});
