import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";
import type { CreateJobRequest } from "@/lib/server/contracts";

const allowedOperations = new Set(["pdf-merge"]);

export async function POST(request: Request) {
  const config = getServerConfig();
  if (!config.remoteProcessing) {
    return NextResponse.json({ error: "remote_processing_unavailable", message: "Remote processing is not configured. Use the browser-local tools or configure the database, private storage, queue, and worker." }, { status: 503 });
  }

  let body: CreateJobRequest;
  try { body = await request.json() as CreateJobRequest; } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (!allowedOperations.has(body.operation) || !Array.isArray(body.inputObjectKeys) || body.inputObjectKeys.length < 1 || body.inputObjectKeys.length > 20 || !body.idempotencyKey || body.idempotencyKey.length > 128) {
    return NextResponse.json({ error: "invalid_job_request" }, { status: 400 });
  }
  if (body.inputObjectKeys.some((key) => !/^[a-zA-Z0-9/_-]{1,240}$/.test(key) || key.includes(".."))) {
    return NextResponse.json({ error: "invalid_object_key" }, { status: 400 });
  }

  return NextResponse.json({ id: randomUUID(), status: "queued", message: "Remote job adapters are enabled for this deployment but persistence and queue wiring are not installed in this local build." }, { status: 501 });
}
