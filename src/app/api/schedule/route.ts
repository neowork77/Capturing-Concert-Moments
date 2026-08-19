export const revalidate = 60; // Cache for 1 minute

import { NextResponse } from 'next/server';
import { getCalendarScheduleData } from '@/lib/schedule-service';

export async function GET() {
  try {
    const scheduleData = await getCalendarScheduleData();
    return NextResponse.json(scheduleData);
  } catch (error: any) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Supabase:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}