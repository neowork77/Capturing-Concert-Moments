export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getCalendarScheduleData } from '@/lib/schedule-service';

export async function GET() {
  try {
    const scheduleData = await getCalendarScheduleData();
    return NextResponse.json(scheduleData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Supabase:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}