import { expect, test } from "@playwright/test";

test("phones are held in portrait while desktop and tablet layouts remain available", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Touch phone behavior.");
    await page.setViewportSize({ width: 851, height: 393 });
    await page.goto("/");

    const guard = page.locator("#mobile-orientation-guard");
    await expect(guard).toBeVisible();
    await expect(guard).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("body")).toHaveClass(/is-mobile-orientation-locked/);
    await expect(page.locator("#pog-desktop")).toHaveAttribute("inert", "");

    await page.setViewportSize({ width: 393, height: 851 });
    await expect(guard).toBeHidden();
    await expect(guard).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("body")).not.toHaveClass(/is-mobile-orientation-locked/);
    await expect(page.locator("#pog-desktop")).not.toHaveAttribute("inert", "");

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(guard).toBeHidden();
    await expect(page.locator("body")).not.toHaveClass(/is-mobile-orientation-locked/);
});
