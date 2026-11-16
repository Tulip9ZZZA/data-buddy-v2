/**
 * Test helper shared by every rule's test_rule.test.ts.
 * Builds a DetectionContext the same way the production runner does, so rule
 * tests exercise the real input shape without running the whole registry.
 */
import type {
  DetectionContext,
  DataRow,
  Primitive,
  RuleMeta,
} from "./contract";
import { initialGuardState } from "./guards";
import { columnsFor, isBlank } from "./primitives";

export function makeContext(rows: DataRow[], meta: RuleMeta): DetectionContext {
  const columns = columnsFor(rows);
  const columnValues = new Map<string, Primitive[]>(
    columns.map(column => [
      column,
      rows.map(row => (row[column] ?? null) as Primitive),
    ])
  );
  const nonBlankValues = new Map<string, Primitive[]>(
    Array.from(columnValues, ([column, values]) => [
      column,
      values.filter(value => !isBlank(value)),
    ])
  );
  return {
    rows,
    columns,
    columnValues,
    nonBlankValues,
    rule: meta,
    guards: initialGuardState(),
  };
}
