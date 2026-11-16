import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import {
  asText,
  criticalField,
  isBlank,
  numberLike,
} from "../../engine/primitives";

/**
 * Text values sitting in a column that is predominantly numeric.
 * The 80% threshold matches the intake type inference, so a finding here is
 * consistent with what the profile reports.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, nonBlankValues, rows, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const values = columnValues.get(column)!;
    const nonBlank = nonBlankValues.get(column)!;
    const numericCount = nonBlank.filter(numberLike).length;
    if (!nonBlank.length || numericCount / nonBlank.length < 0.8) continue;
    const nonNumericEvidence = values.flatMap((value, rowIndex) => {
      if (isBlank(value) || numberLike(value)) return [];
      return [
        {
          rowNumber: rowIndex + 2,
          column,
          value: asText(value),
          message: `This value cannot be parsed as a number while most of ${column} is numeric.`,
        },
      ];
    });
    if (!nonNumericEvidence.length) continue;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: criticalField(column) ? "blocker" : rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${numericCount} values look numeric, but ${nonNumericEvidence.length} value${nonNumericEvidence.length === 1 ? "" : "s"} cannot be parsed.`,
      affectedCount: nonNumericEvidence.length,
      column,
      evidence: nonNumericEvidence.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
