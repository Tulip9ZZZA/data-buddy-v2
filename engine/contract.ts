/**
 * Data Buddy rule-engine contract.
 *
 * Every audit finding in the product must satisfy this contract:
 *   - a deterministic rule ID (`AUDIT.<FAMILY>.<NAME>`)
 *   - a severity tier
 *   - an affected count
 *   - row/column evidence (a finding without evidence is a warning, not a conclusion)
 *
 * The contract is validated by `pnpm dbuddy rules lint` against each rule's
 * `rule.yaml`, so a rule that cannot produce evidence cannot ship.
 */

/** A single cell value as normalised by the intake pipeline. */
export type Primitive = string | number | boolean | null;

/** One source row keyed by column name. */
export type DataRow = Record<string, Primitive>;

export const ENGINE_VERSION = "2.0.0";
export const RULE_ID_PATTERN = /^AUDIT\.[A-Z][A-Z0-9]*(\.[A-Z0-9]+)+$/;
export const REPAIR_ACTIONS = [
  "normalize-formatting",
  "flag-missing",
  "flag-range",
  "coerce-number",
  "remove-exact-duplicates",
  "winsorize-iqr",
] as const;

export type FindingSeverity = "blocker" | "review" | "info";
export type RepairAction = (typeof REPAIR_ACTIONS)[number];
export type Verdict = "blocked" | "review" | "safe";

/** Static metadata declared by a rule's `rule.yaml` (single source of truth). */
export type RuleMeta = {
  id: string;
  name: string;
  version: string;
  title: string;
  description: string;
  /** Default severity; a detector may escalate per-scope (e.g. critical columns). */
  defaultSeverity: FindingSeverity;
  /** Deterministic repair action offered in the reversible preview, if any. */
  repair: RepairAction | null;
  tags: string[];
  /** Maximum evidence rows a finding may carry into the UI. */
  evidenceLimit: number;
  /** Contract fields every evidence row of this rule must populate. */
  evidenceFields: ("rowNumber" | "column" | "value" | "message")[];
};

export type EvidenceRow = {
  rowNumber: number;
  column?: string;
  value: string;
  message: string;
};

export type AuditFinding = {
  id: string;
  rule: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  affectedCount: number;
  column?: string;
  evidence: EvidenceRow[];
  repair?: RepairAction;
  /** True when the detector ran on a documented sample instead of the full column. */
  sampled?: boolean;
};

export type AuditReport = {
  engineVersion: string;
  generatedAt: string;
  rowCount: number;
  columnCount: number;
  verdict: Verdict;
  findings: AuditFinding[];
  counts: Record<FindingSeverity, number>;
  /** Present when intake guards truncated hostile cell text for evidence display. */
  truncatedCells?: number;
  /** Present when exact-duplicate detection ran on a documented sample. */
  sampled?: boolean;
};

/** Per-rule detector input. Values are computed once by the runner and shared. */
export type DetectionContext = {
  rows: DataRow[];
  columns: string[];
  /** values for rows[i][column] — index-aligned with rows for every column. */
  columnValues: Map<string, Primitive[]>;
  nonBlankValues: Map<string, Primitive[]>;
  /** Metadata of the rule currently running (from its rule.yaml). */
  rule: RuleMeta;
  /** Guard flags produced by the intake guards (see engine/guards.ts). */
  guards: IntakeGuardState;
};

export type DetectionResult = AuditFinding | AuditFinding[] | null;

export type RuleDetector = {
  meta: RuleMeta;
  detect: (context: DetectionContext) => DetectionResult;
};

/** Guard state attached to every audit run. */
export type IntakeGuardState = {
  /** Row count above which exact-duplicate detection switches to sampled mode. */
  dedupeSampled: boolean;
  dedupeSampleSize: number;
  /** Columns or rows hard-rejected at intake. */
  rejectedReason: string | null;
  truncatedCells: number;
};

export const MAX_EVIDENCE_ROWS_DEFAULT = 10;

/** Severity ordering used for deterministic finding sort. */
export const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  blocker: 0,
  review: 1,
  info: 2,
};

export function deriveVerdict(
  counts: Record<FindingSeverity, number>
): Verdict {
  if (counts.blocker > 0) return "blocked";
  if (counts.review > 0) return "review";
  return "safe";
}

/**
 * Validate a finding against its rule contract. Returns a list of violations;
 * an empty list means the finding satisfies the evidence contract.
 */
export function validateFindingAgainstContract(
  finding: AuditFinding,
  meta: RuleMeta
): string[] {
  const violations: string[] = [];
  if (!finding.rule.startsWith(meta.id))
    violations.push(
      `finding.rule "${finding.rule}" does not start with rule id "${meta.id}"`
    );
  if (finding.affectedCount <= 0)
    violations.push("affectedCount must be positive when a finding is raised");
  if (finding.evidence.length === 0)
    violations.push(
      "evidence must not be empty: a finding without evidence is a warning, not a conclusion"
    );
  if (finding.evidence.length > meta.evidenceLimit)
    violations.push(
      `evidence rows ${finding.evidence.length} exceed the rule evidenceLimit ${meta.evidenceLimit}`
    );
  finding.evidence.forEach((row, index) => {
    for (const field of meta.evidenceFields) {
      if (
        row[field] === undefined ||
        row[field] === null ||
        row[field] === ""
      ) {
        violations.push(
          `evidence[${index}] is missing required contract field "${field}"`
        );
      }
    }
    if (!Number.isInteger(row.rowNumber) || row.rowNumber < 1)
      violations.push(
        `evidence[${index}].rowNumber must be a positive integer`
      );
    if (!row.message)
      violations.push(
        `evidence[${index}].message must explain why the row was flagged`
      );
  });
  return violations;
}
