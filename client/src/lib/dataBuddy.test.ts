import { describe, expect, it } from "vitest";
import {
  applySafeFixes,
  coerceNumberLikeValues,
  createDocumentation,
  flagRowsWithMissingValues,
  normaliseRows,
  profileRows,
  type DataRow,
} from "./dataBuddy";

const rows: DataRow[] = [
  { customer_id: 1, email: " ANA@EXAMPLE.COM ", spend: "20", region: null },
  { customer_id: 2, email: "mika@example.com", spend: "40", region: "North" },
  { customer_id: 2, email: "mika@example.com", spend: "40", region: "North" },
];

describe("Data Buddy profiling helpers", () => {
  it("profiles completeness, column information, and exact duplicates", () => {
    const profile = profileRows(rows);

    expect(profile.rowCount).toBe(3);
    expect(profile.columnCount).toBe(4);
    expect(profile.duplicateCount).toBe(1);
    expect(
      profile.columns.find(column => column.name === "region")?.nullCount
    ).toBe(1);
  });

  it("applies only deterministic trim, email-case, and exact-duplicate fixes", () => {
    const cleaned = applySafeFixes(rows);

    expect(cleaned).toHaveLength(2);
    expect(cleaned[0]?.email).toBe("ana@example.com");
  });

  it("creates a readable quality report and data dictionary", () => {
    const documentation = createDocumentation(profileRows(rows), "Customers");

    expect(documentation.quality).toContain("Customers quality report");
    expect(documentation.dictionary).toContain("### customer_id");
  });

  it("can flag missingness without replacing source values and coerce wholly numeric columns", () => {
    const flagged = flagRowsWithMissingValues(rows);
    const coerced = coerceNumberLikeValues(rows);

    expect(flagged[0]?.data_buddy_missing_review).toBe(true);
    expect(flagged[0]?.region).toBeNull();
    expect(coerced[0]?.spend).toBe(20);
  });

  it("flags a mostly numeric column with incompatible text as a type mismatch", () => {
    const profile = profileRows([
      { amount: "12" },
      { amount: "18" },
      { amount: "22" },
      { amount: "not supplied" },
      { amount: "25" },
    ]);

    expect(profile.columns[0]).toMatchObject({
      inferredType: "Number",
      issue: "Type mismatch",
    });
  });

  it("normalizes imported spreadsheet rows into safe profile inputs", () => {
    const imported = normaliseRows([
      {
        id: 1,
        received_at: new Date("2026-08-16T00:00:00.000Z"),
        empty: "",
        active: true,
        nested: { source: "sheet" },
      },
    ]);

    expect(imported).toEqual([
      {
        id: 1,
        received_at: "2026-08-16",
        empty: null,
        active: true,
        nested: "[object Object]",
      },
    ]);
  });
});
