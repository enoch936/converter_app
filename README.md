# FileForge

FileForge is a local-first file toolkit built with Next.js, React, TypeScript, `pdf-lib`, SheetJS, Mammoth, JSZip, and Tesseract.js.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Working capabilities

The current workspace implements real browser-side processing for:

- Image conversion, compression, resizing, and image-to-PDF output.
- PDF merge, page split, rotation, stream optimization, and text annotation.
- OCR image-to-text with a lazily loaded English Tesseract worker.
- DOCX raw-text extraction.
- CSV to XLSX and XLSX to CSV conversion.
- JSON validation/formatting and XML indentation.
- Multi-file selection for image-to-PDF and PDF merge.
- Downloadable output files and browser-only recent-job history.
- PWA manifest, shell service worker, sitemap, robots metadata, and CI.

Uploaded files are processed in the browser and are not sent to an application server by these workflows. The service worker caches only application resources, never uploaded files.

## Validation

```bash
npm run lint
npm run test
npm run build
```

The unit suite covers PDF page preservation, splitting, JSON validation/formatting, and ZIP archive creation.

`npm audit --omit=dev` currently reports one high-severity advisory in `xlsx` with no available upstream fix and one moderate transitive advisory through Mammoth. These browser-local dependencies need replacement or isolation before enabling remote processing.

## Hosted capabilities still requiring infrastructure

Accounts, durable job queues, remote workers, object storage, signed URLs, malware scanning, payments, advertising, and analytics are intentionally not faked in this MVP. They need a provider-backed service boundary, authentication and authorization model, retention policy, rate limits, and deployment secrets before being enabled.

The Phase 2 groundwork now includes typed server configuration in `src/lib/server/config.ts`, job and storage contracts in `src/lib/server/contracts.ts`, a guarded `/api/jobs` endpoint, `/api/health` integration reporting, and an illustrative PostgreSQL job migration under `db/migrations/`. Remote processing remains disabled unless all required providers are configured, and still returns `501` until concrete adapters are installed.

An isolated worker entry point is available with `npm run worker`. It currently processes only queued `pdf-merge` jobs and requires PostgreSQL, Redis-compatible queue, and private S3-compatible storage environment variables. It is intentionally not started by the web app.

When local PostgreSQL credentials are available, apply the job schema with:

```bash
# Set DATABASE_URL in your local environment or secret manager.
npm run db:migrate
```

The migration uses a PostgreSQL advisory lock and can be rerun safely.
