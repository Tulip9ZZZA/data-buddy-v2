import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText, isBlank } from "../../engine/primitives";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Basic-shape email validation for columns named like email fields. */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    if (!/email/i.test(column)) continue;
    const values = columnValues.get(column)!;
    const invalidEmails = values.flatMap((value, rowIndex) => {
      if (isBlank(value) || emailPattern.test(asText(value).trim())) return [];
      return [
        {
          rowNumber: rowIndex + 2,
          column,
          value: asText(value),
          message: "This value does not match a basic email address pattern.",
        },
      ];
    });
    if (!invalidEmails.length) continue;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${invalidEmails.length} value${invalidEmails.length === 1 ? "" : "s"} fail a basic email pattern check.`,
      affectedCount: invalidEmails.length,
      column,
      evidence: invalidEmails.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
