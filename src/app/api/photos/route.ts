import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { images } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Photo } from '@/data/photos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbImages = await db
      .select()
      .from(images)
      .orderBy(desc(images.createdAt));

    const mappedPhotos: Photo[] = dbImages.map((img) => {
      // Construct date string from Unix timestamp
      const dateStr = new Date(img.createdAt * 1000).toISOString().split('T')[0];
      
      const accentColors: ('pink' | 'cyan' | 'lime' | 'purple' | 'orange')[] = [
        'pink',
        'cyan',
        'lime',
        'purple',
        'orange',
      ];
      
      // Determine pseudo-random accent color based on ID
      const accentColor = accentColors[img.id % accentColors.length];

      return {
        id: img.id.toString(),
        src: img.url,
        alt: `PicHaus Photo #${img.id}`,
        artist: 'Artist',
        event: 'Uploaded Photo',
        venue: 'PicHaus Gallery',
        date: dateStr,
        width: 1200, // Default width for standard display layout
        height: 800,  // Default height for standard display layout
        accentColor,
      };
    });

    return NextResponse.json({ success: true, photos: mappedPhotos });
  } catch (error: any) {
    console.error('Error fetching photos from database:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request payload: ids must be an array.' },
        { status: 400 }
      );
    }

    // Set timestamps in descending order starting from now to preserve newest-first sorting
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < ids.length; i++) {
      const id = parseInt(ids[i], 10);
      if (!isNaN(id)) {
        await db
          .update(images)
          .set({ createdAt: now - i })
          .where(eq(images.id, id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reordering photos:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

