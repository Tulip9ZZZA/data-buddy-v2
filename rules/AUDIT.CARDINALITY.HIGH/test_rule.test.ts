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
    new URL("./fixtures/high-cardinality.csv", import.meta.url),
    "utf8"
  )
);
const categorical = csvToRows(
  readFileSync(new URL("./fixtures/categorical.csv", import.meta.url), "utf8")
);

describe("AUDIT.CARDINALITY.HIGH", () => {
  it("asks for confirmation on near-unique non-identifier columns", () => {
    const findings = detect(makeContext(rows, meta)) as NonNullable<
      typeof findings
    >;
    const city = findings.find(finding => finding.column === "city");
    expect(city?.id).toBe("AUDIT.CARDINALITY.HIGH:city");
    expect(city?.severity).toBe("info");
    expect(city?.description).toContain(
      "100% of non-blank values are distinct"
    );
    // user_id is excluded by the identifier-name heuristic.
    expect(
      findings.find(finding => finding.column === "user_id")
    ).toBeUndefined();
  });

  it("is silent on genuinely categorical columns", () => {
    expect(detect(makeContext(categorical, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    for (const finding of detect(makeContext(rows, meta)) ?? []) {
      expect(validateFindingAgainstContract(finding, meta)).toEqual([]);
    }
  });
});
