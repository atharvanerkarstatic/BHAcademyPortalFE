export type CsvRow = Record<string, string>;

function parseCsvLine(line: string): Array<string> {
  const result: Array<string> = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Standard CSV line parser that handles quoted strings with commas and escaped quotes.
 */
export function parseCsv(csvText: string): Array<CsvRow> {
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const lines = csvText
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const rows: Array<CsvRow> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    const rowObj: Record<string, string> = Object.fromEntries(
      headers.map((header, idx) => [
        header,
        values[idx] === undefined ? "" : values[idx],
      ])
    );
    rowObj._rowId = `csv-row-${i}`;
    rows.push(rowObj);
  }

  return rows;
}
