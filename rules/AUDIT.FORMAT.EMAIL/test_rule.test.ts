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
    new URL("./fixtures/invalid-emails.csv", import.meta.url),
    "utf8"
  )
);
const validRows = csvToRows(
  readFileSync(new URL("./fixtures/valid-emails.csv", import.meta.url), "utf8")
);

describe("AUDIT.FORMAT.EMAIL", () => {
  it("runs only on columns named like email fields and flags pattern failures", () => {
    const finding = (
      detect(makeContext(rows, meta)) as NonNullable<typeof finding>[]
    )[0];
    expect(finding?.id).toBe("AUDIT.FORMAT.EMAIL:contact_email");
    expect(finding?.affectedCount).toBe(1);
    expect(finding?.evidence[0]).toMatchObject({
      rowNumber: 3,
      value: "not-an-email",
    });
  });

  it("accepts valid addresses and ignores blank cells", () => {
    expect(detect(makeContext(validRows, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of (detect(makeContext(rows, meta)) ??
      []) as NonNullable<typeof finding>[]) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
