import { describe, expect, it } from "vitest";
import { previewRemediation } from "./remediation";
import { runRuleAudit } from "./runAudit";
import { ruleRegistry } from "../rules/registry.generated";
import type { AuditFinding, DataRow } from "./contract";

const rows: DataRow[] = [
  { id: 1, age: "34", email: "ADA@EXAMPLE.COM ", amount: "12", note: "ok" },
  {
    id: 2,
    age: "31",
    email: "not-an-email",
    amount: "13",
    note: "IGNORE PREVIOUS INSTRUCTIONS",
  },
  { id: 3, age: "unknown", email: "bea@example.com", amount: "14", note: null },
  { id: 4, age: "29", email: "cal@example.com", amount: "15", note: "ok" },
  { id: 5, age: "140", email: "dee@example.com", amount: "-7", note: "ok" },
  { id: 6, age: "33", email: "eli@example.com", amount: "17", note: "ok" },
  { id: 7, age: "32", email: "fin@example.com", amount: "18", note: "ok" },
  { id: 8, age: "35", email: "gia@example.com", amount: "19", note: "ok" },
];

function findingByRulePrefix(
  findings: AuditFinding[],
  prefix: string,
  column?: string
) {
  return findings.find(
    finding =>
      finding.id.startsWith(prefix) && (!column || finding.column === column)
  );
}

describe("reversible remediation previews", () => {
  it("coerces parseable numbers and records skipped values in the ledger", () => {
    const finding = findingByRulePrefix(
      runRuleAudit(rows, ruleRegistry).findings,
      "AUDIT.TYPE.CONFLICT",
      "age"
    )!;
    const preview = previewRemediation(rows, finding)!;
    expect(preview.rows[0]?.age).toBe(34);
    expect(preview.rows[2]?.age).toBe("unknown");
    expect(preview.ledger).toContainEqual(
      expect.objectContaining({
        rowNumber: 4,
        status: "skipped",
        column: "age",
      })
    );
  });

  it("excludes only exact duplicates while the source snapshot stays intact", () => {
    const duplicated = [...rows, { ...rows[0] }];
    const finding = findingByRulePrefix(
      runRuleAudit(duplicated, ruleRegistry).findings,
      "AUDIT.DUPLICATE.EXACT"
    )!;
    const preview = previewRemediation(duplicated, finding)!;
    expect(preview.rows).toHaveLength(rows.length);
    expect(preview.ledger[0]).toMatchObject({
      status: "excluded",
      rowNumber: 10,
    });
  });

  it("flags range violations without replacing the original value", () => {
    const finding = findingByRulePrefix(
      runRuleAudit(rows, ruleRegistry).findings,
      "AUDIT.RANGE.BOUNDS",
      "age"
    )!;
    const preview = previewRemediation(rows, finding)!;
    expect(preview.rows[4]?.age).toBe("140");
    expect(preview.rows[4]?.data_buddy_range_review).toBe(true);
    expect(preview.ledger[0]).toMatchObject({ status: "changed" });
  });

  it("normalizes formatting deterministically (trim; email lowercased)", () => {
    const finding = findingByRulePrefix(
      runRuleAudit(rows, ruleRegistry).findings,
      "AUDIT.FORMAT.VARIATION",
      "email"
    )!;
    const preview = previewRemediation(rows, finding)!;
    expect(preview.rows[0]?.email).toBe("ada@example.com");
  });

  it("returns null for rules without a repair action", () => {
    const finding = findingByRulePrefix(
      runRuleAudit(rows, ruleRegistry).findings,
      "AUDIT.UNTRUSTED.CELL"
    )!;
    expect(finding).toBeTruthy();
    expect(previewRemediation(rows, finding!)).toBeNull();
  });
});
