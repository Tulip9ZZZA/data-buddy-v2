/**
 * Client-side profiling helpers.
 *
 * The shared value primitives (types, isBlank, normaliseRows) moved to
 * `/engine/primitives.ts` so the browser app, the rule engine, and the
 * Node tooling parse values identically. They are re-exported here to keep
 * this module's public surface unchanged.
 */
export { isBlank, normaliseRows } from "../../../engine/primitives";
export type { DataRow, Primitive } from "../../../engine/contract";

import { isBlank as isBlankShared } from "../../../engine/primitives";
import type { DataRow, Primitive } from "../../../engine/contract";

export type ColumnProfile = {
  name: string;
  inferredType: "Text" | "Number" | "Date" | "Boolean";
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  examples: string[];
  issue?: "Missing values" | "Type mismatch" | "Format variation";
};

export type DatasetProfile = {
  rowCount: number;
  columnCount: number;
  duplicateCount: number;
  completeness: number;
  columns: ColumnProfile[];
  issues: { title: string; count: number; severity: "needs-review" | "safe" }[];
};

function inferType(values: Primitive[]): ColumnProfile["inferredType"] {
  const concrete = values.filter(value => !isBlankShared(value));
  if (concrete.length === 0) return "Text";
  if (
    concrete.every(
      value =>
        typeof value === "boolean" || /^(true|false)$/i.test(String(value))
    )
  )
    return "Boolean";
  const numberLike = concrete.filter(
    value =>
      typeof value === "number" ||
      /^-?[\d,]+(?:\.\d+)?$/.test(String(value).trim())
  );
  if (numberLike.length / concrete.length >= 0.8) return "Number";
  if (
    concrete.length > 1 &&
    concrete.filter(value => !Number.isNaN(Date.parse(String(value)))).length /
      concrete.length >
      0.8
  )
    return "Date";
  return "Text";
}

export function profileRows(rows: DataRow[]): DatasetProfile {
  const columnNames = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  );
  const columns = columnNames.map(name => {
    const values = rows.map(row => row[name] ?? null);
    const concrete = values.filter(value => !isBlankShared(value));
    const numbers = concrete
      .map(value =>
        typeof value === "number"
          ? value
          : Number(String(value).replaceAll(",", ""))
      )
      .filter(value => Number.isFinite(value));
    const type = inferType(values);
    const nullCount = values.filter(isBlankShared).length;
    const textValues = concrete.map(value => String(value));
    const hasFormatVariation =
      name.toLowerCase().includes("email") &&
      textValues.some(value => value !== value.trim().toLowerCase());
    const hasTypeMismatch =
      type === "Number" && textValues.some(value => /[a-zA-Z]/.test(value));
    return {
      name,
      inferredType: type,
      nullCount,
      uniqueCount: new Set(textValues).size,
      min: numbers.length ? Math.min(...numbers) : undefined,
      max: numbers.length ? Math.max(...numbers) : undefined,
      mean: numbers.length
        ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
        : undefined,
      examples: textValues.slice(0, 3),
      issue:
        nullCount > 0
          ? "Missing values"
          : hasTypeMismatch
            ? "Type mismatch"
            : hasFormatVariation
              ? "Format variation"
              : undefined,
    } satisfies ColumnProfile;
  });

  const recordKeys = rows.map(row =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(row).sort(([a], [b]) => a.localeCompare(b))
      )
    )
  );
  const duplicateCount = recordKeys.length - new Set(recordKeys).size;
  const missingCells = columns.reduce(
    (total, column) => total + column.nullCount,
    0
  );
  const totalCells = Math.max(rows.length * Math.max(columns.length, 1), 1);
  const issues = [
    ...columns
      .filter(column => column.nullCount > 0)
      .map(column => ({
        title: `${column.name}: missing values`,
        count: column.nullCount,
        severity: "safe" as const,
      })),
    ...(duplicateCount
      ? [
          {
            title: "Exact duplicate records",
            count: duplicateCount,
            severity: "needs-review" as const,
          },
        ]
      : []),
    ...columns
      .filter(
        column =>
          column.issue === "Format variation" ||
          column.issue === "Type mismatch"
      )
      .map(column => ({
        title: `${column.name}: ${column.issue?.toLowerCase()}`,
        count: 1,
        severity: "safe" as const,
      })),
  ];

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    duplicateCount,
    completeness: Math.round((1 - missingCells / totalCells) * 100),
    columns,
    issues,
  };
}

export function applySafeFixes(rows: DataRow[]) {
  const seen = new Set<string>();
  return rows
    .map(
      row =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            if (typeof value !== "string") return [key, value];
            const trimmed = value.trim();
            return [
              key,
              key.toLowerCase().includes("email")
                ? trimmed.toLowerCase()
                : trimmed,
            ];
          })
        ) as DataRow
    )
    .filter(row => {
      const identity = JSON.stringify(
        Object.fromEntries(
          Object.entries(row).sort(([a], [b]) => a.localeCompare(b))
        )
      );
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
}

export function flagRowsWithMissingValues(rows: DataRow[]) {
  return rows.map(row => ({
    ...row,
    data_buddy_missing_review: Object.values(row).some(isBlankShared),
  }));
}

export function coerceNumberLikeValues(rows: DataRow[]) {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const numericColumns = new Set(
    columns.filter(name => {
      const values = rows
        .map(row => row[name])
        .filter(value => !isBlankShared(value));
      return (
        values.length > 0 &&
        values.every(
          value =>
            typeof value === "number" ||
            /^-?[\d,]+(?:\.\d+)?$/.test(String(value).trim())
        )
      );
    })
  );
  return rows.map(
    row =>
      Object.fromEntries(
        Object.entries(row).map(([name, value]) => {
          if (
            !numericColumns.has(name) ||
            typeof value === "number" ||
            isBlankShared(value)
          )
            return [name, value];
          return [name, Number(String(value).replaceAll(",", ""))];
        })
      ) as DataRow
  );
}

export function createDocumentation(profile: DatasetProfile, name: string) {
  const dictionary = profile.columns
    .map(
      column =>
        `### ${column.name}\n- **Type:** ${column.inferredType}\n- **Coverage:** ${profile.rowCount - column.nullCount} of ${profile.rowCount} values\n- **Distinct values:** ${column.uniqueCount}\n- **Examples:** ${column.examples.join(", ") || "No non-empty values"}`
    )
    .join("\n\n");
  const quality = `# ${name} quality report\n\nThis dataset has **${profile.rowCount} rows** across **${profile.columnCount} columns** and is **${profile.completeness}% complete**. ${profile.duplicateCount ? `${profile.duplicateCount} exact duplicate record${profile.duplicateCount === 1 ? " was" : "s were"} flagged for review.` : "No exact duplicate records were found."}\n\n## Review notes\n${profile.issues.length ? profile.issues.map(issue => `- ${issue.title}: ${issue.count}`).join("\n") : "- No common quality issues were detected by the current checks."}`;
  return { dictionary, quality };
}
