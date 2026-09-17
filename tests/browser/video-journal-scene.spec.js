import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("Video Journal plays and changes episodes inside the reconstructed CRT", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    await page.evaluate(() => {
        window.__crtAudioAudit = [];
        window.__crtSoundAudit = [];
        window.addEventListener("pog:crt-audio", (event) => window.__crtAudioAudit.push(event.detail));
        window.addEventListener("pog:menu-sound", (event) => window.__crtSoundAudit.push(event.detail?.name));
    });
    await openMenu(page);
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();

    const room = page.locator("#documentary-room");
    const environment = page.locator("#documentary-environment");
    const trigger = page.locator("#documentary-tv-trigger");
    await expect(room).toHaveClass(/is-open/);
    await expect(environment).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("#documentary-scene")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(page.locator(".documentary-renderer")).toHaveAttribute("data-camera-mode", "entrance-pan");
    await expect(trigger).toBeEnabled();
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);

    await expect(page.locator("#documentary-crt-state")).toBeHidden();
    await expect(page.locator("#documentary-crt-player")).toHaveClass(/is-playing/, { timeout: 3500 });
    await expect(page.locator(".documentary-renderer")).toHaveAttribute("data-camera-mode", "entrance-pan");
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCount(1);
    await expect(page.locator("#documentary-crt-controls")).toBeVisible();
    expect(await page.evaluate(() => window.__crtAudioAudit.map(({ action }) => action).slice(0, 3))).toEqual([
        "power",
        "static-start",
        "static-stop"
    ]);
    expect(await page.evaluate(() => window.__crtAudioAudit.find(({ action }) => action === "static-start")?.duration)).toBe(550);
    await expect(page.locator("#documentary-crt-archive-toggle")).toHaveText("EPISODES");
    await page.locator("#documentary-crt-archive-toggle").click();
    await expect(page.locator("#documentary-crt-archive-menu")).toBeVisible();
    await expect(page.locator(".documentary-crt-now-playing h3")).toContainText("RAPID PROTOTYPE MODE");
    await expect(page.locator(".documentary-crt-now-playing p")).not.toBeEmpty();
    expect(await page.locator(".documentary-crt-year-control").evaluate((element) => getComputedStyle(element, "::after").content)).not.toBe("none");
    const archivePlacement = await page.evaluate(() => {
        const header = document.querySelector(".documentary-environment-header").getBoundingClientRect();
        const menu = document.querySelector("#documentary-crt-archive-menu").getBoundingClientRect();
        return { headerBottom: header.bottom, menuTop: menu.top };
    });
    expect(archivePlacement.menuTop).toBeGreaterThanOrEqual(archivePlacement.headerBottom + 8);
    expect(archivePlacement.menuTop).toBeLessThanOrEqual(archivePlacement.headerBottom + 40);
    await expect(page.locator("#documentary-crt-archive-toggle")).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(page.locator(".documentary-crt-year-filter")).toHaveValue("2026");
    await expect(page.locator(".documentary-crt-episode-option").first()).toContainText("112");
    await page.locator("#documentary-crt-archive-toggle").click();
    const firstSource = await page.locator("#documentary-crt-player iframe").getAttribute("src");
    await page.evaluate(() => {
        window.__crtScreenModeAudit = [];
        const renderer = document.querySelector(".documentary-renderer");
        new MutationObserver(() => window.__crtScreenModeAudit.push(renderer.dataset.screenMode))
            .observe(renderer, { attributes: true, attributeFilter: ["data-screen-mode"] });
    });
    await page.locator("#documentary-crt-previous").click();
    await expect(page.locator("#documentary-crt-player")).toHaveClass(/is-tuning/);
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCSS("opacity", "0");
    await expect(page.locator(".documentary-crt-now-playing h3")).toContainText("BUILDING THE POG AI SYSTEM");
    await expect(page.locator("#documentary-crt-player iframe")).not.toHaveAttribute("src", firstSource);
    await expect(page.locator("#documentary-crt-player")).not.toHaveClass(/is-tuning/, { timeout: 5000 });
    expect(await page.evaluate(() => window.__crtScreenModeAudit)).toContain("line");
    expect(await page.evaluate(() => window.__crtAudioAudit.map(({ action }) => action))).toContain("tune");
    expect(await page.evaluate(() => window.__crtAudioAudit.map(({ action }) => action).slice(-2))).toEqual([
        "static-start",
        "static-stop"
    ]);

    await page.locator("#documentary-crt-archive-toggle").click();
    const chosenEpisode = page.locator(".documentary-crt-episode-option").nth(2);
    await chosenEpisode.click();
    await expect(page.locator("#documentary-crt-archive-menu")).toBeVisible();
    await expect(chosenEpisode).toHaveClass(/is-current/, { timeout: 3000 });
    await expect(chosenEpisode).toHaveCSS("outline-style", "solid");
    await expect(chosenEpisode.locator("strong")).toHaveCSS("color", "rgb(155, 112, 223)");
    await expect(page.locator("#documentary-crt-player")).not.toHaveClass(/is-tuning/, { timeout: 5000 });
    await page.locator("#documentary-crt-archive-toggle").click();
    await expect(page.locator("#documentary-crt-archive-menu")).toBeHidden();

    await page.locator("#documentary-environment [data-room-close]").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    expect(await page.evaluate(() => window.__crtAudioAudit.at(-1)?.action)).toBe("stop");
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();
    await expect(room).toHaveClass(/is-open/);
    await expect(environment).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCount(1);
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);
});
