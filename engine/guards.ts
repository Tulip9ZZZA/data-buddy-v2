/**
 * Adversarial-input intake guards.
 *
 * Anything inside an uploaded file is DATA, never code. These guards bound the
 * cost of hostile inputs (row bombs, column bombs, oversized cells, workbooks
 * whose declared dimensions are lies) before any rule runs. Each guard maps to
 * a case in `security/adversarial.md` with a pytest/vitest counterpart.
 */
import type { IntakeGuardState } from "./contract";

/** Above this row count the audit is safely rejected instead of OOM-killed. */
export const MAX_ROWS_HARD = 10_000_000;
/** Above this row count exact-duplicate detection runs in documented sample mode. */
export const DEDUPE_EXACT_LIMIT = 2_000_000;
/** Column-count ceiling (a 200-col file passes; a 100k-col file is rejected). */
export const MAX_COLUMNS = 2_000;
/** A single cell larger than this is truncated for evidence display only. */
export const MAX_CELL_CHARS = 100_000;

export class SafeRejection extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SafeRejection";
    this.code = code;
  }
}

export { SafeRejection as SafeRejectionError };

export function initialGuardState(): IntakeGuardState {
  return {
    dedupeSampled: false,
    dedupeSampleSize: DEDUPE_EXACT_LIMIT,
    rejectedReason: null,
    truncatedCells: 0,
  };
}

/**
 * Structural guard applied after parsing and before any rule runs.
 * Throws SafeRejection for shapes we refuse to audit; otherwise returns the
 * guard state the runner must attach to the report.
 */
export function applyIntakeGuards(
  rows: { length: number },
  columnCount: number
): IntakeGuardState {
  const state = initialGuardState();
  if (rows.length > MAX_ROWS_HARD) {
    throw new SafeRejection(
      "ROWS_ABOVE_HARD_LIMIT",
      `This file has ${rows.length.toLocaleString()} rows. Data Buddy audits at most ${MAX_ROWS_HARD.toLocaleString()} rows per file and rejected the job safely. The source file was not touched.`
    );
  }
  if (columnCount > MAX_COLUMNS) {
    throw new SafeRejection(
      "COLUMNS_ABOVE_LIMIT",
      `This file has ${columnCount.toLocaleString()} columns. Data Buddy audits at most ${MAX_COLUMNS.toLocaleString()} columns per file and rejected the job safely.`
    );
  }
  if (rows.length > DEDUPE_EXACT_LIMIT) {
    state.dedupeSampled = true;
  }
  return state;
}

/**
 * Workbook dimension guard for the zip-bomb case: `SheetJS` exposes the
 * declared `!ref` range BEFORE decoding cells. A workbook that declares more
 * cells than this ceiling is rejected without materialising the explosion.
 */
export const MAX_WORKBOOK_CELLS = 5_000_000;

export function validateWorkbookDimensions(
  range: string | undefined,
  sheetName: string
): void {
  if (!range) return;
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
  if (!match) return;
  const lastRow = Number(match[4]);
  const lastColumnLetters = match[3];
  let lastColumn = 0;
  for (const char of lastColumnLetters)
    lastColumn = lastColumn * 26 + (char.charCodeAt(0) - 64);
  const cells = lastRow * lastColumn;
  if (cells > MAX_WORKBOOK_CELLS) {
    throw new SafeRejection(
      "WORKBOOK_DIMENSION_BOMB",
      `Sheet "${sheetName}" declares ${lastRow.toLocaleString()} rows × ${lastColumn.toLocaleString()} columns (${cells.toLocaleString()} cells). Data Buddy rejects workbooks above ${MAX_WORKBOOK_CELLS.toLocaleString()} declared cells before reading them.`
    );
  }
}

/** Evidence-display truncation: hostile cell text never reaches the DOM in full. */
export function truncateCellText(
  value: unknown,
  state: IntakeGuardState
): string {
  if (typeof value !== "string")
    return value === null || value === undefined ? "" : String(value);
  if (value.length <= MAX_CELL_CHARS) return value;
  state.truncatedCells += 1;
  return `${value.slice(0, MAX_CELL_CHARS)}… [truncated ${value.length - MAX_CELL_CHARS} chars]`;
}
