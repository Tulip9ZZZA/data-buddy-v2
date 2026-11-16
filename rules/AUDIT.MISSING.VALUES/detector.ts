import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText, criticalField, isBlank } from "../../engine/primitives";

/**
 * Blank or placeholder values per column, with the exact source rows.
 * Row numbers are 1-based including the header line, matching what a
 * spreadsheet shows the user (data row i → source row i + 2).
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, rows, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const values = columnValues.get(column)!;
    const missingEvidence = values.flatMap((value, rowIndex) =>
      isBlank(value)
        ? [
            {
              rowNumber: rowIndex + 2,
              column,
              value: "blank",
              message: `${column} has no usable value.`,
            },
          ]
        : []
    );
    if (!missingEvidence.length) continue;
    const severity = criticalField(column) ? "blocker" : rule.defaultSeverity;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity,
      title: rule.title.replace("{column}", column),
      description: `${missingEvidence.length} of ${rows.length} source rows have a blank or placeholder value.`,
      affectedCount: missingEvidence.length,
      column,
      evidence: missingEvidence.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
