import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db/db';
import { images } from '@/db/schema';
import { uploadToR2 } from '@/lib/r2-service';
import { verifyAdminSessionToken } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;
    if (!verifyAdminSessionToken(sessionToken)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in the request.' },
        { status: 400 }
      );
    }

    const publicUrl = await uploadToR2(file, file.name, file.type || 'image/jpeg');
    const unixTimestampSeconds = Math.floor(Date.now() / 1000);

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
