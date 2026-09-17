import { test, expect } from "@playwright/test";

test("PoG.EXE behaves like a persistent desktop shortcut", async ({ page }) => {
    test.skip(page.viewportSize()?.width <= 680, "Mobile uses single-tap launch.");
    await page.goto("/");
    const shortcut = page.locator("#pog-exe-shortcut");
    await expect(shortcut).toBeVisible();
    await expect(shortcut).toHaveText("PoG.EXE");
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
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await page.locator("#pog-exe-shortcut").dblclick();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 4000 });
});

test("a mobile tap selects PoG.EXE briefly then launches", async ({ page }) => {
    test.skip(page.viewportSize()?.width > 680, "Touch-launch behavior is mobile only.");
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    const shortcut = page.locator("#pog-exe-shortcut");
    await shortcut.tap();
    await expect(shortcut).toHaveClass(/is-selected/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 1000 });
});
