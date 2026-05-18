import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DaySchedule, TimeSlot, DayStatus, SlotStatus } from '@/data/schedule';

// 1. สร้างลิสต์ช่วงเวลาทั้งหมด ตั้งแต่ 11:00 ถึง 17:50 (รอบละ 20 นาที พัก 10 นาที)
const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

export async function GET() {
  try {
    // กำหนดการตรวจสอบสิทธิ์
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ดึง Spreadsheet ID จาก Environment Variables
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      console.warn('Missing GOOGLE_SHEET_ID in environment variables');
      return NextResponse.json({}, { status: 200 }); // Return empty object as fallback
    }

    // 2. ขยายช่วงดึงข้อมูลไปถึงคอลัมน์ R (4 คอลัมน์แรก + 14 สล็อต = 18 คอลัมน์)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:R', 
    });

    const rows = response.data.values;
    const scheduleData: Record<string, DaySchedule> = {};

    if (rows) {
      rows.forEach((row) => {
        const date = row[0];         // คอลัมน์ A
        const statusStr = row[1];    // คอลัมน์ B
        const eventName = row[2];    // คอลัมน์ C
        const location = row[3];     // คอลัมน์ D
        
        if (!date) return;

        const status = (statusStr?.toLowerCase().trim() || 'unavailable') as DayStatus;
        
        // 3. จับคู่เวลามาตรฐานกับคอลัมน์ใน Google Sheets ตามลำดับ
        const slots: TimeSlot[] = TIME_SLOTS.map((timeLabel, index) => {
          // ข้อมูลสล็อตเวลาจะเริ่มที่คอลัมน์ E ซึ่งตรงกับ index ที่ 4 ของ row
          const columnIndex = 4 + index; 
          const slotStatusStr = row[columnIndex];
          
          return {
            time: timeLabel,
            // ถ้าปล่อยช่องใน Sheets ว่างไว้ (ไม่เลือก dropdown) จะถือว่า available ทันที
            status: (slotStatusStr?.trim().toLowerCase() || 'available') as SlotStatus
          };
        });

        scheduleData[date.trim()] = {
          status,
          ...(eventName && eventName.trim() && { eventName: eventName.trim() }),
          ...(location && location.trim() && { location: location.trim() }),
          slots,
        };
      });
    }

    // กำหนด headers เพื่อป้องกันไม่ให้ Next.js ทำการ cache request นี้มากเกินไป
    return NextResponse.json(scheduleData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}