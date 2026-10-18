import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

function pageLines(items) {
  const rows = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const [, , , , x, y] = item.transform;
    const height = Math.abs(item.height || item.transform[3]) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) < height * 0.5);
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, end: x + (item.width || 0), str: item.str, height });
  }
  rows.sort((a, b) => b.y - a.y); // top of the page first

  const lines = [];
  let prevY = null;
  for (const row of rows) {
    row.parts.sort((a, b) => a.x - b.x);
    let text = "";
    let lastEnd = null;
    for (const p of row.parts) {
      // a visible gap between items is a space
      if (lastEnd !== null && p.x - lastEnd > p.height * 0.15 && !text.endsWith(" ") && !p.str.startsWith(" ")) text += " ";
      text += p.str;
      lastEnd = p.end;
    }
    // a large vertical gap keeps paragraph breaks, which separate projects
    const height = row.parts[0].height;
    if (prevY !== null && prevY - row.y > height * 2) lines.push("");
    lines.push(text.replace(/\s+/g, " ").trim());
    prevY = row.y;
  }
  return lines.join("\n");
}

// Extracts plain text from every page of a PDF File object.
export async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    pages.push(pageLines(items));
  }
  return pages.join("\n\n");
}
