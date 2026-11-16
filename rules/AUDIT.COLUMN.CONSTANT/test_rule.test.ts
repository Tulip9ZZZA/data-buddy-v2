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
    new URL("./fixtures/constant-column.csv", import.meta.url),
    "utf8"
  )
);
const varying = csvToRows(
  readFileSync(
    new URL("./fixtures/varying-column.csv", import.meta.url),
    "utf8"
  )
);

describe("AUDIT.COLUMN.CONSTANT", () => {
  it("reports columns whose non-blank values are all identical", () => {
    const finding = (
      detect(makeContext(rows, meta)) as NonNullable<typeof finding>[]
    )[0];
    expect(finding?.id).toBe("AUDIT.COLUMN.CONSTANT:export_source");
    expect(finding?.severity).toBe("info");
    expect(finding?.description).toContain(
      'Every non-blank value is "CRM_EXPORT"'
    );
    expect(finding?.affectedCount).toBe(12);
  });

  it("is silent when the column carries more than one value", () => {
    expect(detect(makeContext(varying, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of (detect(makeContext(rows, meta)) ??
      []) as NonNullable<typeof finding>[]) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
