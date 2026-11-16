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
  readFileSync(new URL("./fixtures/duplicates.csv", import.meta.url), "utf8")
);
const uniqueRows = csvToRows(
  readFileSync(new URL("./fixtures/unique.csv", import.meta.url), "utf8")
);

describe("AUDIT.DUPLICATE.EXACT", () => {
  it("reports each later duplicate with the source row it matches", () => {
    const finding = detect(makeContext(rows, meta));
    expect(finding).not.toBeNull();
    expect(finding?.id).toBe("AUDIT.DUPLICATE.EXACT:all-rows");
    expect(finding?.affectedCount).toBe(2);
    expect(finding?.evidence[0]).toMatchObject({
      rowNumber: 4,
      value: "Exact record match",
    });
    expect(finding?.evidence[0]?.message).toContain("source row 2");
    expect(finding?.repair).toBe("remove-exact-duplicates");
  });

  it("is silent when every record is unique", () => {
    expect(detect(makeContext(uniqueRows, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    const finding = detect(makeContext(rows, meta));
    expect(validateFindingAgainstContract(finding!, meta)).toEqual([]);
  });
});
