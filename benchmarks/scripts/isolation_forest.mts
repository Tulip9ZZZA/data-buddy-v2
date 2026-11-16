/**
 * Minimal isolation forest (TypeScript) used for the parity benchmark.
 * Deterministic seeded RNG so runs are reproducible. Same defaults as the
 * sklearn reference: n_estimators=100, max_samples=256, subsample without
 * replacement per tree.
 *
 * Usage: pnpm tsx benchmarks/scripts/isolation_forest.mts <features.json> <scores.json>
 *   features.json: { "matrix": [[x, y], ...] }
 *   scores.json:   { "scores": [...], "elapsedMs": n, "flagged": [indices] }
 */
import { readFileSync, writeFileSync } from "node:fs";

class SeededRng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    // xorshift32 — deterministic across runs and platforms.
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

type Node = {
  column: number;
  split: number;
  left: Node | null;
  right: Node | null;
  size: number;
  isLeaf: boolean;
};

function buildTree(
  data: number[][],
  depth: number,
  heightLimit: number,
  rng: SeededRng
): Node {
  if (depth >= heightLimit || data.length <= 1) {
    return {
      column: 0,
      split: 0,
      left: null,
      right: null,
      size: data.length,
      isLeaf: true,
    };
  }
  const column = rng.int(data[0]!.length);
  const values = data.map(row => row[column]!);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return {
      column: 0,
      split: 0,
      left: null,
      right: null,
      size: data.length,
      isLeaf: true,
    };
  }
  const split = min + rng.next() * (max - min);
  const left = data.filter(row => row[column]! < split);
  const right = data.filter(row => row[column]! >= split);
  return {
    column,
    split,
    left: buildTree(left, depth + 1, heightLimit, rng),
    right: buildTree(right, depth + 1, heightLimit, rng),
    size: data.length,
    isLeaf: false,
  };
}

function pathLength(row: number[], node: Node, depth: number): number {
  if (node.isLeaf || node.left === null || node.right === null)
    return depth + cFactor(node.size);
  return pathLength(
    row,
    row[node.column]! < node.split ? node.left : node.right,
    depth + 1
  );
}

/** Average unsuccessful BST search path length for n points (used to normalise). */
function cFactor(n: number): number {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
}

export function isolationForestScores(
  matrix: number[][],
  nEstimators = 100,
  maxSamples = 256,
  seed = 42
): number[] {
  const rng = new SeededRng(seed);
  const heightLimit = Math.ceil(
    Math.log2(Math.max(2, Math.min(maxSamples, matrix.length)))
  );
  const trees: Node[] = [];
  for (let t = 0; t < nEstimators; t += 1) {
    const sample: number[][] = [];
    const used = new Set<number>();
    while (sample.length < Math.min(maxSamples, matrix.length)) {
      const index = rng.int(matrix.length);
      if (!used.has(index)) {
        used.add(index);
        sample.push(matrix[index]!);
      }
    }
    trees.push(buildTree(sample, 0, heightLimit, rng));
  }
  const cPsi = cFactor(Math.min(maxSamples, matrix.length));
  return matrix.map(row => {
    const meanPath =
      trees.reduce((sum, tree) => sum + pathLength(row, tree, 0), 0) /
      trees.length;
    return Math.pow(2, -meanPath / cPsi);
  });
}

const [featuresPath, scoresPath] = process.argv.slice(2);
if (featuresPath && scoresPath) {
  const { matrix } = JSON.parse(readFileSync(featuresPath, "utf8")) as {
    matrix: number[][];
  };
  const started = performance.now();
  const scores = isolationForestScores(matrix);
  const elapsedMs = Math.round(performance.now() - started);
  writeFileSync(scoresPath, JSON.stringify({ scores, elapsedMs }));
  console.log(
    `isolation_forest.mts: ${matrix.length} points scored in ${elapsedMs}ms`
  );
}
