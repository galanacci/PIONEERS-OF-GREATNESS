import { expect, test } from "@playwright/test";

test("Video Journal retains concise episode metadata while switching the CRT", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();
    await expect(page.locator("#documentary-scene")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(page.locator("#documentary-crt-player")).toHaveClass(/is-playing/, { timeout: 10000 });
    const firstSource = await page.locator("#documentary-crt-player iframe").getAttribute("src");
    await page.locator("#documentary-crt-previous").click();
    await expect(page.locator("#documentary-crt-player iframe")).not.toHaveAttribute("src", firstSource);

    const archive = await (await page.request.get("/data/documentary.json")).json();
    expect(archive.episodes).toHaveLength(112);
    expect(archive.episodes.every((episode) => episode.summary && episode.summary.length <= 360)).toBe(true);
    expect(archive.episodes.some((episode) => /https?:\/\/|subscribe|timestamps/i.test(episode.summary))).toBe(false);
});
