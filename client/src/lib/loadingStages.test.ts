import { describe, expect, it } from "vitest";
import { getLoadingStage, loadingStream } from "./loadingStages";

describe("Data Buddy loading stages", () => {
  it("keeps the visible terminal stream in the truthful file-audit order", () => {
    expect(loadingStream).toEqual([
      "intake",
      "parse",
      "types",
      "duplicates",
      "evidence",
      "complete",
    ]);
  });

  it("maps a completed loading sequence to a clear, non-destructive user message", () => {
    const complete = getLoadingStage("complete");
    expect(complete.left).toBe("READY");
    expect(complete.detail).toContain("original file is untouched");
  });
});
