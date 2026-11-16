import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText, isBlank, numberLike, toNumber } from "../../engine/primitives";

/**
 * Range review based on column semantics inferred from the name.
 * Age escalates to blocker (a negative age corrupts any cohort analysis);
 * other range families stay at review.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const values = columnValues.get(column)!;
    const rangeEvidence = values.flatMap((value, rowIndex) => {
      if (isBlank(value) || !numberLike(value)) return [];
      const parsed = toNumber(value);
      const isAge = /age/i.test(column) && (parsed < 0 || parsed > 120);
      const shouldBePositive =
        /(fare|price|amount|count|quantity|orders)/i.test(column) && parsed < 0;
      return isAge || shouldBePositive
        ? [
            {
              rowNumber: rowIndex + 2,
              column,
              value: asText(value),
              message: isAge
                ? "Age is outside the configured 0–120 review range."
                : "This field is expected to be non-negative based on its name.",
            },
          ]
        : [];
    });
    if (!rangeEvidence.length) continue;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: /age/i.test(column) ? "blocker" : rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${rangeEvidence.length} value${rangeEvidence.length === 1 ? "" : "s"} fall outside the documented review range.`,
      affectedCount: rangeEvidence.length,
      column,
      evidence: rangeEvidence.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
