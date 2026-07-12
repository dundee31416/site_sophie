import { defineConfig, devices } from "@playwright/test";

// The stack is external: run `docker compose up -d` first (see local-stack-verify).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    // French-first site: detectInitialLang falls back to navigator.language,
    // so pin a non-English locale to make the default deterministic.
    locale: "fr-CA",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
