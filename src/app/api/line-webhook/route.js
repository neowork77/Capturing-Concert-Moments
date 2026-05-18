import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

// ฟังก์ชันส่งข้อความตอบกลับหา LINE ลูกค้า
async function replyToLine(replyToken, textMessage) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: textMessage }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("❌ LINE Reply Error !! :", errorData);
  }
}

export async function POST(req) {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json({ message: 'Empty body' }, { status: 200 });
    }

    const body = JSON.parse(text);

    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ message: 'Verify Success' }, { status: 200 });
    }

    const event = body.events[0];

    if (event && event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // บอทจะทำงานเมื่อมีคำว่า ตาราง / เช็คตาราง / ว่าง / สนใจจองคิว
      if (/(ตาราง|เช็คตาราง|ว่าง|สนใจจองคิว)/.test(userMessage)) {

        let authCredentials;
        if (process.env.GOOGLE_CREDENTIALS_JSON) {
          // บน Vercel: แกะรหัสข้อความบรรทัดเดียวออกมาใช้งาน
          try {
            authCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
            if (authCredentials.private_key) {
              authCredentials.private_key = authCredentials.private_key.replace(/\\n/g, '\n');
            }
          } catch (e) {
            console.error("⚠️ Error parsing GOOGLE_CREDENTIALS_JSON:", e.message);
            throw new Error("Invalid GOOGLE_CREDENTIALS_JSON format");
          }
        } else {
          // ในคอมของน้า: แอบไปดึงไฟล์ json ในเครื่องมาใช้ตอนเทส local
          authCredentials = require('../../../../google-credentials.json'); 
        }

        const auth = new google.auth.GoogleAuth({
          credentials: authCredentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        
        if (!spreadsheetId) {
          console.warn('⚠️ ไม่พบ GOOGLE_SHEET_ID ใน Environment Variables');
          throw new Error('Missing GOOGLE_SHEET_ID');
        }

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Sheet1!A2:R',
        });

        const rows = response.data.values;
        let replyText = "✨ 📅 อัปเดตตารางคิวล่าสุดค่ะ ✨\n\n";

        if (rows && rows.length > 0) {
          rows.forEach((row) => {
            const date = row[0];                // คอลัมน์ A : วันที่
            const statusStr = row[1];           // คอลัมน์ B : สถานะเปิด/ปิดรับคิว
            const eventName = row[2] || '-';    // คอลัมน์ C : งาน
            const locationName = row[3] || '-'; // คอลัมน์ D : สถานที่

            if (!date) return;

            const dayStatus = statusStr?.toLowerCase().trim() || 'unavailable';
            const statusIcon = dayStatus === 'available' ? '🟢 เปิดรับคิว' : '🔴 งดรับคิว';

            replyText += `━━━━━━━━━━━━━━\n`;
            replyText += `📆 วันที่: ${date}\n`;
            replyText += `🎪 งาน: ${eventName}\n`;
            replyText += `📍 สถานที่: ${locationName}\n`;
            replyText += `🏷️ สถานะ: ${statusIcon}\n`;

            if (dayStatus === 'available') {
              replyText += `\n⏰ รอบเวลา:\n`;
              TIME_SLOTS.forEach((timeLabel, index) => {
                const columnIndex = 4 + index;
                const slotStatusStr = row[columnIndex];
                const slotStatus = slotStatusStr?.trim().toLowerCase() || 'available';

                if (slotStatus === 'available') {
                  replyText += `  ✅ ${timeLabel} (ว่าง)\n`;
                } else {
                  replyText += `  ❌ ${timeLabel} (เต็ม)\n`;
                }
              });
            }
            replyText += `\n`;
          });
        } else {
          replyText = "⚠️ ขออภัยค่ะ ตอนนี้ยังไม่มีข้อมูลตารางเวลาอัปเดตในระบบค่ะ";
        }

        await replyToLine(replyToken, replyText.trim());
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('❌ LINE Webhook Error:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}