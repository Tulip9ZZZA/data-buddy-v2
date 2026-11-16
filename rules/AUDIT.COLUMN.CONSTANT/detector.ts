import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText } from "../../engine/primitives";

/**
 * Zero-variance columns. Added in v2 as the first rule written against the
 * rules-as-data framework (not migrated from v1), which is the regression
 * test for "a new rule is folder + yaml + detector + tests, nothing else".
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, nonBlankValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const nonBlank = nonBlankValues.get(column)!;
    if (nonBlank.length < 12) continue;
    const distinct = new Set(nonBlank.map(asText));
    if (distinct.size !== 1) continue;
    const constantValue = asText(nonBlank[0]!);
    const values = columnValues.get(column)!;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `Every non-blank value is "${constantValue}". The column carries no analysis signal; confirm it is intentional metadata.`,
      affectedCount: nonBlank.length,
      column,
      evidence: values.slice(0, rule.evidenceLimit).map((value, rowIndex) => ({
        rowNumber: rowIndex + 2,
        column,
        value: asText(value),
        message: `Constant value across ${nonBlank.length} non-blank rows.`,
      })),
    });
  }
  return findings.length ? findings : null;
}
