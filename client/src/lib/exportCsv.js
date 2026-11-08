function escapeCsvCell(value) {
  let text = String(value ?? "");

  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function buildCsv(columns, rows) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new RangeError("CSV export requires at least one column.");
  }

  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.value(row))).join(",")
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function downloadCsv(filename, columns, rows) {
  const csv = buildCsv(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
