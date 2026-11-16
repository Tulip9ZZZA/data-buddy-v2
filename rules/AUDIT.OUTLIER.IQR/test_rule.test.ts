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
  readFileSync(new URL("./fixtures/iqr-outliers.csv", import.meta.url), "utf8")
);
const noOutliers = csvToRows(
  readFileSync(new URL("./fixtures/no-outliers.csv", import.meta.url), "utf8")
);

describe("AUDIT.OUTLIER.IQR", () => {
  it("reports values outside the 1.5×IQR fences with the computed bounds", () => {
    const finding = (
      detect(makeContext(rows, meta)) as NonNullable<typeof finding>[]
    )[0];
    expect(finding?.id).toBe("AUDIT.OUTLIER.IQR:fare");
    expect(finding?.affectedCount).toBe(1);
    expect(finding?.evidence[0]).toMatchObject({
      rowNumber: 13,
      value: "1000",
    });
    expect(finding?.evidence[0]?.message).toContain("IQR review bounds");
    expect(finding?.description).toContain("review signal");
  });

  it("needs at least 8 numeric values before it speaks", () => {
    expect(detect(makeContext(noOutliers, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of (detect(makeContext(rows, meta)) ??
      []) as NonNullable<typeof finding>[]) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
