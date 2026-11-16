import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import {
  isBlank,
  numberLike,
  quantile,
  toNumber,
} from "../../engine/primitives";

/**
 * Tukey IQR outliers. The bounds in the finding text are computed with the
 * same quantile method the remediation preview uses, so evidence and repair
 * always agree.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { columnValues, rule } = context;
  const findings: AuditFinding[] = [];
  for (const column of context.columns) {
    const values = columnValues.get(column)!;
    const numericRows = values
      .map((value, rowIndex) => ({ value, rowIndex }))
      .filter(({ value }) => !isBlank(value) && numberLike(value))
      .map(({ value, rowIndex }) => ({ value: toNumber(value), rowIndex }))
      .filter(({ value }) => Number.isFinite(value));
    if (numericRows.length < 8) continue;
    // Contract eligibility (see rule.yaml): IQR fences are meaningless on
    // discrete count columns (e.g. Parch/SibSp: 7 distinct values) and on
    // identifier-like columns (Ticket). Skip those instead of flooding the
    // queue with noise — measured on the ground-truth set, see RESULTS.md.
    const distinctValues = new Set(numericRows.map(item => item.value)).size;
    if (distinctValues <= 10 || /(id|name|ticket|code)/i.test(column)) continue;
    const sorted = numericRows
      .map(item => item.value)
      .sort((left, right) => left - right);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    if (q1 === undefined || q3 === undefined) continue;
    const spread = q3 - q1;
    const lower = q1 - spread * 1.5;
    const upper = q3 + spread * 1.5;
    const outliers = numericRows.flatMap(({ value, rowIndex }) =>
      value < lower || value > upper
        ? [
            {
              rowNumber: rowIndex + 2,
              column,
              value: String(value),
              message: `Outside IQR review bounds of ${lower.toFixed(2)} to ${upper.toFixed(2)}.`,
            },
          ]
        : []
    );
    if (!outliers.length) continue;
    findings.push({
      id: `${rule.id}:${column}`,
      rule: rule.id,
      severity: rule.defaultSeverity,
      title: rule.title.replace("{column}", column),
      description: `${outliers.length} value${outliers.length === 1 ? "" : "s"} fall outside the 1.5× IQR review bounds. This is a review signal, not proof of an error.`,
      affectedCount: outliers.length,
      column,
      evidence: outliers.slice(0, rule.evidenceLimit),
      repair: rule.repair ?? undefined,
    });
  }
  return findings.length ? findings : null;
}
