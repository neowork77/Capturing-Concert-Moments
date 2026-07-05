import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/db/db';
import { images } from '@/db/schema';

// Force dynamic execution for API route
export const dynamic = 'force-dynamic';

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  try {
    // Check if configuration exists
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.R2_PUBLIC_URL;

    if (!bucketName || !publicUrlBase) {
      return NextResponse.json(
        { success: false, error: 'R2 configuration is incomplete on server.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in the request.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize file name and create a unique name
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${Date.now()}-${sanitizedFileName}`;

    // Upload to Cloudflare R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type || 'image/jpeg',
      })
    );

    // Construct the public URL
    const publicUrl = `${publicUrlBase}/${uniqueFileName}`;

    // Calculate UNIX timestamp in seconds
    const unixTimestampSeconds = Math.floor(Date.now() / 1000);

    // Save metadata to database using Drizzle ORM
    await db.insert(images).values({
      url: publicUrl,
      createdAt: unixTimestampSeconds,
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('Error during file upload process:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
