import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText } from "../../engine/primitives";

/**
 * Nearly-unique columns that do not announce themselves as identifiers.
 * Informational: high cardinality is a design smell, not a data error.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, nonBlankValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const nonBlank = nonBlankValues.get(column)!;
    if (nonBlank.length < 12) continue;
    const cardinality = new Set(nonBlank.map(asText)).size / nonBlank.length;
    if (cardinality <= 0.97 || /(id|name|email|ticket|code)/i.test(column))
      continue;
    const values = columnValues.get(column)!;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${Math.round(cardinality * 100)}% of non-blank values are distinct. Confirm whether this field is meant to be a category or an identifier.`,
      affectedCount: nonBlank.length,
      column,
      evidence: values.slice(0, rule.evidenceLimit).map((value, rowIndex) => ({
        rowNumber: rowIndex + 2,
        column,
        value: asText(value),
        message: "Representative value for a high-cardinality field.",
      })),
    });
  }
  return findings.length ? findings : null;
}
