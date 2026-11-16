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
    new URL("./fixtures/prompt-injection.csv", import.meta.url),
    "utf8"
  )
);
const benign = csvToRows(
  readFileSync(new URL("./fixtures/benign.csv", import.meta.url), "utf8")
);

describe("AUDIT.UNTRUSTED.CELL", () => {
  it("flags instruction-like cells as data, blocker severity, without executing them", () => {
    const finding = detect(makeContext(rows, meta));
    expect(finding?.id).toBe("AUDIT.UNTRUSTED.CELL:instruction-like-text");
    expect(finding?.severity).toBe("blocker");
    // Rows 2, 4, 7, 8 carry instruction-like text ("ignore all", "system prompt",
    // "delete all", "instruction:"). Formula text is covered by the adversarial suite.
    expect(finding?.affectedCount).toBe(4);
    expect(
      finding?.evidence.every(row => row.message.includes("not executed"))
    ).toBe(true);
  });

  it("is silent on benign files", () => {
    expect(detect(makeContext(benign, meta))).toBeNull();
  });

  it("satisfies the rule.yaml evidence contract", () => {
    expect(
      validateFindingAgainstContract(detect(makeContext(rows, meta))!, meta)
    ).toEqual([]);
  });
});
