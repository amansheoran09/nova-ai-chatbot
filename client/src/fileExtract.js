// Reads uploaded files into a form the backend/model can use.
//  - text-like files (txt, md, csv, json, code) -> { kind:'text', text }
//  - PDFs -> embedded text via pdfjs; falls back to OCR for scanned PDFs
//  - images -> base64 data URL (sent to a vision model) + optional OCR text
//  - anything else -> { kind:'unsupported' }

import * as pdfjsLib from "pdfjs-dist";

// Use a CDN worker matching the installed version (avoids Vite worker config).
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "log", "yaml", "yml",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs",
  "rb", "php", "html", "css", "sh", "sql", "xml", "ini", "env",
]);

const ext = (name) => name.split(".").pop().toLowerCase();
const OCR_PAGE_LIMIT = 15; // cap OCR work — it's slow
const OCR_SCALE = 2; // render scale for sharper OCR

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsText(file);
  });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Lazily create a shared Tesseract worker (loads ~a few MB the first time).
let workerPromise = null;
async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng"));
  }
  return workerPromise;
}

async function renderPageToCanvas(page) {
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// OCR a single image (File or canvas/data URL).
async function ocrImage(source, onProgress) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(source);
  if (onProgress) onProgress();
  return (data.text || "").trim();
}

async function extractPdf(file, onProgress) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 50);

  const pages = [];
  let embedded = "";
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const t = content.items.map((it) => it.str).join(" ").trim();
    pages.push({ page, index: i, text: t });
    embedded += t + "\n\n";
  }

  // Enough embedded text? Use it directly (fast path).
  if (embedded.trim().length >= 20 * maxPages) {
    let out = embedded.trim();
    if (pdf.numPages > maxPages) out += `\n[Truncated: ${pdf.numPages - maxPages} more pages]`;
    return { text: out, ocr: false };
  }

  // Otherwise treat as scanned: OCR the page images.
  const ocrPages = Math.min(maxPages, OCR_PAGE_LIMIT);
  let out = "";
  for (let i = 0; i < ocrPages; i++) {
    const canvas = await renderPageToCanvas(pages[i].page);
    const text = await ocrImage(canvas, onProgress);
    out += `--- Page ${pages[i].index} ---\n${text}\n\n`;
  }
  if (maxPages > ocrPages) out += `\n[OCR stopped after ${ocrPages} pages]`;
  return { text: out.trim(), ocr: true };
}

export async function extractFile(file, onProgress) {
  const base = { name: file.name, size: file.size };
  try {
    if (file.type.startsWith("image/")) {
      // Keep the image for vision models, and also OCR any text in it.
      const dataUrl = await readAsDataURL(file);
      let text = "";
      try {
        text = await ocrImage(file, onProgress);
      } catch {
        /* OCR is best-effort for images */
      }
      return { ...base, kind: "image", dataUrl, text };
    }
    if (file.type === "application/pdf" || ext(file.name) === "pdf") {
      const { text, ocr } = await extractPdf(file, onProgress);
      return { ...base, kind: "text", text, ocr };
    }
    if (file.type.startsWith("text/") || TEXT_EXT.has(ext(file.name))) {
      return { ...base, kind: "text", text: await readAsText(file) };
    }
    return { ...base, kind: "unsupported" };
  } catch (err) {
    return { ...base, kind: "error", error: err?.message || "Could not read file" };
  }
}

export async function extractFiles(files, onProgress) {
  return Promise.all(Array.from(files).map((f) => extractFile(f, onProgress)));
}
