/**
 * Engine runtime + peak-memory benchmark over the synthetic dirty datasets.
 *
 *   pnpm tsx benchmarks/scripts/bench_engine.mjs
 *
 * Measures three phases separately (parse, normalise+profile, rule audit) and
 * samples process RSS every 25ms for a peak-memory reading per file. Writes
 * benchmarks/results/runtime_curve.json. Every number in RESULTS.md comes
 * from this script — none are typed by hand.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { performance } from "node:perf_hooks";
import { runRuleAudit } from "../../engine/runAudit";
import { ruleRegistry } from "../../rules/registry.generated";
import { normaliseRows } from "../../engine/primitives";

const ROOT = path.resolve(import.meta.dirname, "../..");
const DATASETS = path.join(ROOT, "benchmarks/datasets");
const RESULTS = path.join(ROOT, "benchmarks/results");
const SIZES = [10_000, 100_000, 500_000, 1_000_000];
const results = [];

function peakRssWhile(fn) {
  let peak = process.memoryUsage().rss;
  let running = true;
  const sampler = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 25);
  try {
    const result = fn();
    return { result, peakPeak: peak, running };
  } finally {
    clearInterval(sampler);
  }
}

for (const size of SIZES) {
  const file = path.join(DATASETS, `synthetic_dirty_${size}.csv`);
  const t0 = performance.now();
  const text = readFileSync(file, "utf8");
  const parseMs = performance.now() - t0;

  let peakTotal = 0;
  const t1 = performance.now();
  const workbook = XLSX.read(text, { type: "string", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
  const parseAppMs = performance.now() - t1;

  const t2 = performance.now();
  const rows = normaliseRows(raw);
  const normaliseMs = performance.now() - t2;

  const audit = peakRssWhile(() => {
    const t3 = performance.now();
    const report = runRuleAudit(rows, ruleRegistry);
    return { report, ms: performance.now() - t3 };
  });
  peakTotal = Math.max(peakTotal, audit.peakPeak);

  const record = {
    rows: size,
    columns: rows.length ? Object.keys(rows[0]).length : 0,
    fileSizeBytes: text.length,
    parseMs: Math.round(parseMs + parseAppMs),
    normaliseMs: Math.round(normaliseMs),
    auditMs: Math.round(audit.result.ms),
    totalMs: Math.round(parseMs + parseAppMs + normaliseMs + audit.result.ms),
    peakRssMb: Math.round(peakTotal / 1024 / 1024),
    findings: audit.result.report.findings.length,
    counts: audit.result.report.counts,
    verdict: audit.result.report.verdict,
    sampled: audit.result.report.sampled ?? false,
  };
  console.log(JSON.stringify(record));
  results.push(record);
  // Write incrementally: a late OOM must not lose the earlier measurements.
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(
    path.join(RESULTS, "runtime_curve.json"),
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        rowsPerSecondNote:
          "auditMs excludes parse/normalise; totalMs includes them",
        runs: results,
      },
      null,
      2
    )
  );
}

console.log(
  `\nwrote benchmarks/results/runtime_curve.json (${results.length} runs)`
);
