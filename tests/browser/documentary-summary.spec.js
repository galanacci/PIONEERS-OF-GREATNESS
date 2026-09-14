import { expect, test } from "@playwright/test";

test("Video Journal shows a concise summary for the selected episode", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();

    const summary = page.locator("#documentary-feature .documentary-feature-summary");
    await expect(summary).toBeVisible();
    await expect(summary).not.toBeEmpty();
    const firstSummary = await summary.textContent();

    await page.locator(".documentary-episode-button").nth(1).click();
    await expect(summary).not.toHaveText(firstSummary);

    const archive = await (await page.request.get("/data/documentary.json")).json();
    expect(archive.episodes).toHaveLength(112);
    expect(archive.episodes.every((episode) => episode.summary && episode.summary.length <= 360)).toBe(true);
    expect(archive.episodes.some((episode) => /https?:\/\/|subscribe|timestamps/i.test(episode.summary))).toBe(false);
});
