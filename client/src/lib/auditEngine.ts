import { isBlank, type DataRow, type Primitive } from "./dataBuddy";

export type FindingSeverity = "blocker" | "review" | "info";
export type AuditRule =
  | "missing-values"
  | "exact-duplicates"
  | "type-conflict"
  | "invalid-email"
  | "range-violation"
  | "format-variation"
  | "cardinality-anomaly"
  | "iqr-outlier"
  | "untrusted-cell";

export type EvidenceRow = {
  rowNumber: number;
  column?: string;
  value: string;
  message: string;
};

export type AuditFinding = {
  id: string;
  rule: AuditRule;
  severity: FindingSeverity;
  title: string;
  description: string;
  affectedCount: number;
  column?: string;
  evidence: EvidenceRow[];
  repair?: RepairAction;
};

export type AuditReport = {
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  findings: AuditFinding[];
  counts: Record<FindingSeverity, number>;
};

export type RepairAction =
  | "normalize-formatting"
  | "flag-missing"
  | "flag-range"
  | "coerce-number"
  | "remove-exact-duplicates"
  | "winsorize-iqr";

export type LedgerEntry = {
  rowNumber: number;
  column?: string;
  status: "changed" | "skipped" | "excluded";
  before: string;
  after: string;
  reason: string;
};

export type RemediationPreview = {
  action: RepairAction;
  title: string;
  description: string;
  rows: DataRow[];
  changedCount: number;
  ledger: LedgerEntry[];
};

const MAX_EVIDENCE_ROWS = 10;
const dangerousCellPattern = /ignore\s+(all|previous)|delete\s+all|system\s+prompt|instruction\s*:/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asText = (value: Primitive) => (value === null ? "" : String(value));
const numberLike = (value: Primitive) => typeof value === "number" || /^-?[\d,]+(?:\.\d+)?$/.test(asText(value).trim());
const toNumber = (value: Primitive) => (typeof value === "number" ? value : Number(asText(value).replaceAll(",", "")));
const columnsFor = (rows: DataRow[]) => Array.from(new Set(rows.flatMap(row => Object.keys(row))));
const criticalField = (column: string) => /(^|_)(id|age|target|outcome|label|amount|fare|value)(_|$)/i.test(column);

function quantile(sorted: number[], percentile: number) {
  if (!sorted.length) return undefined;
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function exactDuplicateRows(rows: DataRow[]) {
  const seen = new Map<string, number>();
  return rows.flatMap((row, rowIndex) => {
    const identity = JSON.stringify(Object.fromEntries(Object.entries(row).sort(([left], [right]) => left.localeCompare(right))));
    const firstSeen = seen.get(identity);
    if (firstSeen === undefined) {
      seen.set(identity, rowIndex);
      return [];
    }
    return [{ rowIndex, firstSeen }];
  });
}

function makeFinding(finding: AuditFinding) {
  return { ...finding, evidence: finding.evidence.slice(0, MAX_EVIDENCE_ROWS) };
}

export function runEvidenceAudit(rows: DataRow[]): AuditReport {
  const columns = columnsFor(rows);
  const findings: AuditFinding[] = [];

  columns.forEach(column => {
    const values = rows.map(row => row[column] ?? null);
    const nonBlank = values.filter(value => !isBlank(value));
    const missingEvidence = values.flatMap((value, rowIndex) => isBlank(value)
      ? [{ rowNumber: rowIndex + 2, column, value: "blank", message: `${column} has no usable value.` }]
      : []);

    if (missingEvidence.length) {
      findings.push(makeFinding({
        id: `missing-values:${column}`,
        rule: "missing-values",
        severity: criticalField(column) ? "blocker" : "review",
        title: `${column} has missing values`,
        description: `${missingEvidence.length} of ${rows.length} source rows have a blank or placeholder value.`,
        affectedCount: missingEvidence.length,
        column,
        evidence: missingEvidence,
        repair: "flag-missing",
      }));
    }

    const numericCount = nonBlank.filter(numberLike).length;
    const nonNumericEvidence = values.flatMap((value, rowIndex) => {
      if (isBlank(value) || numberLike(value) || numericCount / Math.max(nonBlank.length, 1) < 0.8) return [];
      return [{ rowNumber: rowIndex + 2, column, value: asText(value), message: `This value cannot be parsed as a number while most of ${column} is numeric.` }];
    });
    if (nonNumericEvidence.length) {
      findings.push(makeFinding({
        id: `type-conflict:${column}`,
        rule: "type-conflict",
        severity: criticalField(column) ? "blocker" : "review",
        title: `${column} mixes numeric and text values`,
        description: `${numericCount} values look numeric, but ${nonNumericEvidence.length} value${nonNumericEvidence.length === 1 ? "" : "s"} cannot be parsed.`,
        affectedCount: nonNumericEvidence.length,
        column,
        evidence: nonNumericEvidence,
        repair: "coerce-number",
      }));
    }

    if (/email/i.test(column)) {
      const invalidEmails = values.flatMap((value, rowIndex) => {
        if (isBlank(value) || emailPattern.test(asText(value).trim())) return [];
        return [{ rowNumber: rowIndex + 2, column, value: asText(value), message: "This value does not match a basic email address pattern." }];
      });
      if (invalidEmails.length) {
        findings.push(makeFinding({
          id: `invalid-email:${column}`,
          rule: "invalid-email",
          severity: "review",
          title: `${column} contains invalid email formats`,
          description: `${invalidEmails.length} value${invalidEmails.length === 1 ? "" : "s"} fail a basic email pattern check.`,
          affectedCount: invalidEmails.length,
          column,
          evidence: invalidEmails,
          repair: "normalize-formatting",
        }));
      }
    }

    const formattingEvidence = values.flatMap((value, rowIndex) => {
      if (typeof value !== "string" || isBlank(value)) return [];
      const normalized = /email/i.test(column) ? value.trim().toLowerCase() : value.trim();
      return value === normalized ? [] : [{ rowNumber: rowIndex + 2, column, value, message: `Formatting differs from the deterministic ${/email/i.test(column) ? "trim-and-lowercase email" : "trimmed text"} policy.` }];
    });
    if (formattingEvidence.length) {
      findings.push(makeFinding({
        id: `format-variation:${column}`,
        rule: "format-variation",
        severity: "info",
        title: `${column} has formatting variation`,
        description: `${formattingEvidence.length} text value${formattingEvidence.length === 1 ? "" : "s"} would change under a reversible normalization policy.`,
        affectedCount: formattingEvidence.length,
        column,
        evidence: formattingEvidence,
        repair: "normalize-formatting",
      }));
    }

    const rangeEvidence = values.flatMap((value, rowIndex) => {
      if (isBlank(value) || !numberLike(value)) return [];
      const parsed = toNumber(value);
      const isAge = /age/i.test(column) && (parsed < 0 || parsed > 120);
      const shouldBePositive = /(fare|price|amount|count|quantity|orders)/i.test(column) && parsed < 0;
      return isAge || shouldBePositive
        ? [{ rowNumber: rowIndex + 2, column, value: asText(value), message: isAge ? "Age is outside the configured 0–120 review range." : "This field is expected to be non-negative based on its name." }]
        : [];
    });
    if (rangeEvidence.length) {
      findings.push(makeFinding({
        id: `range-violation:${column}`,
        rule: "range-violation",
        severity: /age/i.test(column) ? "blocker" : "review",
        title: `${column} has range violations`,
        description: `${rangeEvidence.length} value${rangeEvidence.length === 1 ? "" : "s"} fall outside the documented review range.`,
        affectedCount: rangeEvidence.length,
        column,
        evidence: rangeEvidence,
        repair: "flag-range",
      }));
    }

    const numericRows = values
      .map((value, rowIndex) => ({ value, rowIndex }))
      .filter(({ value }) => !isBlank(value) && numberLike(value))
      .map(({ value, rowIndex }) => ({ value: toNumber(value), rowIndex }))
      .filter(({ value }) => Number.isFinite(value));
    if (numericRows.length >= 8) {
      const sorted = numericRows.map(item => item.value).sort((left, right) => left - right);
      const q1 = quantile(sorted, 0.25);
      const q3 = quantile(sorted, 0.75);
      if (q1 !== undefined && q3 !== undefined) {
        const spread = q3 - q1;
        const lower = q1 - spread * 1.5;
        const upper = q3 + spread * 1.5;
        const outliers = numericRows.flatMap(({ value, rowIndex }) => value < lower || value > upper
          ? [{ rowNumber: rowIndex + 2, column, value: String(value), message: `Outside IQR review bounds of ${lower.toFixed(2)} to ${upper.toFixed(2)}.` }]
          : []);
        if (outliers.length) {
          findings.push(makeFinding({
            id: `iqr-outlier:${column}`,
            rule: "iqr-outlier",
            severity: "review",
            title: `${column} has IQR outliers`,
            description: `${outliers.length} value${outliers.length === 1 ? "" : "s"} fall outside the 1.5× IQR review bounds. This is a review signal, not proof of an error.`,
            affectedCount: outliers.length,
            column,
            evidence: outliers,
            repair: "winsorize-iqr",
          }));
        }
      }
    }

    const cardinality = new Set(nonBlank.map(asText)).size / Math.max(nonBlank.length, 1);
    if (nonBlank.length >= 12 && cardinality > 0.97 && !/(id|name|email|ticket|code)/i.test(column)) {
      findings.push(makeFinding({
        id: `cardinality-anomaly:${column}`,
        rule: "cardinality-anomaly",
        severity: "info",
        title: `${column} is nearly unique`,
        description: `${Math.round(cardinality * 100)}% of non-blank values are distinct. Confirm whether this field is meant to be a category or an identifier.`,
        affectedCount: nonBlank.length,
        column,
        evidence: values.slice(0, MAX_EVIDENCE_ROWS).map((value, rowIndex) => ({ rowNumber: rowIndex + 2, column, value: asText(value), message: "Representative value for a high-cardinality field." })),
      }));
    }
  });

  const duplicates = exactDuplicateRows(rows);
  if (duplicates.length) {
    findings.push(makeFinding({
      id: "exact-duplicates:all-rows",
      rule: "exact-duplicates",
      severity: "review",
      title: "Exact duplicate records found",
      description: `${duplicates.length} source row${duplicates.length === 1 ? " repeats" : "s repeat"} every visible cell of an earlier row.`,
      affectedCount: duplicates.length,
      evidence: duplicates.map(({ rowIndex, firstSeen }) => ({ rowNumber: rowIndex + 2, value: "Exact record match", message: `Matches source row ${firstSeen + 2}.` })),
      repair: "remove-exact-duplicates",
    }));
  }

  const untrustedCells = rows.flatMap((row, rowIndex) => Object.entries(row).flatMap(([column, value]) => {
    if (isBlank(value) || !dangerousCellPattern.test(asText(value))) return [];
    return [{ rowNumber: rowIndex + 2, column, value: asText(value), message: "Instruction-like text is treated as untrusted data and was not executed." }];
  }));
  if (untrustedCells.length) {
    findings.push(makeFinding({
      id: "untrusted-cell:instruction-like-text",
      rule: "untrusted-cell",
      severity: "blocker",
      title: "Instruction-like cell content requires review",
      description: `${untrustedCells.length} cell${untrustedCells.length === 1 ? " contains" : "s contain"} instruction-like text. Data Buddy treats this content as data only.`,
      affectedCount: untrustedCells.length,
      evidence: untrustedCells,
    }));
  }

  const severityWeight: Record<FindingSeverity, number> = { blocker: 0, review: 1, info: 2 };
  findings.sort((left, right) => severityWeight[left.severity] - severityWeight[right.severity] || right.affectedCount - left.affectedCount || left.id.localeCompare(right.id));
  return {
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: columns.length,
    findings,
    counts: {
      blocker: findings.filter(finding => finding.severity === "blocker").length,
      review: findings.filter(finding => finding.severity === "review").length,
      info: findings.filter(finding => finding.severity === "info").length,
    },
  };
}

export function previewRemediation(rows: DataRow[], finding: AuditFinding): RemediationPreview | null {
  const action = finding.repair;
  if (!action) return null;
  const ledger: LedgerEntry[] = [];
  const column = finding.column;
  let nextRows = rows.map(row => ({ ...row }));

  if (action === "normalize-formatting") {
    nextRows = rows.map((row, rowIndex) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
      if (typeof value !== "string") return [key, value];
      const normalized = /email/i.test(key) ? value.trim().toLowerCase() : value.trim();
      if (normalized !== value) ledger.push({ rowNumber: rowIndex + 2, column: key, status: "changed", before: value, after: normalized, reason: "Applied deterministic text normalization." });
      return [key, normalized];
    })) as DataRow);
  }

  if (action === "flag-missing") {
    nextRows = rows.map((row, rowIndex) => {
      const incomplete = Object.values(row).some(isBlank);
      if (incomplete) ledger.push({ rowNumber: rowIndex + 2, column: "data_buddy_missing_review", status: "changed", before: "absent", after: "true", reason: "Row contains at least one blank or placeholder value." });
      return { ...row, data_buddy_missing_review: incomplete };
    });
  }

  if (action === "flag-range" && column) {
    nextRows = rows.map((row, rowIndex) => {
      const value = row[column] ?? null;
      const parsed = !isBlank(value) && numberLike(value) ? toNumber(value) : undefined;
      const ageViolation = /age/i.test(column) && parsed !== undefined && (parsed < 0 || parsed > 120);
      const negativeViolation = /(fare|price|amount|count|quantity|orders)/i.test(column) && parsed !== undefined && parsed < 0;
      if (!ageViolation && !negativeViolation) return row;
      ledger.push({ rowNumber: rowIndex + 2, column: "data_buddy_range_review", status: "changed", before: "absent", after: "true", reason: `${column} remains unchanged but is explicitly flagged for range review.` });
      return { ...row, data_buddy_range_review: true };
    });
  }

  if (action === "coerce-number" && column) {
    nextRows = rows.map((row, rowIndex) => {
      const value = row[column] ?? null;
      if (isBlank(value) || typeof value === "number") return row;
      if (numberLike(value)) {
        const parsed = toNumber(value);
        ledger.push({ rowNumber: rowIndex + 2, column, status: "changed", before: asText(value), after: String(parsed), reason: "Parsed a number-like value without altering the original snapshot." });
        return { ...row, [column]: parsed };
      }
      ledger.push({ rowNumber: rowIndex + 2, column, status: "skipped", before: asText(value), after: asText(value), reason: "Could not parse this value as a number." });
      return row;
    });
  }

  if (action === "remove-exact-duplicates") {
    const seen = new Set<string>();
    nextRows = rows.filter((row, rowIndex) => {
      const identity = JSON.stringify(Object.fromEntries(Object.entries(row).sort(([left], [right]) => left.localeCompare(right))));
      if (!seen.has(identity)) {
        seen.add(identity);
        return true;
      }
      ledger.push({ rowNumber: rowIndex + 2, status: "excluded", before: "duplicate record", after: "excluded from working copy", reason: "Exact match of a previous source row." });
      return false;
    });
  }

  if (action === "winsorize-iqr" && column) {
    const numeric = rows.map(row => row[column] ?? null).filter(value => !isBlank(value) && numberLike(value)).map(toNumber).sort((left, right) => left - right);
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
        ledger.push({ rowNumber: rowIndex + 2, column, status: "changed", before: String(parsed), after: String(capped), reason: `Capped to 1.5× IQR bounds (${lower.toFixed(2)}–${upper.toFixed(2)}).` });
        return { ...row, [column]: capped };
      });
    }
  }

  const labels: Record<RepairAction, [string, string]> = {
    "normalize-formatting": ["Normalize formatting", "Trim text and standardize email casing in a working copy."],
    "flag-missing": ["Flag incomplete rows", "Add a review flag without filling, replacing, or deleting source values."],
    "flag-range": ["Flag range violations", "Add a review flag while keeping each out-of-range source value unchanged."],
    "coerce-number": ["Coerce numeric values", "Convert parseable values and retain an error ledger for values that do not parse."],
    "remove-exact-duplicates": ["Exclude exact duplicates", "Exclude exact duplicate rows from the working copy while the original snapshot stays intact."],
    "winsorize-iqr": ["Winsorize IQR outliers", "Cap values at the documented IQR bounds in a preview only."],
  };
  const [title, description] = labels[action];
  return { action, title, description, rows: nextRows, changedCount: ledger.length, ledger };
}

export function auditReportMarkdown(report: AuditReport, datasetName: string) {
  const findings = report.findings.length
    ? report.findings.map(finding => `## [${finding.severity.toUpperCase()}] ${finding.title}\n- Rule ID: \`${finding.id}\`\n- Affected: ${finding.affectedCount}\n- Why it matters: ${finding.description}\n- Evidence: ${finding.evidence.map(item => `source row ${item.rowNumber}${item.column ? `, ${item.column}` : ""} = ${JSON.stringify(item.value)}`).join("; ")}`).join("\n\n")
    : "No deterministic audit rules produced findings for the current working copy.";
  return `# ${datasetName} — evidence-first audit\n\nGenerated: ${report.generatedAt}\n\n- Source rows: ${report.rowCount}\n- Source columns: ${report.columnCount}\n- Blocking findings: ${report.counts.blocker}\n- Requires review: ${report.counts.review}\n- Informational findings: ${report.counts.info}\n\n${findings}\n\n> The original source is not modified by this report. Findings are rule-based evidence, not proof that a business correction is factually right.`;
}
