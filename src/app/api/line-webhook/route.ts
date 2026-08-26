import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import {
  getAllScheduleRecords,
  getAvailableScheduleRecords,
  ScheduleRecord,
} from '@/lib/schedule-service';
import { createBooking, getAllBookings } from '@/lib/booking-service';
import { getActiveCameras } from '@/lib/camera-service';
import { getLineUserSession, setLineUserSession, clearLineUserSession } from '@/lib/line-session-service';
import { getLatestAdminUserId, setAdminSession, pushLineMessage } from '@/lib/admin-session-service';
import {
  TIME_SLOTS,
  verifyLineSignature,
  replyToLine,
  resolvePublicImageUrl,
  getLineUserProfile,
} from '@/lib/line-utils';

// ฟังก์ชันแสดงรายการคอนเสิร์ตทั้งหมดเป็น Flex Message Carousel
async function sendAvailableEventsFlex(replyToken: string, greetingText?: string, req?: Request) {
  const availableEvents = await getAvailableScheduleRecords();

  if (availableEvents.length === 0) {
    await replyToLine(replyToken, {
      type: 'text',
      text: "⚠️ ขออภัยค่ะ ตอนนี้ยังไม่มีข้อมูลงานที่เปิดรับคิวในระบบค่ะ"
    });
    return;
  }

  const groupedEvents: Record<string, { rowData: ScheduleRecord; dates: string[] }> = {};
  availableEvents.forEach(item => {
    const date = item.date.trim();
    const eventName = item.eventName?.trim() || 'ไม่มีชื่อตาราง';

    if (!groupedEvents[eventName]) {
      groupedEvents[eventName] = {
        rowData: item,
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

    const eventName = row.eventName || 'ไม่มีชื่อตาราง';
    const locationName = row.location || '-';
    const imageUrl = row.imageUrl?.trim() || null;

    const isMultiDay = dates.length > 1;
    const dateDisplay = isMultiDay ? `${dates[0]} ~ ${dates[dates.length - 1]} \n(${dates.length} วัน)` : dates[0];
    const actionText = isMultiDay ? `[เลือกวัน] งาน: ${eventName}` : `[ดูคิว] งาน: ${eventName} (${dates[0]})`;

    const bubbleCard: any = {
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

    const fullHeroUrl = resolvePublicImageUrl(imageUrl, req);
    if (fullHeroUrl) {
      bubbleCard.hero = {
        type: "image",
        url: fullHeroUrl,
        size: "full",
        aspectRatio: "3:4",
        aspectMode: "cover"
      };
    }

    return bubbleCard;
  });

  const replyMessages: any[] = [];
  if (greetingText) {
    replyMessages.push({
      type: "text",
      text: greetingText
    });
  }

  replyMessages.push({
    type: "flex",
    altText: "🗓️ กรุณาเลือกงานที่ต้องการเช็คตารางคิว",
    contents: {
      type: "carousel",
      contents: cards
    }
  });

  await replyToLine(replyToken, replyMessages);
}

function checkSlotStatusForCamera(
  timeLabel: string,
  cameraType: string,
  record: ScheduleRecord,
  bookedSlotsForThisCamera: Set<string>
): boolean {
  const cleanTime = timeLabel.replace(/\s+/g, '');
  if (bookedSlotsForThisCamera.has(cleanTime)) return true;

  const slotObj = (record.slots || []).find(s => s.time.replace(/\s+/g, '') === cleanTime);
  if (!slotObj) return false;

  const normCam = cameraType.trim().toLowerCase();
  if (slotObj.cameraStatuses) {
    const camKey = Object.keys(slotObj.cameraStatuses).find(
      k =>
        k.toLowerCase() === normCam ||
        k.toLowerCase().includes(normCam) ||
        normCam.includes(k.toLowerCase())
    );
    if (camKey) {
      return slotObj.cameraStatuses[camKey] === 'booked';
    }
  }

  return slotObj.status === 'booked' || (slotObj.status as string) === 'unavailable';
}

// ฟังก์ชันแสดงตารางรอบเวลาทั้งหมด (เต็ม/ว่าง) สำหรับกล้องที่เลือก พร้อมถามความสนใจจองคิว
async function sendTimetableWithInterestPrompt(
  replyToken: string,
  eventName: string,
  date: string,
  cameraType: string,
  record: ScheduleRecord
) {
  const locationName = record.location || '-';
  let replyText = `🗓️ ตารางรอบเวลาของงานคิวนี้ค่ะ\n`;
  replyText += `🎪 งาน: ${eventName}\n`;
  replyText += `🗓️ วันที่: ${date}\n`;
  replyText += `📍 สถานที่: ${locationName}\n`;
  replyText += `📷 กล้องที่เลือก: \n${cameraType}\n`;
  replyText += `━━━━━━━━━━━━━━\n`;

  const allBookings = await getAllBookings();
  const normDate = date.trim();
  const normEvent = eventName.trim().toLowerCase();
  const normCam = cameraType.trim().toLowerCase();

  const bookedSlotsForThisCamera = new Set<string>();

  allBookings.forEach(b => {
    if (b.status === 'cancelled') return;

    const sameDate = b.date.trim() === normDate;
    const bEvent = (b.eventName || '').trim().toLowerCase();
    const sameEvent = !normEvent || !bEvent || bEvent.includes(normEvent) || normEvent.includes(bEvent);
    const bCam = (b.cameraType || '').trim().toLowerCase();
    const sameCam = !normCam || !bCam || normCam === bCam || bCam.includes(normCam) || normCam.includes(bCam);

    if (sameDate && sameEvent && sameCam) {
      bookedSlotsForThisCamera.add((b.timeSlot || '').replace(/\s+/g, ''));
    }
  });

  const slotsToDisplay = (record.slots && record.slots.length > 0)
    ? record.slots.map(s => s.time)
    : TIME_SLOTS;

  slotsToDisplay.forEach((timeLabel) => {
    const isBooked = checkSlotStatusForCamera(timeLabel, cameraType, record, bookedSlotsForThisCamera);
    if (!isBooked) {
      replyText += `  ✅ ${timeLabel} (ว่าง)\n`;
    } else {
      replyText += `  ❌ ${timeLabel} (เต็ม)\n`;
    }
  });

  replyText += `━━━━━━━━━━━━━━\n`;
  replyText += `สนใจจองคิวไหมคะ? ✨`;

  await replyToLine(replyToken, {
    type: 'text',
    text: replyText.trim(),
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "ต้องการจองคิว",
            text: "ต้องการจองคิว"
          }
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "ยังไม่สนใจ",
            text: "ยังไม่สนใจ"
          }
        }
      ]
    }
  });
}

// ฟังก์ชันถามช่วงเวลาที่สนใจพร้อมส่ง Quick Reply เฉพาะรอบเวลาที่ว่าง
async function sendAvailableTimeSlotsQuickReply(
  replyToken: string,
  eventName: string,
  date: string,
  cameraType: string,
  record: ScheduleRecord
) {
  const allBookings = await getAllBookings();
  const normDate = date.trim();
  const normEvent = eventName.trim().toLowerCase();
  const normCam = cameraType.trim().toLowerCase();

  const bookedSlotsForThisCamera = new Set<string>();

  allBookings.forEach(b => {
    if (b.status === 'cancelled') return;

    const sameDate = b.date.trim() === normDate;
    const bEvent = (b.eventName || '').trim().toLowerCase();
    const sameEvent = !normEvent || !bEvent || bEvent.includes(normEvent) || normEvent.includes(bEvent);
    const bCam = (b.cameraType || '').trim().toLowerCase();
    const sameCam = !normCam || !bCam || normCam === bCam || bCam.includes(normCam) || normCam.includes(bCam);

    if (sameDate && sameEvent && sameCam) {
      bookedSlotsForThisCamera.add((b.timeSlot || '').replace(/\s+/g, ''));
    }
  });

  const availableSlots: string[] = [];
  const slotsToDisplay = (record.slots && record.slots.length > 0)
    ? record.slots.map(s => s.time)
    : TIME_SLOTS;

  slotsToDisplay.forEach((timeLabel) => {
    const isBooked = checkSlotStatusForCamera(timeLabel, cameraType, record, bookedSlotsForThisCamera);
    if (!isBooked) {
      availableSlots.push(timeLabel);
    }
  });

  if (availableSlots.length === 0) {
    await replyToLine(replyToken, {
      type: 'text',
      text: `⚠️ ขออภัยค่ะ รอบเวลาสำหรับกล้อง "${cameraType}" ในงาน "${eventName}" (${date}) เต็มหมดทุกรอบแล้วค่ะ 🙇🏻‍♀️`
    });
    return;
  }

  const quickReplyItems = availableSlots.slice(0, 13).map((timeLabel) => ({
    type: "action",
    action: {
      type: "message",
      label: timeLabel,
      text: `[เลือกเวลา] ${timeLabel}`
    }
  }));

  await replyToLine(replyToken, {
    type: 'text',
    text: `สนใจเป็นช่วงเวลากี่โมงดีคะ? ⏰\n\nกรุณากดเลือกรอบเวลาที่ต้องการจองด้านล่างได้เลยค่ะ 👇`,
    quickReply: {
      items: quickReplyItems
    }
  });
}

export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json({ message: 'Empty body' }, { status: 200 });
    }

    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers.get('x-line-signature');
    if (channelSecret && !verifyLineSignature(text, signature, channelSecret)) {
      console.error('❌ Signature Verification Failed for LINE Webhook');
      return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
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
      const userMessage = (event.type === 'message' && event.message?.type === 'text')
        ? event.message.text.trim()
        : '';

      const isFollowEvent = event.type === 'follow';

      // 0. Event Follow (เพิ่มเพื่อน / ปลดบล็อก) -> ส่งข้อความต้อนรับและรายการคอนเสิร์ต
      if (isFollowEvent) {
        if (userId) await clearLineUserSession(userId);
        const greetingText = "✨ ยินดีต้อนรับค่ะ! ท่านสามารถพิมพ์คำว่า \"เช็คคิว\" หรือเลือกรอบงานด้านล่างเพื่อเช็ครอบเวลาว่างและทำรายการจองคิวได้เลยนะคะ 👇";
        await sendAvailableEventsFlex(replyToken, greetingText);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 0.5 คำสั่งยกเลิก / เริ่มใหม่
      if (userMessage === 'ยกเลิก' || userMessage === 'ยกเลิกการจอง' || userMessage === 'เริ่มใหม่' || userMessage === 'reset') {
        if (userId) await clearLineUserSession(userId);
        await replyToLine(replyToken, {
          type: 'text',
          text: 'ยกเลิกรายการเรียบร้อยค่ะ ✨\nหากต้องการจองคิวใหม่ สามารถพิมพ์คำว่า "เช็คคิว" หรือ "จองคิว" ได้เสมอนะคะ 💖'
        });
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // ------------------------------------------------------------
      // Quick Reply Options / Step Responses
      // ------------------------------------------------------------

      // 1. ตอบ "ไม่สนใจจอง" / "ยังไม่สนใจ" -> แสดงคอนเสิร์ตทั้งหมดที่มีเป็น Flex Message
      if (
        userMessage === 'ยังไม่สนใจ' ||
        userMessage === 'ไม่สนใจจอง' ||
        userMessage === '[ไม่สนใจจอง]'
      ) {
        if (userId) await clearLineUserSession(userId);
        await sendAvailableEventsFlex(
          replyToken,
          "✨ ไม่เป็นไรค่ะ! ท่านสามารถเลือกดูรายการคอนเสิร์ตทั้งหมดที่มีในระบบได้จากด้านล่างนี้เลยนะคะ 👇"
        );
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 2. ตอบ "ต้องการจองคิว" / "สนใจจองคิว" / "เช็คคิว" / "สวัสดี"
      const isBookingIntentMessage =
        userMessage === 'ต้องการจองคิว' ||
        userMessage === '[ต้องการจองคิว]' ||
        userMessage === 'สนใจจองคิว' ||
        userMessage === '[สนใจจองคิว]' ||
        (!userMessage.startsWith('[') && /(สนใจจองคิว|ต้องการจองคิว|^จองคิว$|^เช็คคิว$|^เช็กคิว$|^สวัสดี$|^เมนู$|^hi$|^hello$)/i.test(userMessage));

      if (isBookingIntentMessage) {
        const session = userId ? await getLineUserSession(userId) : null;
        
        // กรณีลูกค้าเพิ่งกดเลือกกล้องแล้วกดตอบรับ Quick Reply "ต้องการจองคิว"
        if (session && session.step === 'confirm_booking_interest' && session.eventName && session.date) {
          const targetDate = session.date;
          const targetEvent = session.eventName;
          const allRecords = await getAllScheduleRecords();
          const matchedRecord = allRecords.find(r => {
            const sameDate = r.date.trim() === targetDate.trim();
            const rName = (r.eventName || '').trim().toLowerCase();
            const sName = targetEvent.trim().toLowerCase();
            return sameDate && (rName === sName || rName.includes(sName) || sName.includes(rName));
          });

          if (matchedRecord) {
            if (userId) {
              await setLineUserSession(userId, { step: 'awaiting_time_slot' });
            }

            await sendAvailableTimeSlotsQuickReply(
              replyToken,
              targetEvent,
              targetDate,
              session.cameraType || 'กล้องหลัก',
              matchedRecord
            );
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }
        }

        // กรณีลูกค้าพิมพ์มาตอนเริ่มต้น -> แสดงรายการคอนเสิร์ตทั้งหมดที่มีเป็น Flex Message เหมือนเดิม
        if (userId) await clearLineUserSession(userId);
        const greetingText = "✨ ยินดีต้อนรับค่ะ! ท่านสามารถเลือกรอบงานด้านล่างเพื่อเช็ครอบเวลาว่างและทำรายการจองคิวได้เลยค่ะ 👇";
        await sendAvailableEventsFlex(replyToken, greetingText);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 3. ลูกค้ากดเลือกรอบเวลา [เลือกเวลา] HH:mm-HH:mm -> ถามชื่อผู้จอง
      const isSelectSlotMessage = userMessage.startsWith("[เลือกเวลา]");
      const currentSession = userId ? await getLineUserSession(userId) : null;
      const isSlotTextInStep = currentSession?.step === 'awaiting_time_slot' && /(?:เวลา\s*)?(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})/.test(userMessage);

      if (isSelectSlotMessage || isSlotTextInStep) {
        let selectedSlot = '';
        if (userMessage.startsWith("[เลือกเวลา]")) {
          selectedSlot = userMessage.replace("[เลือกเวลา]", "").trim();
        } else {
          const match = userMessage.match(/(?:เวลา\s*)?(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})/);
          if (match) {
            selectedSlot = match[1].replace(/\./g, ':').replace(/\s+/g, '');
          }
        }

        const session = currentSession;

        if (!session || !session.eventName || !session.date) {
          await replyToLine(replyToken, {
            type: 'text',
            text: "⚠️ ไม่พบข้อมูลงานที่ต้องการจอง กรุณาเลือกงานและกล้องใหม่อีกครั้งนะคะ"
          });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        const sessionEvent = session.eventName;
        const sessionDate = session.date;

        // ตรวจสอบว่า slot สำหรับกล้องรุ่นนี้ยังว่างอยู่ไหม
        const allRecords = await getAllScheduleRecords();
        const matchedRecord = allRecords.find(r => {
          const sameDate = r.date.trim() === sessionDate.trim();
          const rName = (r.eventName || '').trim().toLowerCase();
          const sName = sessionEvent.trim().toLowerCase();
          return sameDate && (rName === sName || rName.includes(sName) || sName.includes(rName));
        });

        if (matchedRecord) {
          const allBookings = await getAllBookings();
          const normDate = session.date.trim();
          const normEvent = session.eventName.trim().toLowerCase();
          const normCam = (session.cameraType || '').trim().toLowerCase();

          const bookedSlotsForThisCamera = new Set<string>();
          allBookings.forEach(b => {
            if (b.status === 'cancelled') return;
            const sameDate = b.date.trim() === normDate;
            const bEvent = (b.eventName || '').trim().toLowerCase();
            const sameEvent = !normEvent || !bEvent || bEvent.includes(normEvent) || normEvent.includes(bEvent);
            const bCam = (b.cameraType || '').trim().toLowerCase();
            const sameCam = !normCam || !bCam || normCam === bCam || bCam.includes(normCam) || normCam.includes(bCam);
            if (sameDate && sameEvent && sameCam) {
              bookedSlotsForThisCamera.add((b.timeSlot || '').replace(/\s+/g, ''));
            }
          });

          const isBooked = checkSlotStatusForCamera(
            selectedSlot,
            session.cameraType || '',
            matchedRecord,
            bookedSlotsForThisCamera
          );

          if (isBooked) {
            await replyToLine(replyToken, {
              type: 'text',
              text: `⚠️ ขออภัยค่ะ รอบเวลา ${selectedSlot} น. สำหรับกล้อง "${session.cameraType || 'รุ่นนี้'}" ถูกจองไปแล้ว กรุณากดเลือกรอบเวลาอื่นนะคะ 🙇🏻‍♀️`
            });
            await sendAvailableTimeSlotsQuickReply(
              replyToken,
              session.eventName,
              session.date,
              session.cameraType || 'กล้องหลัก',
              matchedRecord
            );
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }
        }

        if (userId) {
          await setLineUserSession(userId, { timeSlot: selectedSlot, step: 'awaiting_name' });
        }

        await replyToLine(replyToken, {
          type: 'text',
          text: `คุณเลือกรอบเวลา: ${selectedSlot} น. \nสำหรับกล้อง: \n"${session.cameraType || 'กล้องหลัก'}" \nเรียบร้อยค่ะ ✨\n\nกรุณาระบุ "ชื่อผู้จอง" สำหรับทำรายการค่ะ (เช่น คิมโดยอง)`
        });
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 4. กรณีลูกค้าเลือกกล้อง -> ส่งตารางเวลาให้ทันที แล้วถามว่าสนใจจองคิวไหมคะ (ขึ้น Quick Message)
      if (userMessage.startsWith("[เลือกกล้อง]")) {
        const match = userMessage.match(/^\[เลือกกล้อง\]\s*(.*?)\s*\|\s*งาน:\s*(.*?)\s*\((.*?)\)$/);
        let selectedCamera = 'RICOH GR IIIx + Flash';
        let targetEventName = '';
        let targetDate = '';

        if (match) {
          selectedCamera = match[1].trim();
          targetEventName = match[2].trim();
          targetDate = match[3].trim();
        } else {
          const parts = userMessage.split('|');
          selectedCamera = parts[0].replace('[เลือกกล้อง]', '').trim();
        }

        if (userId && targetEventName && targetDate) {
          await setLineUserSession(userId, {
            eventName: targetEventName,
            date: targetDate,
            cameraType: selectedCamera,
            step: 'confirm_booking_interest'
          });
        }

        const allRecords = await getAllScheduleRecords();
        const matchedRecord = allRecords.find(r => {
          const sameDate = r.date.trim() === targetDate.trim();
          const rName = (r.eventName || '').trim().toLowerCase();
          const tName = targetEventName.trim().toLowerCase();
          return sameDate && (rName === tName || !targetEventName || rName.includes(tName) || tName.includes(rName));
        });

        if (matchedRecord) {
          await sendTimetableWithInterestPrompt(
            replyToken,
            targetEventName,
            targetDate,
            selectedCamera,
            matchedRecord
          );
        } else {
          await replyToLine(replyToken, {
            type: 'text',
            text: `📷 เลือกกล้อง: ${selectedCamera}\n🎪 งาน: ${targetEventName} (${targetDate})\n\nสนใจจองคิวเลยไหมคะ? ✨`,
            quickReply: {
              items: [
                { type: "action", action: { type: "message", label: "ต้องการจองคิว", text: "ต้องการจองคิว" } },
                { type: "action", action: { type: "message", label: "ยังไม่สนใจ", text: "ยังไม่สนใจ" } }
              ]
            }
          });
        }
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 5. กรณีเลือกรอบวันของงาน multi-day
      if (userMessage.startsWith("[เลือกวัน]")) {
        const eventNameSearch = userMessage.replace("[เลือกวัน] งาน:", "").trim();
        const availableEvents = await getAvailableScheduleRecords();
        const matchedRows = availableEvents.filter(row => (row.eventName || '').trim() === eventNameSearch);
        const uniqueDates = [...new Set(matchedRows.map(r => r.date.trim()))];

        if (uniqueDates.length > 0) {
          const dateButtons = uniqueDates.slice(0, 10).map(date => ({
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
          }));

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
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 6. ลูกค้ากดเลือกงาน/วัน [ดูคิว] -> ส่ง Flex ให้เลือกกล้อง
      if (userMessage.startsWith("[ดูคิว]")) {
        const allRecords = await getAllScheduleRecords();
        let matchedRecord: ScheduleRecord | null = null;

        for (const record of allRecords) {
          const date = record.date;
          const eventName = record.eventName || '-';
          const formatCheck = `[ดูคิว] งาน: ${eventName} (${date})`;

          if (userMessage === formatCheck) {
            matchedRecord = record;
            break;
          }
        }

        if (matchedRecord) {
          const date = matchedRecord.date;
          const eventName = matchedRecord.eventName || '-';
          const activeCameras = await getActiveCameras();

          const cameraCards = activeCameras.map((cam, idx) => {
            const descLines = cam.description
              ? cam.description.split('\n').filter(l => l.trim().length > 0)
              : ['• บริการถ่ายภาพคุณภาพสูง'];

            const bgColors = ['#FEE1E8', '#E8D8F8', '#D8F0F8', '#F8F3D8'];
            const btnBgColor = bgColors[idx % bgColors.length];

            const cardObj: any = {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  { type: 'text', text: cam.name, weight: 'bold', size: 'md', color: '#111111', wrap: true },
                  { type: 'text', text: cam.priceInfo, weight: 'bold', size: 'lg', color: '#F4A0B5' },
                  { type: 'separator' },
                  {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'xs',
                    contents: descLines.map(line => ({
                      type: 'text',
                      text: line.startsWith('•') ? line : `• ${line}`,
                      size: 'xs',
                      color: '#555555',
                      wrap: true,
                    })),
                  },
                ],
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: btnBgColor,
                    cornerRadius: 'md',
                    paddingAll: 'md',
                    action: {
                      type: 'message',
                      label: `เลือก ${cam.name}`,
                      text: `[เลือกกล้อง] ${cam.name} | งาน: ${eventName} (${date})`,
                    },
                    contents: [
                      {
                        type: 'text',
                        text: `เลือก`,
                        align: 'center',
                        color: '#000000',
                        weight: 'bold',
                        size: 'sm',
                      },
                    ],
                  },
                ],
              },
            };

            const fullCameraImageUrl = resolvePublicImageUrl(cam.imageUrl, req);
            if (fullCameraImageUrl) {
              cardObj.hero = {
                type: 'image',
                url: fullCameraImageUrl,
                size: 'full',
                aspectRatio: '16:9',
                aspectMode: 'cover',
              };
            }

            return cardObj;
          });

          const replyMessages = [
            {
              type: 'text',
              text: `กรุณาเลือกกล้องที่ต้องการถ่ายสำหรับงาน "${eventName}" (${date}) ค่ะ 👇`,
            },
            {
              type: 'flex',
              altText: '📸 กรุณาเลือกกล้องที่ต้องการถ่าย',
              contents: {
                type: 'carousel',
                contents: cameraCards,
              },
            },
          ];

          await replyToLine(replyToken, replyMessages);
        } else {
          await replyToLine(replyToken, {
            type: 'text',
            text: '⚠️ ไม่พบข้อมูลรอบเวลาของงานนี้ กรุณาลองเลือกงานอีกครั้งค่ะ',
          });
        }
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // ------------------------------------------------------------
      // Handling Customer sending Payment Slip Image (event.type === 'message' && message.type === 'image')
      // ------------------------------------------------------------
      if (event.type === 'message' && event.message?.type === 'image') {
        const session = userId ? await getLineUserSession(userId) : null;
        if (session && (session.step === 'awaiting_slip' || session.step === 'awaiting_payment_type')) {
          const lineDisplayName = await getLineUserProfile(userId);

          // 1. ส่งข้อความตอบกลับลูกค้าเมื่อได้รับสลิป
          const confirmSlipText = `ได้รับสลิปโอนเงินเรียบร้อยแล้วค่ะ \n\nรับข้อมูลการจองเรียบร้อยแล้วค่ะ\nรอทางแอดมินคอนเฟิร์มคิวสักครู่ค่ะ`;
          await replyToLine(replyToken, { type: 'text', text: confirmSlipText });

          // 2. ส่งเรื่องต่อให้ LINE Admin Interactive Session
          const adminUserId = await getLatestAdminUserId();
          if (adminUserId) {
            await setAdminSession(adminUserId, 'awaiting_deposit_amount', {
              date: session.date || '',
              eventName: session.eventName || '',
              timeSlot: session.timeSlot || '',
              customerName: session.customerName || '',
              customerPhone: session.customerPhone || '',
              lineDisplayName: lineDisplayName,
              customerLineUserId: userId,
              cameraType: session.cameraType,
              paymentStatus: 'deposit',
              depositAmount: 100,
            });

            const adminPrompt = {
              type: 'text',
              text: `📌 มีการจองคิวใหม่เข้ามาค่ะ! (ลูกค้าส่งสลิปโอนเงินแล้ว 📄)\n🎤 Event: ${session.eventName}\n📅 วันที่: ${session.date}\n⏰ เวลา: ${session.timeSlot} น.\n📷 กล้อง: ${session.cameraType || '-'}\n👤 ผู้จอง: K.${session.customerName} (${session.customerPhone})\n💬 ชื่อไลน์: ${lineDisplayName}\n💳 ลูกค้าส่ง: 📄 สลิปมัดจำ\n━━━━━━━━━━━━━━\n🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '💵 100 บาท', text: '100' } },
                ]
              }
            };
            await pushLineMessage(adminUserId, adminPrompt, 'admin');

            if (event.message?.id) {
              await pushLineMessage(adminUserId, `📄 ได้รับรูปภาพสลิปการโอนเงินจาก K.${session.customerName} เรียบร้อยแล้วค่ะ`, 'admin');
            }
          } else {
            try {
              await createBooking({
                date: session.date || '',
                eventName: session.eventName || '',
                timeSlot: session.timeSlot || '',
                customerName: session.customerName || '',
                customerPhone: session.customerPhone || '',
                lineDisplayName: lineDisplayName,
                lineUserId: userId || undefined,
                cameraType: session.cameraType || undefined,
                paymentStatus: 'deposit',
                depositAmount: 100,
                notes: `การชำระเงิน: มัดจำ (ลูกค้าแนบสลิปเรียบร้อย)`,
                status: 'pending',
              });
            } catch (err: any) {
              console.error("⚠️ Error saving fallback slip booking:", err.message);
            }
          }

          if (userId) {
            await clearLineUserSession(userId);
          }
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }
      }

      // ------------------------------------------------------------
      // Session Interactive Step-by-Step Flow Handling
      // ------------------------------------------------------------
      if (event.type === 'message' && event.message?.type === 'text') {
        const session = userId ? await getLineUserSession(userId) : null;
        const currentStep = session?.step;

        // STEP A: ถามชื่อ -> รับข้อความชื่อ -> บันทึกชื่อ -> ถามเบอร์โทรศัพท์
        if (currentStep === 'awaiting_name') {
          const customerName = userMessage.trim();
          if (!customerName) {
            await replyToLine(replyToken, { type: 'text', text: "⚠️ กรุณาระบุชื่อผู้จองด้วยนะคะ" });
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          if (userId) {
            await setLineUserSession(userId, { customerName, step: 'awaiting_phone' });
          }

          await replyToLine(replyToken, {
            type: 'text',
            text: `ยินดีต้อนรับค่ะ คุณ ${customerName} 🙇🏻‍♀️\n\nกรุณาระบุ "เบอร์โทรศัพท์มือถือ" \n10 หลัก สำหรับติดต่อค่ะ \n(เช่น 0812345678)`
          });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        // STEP B: ถามเบอร์โทรศัพท์ -> รับข้อความเบอร์ -> ตรวจสอบ 10 หลัก -> ถามมัดจำ/ชำระเต็ม (Quick Reply)
        else if (currentStep === 'awaiting_phone') {
          const phoneRegex = /(0[0-9-]{8,14})/;
          const match = userMessage.match(phoneRegex);
          const rawPhone = match ? match[0] : userMessage;
          const cleanPhone = rawPhone.replace(/-/g, "").trim();

          if (cleanPhone.length !== 10 || isNaN(Number(cleanPhone))) {
            await replyToLine(replyToken, {
              type: 'text',
              text: "⚠️ โปรดกรอกเบอร์มือถือให้ครบ 10 หลัก ตัวอย่าง 0812345678"
            });
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          if (userId) {
            await setLineUserSession(userId, { customerPhone: cleanPhone, step: 'awaiting_payment_type' });
          }

          const customerName = session?.customerName || 'ผู้จอง';
          await replyToLine(replyToken, {
            type: 'text',
            text: `ขอบคุณค่ะ คุณ ${customerName} 🙇🏻‍♀️\n\nสนใจ "มัดจำ" หรือ "ชำระเต็มจำนวน" ดีคะ? ✨`,
            quickReply: {
              items: [
                {
                  type: "action",
                  action: {
                    type: "message",
                    label: "มัดจำ",
                    text: "มัดจำ"
                  }
                },
                {
                  type: "action",
                  action: {
                    type: "message",
                    label: "ชำระเต็มจำนวน",
                    text: "ชำระเต็มจำนวน"
                  }
                }
              ]
            }
          });
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        // STEP C: ถาม มัดจำ / ชำระเต็มจำนวน -> ส่งเรื่องต่อให้ LINE Admin
        else if (
          currentStep === 'awaiting_payment_type' ||
          userMessage === 'มัดจำ' ||
          userMessage === 'ชำระเต็มจำนวน' ||
          userMessage.startsWith('[เลือกชำระ]')
        ) {
          let paymentChoice = 'มัดจำ';
          if (userMessage.includes('ชำระเต็มจำนวน')) {
            paymentChoice = 'ชำระเต็มจำนวน';
          } else if (userMessage.includes('มัดจำ')) {
            paymentChoice = 'มัดจำ';
          } else if (session?.paymentType) {
            paymentChoice = session.paymentType;
          }

          if (!session || !session.eventName || !session.date || !session.timeSlot || !session.customerName || !session.customerPhone) {
            await replyToLine(replyToken, {
              type: 'text',
              text: "⚠️ ไม่พบข้อมูลการจองที่สมบูรณ์ กรุณาเลือกงานและทำรายการใหม่อีกครั้งค่ะ"
            });
            if (userId) await clearLineUserSession(userId);
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          const lineDisplayName = await getLineUserProfile(userId);
          const isDeposit = paymentChoice === 'มัดจำ';

          // --- Case 1: ลูกค้าเลือก "มัดจำ" -> ส่ง QR Code + ยอดมัดจำ 100 บาท แล้วตั้งสถานะรอสลิปโอนเงิน ---
          if (isDeposit) {
            const qrImageUrl = resolvePublicImageUrl('/assets/qrcode.png', req) ||
                               `https://promptpay.io/0812345678/100.png`;

            const depositPromptText = `💳 ยอดชำระเงินมัดจำ: 100 บาท\n\nกรุณาสแกน QR Code ด้านล่างนี้เพื่อโอนเงินมัดจำ แล้วส่งรูปภาพสลิปโอนเงินเข้ามาในแชทนี้เพื่อยืนยันคิวจองนะคะ 🙇🏻‍♀️`;

            await replyToLine(replyToken, [
              {
                type: 'text',
                text: depositPromptText,
              },
              {
                type: 'image',
                originalContentUrl: qrImageUrl,
                previewImageUrl: qrImageUrl,
              }
            ]);

            if (userId) {
              await setLineUserSession(userId, { step: 'awaiting_slip', paymentType: 'มัดจำ' });
            }
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // --- Case 2: ลูกค้าเลือก "ชำระเต็มจำนวน" -> ตอบกลับรับข้อมูลทันที แล้วส่งเรื่องต่อให้ Admin คุยต่อเรื่องการโอนเงิน ---
          const pendingText = `รับข้อมูลการจองเรียบร้อยแล้วค่ะ🙇🏻‍♀️\n\nรอทางแอดมินคอนเฟิร์มคิวสักครู่ค่ะ`;
          await replyToLine(replyToken, { type: 'text', text: pendingText });

          const adminUserId = await getLatestAdminUserId();
          if (adminUserId) {
            await setAdminSession(adminUserId, 'awaiting_final_confirmation', {
              date: session.date,
              eventName: session.eventName,
              timeSlot: session.timeSlot,
              customerName: session.customerName,
              customerPhone: session.customerPhone,
              lineDisplayName: lineDisplayName,
              customerLineUserId: userId,
              cameraType: session.cameraType,
              paymentStatus: 'paid',
              depositAmount: 0,
              remainingAmount: 0,
            });

            const adminPrompt = {
              type: 'text',
              text: `📌 มีการจองคิวใหม่เข้ามาค่ะ!\n🎤 Event: ${session.eventName}\n📅 วันที่: ${session.date}\n⏰ เวลา: ${session.timeSlot} น.\n📷 กล้อง: ${session.cameraType || '-'}\n👤 ผู้จอง: K.${session.customerName}\n📞 เบอร์โทร: ${session.customerPhone}\n💬 ชื่อไลน์: ${lineDisplayName}\n💳 ชำระเงิน: 💚 ชำระเต็มจำนวน (แอดมินแจ้งรายละเอียดโอนเงินในแชท)\n\nกรุณากดปุ่มเพื่อยืนยันหรือยกเลิกการจองนะคะ 👇`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '✅ ยืนยันการจอง', text: 'ยืนยันการจอง' } },
                  { type: 'action', action: { type: 'message', label: '❌ ยกเลิกการจอง', text: 'ยกเลิกการจอง' } },
                ]
              }
            };
            await pushLineMessage(adminUserId, adminPrompt, 'admin');
          } else {
            try {
              await createBooking({
                date: session.date,
                eventName: session.eventName,
                timeSlot: session.timeSlot,
                customerName: session.customerName,
                customerPhone: session.customerPhone,
                lineDisplayName: lineDisplayName,
                lineUserId: userId || undefined,
                cameraType: session.cameraType || undefined,
                paymentStatus: 'paid',
                notes: `การชำระเงิน: ชำระเต็มจำนวน`,
                status: 'pending',
              });
            } catch (err: any) {
              console.error("⚠️ Error saving fallback paid booking:", err.message);
            }
          }

          if (userId) await clearLineUserSession(userId);
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        // STEP D: Non-command messages (ลูกค้าพิมพ์ข้อความทั่วไป หรือสนทนากับแอดมิน)
        // -> ไม่ส่งข้อความตอบกลับอัตโนมัติ เพื่อให้แอดมินสามารถคุยกับลูกค้าได้ตามปกติโดยที่บอทไม่แทรกทุกข้อความ
        else {
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ LINE Webhook Error:', error.message || error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
