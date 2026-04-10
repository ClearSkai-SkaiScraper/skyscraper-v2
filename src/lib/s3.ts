// src/lib/s3.ts
// S3 helper configured to work with MinIO (dev) and AWS S3 (prod)
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// eslint-disable-next-line no-restricted-syntax
const REGION = process.env.S3_REGION || process.env.AWS_REGION || "us-east-1";
// eslint-disable-next-line no-restricted-syntax
const ENDPOINT = process.env.S3_ENDPOINT; // e.g. http://localhost:9000
const FORCE_PATH_STYLE =
  // eslint-disable-next-line no-restricted-syntax
  process.env.S3_FORCE_PATH_STYLE === "1" || process.env.S3_FORCE_PATH_STYLE === "true";

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: !!FORCE_PATH_STYLE,
  credentials: {
    // eslint-disable-next-line no-restricted-syntax
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "minioadmin",
    secretAccessKey:
      // eslint-disable-next-line no-restricted-syntax
      process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "minioadmin",
  },
});

export async function uploadBuffer(
  buffer: Buffer | Uint8Array,
  key: string,
  contentType = "application/pdf"
) {
  // eslint-disable-next-line no-restricted-syntax
  const Bucket = process.env.S3_BUCKET || "reports";
  const cmd = new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: contentType });
  await s3.send(cmd);
  return { bucket: Bucket, key };
}

export async function getSignedGetUrl(key: string, expiresIn = 60 * 60) {
  // eslint-disable-next-line no-restricted-syntax
  const Bucket = process.env.S3_BUCKET || "reports";
  const cmd = new GetObjectCommand({ Bucket, Key: key });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
}

const s3Client = { uploadBuffer, getSignedGetUrl };
export default s3Client;
