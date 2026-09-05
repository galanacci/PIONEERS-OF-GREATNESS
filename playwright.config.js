import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "tests/browser",
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure"
    },
    webServer: {
        command: "python -m http.server 4173 --bind 127.0.0.1",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile", use: { ...devices["Pixel 5"] } }
    ]
});
