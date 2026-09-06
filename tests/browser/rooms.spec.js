import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("presentation controls match the viewing device", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /maximum-scale=1, user-scalable=no/);
    const contextMenuAllowed = await page.evaluate(() => document.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true
    })));
    expect(contextMenuAllowed).toBe(testInfo.project.name !== "desktop");
});

test("menu opens and JOIN WAITLIST focuses the email field", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#email")).toBeFocused();
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "ENTER EMAIL HERE...");
});

test("Field Notes waits for entry and renders one year chapter", async ({ page }) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/field-notes.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "FIELD NOTES" }).click();
    await expect(page.locator("#field-notes-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator(".field-notes-year").first()).toHaveAttribute("aria-pressed", "true");
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
