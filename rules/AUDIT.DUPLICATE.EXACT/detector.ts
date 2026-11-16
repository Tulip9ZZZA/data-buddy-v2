import type {
  AuditFinding,
  DetectionContext,
  DetectionResult,
} from "../../engine/contract";
import { rowIdentity } from "../../engine/primitives";

/**
 * Exact duplicate rows across the whole record (column-order-insensitive).
 * In sampled mode (rows above DEDUPE_EXACT_LIMIT) only the first N rows are
 * compared; the finding states the coverage explicitly instead of implying
 * the whole file was scanned.
 */
export function detect(context: DetectionContext): DetectionResult {
  const { rows, rule, guards } = context;
  const scannedRows = guards.dedupeSampled
    ? guards.dedupeSampleSize
    : rows.length;
  const seen = new Map<string, number>();
  const duplicates: { rowIndex: number; firstSeen: number }[] = [];
  for (
    let rowIndex = 0;
    rowIndex < Math.min(scannedRows, rows.length);
    rowIndex += 1
  ) {
    const identity = rowIdentity(rows[rowIndex]!);
    const firstSeen = seen.get(identity);
    if (firstSeen === undefined) {
      seen.set(identity, rowIndex);
    } else {
      duplicates.push({ rowIndex, firstSeen });
    }
  }
  if (!duplicates.length) return null;
  const finding: AuditFinding = {
    id: `${rule.id}:all-rows`,
    rule: rule.id,
    severity: rule.defaultSeverity,
    title: rule.title,
    description: `${duplicates.length} source row${duplicates.length === 1 ? " repeats" : "s repeat"} every visible cell of an earlier row.${guards.dedupeSampled ? ` Sampled mode: compared the first ${scannedRows.toLocaleString()} of ${rows.length.toLocaleString()} rows.` : ""}`,
    affectedCount: duplicates.length,
    evidence: duplicates
      .slice(0, rule.evidenceLimit)
      .map(({ rowIndex, firstSeen }) => ({
        rowNumber: rowIndex + 2,
        value: "Exact record match",
        message: `Matches source row ${firstSeen + 2}.`,
      })),
    repair: rule.repair ?? undefined,
  };
  if (guards.dedupeSampled) finding.sampled = true;
  return finding;
}
