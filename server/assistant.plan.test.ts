import { describe, expect, it } from "vitest";
import { createAssistantFallback } from "./routers";

describe("Data Buddy assistant fallback plan", () => {
  it("keeps guidance review-first and metadata-scoped", () => {
    const plan = createAssistantFallback({
      goal: "Prepare the customer list for CRM import",
      profile: {
        datasetName: "customers",
        rowCount: 18,
        columnCount: 5,
        completeness: 91,
        duplicateCount: 2,
        columns: [{ name: "email", inferredType: "Text", nullCount: 0, uniqueCount: 16, issue: "Format variation" }],
      },
    });

    expect(plan.summary).toContain("5-column profile");
    expect(plan.steps.some(step => step.risk === "review")).toBe(true);
    expect(plan.caution).toContain("metadata only");
    expect(plan.caution).not.toContain("raw rows were inspected");
  });
});
