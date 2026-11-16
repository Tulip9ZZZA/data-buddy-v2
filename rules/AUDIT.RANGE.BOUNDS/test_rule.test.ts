import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  validateFindingAgainstContract,
  type RuleMeta,
} from "../../engine/contract";
import { csvToRows } from "../../engine/fixtureLoader";
import { makeContext } from "../../engine/testing";
import { detect } from "./detector";

const meta = parse(
  readFileSync(new URL("./rule.yaml", import.meta.url), "utf8")
) as RuleMeta;
const rows = csvToRows(
  readFileSync(
    new URL("./fixtures/range-violations.csv", import.meta.url),
    "utf8"
  )
);
const inRange = csvToRows(
  readFileSync(new URL("./fixtures/in-range.csv", import.meta.url), "utf8")
);

describe("AUDIT.RANGE.BOUNDS", () => {
  it("escalates age violations to blocker and keeps original values in evidence", () => {
    const findings = detect(makeContext(rows, meta)) as NonNullable<
      typeof findings
    >;
    const age = findings.find(finding => finding.column === "age");
    expect(age?.severity).toBe("blocker");
    expect(age?.affectedCount).toBe(2);
    expect(age?.evidence.map(row => row.value)).toEqual(["140", "-3"]);
    expect(age?.repair).toBe("flag-range");
  });

  it("treats negative order counts as review, not blocker", () => {
    const findings = detect(makeContext(rows, meta)) as NonNullable<
      typeof findings
    >;
    const orders = findings.find(finding => finding.column === "orders");
    expect(orders?.severity).toBe("review");
    expect(orders?.evidence[0]).toMatchObject({ rowNumber: 5, value: "-1" });
  });

  it("is silent when all values are in range", () => {
    expect(detect(makeContext(inRange, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of detect(makeContext(rows, meta)) ?? []) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
