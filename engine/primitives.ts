/**
 * Shared value primitives for the engine and all rule detectors.
 * The client re-exports these from `client/src/lib/dataBuddy.ts` so the
 * browser bundle and Node tooling parse values identically.
 */
import type { DataRow, Primitive } from "./contract";

/**
 * Blank/placeholder tokens. "?" is the UCI Adult convention (found via the
 * ground-truth evaluation, see DECISIONS.md ADR-11 and benchmarks/RESULTS.md).
 */
export const blankValues = new Set(["", "null", "n/a", "na", "none", "-", "?"]);

export function isBlank(value: Primitive): boolean {
  return (
    value === null ||
    (typeof value === "string" && blankValues.has(value.trim().toLowerCase()))
  );
}

export const asText = (value: Primitive): string =>
  value === null ? "" : String(value);

export const numberLike = (value: Primitive): boolean =>
  typeof value === "number" ||
  /^-?[\d,]+(?:\.\d+)?$/.test(asText(value).trim());

export const toNumber = (value: Primitive): number =>
  typeof value === "number" ? value : Number(asText(value).replaceAll(",", ""));

export const columnsFor = (rows: DataRow[]): string[] =>
  Array.from(new Set(rows.flatMap(row => Object.keys(row))));

/** Columns whose name matches common critical fields get escalated severity. */
export const criticalField = (column: string): boolean =>
  /(^|_)(id|age|target|outcome|label|amount|fare|value)(_|$)/i.test(column);

/** Deterministic row identity used by duplicate detection and remediation. */
export function rowIdentity(row: DataRow): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(row).sort(([left], [right]) => left.localeCompare(right))
    )
  );
}

export function quantile(
  sorted: number[],
  percentile: number
): number | undefined {
  if (!sorted.length) return undefined;
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/**
 * Intake normalisation shared by the browser app and the Node engine.
 * Dates are converted to ISO dates; anything else falls back to String().
 */
export function normaliseRows(rows: Record<string, unknown>[]): DataRow[] {
  return rows.map(row =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (value === undefined || value === "") return [key, null];
        if (value instanceof Date)
          return [key, value.toISOString().slice(0, 10)];
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        )
          return [key, value];
        return [key, String(value)];
      })
    )
  );
}
