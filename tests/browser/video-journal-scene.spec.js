import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("Video Journal plays and changes episodes inside the reconstructed CRT", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    await openMenu(page);
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();

    const room = page.locator("#documentary-room");
    const environment = page.locator("#documentary-environment");
    const trigger = page.locator("#documentary-tv-trigger");
    await expect(room).toHaveClass(/is-open/);
    await expect(environment).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("#documentary-scene")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(trigger).toBeEnabled();
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);

    await expect(page.locator("#documentary-crt-state")).toContainText(/POWER|SIGNAL|NOW PLAYING/);
    await expect(page.locator("#documentary-crt-player")).toHaveClass(/is-playing/, { timeout: 10000 });
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCount(1);
    await expect(page.locator("#documentary-crt-controls")).toBeVisible();
    await expect(page.locator("#documentary-crt-archive-toggle")).toHaveText("EPISODES");
    await expect(page.locator("#documentary-crt-state")).toContainText("RAPID PROTOTYPE MODE");
    await page.locator("#documentary-crt-archive-toggle").click();
    await expect(page.locator("#documentary-crt-archive-menu")).toBeVisible();
    await expect(page.locator("#documentary-crt-archive-toggle")).toHaveCSS("background-color", "rgb(0, 0, 0)");
    await expect(page.locator(".documentary-crt-year-filter")).toHaveValue("2026");
    await expect(page.locator(".documentary-crt-episode-option").first()).toContainText("112");
    await page.locator("#documentary-crt-archive-toggle").click();
    const firstSource = await page.locator("#documentary-crt-player iframe").getAttribute("src");
    await page.locator("#documentary-crt-previous").click();
    await expect(page.locator("#documentary-crt-state")).toContainText("BUILDING THE POG AI SYSTEM");
    await expect(page.locator("#documentary-crt-player iframe")).not.toHaveAttribute("src", firstSource);

    await page.locator("#documentary-environment [data-room-close]").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();
    await expect(room).toHaveClass(/is-open/);
    await expect(environment).toHaveAttribute("aria-hidden", "false");
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCount(1);
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);
});
