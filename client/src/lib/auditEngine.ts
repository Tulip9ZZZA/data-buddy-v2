/**
 * Compatibility layer: the browser app consumes the shared rule engine.
 *
 * The engine used to live in this file. It now lives in `/engine` with the
 * rules in `/rules` (rules-as-data). This shim keeps the existing import
 * path stable for the UI and older tests while everything routes through
 * the rule registry.
 */
import { ruleRegistry } from "../../../rules/registry.generated";
import { runRuleAudit, type RunAuditResult } from "../../../engine/runAudit";
import {
  auditReportMarkdown,
  previewRemediation,
} from "../../../engine/remediation";
import type { DataRow } from "../../../engine/contract";

export type {
  AuditFinding,
  AuditReport,
  DataRow,
  EvidenceRow,
  FindingSeverity,
  RepairAction,
  Verdict,
} from "../../../engine/contract";
export type { LedgerEntry, RemediationPreview } from "../../../engine/types";
export { auditReportMarkdown, previewRemediation };
export { ruleRegistry };

/**
 * Run the full deterministic rule registry over a working copy.
 * Same entry point as v1 (`runEvidenceAudit`), now driven by rules-as-data.
 */
export function runEvidenceAudit(rows: DataRow[]): RunAuditResult {
  return runRuleAudit(rows, ruleRegistry);
}

export type { RunAuditResult };
