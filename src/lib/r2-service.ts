import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT || '',
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a file (either a File object or Buffer) to Cloudflare R2 and returns its public URL.
 * 
 * @param file - The file to upload. Can be a File object (from Client/Server Action) or Buffer.
 * @param fileName - Original filename.
 * @param contentType - MIME type of the file (e.g. image/png).
 * @returns The public URL of the uploaded file.
 */
export async function uploadToR2(
  file: File | Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error('R2_BUCKET_NAME or R2_PUBLIC_URL is not set in environment variables');
  }

  let body: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = file;
  }

  // Sanitize original filename and prepend Date.now() to ensure uniqueness
  const cleanFileName = fileName.replace(/\s+/g, '_');
  const uniqueFileName = `${Date.now()}-${cleanFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFileName,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return the public URL of the uploaded image
  return `${publicUrl.replace(/\/$/, '')}/${uniqueFileName}`;
}

/**
 * Deletes a file from Cloudflare R2 by its file key.
 * 
 * @param key - The unique filename key in R2 bucket (e.g. 1720234234-myphoto.png).
 */
export async function deleteFromR2(key: string): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME is not set in environment variables');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
}

