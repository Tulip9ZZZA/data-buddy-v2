import { describe, expect, it } from "vitest";
import { csvToRows, parseCsv } from "./fixtureLoader";

describe("fixtureLoader CSV parsing", () => {
  it("parses quoted cells with embedded commas and keeps them as text", () => {
    const rows = csvToRows('name,note\n"Doe, Jane","said ""hi"", twice"\n');
    expect(rows[0]).toEqual({ name: "Doe, Jane", note: 'said "hi", twice' });
  });

  it("coerces number-like and boolean cells, keeping the rest as strings", () => {
    const rows = csvToRows("id,active,mixed\n42,true,007a\n");
    expect(rows[0]).toEqual({ id: 42, active: true, mixed: "007a" });
  });

  it("strips a UTF-8 BOM and handles CRLF line endings", () => {
    const rows = csvToRows("\uFEFFa,b\r\n1,2\r\n");
    expect(Object.keys(rows[0]!)).toEqual(["a", "b"]);
    expect(rows[0]).toEqual({ a: 1, b: 2 });
  });

  it("returns an empty array for BOM-only or empty input", () => {
    expect(csvToRows("")).toEqual([]);
    expect(csvToRows("\uFEFF")).toEqual([]);
  });

  it("supports headerless files with generated column names", () => {
    const rows = csvToRows("1,x\n2,y\n", { headerless: true });
    expect(Object.keys(rows[0]!)).toEqual(["column_1", "column_2"]);
    expect(rows[1]).toEqual({ column_1: 2, column_2: "y" });
  });

  it("treats blank cells as null", () => {
    expect(csvToRows("a,b\n1,\n")[0]).toEqual({ a: 1, b: null });
  });

  it("exposes the raw record parser for tools that need it", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
