import { expect, test } from "@playwright/test";

test("Current Mission opens first and completed missions remain navigable", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="mission"]').click();
    await expect(page.locator(".founder-mission-entry.is-active")).toBeVisible();
    await expect(page.locator(".founder-mission-count")).toHaveText("03 / 03");
    await expect(page.locator(".founder-mission-state")).toHaveText("CURRENT MISSION");
    await expect(page.locator("#founder-mission-title")).toHaveText("BUILD THE SECOND RELEASE");
    await expect(page.locator(".founder-mission-objective")).toHaveText("BUILD THE SECOND MADE-TO-ORDER RELEASE.");
    await expect(page.locator(".founder-mission-pixel")).toHaveCount(36);
    await expect(page.locator(".founder-mission-stage")).toBeFocused();
    await expect(page.locator("#founder-experience .page-controls .is-next")).toBeDisabled();
    await expect(page.getByRole("button", { name: "MENU" }).last()).toHaveCSS("color", "rgb(255, 255, 255)");

    await page.locator("#founder-experience .page-controls .is-previous").click();
    await expect(page.locator(".founder-mission-entry.is-complete")).toBeVisible();
    await expect(page.locator(".founder-mission-count")).toHaveText("02 / 03");
    await expect(page.locator(".founder-mission-state")).toHaveText("COMPLETED MISSION");
    await expect(page.locator("#founder-mission-title")).toHaveText("PROVE THE BELIEF");

    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".founder-mission-count")).toHaveText("01 / 03");
    await expect(page.locator("#founder-mission-title")).toHaveText("MAKE THE IDEA PHYSICAL");

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-mission-state")).toHaveText("CURRENT MISSION");
});
