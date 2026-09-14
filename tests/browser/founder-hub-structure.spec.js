import { expect, test } from "@playwright/test";

test("Founder Hub contains four distinct chapters without Founder Notes", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    const chapters = page.locator(".founder-hub-item");
    await expect(chapters).toHaveCount(4);
    await expect(page.locator('[data-founder-section="notes"]')).toHaveCount(0);
    await expect(page.locator('[data-founder-section="origin"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="journey"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="code"]')).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="mission"]')).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator('[data-founder-section="mission"] .founder-hub-item-number')).toHaveText("04");
});
