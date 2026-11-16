export type LoadingStage =
  | "intake"
  | "parse"
  | "types"
  | "duplicates"
  | "evidence"
  | "complete";

export type LoadingStageCopy = {
  left: string;
  right: string;
  mode: string;
  title: string;
  detail: string;
  index: number;
};

export const loadingStages: Record<LoadingStage, LoadingStageCopy> = {
  intake: {
    left: "READ",
    right: "INIT",
    mode: "READ: INTAKE",
    title: "Reading your file",
    detail: "Checking that Data Buddy can safely parse this source.",
    index: 0,
  },
  parse: {
    left: "COLS",
    right: "PARSE",
    mode: "PARSE: STRUCTURE",
    title: "Mapping the file structure",
    detail: "Finding the rows, columns, and first readable worksheet.",
    index: 1,
  },
  types: {
    left: "TYPES",
    right: "CHECK",
    mode: "CHECK: TYPES",
    title: "Checking column types",
    detail: "Looking for numeric, text, date, and missing-value patterns.",
    index: 2,
  },
  duplicates: {
    left: "DUPES",
    right: "CHECK",
    mode: "CHECK: DUPLICATES",
    title: "Checking duplicate records",
    detail: "Comparing visible source values without changing the upload.",
    index: 3,
  },
  evidence: {
    left: "PROOF",
    right: "BUILD",
    mode: "AUDIT: PROOF",
    title: "Building row-level evidence",
    detail: "Preparing the exact rows that need attention or review.",
    index: 4,
  },
  complete: {
    left: "READY",
    right: "OK",
    mode: "AUDIT COMPLETE",
    title: "Evidence audit ready",
    detail:
      "Your original file is untouched. Opening the evidence-first workspace now.",
    index: 5,
  },
};

export const loadingStream: LoadingStage[] = [
  "intake",
  "parse",
  "types",
  "duplicates",
  "evidence",
  "complete",
];

export function getLoadingStage(stage: LoadingStage) {
  return loadingStages[stage];
}
