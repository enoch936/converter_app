import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";
import { createPrivateObjectStorage } from "@/lib/server/storage";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv", "application/json", "application/xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

export async function POST(request: Request) {
  const config = getServerConfig();
  if (!config.remoteProcessing) return NextResponse.json({ error: "remote_processing_unavailable" }, { status: 503 });
  let body: { contentType?: string; size?: number };
  try { body = await request.json() as { contentType?: string; size?: number }; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!body.contentType || !allowedTypes.has(body.contentType) || !Number.isSafeInteger(body.size) || body.size! < 1 || body.size! > config.maxUploadBytes) return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
  const objectKey = `incoming/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
  try {
    const uploadUrl = await createPrivateObjectStorage().createUploadUrl({ objectKey, contentType: body.contentType, maxBytes: config.maxUploadBytes });
    return NextResponse.json({ objectKey, uploadUrl, expiresInSeconds: 600 }, { status: 201 });
  } catch { return NextResponse.json({ error: "storage_unavailable" }, { status: 503 }); }
}
