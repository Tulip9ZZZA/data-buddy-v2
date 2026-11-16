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
  readFileSync(new URL("./fixtures/format-drift.csv", import.meta.url), "utf8")
);
const normalised = csvToRows(
  readFileSync(new URL("./fixtures/normalised.csv", import.meta.url), "utf8")
);

describe("AUDIT.FORMAT.VARIATION", () => {
  it("flags values that the reversible normalizer would change, as info", () => {
    const findings = detect(makeContext(rows, meta));
    expect(Array.isArray(findings)).toBe(true);
    const name = (findings as NonNullable<typeof findings>).find(
      finding => finding.column === "name"
    );
    const email = (findings as NonNullable<typeof findings>).find(
      finding => finding.column === "email"
    );
    expect(name?.severity).toBe("info");
    expect(name?.evidence[0]).toMatchObject({
      rowNumber: 2,
      column: "name",
      value: " Ada Lovelace ",
    });
    expect(email?.evidence.map(row => row.rowNumber)).toContain(7); // PAM@EXAMPLE.COM
  });

  it("is silent when every value is already canonical", () => {
    expect(detect(makeContext(normalised, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of detect(makeContext(rows, meta)) ?? []) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
