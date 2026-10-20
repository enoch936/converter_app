import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";

export function GET() {
  const config = getServerConfig();
  return NextResponse.json({ status: "ok", service: "fileforge-web", processing: config.remoteProcessing ? "remote-and-browser-local" : "browser-local", integrations: { remoteProcessing: config.remoteProcessing, storage: Boolean(config.storage.endpoint && config.storage.bucket), queue: Boolean(config.queueUrl), worker: Boolean(config.workerUrl) } }, { headers: { "Cache-Control": "no-store" } });
}
