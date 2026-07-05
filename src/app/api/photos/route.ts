import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { images } from '@/db/schema';
import { desc } from 'drizzle-orm';
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
