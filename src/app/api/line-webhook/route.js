import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

// 💡 Memory ชั่วคราวจำว่า Line ID นี้ล่าสุดกดดูงานไหนและวันไหนอยู่
const userSessionMemory = new Map();

// ฟังก์ชันส่งข้อความตอบกลับหา LINE ลูกค้า
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

// ฟังก์ชันดึงชื่อโปรไฟล์ของผู้ใช้จาก LINE API
async function getLineUserProfile(userId) {
  if (!userId) return "ไม่ระบุชื่อไลน์";
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });
    if (response.ok) {
      const profile = await response.json();
      return profile.displayName || "ไม่ระบุชื่อไลน์";
    }
  } catch (error) {
    console.error("❌ ดึงโปรไฟล์ LINE ล้มเหลว:", error.message);
  }
  return "ไม่ระบุชื่อไลน์";
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
    try {
      const fs = require('fs');
      const path = require('path');

      let filePath = path.resolve(process.cwd(), './google-credentials.json');

      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(__dirname, '../../../../google-credentials.json');
      }

      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        authCredentials = JSON.parse(fileData);
      } else {
        console.error("⚠️ ไม่พบไฟล์ google-credentials.json ในเครื่องของคุณ");
        throw new Error("Credentials file not found on local machine");
      }
    } catch (err) {
      console.error("⚠️ เกิดข้อผิดพลาดในการโหลดคีย์บนเครื่อง Local:", err.message);
      throw new Error("Missing Google Credentials Configuration");
    }
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
    range: 'Sheet1!A2:S',
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

    if (event.replyToken === "00000000000000000000000000000000" || event.replyToken === "ffffffffffffffffffffffffffffffff") {
      return NextResponse.json({ message: 'Verify Success' }, { status: 200 });
    }

    if (event) {
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      const isFollowEvent = event.type === 'follow';

      const isBookingTextMessage = event.type === 'message' &&
        event.message.type === 'text' &&
        /(สนใจจองคิว)/.test(event.message.text.trim()) &&
        !event.message.text.trim().startsWith("[ดูคิว]") &&
        !event.message.text.trim().startsWith("[เลือกวัน]");

      // ------------------------------------------------------------
      // STEP 1: แสดงรายการ Event เป็น Flex Message 
      // ------------------------------------------------------------
      if (isFollowEvent || isBookingTextMessage) {

        const rows = await getGoogleSheetData();

        const availableEvents = rows.filter(row => {
          const isAvailable = row[1]?.toLowerCase().trim() === 'available';
          const hasDate = row[0] && row[0].trim() !== '';
          const hasEventName = row[2] && row[2].trim() !== '';

          return isAvailable && hasDate && hasEventName;
        });

        if (availableEvents.length === 0) {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ขออภัยค่ะ ตอนนี้ยังไม่มีข้อมูลงานที่เปิดรับคิวในระบบค่ะ"
          });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        const groupedEvents = {};
        availableEvents.forEach(row => {
          const date = row[0].trim();
          const eventName = row[2].trim();

          if (!groupedEvents[eventName]) {
            groupedEvents[eventName] = {
              rowData: row,
              dates: []
            };
          }
          if (!groupedEvents[eventName].dates.includes(date)) {
            groupedEvents[eventName].dates.push(date);
          }
        });

        const eventGroups = Object.values(groupedEvents);

        const cards = eventGroups.slice(0, 10).map((group) => {
          const row = group.rowData;
          const dates = group.dates;

          const eventName = row[2] || 'ไม่มีชื่อตาราง';
          const locationName = row[3] || '-';
          const imageUrl = row[18] || 'https://via.placeholder.com/150';

          const isMultiDay = dates.length > 1;
          const dateDisplay = isMultiDay ? `${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length} วัน)` : dates[0];

          const actionText = isMultiDay ? `[เลือกวัน] งาน: ${eventName}` : `[ดูคิว] งาน: ${eventName} (${dates[0]})`;

          return {
            type: "bubble",
            hero: {
              type: "image",
              url: imageUrl,
              size: "full",
              aspectRatio: "3:4",
              aspectMode: "cover"
            },
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
                        { type: "text", text: "🗓️", size: "sm", flex: 0 },
                        { type: "text", text: `วันที่: ${dateDisplay}`, size: "sm", color: "#555555", flex: 1, wrap: true }
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
                    text: actionText
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

        const greetingText = isFollowEvent
          ? "✨ watashiwajp ยินดีต้อนรับค่ะ! สามารถเลือกดูตารางงานคอนเสิร์ตและเช็ครอบเวลาว่างด้านล่างนี้ได้เลยนะคะ 👇"
          : "กรุณาเลือกงานที่ต้องการเช็คตารางคิวได้เลยค่ะ 👇";

        const replyMessages = [
          {
            type: "text",
            text: greetingText
          },
          {
            type: "flex",
            altText: "🗓️ กรุณาเลือกงานที่ต้องการเช็คตารางคิว",
            contents: {
              type: "carousel",
              contents: cards
            }
          }
        ];

        await replyToLine(replyToken, replyMessages);
      }

      // ------------------------------------------------------------
      // STEP 1.5: กรณีลูกค้าเลือกงานที่มีหลายวัน -> ส่ง Flex ให้เลือกวันที่ต้องการ
      // ------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'text' && event.message.text.trim().startsWith("[เลือกวัน]")) {
        const userMessage = event.message.text.trim();
        const eventNameSearch = userMessage.replace("[เลือกวัน] งาน:", "").trim();

        const rows = await getGoogleSheetData();

        const matchedRows = rows.filter(row =>
          row[1]?.toLowerCase().trim() === 'available' &&
          (row[2] || '').trim() === eventNameSearch
        );

        const uniqueDates = [...new Set(matchedRows.map(r => r[0].trim()))];

        if (uniqueDates.length > 0) {
          const dateButtons = uniqueDates.slice(0, 10).map(date => {
            return {
              type: "box",
              layout: "vertical",
              backgroundColor: "#FEE1E8",
              cornerRadius: "md",
              paddingAll: "md",
              margin: "sm",
              action: {
                type: "message",
                label: `วันที่ ${date}`,
                text: `[ดูคิว] งาน: ${eventNameSearch} (${date})`
              },
              contents: [
                {
                  type: "text",
                  text: `🗓️ วันที่ ${date}`,
                  align: "center",
                  color: "#000000",
                  weight: "bold",
                  size: "sm"
                }
              ]
            };
          });

          const flexMessage = {
            type: "flex",
            altText: `🗓️ กรุณาเลือกวันสำหรับงาน ${eventNameSearch}`,
            contents: {
              type: "bubble",
              body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                contents: [
                  { type: "text", text: "🗓️ เลือกรอบวันที่ต้องการ", weight: "bold", size: "md", color: "#111111" },
                  { type: "text", text: `งาน: ${eventNameSearch}`, size: "sm", color: "#555555", wrap: true },
                  { type: "separator", margin: "md" },
                  {
                    type: "box",
                    layout: "vertical",
                    spacing: "xs",
                    contents: dateButtons
                  }
                ]
              }
            }
          };

          await replyToLine(replyToken, flexMessage);
        } else {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ขออภัยค่ะ ไม่พบรอบวันที่ว่างสำหรับงานนี้ในระบบแล้วค่ะ"
          });
        }
      }

      // ------------------------------------------------------------
      // STEP 2: ลูกค้ากดปุ่มเลือกวัน -> ส่งตารางเวลาของงานนั้น
      // ------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'text' && event.message.text.trim().startsWith("[ดูคิว]")) {
        const userMessage = event.message.text.trim();
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

          // 💡 บันทึกว่าผู้ใช้คนนี้ กำลังเช็คดู Event และ วันที่ ใดล่าสุด
          if (userId) {
            userSessionMemory.set(userId, { eventName, date });
          }

          let replyText = `🗓️ ตารางรอบเวลาของงานคิวนี้ค่ะ\n`;
          replyText += `🎪 งาน: ${eventName}\n`;
          replyText += `🗓️ วันที่: ${date}\n`;
          replyText += `📍 สถานที่: ${locationName}\n`;
          replyText += `━━━━━━━━━━━━━━\n`;

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

          replyText += `\n✍️ หากต้องการจองคิว กรุณาพิมพ์:\n"ชื่อ เบอร์โทร เวลาที่ต้องการ"\n(เช่น: คิมโดยอง 0812345678 12:00-12:20)`;

          await replyToLine(replyToken, { type: 'text', text: replyText.trim() });
        } else {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ไม่พบข้อมูลรอบเวลาของงานนี้ หรือตารางมีการอัปเดตใหม่ กรุณาลองเลือกงานอีกครั้งค่ะ"
          });
        }
      }

      // ------------------------------------------------------------
      // STEP 2.5: 🌟 ตรวจจับเมื่อลูกค้าพิมพ์ "ชื่อ เบอร์โทร เวลา" มาลงคิว + เช็คคิวเต็ม
      // ------------------------------------------------------------
      else if (event.type === 'message' && event.message.type === 'text') {
        const rawMessage = event.message.text.trim();

        // 💡 ปรับ Regex ใหม่ให้กวาดจับกลุ่มตัวเลขที่ขึ้นต้นด้วย 0 และมีความยาวตัวเลขระหว่าง 5-12 หลัก (รวมขีดได้)
        const phoneRegex = /(0[0-9-]{4,14})/;
        const foundPhone = rawMessage.match(phoneRegex);

        // 💡 ปรับ Regex เวลาเดิม ให้ครอบคลุมคำว่า "เวลา" ไปด้วยเลย
        const timeRegex = /(?:เวลา\s*)?(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})/;
        const foundTime = rawMessage.match(timeRegex);

        if (foundPhone) {
          const customerPhone = foundPhone[0].trim();

          // 💡 ลบเครื่องหมายขีดออกเพื่อเอาไว้นับเฉพาะจำนวนตัวเลขล้วนๆ
          const cleanPhone = customerPhone.replace(/-/g, "");

          // 🚫 ถ้าไม่ใช่ตัวเลขล้วน หรือ ความยาวไม่เท่ากับ 10 หลัก หรือ ดึงมาแล้วติดตัวอักษรอื่น
          if (cleanPhone.length !== 10 || isNaN(cleanPhone)) {
            await replyToLine(replyToken, {
              type: 'text',
              text: "⚠️ โปรดกรอกเบอร์มือถือให้ครบ 10 หลัก ตัวอย่าง 0812345678"
            });
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // ดึงช่วงเวลาออกมา แล้วทำการล้างคำว่า "เวลา", ลบจุดเปลี่ยนเป็นโคลอน และลบช่องว่างออกให้หมด
          let customerTime = foundTime ? foundTime[0].replace(/\./g, ':').replace(/\s+/g, '') : "";

          // 💡 เพิ่มเติม: ค้นหาและล้างคำว่า "เวลา" (ถ้ามี) ที่ติดมาจากข้อความลูกค้า เพื่อให้เหลือแค่ตัวเลขช่วงเวลาเพียวๆ เช่น 15:00-15:20
          if (customerTime) {
            // กวาดล้างคำว่า "เวลา" หรือ "เวลา:" ออกไป
            customerTime = customerTime.replace(/เวลา[:：]?/g, "").trim();
          }

          // 1️⃣ ถ้าระบบตรวจไม่เจอรูปแบบเวลาที่ลูกค้าพิมพ์มา หรือเวลาว่างเปล่า
          if (!customerTime) {
            await replyToLine(replyToken, {
              type: 'text',
              text: "⚠️ กรุณาระบุช่วงเวลาที่ต้องการจองคิวด้วยนะคะ เช่น 12:00-12:20"
            });
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // ค้นหาข้อมูลคิวล่าสุดจาก Memory
          const session = userId ? userSessionMemory.get(userId) : null;
          let eventName = session?.eventName;
          let eventDate = session?.date;

          if (!eventName || !eventDate) {
            await replyToLine(replyToken, {
              type: 'text',
              text: "⚠️ ไม่พบข้อมูลงานที่คุณต้องการจอง กรุณากดเลือก 'เช็ครอบเวลาว่าง' ของงานนั้นๆ ก่อนพิมพ์จองคิวอีกครั้งค่ะ"
            });
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // 2️⃣ 🌟 ดึงข้อมูลจาก Sheets เพื่อเช็คดูว่าเวลาที่ระบุเต็มหรือว่าง
          const rows = await getGoogleSheetData();
          let matchedRow = rows.find(row => row[0]?.trim() === eventDate && (row[2] || '').trim() === eventName);

          if (matchedRow) {
            // หา Index ของรอบเวลาที่ลูกค้าพิมพ์เข้ามา
            const slotIndex = TIME_SLOTS.findIndex(slot => slot.replace(/\s+/g, '') === customerTime);

            if (slotIndex !== -1) {
              const columnIndex = 4 + slotIndex; // เริ่มคอลัมน์รอบเวลาที่ E (index 4)
              const slotStatus = matchedRow[columnIndex]?.trim().toLowerCase() || 'available';

              // 🚫 ถ้าสถานะไม่ใช่ available แปลว่าคิวเต็ม
              if (slotStatus !== 'available') {
                await replyToLine(replyToken, {
                  type: 'text',
                  text: "ขออภัยค่ะ การจองไม่สำเร็จโปรดเลือกเป็นช่วงเวลาอื่นค่ะ เนื่องจากรอบเวลาที่คุณระบุเต็มแล้ว 🙇🏻‍♀️"
                });
                return NextResponse.json({ message: 'OK' }, { status: 200 });
              }
            } else {
              // กรณีพิมพ์เวลามาถูกฟอร์แมต แต่ไม่มีรอบเวลานั้นอยู่ในระบบ (เช่น พิมพ์ 23:00-23:30)
              await replyToLine(replyToken, {
                type: 'text',
                text: "⚠️ ขออภัยค่ะ ไม่มีรอบเวลาที่คุณระบุในระบบงานนี้ กรุณาตรวจสอบตารางเวลาอีกครั้งค่ะ"
              });
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            }
          }

          // 3️⃣ ผ่านเงื่อนไขทั้งหมด -> คิวว่าง ทำการดึงชื่อไลน์และตอบกลับคอนเฟิร์มคิว
          let customerName = rawMessage
            .replace(customerPhone, "")
            .replace(foundTime ? foundTime[0] : "", "")
            .replace(/\s+/g, " ")
            .trim();

          if (!customerName) customerName = "ไม่ระบุชื่อ";

          const lineDisplayName = await getLineUserProfile(userId);

          let confirmMessage = `#${eventName}\n`;
          confirmMessage += `วันที่ : ${eventDate}\n`;
          confirmMessage += `เวลา : ${customerTime} น.\n`;
          confirmMessage += `K.${customerName} ${customerPhone}\n`;
          confirmMessage += `ชื่อไลน์ : ${lineDisplayName}\n`;
          confirmMessage += `รอทางแอดมินคอนเฟิร์มคิวสักครู่ค่ะ 🙇🏻‍♀️🙇🏻‍♀️`;

          await replyToLine(replyToken, { type: 'text', text: confirmMessage });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        // ------------------------------------------------------------
        // STEP 3: แอดมินพิมพ์ #ตามด้วยชื่องาน (กรณีอื่นๆ)
        // ------------------------------------------------------------
        if (rawMessage.startsWith("#")) {
          const adminSearchQuery = rawMessage.substring(1).toLowerCase().trim();
          const rows = await getGoogleSheetData();

          const matchedRows = rows.filter(row => {
            const isAvailable = row[1]?.toLowerCase().trim() === 'available';
            const eventName = row[2]?.toLowerCase().trim() || '';
            return isAvailable && eventName.includes(adminSearchQuery);
          });

          if (matchedRows.length > 0) {
            const standardEventName = matchedRows[0][2];
            const specificEventRows = matchedRows.filter(r => r[2] === standardEventName);
            const uniqueDates = [...new Set(specificEventRows.map(r => r[0].trim()))];

            const matchedRow = specificEventRows[0];
            const date = matchedRow[0];
            const locationName = matchedRow[3] || '-';
            const imageUrl = matchedRow[18] || 'https://via.placeholder.com/150';

            const isMultiDay = uniqueDates.length > 1;
            const dateDisplay = isMultiDay ? `${uniqueDates[0]} ถึง ${uniqueDates[uniqueDates.length - 1]} (${uniqueDates.length} วัน)` : date;
            const actionText = isMultiDay ? `[เลือกวัน] งาน: ${standardEventName}` : `[ดูคิว] งาน: ${standardEventName} (${date})`;

            const singleFlexCard = {
              type: "flex",
              altText: `🗓️ รายละเอียดงาน: ${standardEventName}`,
              contents: {
                type: "bubble",
                hero: {
                  type: "image",
                  url: imageUrl,
                  size: "full",
                  aspectRatio: "3:4",
                  aspectMode: "cover"
                },
                body: {
                  type: "box",
                  layout: "vertical",
                  spacing: "md",
                  contents: [
                    { type: "text", text: standardEventName, weight: "bold", size: "md", wrap: true, maxLines: 2, color: "#111111" },
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
                            { type: "text", text: "🗓️", size: "sm", flex: 0 },
                            { type: "text", text: `วันที่: ${dateDisplay}`, size: "sm", color: "#555555", flex: 1, wrap: true }
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
                      action: { type: "message", label: "🔍 เช็ครอบเวลาว่าง", text: actionText },
                      contents: [
                        { type: "text", text: "🔍 เช็ครอบเวลาว่าง", align: "center", color: "#000000", weight: "bold", size: "sm" }
                      ]
                    }
                  ]
                }
              }
            };

            await replyToLine(replyToken, singleFlexCard);
          } else {
            await replyToLine(replyToken, {
              type: 'text',
              text: `⚠️ ไม่พบข้อมูลงานที่ค้นหาด้วยคำว่า "${adminSearchQuery}" ในระบบ Google Sheets ค่ะ กรุณาตรวจสอบคำค้นหาอีกครั้ง`
            });
          }
        }
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('❌ LINE Webhook Error:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}