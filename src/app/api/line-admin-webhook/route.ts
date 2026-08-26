import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { db } from '@/db/db';
import { adminSessions } from '@/db/schema';
import { getAllScheduleRecords, ScheduleRecord, DEFAULT_TIME_SLOTS } from '@/lib/schedule-service';
import { TimeSlot } from '@/data/schedule';
import { getAllBookings, createBooking, confirmOrCreateBooking, cancelPendingBookingIfExists, BookingRecord } from '@/lib/booking-service';
import { getAdminSession, setAdminSession, clearAdminSession, pushLineMessage, registerAdminUserId, DraftBookingData } from '@/lib/admin-session-service';
import { clearLineUserSession } from '@/lib/line-session-service';
import { getActiveCameras } from '@/lib/camera-service';
import {
  formatPhoneNumber,
  verifyLineSignature as verifyLineSig,
  replyToLine as replyToLineShared,
  getLineUserProfile as getLineUserProfileShared,
  getTodayThailandDateString,
} from '@/lib/line-utils';

function getAdminToken(): string {
  return process.env.LINE_ADMIN_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
}

async function replyToLine(replyToken: string, messageData: any): Promise<void> {
  if (!replyToken || replyToken === '00000000000000000000000000000000' || replyToken === 'ffffffffffffffffffffffffffffffff') return;

  let messages: any[] = [];
  if (typeof messageData === 'string') {
    messages = [{ type: 'text', text: messageData }];
  } else if (Array.isArray(messageData)) {
    messages = messageData.map(m => (typeof m === 'string' ? { type: 'text', text: m } : { ...m }));
  } else if (typeof messageData === 'object' && messageData !== null) {
    messages = [messageData.type ? { ...messageData } : { type: 'text', text: JSON.stringify(messageData) }];
  }

  if (messages.length > 0) {
    const lastIdx = messages.length - 1;
    if (!messages[lastIdx].quickReply) {
      messages[lastIdx] = {
        ...messages[lastIdx],
        quickReply: ADMIN_MAIN_QUICK_REPLY,
      };
    }
  }

  return replyToLineShared(replyToken, messages, getAdminToken());
}

async function getLineUserProfile(userId?: string): Promise<string> {
  return getLineUserProfileShared(userId, getAdminToken());
}

function verifyLineSignature(body: string, signature: string | null, channelSecret: string | undefined): boolean {
  return verifyLineSig(body, signature, channelSecret);
}

const ADMIN_MAIN_QUICK_REPLY = {
  items: [
    {
      type: 'action',
      action: {
        type: 'message',
        label: '📌 คิวรออนุมัติ',
        text: 'คิวรออนุมัติ',
      },
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: '🗓️ เช็ก',
        text: 'เช็ก',
      },
    },
    // {
    //   type: 'action',
    //   action: {
    //     type: 'message',
    //     label: '📋 แบบฟอร์ม',
    //     text: 'แบบฟอร์ม',
    //   },
    // },
  ],
};

function buildSummaryText(draft: any): string {
  const formattedPhone = formatPhoneNumber(draft.customerPhone);
  const paymentStatus = draft.paymentStatus || 'unpaid';
  const depositAmt = draft.depositAmount || 0;
  const remainingAmt = draft.remainingAmount || 0;

  const paymentLabel = paymentStatus === 'paid'
    ? `ชำระเต็มจำนวน`
    : paymentStatus === 'deposit'
    ? `มัดจำแล้ว (${depositAmt > 0 ? `${depositAmt.toLocaleString()} ฿` : 'ไม่ได้ระบุยอด'})`
    : 'ยังไม่มัดจำ';

  let text = `✅ บันทึกการจองสำเร็จเรียบร้อย!\n\n🎤 Event: ${draft.eventName}\n📅 วันที่: ${draft.date}\n⏰ เวลา: ${draft.timeSlot} น.${draft.cameraType ? `\n📷 กล้อง: ${draft.cameraType}` : ''}\n👤 ผู้จอง: K.${draft.customerName}\n📞 เบอร์โทร: ${formattedPhone}\n💬 ชื่อไลน์: ${draft.lineDisplayName || '-'}\n📋 สถานะ: ✅ ยืนยัน\n💳 ชำระเงิน: ${paymentLabel}`;

  if (paymentStatus === 'deposit' && remainingAmt > 0) {
    text += `\n💵 ยอดต้องเก็บเพิ่ม: ${remainingAmt.toLocaleString()} ฿`;
  }

  if (draft.notes) {
    text += `\n📝 โน้ต: ${draft.notes}`;
  }

  return text;
}

function buildFinalConfirmedText(draft: any): string {
  const formattedPhone = formatPhoneNumber(draft.customerPhone);
  return `ลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️\n\n🎤 Event: ${draft.eventName}\n📅 วันที่: ${draft.date}\n⏰ เวลา: ${draft.timeSlot} น.${draft.cameraType ? `\n📷 กล้อง: ${draft.cameraType}` : ''}\n👤 ผู้จอง: K.${draft.customerName}\n📞 เบอร์โทร: ${formattedPhone}`;
}

// ฟังก์ชันตั้งค่า session แอดมินและถามข้อมูลตามรูปแบบชำระเงินของลูกค้า (มัดจำ / ชำระเต็มจำนวน)
async function startAdminBookingConfirmation(
  replyToken: string,
  userId: string | undefined,
  b: BookingRecord
) {
  const isDeposit = b.paymentStatus === 'deposit' || (b.notes || '').includes('มัดจำ');

  const draft: DraftBookingData = {
    bookingId: b.id,
    date: b.date,
    eventName: b.eventName || 'ไม่ได้ระบุชื่อ',
    timeSlot: b.timeSlot || 'ไม่ได้ระบุเวลา',
    customerName: b.customerName || 'ผู้จอง',
    customerPhone: b.customerPhone || '-',
    lineDisplayName: b.lineDisplayName || '-',
    customerLineUserId: b.lineUserId || undefined,
    cameraType: b.cameraType || undefined,
    paymentStatus: isDeposit ? 'deposit' : 'paid',
    depositAmount: b.depositAmount || 0,
    remainingAmount: b.remainingAmount || 0,
  };

  if (isDeposit) {
    if (userId) {
      await setAdminSession(userId, 'awaiting_deposit_amount', draft);
    }
    const askDepositMsg = {
      type: 'text',
      text: `📌 รายการจองคิว #${b.id} (ลูกค้าแจ้ง: 🟡 มัดจำ)\n🎤 Event: ${draft.eventName}\n📅 วันที่: ${draft.date}\n⏰ เวลา: ${draft.timeSlot} น.\n📷 กล้อง: ${draft.cameraType || '-'}\n👤 ผู้จอง: K.${draft.customerName} (${draft.customerPhone})\n💬 ชื่อไลน์: ${draft.lineDisplayName}\n━━━━━━━━━━━━━━\n🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)`,
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '💵 100 บาท', text: '100' } }
        ]
      }
    };
    await replyToLine(replyToken, askDepositMsg);
  } else {
    if (userId) {
      await setAdminSession(userId, 'awaiting_final_confirmation', draft);
    }
    const summaryText = buildSummaryText(draft);
    const confirmMsg = {
      type: 'text',
      text: `📌 รายการจองคิว #${b.id} (ชำระเต็มจำนวน)\n\n${summaryText}\n\nกรุณากดปุ่มเพื่อยืนยันหรือยกเลิกการจองนะคะ 👇`,
      quickReply: {
        items: [
          { type: 'action', action: { type: 'message', label: '✅ ยืนยันการจอง', text: 'ยืนยันการจอง' } },
          { type: 'action', action: { type: 'message', label: '🔄 ทำรายการใหม่', text: 'ทำรายการใหม่' } },
          { type: 'action', action: { type: 'message', label: '❌ ยกเลิกการจอง', text: 'ยกเลิกการจอง' } },
        ]
      }
    };
    await replyToLine(replyToken, confirmMsg);
  }
}

export async function GET() {
  const hasAdminSecret = Boolean(process.env.LINE_ADMIN_CHANNEL_SECRET);
  const hasAdminToken = Boolean(process.env.LINE_ADMIN_CHANNEL_ACCESS_TOKEN);
  const hasCustomerSecret = Boolean(process.env.LINE_CHANNEL_SECRET);
  const hasCustomerToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  let dbStatus = 'untested';
  let adminSessionsTable = 'unknown';

  try {
    await db.select().from(adminSessions).limit(1);
    dbStatus = 'connected';
    adminSessionsTable = 'ready';
  } catch (err: any) {
    dbStatus = 'error';
    adminSessionsTable = `error: ${err.message}`;
  }

  const warnings: string[] = [];
  if (!hasAdminToken && !hasCustomerToken) {
    warnings.push('❌ LINE_ADMIN_CHANNEL_ACCESS_TOKEN is missing. Bot cannot reply to messages.');
  } else if (!hasAdminToken) {
    warnings.push('⚠️ LINE_ADMIN_CHANNEL_ACCESS_TOKEN is not set; falling back to LINE_CHANNEL_ACCESS_TOKEN. If Admin Bot is on a separate LINE OA, replies will fail!');
  }

  if (!hasAdminSecret && !hasCustomerSecret) {
    warnings.push('❌ LINE_ADMIN_CHANNEL_SECRET is missing. Webhook signature verification will be skipped or fail.');
  } else if (!hasAdminSecret) {
    warnings.push('⚠️ LINE_ADMIN_CHANNEL_SECRET is not set; falling back to LINE_CHANNEL_SECRET. If Admin Bot is on a separate LINE OA, signature verification (401) will fail!');
  }

  if (dbStatus !== 'connected') {
    warnings.push(`❌ Database connection issue: ${adminSessionsTable}. Run 'npx drizzle-kit push' to sync schema.`);
  }

  return NextResponse.json({
    status: 'online',
    endpoint: '/api/line-admin-webhook',
    timestamp: new Date().toISOString(),
    envCheck: {
      LINE_ADMIN_CHANNEL_ACCESS_TOKEN: hasAdminToken ? '✅ Configured' : (hasCustomerToken ? '⚠️ Using LINE_CHANNEL_ACCESS_TOKEN fallback' : '❌ Missing'),
      LINE_ADMIN_CHANNEL_SECRET: hasAdminSecret ? '✅ Configured' : (hasCustomerSecret ? '⚠️ Using LINE_CHANNEL_SECRET fallback' : '❌ Missing'),
      LINE_CHANNEL_ACCESS_TOKEN: hasCustomerToken ? '✅ Configured' : '❌ Missing',
      LINE_CHANNEL_SECRET: hasCustomerSecret ? '✅ Configured' : '❌ Missing',
      DATABASE_URL: hasDatabaseUrl ? '✅ Configured' : '❌ Missing',
    },
    database: {
      status: dbStatus,
      adminSessionsTable: adminSessionsTable,
    },
    diagnostics: {
      isHealthy: warnings.length === 0,
      warnings: warnings.length > 0 ? warnings : ['✅ All configurations and database connections are ready!'],
    },
    lineSettingsChecklist: [
      '1. LINE Developers Console -> Messaging API -> Webhook URL set to https://<your-domain>/api/line-admin-webhook',
      '2. LINE Developers Console -> Messaging API -> "Use webhook" toggled ON',
      '3. LINE Official Account Manager (manager.line.biz) -> Settings -> Response settings -> Response mode: Bot (บอท)',
      '4. LINE Official Account Manager -> Settings -> Response settings -> Webhook: Enabled (เปิดใช้งาน)',
      '5. LINE Official Account Manager -> Settings -> Response settings -> Auto-response: Disabled (ปิด)',
    ]
  }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === '') {
      return NextResponse.json({ message: 'Empty body' }, { status: 200 });
    }

    const channelSecret = process.env.LINE_ADMIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers.get('x-line-signature');
    if (channelSecret && !verifyLineSignature(bodyText, signature, channelSecret)) {
      console.error('❌ Signature Verification Failed for LINE Admin Webhook. Used secret:', process.env.LINE_ADMIN_CHANNEL_SECRET ? 'LINE_ADMIN_CHANNEL_SECRET' : 'FALLBACK LINE_CHANNEL_SECRET');
      return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    if (!body.events || body.events.length === 0) {
      return NextResponse.json({ message: 'Verify Success' }, { status: 200 });
    }

    for (const event of body.events) {
      const replyToken = event.replyToken;
      const userId = event.source?.userId;

      if (!replyToken || replyToken === '00000000000000000000000000000000' || replyToken === 'ffffffffffffffffffffffffffffffff') {
        continue;
      }

      if (event.type === 'follow') {
        if (userId) {
          await registerAdminUserId(userId);
        }
        const welcomeMsg = `👋 สวัสดีค่ะ! Ren เลขาจองคิวยินดีต้อนรับค่ะ ✨\n\nระบบได้ลงทะเบียนบัญชี LINE ของคุณเป็นแอดมินเรียบร้อยแล้วค่ะ\n\nคุณสามารถกดปุ่มเมนูด้านล่าง หรือพิมพ์ 'เช็ก' / 'คิวรออนุมัติ' เพื่อจัดการคิวได้เลยนะคะ 👇`;
        await replyToLine(replyToken, {
          type: 'text',
          text: welcomeMsg,
          quickReply: ADMIN_MAIN_QUICK_REPLY,
        });
        continue;
      }

      if (event.type !== 'message' || event.message?.type !== 'text') {
        continue;
      }

      const userMessage: string = event.message.text.trim();
      if (!userMessage) continue;

      if (userId) {
        await registerAdminUserId(userId);
      }

    // =========================================================================
    // STEP 0: ตรวจสอบ Admin Interactive Session (หากอยู่ระหว่างขั้นตอนเลือกการชำระเงิน/ระบุจำนวนมัดจำ)
    // =========================================================================
    if (userId) {
      const adminSession = await getAdminSession(userId);
      if (adminSession) {
        // หากเป็นเซสชันที่ไม่มีข้อมูล draftBooking (เช่น เพิ่งลงทะเบียนไว้) ให้ล้างทิ้ง
        if (!adminSession.draftBooking || !adminSession.draftBooking.eventName) {
          await clearAdminSession(userId);
        } else {
          // หากพิมพ์ "ยกเลิก" -> ล้างเซสชัน
          if (/^(ยกเลิก|cancel|exit)$/i.test(userMessage)) {
            await clearAdminSession(userId);
            await replyToLine(replyToken, '❌ ยกเลิกการทำรายการเรียบร้อยแล้วค่ะ');
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // --- ขั้นตอนที่ 1: แอดมินกำลังเลือกประเภทการชำระเงิน ---
          if (adminSession.step === 'awaiting_payment_status') {
            const draft = adminSession.draftBooking;
            const cleanText = userMessage.toLowerCase().trim();

            // Case A: ยังไม่มัดจำ
            if (cleanText.includes('ยังไม่มัดจำ') || cleanText.includes('ยังไม่ชำระ') || cleanText.includes('unpaid')) {
              draft.paymentStatus = 'unpaid';
              draft.depositAmount = 0;
              draft.remainingAmount = 0;
              await setAdminSession(userId, 'awaiting_notes', draft);

              const askNotesMsg = {
                type: 'text',
                text: `📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม "ไม่มีโน้ต" ด้านล่างนะคะ 👇)`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '❌ ไม่มีโน้ต', text: 'ไม่มีโน้ต' } },
                  ]
                }
              };
              await replyToLine(replyToken, askNotesMsg);
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            }

            // Case B: ชำระเต็มจำนวน
            if (cleanText.includes('ชำระเต็ม') || cleanText.includes('เต็มจำนวน') || cleanText.includes('จ่ายแล้ว') || cleanText.includes('paid')) {
              draft.paymentStatus = 'paid';
              draft.depositAmount = 0;
              draft.remainingAmount = 0;
              await setAdminSession(userId, 'awaiting_notes', draft);

              const askNotesMsg = {
                type: 'text',
                text: `📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม "ไม่มีโน้ต" ด้านล่างนะคะ 👇)`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '❌ ไม่มีโน้ต', text: 'ไม่มีโน้ต' } },
                  ]
                }
              };
              await replyToLine(replyToken, askNotesMsg);
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            }

            // Case C: มัดจำแล้ว -> ถามจำนวนเงินมัดจำต่อ
            if (cleanText.includes('มัดจำแล้ว') || cleanText.includes('มัดจำ') || cleanText.includes('deposit')) {
              draft.paymentStatus = 'deposit';
              await setAdminSession(userId, 'awaiting_deposit_amount', draft);
              const askDepositMsg = {
                type: 'text',
                text: `🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '💵 100 บาท', text: '100' } },
                  ]
                }
              };
              await replyToLine(replyToken, askDepositMsg);
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            }
          }

          // --- ขั้นตอนที่ 2: แอดมินกำลังระบุจำนวนเงินมัดจำ ---
          if (adminSession.step === 'awaiting_deposit_amount') {
            const draft = adminSession.draftBooking;
            const matchAmount = userMessage.match(/\d+/);
            const depositAmt = matchAmount ? parseInt(matchAmount[0], 10) : 0;

            draft.depositAmount = depositAmt;
            await setAdminSession(userId, 'awaiting_remaining_amount', draft);

            const askRemainingMsg = {
              type: 'text',
              text: `💵 ต้องเก็บเงินเพิ่มอีกกี่บาทคะ?\n(กรุณากดเลือกจำนวนเงิน หรือพิมพ์ตัวเลข เช่น 119 ทางแชทได้เลยค่ะ 👇)`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '💵 59 บาท', text: '59' } },
                  { type: 'action', action: { type: 'message', label: '💵 89 บาท', text: '89' } },
                  { type: 'action', action: { type: 'message', label: '💵 99 บาท', text: '99' } },
                  { type: 'action', action: { type: 'message', label: '💵 119 บาท', text: '119' } },
                ]
              }
            };
            await replyToLine(replyToken, askRemainingMsg);
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // --- ขั้นตอนที่ 3: แอดมินกำลังระบุจำนวนเงินที่ต้องเก็บเพิ่ม -> ถามต่อเรื่องโน้ต ---
          if (adminSession.step === 'awaiting_remaining_amount') {
            const draft = adminSession.draftBooking;
            const matchAmount = userMessage.match(/\d+/);
            const remainingAmt = matchAmount ? parseInt(matchAmount[0], 10) : 0;

            draft.remainingAmount = remainingAmt;
            await setAdminSession(userId, 'awaiting_notes', draft);

            const askNotesMsg = {
              type: 'text',
              text: `📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม "ไม่มีโน้ต" ด้านล่างนะคะ 👇)`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '❌ ไม่มีโน้ต', text: 'ไม่มีโน้ต' } },
                ]
              }
            };
            await replyToLine(replyToken, askNotesMsg);
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // --- ขั้นตอนที่ 3.5: แอดมินระบุโน้ต (หรือกดปุ่มไม่มีโน้ต) -> เด้งสรุปพร้อมปุ่มยืนยัน/ทำรายการใหม่/ยกเลิก ---
          if (adminSession.step === 'awaiting_notes') {
            const draft = adminSession.draftBooking;
            const cleanText = userMessage.trim();

            if (/^(ไม่มีโน้ต|ไม่มี|ไม่ระบุ|-|no|none)$/i.test(cleanText)) {
              draft.notes = '';
            } else {
              draft.notes = cleanText;
            }

            await setAdminSession(userId, 'awaiting_final_confirmation', draft);

            const summaryText = buildSummaryText(draft);
            const confirmMsg = {
              type: 'text',
              text: `${summaryText}\n\nกรุณากดปุ่มเพื่อยืนยัน ทำรายการใหม่ หรือยกเลิกการจองนะคะ 👇`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '✅ ยืนยันการจอง', text: 'ยืนยันการจอง' } },
                  { type: 'action', action: { type: 'message', label: '🔄 ทำรายการใหม่', text: 'ทำรายการใหม่' } },
                  { type: 'action', action: { type: 'message', label: '❌ ยกเลิกการจอง', text: 'ยกเลิกการจอง' } },
                ]
              }
            };
            await replyToLine(replyToken, confirmMsg);
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          // --- ขั้นตอนที่ 4: แอดมินกด "ยืนยันการจอง", "ทำรายการใหม่" หรือ "ยกเลิกการจอง" ---
          if (adminSession.step === 'awaiting_final_confirmation') {
            const draft = adminSession.draftBooking;
            const cleanText = userMessage.toLowerCase().trim();

            const isRestart = cleanText.includes('ทำรายการใหม่') ||
                              cleanText.includes('เริ่มใหม่') ||
                              cleanText.includes('แก้ไข') ||
                              cleanText.includes('restart');

            const isConfirm = cleanText.includes('ยืนยัน') ||
                              cleanText.includes('อนุมัติ') ||
                              cleanText.includes('ตกลง') ||
                              cleanText.includes('confirm') ||
                              cleanText.includes('ok') ||
                              cleanText.includes('yes');

            const isCancel = cleanText.includes('ยกเลิก') ||
                             cleanText.includes('ไม่ยืนยัน') ||
                             cleanText.includes('cancel') ||
                             cleanText.includes('reject') ||
                             cleanText.includes('no');

            if (isRestart) {
              const isDeposit = draft.paymentStatus === 'deposit';
              draft.depositAmount = 0;
              draft.remainingAmount = 0;
              draft.notes = '';

              if (isDeposit) {
                await setAdminSession(userId, 'awaiting_deposit_amount', draft);
                const askDepositMsg = {
                  type: 'text',
                  text: `🔄 ย้อนกลับไปขั้นตอนแรกสำหรับคิว #${draft.bookingId || ''}\n\n🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)`,
                  quickReply: {
                    items: [
                      { type: 'action', action: { type: 'message', label: '💵 100 บาท', text: '100' } },
                    ]
                  }
                };
                await replyToLine(replyToken, askDepositMsg);
              } else {
                await setAdminSession(userId, 'awaiting_notes', draft);
                const askNotesMsg = {
                  type: 'text',
                  text: `🔄 ย้อนกลับไปขั้นตอนโน้ต\n\n📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม "ไม่มีโน้ต" ด้านล่างนะคะ 👇)`,
                  quickReply: {
                    items: [
                      { type: 'action', action: { type: 'message', label: '❌ ไม่มีโน้ต', text: 'ไม่มีโน้ต' } },
                    ]
                  }
                };
                await replyToLine(replyToken, askNotesMsg);
              }
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            } else if (isConfirm) {
              try {
                const paymentNote = draft.paymentStatus === 'paid'
                  ? 'ชำระเต็มจำนวน'
                  : `มัดจำ ${draft.depositAmount || 0} บาท (เก็บเพิ่ม ${draft.remainingAmount || 0} บาท)`;

                const finalNotes = draft.notes
                  ? `${paymentNote} | โน้ต: ${draft.notes}`
                  : paymentNote;

                await confirmOrCreateBooking({
                  bookingId: draft.bookingId,
                  date: draft.date,
                  eventName: draft.eventName,
                  timeSlot: draft.timeSlot,
                  customerName: draft.customerName,
                  customerPhone: draft.customerPhone,
                  lineDisplayName: draft.lineDisplayName,
                  lineUserId: draft.customerLineUserId,
                  cameraType: draft.cameraType,
                  status: 'confirmed',
                  paymentStatus: draft.paymentStatus || 'unpaid',
                  depositAmount: draft.depositAmount || 0,
                  remainingAmount: draft.remainingAmount || 0,
                  notes: finalNotes,
                });

                await clearAdminSession(userId);

                if (draft.customerLineUserId) {
                  await clearLineUserSession(draft.customerLineUserId);

                  const paymentLabel = draft.paymentStatus === 'paid'
                    ? 'ชำระเต็มจำนวน'
                    : `มัดจำแล้ว (${(draft.depositAmount || 0).toLocaleString()} ฿)`;

                  let customerConfirmText = `#${draft.eventName}\n`;
                  customerConfirmText += `วันที่ : ${draft.date}\n`;
                  customerConfirmText += `เวลา : ${draft.timeSlot} น.\n`;
                  if (draft.cameraType) {
                    customerConfirmText += `📷 กล้อง : ${draft.cameraType}\n`;
                  }
                  customerConfirmText += `K.${draft.customerName} ${draft.customerPhone}\n`;
                  customerConfirmText += `ชื่อไลน์ : ${draft.lineDisplayName || '-'}\n`;
                  customerConfirmText += `การชำระเงิน : ${paymentLabel}\n`;
                  if (draft.notes) {
                    customerConfirmText += `โน้ต : ${draft.notes}\n`;
                  }
                  customerConfirmText += `ลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️🙇🏻‍♀️`;

                  await pushLineMessage(draft.customerLineUserId, customerConfirmText, 'customer');
                }

                await replyToLine(replyToken, '✅ ยืนยันการจองเรียบร้อยแล้ว (อัปเดตสถานะเป็น confirmed) และส่งข้อความแจ้งลงคิวให้ลูกค้าเรียบร้อยแล้วค่ะ!');
              } catch (err: any) {
                console.error("⚠️ LINE Admin Booking Error:", err.message);
                await clearAdminSession(userId);
                await replyToLine(replyToken, `⚠️ ไม่สามารถบันทึกการจองได้ค่ะ:\n${err.message || 'เกิดข้อผิดพลาดในการยืนยันคิว'}`);
              }
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            } else if (isCancel) {
              await cancelPendingBookingIfExists({
                bookingId: draft.bookingId,
                date: draft.date,
                eventName: draft.eventName,
                timeSlot: draft.timeSlot,
                cameraType: draft.cameraType,
              });

              await clearAdminSession(userId);

              if (draft.customerLineUserId) {
                await clearLineUserSession(draft.customerLineUserId);
                const cancelTextToCustomer = "⚠️ ขออภัยค่ะ การจองไม่สำเร็จ โปรดทำการจองกับแอดมินอีกครั้งนะคะ 🙇🏻‍♀️";
                await pushLineMessage(draft.customerLineUserId, cancelTextToCustomer, 'customer');
              }

              await replyToLine(replyToken, '❌ ยกเลิกการทำรายการเรียบร้อยแล้ว และได้ส่งข้อความแจ้งลูกค้าแล้วค่ะ');
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            } else {
              // หากพิมพ์คำที่ไม่ใช่ปุ่มยืนยันหรือยกเลิก -> ไม่ยกเลิกคิว แต่ให้แสดงการ์ดสรุปและปุ่มเดิม
              const summaryText = buildSummaryText(draft);
              const confirmMsg = {
                type: 'text',
                text: `📌 ท่านอยู่ระหว่างขั้นตอนยืนยันการจองคิวค่ะ\n\n${summaryText}\n\nกรุณากดปุ่มเพื่อยืนยัน หรือทำรายการใหม่ หรือยกเลิกการจองนะคะ 👇`,
                quickReply: {
                  items: [
                    { type: 'action', action: { type: 'message', label: '✅ ยืนยันการจอง', text: 'ยืนยันการจอง' } },
                    { type: 'action', action: { type: 'message', label: '🔄 ทำรายการใหม่', text: 'ทำรายการใหม่' } },
                    { type: 'action', action: { type: 'message', label: '❌ ยกเลิกการจอง', text: 'ยกเลิกการจอง' } },
                  ]
                }
              };
              await replyToLine(replyToken, confirmMsg);
              return NextResponse.json({ message: 'OK' }, { status: 200 });
            }
          }
        }
      }
    }

    // =========================================================================
    // คำสั่งเลือกอนุมัติคิวตาม ID: [เลือกอนุมัติคิว] #9 หรือ อนุมัติคิว 9
    // =========================================================================
    if (userMessage.startsWith('[เลือกอนุมัติคิว]') || /^อนุมัติคิว\s*#?(\d+)/i.test(userMessage)) {
      const match = userMessage.match(/\d+/);
      const targetId = match ? parseInt(match[0], 10) : 0;
      const allBookings: BookingRecord[] = await getAllBookings();
      const targetBooking = allBookings.find(b => b.id === targetId && b.status === 'pending');

      if (!targetBooking) {
        await replyToLine(replyToken, `⚠️ ไม่พบข้อมูลคิวรออนุมัติ ID #${targetId} ในระบบแล้วค่ะ (อาจถูกยืนยันหรือยกเลิกไปแล้ว)`);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      await startAdminBookingConfirmation(replyToken, userId, targetBooking);
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // =========================================================================
    // คำสั่ง: เช็กคิวลูกค้าที่รออนุมัติ ("ยืนยันคิวลูกค้า", "ยืนยันคิว", "อนุมัติคิว")
    // =========================================================================
    if (/^(ยืนยันคิว|ยืนยันคิวลูกค้า|อนุมัติคิว|คิวรออนุมัติ|คิวค้าง)/i.test(userMessage)) {
      const allBookings: BookingRecord[] = await getAllBookings();
      const pendingBookings = allBookings.filter(b => b.status === 'pending');

      if (pendingBookings.length === 0) {
        await replyToLine(replyToken, '📭 ปัจจุบันไม่มีรายการจองคิวลูกค้าที่รอการยืนยันค่ะ ✨');
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      if (pendingBookings.length === 1) {
        await startAdminBookingConfirmation(replyToken, userId, pendingBookings[0]);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // กรณีมีหลายคิวรออนุมัติ -> แสดงเป็น Flex Carousel ให้เลือก
      const pendingCards = pendingBookings.slice(0, 10).map((b) => {
        const isDep = b.paymentStatus === 'deposit' || (b.notes || '').includes('มัดจำ');
        const payLabel = isDep ? '🟡 มัดจำ' : '💚 ชำระเต็มจำนวน';

        return {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: `📌 คิวรออนุมัติ #${b.id}`, weight: 'bold', size: 'md', color: '#F4A0B5' },
              { type: 'text', text: `🎤 ${b.eventName || 'ไม่ได้ระบุงาน'}`, weight: 'bold', size: 'sm', wrap: true },
              { type: 'text', text: `📅 วันที่: ${b.date}`, size: 'xs', color: '#555555' },
              { type: 'text', text: `⏰ เวลา: ${b.timeSlot} น.`, size: 'xs', color: '#555555' },
              { type: 'text', text: `📷 กล้อง: ${b.cameraType || '-'}`, size: 'xs', color: '#555555', wrap: true },
              { type: 'text', text: `💳 การชำระเงิน: ${payLabel}`, size: 'xs', color: '#333333', weight: 'bold' },
              { type: 'separator' },
              { type: 'text', text: `👤 ผู้จอง: K.${b.customerName || '-'} (${b.customerPhone || '-'})`, size: 'xs', color: '#111111', wrap: true },
              { type: 'text', text: `💬 ชื่อไลน์: ${b.lineDisplayName || '-'}`, size: 'xs', color: '#777777' },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#FFB6C1',
                cornerRadius: 'md',
                paddingAll: 'md',
                action: {
                  type: 'message',
                  label: `เลือกอนุมัติคิว #${b.id}`,
                  text: `[เลือกอนุมัติคิว] #${b.id}`,
                },
                contents: [
                  {
                    type: 'text',
                    text: `👉 เลือกอนุมัติคิว #${b.id}`,
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
      });

      const flexCarousel = {
        type: 'flex',
        altText: `📌 มีคิวรอการอนุมัติทั้งหมด ${pendingBookings.length} รายการ`,
        contents: {
          type: 'carousel',
          contents: pendingCards,
        },
      };

      await replyToLine(replyToken, [
        { type: 'text', text: `📌 มีรายการจองคิวลูกค้าที่รอการอนุมัติทั้งหมด ${pendingBookings.length} รายการค่ะ กรุณากดเลือกลิสต์ที่ต้องการทำรายการนะคะ 👇` },
        flexCarousel,
      ]);
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // ดึงข้อมูลตารางงานและการจองจาก Supabase
    const allSchedules: ScheduleRecord[] = await getAllScheduleRecords();
    const allBookings: BookingRecord[] = await getAllBookings();

    // =========================================================================
    // ฟังก์ชันที่ 1: เช็กสถานะการจอง ("เช็ก", "check", หรือกดเลือกกล้อง "[เช็กกล้อง]")
    // =========================================================================
    const isCheckCameraBtn = userMessage.startsWith('[เช็กกล้อง]');
    const isCheckCmd = /^(เช็ก|check)/i.test(userMessage);

    if (isCheckCameraBtn || isCheckCmd) {
      let selectedCameraQuery = '';
      let eventQuery = '';
      let dateQuery = '';

      if (isCheckCameraBtn) {
        // รูปแบบข้อความกดปุ่ม: [เช็กกล้อง] RICOH GR IIIx + Flash | งาน: ITZY (2026-08-20)
        const match = userMessage.match(/^\[เช็กกล้อง\]\s*(.*?)\s*\|\s*งาน:\s*(.*?)\s*\((.*?)\)$/);
        if (match) {
          selectedCameraQuery = match[1].trim();
          eventQuery = match[2].trim().toLowerCase();
          dateQuery = match[3].trim().toLowerCase();
        } else {
          const parts = userMessage.replace('[เช็กกล้อง]', '').split('|');
          selectedCameraQuery = parts[0].trim();
        }
      } else {
        const cleanQuery = userMessage.replace(/^(เช็ก|check)/gi, '').trim();

        // 1.1 แสดงรายการอีเวนต์ทั้งหมดในระบบ (เมื่อพิมพ์ "เช็ก", "เช็กทั้งหมด", "check all")
        if (!cleanQuery || /^(ทั้งหมด|all)$/i.test(cleanQuery)) {
          const todayStr = getTodayThailandDateString();
          const availableSchedules = allSchedules.filter(
            s => s.status.toLowerCase() !== 'unavailable' && s.date.trim() >= todayStr
          );

          if (availableSchedules.length === 0) {
            await replyToLine(replyToken, '📭 ปัจจุบันยังไม่มีข้อมูลอีเวนต์ในตารางเวลาที่ยังไม่หมดเวลานะคะ');
            return NextResponse.json({ message: 'OK' }, { status: 200 });
          }

          const flexButtons = availableSchedules.slice(0, 100).map(s => {
            const shortDate = s.date.split('-')[2] || s.date;
            const buttonLabel = `${shortDate}: ${s.eventName || 'ไม่ได้ระบุชื่อ'}`;

            return {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFB6C1',
              cornerRadius: 'md',
              margin: 'sm',
              paddingAll: '10px',
              action: {
                type: 'message',
                label: buttonLabel.substring(0, 20),
                text: `เช็ก ${s.eventName || 'อีเวนต์'} / ${shortDate}`,
              },
              contents: [
                {
                  type: 'text',
                  text: buttonLabel,
                  color: '#111111',
                  align: 'center',
                  weight: 'bold',
                  size: 'sm',
                },
              ],
            };
          });

          const flexMessage = {
            type: 'flex',
            altText: '📅 รายการอีเวนต์ทั้งหมดในระบบ',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: '📋 รายการอีเวนต์ทั้งหมด', weight: 'bold', size: 'md', color: '#111111' },
                  {
                    type: 'text',
                    text: 'นี่คือตารางงานทั้งหมดที่เปิดให้จองในปัจจุบันค่ะ กดเลือกรายการที่ต้องการเช็กคิวว่างได้เลย 👇',
                    wrap: true,
                    size: 'sm',
                    color: '#555555',
                    margin: 'xs',
                  },
                  { type: 'separator', margin: 'md' },
                  { type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm', contents: flexButtons },
                ],
              },
            },
          };

          await replyToLine(replyToken, flexMessage);
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }

        const queryParts = cleanQuery.split('/');
        eventQuery = queryParts[0].trim().toLowerCase();
        dateQuery = queryParts.length > 1 ? queryParts[1].trim().toLowerCase() : '';
        selectedCameraQuery = queryParts.length > 2 ? queryParts[2].trim() : '';
      }

      // ค้นหาอีเวนต์ที่ตรงตามคำค้น
      const todayStr = getTodayThailandDateString();
      const matchedSchedules = allSchedules.filter(s => {
        if (s.status.toLowerCase() === 'unavailable') return false;
        // หากแอดมินไม่ได้ระบุวันที่ค้นหาเจาะจง ให้ซ่อนรอบวันที่ผ่านไปแล้ว
        if (!dateQuery && s.date.trim() < todayStr) return false;
        const name = (s.eventName || '').toLowerCase();
        return name.includes(eventQuery) || eventQuery.includes(name);
      });

      if (matchedSchedules.length === 0) {
        await replyToLine(replyToken, `❌ ไม่พบข้อมูล Event ที่ค้นหา: "${eventQuery}"`);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      let targetSchedule: ScheduleRecord | null = null;

      if (dateQuery) {
        targetSchedule = matchedSchedules.find(s => s.date.endsWith(dateQuery) || s.date === dateQuery) || null;

        if (!targetSchedule) {
          const datesList = matchedSchedules.map(m => `• ${m.date}`).join('\n');
          await replyToLine(
            replyToken,
            `❌ พบอีเวนต์ "${matchedSchedules[0].eventName}" แต่ไม่มีรอบวันที่ตรงกับ "${dateQuery}"\n\n📅 รอบวันที่ทั้งหมดที่มีในระบบ:\n${datesList}`
          );
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }
      } else {
        if (matchedSchedules.length === 1) {
          targetSchedule = matchedSchedules[0];
        } else {
          // ถ้างานมีหลายวัน ให้ส่ง Flex Button ให้เลือกว่าจะเช็กวันไหน
          const flexButtons = matchedSchedules.map(m => {
            const shortDate = m.date.split('-')[2] || m.date;
            return {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFB6C1',
              cornerRadius: 'md',
              margin: 'sm',
              paddingAll: '10px',
              action: {
                type: 'message',
                label: `📅 วันที่ ${shortDate}`,
                text: `เช็ก ${m.eventName} / ${shortDate}`,
              },
              contents: [
                {
                  type: 'text',
                  text: `📅 วันที่ ${shortDate}`,
                  color: '#111111',
                  align: 'center',
                  weight: 'bold',
                  size: 'md',
                },
              ],
            };
          });

          const flexMessage = {
            type: 'flex',
            altText: '📅 เลือกวันที่ต้องการเช็กคิว',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  { type: 'text', text: '📅 ตรวจพบอีเวนต์จัดหลายวัน', weight: 'bold', size: 'md', color: '#111111' },
                  {
                    type: 'text',
                    text: `อีเวนต์ "${matchedSchedules[0].eventName}" มีรอบแสดงหลายวันในตารางค่ะ`,
                    wrap: true,
                    size: 'sm',
                    color: '#555555',
                    margin: 'xs',
                  },
                  { type: 'separator', margin: 'md' },
                  { type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm', contents: flexButtons },
                ],
              },
            },
          };

          await replyToLine(replyToken, flexMessage);
          return NextResponse.json({ message: 'OK' }, { status: 200 });
        }
      }

      const fullEventName = targetSchedule.eventName || 'ไม่ได้ระบุชื่อ';
      const targetDateStr = targetSchedule.date;
      const slots: TimeSlot[] = (targetSchedule.slots && targetSchedule.slots.length > 0)
        ? targetSchedule.slots
        : DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available' as const }));

      const activeCameras = await getActiveCameras();

      // 1.3 หากยังไม่ได้เลือกรุ่นกล้อง (selectedCameraQuery เป็นค่าว่าง) -> ส่ง Flex Message เมนูเลือกรุ่นกล้อง!
      if (!selectedCameraQuery) {
        const cameraButtons = activeCameras.map((cam) => ({
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#FFB6C1',
          cornerRadius: 'md',
          margin: 'sm',
          paddingAll: '10px',
          action: {
            type: 'message',
            label: `📷 ${cam.name}`.substring(0, 20),
            text: `[เช็กกล้อง] ${cam.name} | งาน: ${fullEventName} (${targetDateStr})`,
          },
          contents: [
            {
              type: 'text',
              text: `📷 ${cam.name}`,
              color: '#111111',
              align: 'center',
              weight: 'bold',
              size: 'sm',
            },
          ],
        }));

        // เพิ่มปุ่มเช็กทุกกล้องพร้อมกัน
        cameraButtons.push({
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#E8D8F8',
          cornerRadius: 'md',
          margin: 'sm',
          paddingAll: '10px',
          action: {
            type: 'message',
            label: '📋 เช็กทุกกล้องพร้อมกัน',
            text: `[เช็กกล้อง] ทั้งหมด | งาน: ${fullEventName} (${targetDateStr})`,
          },
          contents: [
            {
              type: 'text',
              text: '📋 เช็กทุกกล้องพร้อมกัน',
              color: '#111111',
              align: 'center',
              weight: 'bold',
              size: 'sm',
            },
          ],
        });

        const flexCameraMessage = {
          type: 'flex',
          altText: `📸 กรุณาเลือกกล้องสำหรับงาน ${fullEventName}`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '📸 เลือกรุ่นกล้องที่ต้องการเช็กคิว', weight: 'bold', size: 'md', color: '#111111' },
                {
                  type: 'text',
                  text: `งาน: ${fullEventName} (${targetDateStr})`,
                  wrap: true,
                  size: 'sm',
                  color: '#555555',
                  margin: 'xs',
                },
                { type: 'separator', margin: 'md' },
                { type: 'box', layout: 'vertical', margin: 'md', spacing: 'sm', contents: cameraButtons },
              ],
            },
          },
        };

        await replyToLine(replyToken, flexCameraMessage);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // 1.4 เมื่อเลือกรุ่นกล้องเรียบร้อยแล้ว -> แสดงรายงานคิวของกล้องรุ่นนั้นๆ
      const matchedBookings = allBookings.filter(
        b => b.date.trim() === targetDateStr.trim() &&
          (b.eventName.trim() === fullEventName.trim() || !b.eventName) &&
          b.status !== 'cancelled'
      );

      const isShowAllCameras = selectedCameraQuery.toLowerCase() === 'ทั้งหมด' || selectedCameraQuery.toLowerCase() === 'all';

      let targetCameras: string[] = [];
      if (isShowAllCameras) {
        const activeCameraNames = activeCameras.map(c => c.name.trim());
        const extraCameraNames = new Set<string>();
        matchedBookings.forEach(b => {
          if (b.cameraType && b.cameraType.trim()) {
            const cam = b.cameraType.trim();
            if (!activeCameraNames.some(ac => ac.toLowerCase() === cam.toLowerCase())) {
              extraCameraNames.add(cam);
            }
          }
        });
        targetCameras = [...activeCameraNames, ...Array.from(extraCameraNames)];
        if (targetCameras.length === 0) targetCameras.push('RICOH GR IIIx + Flash');
      } else {
        const matchedCamObj = activeCameras.find(c => c.name.toLowerCase().includes(selectedCameraQuery.toLowerCase()) || selectedCameraQuery.toLowerCase().includes(c.name.toLowerCase()));
        targetCameras = [matchedCamObj ? matchedCamObj.name : selectedCameraQuery];
      }

      const cameraReports: string[] = [];

      for (let i = 0; i < targetCameras.length; i++) {
        const cameraName = targetCameras[i];
        const isFirstCam = i === 0;

        const cameraBookings = matchedBookings.filter(b => {
          const bCam = (b.cameraType || '').trim();
          if (!bCam) {
            return isFirstCam;
          }
          return bCam.toLowerCase().includes(cameraName.toLowerCase()) || cameraName.toLowerCase().includes(bCam.toLowerCase());
        });

        const bookedSlotsMap = new Map<string, BookingRecord>();
        cameraBookings.forEach(b => {
          const cleanTime = (b.timeSlot || '').replace(/\s+/g, '');
          if (cleanTime) {
            bookedSlotsMap.set(cleanTime, b);
          }
        });

        let camAvailableList = '';
        let camBookedList = '';

        for (const slot of slots) {
          const cleanSlotTime = slot.time.replace(/\s+/g, '');
          if ((slot.status as string) === 'unavailable') continue;

          const bookingInfo = bookedSlotsMap.get(cleanSlotTime);

          let isSlotLockedForThisCam = false;
          const normCamName = cameraName.trim().toLowerCase();
          if (slot.cameraStatuses) {
            const camKey = Object.keys(slot.cameraStatuses).find(
              k =>
                k.toLowerCase() === normCamName ||
                k.toLowerCase().includes(normCamName) ||
                normCamName.includes(k.toLowerCase())
            );
            if (camKey) {
              isSlotLockedForThisCam = slot.cameraStatuses[camKey] === 'booked';
            }
          } else if (slot.status === 'booked') {
            isSlotLockedForThisCam = true;
          }

          if (bookingInfo) {
            const customerName = bookingInfo.customerName || 'ไม่ระบุชื่อ';
            const phone = bookingInfo.customerPhone ? formatPhoneNumber(bookingInfo.customerPhone) : 'ไม่ระบุเบอร์';
            const lineName = bookingInfo.lineDisplayName || 'ไม่ระบุชื่อไลน์';

            const depositAmount = bookingInfo.depositAmount || 0;
            const remainingAmount = bookingInfo.remainingAmount || 0;
            const paymentStatus = bookingInfo.paymentStatus;
            const remainingLabel = remainingAmount > 0 ? `\n   💵 ยอดต้องเก็บเพิ่ม: ${remainingAmount.toLocaleString()} ฿` : '';
            const paymentLabel = paymentStatus === 'paid'
              ? `ชำระเต็มแล้ว${depositAmount > 0 ? ` (${depositAmount.toLocaleString()} ฿)` : ''}`
              : paymentStatus === 'deposit'
              ? `มัดจำแล้ว${depositAmount > 0 ? ` (${depositAmount.toLocaleString()} ฿)` : ''}${remainingLabel}`
              : 'ยังไม่มัดจำ';

            const bookingStatus = bookingInfo.status;
            const statusLabel = bookingStatus === 'confirmed' ? '✅ ยืนยันคิวแล้ว' : '⏳ รอยืนยันคิว';
            const notesInfo = bookingInfo.notes ? `\n   📝 โน้ต: ${bookingInfo.notes}` : '';

            camBookedList += `⏰ ${slot.time}\n   👤 ผู้จอง: K.${customerName}\n   💬 ชื่อไลน์: ${lineName}\n   📞 เบอร์: ${phone}\n   💳 การชำระเงิน: ${paymentLabel}\n   📋 สถานะคิว: ${statusLabel}${notesInfo}\n---------------------\n`;
          } else if (isSlotLockedForThisCam) {
            camBookedList += `⏰ ${slot.time}\n   🔒 สถานะ: แอดมินล็อกเป็นคิวเต็ม (${cameraName})\n---------------------\n`;
          } else {
            camAvailableList += `  ✅ ${slot.time}\n`;
          }
        }

        let camReport = isShowAllCameras ? `📷 กล้อง: ${cameraName}\n━━━━━━━━━━━━━━\n` : '';
        if (camAvailableList) {
          camReport += `🟢 เวลาที่ยังว่างอยู่:\n${camAvailableList}`;
        } else {
          camReport += `🔴 รอบเวลาเต็มทุกรอบแล้วค่ะ\n`;
        }

        if (camBookedList) {
          camReport += `\n🔴 เวลาที่มีคนจองแล้ว:\n${camBookedList}`;
        }

        cameraReports.push(camReport.trim());
      }

      const cameraSubHeader = !isShowAllCameras ? `📷 กล้อง: ${targetCameras[0]}\n` : '';
      const reportHeader = `📊 รายงานสถานะคิวของ: ${fullEventName}\n📅 วันที่จัดงาน: ${targetDateStr}\n${cameraSubHeader}=====================\n\n`;
      const fullReport = reportHeader + cameraReports.join('\n\n=====================\n\n');

      await replyToLine(replyToken, fullReport.trim());
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // =========================================================================
    // ฟังก์ชันที่ 2: ระบบจองคิวผ่านบล็อกข้อความ (ข้อความมีคำว่า "วันที่" และ "เวลา")
    // =========================================================================
    else if (userMessage.includes('วันที่') && userMessage.includes('เวลา')) {
      const lines = userMessage.split('\n');
      const inputEvent = lines[0]
        .replace('#', '')
        .split('3rd')[0]
        .split('1st')[0]
        .split('2nd')[0]
        .trim()
        .toLowerCase();

      let inputDate = '';
      const dateLine = lines.find(l => l.includes('วันที่'));
      if (dateLine) {
        const extractedDate = dateLine.split(':')[1] || dateLine.split('：')[1];
        if (extractedDate) inputDate = extractedDate.trim().toLowerCase();
      }

      let inputTime = '';
      const timeLine = lines.find(l => /\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/.test(l));
      if (timeLine) {
        const timeMatch = timeLine.match(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/);
        if (timeMatch) {
          inputTime = timeMatch[0].replace(/\./g, ':').replace(/\s/g, '');
        }
      }

      let inputCamera = '';
      const cameraLine = lines.find(l => l.includes('กล้อง') || l.includes('📷'));
      if (cameraLine) {
        const extractedCam = cameraLine.split(':')[1] || cameraLine.split('：')[1] || cameraLine.replace(/.*กล้อง\s*[:：]?/g, '');
        if (extractedCam) inputCamera = extractedCam.trim();
      }

      let customerName = 'ไม่ระบุชื่อ';
      let rawPhone = '';
      const infoLine = lines.find(l => /\d{9,10}/.test(l));
      if (infoLine) {
        const phoneMatch = infoLine.match(/\d+/);
        if (phoneMatch) {
          rawPhone = phoneMatch[0];
          customerName = infoLine
            .replace(rawPhone, '')
            .replace(/K\./gi, '')
            .replace(/คิว/gi, '')
            .replace(/[:：]/gi, '')
            .trim();
        }
      }

      let lineName = 'ไม่ระบุ';
      const lineNameLine = lines.find(l => l.includes('ชื่อไลน์'));
      if (lineNameLine) {
        const extractedLine = lineNameLine.split(':')[1] || lineNameLine.split('：')[1];
        if (extractedLine) lineName = extractedLine.trim();
      }

      // --- สถานะ: confirmed (default) | pending | cancelled ---
      let inputStatus: 'pending' | 'confirmed' | 'cancelled' = 'confirmed';
      const statusLine = lines.find(l => l.includes('สถานะ'));
      if (statusLine) {
        const rawStatus = (statusLine.split(':')[1] || statusLine.split('：')[1] || '').trim().toLowerCase();
        if (rawStatus.includes('cancel') || rawStatus.includes('ยกเลิก')) inputStatus = 'cancelled';
        else if (rawStatus.includes('pending') || rawStatus.includes('รอ') || rawStatus.includes('รอยืนยัน')) inputStatus = 'pending';
        else if (rawStatus.includes('confirm') || rawStatus.includes('ยืนยัน')) inputStatus = 'confirmed';
      }

      // --- ชำระเงิน: unpaid (ยังไม่มัดจำ) | deposit (มัดจำแล้ว) | paid (ชำระเต็มจำนวน) ---
      let inputPaymentStatus: 'unpaid' | 'deposit' | 'paid' = 'unpaid';
      const paymentLine = lines.find(l => l.includes('ชำระเงิน') || l.includes('payment') || l.includes('การชำระเงิน'));
      if (paymentLine) {
        const rawPayment = (paymentLine.split(':')[1] || paymentLine.split('：')[1] || '').trim().toLowerCase();
        if (rawPayment.includes('paid') || rawPayment.includes('ชำระเต็ม') || rawPayment.includes('เต็มจำนวน') || rawPayment.includes('ชำระแล้ว') || rawPayment.includes('จ่ายแล้ว')) {
          inputPaymentStatus = 'paid';
        } else if (rawPayment.includes('deposit') || rawPayment.includes('มัดจำแล้ว') || rawPayment.includes('มัดจำ')) {
          inputPaymentStatus = 'deposit';
        } else if (rawPayment.includes('unpaid') || rawPayment.includes('ยังไม่มัดจำ') || rawPayment.includes('ยังไม่ชำระ')) {
          inputPaymentStatus = 'unpaid';
        }
      }

      // --- จำนวนเงินมัดจำ (Deposit Amount) ---
      let inputDepositAmount = 0;
      const depositLine = lines.find(l => l.includes('มัดจำ') || l.includes('deposit'));
      if (depositLine) {
        const amountMatch = depositLine.match(/\d+/);
        if (amountMatch) {
          inputDepositAmount = parseInt(amountMatch[0], 10);
          if (inputDepositAmount > 0 && inputPaymentStatus === 'unpaid') {
            inputPaymentStatus = 'deposit';
          }
        }
      }

      // --- ยอดต้องเก็บเพิ่ม (Remaining Amount) ---
      let inputRemainingAmount = 0;
      const remainingLine = lines.find(l => l.includes('เก็บเพิ่ม') || l.includes('ยอดคงเหลือ') || l.includes('remaining'));
      if (remainingLine) {
        const amountMatch = remainingLine.match(/\d+/);
        if (amountMatch) {
          inputRemainingAmount = parseInt(amountMatch[0], 10);
        }
      }

      // --- โน้ต: ข้อความเพิ่มเติม ---
      let inputNotes: string | undefined = undefined;
      const notesLine = lines.find(l => l.includes('โน้ต') || l.includes('หมายเหตุ') || l.toLowerCase().includes('note'));
      if (notesLine) {
        const rawNotes = (notesLine.split(':')[1] || notesLine.split('：')[1] || '').trim();
        if (rawNotes) inputNotes = rawNotes;
      }

      // ตรวจสอบความถูกต้องของข้อมูล
      if (!inputEvent || !inputDate || !inputTime || !rawPhone) {
        const missingItems: string[] = [];
        if (!inputEvent) missingItems.push('• ชื่ออีเวนต์ (บรรทัดแรก)');
        if (!inputDate) missingItems.push('• วันที่ (เช่น วันที่: 2026-08-12)');
        if (!inputTime) missingItems.push('• เวลา (เช่น 12:00-12:20)');
        if (!rawPhone) missingItems.push('• เบอร์โทรศัพท์ (ตัวเลข 9-10 หลักในบรรทัดข้อมูลลูกค้า)');

        const errorMessage = `❌ รูปแบบข้อมูลการจองไม่ถูกต้อง หรือข้อมูลไม่ครบถ้วนค่ะ\n\n📌 สิ่งที่ขาดหายไปหรือระบบตรวจไม่พบ:\n${missingItems.join(
          '\n'
        )}\n\nกรุณาตรวจสอบรูปแบบการพิมพ์ให้ตรงตามคู่มือ และส่งข้อมูลมาใหม่อีกครั้งนะคะ`;

        await replyToLine(replyToken, errorMessage);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      const formattedPhone = formatPhoneNumber(rawPhone);
      const matchedSchedules = allSchedules.filter(s => {
        const name = (s.eventName || '').toLowerCase();
        return name.includes(inputEvent) || inputEvent.includes(name);
      });

      if (matchedSchedules.length === 0) {
        await replyToLine(
          replyToken,
          `❌ ค้นหาตำแหน่งตารางไม่พบ\n\n🔴 ไม่พบชื่ออีเวนต์ "${lines[0]}" ในระบบตารางคิวของคุณ`
        );
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      let targetSchedule = matchedSchedules.find(s => s.date === inputDate);
      if (!targetSchedule) {
        const inputDay = inputDate.split('-')[2] || inputDate;
        targetSchedule = matchedSchedules.find(s => (s.date.split('-')[2] || s.date) === inputDay);
      }

      if (!targetSchedule) {
        const datesList = matchedSchedules.map(r => `• ${r.date}`).join('\n');
        await replyToLine(
          replyToken,
          `❌ ไม่พบรอบวันที่ "${inputDate}" สำหรับอีเวนต์นี้ในระบบ\n\n📅 วันที่จัดงานจริงในตารางคือ:\n${datesList}`
        );
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      const fullEventName = targetSchedule.eventName || 'ไม่ได้ระบุชื่อ';
      const slot = targetSchedule.slots.find(
        s => s.time.replace(/\s+/g, '') === inputTime
      );

      if ((slot?.status as string) === 'unavailable') {
        await replyToLine(
          replyToken,
          `⚠️ ขออภัยค่ะ! ไม่สามารถจองช่วงเวลานี้ได้\n\n🎤 Event: ${fullEventName}\n⏰ เวลา: ${inputTime}\n\n❌ ช่วงเวลานี้ถูกตั้งค่าเป็นปิดให้บริการ (Unavailable) ค่ะ`
        );
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      if (slot?.status === 'booked') {
        const existingBooking = allBookings.find(
          b =>
            b.date === targetSchedule!.date &&
            b.timeSlot.replace(/\s+/g, '') === inputTime &&
            b.status !== 'cancelled'
        );
        const existingUser = existingBooking?.customerName || 'แอดมิน (ตั้งค่ารอบเวลาเต็ม)';

        await replyToLine(
          replyToken,
          `⚠️ ขออภัยค่ะ! ไม่สามารถจองช่วงเวลานี้ได้\n\n🎤 Event: ${fullEventName}\n⏰ เวลา: ${inputTime}\n\n❌ คิวนี้ถูกตั้งสถานะเป็นเต็มแล้ว (ผู้จอง/สถานะ: ${existingUser})`
        );
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      // บันทึกการจองลง Supabase DB (อัปเดตสล็อตในตาราง schedules และเพิ่มลงตาราง bookings)
      const lineDisplayName = lineName !== 'ไม่ระบุ' ? lineName : await getLineUserProfile(userId);

      // หากแอดมินไม่ได้พิมพ์ระบุ 'ชำระเงิน' หรือ 'มัดจำ' มาในบล็อกข้อความ:
      const hasExplicitPayment = Boolean(paymentLine || depositLine);

      if (!hasExplicitPayment && userId) {
        await setAdminSession(userId, 'awaiting_payment_status', {
          date: targetSchedule.date,
          eventName: fullEventName,
          timeSlot: inputTime,
          customerName: customerName,
          customerPhone: rawPhone,
          lineDisplayName: lineDisplayName,
          cameraType: inputCamera || undefined,
          notes: inputNotes,
        });

        const askPaymentMsg = {
          type: 'text',
          text: `💳 การชำระเงินของคิว คุณ${customerName} (${inputTime} น.) มีการชำระเงินไหมคะ?\n(กรุณากดเลือกจากปุ่มด้านล่างได้เลยค่ะ 👇)`,
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: 'ยังไม่มัดจำ', text: 'ยังไม่มัดจำ' } },
              { type: 'action', action: { type: 'message', label: 'มัดจำแล้ว', text: 'มัดจำแล้ว' } },
              { type: 'action', action: { type: 'message', label: 'ชำระเต็มจำนวน', text: 'ชำระเต็มจำนวน' } },
            ]
          }
        };

        await replyToLine(replyToken, askPaymentMsg);
        return NextResponse.json({ message: 'OK' }, { status: 200 });
      }

      await createBooking({
        date: targetSchedule.date,
        eventName: fullEventName,
        timeSlot: inputTime,
        customerName: customerName,
        customerPhone: rawPhone,
        lineDisplayName: lineDisplayName,
        lineUserId: userId || undefined,
        cameraType: inputCamera || undefined,
        status: inputStatus,
        paymentStatus: inputPaymentStatus,
        depositAmount: inputDepositAmount,
        remainingAmount: inputRemainingAmount,
        notes: inputNotes,
      });

      const statusLabel = inputStatus === 'confirmed' ? '✅ ยืนยัน' : inputStatus === 'cancelled' ? '❌ ยกเลิก' : '⏳ รอยืนยัน';
      const remainingText = inputRemainingAmount > 0 ? `\n💵 ยอดต้องเก็บเพิ่ม: ${inputRemainingAmount.toLocaleString()} ฿` : '';
      const paymentLabel = inputPaymentStatus === 'paid'
        ? `ชำระเต็ม${inputDepositAmount > 0 ? ` (${inputDepositAmount.toLocaleString()} ฿)` : ''}`
        : inputPaymentStatus === 'deposit'
        ? `มัดจำแล้ว${inputDepositAmount > 0 ? ` (${inputDepositAmount.toLocaleString()} ฿)` : ''}${remainingText}`
        : 'ยังไม่ชำระ';
      const replyText = `✅ บันทึกการจองสำเร็จเรียบร้อย!\n\n🎤 Event: ${fullEventName}\n📅 วันที่: ${targetSchedule.date}\n⏰ เวลา: ${inputTime} น.${inputCamera ? `\n📷 กล้อง: ${inputCamera}` : ''}\n👤 ผู้จอง: K.${customerName}\n📞 เบอร์โทร: ${formattedPhone}\n💬 ชื่อไลน์: ${lineDisplayName}\n📋 สถานะ: ${statusLabel}\n💳 ชำระเงิน: ${paymentLabel}${inputNotes ? `\n📝 โน้ต: ${inputNotes}` : ''}\n\nลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️🙇🏻‍♀️`;

      await replyToLine(replyToken, {
        type: 'text',
        text: replyText,
        quickReply: ADMIN_MAIN_QUICK_REPLY,
      });
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // =========================================================================
    // ฟังก์ชันที่ 2.5: พิมพ์ขอแบบฟอร์มจองคิวแอดมิน ("จอง", "จองคิว", "แบบฟอร์ม", "วิธีพิมพ์")
    // =========================================================================
    else if (/^(จอง|จองคิว|วิธีจอง|ลงคิว|วิธีลงคิว|แบบฟอร์ม|ฟอร์ม|ขอแบบฟอร์ม|วิธีพิมพ์|form|help|คู่มือ)$/i.test(userMessage)) {
      const adminFormTemplate = `📋 แบบฟอร์มลงคิวสำหรับ Admin Bot\n(ก๊อปปี้ข้อความลูกค้า แล้วเพิ่ม ชำระเงิน และ มัดจำ ส่งหาบอทเพื่อบันทึกคิวได้เลยค่ะ ✨)\n\n#ชื่องาน\nวันที่ : 2026-08-20\nเวลา : 12:00-12:20\n📷 กล้อง : RICOH GR IIIx + Flash\nK.ชื่อลูกค้า 0812345678\nชื่อไลน์ : line_name\nชำระเงิน : มัดจำแล้ว\nมัดจำ : 500\nโน้ต : ลูกค้ารับกล้องหน้างาน\n\n📌 *คำอธิบาย:\n- ชำระเงิน: ยังไม่มัดจำ | มัดจำแล้ว | ชำระเต็มจำนวน\n- มัดจำ: จำนวนเงินมัดจำ (เช่น 500, 1000)\n- (สถานะคิวจะถูกตั้งเป็น "คอนเฟิร์ม" อัตโนมัติ)`;

      await replyToLine(replyToken, {
        type: 'text',
        text: adminFormTemplate,
        quickReply: ADMIN_MAIN_QUICK_REPLY,
      });
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // =========================================================================
    // คู่มือการใช้งานบอท (เมื่อพิมพ์ข้อความอื่นๆ)
    // =========================================================================
    else {
      const adminFormText = `🤖 คู่มือคำสั่งสำหรับ Ren เลขาจองคิว:\n\n1️⃣ คิวรออนุมัติ: พิมพ์ 'คิวรออนุมัติ' หรือกดปุ่มด้านล่าง 👇\n2️⃣ เช็กคิว: พิมพ์ 'เช็ก' หรือกดปุ่มด้านล่าง 👇\n3️⃣ ขอแบบฟอร์มลงคิว: พิมพ์ 'แบบฟอร์ม' หรือกดปุ่มด้านล่าง 👇\n\n📋 ตัวอย่างแบบฟอร์มสั่งจองคิว (ก๊อปไปส่งหาบอท):\n\n#ชื่องาน\nวันที่ : 2026-08-20\nเวลา : 12:00-12:20\n📷 กล้อง : RICOH GR IIIx + Flash\nK.ชื่อลูกค้า 0812345678\nชื่อไลน์ : line_name\nชำระเงิน : มัดจำแล้ว\nมัดจำ : 500`;

      await replyToLine(replyToken, {
        type: 'text',
        text: adminFormText,
        quickReply: ADMIN_MAIN_QUICK_REPLY,
      });
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }
  }

  return NextResponse.json({ message: 'OK' }, { status: 200 });
} catch (error: any) {
  console.error('❌ LINE Admin Webhook Error:', error.message || error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
}
