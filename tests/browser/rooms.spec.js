import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("presentation controls match the viewing device", async ({ page }, testInfo) => {
    await page.goto("/");
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
    await page.locator(".field-notes-year-trigger").click();
    expect(await page.locator(".field-notes-years").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    await expect(page.locator(".field-notes-year-options")).toBeVisible();
    expect(await page.locator(".field-notes-year-options").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-option.is-selected").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    expect(await page.locator(".field-notes-year-option:not(.is-selected)").first().evaluate((element) => getComputedStyle(element).color)).toBe("rgba(255, 255, 255, 0.45)");
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
