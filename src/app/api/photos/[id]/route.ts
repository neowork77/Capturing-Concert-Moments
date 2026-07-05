import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { images } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { deleteFromR2 } from '@/lib/r2-service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid photo ID format' },
        { status: 400 }
      );
    }

    // Step 1: Find image in database to get the URL/Key
    const existingImages = await db
      .select()
      .from(images)
      .where(eq(images.id, numericId))
      .limit(1);

    if (existingImages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    const photoUrl = existingImages[0].url;

    // Step 2: Delete file from Cloudflare R2
    // Extract file key from URL (it's the last part after the last '/')
    const fileKey = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
    
    if (fileKey) {
      await deleteFromR2(fileKey);
    } else {
      console.warn('Could not extract file key from URL:', photoUrl);
    }

    // Step 3: Delete database record using Drizzle ORM
    await db.delete(images).where(eq(images.id, numericId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
