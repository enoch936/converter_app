import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

export type PdfOperation = "merge" | "split" | "rotate" | "compress" | "edit";
export type DocumentOperation = "docx-to-txt" | "csv-to-xlsx" | "xlsx-to-csv" | "json-format" | "xml-format";

function pdfBlob(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as unknown as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
}

export async function mergePdfs(files: File[]) {
  const output = await PDFDocument.create();
  for (const file of files) {
    const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
    const pages = await output.copyPages(source, source.getPageIndices());
    pages.forEach((page) => output.addPage(page));
  }
  return pdfBlob(await output.save());
}

export async function splitPdf(file: File, pageNumber: number) {
  const source = await PDFDocument.load(await file.arrayBuffer());
  if (pageNumber < 1 || pageNumber > source.getPageCount()) throw new Error(`Page must be between 1 and ${source.getPageCount()}.`);
  const output = await PDFDocument.create();
  const [page] = await output.copyPages(source, [pageNumber - 1]);
  output.addPage(page);
  return pdfBlob(await output.save());
}

export async function rotatePdf(file: File, rotation = 90) {
  const document = await PDFDocument.load(await file.arrayBuffer());
  document.getPages().forEach((page) => page.setRotation(degrees(page.getRotation().angle + rotation)));
  return pdfBlob(await document.save());
}

export async function compressPdf(file: File) {
  const document = await PDFDocument.load(await file.arrayBuffer());
  return pdfBlob(await document.save({ useObjectStreams: true, addDefaultPage: false }));
}

export async function editPdf(file: File, text: string) {
  const document = await PDFDocument.load(await file.arrayBuffer());
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.getPages()[0];
  page.drawText(text, { x: 48, y: page.getHeight() - 58, size: 14, font, color: rgb(0.15, 0.35, 0.28) });
  return pdfBlob(await document.save());
}

export async function imagesToPdf(files: File[]) {
  const document = await PDFDocument.create();
  for (const file of files) {
    const imageBytes = await file.arrayBuffer();
    const image = file.type === "image/jpeg" ? await document.embedJpg(imageBytes) : await document.embedPng(imageBytes);
    const page = document.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  return pdfBlob(await document.save());
}

export async function convertSpreadsheet(file: File, target: "xlsx" | "csv") {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("The spreadsheet has no readable sheets.");
  if (target === "csv") return new Blob([XLSX.utils.sheet_to_csv(firstSheet)], { type: "text/csv;charset=utf-8" });
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([output as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function formatXml(xml: string) {
  return xml.replace(/>\s*</g, "><").replace(/(>)(<)(\/*)/g, "$1\n$2$3").split("\n").reduce((formatted, line) => {
    const trimmed = line.trim();
    if (!trimmed) return formatted;
    const depth = trimmed.startsWith("</") ? Math.max(0, formatted.depth - 1) : formatted.depth;
    formatted.lines.push("  ".repeat(depth) + trimmed);
    if (trimmed.match(/^<[^!?/][^>]*[^/]>/) && !trimmed.includes("</")) formatted.depth = depth + 1;
    return formatted;
  }, { lines: [] as string[], depth: 0 }).lines.join("\n");
}

export async function convertDocument(file: File, operation: DocumentOperation) {
  if (operation === "docx-to-txt") {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return new Blob([result.value], { type: "text/plain;charset=utf-8" });
  }
  const text = await file.text();
  if (operation === "json-format") {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("The file contains invalid JSON."); }
    return new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json;charset=utf-8" });
  }
  if (operation === "xml-format") return new Blob([formatXml(text)], { type: "application/xml;charset=utf-8" });
  if (operation === "csv-to-xlsx") {
    const workbook = XLSX.read(text, { type: "string" });
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([output as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return new Blob([XLSX.utils.sheet_to_csv(firstSheet)], { type: "text/csv;charset=utf-8" });
}

export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const zip = new JSZip();
  files.forEach(({ name, blob }) => zip.file(name, blob));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function recognizeText(file: File, onProgress?: (progress: number) => void) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, { logger: (message) => onProgress?.(Math.round((message.progress ?? 0) * 100)) });
  const result = await worker.recognize(file);
  await worker.terminate();
  return result.data.text;
}
