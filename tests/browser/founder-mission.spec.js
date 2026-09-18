import { expect, test } from "@playwright/test";

test("Current Mission opens first and completed missions remain navigable", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="mission"]').click();
    await expect(page.locator(".founder-mission-terminal")).toHaveClass(/is-typing/);
    await expect(page.locator(".founder-mission-stage")).toHaveCSS("animation-name", "founder-mission-grid-drift");
    await expect(page.locator(".founder-mission-entry.is-active")).toBeVisible();
    await expect(page.locator(".founder-mission-count")).toHaveText("06 / 06");
    await expect(page.locator(".founder-mission-state")).toHaveText("CURRENT MISSION");
    await expect(page.locator("#founder-mission-title")).toHaveText("SECURE THE RUNWAY");
    await expect(page.locator(".founder-mission-objective")).toHaveAttribute("data-mission-type", "BUILD THE FINANCIAL AND DIGITAL FOUNDATION THAT KEEPS POG MOVING.");
    await expect(page.locator('.founder-mission-details [data-mission-type="12 JUL—14 SEP 2026"]')).toHaveCount(1);
    await expect(page.locator(".founder-mission-pixel")).toHaveCount(0);
    await expect(page.locator(".founder-mission-stage")).toBeFocused();
    await expect(page.locator(".founder-mission-stage")).toHaveCSS("border-top-width", "0px");
    await expect(page.locator(".founder-mission-terminal")).toHaveCSS("border-top-color", "rgba(255, 255, 255, 0.14)");
    await expect(page.locator("#founder-experience .page-controls .is-next")).toBeDisabled();
    await expect(page.getByRole("button", { name: "MENU" }).last()).toHaveCSS("color", "rgb(255, 255, 255)");

    await page.locator("#founder-experience .page-controls .is-previous").click();
    await expect(page.locator(".founder-mission-entry.is-complete")).toBeVisible();
    await expect(page.locator(".founder-mission-count")).toHaveText("05 / 06");
    await expect(page.locator(".founder-mission-state")).toHaveText("COMPLETED MISSION");
    await expect(page.locator("#founder-mission-title")).toHaveText("EXPAND THE LANGUAGE");
    await expect(page.locator('.founder-mission-details [data-mission-type="12 FEB—30 JUN 2026"]')).toHaveCount(1);

    for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowLeft");
    await expect(page.locator(".founder-mission-count")).toHaveText("01 / 06");
    await expect(page.locator("#founder-mission-title")).toHaveText("BUILD THE HANDS");
    await expect(page.locator('.founder-mission-details [data-mission-type="19 JUN—27 JUL 2025"]')).toHaveCount(1);

    for (let index = 0; index < 5; index += 1) await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-mission-state")).toHaveText("CURRENT MISSION");
});

test("Mission briefs type only on their first visit", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));

    await page.locator('[data-founder-section="mission"]').click();
    await expect(page.locator(".founder-mission-terminal")).toHaveClass(/is-typing/);
    await expect(page.locator(".founder-mission-stage")).toHaveCSS("animation-name", "founder-mission-grid-drift");
    await expect(page.locator(".founder-mission-terminal")).toHaveCSS("box-shadow", "none");
    await expect(page.locator(".founder-mission-objective")).toHaveAttribute("data-mission-speed", "6");
    await expect(page.locator(".founder-mission-objective")).not.toHaveText("BUILD THE FINANCIAL AND DIGITAL FOUNDATION THAT KEEPS POG MOVING.");

    const terminalBox = await page.locator(".founder-mission-terminal").boundingBox();
    if (testInfo.project.name === "mobile") {
        const controlsBox = await page.locator("#founder-experience .page-controls").boundingBox();
        expect(Math.abs(terminalBox.x - controlsBox.x)).toBeLessThanOrEqual(1);
        expect(Math.abs((terminalBox.x + terminalBox.width) - (controlsBox.x + controlsBox.width))).toBeLessThanOrEqual(1);
    } else {
        const headerBox = await page.locator(".founder-mission-entry-header").boundingBox();
        expect(Math.abs((terminalBox.x + terminalBox.width) - (headerBox.x + headerBox.width))).toBeLessThanOrEqual(1);
    }

    await page.locator("#founder-experience .page-controls .is-previous").click();
    await expect(page.locator(".founder-mission-terminal")).toHaveClass(/is-typing/);
    await expect(page.locator(".founder-mission-objective")).not.toHaveText("PROVE THAT FORGE CAN BECOME A SYSTEM, NOT A SINGLE JACKET.");

    await page.locator("#founder-experience .page-controls .is-next").click();
    await expect(page.locator(".founder-mission-terminal")).not.toHaveClass(/is-typing/);
    await expect(page.locator(".founder-mission-objective")).toHaveText("BUILD THE FINANCIAL AND DIGITAL FOUNDATION THAT KEEPS POG MOVING.");

    if (testInfo.project.name === "desktop") {
        const terminalSize = await page.locator(".founder-mission-terminal").evaluate((element) => ({
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            overflowY: getComputedStyle(element).overflowY
        }));
        expect(terminalSize.overflowY).toBe("hidden");
        expect(terminalSize.scrollHeight).toBeLessThanOrEqual(terminalSize.clientHeight + 1);
    }
});

test("Founder reading type remains legible at common mobile widths", async ({ page }) => {
    test.skip(page.viewportSize()?.width > 680, "Mobile typography coverage.");
    for (const width of [360, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto("/");
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
            detail: { roomId: "founder-room", skipTransition: true }
        })));
        await page.locator('[data-founder-section="mission"]').click();
        const missionType = await page.locator(".founder-mission-terminal").evaluate((terminal) => {
            const size = (selector) => Number.parseFloat(getComputedStyle(terminal.querySelector(selector)).fontSize);
            return {
                brief: size(".founder-mission-brief"),
                detailLabel: size(".founder-mission-details dt"),
                detailValue: size(".founder-mission-details dd"),
                priority: size(".founder-mission-priorities li")
            };
        });
        expect(missionType.brief).toBeGreaterThanOrEqual(16);
        expect(missionType.detailLabel).toBeGreaterThanOrEqual(11);
        expect(missionType.detailValue).toBeGreaterThanOrEqual(14);
        expect(missionType.priority).toBeGreaterThanOrEqual(14);
        const controls = page.locator("#founder-experience .page-controls button");
        for (const control of await controls.all()) {
            const bounds = await control.boundingBox();
            expect(bounds.height).toBeGreaterThanOrEqual(44);
        }

        await page.locator("#founder-room .room-return").click();
        await page.locator('[data-founder-section="journey"]').click();
        await expect(page.locator("#founder-journey-menu-title")).toBeVisible();
        await page.locator(".journey-object.is-selected").evaluate((button) => button.click());
        await expect(page.locator(".founder-journey-copy p").first()).toBeVisible();
        const journeyCopySize = await page.locator(".founder-journey-copy p").first()
            .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
        expect(journeyCopySize).toBeGreaterThanOrEqual(16);
    }
});
