import { describe, expect, it } from "vitest";
import { runRuleAudit, type RunAuditResult } from "./runAudit";
import { ruleRegistry } from "../rules/registry.generated";
import { deriveVerdict, type DataRow, type RuleDetector } from "./contract";
import {
  SafeRejection,
  applyIntakeGuards,
  truncateCellText,
  validateWorkbookDimensions,
  MAX_CELL_CHARS,
} from "./guards";

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

describe("runRuleAudit (engine runner)", () => {
  it("produces a deterministic, severity-sorted report with a verdict", () => {
    const report = runRuleAudit(rows, ruleRegistry);
    expect(report.verdict).toBe("blocked");
    expect(report.counts.blocker).toBeGreaterThanOrEqual(2);
    const severities = report.findings.map(finding => finding.severity);
    expect(severities).toEqual(
      [...severities].sort(
        (a, b) =>
          ({ blocker: 0, review: 1, info: 2 })[a]! -
          { blocker: 0, review: 1, info: 2 }[b]!
      )
    );
    // Deterministic order across runs.
    const second = runRuleAudit(rows, ruleRegistry);
    expect(second.findings.map(finding => finding.id)).toEqual(
      report.findings.map(finding => finding.id)
    );
  });

  it("returns an empty, safe report for an empty dataset", () => {
    const report = runRuleAudit([], ruleRegistry);
    expect(report.rowCount).toBe(0);
    expect(report.findings).toEqual([]);
    expect(report.verdict).toBe("safe");
    expect(report.contractViolations).toEqual([]);
  });

  it("collects contract violations in normal mode and throws in strict mode", () => {
    const rogue: RuleDetector = {
      meta: {
        id: "AUDIT.TEST.ROGUE",
        name: "rogue",
        version: "1.0.0",
        title: "rogue",
        description: "a detector that breaks the evidence contract on purpose",
        defaultSeverity: "review",
        repair: null,
        tags: [],
        evidenceLimit: 10,
        evidenceFields: ["rowNumber", "value", "message"],
      },
      detect: () => ({
        id: "AUDIT.TEST.ROGUE:x",
        rule: "AUDIT.TEST.ROGUE",
        severity: "review",
        title: "no evidence",
        description: "claims without evidence",
        affectedCount: 3,
        evidence: [],
      }),
    };
    const report = runRuleAudit(rows, [rogue]);
    expect(report.contractViolations.join(" ")).toContain(
      "evidence must not be empty"
    );
    expect(() => runRuleAudit(rows, [rogue], { strict: true })).toThrow(
      /Contract violation/
    );
  });

  it("derives the verdict from severity counts", () => {
    expect(deriveVerdict({ blocker: 1, review: 5, info: 9 })).toBe("blocked");
    expect(deriveVerdict({ blocker: 0, review: 1, info: 9 })).toBe("review");
    expect(deriveVerdict({ blocker: 0, review: 0, info: 9 })).toBe("safe");
  });
});

describe("intake guards (adversarial defense)", () => {
  it("rejects row bombs above the hard limit", () => {
    expect(() => applyIntakeGuards({ length: 10_000_001 }, 3)).toThrow(
      SafeRejection
    );
    try {
      applyIntakeGuards({ length: 10_000_001 }, 3);
    } catch (error) {
      expect((error as SafeRejection).code).toBe("ROWS_ABOVE_HARD_LIMIT");
    }
  });

  it("rejects column bombs above the column ceiling", () => {
    expect(() => applyIntakeGuards({ length: 5 }, 2_001)).toThrow(
      SafeRejection
    );
  });

  it("switches duplicate detection to sampled mode above the dedupe limit", () => {
    const state = applyIntakeGuards({ length: 2_000_001 }, 3);
    expect(state.dedupeSampled).toBe(true);
    const normal = applyIntakeGuards({ length: 1_999_999 }, 3);
    expect(normal.dedupeSampled).toBe(false);
  });

  it("rejects workbooks whose declared dimensions are cell bombs before parsing", () => {
    expect(() => validateWorkbookDimensions("A1:XFD1048576", "Bomb")).toThrow(
      /declares/
    );
    expect(() => validateWorkbookDimensions("A1:T1000", "Fine")).not.toThrow();
    expect(() => validateWorkbookDimensions(undefined, "Empty")).not.toThrow();
  });

  it("truncates oversized cell text for evidence display only", () => {
    const state = applyIntakeGuards({ length: 1 }, 1);
    const hostile = "A".repeat(MAX_CELL_CHARS + 500);
    const shown = truncateCellText(hostile, state);
    expect(shown.length).toBeLessThan(hostile.length);
    expect(shown).toContain("[truncated");
    expect(state.truncatedCells).toBe(1);
  });

  it("runs the full registry over 2,000,001 duplicate rows without exploding memory (sampled mode)", () => {
    const sharedRow: DataRow = { id: 1, name: "dupe", city: "same" };
    const bomb = new Array(2_000_001).fill(sharedRow);
    const report: RunAuditResult = runRuleAudit(bomb, ruleRegistry);
    expect(report.rowCount).toBe(2_000_001);
    expect(report.sampled).toBe(true);
    const duplicates = report.findings.find(
      finding => finding.rule === "AUDIT.DUPLICATE.EXACT"
    );
    expect(duplicates?.sampled).toBe(true);
    expect(duplicates?.description).toContain("Sampled mode");
    expect(duplicates?.evidence.length).toBeLessThanOrEqual(10);
  }, 60_000);
});
