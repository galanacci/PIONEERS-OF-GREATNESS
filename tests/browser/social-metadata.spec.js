import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("site exposes a complete social sharing card", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "PIONEERS OF GREATNESS");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /Humanwear shaped by boxing culture/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://pioneersofgreatness.com/src/POG_SOCIAL_PREVIEW.jpg");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", "PIONEERS OF GREATNESS — This ripple will be a tsunami");
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", "PIONEERS OF GREATNESS — This ripple will be a tsunami");

    const metadata = await sharp("src/POG_SOCIAL_PREVIEW.jpg").metadata();
    expect(metadata).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
});
