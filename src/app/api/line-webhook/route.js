import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

// ฟังก์ชันส่งข้อความตอบกลับหา LINE ลูกค้า (รองรับ Flex Message)
async function replyToLine(replyToken, messageObject) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: Array.isArray(messageObject) ? messageObject : [messageObject],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("❌ LINE Reply Error !! :", errorData);
  }
}

// ฟังก์ชันดึงข้อมูลจาก Google Sheets
async function getGoogleSheetData() {
  let authCredentials;
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
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
    authCredentials = require('../../../../google-credentials.json');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: authCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A2:R',
  });

  return response.data.values || [];
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

    // ป้องกันระบบค้างเมื่อ LINE ส่ง Webhook จำลองมาเปิดระบบ Verify
    if (event.replyToken === "00000000000000000000000000000000" || event.replyToken === "ffffffffffffffffffffffffffffffff") {
      return NextResponse.json({ message: 'Verify Success' }, { status: 200 });
    }

    if (event && event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text.trim();
      const replyToken = event.replyToken;

      // ------------------------------------------------------------
      // STEP 1: แสดงรายการ Event เป็น "การ์ดสไลด์สวยๆ (Flex Message)"
      // ------------------------------------------------------------
      if (/(สนใจจองคิว)/.test(userMessage) && !userMessage.startsWith("[ดูคิว]")) {

        const rows = await getGoogleSheetData();

        // กรองเอาเฉพาะแถวที่มีสถานะเป็น available 
        const availableEvents = rows.filter(row => row[1]?.toLowerCase().trim() === 'available');

        if (availableEvents.length === 0) {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ขออภัยค่ะ ตอนนี้ยังไม่มีข้อมูลงานที่เปิดรับคิวในระบบค่ะ"
          });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        // สร้างการ์ดแต่ละใบ (จำกัดสูงสุด 10 ใบตามโควตา Carousel ของ LINE)
        const cards = availableEvents.slice(0, 10).map((row) => {
          const date = row[0];
          const eventName = row[2] || 'ไม่มีชื่อตาราง';
          const locationName = row[3] || '-';

          return {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              contents: [
                {
                  type: "text",
                  text: eventName,
                  weight: "bold",
                  size: "md",
                  wrap: true,
                  maxLines: 2,
                  color: "#111111"
                },
                {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        { type: "text", text: "📆", size: "sm", flex: 0 },
                        { type: "text", text: `วันที่: ${date}`, size: "sm", color: "#555555", flex: 1, wrap: true }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        { type: "text", text: "📍", size: "sm", flex: 0 },
                        { type: "text", text: locationName, size: "sm", color: "#555555", flex: 1, wrap: true }
                      ]
                    }
                  ]
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#FEE1E8",
                  cornerRadius: "md",
                  paddingAll: "md",
                  action: {
                    type: "message",
                    label: "🔍 เช็ครอบเวลาว่าง",
                    text: `[ดูคิว] งาน: ${eventName} (${date})`
                  },
                  contents: [
                    {
                      type: "text",
                      text: "🔍 เช็ครอบเวลาว่าง",
                      align: "center",
                      color: "#000000",
                      weight: "bold",
                      size: "sm"
                    }
                  ]
                }
              ]
            }
          };
        });

        // ประกอบการ์ดทั้งหมดเข้าเป็นโครงสร้าง Flex Carousel
        const flexCarouselMessage = {
          type: "flex",
          altText: "📅 กรุณาเลือกงานที่ต้องการเช็คตารางคิว",
          contents: {
            type: "carousel",
            contents: cards
          }
        };

        await replyToLine(replyToken, flexCarouselMessage);
      }

      // ------------------------------------------------------------
      // STEP 2: ลูกค้ากดปุ่มจากหน้าการ์ด -> ส่งตารางเวลาของงานนั้น
      // ------------------------------------------------------------
      else if (userMessage.startsWith("[ดูคิว]")) {
        const rows = await getGoogleSheetData();
        let matchedRow = null;

        for (const row of rows) {
          const date = row[0];
          const eventName = row[2] || '-';
          const formatCheck = `[ดูคิว] งาน: ${eventName} (${date})`;

          if (userMessage === formatCheck) {
            matchedRow = row;
            break;
          }
        }

        if (matchedRow) {
          const date = matchedRow[0];
          const eventName = matchedRow[2] || '-';
          const locationName = matchedRow[3] || '-';

          let replyText = `📅 ตารางรอบเวลาของงานคิวนี้ค่ะ\n`;
          replyText += `🎪 งาน: ${eventName}\n`;
          replyText += `📆 วันที่: ${date}\n`;
          replyText += `📍 สถานที่: ${locationName}\n`;
          replyText += `━━━━━━━━━━━━━━\n\n`;

          TIME_SLOTS.forEach((timeLabel, index) => {
            const columnIndex = 4 + index;
            const slotStatusStr = matchedRow[columnIndex];
            const slotStatus = slotStatusStr?.trim().toLowerCase() || 'available';

            if (slotStatus === 'available') {
              replyText += `  ✅ ${timeLabel} (ว่าง)\n`;
            } else {
              replyText += `  ❌ ${timeLabel} (เต็ม)\n`;
            }
          });

          await replyToLine(replyToken, { type: 'text', text: replyText.trim() });
        } else {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ไม่พบข้อมูลรอบเวลาของงานนี้ หรือตารางมีการอัปเดตใหม่ กรุณาลองพิมพ์ 'เช็คตาราง' อีกครั้งค่ะ"
          });
        }
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('❌ LINE Webhook Error:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}