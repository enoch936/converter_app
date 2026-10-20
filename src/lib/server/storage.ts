import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerConfig } from "./config";
import type { PrivateObjectStorage } from "./contracts";

function storageClient() {
  const config = getServerConfig();
  if (!config.storage.endpoint || !config.storage.bucket || !config.storage.accessKeyId || !config.storage.secretAccessKey) throw new Error("storage_not_configured");
  return { config, client: new S3Client({ endpoint: config.storage.endpoint, region: process.env.STORAGE_REGION ?? "auto", forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true", credentials: { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey } }) };
}

export function createPrivateObjectStorage(): PrivateObjectStorage {
  return {
    async createUploadUrl({ objectKey, contentType, maxBytes }) {
      const { config, client } = storageClient();
      const command = new PutObjectCommand({ Bucket: config.storage.bucket, Key: objectKey, ContentType: contentType, Metadata: { "max-upload-bytes": String(maxBytes) } });
      return getSignedUrl(client, command, { expiresIn: 600 });
    },
    async createDownloadUrl({ objectKey, filename, expiresInSeconds }) {
      const { config, client } = storageClient();
      const command = new GetObjectCommand({ Bucket: config.storage.bucket, Key: objectKey, ResponseContentDisposition: `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"` });
      return getSignedUrl(client, command, { expiresIn: Math.min(expiresInSeconds, 900) });
    },
    async deleteObject(objectKey) {
      const { config, client } = storageClient();
      await client.send(new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: objectKey }));
    },
  };
}
