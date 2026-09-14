import { expect, test } from "@playwright/test";

test("The Code presents all thirteen laws as a navigable manifesto", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="code"]').click();
    await expect(page.locator(".founder-code-entry")).toBeVisible();
    await expect(page.locator("#founder-code-title")).toHaveText("THE 13 LAWS OF GREATNESS");
    await expect(page.locator(".founder-code-count")).toHaveText("01 / 13");
    await expect(page.locator(".founder-code-law")).toHaveText("BELIEVE IN YOURSELF — AND BACK IT UP.");

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-code-count")).toHaveText("02 / 13");
    await expect(page.locator(".founder-code-law")).toContainText("MEDIOCRITY NEVER INSPIRED ANYONE");

    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
});
