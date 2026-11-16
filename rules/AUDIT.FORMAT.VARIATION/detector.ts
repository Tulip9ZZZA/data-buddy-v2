import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { isBlank } from "../../engine/primitives";

/**
 * Formatting drift against the deterministic normalization policy.
 * The policy is identical to the one previewRemediation() applies, so the
 * finding and the repair can never disagree.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const values = columnValues.get(column)!;
    const formattingEvidence = values.flatMap((value, rowIndex) => {
      if (typeof value !== "string" || isBlank(value)) return [];
      const normalized = /email/i.test(column)
        ? value.trim().toLowerCase()
        : value.trim();
      return value === normalized
        ? []
        : [
            {
              rowNumber: rowIndex + 2,
              column,
              value,
              message: `Formatting differs from the deterministic ${/email/i.test(column) ? "trim-and-lowercase email" : "trimmed text"} policy.`,
            },
          ];
    });
    if (!formattingEvidence.length) continue;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${formattingEvidence.length} text value${formattingEvidence.length === 1 ? "" : "s"} would change under a reversible normalization policy.`,
      affectedCount: formattingEvidence.length,
      column,
      evidence: formattingEvidence.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
