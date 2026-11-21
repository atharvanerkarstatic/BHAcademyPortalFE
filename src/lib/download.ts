/**
 * Triggers a browser file download from an in-memory BlobPart.
 */
export function downloadBlob(
  content: BlobPart,
  filename: string,
  mimeType?: string
): void {
  const blob = new Blob([content], mimeType ? { type: mimeType } : undefined);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

/**
 * Triggers a browser CSV file download.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  downloadBlob(csvContent, filename, "text/csv;charset=utf-8;");
}
