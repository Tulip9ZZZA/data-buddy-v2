/**
 * dbuddy — Data Buddy rule-engine CLI.
 *
 *   pnpm dbuddy rules sync   Regenerate rules/registry.generated.ts from rules/<id>/rule.yaml
 *   pnpm dbuddy rules lint   Validate every rule against the evidence contract
 *
 * The YAML file in each rule folder is the single source of truth. The
 * generated registry is a build artifact: `rules lint` regenerates it and
 * fails if it would change, so drift between YAML and code cannot ship.
 * Exit code 0 = every gate passed; 1 = at least one rule failed.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  REPAIR_ACTIONS,
  RULE_ID_PATTERN,
  type FindingSeverity,
  type RuleMeta,
} from "../engine/contract";

const ROOT = path.resolve(import.meta.dirname, "..");
const RULES_DIR = path.join(ROOT, "rules");
const REGISTRY_PATH = path.join(RULES_DIR, "registry.generated.ts");

type RuleFolder = { dir: string; meta: RuleMeta; problems: string[] };

function listRuleFolders(): string[] {
  return readdirSync(RULES_DIR)
    .filter(
      name =>
        !name.startsWith("_") &&
        !name.endsWith(".generated.ts") &&
        !name.endsWith(".md")
    )
    .filter(name => statSync(path.join(RULES_DIR, name)).isDirectory())
    .sort();
}

function loadRule(folder: string): RuleFolder {
  const problems: string[] = [];
  const dir = path.join(RULES_DIR, folder);
  const yamlPath = path.join(dir, "rule.yaml");
  if (!existsSync(yamlPath)) {
    return {
      dir,
      meta: {
        id: folder,
        name: folder,
        version: "0",
        title: "",
        description: "",
        defaultSeverity: "info",
        repair: null,
        tags: [],
        evidenceLimit: 10,
        evidenceFields: [],
      },
      problems: ["rule.yaml is missing"],
    };
  }
  const raw = parseYaml(readFileSync(yamlPath, "utf8")) as Record<
    string,
    unknown
  >;
  const meta: RuleMeta = {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    version: String(raw.version ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? "").trim(),
    defaultSeverity: (raw.defaultSeverity ?? "info") as FindingSeverity,
    repair: (raw.repair === null || raw.repair === undefined
      ? null
      : String(raw.repair)) as RuleMeta["repair"],
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    evidenceLimit: Number(raw.evidenceLimit ?? 10),
    evidenceFields: Array.isArray(raw.evidenceFields)
      ? (raw.evidenceFields.map(String) as RuleMeta["evidenceFields"])
      : [],
  };

  if (!RULE_ID_PATTERN.test(meta.id))
    problems.push(
      `id "${meta.id}" does not match AUDIT.<FAMILY>.<NAME> (deterministic ID format)`
    );
  if (meta.id !== folder)
    problems.push(`folder name "${folder}" must equal rule id "${meta.id}"`);
  if (!/^\d+\.\d+\.\d+$/.test(meta.version))
    problems.push(`version "${meta.version}" is not semver`);
  if (!["blocker", "review", "info"].includes(meta.defaultSeverity))
    problems.push(
      `defaultSeverity "${meta.defaultSeverity}" is not blocker|review|info`
    );
  if (meta.repair !== null && !REPAIR_ACTIONS.includes(meta.repair))
    problems.push(`repair "${meta.repair}" is not a known repair action`);
  if (!meta.title) problems.push("title is required");
  if (meta.description.length < 40)
    problems.push("description must explain why the rule exists (>= 40 chars)");
  if (!meta.evidenceLimit || meta.evidenceLimit < 1 || meta.evidenceLimit > 50)
    problems.push("evidenceLimit must be between 1 and 50");
  for (const field of meta.evidenceFields) {
    if (!["rowNumber", "column", "value", "message"].includes(field))
      problems.push(`evidenceFields entry "${field}" is not a contract field`);
  }
  if (!meta.evidenceFields.includes("rowNumber"))
    problems.push("evidenceFields must include rowNumber");
  if (!meta.evidenceFields.includes("message"))
    problems.push("evidenceFields must include message");

  const detectorPath = path.join(dir, "detector.ts");
  if (!existsSync(detectorPath)) problems.push("detector.ts is missing");
  else {
    const source = readFileSync(detectorPath, "utf8");
    if (!/export function detect\(/.test(source))
      problems.push(
        "detector.ts must export function detect(context: DetectionContext)"
      );
  }

  const testPath = path.join(dir, "test_rule.test.ts");
  if (!existsSync(testPath)) problems.push("test_rule.test.ts is missing");
  else if (!readFileSync(testPath, "utf8").includes(meta.id))
    problems.push("test_rule.test.ts must reference the rule id");

  const fixturesDir = path.join(dir, "fixtures");
  if (!existsSync(fixturesDir)) problems.push("fixtures/ is missing");
  else {
    const fixtures = readdirSync(fixturesDir);
    if (!fixtures.length)
      problems.push("fixtures/ must contain at least one fixture file");
  }
  return { dir, meta, problems };
}

function renderRegistry(rules: RuleFolder[]): string {
  const imports = rules
    .map(
      (rule, index) =>
        `import { detect as detect${index} } from "../rules/${rule.meta.id}/detector";`
    )
    .join("\n");
  const entries = rules
    .map((rule, index) => {
      const meta = JSON.stringify(rule.meta, null, 2)
        .replace(/^/gm, "  ")
        .trim();
      return `  {\n    meta: ${meta},\n    detect: detect${index},\n  },`;
    })
    .join("\n");
  return `// GENERATED by \`pnpm dbuddy rules sync\` from rules/<id>/rule.yaml — do not edit by hand.
// The YAML file inside each rule folder is the single source of truth.
import type { RuleDetector, RuleMeta } from "../engine/contract";
${imports}

export const ruleRegistry: RuleDetector[] = [
${entries}
];

export const ruleCatalog: RuleMeta[] = ruleRegistry.map(rule => rule.meta);
`;
}

function cmdSync(): number {
  const rules = listRuleFolders().map(loadRule);
  const broken = rules.filter(rule => rule.problems.length);
  if (broken.length) {
    for (const rule of broken)
      console.error(
        `✗ ${path.basename(rule.dir)}\n  - ${rule.problems.join("\n  - ")}`
      );
    console.error(
      "\nsync failed: fix the rule definitions above, then re-run."
    );
    return 1;
  }
  writeFileSync(REGISTRY_PATH, renderRegistry(rules));
  console.log(
    `✓ wrote ${path.relative(ROOT, REGISTRY_PATH)} with ${rules.length} rules`
  );
  return 0;
}

function cmdLint(): number {
  const rules = listRuleFolders().map(loadRule);
  let failed = false;
  console.log(`dbuddy rules lint — ${rules.length} rules\n`);
  for (const rule of rules) {
    if (rule.problems.length) {
      failed = true;
      console.log(`✗ ${rule.meta.id || path.basename(rule.dir)}`);
      for (const problem of rule.problems) console.log(`    - ${problem}`);
    } else {
      console.log(
        `✓ ${rule.meta.id} v${rule.meta.version}  [${rule.meta.defaultSeverity}]  repair=${rule.meta.repair ?? "none"}`
      );
    }
  }
  const previous = existsSync(REGISTRY_PATH)
    ? readFileSync(REGISTRY_PATH, "utf8")
    : "";
  const rendered = renderRegistry(rules.filter(rule => !rule.problems.length));
  if (!failed && previous !== rendered) {
    failed = true;
    console.log(
      `\n✗ rules/registry.generated.ts is out of date. Run \`pnpm dbuddy rules sync\` and commit the result.`
    );
  }
  console.log(
    failed ? "\nLINT FAILED" : "\nAll rules satisfy the evidence contract."
  );
  return failed ? 1 : 0;
}

const [group, command] = process.argv.slice(2);
if (group !== "rules" || !command || !["sync", "lint"].includes(command)) {
  console.error("usage: pnpm dbuddy rules <sync|lint>");
  process.exit(2);
}
process.exit(command === "sync" ? cmdSync() : cmdLint());
