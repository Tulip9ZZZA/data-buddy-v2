import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { asText, isBlank } from "../../engine/primitives";

const dangerousCellPattern =
  /ignore\s+(all|previous)|delete\s+all|system\s+prompt|instruction\s*:/i;

/**
 * Prompt-injection surface, handled as data.
 * The pattern only REPORTS; it cannot execute anything (the engine has no
 * eval, no model calls in the audit path) and no code path reads cell text
 * as configuration. See security/adversarial.md case ADV-05.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { rows, rule } = context;
  const untrustedCells = rows.flatMap((row, rowIndex) =>
    Object.entries(row).flatMap(([column, value]) => {
      if (isBlank(value) || !dangerousCellPattern.test(asText(value)))
        return [];
      return [
        {
          rowNumber: rowIndex + 2,
          column,
          value: asText(value),
          message:
            "Instruction-like text is treated as untrusted data and was not executed.",
        },
      ];
    })
  );
  if (!untrustedCells.length) return null;
  const finding: AuditFinding = {
    id: `${rule.id}:instruction-like-text`,
    rule: rule.id,
    severity: rule.defaultSeverity,
    title: rule.title,
    description: `${untrustedCells.length} cell${untrustedCells.length === 1 ? " contains" : "s contain"} instruction-like text. Data Buddy treats this content as data only.`,
    affectedCount: untrustedCells.length,
    evidence: untrustedCells.slice(0, rule.evidenceLimit),
  };
  return finding;
}
