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
  readFileSync(new URL("./fixtures/mixed-types.csv", import.meta.url), "utf8")
);
const allNumeric = csvToRows(
  readFileSync(new URL("./fixtures/all-numeric.csv", import.meta.url), "utf8")
);

describe("AUDIT.TYPE.CONFLICT", () => {
  it("flags the exact text value in a mostly-numeric critical column as blocker", () => {
    const findings = detect(makeContext(rows, meta));
    const age = (findings as NonNullable<typeof findings>).find(
      finding => finding.column === "age"
    );
    expect(age?.id).toBe("AUDIT.TYPE.CONFLICT:age");
    expect(age?.severity).toBe("blocker");
    expect(age?.evidence[0]).toMatchObject({
      rowNumber: 3,
      column: "age",
      value: "unknown",
    });
  });

  it("ignores mixed columns below the 80% numeric threshold", () => {
    // amount is fully numeric here; age is fully numeric too.
    expect(detect(makeContext(allNumeric, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of detect(makeContext(rows, meta)) ?? []) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
