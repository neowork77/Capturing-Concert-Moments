export const revalidate = 300; // Cache for 5 minutes

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DaySchedule, TimeSlot, DayStatus, SlotStatus } from '@/data/schedule';

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

export async function GET() {
  try {
    let authCredentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      // บน Vercel: แกะรหัสข้อความบรรทัดเดียวออกมาใช้งาน
      try {
        authCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        if (authCredentials.private_key) {
          authCredentials.private_key = authCredentials.private_key.replace(/\\n/g, '\n');
        }
      } catch (e: any) {
        console.error("⚠️ Error parsing GOOGLE_CREDENTIALS_JSON:", e.message);
        throw new Error("Invalid GOOGLE_CREDENTIALS_JSON format");
      }
    } else {
      // ในคอมของน้า: แอบไปดึงไฟล์ json ในเครื่องมาใช้ตอนเทส local
      authCredentials = require('../../../../google-credentials.json'); 
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      console.warn('⚠️ ไม่พบ GOOGLE_SHEET_ID ใน Environment Variables');
      return NextResponse.json({}, { status: 200 }); 
    }

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

    return NextResponse.json(scheduleData);
  } catch (error: any) {
    // 5. ปรับปรุงการล็อก Error ให้เห็นข้อความชัดเจนขึ้น
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch schedule data' }, { status: 500 });
  }
}