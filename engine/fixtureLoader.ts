/**
 * Minimal deterministic CSV reader for rule fixtures and benchmark samples.
 * Deliberately dependency-free: fixtures must be readable by humans and by
 * the lint CLI without a parser stack. Supports quoted cells with embedded
 * commas/newlines, CRLF, and UTF-8 BOM (stripped, as the intake path does).
 */
import type { DataRow, Primitive } from "./contract";

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export { parseCsvRecords as parseCsv };

function coerceCell(raw: string): Primitive {
  if (raw === "") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw.trim()) && raw.trim().length < 16)
    return Number(raw);
  if (/^(true|false)$/i.test(raw)) return /^true$/i.test(raw);
  return raw;
}

/** Parse CSV text into rows keyed by the header line. */
export function csvToRows(
  text: string,
  options: { headerless?: boolean } = {}
): DataRow[] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records = parseCsvRecords(withoutBom);
  if (!records.length) return [];
  if (options.headerless) {
    const width = Math.max(...records.map(record => record.length));
    const headers = Array.from(
      { length: width },
      (_, index) => `column_${index + 1}`
    );
    return records.map(record =>
      Object.fromEntries(
        headers.map((header, index) => [
          header,
          coerceCell(record[index] ?? ""),
        ])
      )
    );
  }
  const [header, ...body] = records;
  return body.map(record =>
    Object.fromEntries(
      header.map((name, index) => [name, coerceCell(record[index] ?? "")])
    )
  );
}
