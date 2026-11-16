/**
 * Single-size deep probe used to find the exact engine ceiling on a
 * memory-constrained host. Usage:
 *   node --max-old-space-size=<MB> node_modules/tsx/dist/cli.mjs benchmarks/scripts/bench_single.mjs 500000
 */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { performance } from "node:perf_hooks";
import { runRuleAudit } from "../../engine/runAudit";
import { ruleRegistry } from "../../rules/registry.generated";
import { normaliseRows } from "../../engine/primitives";

const ROOT = path.resolve(import.meta.dirname, "../..");
process.chdir(ROOT);
const size = Number(process.argv[2] ?? 100000);
const log = line => {
  console.log(line);
  mkdirSync(path.join(ROOT, "benchmarks/results"), { recursive: true });
  appendFileSync(
    path.join(ROOT, "benchmarks/results/ceiling_probe.log"),
    line + "\n"
  );
};

const text = readFileSync(
  path.join(ROOT, `benchmarks/datasets/synthetic_dirty_${size}.csv`),
  "utf8"
);
const t1 = performance.now();
const workbook = XLSX.read(text, { type: "string", cellDates: true });
const raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
  defval: null,
  raw: false,
});
log(
  `${size} parseMs=${Math.round(performance.now() - t1)} rssAfterParseMb=${Math.round(process.memoryUsage().rss / 1048576)}`
);

const rows = normaliseRows(raw);
const t2 = performance.now();
const report = runRuleAudit(rows, ruleRegistry);
const auditMs = Math.round(performance.now() - t2);
log(
  `${size} auditMs=${auditMs} rssAfterAuditMb=${Math.round(process.memoryUsage().rss / 1048576)} findings=${report.findings.length} verdict=${report.verdict}`
);
