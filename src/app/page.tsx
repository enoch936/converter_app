"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Download, FileImage, FileText, Files, History, LockKeyhole, Menu, RefreshCw, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { compressPdf, convertDocument, convertSpreadsheet, editPdf, imagesToPdf, mergePdfs, recognizeText, rotatePdf, splitPdf } from "@/lib/processors";

type Operation = "image" | "images-pdf" | "merge-pdf" | "split-pdf" | "rotate-pdf" | "compress-pdf" | "edit-pdf" | "ocr" | "docx-txt" | "csv-xlsx" | "xlsx-csv" | "json" | "xml";
type Result = { name: string; size: number; url: string; type: string };

const operations: { id: Operation; label: string; description: string; accepts: string; icon: typeof FileImage; group: string }[] = [
  { id: "image", label: "Image converter", description: "Convert, compress, resize", accepts: "Images", icon: FileImage, group: "Images" },
  { id: "images-pdf", label: "Images to PDF", description: "Combine images into one PDF", accepts: "Multiple images", icon: Files, group: "PDF" },
  { id: "merge-pdf", label: "Merge PDF", description: "Join multiple documents", accepts: "Multiple PDFs", icon: Files, group: "PDF" },
  { id: "split-pdf", label: "Split PDF", description: "Extract any page", accepts: "One PDF", icon: FileText, group: "PDF" },
  { id: "rotate-pdf", label: "Rotate PDF", description: "Correct page orientation", accepts: "One PDF", icon: RefreshCw, group: "PDF" },
  { id: "compress-pdf", label: "Compress PDF", description: "Optimize document streams", accepts: "One PDF", icon: Sparkles, group: "PDF" },
  { id: "edit-pdf", label: "Edit PDF", description: "Add a text annotation", accepts: "One PDF", icon: FileText, group: "PDF" },
  { id: "ocr", label: "OCR image", description: "Extract text from a scan", accepts: "Image", icon: FileText, group: "Documents" },
  { id: "docx-txt", label: "DOCX to text", description: "Extract document content", accepts: "DOCX", icon: FileText, group: "Documents" },
  { id: "csv-xlsx", label: "CSV to XLSX", description: "Create a spreadsheet", accepts: "CSV", icon: Files, group: "Data" },
  { id: "xlsx-csv", label: "XLSX to CSV", description: "Export the first sheet", accepts: "XLSX", icon: Files, group: "Data" },
  { id: "json", label: "Format JSON", description: "Validate and beautify", accepts: "JSON", icon: FileText, group: "Developer" },
  { id: "xml", label: "Format XML", description: "Indent and inspect", accepts: "XML", icon: FileText, group: "Developer" },
];

function formatBytes(bytes: number) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`; }
function baseName(name: string) { return name.replace(/\.[^/.]+$/, ""); }
function outputName(file: File, operation: Operation) { const name = baseName(file.name); const endings: Partial<Record<Operation, string>> = { "images-pdf": "pdf", "merge-pdf": "pdf", "split-pdf": "pdf", "rotate-pdf": "pdf", "compress-pdf": "pdf", "edit-pdf": "pdf", ocr: "txt", "docx-txt": "txt", "csv-xlsx": "xlsx", "xlsx-csv": "csv", json: "json", xml: "xml" }; return `${name}-fileforge.${endings[operation] ?? "webp"}`; }

export default function Home() {
  const [operation, setOperation] = useState<Operation>("image");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [format, setFormat] = useState<"webp" | "jpeg" | "png">("webp");
  const [quality, setQuality] = useState(82);
  const [width, setWidth] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [editText, setEditText] = useState("Reviewed with FileForge");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "ready" | "processing" | "complete" | "error">("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem("fileforge-history") ?? "[]"); } catch { return []; } });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  const active = operations.find((item) => item.id === operation) ?? operations[0];
  const isMulti = ["images-pdf", "merge-pdf"].includes(operation);

  const chooseFiles = (selected: File[]) => {
    const filtered = selected.filter((file) => file.size <= 50 * 1024 * 1024);
    if (!filtered.length) { setError("Choose a supported file under 50 MB."); setStatus("error"); return; }
    setFiles(isMulti ? filtered : [filtered[0]]); setResult(null); setError(""); setStatus("ready");
    if (operation === "image") { const image = new Image(); image.onload = () => setWidth(image.naturalWidth); image.src = URL.createObjectURL(filtered[0]); }
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => chooseFiles(Array.from(event.target.files ?? []));
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); chooseFiles(Array.from(event.dataTransfer.files)); };
  const selectOperation = (next: Operation) => { setOperation(next); setFiles([]); setResult(null); setStatus("idle"); setError(""); setProgress(0); };

  const process = async () => {
    if (!files.length) return;
    setStatus("processing"); setError(""); setProgress(0);
    try {
      let blob: Blob;
      if (operation === "merge-pdf") blob = await mergePdfs(files);
      else if (operation === "images-pdf") blob = await imagesToPdf(files);
      else if (operation === "split-pdf") blob = await splitPdf(files[0], pageNumber);
      else if (operation === "rotate-pdf") blob = await rotatePdf(files[0]);
      else if (operation === "compress-pdf") blob = await compressPdf(files[0]);
      else if (operation === "edit-pdf") blob = await editPdf(files[0], editText);
      else if (operation === "ocr") blob = new Blob([await recognizeText(files[0], setProgress)], { type: "text/plain;charset=utf-8" });
      else if (operation === "docx-txt") blob = await convertDocument(files[0], "docx-to-txt");
      else if (operation === "csv-xlsx") blob = await convertDocument(files[0], "csv-to-xlsx");
      else if (operation === "xlsx-csv") blob = await convertSpreadsheet(files[0], "csv");
      else if (operation === "json") blob = await convertDocument(files[0], "json-format");
      else if (operation === "xml") blob = await convertDocument(files[0], "xml-format");
      else {
        const image = new Image(); const source = URL.createObjectURL(files[0]);
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("This image could not be decoded.")); image.src = source; });
        const targetWidth = Math.max(1, Math.min(width || image.naturalWidth, 8000)); const targetHeight = Math.max(1, Math.round(image.naturalHeight * (targetWidth / image.naturalWidth))); const canvas = document.createElement("canvas"); canvas.width = targetWidth; canvas.height = targetHeight; const context = canvas.getContext("2d"); if (!context) throw new Error("Image processing is not available in this browser."); context.drawImage(image, 0, 0, targetWidth, targetHeight); URL.revokeObjectURL(source);
        const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, `image/${format}`, quality / 100)); if (!output) throw new Error("Could not create the output file."); blob = output;
      }
      const output: Result = { name: outputName(files[0], operation), size: blob.size, url: URL.createObjectURL(blob), type: blob.type };
      setResult(output); setStatus("complete"); setProgress(100); const nextHistory = [`${active.label} · ${files[0].name}`, ...history].slice(0, 8); setHistory(nextHistory); localStorage.setItem("fileforge-history", JSON.stringify(nextHistory));
    } catch (processingError) { setError(processingError instanceof Error ? processingError.message : "The file could not be processed."); setStatus("error"); }
  };
  const clear = () => { setFiles([]); setResult(null); setError(""); setStatus("idle"); setProgress(0); if (inputRef.current) inputRef.current.value = ""; };

  return <main className="site-shell">
    <nav className="topbar"><a className="brand" href="#top" aria-label="FileForge home"><span className="brand-mark"><Sparkles size={17} /></span><span>fileforge</span></a><div className="desktop-nav"><a href="#workspace">Workspace</a><a href="#tools">All tools</a><a href="#history">History</a></div><button className="menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button><button className="nav-cta" onClick={() => inputRef.current?.click()}>Try a tool <ArrowRight size={15} /></button></nav>
    {menuOpen && <div className="mobile-menu"><a href="#workspace">Workspace</a><a href="#tools">All tools</a><a href="#history">History</a></div>}
    <section className="hero" id="top"><div className="eyebrow"><span className="eyebrow-dot" /> FILE TOOLS, WITHOUT THE FRICTION</div><h1>Make your files<br /><em>work harder.</em></h1><p>Convert, compress, edit, and organize your files in seconds. Local-first tools with a clear path to more.</p><div className="hero-actions"><button className="primary-button" onClick={() => inputRef.current?.click()}>Start with a file <Upload size={17} /></button><span className="local-note"><LockKeyhole size={14} /> Local processing by default</span></div></section>
    <section className="workspace-section" id="workspace"><div className="section-kicker"><span>01</span><span>PROCESSING WORKSPACE</span></div><div className="workspace-grid">
      <div className="tool-picker"><div className="picker-head"><span className="mini-label">CHOOSE A WORKFLOW</span><span className="local-badge"><ShieldCheck size={13} /> private</span></div><div className="operation-list">{operations.map(({ id, label, description, accepts, icon: Icon }) => <button key={id} className={`operation-option ${operation === id ? "selected" : ""}`} onClick={() => selectOperation(id)}><span className="tool-card-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>{description} · {accepts}</small></span>{operation === id && <Check size={15} />}</button>)}</div></div>
      <div className={`dropzone ${dragging ? "is-dragging" : ""} ${files.length ? "has-file" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><input ref={inputRef} type="file" multiple={isMulti} accept="*/*" onChange={handleFileChange} hidden />{!files.length ? <><div className="upload-icon"><Upload size={23} /></div><h2>Drop {isMulti ? "files" : "a file"} here</h2><p>or <button className="inline-button" onClick={() => inputRef.current?.click()}>browse your files</button></p><span className="file-hint">{active.accepts} · up to 50 MB per file</span></> : <><div className="file-icon"><Files size={23} /></div><h2>{files.length === 1 ? files[0].name : `${files.length} files selected`}</h2><p>{formatBytes(files.reduce((sum, file) => sum + file.size, 0))} <span className="file-ready"><Check size={13} /> ready</span></p><button className="remove-button" onClick={clear}><X size={14} /> Clear selection</button></>}</div>
      <div className="settings-panel"><div className="panel-title"><div><span className="mini-label">{active.group.toUpperCase()}</span><h2>{active.label}</h2></div><span className="local-badge"><ShieldCheck size={13} /> local</span></div>{operation === "image" && <><label className="field-label">Output format</label><div className="format-grid">{["webp", "jpeg", "png"].map((item) => <button key={item} className={`format-option ${format === item ? "selected" : ""}`} onClick={() => setFormat(item as typeof format)}>.{item === "jpeg" ? "jpg" : item}{format === item && <Check size={14} />}</button>)}</div><div className="control-row"><label className="field-label" htmlFor="width">Width <span>px</span></label><div className="number-input"><input id="width" type="number" min="1" max="8000" value={width || ""} onChange={(event) => setWidth(Number(event.target.value))} placeholder="Original" /><span>px</span></div></div><div className="quality-control"><div className="control-row"><label className="field-label" htmlFor="quality">Quality</label><strong>{quality}%</strong></div><input id="quality" type="range" min="10" max="100" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /></div></>}{operation === "split-pdf" && <div className="control-row"><label className="field-label" htmlFor="page">Page number</label><div className="number-input"><input id="page" type="number" min="1" value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value))} /></div></div>}{operation === "edit-pdf" && <label className="text-field"><span>Annotation text</span><input value={editText} onChange={(event) => setEditText(event.target.value)} /></label>}{operation === "ocr" && <p className="capability-note"><FileText size={16} /> OCR downloads the extracted text. The first run loads the language engine locally.</p>}{error && <p className="error-message">{error}</p>}{result ? <div className="result-box"><div><span className="mini-label">READY TO DOWNLOAD</span><strong>{result.name}</strong><small>{formatBytes(result.size)} · completed locally</small></div><a className="download-button" href={result.url} download={result.name} aria-label="Download processed file"><Download size={17} /></a></div> : <button className="process-button" disabled={!files.length || status === "processing"} onClick={process}>{status === "processing" ? <><RefreshCw size={16} className="spin" /> {operation === "ocr" ? `Reading ${progress}%` : "Processing locally..."}</> : <>Process {files.length > 1 ? `${files.length} files` : "file"} <ArrowRight size={16} /></>}</button>}<p className="privacy-note"><LockKeyhole size={13} /> Files stay in this browser.</p></div>
    </div></section>
    <section className="tools-section" id="tools"><div className="section-heading"><div><div className="section-kicker"><span>02</span><span>THE TOOLBOX</span></div><h2>One workspace.<br /><em>Many workflows.</em></h2></div><p>PDF, document, data, image, and developer utilities share the same predictable flow.</p></div><div className="tools-grid">{operations.slice(0, 9).map(({ id, label, description, icon: Icon }) => <button key={id} className="tool-card" onClick={() => { selectOperation(id); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); }}><span className="tool-card-icon"><Icon size={20} /></span><span><strong>{label}</strong><small>{description}</small></span><ChevronDown size={16} className="tool-arrow" /></button>)}</div></section>
    <section className="privacy-section" id="history"><div className="privacy-visual"><div className="privacy-ring"><History size={27} /></div></div><div><div className="section-kicker"><span>03</span><span>LOCAL HISTORY</span></div><h2>Your work,<br /><em>kept nearby.</em></h2><p>{history.length ? `${history.length} recent jobs are stored only in this browser.` : "Your recent jobs will appear here after your first result."} No document contents are saved.</p>{history.length > 0 && <div className="history-list">{history.slice(0, 4).map((item) => <div key={item}><Check size={13} /> {item}</div>)}</div>}<a href="#workspace" className="text-link">Process another file <ArrowRight size={15} /></a></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark"><Sparkles size={15} /></span><span>fileforge</span></a><span>Useful tools for the everyday file.</span><span>© 2026 FileForge</span></footer>
  </main>;
}
