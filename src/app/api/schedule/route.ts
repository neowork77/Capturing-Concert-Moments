import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DaySchedule, TimeSlot, DayStatus, SlotStatus } from '@/data/schedule';
import fs from 'fs';
import path from 'path';

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

export async function GET() {
  try {
    let authCredentials;

    // 1. แปลง Credentials อย่างปลอดภัยและจัดการกับ Error
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        authCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        // แก้ไขปัญหา Vercel ดัดแปลง \n ใน private key
        if (authCredentials.private_key) {
          authCredentials.private_key = authCredentials.private_key.replace(/\\n/g, '\n');
        }
      } catch (parseError) {
        console.error("❌ แปลง GOOGLE_CREDENTIALS_JSON ไม่สำเร็จ:", parseError);
        return NextResponse.json({ error: 'รูปแบบ Google Credentials ไม่ถูกต้อง (JSON Parse Error)' }, { status: 500 });
      }
    } else {
      const localKeyPath = path.join(process.cwd(), 'google-credentials.json');
      if (fs.existsSync(localKeyPath)) {
        authCredentials = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      }
    }

    // 2. ถ้าไม่มี Credentials เลยให้ดัก Error ทันที
    if (!authCredentials) {
      console.error('❌ ไม่พบ Google Credentials ตรวจสอบการตั้งค่า Environment Variables ใน Vercel');
      return NextResponse.json({ error: 'Server configuration error: Missing credentials' }, { status: 500 });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('⚠️ ไม่พบ GOOGLE_SHEET_ID ใน Environment Variables');
      return NextResponse.json({}, { status: 200 }); 
    }

    // 3. เริ่มต้น Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: authCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 4. ดึงข้อมูล
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:R',
    });

    const rows = response.data.values;
    const scheduleData: Record<string, DaySchedule> = {};

    if (rows) {
      rows.forEach((row) => {
        const date = row[0];         
        const statusStr = row[1];    
        const eventName = row[2];    
        const location = row[3];     

        if (!date) return;

        const status = (statusStr?.toLowerCase().trim() || 'unavailable') as DayStatus;

        const slots: TimeSlot[] = TIME_SLOTS.map((timeLabel, index) => {
          const columnIndex = 4 + index;
          const slotStatusStr = row[columnIndex];

          return {
            time: timeLabel,
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

    return NextResponse.json(scheduleData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    // 5. ปรับปรุงการล็อก Error ให้เห็นข้อความชัดเจนขึ้น
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}