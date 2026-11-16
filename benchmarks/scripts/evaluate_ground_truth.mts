/**
 * Precision/recall of the rule registry against the 200-row hand-labeled
 * ground truth (benchmarks/ground_truth/labels.csv, rubric in that folder).
 *
 *   pnpm tsx benchmarks/scripts/evaluate_ground_truth.mts
 *
 * Loads each real dataset, runs runRuleAudit with evidenceLimit raised to the
 * row count (measurement-only change on a CLONE of the registry so the shipped
 * rules keep their UI evidence cap), and matches flagged source rows to labels
 * by file position (header line = row 1 — the same convention the rubric uses).
 * Writes results/precision_recall.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { performance } from "node:perf_hooks";
import { runRuleAudit } from "../../engine/runAudit";
import { ruleRegistry } from "../../rules/registry.generated";
import { csvToRows } from "../../engine/fixtureLoader";
import type { RuleDetector } from "../../engine/contract";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FAMILY_OF_RULE: Record<string, string> = {
  "AUDIT.MISSING.VALUES": "missing",
  "AUDIT.DUPLICATE.EXACT": "duplicate",
  "AUDIT.TYPE.CONFLICT": "type_conflict",
  "AUDIT.RANGE.BOUNDS": "range",
  "AUDIT.FORMAT.VARIATION": "format",
  "AUDIT.FORMAT.EMAIL": "format",
  "AUDIT.OUTLIER.IQR": "outlier",
  "AUDIT.CARDINALITY.HIGH": "cardinality",
  "AUDIT.UNTRUSTED.CELL": "untrusted",
  "AUDIT.COLUMN.CONSTANT": "constant",
};

// Measurement-only registry clone: full evidence so recall is not capped at 10 rows.
const fullEvidenceRegistry: RuleDetector[] = ruleRegistry.map(rule => ({
  meta: { ...rule.meta, evidenceLimit: 10_000_000 },
  detect: rule.detect,
}));

function loadDataset(name: string): Record<string, unknown>[] {
  if (name === "adult") {
    // Adult ships headerless; the evaluator loads it through the documented headerless intake path.
    return csvToRows(
      readFileSync(path.join(ROOT, "benchmarks/datasets/adult.csv"), "utf8"),
      { headerless: true }
    );
  }
  const text = readFileSync(
    path.join(
      ROOT,
      `benchmarks/datasets/${name === "titanic" ? "titanic.csv" : "usgs_earthquakes_month.csv"}`
    ),
    "utf8"
  );
  const workbook = XLSX.read(text, { type: "string", cellDates: true });
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]!], {
    defval: null,
    raw: false,
  });
}

const labels = csvToRows(
  readFileSync(path.join(ROOT, "benchmarks/ground_truth/labels.csv"), "utf8")
);
const families = [
  "missing",
  "duplicate",
  "type_conflict",
  "range",
  "format",
  "outlier",
];
const familyStats: Record<string, { tp: number; fp: number; fn: number }> = {};
for (const family of families) familyStats[family] = { tp: 0, fp: 0, fn: 0 };
const datasetReport: Record<
  string,
  {
    rows: number;
    labeledRows: number;
    cleanRowsFlagged: number;
    falsePositiveRate: number;
  }
> = {};

for (const datasetName of ["titanic", "adult", "usgs"]) {
  const started = performance.now();
  const rows = loadDataset(datasetName);
  const report = runRuleAudit(rows as never, fullEvidenceRegistry);
  console.log(
    `${datasetName}: ${rows.length} rows audited in ${Math.round(performance.now() - started)}ms, ${report.findings.length} findings`
  );

  const flaggedByFamily = new Map<string, Set<number>>();
  for (const finding of report.findings) {
    const family = FAMILY_OF_RULE[finding.rule];
    if (!family) continue;
    const set = flaggedByFamily.get(family) ?? new Set<number>();
    for (const evidence of finding.evidence) set.add(evidence.rowNumber);
    flaggedByFamily.set(family, set);
  }

  const datasetLabels = labels.filter(label => label.dataset === datasetName);
  let flaggedClean = 0;
  let cleanRows = 0;
  for (const label of datasetLabels) {
    // Labels store the file position (header line = row 1), the same
    // convention the engine's evidence rowNumber uses.
    const sourceRow = Number(label.source_row);
    if (
      !Number.isInteger(sourceRow) ||
      sourceRow < 2 ||
      sourceRow > rows.length + 1
    ) {
      throw new Error(
        `bad source_row in labels.csv for ${datasetName}: ${label.source_row}`
      );
    }
    const isClean = families.every(family => Number(label[family] ?? 0) === 0);
    if (isClean) cleanRows += 1;
    let flaggedThisRow = false;
    for (const family of families) {
      const rubricPositive = Number(label[family] ?? 0) === 1;
      const enginePositive =
        flaggedByFamily.get(family)?.has(sourceRow) ?? false;
      if (enginePositive) flaggedThisRow = true;
      if (rubricPositive && enginePositive) familyStats[family]!.tp += 1;
      else if (!rubricPositive && enginePositive) familyStats[family]!.fp += 1;
      else if (rubricPositive && !enginePositive) familyStats[family]!.fn += 1;
    }
    if (isClean && flaggedThisRow) flaggedClean += 1;
  }
  datasetReport[datasetName] = {
    rows: rows.length,
    labeledRows: datasetLabels.length,
    cleanRowsFlagged: flaggedClean,
    falsePositiveRate: cleanRows
      ? Math.round((flaggedClean / cleanRows) * 10000) / 10000
      : 0,
  };
}

const round4 = (value: number | null) =>
  value === null ? null : Math.round(value * 10000) / 10000;
const perFamily = Object.fromEntries(
  Object.entries(familyStats).map(([family, stats]) => {
    const precision =
      stats.tp + stats.fp ? stats.tp / (stats.tp + stats.fp) : null;
    const recall =
      stats.tp + stats.fn ? stats.tp / (stats.tp + stats.fn) : null;
    const f1 =
      precision !== null && recall !== null && precision + recall
        ? (2 * precision * recall) / (precision + recall)
        : null;
    return [
      family,
      {
        ...stats,
        precision: round4(precision),
        recall: round4(recall),
        f1: round4(f1),
      },
    ];
  })
);

const payload = {
  measuredAt: new Date().toISOString(),
  groundTruthRows: labels.length,
  perFamily,
  falsePositiveRatePerDataset: datasetReport,
  methodNote:
    "Engine rules run with evidenceLimit raised (registry clone) so recall is not capped by the 10-row UI evidence limit. Rows matched to labels by file position (header = row 1).",
};
writeFileSync(
  path.join(ROOT, "benchmarks/results/precision_recall.json"),
  JSON.stringify(payload, null, 2)
);
console.log(JSON.stringify(perFamily));
console.log("FPR per dataset:", JSON.stringify(datasetReport));
