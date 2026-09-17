import { expect, test } from "@playwright/test";

async function openMenu(page) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:opening-complete")));
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
}

test("Collections stays locked publicly and unlocks through its preview query", async ({ page }, testInfo) => {
    test.setTimeout(150000);
    await page.goto("/");
    const publicCollections = page.locator('[data-preview-room="collections-room"]');
    await expect(publicCollections).toHaveAttribute("aria-disabled", "true");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "collections-room", skipTransition: true }
    })));
    await expect(page.locator("#collections-room")).not.toHaveClass(/is-open/);

    await page.goto("/?preview=collections");
    await openMenu(page);
    const previewCollections = page.getByRole("menuitem", { name: "COLLECTIONS" });
    await expect(previewCollections).not.toHaveAttribute("aria-disabled", "true");
    await expect(previewCollections).toHaveAttribute("data-room-target", "collections-room");
    await previewCollections.click();
    await expect(page.locator("#collections-room")).toHaveClass(/is-open/);
    await expect(page.locator("#collections-title")).toHaveText("COLLECTIONS");
    await expect(page.locator("#collections-stage")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 30000 });
    await expect(page.locator(".collections-product-chip")).toHaveCount(0);
    await expect(page.locator("#collections-model-labels")).toHaveCount(0);
    await expect(page.locator(".collections-room-actions .collections-room-action")).toHaveCount(3);
    await expect(page.locator(".collections-discovery")).toHaveCount(0);
    await expect(page.locator(".collections-rail .room-navigation-credit")).toBeVisible();
    await expect(page.locator(".collections-room-actions .collections-room-action").first()).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(".collections-room-actions .collections-room-action").last()).toHaveAttribute("aria-disabled", "true");
    await page.evaluate(() => {
        window.__collectionSounds = [];
        window.addEventListener("pog:menu-sound", (event) => window.__collectionSounds.push(event.detail?.name));
    });
    await page.locator(".collections-room-actions .collections-room-action").first().click({ force: true });
    expect(await page.evaluate(() => window.__collectionSounds)).toContain("locked");
    await expect(page.locator("#collections-product-sheet")).toHaveAttribute("aria-hidden", "true");
    const roomCartButton = page.locator("[data-collections-room-cart]");
    await expect(roomCartButton).toBeEnabled();
    await expect(page.locator("#collections-product-sheet")).toHaveAttribute("aria-hidden", "true");
    await roomCartButton.click();
    await expect(page.locator("#collections-room-cart-drawer")).toHaveClass(/is-open/);
    await expect(page.locator("#collections-room-cart-empty")).toBeVisible();
    await roomCartButton.click();
    await expect(page.locator("#collections-room-cart-drawer")).not.toHaveClass(/is-open/);
    const roomControlsBox = await page.locator(".collections-room-actions").boundingBox();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:collections-open-product", {
        detail: { index: 1 }
    })));
    await expect(page.locator("#collections-product-sheet")).toHaveClass(/is-visible/);
    await expect(page.locator("#collections-product-title")).toHaveText("COLLECTION PIECE 02");
    await expect(page.locator(".collections-product-image")).toHaveCount(3);
    await expect(page.locator("#collections-room .room-return")).toHaveAttribute("aria-label", "Back to collection");
    const productControlsBox = await page.locator(".collections-product-actions").boundingBox();
    const productCreditBox = await page.locator(".collections-product-credit").boundingBox();
    const viewport = page.viewportSize();
    const expectedWidth = testInfo.project.name === "mobile"
        ? viewport.width - 36
        : Math.min(720, viewport.width - 80);
    expect(Math.abs(roomControlsBox.width - expectedWidth)).toBeLessThan(2);
    expect(Math.abs(productControlsBox.width - expectedWidth)).toBeLessThan(2);
    expect(Math.abs(productControlsBox.height - 42)).toBeLessThan(2);
    expect(Math.abs(productCreditBox.y - productControlsBox.y - productControlsBox.height - 15)).toBeLessThan(2);
    expect(await page.locator("#collections-canvas canvas").evaluate((canvas) => canvas.dispatchEvent(new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 120
    })))).toBe(true);
    await page.locator('[data-collections-action="details"]').click();
    await expect(page.locator("#collections-product-drawer")).toHaveClass(/is-open/);
    await expect(page.locator("#collections-product-description")).not.toBeEmpty();
    await page.locator('[data-collections-action="size"]').click();
    await expect(page.locator("#collections-size-options button")).toHaveCount(4);
    await page.locator("#collections-size-options button").first().click();
    await expect(page.locator("#collections-cart-count")).toHaveText("1");
    await page.locator('[data-collections-action="cart"]').click();
    await expect(page.locator("#collections-cart-list li")).toHaveCount(1);
    await page.locator(".collections-image-next").click();
    await expect(page.locator("[data-collections-product-image]").nth(1)).toHaveClass(/is-active/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#collections-product-sheet")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("#collections-room-cart-count")).toHaveText("1");
    await roomCartButton.click();
    await expect(page.locator("#collections-room-cart-list li")).toHaveCount(1);
    await roomCartButton.click();
    await page.locator("#collections-room .room-return").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("presentation controls match the viewing device", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator(".room-transition-label")).toHaveText("LOADING");
    expect(await page.locator(".room-transition-label").evaluate((element) => (
        getComputedStyle(element, "::after").animationName
    ))).toBe("room-loading-dots");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:show-transition")));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    expect(await page.locator("#room-transition").evaluate((element) => (
        getComputedStyle(element).transitionDuration
    ))).toBe("0s");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:hide-transition")));
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /maximum-scale=1, user-scalable=no/);
    expect(await page.locator("body").evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
    expect(await page.locator("#email").evaluate((element) => getComputedStyle(element).userSelect)).toBe("text");
    const contextMenuAllowed = await page.evaluate(() => document.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true
    })));
    expect(contextMenuAllowed).toBe(testInfo.project.name !== "desktop");
    const zoomGestures = await page.evaluate(() => {
        const gestureAllowed = document.dispatchEvent(new Event("gesturestart", { bubbles: true, cancelable: true }));
        const multiTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(multiTouch, "touches", { value: [{}, {}] });
        const multiTouchAllowed = document.dispatchEvent(multiTouch);
        const singleTouch = new Event("touchmove", { bubbles: true, cancelable: true });
        Object.defineProperty(singleTouch, "touches", { value: [{}] });
        const singleTouchAllowed = document.dispatchEvent(singleTouch);
        return { gestureAllowed, multiTouchAllowed, singleTouchAllowed };
    });
    if (testInfo.project.name === "mobile") {
        expect(zoomGestures).toEqual({ gestureAllowed: false, multiTouchAllowed: false, singleTouchAllowed: true });
    } else {
        const scrollbar = await page.locator("#founder-room").evaluate((element) => ({
            color: getComputedStyle(element).scrollbarColor,
            width: getComputedStyle(element).scrollbarWidth
        }));
        expect(scrollbar.width).toBe("thin");
        expect(scrollbar.color).toContain("rgba(0, 0, 0, 0)");
    }
});

test("JOIN WAITLIST opens inside the menu and returns after signup", async ({ page }) => {
    let attempts = 0;
    await page.route("https://script.google.com/**", async (route) => {
        attempts += 1;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: attempts === 1 ? "error" : "success" })
        });
    });
    await page.goto("/");
    await page.evaluate(() => {
        window.__ambienceStops = 0;
        window.addEventListener("pog:ambience-stop", () => { window.__ambienceStops += 1; });
    });
    await openMenu(page);
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-waitlist-open/);
    await expect(page.locator("#email")).toBeFocused();
    await expect(page.locator("#email")).toHaveAttribute("placeholder", "ENTER EMAIL HERE...");
    const waitlistAlignment = await page.locator("#email-form").evaluate((form) => {
        const bounds = form.getBoundingClientRect();
        return { centre: bounds.left + bounds.width / 2, viewportCentre: window.innerWidth / 2 };
    });
    expect(Math.abs(waitlistAlignment.centre - waitlistAlignment.viewportCentre)).toBeLessThanOrEqual(1);
    await page.locator("#menu-overlay").click({ position: { x: 8, y: 8 } });
    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-waitlist-open/);
    await expect(page.getByRole("menuitem", { name: "JOIN WAITLIST" })).toBeFocused();
    await page.getByRole("menuitem", { name: "JOIN WAITLIST" }).click();
    await expect(page.locator("#email")).toBeFocused();
    await page.locator("#email").fill("founder@example.com");
    await page.locator('#email-form button[type="submit"]').click();
    await expect(page.locator("#status")).toHaveText("Something went wrong.");
    await expect(page.locator("#status")).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.locator('#email-form button[type="submit"]').click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).not.toHaveClass(/is-waitlist-open/);
    await expect(page.locator(".menu-list")).toBeVisible();
    await expect(page.locator("#status")).toBeEmpty();
    expect(await page.evaluate(() => window.__ambienceStops)).toBe(0);
});

test("menu emits game-like feedback for pointer, touch, keyboard and locked choices", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await page.evaluate(() => {
        window.__menuSoundLog = [];
        window.addEventListener("pog:menu-sound", (event) => window.__menuSoundLog.push(event.detail.name));
    });
    const continueButton = page.getByRole("button", { name: "Enter experience" });
    await continueButton.dispatchEvent("pointerover", { pointerType: "mouse" });
    await continueButton.click();
    const entrySounds = await page.evaluate(() => window.__menuSoundLog.slice());
    expect(entrySounds.filter((sound) => sound === "select")).toHaveLength(1);
    expect(entrySounds.filter((sound) => sound === "boot")).toHaveLength(1);
    expect(entrySounds).not.toContain("confirm");
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "FOUNDER" }).dispatchEvent("pointerover", { pointerType: "mouse" });
    await page.getByRole("menuitem", { name: "FIELD NOTES" }).dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.getByRole("menuitem", { name: "COLLECTIONS" }).dispatchEvent("click");
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.keyboard.press("ArrowUp");
    const soundLog = await page.evaluate(() => window.__menuSoundLog);
    expect(soundLog).toContain("boot");
    expect(soundLog).toContain("select");
    expect(soundLog).toContain("locked");
});

test("EXIT emits a dedicated shutdown sound instead of the standard confirmation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
        window.__menuSoundLog = [];
        window.addEventListener("pog:menu-sound", (event) => window.__menuSoundLog.push(event.detail.name));
        window.dispatchEvent(new CustomEvent("pog:return-to-menu"));
    });
    await page.getByRole("menuitem", { name: "EXIT" }).click();
    const sounds = await page.evaluate(() => window.__menuSoundLog);
    expect(sounds).toContain("shutdown");
    expect(sounds).not.toContain("confirm");
});

test("ENTER emits the dedicated boot-up sound for first and returning visits", async ({ page }) => {
    const captureEntrySound = async () => {
        await page.evaluate(() => {
            window.__entrySoundLog = [];
            window.__entryTimeline = [];
            window.addEventListener("pog:menu-sound", (event) => {
                window.__entrySoundLog.push(event.detail.name);
                if (event.detail.name === "boot") window.__entryTimeline.push("boot");
            });
            window.addEventListener("pog:start-requested", () => window.__entryTimeline.push("start"));
        });
    };

    await page.route("**/data/greatness-poem.json", async (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ paragraphs: ["A."] })
    }));
    await page.goto("/");
    await captureEntrySound();
    const begin = page.getByRole("button", { name: "Enter experience" });
    await begin.dispatchEvent("pointerdown", { pointerType: "touch" });
    expect(await page.evaluate(() => window.__entrySoundLog)).toEqual(["boot"]);
    await begin.dispatchEvent("click");
    expect(await page.evaluate(() => window.__entryTimeline)).toEqual(["boot", "start"]);
    expect(await page.evaluate(() => window.__entrySoundLog.filter((sound) => sound === "boot"))).toHaveLength(1);
    expect(await page.evaluate(() => window.__entrySoundLog)).not.toContain("confirm");
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 10000 });
    expect(await page.evaluate(() => window.__entrySoundLog.filter((sound) => sound === "boot"))).toHaveLength(1);

    await page.evaluate(() => localStorage.setItem("pog:founder-introduction:v2", "complete"));
    await page.reload();
    await captureEntrySound();
    await page.getByRole("button", { name: "Enter experience" }).click();
    expect(await page.evaluate(() => window.__entrySoundLog)).toContain("boot");
    expect(await page.evaluate(() => window.__entrySoundLog)).not.toContain("confirm");
});

test("a direct mobile touch unlocks and warms the SFX engine", async ({ page }) => {
    await page.addInitScript(() => {
        window.__sfxAudit = { contexts: 0, resumes: 0, warmStarts: 0, toneStarts: 0 };
        const parameter = {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {}
        };
        window.AudioContext = class {
            constructor() {
                window.__sfxAudit.contexts += 1;
                this.state = "suspended";
                this.currentTime = 0;
                this.sampleRate = 44100;
                this.destination = {};
            }

            resume() {
                window.__sfxAudit.resumes += 1;
                this.state = "running";
                return Promise.resolve();
            }

            createBuffer() { return {}; }
            createBufferSource() {
                return {
                    buffer: null,
                    connect: (target) => target,
                    start: () => { window.__sfxAudit.warmStarts += 1; }
                };
            }

            createOscillator() {
                return {
                    frequency: parameter,
                    connect: (target) => target,
                    start: () => { window.__sfxAudit.toneStarts += 1; },
                    stop() {}
                };
            }

            createGain() {
                return { gain: parameter, connect: (target) => target };
            }
        };
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Enter experience" }).dispatchEvent("pointerdown", {
        pointerType: "touch"
    });
    await expect.poll(() => page.evaluate(() => window.__sfxAudit)).toMatchObject({
        contexts: 1,
        resumes: 1,
        warmStarts: 1
    });
    await expect.poll(() => page.evaluate(() => window.__sfxAudit.toneStarts)).toBeGreaterThan(0);
});

test("game-like feedback extends to room controls without duplicating the main menu", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
        window.__siteSoundLog = [];
        window.addEventListener("pog:menu-sound", (event) => window.__siteSoundLog.push(event.detail.name));
        window.dispatchEvent(new CustomEvent("pog:open-room", {
            detail: { roomId: "founder-room", skipTransition: true }
        }));
    });
    await expect(page.locator(".founder-hub-item")).toHaveCount(4);
    const origin = page.locator('[data-founder-section="origin"]');
    await origin.dispatchEvent("pointerover", { pointerType: "mouse" });
    await origin.click();
    await page.locator("#founder-room .room-return").click();
    const journey = page.locator('[data-founder-section="journey"]');
    await journey.dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.keyboard.press("ArrowDown");
    const unavailable = page.locator('[data-founder-section="code"]');
    await expect(unavailable).toHaveAttribute("aria-disabled", "true");
    await unavailable.dispatchEvent("click");
    const sounds = await page.evaluate(() => window.__siteSoundLog);
    expect(sounds).toContain("select");
    expect(sounds).toContain("confirm");
    expect(sounds).toContain("locked");
});

test("ENTER fades in randomized ambience and page or menu exits fade it out", async ({ page }) => {
    await page.route("**/data/greatness-poem.json", async (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ paragraphs: ["A."] })
    }));
    await page.goto("/");
    await page.evaluate(() => {
        Math.random = () => 0.5;
        window.__ambienceVolumes = [];
        window.addEventListener("pog:ambience-level", (event) => {
            window.__ambienceVolumes.push(event.detail.level);
        });
    });
    await page.getByRole("button", { name: "Enter experience" }).click();
    const beforeEnter = await page.locator("#site-ambience").evaluate((audio) => ({
        paused: audio.paused,
        level: Number(audio.dataset.outputLevel),
        target: Number(audio.dataset.targetLevel)
    }));
    expect(beforeEnter.paused).toBe(true);
    expect(beforeEnter.level).toBe(0);
    expect(beforeEnter.target).toBe(page.viewportSize()?.width < 560 ? 0.05 : 0.09);
    const targetLevel = beforeEnter.target;
    expect(await page.locator(".background-video").evaluate((video) => video.muted && video.defaultMuted)).toBe(true);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 10000 });
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator("#founder-introduction-enter")).toBeHidden();
    await expect(page.locator("#founder-poem-reveal")).toBeHidden();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => Number(audio.dataset.outputLevel)), { timeout: 3000 }).toBeGreaterThan(targetLevel - 0.005);
    const audioState = await page.locator("#site-ambience").evaluate((audio) => ({
        currentTime: audio.currentTime,
        duration: audio.duration,
        level: Number(audio.dataset.outputLevel),
        outputMode: audio.dataset.outputMode
    }));
    expect(audioState.currentTime).toBeGreaterThan(audioState.duration * 0.45);
    expect(audioState.level).toBeCloseTo(targetLevel);
    expect(audioState.outputMode).toBe("webaudio");
    expect(await page.evaluate((target) => window.__ambienceVolumes.some((volume) => (
        volume > 0.005 && volume < target - 0.005
    )), targetLevel)).toBe(true);
    await expect(page.locator(".audio-toggle")).toHaveAttribute("aria-pressed", "true");
    const timeBeforeMute = await page.locator("#site-ambience").evaluate((audio) => audio.currentTime);
    await page.locator(".audio-toggle").click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.muted), { timeout: 3000 }).toBe(true);
    const mutedState = await page.locator("#site-ambience").evaluate((audio) => ({
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime,
        level: Number(audio.dataset.outputLevel)
    }));
    expect(mutedState.muted).toBe(true);
    expect(mutedState.paused).toBe(false);
    expect(mutedState.currentTime).toBeGreaterThan(timeBeforeMute);
    expect(mutedState.level).toBe(0);
    expect(await page.locator(".background-video").evaluate((video) => video.muted)).toBe(true);
    await page.locator(".audio-toggle").click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => Number(audio.dataset.outputLevel)), { timeout: 3000 }).toBeGreaterThan(targetLevel - 0.005);
    const restoredState = await page.locator("#site-ambience").evaluate((audio) => ({
        muted: audio.muted,
        paused: audio.paused,
        currentTime: audio.currentTime
    }));
    expect(restoredState.muted).toBe(false);
    expect(restoredState.paused).toBe(false);
    expect(restoredState.currentTime).toBeGreaterThanOrEqual(mutedState.currentTime);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused), { timeout: 3000 }).toBe(true);
    const suspendedTime = await page.locator("#site-ambience").evaluate((audio) => audio.currentTime);
    expect(await page.locator("#site-ambience").evaluate((audio) => Number(audio.dataset.outputLevel))).toBe(0);
    await page.waitForTimeout(150);
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.currentTime)).toBeCloseTo(suspendedTime, 1);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => Number(audio.dataset.outputLevel)), { timeout: 3000 }).toBeGreaterThan(targetLevel - 0.005);
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.currentTime)).toBeGreaterThanOrEqual(suspendedTime);
    await page.getByRole("menuitem", { name: "FOUNDER" }).click();
    expect(await page.locator("#site-ambience").evaluate((audio) => audio.paused)).toBe(false);
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await page.getByRole("menuitem", { name: "EXIT" }).click();
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => audio.paused), { timeout: 3000 }).toBe(true);
    expect(await page.locator("#site-ambience").evaluate((audio) => ({ level: Number(audio.dataset.outputLevel), currentTime: audio.currentTime }))).toEqual({
        level: 0,
        currentTime: 0
    });
    await page.reload();
    await page.getByRole("button", { name: "Enter experience" }).click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => Number(audio.dataset.outputLevel)), {
        timeout: 3000
    }).toBeGreaterThan(targetLevel - 0.005);
    await expect(page.locator("#site-ambience")).toHaveAttribute("data-output-mode", "webaudio");
    const timeBeforeDocumentary = await page.locator("#site-ambience").evaluate((audio) => audio.currentTime);
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();
    await expect(page.locator("#documentary-room")).toHaveClass(/is-open/);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => ({
        level: Number(audio.dataset.outputLevel),
        muted: audio.muted
    })), { timeout: 3000 }).toEqual({ level: 0, muted: true });
    const documentaryAudio = await page.locator("#site-ambience").evaluate((audio) => ({
        currentTime: audio.currentTime,
        paused: audio.paused
    }));
    expect(documentaryAudio.paused).toBe(false);
    expect(documentaryAudio.currentTime).toBeGreaterThan(timeBeforeDocumentary);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator("#documentary-room [data-room-close]").first().click();
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect.poll(() => page.locator("#site-ambience").evaluate((audio) => ({
        level: Number(audio.dataset.outputLevel),
        muted: audio.muted
    })), { timeout: 3000 }).toEqual({ level: targetLevel, muted: false });
});

test("the poem gates the first visit and returning visitors continue directly", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 320, height: 568 });
    await page.route("**/data/greatness-poem.json", async (route) => route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ paragraphs: ["ABCDEFGHIJKLMNOPQRSTUVWXYZ ABCDEFGHIJKLMNOPQRSTUVWXYZ."] })
    }));
    await page.goto("/");
    await expect(page.locator(".menu-toggle")).toHaveText("ENTER");
    await page.getByRole("button", { name: "Enter experience" }).click();
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#founder-introduction-copy")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#founder-introduction-skip")).toBeHidden();
    await expect.poll(() => page.locator("#founder-introduction-copy").textContent()).not.toBe("");
    const beforeTap = (await page.locator("#founder-introduction-copy").textContent()).length;
    await page.locator("#founder-introduction").dispatchEvent("pointerdown", { pointerType: "touch" });
    await page.waitForTimeout(180);
    const afterTap = (await page.locator("#founder-introduction-copy").textContent()).length;
    expect(afterTap - beforeTap).toBeGreaterThan(5);
    await expect(page.locator("#founder-introduction-enter")).toBeHidden();
    await expect(page.locator("#founder-poem-reveal")).toBeHidden();
    await expect(page.locator('#founder-introduction [aria-label="Replay the animated GREATNESS POEM"]')).toHaveCount(0);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/, { timeout: 10000 });
    await page.reload();
    await expect(page.locator(".menu-toggle")).toHaveText("ENTER");
    const landingType = await page.evaluate(() => {
        const styles = (selector) => {
            const computed = getComputedStyle(document.querySelector(selector));
            return {
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                letterSpacing: computed.letterSpacing
            };
        };
        return {
            entry: styles(".menu-toggle"),
            prompt: styles("#animated-placeholder"),
            email: styles('#email-form input[type="email"]')
        };
    });
    expect(landingType.prompt).toEqual(landingType.entry);
    expect(landingType.email).toEqual(landingType.entry);
    if (page.viewportSize()?.width < 560) {
        const buttonBounds = await page.locator(".menu-toggle").evaluate((button) => {
            const bounds = button.getBoundingClientRect();
            const styles = getComputedStyle(button);
            return {
                left: bounds.left,
                right: bounds.right,
                viewportWidth: window.innerWidth,
                rightBorder: styles.borderRightWidth
            };
        });
        expect(buttonBounds.left).toBeGreaterThanOrEqual(0);
        expect(buttonBounds.right).toBeLessThanOrEqual(buttonBounds.viewportWidth);
        expect(buttonBounds.rightBorder).toBe("1px");
    }
    await page.getByRole("button", { name: "Enter experience" }).click();
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator("#founder-introduction")).not.toHaveClass(/is-open/);
    await expect(page.locator("#founder-poem-reveal")).toBeHidden();
});

test("Founder opens into the interactive four-chapter hub", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#room-transition")).toHaveClass(/is-active/);
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator(".founder-hub-item")).toHaveCount(4);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await expect(page.locator(".founder-legacy")).toHaveCount(0);
    if (page.viewportSize()?.width < 560) {
        const hubFits = await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight);
        expect(hubFits).toBe(true);
    }
    await expect(page.locator(".founder-hub-item").first()).toHaveClass(/is-selected/);
    await page.keyboard.press("ArrowDown");
    await expect(page.locator(".founder-hub-item").nth(1)).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO FOUNDER");
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO MENU");
    await page.keyboard.press("Escape");
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Founder Origin opens a kinetic pre-PoG visual archive", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await page.locator('[data-founder-section="origin"]').click();
    await expect(page.locator("#founder-hub")).toBeHidden();
    await expect(page.locator("#founder-experience")).toBeVisible();
    await expect(page.locator(".founder-origin-archive")).toHaveClass(/is-ready/, { timeout: 10000 });
    await expect(page.locator(".origin-memory")).toHaveCount(94);
    await expect(page.locator(".founder-origin-frame-header")).toHaveCount(0);
    await expect(page.locator(".founder-origin-controls")).toHaveCount(0);
    await expect(page.locator(".origin-room-credit")).toHaveText("© 2026 A GALANACCI® COMPANY");
    await expect(page.locator("#founder-room .room-return")).toHaveAttribute("aria-label", "Back to Founder");

    const firstMemory = page.locator(".origin-memory").first();
    const startingTransform = await firstMemory.evaluate((node) => node.style.transform);
    await page.waitForTimeout(150);
    await expect.poll(() => firstMemory.evaluate((node) => node.style.transform)).not.toBe(startingTransform);

    await firstMemory.click();
    await expect(page.locator(".founder-origin-archive")).toHaveClass(/is-focused/);
    await expect(firstMemory).toHaveClass(/is-focused/);
    await expect(firstMemory).toHaveAttribute("aria-pressed", "true");
    await firstMemory.click();
    await expect(page.locator(".founder-origin-archive")).not.toHaveClass(/is-focused/);
    await expect(firstMemory).toHaveAttribute("aria-pressed", "false");

    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-hub")).toBeVisible();
});

test("the OG GREATNESS tee mockup replays the poem Easter egg with SKIP", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room", skipTransition: true }
    })));
    await page.locator('[data-founder-section="origin"]').click();
    await expect(page.locator(".founder-origin-archive")).toHaveClass(/is-ready/, { timeout: 10000 });

    const easterEgg = page.locator('[data-origin-id="pre-pog-080"]');
    await easterEgg.dispatchEvent("click");
    await expect(page.locator("#founder-introduction")).toHaveClass(/is-open/);
    await expect(page.locator("#founder-introduction-skip")).toBeVisible({ timeout: 5000 });

    await page.locator("#founder-introduction-skip").click();
    await expect(page.locator("#founder-introduction")).not.toHaveClass(/is-open/, { timeout: 3000 });
    await expect(page.locator(".founder-origin-archive")).toBeVisible();
    await expect(easterEgg).toBeFocused();
});

test("Founder Journey presents eight spatial artefacts", async ({ page }) => {
    if (page.viewportSize()?.width < 560) await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "founder-room" }
    })));
    await expect(page.locator("#founder-room")).toHaveClass(/is-open/);
    await expect(page.locator("#room-transition")).not.toHaveClass(/is-active/, { timeout: 7000 });
    await page.locator('[data-founder-section="journey"]').click();
    await expect(page.locator("#founder-journey-menu-title")).toHaveText("THE JOURNEY");
    await expect(page.locator(".journey-object")).toHaveCount(8);
    await expect(page.locator(".journey-object").first()).toHaveClass(/is-selected/);
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowRight");
    await expect(page.locator('.journey-object[data-journey-entry="the-pivot"]')).toHaveClass(/is-selected/);
    await page.keyboard.press("Enter");
    await expect(page.locator(".founder-journey-count")).toHaveText("02 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("THE PIVOT");
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO JOURNEY");
    await expect(page.locator(".founder-journey-media model-viewer")).toHaveJSProperty("src", "src/founder/journey/02-the-pivot.glb");
    await expect(page.locator(".founder-journey-media model-viewer")).toHaveJSProperty("loaded", true);
    if (page.viewportSize()?.width >= 560) {
        const alignment = await page.locator(".founder-journey-entry-header").evaluate((header) => {
            const headerRect = header.getBoundingClientRect();
            const menuRect = document.querySelector("#founder-room .room-return")?.getBoundingClientRect();
            return {
                headerTop: headerRect.top,
                headerRight: headerRect.right,
                menuTop: menuRect?.top ?? -Infinity,
                viewportWidth: window.innerWidth
            };
        });
        expect(Math.abs(alignment.headerTop - alignment.menuTop)).toBeLessThanOrEqual(1);
        expect(alignment.viewportWidth - alignment.headerRight).toBe(40);
    }
    expect(await page.locator("#founder-room").evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);

    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".founder-journey-count")).toHaveText("03 / 08");
    await expect(page.locator("#founder-journey-entry-title")).toHaveText("GALANACCI");
    await page.locator("#founder-room .room-return").click();
    await expect(page.locator("#founder-journey-menu-title")).toBeVisible();
    await expect(page.locator("#founder-room .room-return")).toHaveText("← RETURN TO FOUNDER");
    await page.locator('[data-journey-entry="greatness"]').click();
    if (await page.locator('.journey-open').isVisible()) await page.locator('.journey-open').click();
    await expect(page.locator(".founder-journey-media model-viewer")).toHaveJSProperty("src", "src/founder/journey/04-greatness.glb");
    await expect(page.locator(".founder-journey-return")).toHaveText("RETURN TO MENU");
    await page.locator("#founder-room .room-return").click();
    await page.locator('[data-journey-entry="the-first-piece"]').click();
    if (await page.locator('.journey-open').isVisible()) await page.locator('.journey-open').click();
    await expect(page.locator(".founder-journey-media model-viewer")).toHaveJSProperty("src", "src/founder/journey/06-the-first-piece.glb");
    await page.locator(".founder-journey-return").click();
    await expect(page.locator("#founder-room")).not.toHaveClass(/is-open/);
    await expect(page.locator("#menu-overlay")).toHaveClass(/is-open/);
});

test("Behind the Scenes images do not zoom on hover", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "field-notes-room", skipTransition: true }
    })));
    const firstEntry = page.locator(".field-notes-chapter .field-note").first();
    await expect(firstEntry).toBeVisible();
    await firstEntry.hover();
    await expect(firstEntry.locator(".field-note-media img")).toHaveCSS("transform", "none");
});

test("Field Notes waits for entry and renders one year chapter", async ({ page }, testInfo) => {
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/field-notes.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "BEHIND THE SCENES" }).click();
    await expect(page.locator("#field-notes-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#field-notes-room .room-kicker")).toHaveText("INSTAGRAM POSTS");
    await expect(page.locator(".field-notes-year-trigger")).toBeVisible();
    await expect(page.locator(".field-notes-year-trigger")).toHaveText("2026");
    const returnBox = await page.locator("#field-notes-room [data-room-close]").boundingBox();
    const yearBox = await page.locator(".field-notes-year-trigger").boundingBox();
    const headerBox = await page.locator("#field-notes-room .field-notes-header").boundingBox();
    expect(returnBox.x + returnBox.width).toBeLessThan(yearBox.x);
    const viewport = page.viewportSize();
    const expectedEdge = testInfo.project.name === "mobile" ? 24 : 40;
    expect(Math.abs(viewport.width - yearBox.x - yearBox.width - expectedEdge)).toBeLessThanOrEqual(1);
    expect(yearBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").hover();
    expect(await page.locator(".field-notes-year-trigger").evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.locator(".field-notes-year-trigger").click();
    expect(await page.locator(".field-notes-years").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    await expect(page.locator(".field-notes-year-options")).toBeVisible();
    expect(await page.locator(".field-notes-year-options").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.locator(".field-notes-year-option.is-selected").evaluate((element) => getComputedStyle(element).color)).toBe("rgb(103, 60, 175)");
    const unselectedYear = page.locator(".field-notes-year-option:not(.is-selected)").first();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).color)).toBe("rgba(255, 255, 255, 0.45)");
    await unselectedYear.hover();
    expect(await unselectedYear.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.keyboard.press("Escape");
    if (testInfo.project.name === "desktop") {
        await page.setViewportSize({ width: 625, height: 900 });
        const mediumYearBox = await page.locator(".field-notes-year-trigger").boundingBox();
        const mediumHeaderBox = await page.locator("#field-notes-room .field-notes-header").boundingBox();
        expect(mediumYearBox.y).toBeGreaterThanOrEqual(mediumHeaderBox.y + mediumHeaderBox.height);
    }
    await expect(page.locator(".field-notes-chapter .field-note").first()).toBeVisible();
    expect(await page.locator(".field-notes-chapter .field-note").count()).toBeGreaterThan(1);
    await expect(page.locator("#field-notes-room .archive-bottom-menu")).toBeHidden();
    await expect(page.locator("#field-notes-room .room-navigation-credit")).toBeVisible();
    await expect(page.locator(".field-note-grid-count")).toHaveCount(0);
    await expect(page.locator(".field-notes-chapter")).toHaveCSS("scrollbar-width", "none");
    const currentViewport = page.viewportSize();
    const expectedSpacer = currentViewport.width <= 680 ? 12 : 20;
    expect(await page.locator(".field-notes-chapter").evaluate((element) => parseFloat(getComputedStyle(element, "::after").height))).toBe(expectedSpacer);
    await page.locator(".field-notes-chapter").evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const gridBox = await page.locator(".field-notes-list").boundingBox();
    const lastCardBox = await page.locator(".field-note-card").last().boundingBox();
    const creditBox = await page.locator("#field-notes-room .room-navigation-credit").boundingBox();
    expect(Math.abs(currentViewport.height - (gridBox.y + gridBox.height))).toBeLessThanOrEqual(1);
    expect((gridBox.y + gridBox.height) - (lastCardBox.y + lastCardBox.height)).toBeGreaterThanOrEqual(expectedSpacer);
    expect(creditBox.y + creditBox.height).toBeLessThanOrEqual(gridBox.y + gridBox.height);
    expect(requests).toBe(1);
});

test("Behind the Scenes opens a carousel viewer with the full Instagram entry", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("pog:open-room", {
        detail: { roomId: "field-notes-room", skipTransition: true }
    })));
    const firstCard = page.locator(".field-note-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    const viewer = page.locator(".field-note-viewer");
    await expect(viewer).toBeVisible();
    await expect(viewer.locator(".field-note-viewer-caption")).not.toBeEmpty();
    await expect(viewer.getByRole("link", { name: "OPEN ENTRY" })).toHaveAttribute("href", /instagram\.com/);
    const viewerImage = viewer.locator(".field-note-viewer-media img");
    await viewerImage.evaluate((image) => image.complete ? Promise.resolve() : new Promise((resolve) => image.addEventListener("load", resolve, { once: true })));
    const mediaBox = await viewer.locator(".field-note-viewer-media").boundingBox();
    const imageBox = await viewerImage.boundingBox();
    expect(Math.abs((mediaBox.x + mediaBox.width / 2) - (imageBox.x + imageBox.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs((mediaBox.y + mediaBox.height / 2) - (imageBox.y + imageBox.height / 2))).toBeLessThanOrEqual(1);
    await expect(viewer.getByRole("button", { name: "Previous carousel image" })).toHaveCSS("border-top-width", "0px");
    await expect(viewer.getByRole("button", { name: "Next carousel image" })).toHaveCSS("border-top-width", "0px");
    if ((await page.viewportSize()).width <= 680) {
        await expect(viewerImage).toHaveCSS("object-fit", "cover");
        await expect(viewer.locator(".field-note-viewer-details")).toHaveCSS("scrollbar-color", "rgb(103, 60, 175) rgba(0, 0, 0, 0)");
        expect(Math.abs(mediaBox.width - imageBox.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(mediaBox.height - imageBox.height)).toBeLessThanOrEqual(1);
    }
    const firstImage = await viewerImage.getAttribute("src");
    await viewer.getByRole("button", { name: "Next carousel image" }).click();
    await expect(viewerImage).not.toHaveAttribute("src", firstImage);
    const closeViewer = viewer.getByRole("button", { name: "Close Instagram post" });
    await closeViewer.hover();
    await closeViewer.focus();
    await expect(closeViewer).toHaveCSS("outline-style", "none");
    await expect(closeViewer).toHaveCSS("border-top-width", "0px");
    await expect(closeViewer).toHaveCSS("box-shadow", "none");
    await closeViewer.click();
    await expect(viewer).toBeHidden();
});

test("Documentary changes CRT episodes and removes playback on exit", async ({ page }) => {
    test.setTimeout(90000);
    let requests = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/data/documentary.json")) requests += 1;
    });
    await page.goto("/");
    expect(requests).toBe(0);
    await openMenu(page);
    await page.getByRole("menuitem", { name: "VIDEO JOURNAL" }).click();
    await expect(page.locator("#documentary-room")).toHaveClass(/is-open/, { timeout: 2500 });
    await expect(page.locator("#documentary-scene")).toHaveClass(/is-ready/, { timeout: 20000 });
    await expect(page.locator("#documentary-feature iframe")).toHaveCount(0);
    await expect(page.locator("#documentary-crt-player")).toHaveClass(/is-playing/, { timeout: 10000 });
    await expect(page.locator("#documentary-crt-state")).toBeHidden();
    await expect(page.locator(".documentary-crt-now-playing h3")).toContainText("RAPID PROTOTYPE MODE");
    await page.locator("#documentary-crt-previous").click();
    await expect(page.locator(".documentary-crt-now-playing h3")).toContainText("BUILDING THE POG AI SYSTEM");
    await page.locator("#documentary-environment [data-room-close]").click();
    await expect(page.locator("#documentary-crt-player iframe")).toHaveCount(0);
    expect(requests).toBe(1);
});
