import {
  applySafeFixes,
  coerceNumberLikeValues,
  flagRowsWithMissingValues,
  type DataRow,
} from "./dataBuddy";

export type CleaningAction = "format" | "flagMissing" | "coerceNumbers";
export type RecentDataset = {
  name: string;
  rows: number;
  columns: number;
  label: string;
};

export function createImportedDataset(
  fileName: string,
  rows: DataRow[]
): RecentDataset {
  return {
    name: fileName.replace(/\.[^/.]+$/, ""),
    rows: rows.length,
    columns: Object.keys(rows[0] ?? {}).length,
    label: "This session",
  };
}

export function applyCleaningAction(rows: DataRow[], action: CleaningAction) {
  if (action === "format") {
    const nextRows = applySafeFixes(rows);
    const removed = rows.length - nextRows.length;
    return {
      rows: nextRows,
      notice: `Applied deterministic trims and email normalization${removed ? `; removed ${removed} exact duplicate record${removed === 1 ? "" : "s"}` : ""}.`,
    };
  }
  if (action === "flagMissing") {
    return {
      rows: flagRowsWithMissingValues(rows),
      notice:
        "Added a data_buddy_missing_review flag. Original blank values are still untouched.",
    };
  }
  return {
    rows: coerceNumberLikeValues(rows),
    notice:
      "Converted values only in columns where every non-empty value is number-like.",
  };
}
