import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  validateFindingAgainstContract,
  type RuleMeta,
} from "../../engine/contract";
import { csvToRows } from "../../engine/fixtureLoader";
import { makeContext } from "../../engine/testing";
import { isBlank } from "../../engine/primitives";
import { detect } from "./detector";

const meta = parse(
  readFileSync(new URL("./rule.yaml", import.meta.url), "utf8")
) as RuleMeta;
const rows = csvToRows(
  readFileSync(
    new URL("./fixtures/missing-values.csv", import.meta.url),
    "utf8"
  )
);
const cleanRows = csvToRows(
  readFileSync(new URL("./fixtures/clean.csv", import.meta.url), "utf8")
);
const placeholderRows = csvToRows("id,answer\n1,?\n2,42\n3,na\n4,-\n", {});

describe("AUDIT.MISSING.VALUES", () => {
  it("flags blank and placeholder cells with source-row evidence", () => {
    const findings = detect(makeContext(rows, meta));
    expect(Array.isArray(findings)).toBe(true);
    const byColumn = new Map(
      (findings as NonNullable<typeof findings>).map(finding => [
        finding.column,
        finding,
      ])
    );
    // age (critical) escalates to blocker; note (non-critical) stays at review.
    expect(byColumn.get("age")?.severity).toBe("blocker");
    expect(byColumn.get("note")?.severity).toBe("review");
    // Only one true blank: "unknown" is a type conflict, not a missing value.
    expect(byColumn.get("age")?.affectedCount).toBe(1);
    expect(byColumn.get("email")?.affectedCount).toBe(1);
    expect(byColumn.get("age")?.evidence[0]).toMatchObject({
      rowNumber: 3,
      column: "age",
      value: "blank",
    });
  });

  it("treats the UCI Adult '?' placeholder as missing (ground-truth finding, ADR-11)", () => {
    expect(isBlank("?")).toBe(true);
    const findings = (detect(makeContext(placeholderRows, meta)) ??
      []) as NonNullable<typeof findings>[];
    const answers = findings.find(finding => finding.column === "answer");
    expect(answers?.affectedCount).toBe(3); // "?", "na", "-"
  });

  it("is silent on a fully populated file", () => {
    expect(detect(makeContext(cleanRows, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract for every finding", () => {
    const findings = detect(makeContext(rows, meta)) ?? [];
    for (const finding of findings)
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
  });
});
