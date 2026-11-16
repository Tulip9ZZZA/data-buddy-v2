/** UI-facing engine types re-exported so the browser bundle has one import path. */
import type { DataRow, RepairAction } from "./contract";

export type {
  AuditFinding,
  AuditReport,
  DetectionContext,
  DetectionResult,
  DataRow,
  EvidenceRow,
  FindingSeverity,
  IntakeGuardState,
  Primitive,
  RepairAction,
  RuleDetector,
  RuleMeta,
  Verdict,
} from "./contract";

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
