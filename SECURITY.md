# Security Notes

FileForge currently processes supported files in the browser. Original files, OCR input, and generated outputs are not uploaded by the local workflows.

The service worker caches only application resources. It does not cache file blobs, object URLs, or user document contents.

Production deployment must provide HTTPS, preserve the response security headers configured in `next.config.ts`, and keep `.env` files out of source control. Optional database, storage, queue, payment, and analytics variables are intentionally unset in local mode.

All sensitive configuration belongs in environment variables or the deployment platform's secret manager. Never hardcode database URLs, passwords, API keys, access keys, signing secrets, payment secrets, or tokens in source code, tests, documentation, browser bundles, or committed configuration.

Before enabling remote processing, add server-side file-signature validation, randomized object keys, private storage, size and decompression limits, isolated workers, job ownership checks, signed downloads, retention cleanup, rate limiting, and malware scanning appropriate to the deployment threat model.

The remote job endpoint is deliberately guarded. It returns `503` while required providers are absent and `501` until concrete database, queue, storage, and worker adapters are installed. This prevents an environment variable from making an incomplete remote path appear production-ready.

The current adapters are not publicly activated until authentication and ownership checks are connected. Remote upload and job access must never rely on a client-supplied user ID or an unverified header.

## Dependency audit status

The current `xlsx` dependency has a high-severity prototype-pollution/ReDoS advisory with no upstream fix reported by `npm audit`. Mammoth also brings a moderate `sprintf-js` advisory. Do not expose spreadsheet or DOCX processing as a server-side public endpoint until the spreadsheet engine is replaced or isolated and the dependency audit is clean.
