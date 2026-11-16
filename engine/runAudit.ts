/**
 * Rule runner: the deterministic heart of Data Buddy.
 *
 * - Values are computed once per column and shared with every detector.
 * - Intake guards run first (see engine/guards.ts) so hostile shapes are
 *   rejected or bounded before rules execute.
 * - Every finding is validated against its rule's evidence contract;
 *   violations are reported to the caller (and enforced by `dbuddy rules lint`).
 * - Finding sort is deterministic: severity → affectedCount desc → rule ID.
 */
import {
  ENGINE_VERSION,
  SEVERITY_WEIGHT,
  deriveVerdict,
  validateFindingAgainstContract,
  type AuditFinding,
  type AuditReport,
  type DataRow,
  type DetectionContext,
  type Primitive,
  type RuleDetector,
} from "./contract";
import {
  applyIntakeGuards,
  initialGuardState,
  truncateCellText,
} from "./guards";
import { columnsFor, isBlank } from "./primitives";

export type RunAuditOptions = {
  /** When true, contract violations throw instead of being reported (used by lint/tests). */
  strict?: boolean;
};

export type RunAuditResult = AuditReport & {
  /** Set when exact-duplicate detection ran on a documented sample, not all rows. */
  sampled?: boolean;
  /** Non-fatal contract violations collected during the run (empty when clean). */
  contractViolations: string[];
};

export function runRuleAudit(
  rows: DataRow[],
  registry: readonly RuleDetector[],
  options: RunAuditOptions = {}
): RunAuditResult {
  const columns = columnsFor(rows);
  const guards = applyIntakeGuards(rows, columns.length);

  const columnValues = new Map<string, Primitive[]>();
  const nonBlankValues = new Map<string, Primitive[]>();
  for (const column of columns) {
    const values = rows.map(row =>
      truncateCellText((row[column] ?? null) as Primitive, guards)
    );
    columnValues.set(column, values);
    nonBlankValues.set(
      column,
      values.filter(value => !isBlank(value))
    );
  }

  const findings: AuditFinding[] = [];
  const contractViolations: string[] = [];
  for (const detector of registry) {
    const context: DetectionContext = {
      rows,
      columns,
      columnValues,
      nonBlankValues,
      rule: detector.meta,
      guards,
    };
    let result: Awaited<ReturnType<RuleDetector["detect"]>>;
    try {
      result = detector.detect(context);
    } catch (error) {
      contractViolations.push(
        `${detector.meta.id}: detector threw: ${error instanceof Error ? error.message : String(error)}`
      );
      continue;
    }
    const produced =
      result === null ? [] : Array.isArray(result) ? result : [result];
    for (const finding of produced) {
      const violations = validateFindingAgainstContract(finding, detector.meta);
      if (violations.length) {
        if (options.strict)
          throw new Error(
            `Contract violation in ${detector.meta.id}:\n- ${violations.join("\n- ")}`
          );
        contractViolations.push(
          `${detector.meta.id}: ${violations.join("; ")}`
        );
      }
      findings.push(finding);
    }
  }

  findings.sort(
    (left, right) =>
      SEVERITY_WEIGHT[left.severity] - SEVERITY_WEIGHT[right.severity] ||
      right.affectedCount - left.affectedCount ||
      left.id.localeCompare(right.id)
  );
  const counts = {
    blocker: findings.filter(finding => finding.severity === "blocker").length,
    review: findings.filter(finding => finding.severity === "review").length,
    info: findings.filter(finding => finding.severity === "info").length,
  };
  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: columns.length,
    verdict: deriveVerdict(counts),
    findings,
    counts,
    ...(guards.dedupeSampled ? { sampled: true } : {}),
    ...(guards.truncatedCells ? { truncatedCells: guards.truncatedCells } : {}),
    contractViolations,
  };
}
