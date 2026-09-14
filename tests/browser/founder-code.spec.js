import { expect, test } from "@playwright/test";

test("The Code presents all thirteen laws as a navigable manifesto", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await expect(page.locator('[data-founder-section="code"] .founder-hub-item-label')).toHaveText("THE 13 LAWS");
    await page.locator('[data-founder-section="code"]').click();
    await expect(page.locator(".founder-code-entry")).toBeVisible();
    await expect(page.locator("#founder-code-title")).toHaveText("THE 13 LAWS");
    await expect(page.locator(".founder-code-count")).toHaveText("01 / 13");
    await expect(page.locator(".founder-code-law")).toHaveText("BELIEVE IN YOURSELF. BACK IT UP.");
    await expect(page.locator(".founder-code-stage")).toBeFocused();
    expect(await page.locator(".founder-code-law").evaluate((element) => getComputedStyle(element).textAlign)).toBe("left");

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-code-count")).toHaveText("02 / 13");
    await expect(page.locator(".founder-code-law")).toContainText("MEDIOCRITY NEVER INSPIRED ANYONE");
    await expect(page.locator(".founder-code-stage")).toBeFocused();
    expect(await page.getByRole("button", { name: "MENU" }).evaluate((element) => getComputedStyle(element).color)).toBe("rgb(255, 255, 255)");

    for (let index = 0; index < 11; index += 1) await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-code-law")).toHaveText("WITHOUT PURPOSE, YOU HAVE NO DIRECTION.");
    await page.locator("#founder-experience .page-controls .is-next").click();
    await expect(page.locator(".founder-code-stage.is-archive")).toBeVisible();
    await expect(page.locator(".founder-code-count")).toHaveText("13 / 13");
    await expect(page.locator(".founder-code-archive-image")).toHaveAttribute("src", "src/founder/13-laws-handwritten.jpg");
    await expect(page.locator("#founder-experience .page-controls .is-next")).toBeDisabled();

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".founder-code-law")).toHaveText("WITHOUT PURPOSE, YOU HAVE NO DIRECTION.");

    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
});
