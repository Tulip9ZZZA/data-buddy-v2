/**
 * Reversible remediation previews.
 *
 * The product wedge: the original file is NEVER mutated. Every repair is a
 * preview over a working copy, and every change (or deliberate skip) is
 * recorded in a ledger a human can audit before applying anything.
 */
import type {
  AuditFinding,
  AuditReport,
  DataRow,
  LedgerEntry,
  RepairAction,
  RemediationPreview,
} from "./types";
import {
  asText,
  isBlank,
  numberLike,
  quantile,
  rowIdentity,
  toNumber,
} from "./primitives";

export type {
  AuditFinding,
  AuditReport,
  DataRow,
  LedgerEntry,
  RepairAction,
  RemediationPreview,
} from "./types";

export function previewRemediation(
  rows: DataRow[],
  finding: AuditFinding
): RemediationPreview | null {
  const action = finding.repair;
  if (!action) return null;
  const ledger: LedgerEntry[] = [];
  const column = finding.column;
  let nextRows = rows.map(row => ({ ...row }));

  if (action === "normalize-formatting") {
    nextRows = rows.map(
      (row, rowIndex) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            if (typeof value !== "string") return [key, value];
            const normalized = /email/i.test(key)
              ? value.trim().toLowerCase()
              : value.trim();
            if (normalized !== value)
              ledger.push({
                rowNumber: rowIndex + 2,
                column: key,
                status: "changed",
                before: value,
                after: normalized,
                reason: "Applied deterministic text normalization.",
              });
            return [key, normalized];
          })
        ) as DataRow
    );
  }

  if (action === "flag-missing") {
    nextRows = rows.map((row, rowIndex) => {
      const incomplete = Object.values(row).some(isBlank);
      if (incomplete)
        ledger.push({
          rowNumber: rowIndex + 2,
          column: "data_buddy_missing_review",
          status: "changed",
          before: "absent",
          after: "true",
          reason: "Row contains at least one blank or placeholder value.",
        });
      return { ...row, data_buddy_missing_review: incomplete };
    });
  }

  if (action === "flag-range" && column) {
    nextRows = rows.map((row, rowIndex) => {
      const value = row[column] ?? null;
      const parsed =
        !isBlank(value) && numberLike(value) ? toNumber(value) : undefined;
      const ageViolation =
        /age/i.test(column) &&
        parsed !== undefined &&
        (parsed < 0 || parsed > 120);
      const negativeViolation =
        /(fare|price|amount|count|quantity|orders)/i.test(column) &&
        parsed !== undefined &&
        parsed < 0;
      if (!ageViolation && !negativeViolation) return row;
      ledger.push({
        rowNumber: rowIndex + 2,
        column: "data_buddy_range_review",
        status: "changed",
        before: "absent",
        after: "true",
        reason: `${column} remains unchanged but is explicitly flagged for range review.`,
      });
      return { ...row, data_buddy_range_review: true };
    });
  }

  if (action === "coerce-number" && column) {
    nextRows = rows.map((row, rowIndex) => {
      const value = row[column] ?? null;
      if (isBlank(value) || typeof value === "number") return row;
      if (numberLike(value)) {
        const parsed = toNumber(value);
        ledger.push({
          rowNumber: rowIndex + 2,
          column,
          status: "changed",
          before: asText(value),
          after: String(parsed),
          reason:
            "Parsed a number-like value without altering the original snapshot.",
        });
        return { ...row, [column]: parsed };
      }
      ledger.push({
        rowNumber: rowIndex + 2,
        column,
        status: "skipped",
        before: asText(value),
        after: asText(value),
        reason: "Could not parse this value as a number.",
      });
      return row;
    });
  }

  if (action === "remove-exact-duplicates") {
    const seen = new Set<string>();
    nextRows = rows.filter((row, rowIndex) => {
      const identity = rowIdentity(row);
      if (!seen.has(identity)) {
        seen.add(identity);
        return true;
      }
      ledger.push({
        rowNumber: rowIndex + 2,
        status: "excluded",
        before: "duplicate record",
        after: "excluded from working copy",
        reason: "Exact match of a previous source row.",
      });
      return false;
    });
  }

  if (action === "winsorize-iqr" && column) {
    const numeric = rows
      .map(row => row[column] ?? null)
      .filter(value => !isBlank(value) && numberLike(value))
      .map(toNumber)
      .sort((left, right) => left - right);
    const q1 = quantile(numeric, 0.25);
    const q3 = quantile(numeric, 0.75);
    if (q1 !== undefined && q3 !== undefined) {
      const spread = q3 - q1;
      const lower = q1 - spread * 1.5;
      const upper = q3 + spread * 1.5;
      nextRows = rows.map((row, rowIndex) => {
        const value = row[column] ?? null;
        if (isBlank(value) || !numberLike(value)) return row;
        const parsed = toNumber(value);
        const capped = Math.min(Math.max(parsed, lower), upper);
        if (capped === parsed) return row;
        ledger.push({
          rowNumber: rowIndex + 2,
          column,
          status: "changed",
          before: String(parsed),
          after: String(capped),
          reason: `Capped to 1.5× IQR bounds (${lower.toFixed(2)}–${upper.toFixed(2)}).`,
        });
        return { ...row, [column]: capped };
      });
    }
  }

  const labels: Record<RepairAction, [string, string]> = {
    "normalize-formatting": [
      "Normalize formatting",
      "Trim text and standardize email casing in a working copy.",
    ],
    "flag-missing": [
      "Flag incomplete rows",
      "Add a review flag without filling, replacing, or deleting source values.",
    ],
    "flag-range": [
      "Flag range violations",
      "Add a review flag while keeping each out-of-range source value unchanged.",
    ],
    "coerce-number": [
      "Coerce numeric values",
      "Convert parseable values and retain an error ledger for values that do not parse.",
    ],
    "remove-exact-duplicates": [
      "Exclude exact duplicates",
      "Exclude exact duplicate rows from the working copy while the original snapshot stays intact.",
    ],
    "winsorize-iqr": [
      "Winsorize IQR outliers",
      "Cap values at the documented IQR bounds in a preview only.",
    ],
  };
  const [title, description] = labels[action];
  return {
    action,
    title,
    description,
    rows: nextRows,
    changedCount: ledger.length,
    ledger,
  };
}

export function auditReportMarkdown(report: AuditReport, datasetName: string) {
  const findings = report.findings.length
    ? report.findings
        .map(
          finding =>
            `## [${finding.severity.toUpperCase()}] ${finding.title}\n- Rule ID: \`${finding.id}\`\n- Affected: ${finding.affectedCount}\n- Why it matters: ${finding.description}\n- Evidence: ${finding.evidence.map(item => `source row ${item.rowNumber}${item.column ? `, ${item.column}` : ""} = ${JSON.stringify(item.value)}`).join("; ")}`
        )
        .join("\n\n")
    : "No deterministic audit rules produced findings for the current working copy.";
  return `# ${datasetName} — evidence-first audit\n\nGenerated: ${report.generatedAt}\nEngine: ${report.engineVersion}\nVerdict: ${report.verdict.toUpperCase()}\n\n- Source rows: ${report.rowCount}\n- Source columns: ${report.columnCount}\n- Blocking findings: ${report.counts.blocker}\n- Requires review: ${report.counts.review}\n- Informational findings: ${report.counts.info}\n\n${findings}\n\n> The original source is not modified by this report. Findings are rule-based evidence, not proof that a business correction is factually right.`;
}
