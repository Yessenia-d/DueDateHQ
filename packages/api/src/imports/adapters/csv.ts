import type { ParsedCsv } from "./types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeLineEndings(csvText: string): string[] {
  return csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

function looksLikeHeader(cells: readonly string[]): boolean {
  const normalizedCells = cells.map((cell) => cell.trim().toLowerCase());
  const headerCells = normalizedCells.filter((cell) =>
    /account|address|amount|billing|client|company|contact|county|custom|customer|date|deadline|description|due|ein|entity|filing|first|fiscal|form|frequency|identifier|jurisdiction|last|linked|memo|month|name|organization|period|phone|profile|province|return|ssn|state|status|tax|type|year/.test(
      cell,
    ),
  );
  const valueCells = normalizedCells.filter((cell) =>
    /^(1040|1041|1065|1120s?|ca|ny|tx|fl)$/.test(cell),
  );

  return (
    headerCells.length >= Math.max(1, Math.ceil(cells.length * 0.6)) &&
    valueCells.length === 0
  );
}

export function parseCsvText(csvText: string): ParsedCsv {
  const lines = normalizeLineEndings(csvText);
  if (lines.length === 0) {
    return { headers: [], rows: [], headerDetected: false };
  }

  const firstRow = splitCsvLine(lines[0] ?? "");
  const headerDetected = looksLikeHeader(firstRow);
  const headers = headerDetected
    ? firstRow.map((header, index) => header || `Column ${index + 1}`)
    : firstRow.map((_cell, index) => `Column ${index + 1}`);
  const dataLines = headerDetected ? lines.slice(1) : lines;

  const rows = dataLines.map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};

    for (let index = 0; index < headers.length; index++) {
      const header = headers[index] ?? `Column ${index + 1}`;
      row[header] = values[index]?.trim() ?? "";
    }

    return row;
  });

  return { headers, rows, headerDetected };
}
