import { defineConfig } from "@playwright/test";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT || 3222);

export default defineConfig({
  testDir: path.resolve(import.meta.dirname, "tests/e2e"),
  outputDir: path.resolve(import.meta.dirname, "tests/e2e/artifacts"),
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // one server, deterministic flows
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/report", open: "never" }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `NODE_ENV=production PORT=${PORT} node dist/index.js`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
});
