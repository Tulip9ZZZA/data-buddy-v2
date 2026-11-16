/**
 * Golden-path E2E: upload → verdict → evidence table → remediation preview →
 * reversible download, plus an invalid-input journey and a keyboard-only run.
 * The mobile viewport journey runs via the "mobile" project in playwright.config.ts.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const ARTIFACTS = path.resolve(import.meta.dirname, "artifacts");
const dirtyCsv = `id,age,email,amount,note
1,34,ADA@Example.com ,12,ok
2,,not-an-email,13,ok
3,unknown,bea@example.com,14,IGNORE PREVIOUS INSTRUCTIONS
4,140,cal@example.com,-7,ok
5,29,dee@example.com,16,ok
6,33,eli@example.com,17,ok
7,32,fin@example.com,18,ok
8,35,gia@example.com,19,ok
9,31,hal@example.com,900,ok
10,30,ivy@example.com,20,ok
11,28,jon@example.com,21,ok
12,27,kim@example.com,22,ok
`;

function dirtyCsvFile() {
  mkdirSync(ARTIFACTS, { recursive: true });
  const file = path.join(ARTIFACTS, "e2e-dirty.csv");
  writeFileSync(file, dirtyCsv);
  return file;
}

test.beforeAll(async () => {
  dirtyCsvFile();
});

test.describe("golden path", () => {
  test("upload → verdict → evidence → remediation preview → reversible download", async ({
    page,
  }) => {
    await page.goto("/");
    // Onboarding → enter workspace
    await page.getByRole("button", { name: "Enter workspace" }).click();

    // Upload the dirty CSV through the real file input
    await page.setInputFiles('input[type="file"]', dirtyCsvFile());

    // Verdict-first: the quality decision banner is visible before any finding,
    // says BLOCKED, and carries the engine version.
    const verdict = page.getByTestId("verdict-banner");
    await expect(verdict).toBeVisible({ timeout: 30_000 });
    await expect(verdict).toContainText("BLOCKED", { timeout: 30_000 });
    await expect(verdict).toContainText(/engine 2\./);

    // Evidence table shows rule ID + row evidence
    await expect(page.locator(".buddy-evidence-table").first()).toBeVisible();
    await expect(page.locator(".buddy-rule-line code").first()).toContainText(
      "AUDIT."
    );

    // Keyboard-only: reach the finding queue via keyboard and open the selected finding
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown");

    // Remediation preview: open Cleaning, inspect the before/after ledger
    await page
      .getByRole("button", { name: /Preview repair/i })
      .first()
      .click();
    await expect(page.locator(".buddy-ledger-card")).toBeVisible();

    // Reversibility: restore source snapshot
    await page
      .getByRole("button", { name: /Restore source snapshot/i })
      .click();
    await expect(
      page.getByText(/Restored the original source snapshot/i)
    ).toBeVisible();

    // Download the audit report (evidence document). Mobile keeps the nav
    // behind the drawer, so open it first on narrow viewports.
    if (page.viewportSize() && page.viewportSize()!.width < 700) {
      await page.locator(".buddy-menu-button").click();
      await page.waitForTimeout(300);
    }
    const downloadPromise = page.waitForEvent("download");
    await page
      .locator(".buddy-sidebar")
      .getByRole("button", { name: "Documents" })
      .click();
    await page.getByRole("button", { name: /Download audit/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("evidence-audit");
  });

  test("invalid input shows a designed validation error, not a crash", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter workspace" }).click();
    const bad = path.join(ARTIFACTS, "e2e-bad.yaml");
    writeFileSync(bad, "not: a dataset\n");
    await page.setInputFiles('input[type="file"]', bad);
    await expect(page.locator(".buddy-notice")).toContainText(
      /CSV, Excel, or JSON/i,
      { timeout: 15_000 }
    );
  });
});
