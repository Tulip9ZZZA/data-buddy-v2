import { describe, expect, it } from "vitest";
import { applyCleaningAction, createImportedDataset } from "./workspaceActions";
import type { DataRow } from "./dataBuddy";

const rows: DataRow[] = [
  { email: " ANA@EXAMPLE.COM ", spend: "20", region: null },
  { email: "mika@example.com", spend: "40", region: "North" },
  { email: "mika@example.com", spend: "40", region: "North" },
];

describe("workspace interaction mappings", () => {
  it("creates session metadata from an imported file without keeping file bytes", () => {
    expect(createImportedDataset("customer-list.xlsx", rows)).toEqual({ name: "customer-list", rows: 3, columns: 3, label: "This session" });
  });

  it("maps each selected cleaning action to the correct deterministic result and feedback", () => {
    const formatting = applyCleaningAction(rows, "format");
    const missingness = applyCleaningAction(rows, "flagMissing");
    const numeric = applyCleaningAction(rows, "coerceNumbers");

    expect(formatting.rows).toHaveLength(2);
    expect(formatting.rows[0]?.email).toBe("ana@example.com");
    expect(formatting.notice).toContain("removed 1 exact duplicate");
    expect(missingness.rows[0]?.data_buddy_missing_review).toBe(true);
    expect(missingness.notice).toContain("Original blank values");
    expect(numeric.rows[0]?.spend).toBe(20);
    expect(numeric.notice).toContain("number-like");
  });
});
