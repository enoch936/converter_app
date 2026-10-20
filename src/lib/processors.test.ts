import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { convertDocument, mergePdfs, splitPdf, zipFiles } from "./processors";

async function pdfFile(pageCount = 1) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) document.addPage();
  return new File([await document.save() as unknown as ArrayBuffer], "sample.pdf", { type: "application/pdf" });
}

describe("document processors", () => {
  it("merges PDFs and preserves page count", async () => {
    const merged = await mergePdfs([await pdfFile(), await pdfFile(2)]);
    const document = await PDFDocument.load(await merged.arrayBuffer());
    expect(document.getPageCount()).toBe(3);
  });

  it("splits a selected PDF page", async () => {
    const split = await splitPdf(await pdfFile(2), 2);
    const document = await PDFDocument.load(await split.arrayBuffer());
    expect(document.getPageCount()).toBe(1);
  });

  it("formats JSON and rejects malformed JSON", async () => {
    const valid = await convertDocument(new File(['{"name":"FileForge"}'], "data.json"), "json-format");
    expect(await valid.text()).toContain("\n  \"name\": \"FileForge\"");
    await expect(convertDocument(new File(["not json"], "data.json"), "json-format")).rejects.toThrow("invalid JSON");
  });

  it("creates a downloadable archive from batch outputs", async () => {
    const archive = await zipFiles([{ name: "one.txt", blob: new Blob(["one"]) }, { name: "two.txt", blob: new Blob(["two"]) }]);
    expect(archive.type).toBe("application/zip");
    expect(archive.size).toBeGreaterThan(0);
  });
});
