import json
import re
from datetime import datetime
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..services.utils import (
    verify_line_signature,
    format_phone_number,
    get_today_thailand_date_string,
    TIME_SLOTS,
)
from ..services.line_service import (
    reply_to_line,
    push_line_message,
    get_line_user_profile,
    build_summary_text,
    build_pending_queue_carousel,
    ADMIN_MAIN_QUICK_REPLY,
)
from ..services.schedule_service import get_all_schedule_records, DEFAULT_TIME_SLOTS
from ..services.camera_service import get_active_cameras
from ..services.booking_service import (
    get_all_bookings,
    create_booking,
    confirm_or_create_booking,
    cancel_pending_booking_if_exists,
)
from ..services.session_service import (
    get_admin_session,
    set_admin_session,
    clear_admin_session,
    register_admin_user_id,
    clear_line_user_session,
)
from ..models import AdminSession

router = APIRouter()


async def start_admin_booking_confirmation(
    reply_token: str,
    user_id: str | None,
    booking,
    db: Session,
):
    is_deposit = booking.payment_status == "deposit" or "มัดจำ" in (booking.notes or "")
    draft = {
        "bookingId": booking.id,
        "date": booking.date,
        "eventName": booking.event_name or "ไม่ได้ระบุชื่อ",
        "timeSlot": booking.time_slot or "ไม่ได้ระบุเวลา",
        "customerName": booking.customer_name or "ผู้จอง",
        "customerPhone": booking.customer_phone or "-",
        "lineDisplayName": booking.line_display_name or "-",
        "customerLineUserId": booking.line_user_id,
        "cameraType": booking.camera_type,
        "paymentStatus": "deposit" if is_deposit else "paid",
        "depositAmount": booking.deposit_amount or 0,
        "remainingAmount": booking.remaining_amount or 0,
    }

    if is_deposit:
        if user_id:
            set_admin_session(db, user_id, "awaiting_deposit_amount", draft)
        ask_deposit_msg = {
            "type": "text",
            "text": (
                f"📌 รายการจองคิว #{booking.id} (ลูกค้าแจ้ง: 🟡 มัดจำ)\n"
                f"🎤 Event: {draft['eventName']}\n"
                f"📅 วันที่: {draft['date']}\n"
                f"⏰ เวลา: {draft['timeSlot']} น.\n"
                f"📷 กล้อง: {draft['cameraType'] or '-'}\n"
                f"👤 ผู้จอง: K.{draft['customerName']} ({draft['customerPhone']})\n"
                f"💬 ชื่อไลน์: {draft['lineDisplayName']}\n"
                f"━━━━━━━━━━━━━━\n"
                f"🟡 มัดจำมากี่บาทคะ?\n"
                f"(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)"
            ),
            "quickReply": {
                "items": [
                    {"type": "action", "action": {"type": "message", "label": "💵 100 บาท", "text": "100"}},
                ]
            },
        }
        await reply_to_line(reply_token, ask_deposit_msg)
    else:
        if user_id:
            set_admin_session(db, user_id, "awaiting_final_confirmation", draft)
        summary_text = build_summary_text(draft)
        confirm_msg = {
            "type": "text",
            "text": f"📌 รายการจองคิว #{booking.id} (ชำระเต็มจำนวน)\n\n{summary_text}\n\nกรุณากดปุ่มเพื่อยืนยันหรือยกเลิกการจองนะคะ 👇",
            "quickReply": {
                "items": [
                    {"type": "action", "action": {"type": "message", "label": "✅ ยืนยันการจอง", "text": "ยืนยันการจอง"}},
                    {"type": "action", "action": {"type": "message", "label": "🔄 ทำรายการใหม่", "text": "ทำรายการใหม่"}},
                    {"type": "action", "action": {"type": "message", "label": "❌ ยกเลิกการจอง", "text": "ยกเลิกการจอง"}},
                ]
            },
        }
        await reply_to_line(reply_token, confirm_msg)


@router.get("/api/line-admin-webhook")
@router.get("/health")
async def health_check():
    has_admin_secret = bool(settings.LINE_ADMIN_CHANNEL_SECRET)
    has_admin_token = bool(settings.LINE_ADMIN_CHANNEL_ACCESS_TOKEN)
    has_customer_secret = bool(settings.LINE_CHANNEL_SECRET)
    has_customer_token = bool(settings.LINE_CHANNEL_ACCESS_TOKEN)
    has_database_url = bool(settings.DATABASE_URL)

    db_status = "untested"
    admin_sessions_table = "unknown"

    if has_database_url:
        try:
            from ..database import SessionLocal
            if SessionLocal is not None:
                db_session = SessionLocal()
                try:
                    db_session.query(AdminSession).first()
                    db_status = "connected"
                    admin_sessions_table = "ready"
                finally:
                    db_session.close()
        except Exception as err:
            db_status = "error"
            admin_sessions_table = f"error: {err}"
    else:
        db_status = "not_configured"
        admin_sessions_table = "DATABASE_URL is not set"

    warnings = []
    if not has_admin_token and not has_customer_token:
        warnings.append("❌ LINE_ADMIN_CHANNEL_ACCESS_TOKEN is missing. Bot cannot reply to messages.")
    if not has_admin_secret and not has_customer_secret:
        warnings.append("❌ LINE_ADMIN_CHANNEL_SECRET is missing. Webhook signature verification will fail.")
    if db_status != "connected":
        warnings.append(f"❌ Database connection issue: {admin_sessions_table}")

    return {
        "status": "online",
        "service": "Admin LINE Bot",
        "timestamp": datetime.now().isoformat(),
        "envCheck": {
            "LINE_ADMIN_CHANNEL_ACCESS_TOKEN": "✅ Configured" if has_admin_token else "❌ Missing",
            "LINE_ADMIN_CHANNEL_SECRET": "✅ Configured" if has_admin_secret else "❌ Missing",
            "DATABASE_URL": "✅ Configured" if has_database_url else "❌ Missing",
        },
        "database": {
            "status": db_status,
            "adminSessionsTable": admin_sessions_table,
        },
        "diagnostics": {
            "isHealthy": len(warnings) == 0,
            "warnings": warnings if warnings else ["✅ All configurations and database connections are ready!"],
        },
    }


@router.post("/api/line-admin-webhook")
@router.post("/webhook")
async def handle_admin_webhook(
    request: Request,
    x_line_signature: str | None = Header(default=None, alias="x-line-signature"),
    db: Session = Depends(get_db),
):
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    if not body_text.strip():
        return {"message": "Empty body"}

    channel_secret = settings.LINE_ADMIN_CHANNEL_SECRET or settings.LINE_CHANNEL_SECRET
    if channel_secret and not verify_line_signature(body_bytes, x_line_signature, channel_secret):
        print("❌ Signature Verification Failed for Admin LINE Webhook")
        raise HTTPException(status_code=401, detail="Unauthorized signature")

    try:
        body = json.loads(body_text)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    events = body.get("events", [])
    if not events:
        return {"message": "Verify Success"}

    for event in events:
        reply_token = event.get("replyToken")
        source = event.get("source", {})
        user_id = source.get("userId")
        event_type = event.get("type")

        if not reply_token or reply_token in ["00000000000000000000000000000000", "ffffffffffffffffffffffffffffffff"]:
            continue

        if event_type == "follow":
            if user_id:
                register_admin_user_id(db, user_id)
            welcome_msg = (
                "👋 สวัสดีค่ะ! Ren เลขาจองคิวยินดีต้อนรับค่ะ ✨\n\n"
                "ระบบได้ลงทะเบียนบัญชี LINE ของคุณเป็นแอดมินเรียบร้อยแล้วค่ะ\n\n"
                "คุณสามารถกดปุ่มเมนูด้านล่าง หรือพิมพ์ 'เช็ก' / 'คิวรออนุมัติ' เพื่อจัดการคิวได้เลยนะคะ 👇"
            )
            await reply_to_line(reply_token, {"type": "text", "text": welcome_msg})
            continue

        if event_type != "message" or event.get("message", {}).get("type") != "text":
            continue

        user_message = event.get("message", {}).get("text", "").strip()
        if not user_message:
            continue

        if user_id:
            register_admin_user_id(db, user_id)

        # =========================================================================
        # STEP 0: Check Admin Interactive Session
        # =========================================================================
        if user_id:
            admin_session = get_admin_session(db, user_id)
            if admin_session:
                draft = admin_session.get("draftBooking") or {}
                if not draft or not draft.get("eventName"):
                    clear_admin_session(db, user_id)
                else:
                    clean_text = user_message.strip().lower()

                    if re.match(r'^(ยกเลิก|cancel|exit)$', clean_text, re.IGNORECASE):
                        clear_admin_session(db, user_id)
                        await reply_to_line(reply_token, "❌ ยกเลิกการทำรายการเรียบร้อยแล้วค่ะ")
                        return {"message": "OK"}

                    current_step = admin_session.get("step")

                    # Step 1: Awaiting Payment Status
                    if current_step == "awaiting_payment_status":
                        if any(x in clean_text for x in ["ยังไม่มัดจำ", "ยังไม่ชำระ", "unpaid"]):
                            draft["paymentStatus"] = "unpaid"
                            draft["depositAmount"] = 0
                            draft["remainingAmount"] = 0
                            set_admin_session(db, user_id, "awaiting_notes", draft)
                            ask_notes_msg = {
                                "type": "text",
                                "text": "📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม \"ไม่มีโน้ต\" ด้านล่างนะคะ 👇)",
                                "quickReply": {
                                    "items": [
                                        {"type": "action", "action": {"type": "message", "label": "❌ ไม่มีโน้ต", "text": "ไม่มีโน้ต"}},
                                    ]
                                },
                            }
                            await reply_to_line(reply_token, ask_notes_msg)
                            return {"message": "OK"}

                        if any(x in clean_text for x in ["ชำระเต็ม", "เต็มจำนวน", "จ่ายแล้ว", "paid"]):
                            draft["paymentStatus"] = "paid"
                            draft["depositAmount"] = 0
                            draft["remainingAmount"] = 0
                            set_admin_session(db, user_id, "awaiting_notes", draft)
                            ask_notes_msg = {
                                "type": "text",
                                "text": "📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม \"ไม่มีโน้ต\" ด้านล่างนะคะ 👇)",
                                "quickReply": {
                                    "items": [
                                        {"type": "action", "action": {"type": "message", "label": "❌ ไม่มีโน้ต", "text": "ไม่มีโน้ต"}},
                                    ]
                                },
                            }
                            await reply_to_line(reply_token, ask_notes_msg)
                            return {"message": "OK"}

                        if any(x in clean_text for x in ["มัดจำแล้ว", "มัดจำ", "deposit"]):
                            draft["paymentStatus"] = "deposit"
                            set_admin_session(db, user_id, "awaiting_deposit_amount", draft)
                            ask_deposit_msg = {
                                "type": "text",
                                "text": "🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)",
                                "quickReply": {
                                    "items": [
                                        {"type": "action", "action": {"type": "message", "label": "💵 100 บาท", "text": "100"}},
                                    ]
                                },
                            }
                            await reply_to_line(reply_token, ask_deposit_msg)
                            return {"message": "OK"}

                    # Step 2: Awaiting Deposit Amount
                    if current_step == "awaiting_deposit_amount":
                        match_amt = re.search(r'\d+', user_message)
                        deposit_amt = int(match_amt.group(0)) if match_amt else 0
                        draft["depositAmount"] = deposit_amt
                        set_admin_session(db, user_id, "awaiting_remaining_amount", draft)

                        ask_remaining_msg = {
                            "type": "text",
                            "text": "💵 ต้องเก็บเงินเพิ่มอีกกี่บาทคะ?\n(กรุณากดเลือกจำนวนเงิน หรือพิมพ์ตัวเลข เช่น 119 ทางแชทได้เลยค่ะ 👇)",
                            "quickReply": {
                                "items": [
                                    {"type": "action", "action": {"type": "message", "label": "💵 59 บาท", "text": "59"}},
                                    {"type": "action", "action": {"type": "message", "label": "💵 89 บาท", "text": "89"}},
                                    {"type": "action", "action": {"type": "message", "label": "💵 99 บาท", "text": "99"}},
                                    {"type": "action", "action": {"type": "message", "label": "💵 119 บาท", "text": "119"}},
                                ]
                            },
                        }
                        await reply_to_line(reply_token, ask_remaining_msg)
                        return {"message": "OK"}

                    # Step 3: Awaiting Remaining Amount
                    if current_step == "awaiting_remaining_amount":
                        match_amt = re.search(r'\d+', user_message)
                        remaining_amt = int(match_amt.group(0)) if match_amt else 0
                        draft["remainingAmount"] = remaining_amt
                        set_admin_session(db, user_id, "awaiting_notes", draft)

                        ask_notes_msg = {
                            "type": "text",
                            "text": "📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม \"ไม่มีโน้ต\" ด้านล่างนะคะ 👇)",
                            "quickReply": {
                                "items": [
                                    {"type": "action", "action": {"type": "message", "label": "❌ ไม่มีโน้ต", "text": "ไม่มีโน้ต"}},
                                ]
                            },
                        }
                        await reply_to_line(reply_token, ask_notes_msg)
                        return {"message": "OK"}

                    # Step 3.5: Awaiting Notes
                    if current_step == "awaiting_notes":
                        clean_note = user_message.strip()
                        if re.match(r'^(ไม่มีโน้ต|ไม่มี|ไม่ระบุ|-|no|none)$', clean_note, re.IGNORECASE):
                            draft["notes"] = ""
                        else:
                            draft["notes"] = clean_note

                        set_admin_session(db, user_id, "awaiting_final_confirmation", draft)
                        summary_text = build_summary_text(draft)
                        confirm_msg = {
                            "type": "text",
                            "text": f"{summary_text}\n\nกรุณากดปุ่มเพื่อยืนยัน ทำรายการใหม่ หรือยกเลิกการจองนะคะ 👇",
                            "quickReply": {
                                "items": [
                                    {"type": "action", "action": {"type": "message", "label": "✅ ยืนยันการจอง", "text": "ยืนยันการจอง"}},
                                    {"type": "action", "action": {"type": "message", "label": "🔄 ทำรายการใหม่", "text": "ทำรายการใหม่"}},
                                    {"type": "action", "action": {"type": "message", "label": "❌ ยกเลิกการจอง", "text": "ยกเลิกการจอง"}},
                                ]
                            },
                        }
                        await reply_to_line(reply_token, confirm_msg)
                        return {"message": "OK"}

                    # Step 4: Final Confirmation
                    if current_step == "awaiting_final_confirmation":
                        is_restart = any(x in clean_text for x in ["ทำรายการใหม่", "เริ่มใหม่", "แก้ไข", "restart"])
                        is_confirm = any(x in clean_text for x in ["ยืนยัน", "อนุมัติ", "ตกลง", "confirm", "ok", "yes"])
                        is_cancel = any(x in clean_text for x in ["ยกเลิก", "ไม่ยืนยัน", "cancel", "reject", "no"])

                        if is_restart:
                            is_dep = draft.get("paymentStatus") == "deposit"
                            draft["depositAmount"] = 0
                            draft["remainingAmount"] = 0
                            draft["notes"] = ""

                            if is_dep:
                                set_admin_session(db, user_id, "awaiting_deposit_amount", draft)
                                ask_msg = {
                                    "type": "text",
                                    "text": f"🔄 ย้อนกลับไปขั้นตอนแรกสำหรับคิว #{draft.get('bookingId', '')}\n\n🟡 มัดจำมากี่บาทคะ?\n(กรุณากดเลือกจำนวนมัดจำ หรือพิมพ์ตัวเลข เช่น 100 ทางแชทได้เลยค่ะ 👇)",
                                    "quickReply": {
                                        "items": [
                                            {"type": "action", "action": {"type": "message", "label": "💵 100 บาท", "text": "100"}},
                                        ]
                                    },
                                }
                                await reply_to_line(reply_token, ask_msg)
                            else:
                                set_admin_session(db, user_id, "awaiting_notes", draft)
                                ask_msg = {
                                    "type": "text",
                                    "text": "🔄 ย้อนกลับไปขั้นตอนโน้ต\n\n📝 จะโน้ตอะไรเพิ่มเติมไหมคะ?\n(หากมีสามารถพิมพ์ข้อความส่งได้เลย หรือกดปุ่ม \"ไม่มีโน้ต\" ด้านล่างนะคะ 👇)",
                                    "quickReply": {
                                        "items": [
                                            {"type": "action", "action": {"type": "message", "label": "❌ ไม่มีโน้ต", "text": "ไม่มีโน้ต"}},
                                        ]
                                    },
                                }
                                await reply_to_line(reply_token, ask_msg)
                            return {"message": "OK"}

                        elif is_confirm:
                            try:
                                pay_status = draft.get("paymentStatus") or "unpaid"
                                dep_amt = draft.get("depositAmount") or 0
                                rem_amt = draft.get("remainingAmount") or 0

                                payment_note = (
                                    "ชำระเต็มจำนวน"
                                    if pay_status == "paid"
                                    else f"มัดจำ {dep_amt} บาท (เก็บเพิ่ม {rem_amt} บาท)"
                                )
                                final_notes = f"{payment_note} | โน้ต: {draft['notes']}" if draft.get("notes") else payment_note

                                confirm_or_create_booking(db, {
                                    "bookingId": draft.get("bookingId"),
                                    "date": draft["date"],
                                    "eventName": draft["eventName"],
                                    "timeSlot": draft["timeSlot"],
                                    "customerName": draft["customerName"],
                                    "customerPhone": draft["customerPhone"],
                                    "lineDisplayName": draft.get("lineDisplayName"),
                                    "lineUserId": draft.get("customerLineUserId"),
                                    "cameraType": draft.get("cameraType"),
                                    "status": "confirmed",
                                    "paymentStatus": pay_status,
                                    "depositAmount": dep_amt,
                                    "remainingAmount": rem_amt,
                                    "notes": final_notes,
                                })

                                clear_admin_session(db, user_id)

                                cust_line_id = draft.get("customerLineUserId")
                                if cust_line_id:
                                    clear_line_user_session(db, cust_line_id)
                                    pay_label = "ชำระเต็มจำนวน" if pay_status == "paid" else f"มัดจำแล้ว ({dep_amt:,} ฿)"
                                    cust_msg = (
                                        f"#{draft['eventName']}\n"
                                        f"วันที่ : {draft['date']}\n"
                                        f"เวลา : {draft['timeSlot']} น.\n"
                                    )
                                    if draft.get("cameraType"):
                                        cust_msg += f"📷 กล้อง : {draft['cameraType']}\n"
                                    cust_msg += (
                                        f"K.{draft['customerName']} {draft['customerPhone']}\n"
                                        f"ชื่อไลน์ : {draft.get('lineDisplayName', '-')}\n"
                                        f"การชำระเงิน : {pay_label}\n"
                                    )
                                    if draft.get("notes"):
                                        cust_msg += f"โน้ต : {draft['notes']}\n"
                                    cust_msg += "ลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️🙇🏻‍♀️"
                                    await push_line_message(cust_line_id, cust_msg, token_type="customer")

                                await reply_to_line(reply_token, "✅ ยืนยันการจองเรียบร้อยแล้ว (อัปเดตสถานะเป็น confirmed) และส่งข้อความแจ้งลงคิวให้ลูกค้าเรียบร้อยแล้วค่ะ!")
                            except Exception as err:
                                print(f"⚠️ LINE Admin Booking Error: {err}")
                                clear_admin_session(db, user_id)
                                await reply_to_line(reply_token, f"⚠️ ไม่สามารถบันทึกการจองได้ค่ะ:\n{err}")
                            return {"message": "OK"}

                        elif is_cancel:
                            cancel_pending_booking_if_exists(db, {
                                "bookingId": draft.get("bookingId"),
                                "date": draft["date"],
                                "eventName": draft["eventName"],
                                "timeSlot": draft["timeSlot"],
                                "cameraType": draft.get("cameraType"),
                            })
                            clear_admin_session(db, user_id)

                            cust_line_id = draft.get("customerLineUserId")
                            if cust_line_id:
                                clear_line_user_session(db, cust_line_id)
                                cancel_text = "⚠️ ขออภัยค่ะ การจองไม่สำเร็จ โปรดทำการจองกับแอดมินอีกครั้งนะคะ 🙇🏻‍♀️"
                                await push_line_message(cust_line_id, cancel_text, token_type="customer")

                            await reply_to_line(reply_token, "❌ ยกเลิกการทำรายการเรียบร้อยแล้ว และได้ส่งข้อความแจ้งลูกค้าแล้วค่ะ")
                            return {"message": "OK"}

                        else:
                            summary_text = build_summary_text(draft)
                            confirm_msg = {
                                "type": "text",
                                "text": f"📌 ท่านอยู่ระหว่างขั้นตอนยืนยันการจองคิวค่ะ\n\n{summary_text}\n\nกรุณากดปุ่มเพื่อยืนยัน หรือทำรายการใหม่ หรือยกเลิกการจองนะคะ 👇",
                                "quickReply": {
                                    "items": [
                                        {"type": "action", "action": {"type": "message", "label": "✅ ยืนยันการจอง", "text": "ยืนยันการจอง"}},
                                        {"type": "action", "action": {"type": "message", "label": "🔄 ทำรายการใหม่", "text": "ทำรายการใหม่"}},
                                        {"type": "action", "action": {"type": "message", "label": "❌ ยกเลิกการจอง", "text": "ยกเลิกการจอง"}},
                                    ]
                                },
                            }
                            await reply_to_line(reply_token, confirm_msg)
                            return {"message": "OK"}

        # =========================================================================
        # Approve Queue by ID: [เลือกอนุมัติคิว] #9 or อนุมัติคิว 9
        # =========================================================================
        if user_message.startswith("[เลือกอนุมัติคิว]") or re.match(r'^อนุมัติคิว\s*#?(\d+)', user_message, re.IGNORECASE):
            match_id = re.search(r'\d+', user_message)
            target_id = int(match_id.group(0)) if match_id else 0
            all_bookings = get_all_bookings(db)
            target_booking = next((b for b in all_bookings if b.id == target_id and b.status == "pending"), None)

            if not target_booking:
                await reply_to_line(reply_token, f"⚠️ ไม่พบข้อมูลคิวรออนุมัติ ID #{target_id} ในระบบแล้วค่ะ (อาจถูกยืนยันหรือยกเลิกไปแล้ว)")
                return {"message": "OK"}

            await start_admin_booking_confirmation(reply_token, user_id, target_booking, db)
            return {"message": "OK"}

        # =========================================================================
        # Check Pending Queues ("ยืนยันคิว", "คิวรออนุมัติ", "คิวค้าง")
        # =========================================================================
        if re.match(r'^(ยืนยันคิว|ยืนยันคิวลูกค้า|อนุมัติคิว|คิวรออนุมัติ|คิวค้าง)', user_message, re.IGNORECASE):
            all_bookings = get_all_bookings(db)
            pending_bookings = [b for b in all_bookings if b.status == "pending"]

            if not pending_bookings:
                await reply_to_line(reply_token, "📭 ปัจจุบันไม่มีรายการจองคิวลูกค้าที่รอการยืนยันค่ะ ✨")
                return {"message": "OK"}

            if len(pending_bookings) == 1:
                await start_admin_booking_confirmation(reply_token, user_id, pending_bookings[0], db)
                return {"message": "OK"}

            carousel = build_pending_queue_carousel(pending_bookings)
            await reply_to_line(reply_token, [
                {"type": "text", "text": f"📌 มีรายการจองคิวลูกค้าที่รอการอนุมัติทั้งหมด {len(pending_bookings)} รายการค่ะ กรุณากดเลือกลิสต์ที่ต้องการทำรายการนะคะ 👇"},
                carousel,
            ])
            return {"message": "OK"}

        # =========================================================================
        # Function 1: Check Booking Status ("เช็ก", "check", or [เช็กกล้อง])
        # =========================================================================
        all_schedules = get_all_schedule_records(db)
        all_bookings = get_all_bookings(db)

        is_check_camera_btn = user_message.startswith("[เช็กกล้อง]")
        is_check_cmd = bool(re.match(r'^(เช็ก|check)', user_message, re.IGNORECASE))

        if is_check_camera_btn or is_check_cmd:
            selected_camera_query = ""
            event_query = ""
            date_query = ""

            if is_check_camera_btn:
                match = re.match(r'^\[เช็กกล้อง\]\s*(.*?)\s*\|\s*งาน:\s*(.*?)\s*\((.*?)\)$', user_message)
                if match:
                    selected_camera_query = match.group(1).strip()
                    event_query = match.group(2).strip().lower()
                    date_query = match.group(3).strip().lower()
                else:
                    parts = user_message.replace("[เช็กกล้อง]", "").split("|")
                    selected_camera_query = parts[0].strip()
            else:
                clean_q = re.sub(r'^(เช็ก|check)', '', user_message, flags=re.IGNORECASE).strip()
                if not clean_q or re.match(r'^(ทั้งหมด|all)$', clean_q, re.IGNORECASE):
                    today_str = get_today_thailand_date_string()
                    avail = [s for s in all_schedules if s.status.lower() != "unavailable" and (s.date or "").strip() >= today_str]

                    if not avail:
                        await reply_to_line(reply_token, "📭 ปัจจุบันยังไม่มีข้อมูลอีเวนต์ในตารางเวลาที่ยังไม่หมดเวลานะคะ")
                        return {"message": "OK"}

                    flex_buttons = [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "backgroundColor": "#FFB6C1",
                            "cornerRadius": "md",
                            "margin": "sm",
                            "paddingAll": "10px",
                            "action": {
                                "type": "message",
                                "label": f"{s.date.split('-')[2] if '-' in s.date else s.date}: {s.event_name or 'อีเวนต์'}"[:20],
                                "text": f"เช็ก {s.event_name or 'อีเวนต์'} / {s.date.split('-')[2] if '-' in s.date else s.date}",
                            },
                            "contents": [
                                {
                                    "type": "text",
                                    "text": f"{s.date.split('-')[2] if '-' in s.date else s.date}: {s.event_name or 'ไม่ได้ระบุชื่อ'}",
                                    "color": "#111111",
                                    "align": "center",
                                    "weight": "bold",
                                    "size": "sm",
                                }
                            ],
                        }
                        for s in avail[:100]
                    ]

                    flex_msg = {
                        "type": "flex",
                        "altText": "📅 รายการอีเวนต์ทั้งหมดในระบบ",
                        "contents": {
                            "type": "bubble",
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": "📋 รายการอีเวนต์ทั้งหมด", "weight": "bold", "size": "md", "color": "#111111"},
                                    {"type": "text", "text": "นี่คือตารางงานทั้งหมดที่เปิดให้จองในปัจจุบันค่ะ กดเลือกรายการที่ต้องการเช็กคิวว่างได้เลย 👇", "wrap": True, "size": "sm", "color": "#555555", "margin": "xs"},
                                    {"type": "separator", "margin": "md"},
                                    {"type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": flex_buttons},
                                ],
                            },
                        },
                    }
                    await reply_to_line(reply_token, flex_msg)
                    return {"message": "OK"}

                parts = clean_q.split("/")
                event_query = parts[0].strip().lower()
                date_query = parts[1].strip().lower() if len(parts) > 1 else ""
                selected_camera_query = parts[2].strip() if len(parts) > 2 else ""

            today_str = get_today_thailand_date_string()
            matched_schedules = [
                s for s in all_schedules
                if s.status.lower() != "unavailable" and
                (date_query or (s.date or "").strip() >= today_str) and
                ((s.event_name or "").lower() in event_query or event_query in (s.event_name or "").lower())
            ]

            if not matched_schedules:
                await reply_to_line(reply_token, f'❌ ไม่พบข้อมูล Event ที่ค้นหา: "{event_query}"')
                return {"message": "OK"}

            target_schedule = None
            if date_query:
                target_schedule = next((s for s in matched_schedules if (s.date or "").endswith(date_query) or s.date == date_query), None)
                if not target_schedule:
                    dates_list = "\n".join([f"• {m.date}" for m in matched_schedules])
                    await reply_to_line(reply_token, f'❌ พบอีเวนต์ "{matched_schedules[0].event_name}" แต่ไม่มีรอบวันที่ตรงกับ "{date_query}"\n\n📅 รอบวันที่ทั้งหมดที่มีในระบบ:\n{dates_list}')
                    return {"message": "OK"}
            else:
                if len(matched_schedules) == 1:
                    target_schedule = matched_schedules[0]
                else:
                    multiday_buttons = [
                        {
                            "type": "box",
                            "layout": "vertical",
                            "backgroundColor": "#FFB6C1",
                            "cornerRadius": "md",
                            "margin": "sm",
                            "paddingAll": "10px",
                            "action": {
                                "type": "message",
                                "label": f"📅 วันที่ {m.date.split('-')[2] if '-' in m.date else m.date}",
                                "text": f"เช็ก {m.event_name} / {m.date.split('-')[2] if '-' in m.date else m.date}",
                            },
                            "contents": [
                                {
                                    "type": "text",
                                    "text": f"📅 วันที่ {m.date.split('-')[2] if '-' in m.date else m.date}",
                                    "color": "#111111",
                                    "align": "center",
                                    "weight": "bold",
                                    "size": "md",
                                }
                            ],
                        }
                        for m in matched_schedules
                    ]

                    flex_msg = {
                        "type": "flex",
                        "altText": "📅 เลือกวันที่ต้องการเช็กคิว",
                        "contents": {
                            "type": "bubble",
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {"type": "text", "text": "📅 ตรวจพบอีเวนต์จัดหลายวัน", "weight": "bold", "size": "md", "color": "#111111"},
                                    {"type": "text", "text": f'อีเวนต์ "{matched_schedules[0].event_name}" มีรอบแสดงหลายวันในตารางค่ะ', "wrap": True, "size": "sm", "color": "#555555", "margin": "xs"},
                                    {"type": "separator", "margin": "md"},
                                    {"type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": multiday_buttons},
                                ],
                            },
                        },
                    }
                    await reply_to_line(reply_token, flex_msg)
                    return {"message": "OK"}

            full_event_name = target_schedule.event_name or "ไม่ได้ระบุชื่อ"
            target_date_str = target_schedule.date
            slots = target_schedule.slots or [{"time": t, "status": "available"} for t in DEFAULT_TIME_SLOTS]
            active_cameras = get_active_cameras(db)

            # Prompt to select camera if not specified
            if not selected_camera_query:
                cam_buttons = [
                    {
                        "type": "box",
                        "layout": "vertical",
                        "backgroundColor": "#FFB6C1",
                        "cornerRadius": "md",
                        "margin": "sm",
                        "paddingAll": "10px",
                        "action": {
                            "type": "message",
                            "label": f"📷 {cam.name}"[:20],
                            "text": f"[เช็กกล้อง] {cam.name} | งาน: {full_event_name} ({target_date_str})",
                        },
                        "contents": [
                            {"type": "text", "text": f"📷 {cam.name}", "color": "#111111", "align": "center", "weight": "bold", "size": "sm"}
                        ],
                    }
                    for cam in active_cameras
                ]

                cam_buttons.append({
                    "type": "box",
                    "layout": "vertical",
                    "backgroundColor": "#E8D8F8",
                    "cornerRadius": "md",
                    "margin": "sm",
                    "paddingAll": "10px",
                    "action": {
                        "type": "message",
                        "label": "📋 เช็กทุกกล้องพร้อมกัน",
                        "text": f"[เช็กกล้อง] ทั้งหมด | งาน: {full_event_name} ({target_date_str})",
                    },
                    "contents": [
                        {"type": "text", "text": "📋 เช็กทุกกล้องพร้อมกัน", "color": "#111111", "align": "center", "weight": "bold", "size": "sm"}
                    ],
                })

                flex_cam_msg = {
                    "type": "flex",
                    "altText": f"📸 กรุณาเลือกกล้องสำหรับงาน {full_event_name}",
                    "contents": {
                        "type": "bubble",
                        "body": {
                            "type": "box",
                            "layout": "vertical",
                            "contents": [
                                {"type": "text", "text": "📸 เลือกรุ่นกล้องที่ต้องการเช็กคิว", "weight": "bold", "size": "md", "color": "#111111"},
                                {"type": "text", "text": f"งาน: {full_event_name} ({target_date_str})", "wrap": True, "size": "sm", "color": "#555555", "margin": "xs"},
                                {"type": "separator", "margin": "md"},
                                {"type": "box", "layout": "vertical", "margin": "md", "spacing": "sm", "contents": cam_buttons},
                            ],
                        },
                    },
                }
                await reply_to_line(reply_token, flex_cam_msg)
                return {"message": "OK"}

            # Build queue report for camera(s)
            matched_bookings = [
                b for b in all_bookings
                if (b.date or "").strip() == target_date_str.strip() and
                ((b.event_name or "").strip() == full_event_name.strip() or not b.event_name) and
                b.status != "cancelled"
            ]

            is_show_all = selected_camera_query.lower() in ["ทั้งหมด", "all"]
            if is_show_all:
                active_names = [c.name.strip() for c in active_cameras]
                extra_names = set()
                for b in matched_bookings:
                    if b.camera_type and b.camera_type.strip():
                        cam = b.camera_type.strip()
                        if not any(ac.lower() == cam.lower() for ac in active_names):
                            extra_names.add(cam)
                target_cameras = active_names + list(extra_names)
                if not target_cameras:
                    target_cameras = ["RICOH GR IIIx + Flash"]
            else:
                matched_cam = next((c for c in active_cameras if c.name.lower() in selected_camera_query.lower() or selected_camera_query.lower() in c.name.lower()), None)
                target_cameras = [matched_cam.name if matched_cam else selected_camera_query]

            camera_reports = []
            for i, cam_name in enumerate(target_cameras):
                is_first_cam = i == 0
                cam_bookings = [
                    b for b in matched_bookings
                    if not (b.camera_type or "").strip() and is_first_cam or
                    ((b.camera_type or "").strip() and (b.camera_type.strip().lower() in cam_name.lower() or cam_name.lower() in b.camera_type.strip().lower()))
                ]

                booked_map = {re.sub(r'\s+', '', b.time_slot or ''): b for b in cam_bookings if b.time_slot}
                avail_list = ""
                booked_list = ""

                for slot_item in slots:
                    clean_s = re.sub(r'\s+', '', slot_item.get("time", ""))
                    if slot_item.get("status") == "unavailable":
                        continue

                    b_info = booked_map.get(clean_s)
                    is_locked = False
                    cam_statuses = slot_item.get("cameraStatuses")
                    if cam_statuses:
                        for k, v in cam_statuses.items():
                            if k.lower() in cam_name.lower() or cam_name.lower() in k.lower():
                                is_locked = (v == "booked")
                                break
                    elif slot_item.get("status") == "booked":
                        is_locked = True

                    if b_info:
                        c_name = b_info.customer_name or "ไม่ระบุชื่อ"
                        phone = format_phone_number(b_info.customer_phone or "")
                        line_n = b_info.line_display_name or "ไม่ระบุชื่อไลน์"
                        dep = b_info.deposit_amount or 0
                        rem = b_info.remaining_amount or 0
                        rem_lbl = f"\n   💵 ยอดต้องเก็บเพิ่ม: {rem:,} ฿" if rem > 0 else ""
                        if b_info.payment_status == "paid":
                            p_lbl = f"ชำระเต็มแล้ว{f' ({dep:,} ฿)' if dep > 0 else ''}"
                        elif b_info.payment_status == "deposit":
                            p_lbl = f"มัดจำแล้ว{f' ({dep:,} ฿)' if dep > 0 else ''}{rem_lbl}"
                        else:
                            p_lbl = "ยังไม่มัดจำ"
                        s_lbl = "✅ ยืนยันคิวแล้ว" if b_info.status == "confirmed" else "⏳ รอยืนยันคิว"
                        note_lbl = f"\n   📝 โน้ต: {b_info.notes}" if b_info.notes else ""

                        booked_list += (
                            f"⏰ {slot_item.get('time')}\n"
                            f"   👤 ผู้จอง: K.{c_name}\n"
                            f"   💬 ชื่อไลน์: {line_n}\n"
                            f"   📞 เบอร์: {phone}\n"
                            f"   💳 การชำระเงิน: {p_lbl}\n"
                            f"   📋 สถานะคิว: {s_lbl}{note_lbl}\n"
                            f"---------------------\n"
                        )
                    elif is_locked:
                        booked_list += f"⏰ {slot_item.get('time')}\n   🔒 สถานะ: แอดมินล็อกเป็นคิวเต็ม ({cam_name})\n---------------------\n"
                    else:
                        avail_list += f"  ✅ {slot_item.get('time')}\n"

                report = f"📷 กล้อง: {cam_name}\n━━━━━━━━━━━━━━\n" if is_show_all else ""
                report += f"🟢 เวลาที่ยังว่างอยู่:\n{avail_list}" if avail_list else "🔴 รอบเวลาเต็มทุกรอบแล้วค่ะ\n"
                if booked_list:
                    report += f"\n🔴 เวลาที่มีคนจองแล้ว:\n{booked_list}"
                camera_reports.append(report.strip())

            sub_hdr = f"📷 กล้อง: {target_cameras[0]}\n" if not is_show_all else ""
            hdr = f"📊 รายงานสถานะคิวของ: {full_event_name}\n📅 วันที่จัดงาน: {target_date_str}\n{sub_hdr}=====================\n\n"
            full_rep = hdr + "\n\n=====================\n\n".join(camera_reports)

            await reply_to_line(reply_token, full_rep.strip())
            return {"message": "OK"}

        # =========================================================================
        # Function 2: Text Block Booking Form (contains "วันที่" and "เวลา")
        # =========================================================================
        elif "วันที่" in user_message and "เวลา" in user_message:
            lines = user_message.split("\n")
            input_event = lines[0].replace("#", "").split("3rd")[0].split("1st")[0].split("2nd")[0].strip().lower()

            input_date = ""
            date_line = next((l for l in lines if "วันที่" in l), None)
            if date_line:
                pts = date_line.split(":") if ":" in date_line else date_line.split("：")
                if len(pts) > 1:
                    input_date = pts[1].strip().lower()

            input_time = ""
            time_match = re.search(r'\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}', user_message)
            if time_match:
                input_time = time_match.group(0).replace(".", ":").replace(" ", "")

            input_camera = ""
            cam_line = next((l for l in lines if "กล้อง" in l or "📷" in l), None)
            if cam_line:
                pts = cam_line.split(":") if ":" in cam_line else cam_line.split("：")
                if len(pts) > 1:
                    input_camera = pts[1].strip()

            customer_name = "ไม่ระบุชื่อ"
            raw_phone = ""
            info_line = next((l for l in lines if re.search(r'\d{9,10}', l)), None)
            if info_line:
                phone_match = re.search(r'\d+', info_line)
                if phone_match:
                    raw_phone = phone_match.group(0)
                    customer_name = re.sub(r'K\.|คิว|[:：]', '', info_line.replace(raw_phone, "")).strip()

            line_name = "ไม่ระบุ"
            line_name_line = next((l for l in lines if "ชื่อไลน์" in l), None)
            if line_name_line:
                pts = line_name_line.split(":") if ":" in line_name_line else line_name_line.split("：")
                if len(pts) > 1:
                    line_name = pts[1].strip()

            input_status = "confirmed"
            status_line = next((l for l in lines if "สถานะ" in l), None)
            if status_line:
                raw_s = (status_line.split(":")[-1] if ":" in status_line else status_line.split("：")[-1]).strip().lower()
                if "cancel" in raw_s or "ยกเลิก" in raw_s:
                    input_status = "cancelled"
                elif "pending" in raw_s or "รอ" in raw_s:
                    input_status = "pending"

            input_payment = "unpaid"
            pay_line = next((l for l in lines if any(x in l for x in ["ชำระเงิน", "payment", "การชำระเงิน"])), None)
            if pay_line:
                raw_p = (pay_line.split(":")[-1] if ":" in pay_line else pay_line.split("：")[-1]).strip().lower()
                if any(x in raw_p for x in ["paid", "ชำระเต็ม", "เต็มจำนวน", "จ่ายแล้ว"]):
                    input_payment = "paid"
                elif any(x in raw_p for x in ["deposit", "มัดจำแล้ว", "มัดจำ"]):
                    input_payment = "deposit"

            input_deposit = 0
            dep_line = next((l for l in lines if "มัดจำ" in l or "deposit" in l), None)
            if dep_line:
                m_dep = re.search(r'\d+', dep_line)
                if m_dep:
                    input_deposit = int(m_dep.group(0))
                    if input_deposit > 0 and input_payment == "unpaid":
                        input_payment = "deposit"

            input_remaining = 0
            rem_line = next((l for l in lines if any(x in l for x in ["เก็บเพิ่ม", "ยอดคงเหลือ", "remaining"])), None)
            if rem_line:
                m_rem = re.search(r'\d+', rem_line)
                if m_rem:
                    input_remaining = int(m_rem.group(0))

            input_notes = None
            note_line = next((l for l in lines if "โน้ต" in l or "หมายเหตุ" in l or "note" in l.lower()), None)
            if note_line:
                raw_n = (note_line.split(":")[-1] if ":" in note_line else note_line.split("：")[-1]).strip()
                if raw_n:
                    input_notes = raw_n

            if not input_event or not input_date or not input_time or not raw_phone:
                missing = []
                if not input_event:
                    missing.append("• ชื่ออีเวนต์ (บรรทัดแรก)")
                if not input_date:
                    missing.append("• วันที่ (เช่น วันที่: 2026-08-12)")
                if not input_time:
                    missing.append("• เวลา (เช่น 12:00-12:20)")
                if not raw_phone:
                    missing.append("• เบอร์โทรศัพท์ (ตัวเลข 9-10 หลัก)")
                err_text = f"❌ รูปแบบข้อมูลการจองไม่ถูกต้อง หรือข้อมูลไม่ครบถ้วนค่ะ\n\n📌 สิ่งที่ขาดหายไป:\n" + "\n".join(missing)
                await reply_to_line(reply_token, err_text)
                return {"message": "OK"}

            formatted_phone = format_phone_number(raw_phone)
            matched_schedules = [s for s in all_schedules if (s.event_name or "").lower() in input_event or input_event in (s.event_name or "").lower()]

            if not matched_schedules:
                await reply_to_line(reply_token, f'❌ ไม่พบชื่ออีเวนต์ "{lines[0]}" ในระบบตารางคิวของคุณ')
                return {"message": "OK"}

            target_schedule = next((s for s in matched_schedules if s.date == input_date), None)
            if not target_schedule:
                in_day = input_date.split("-")[-1]
                target_schedule = next((s for s in matched_schedules if (s.date or "").split("-")[-1] == in_day), None)

            if not target_schedule:
                d_list = "\n".join([f"• {r.date}" for r in matched_schedules])
                await reply_to_line(reply_token, f'❌ ไม่พบรอบวันที่ "{input_date}" สำหรับอีเวนต์นี้ในระบบ\n\n📅 วันที่จัดงานจริงคือ:\n{d_list}')
                return {"message": "OK"}

            full_event_name = target_schedule.event_name or "ไม่ได้ระบุชื่อ"
            slots = target_schedule.slots or []
            target_slot = next((s for s in slots if re.sub(r'\s+', '', s.get("time", "")) == input_time), None)

            if target_slot and target_slot.get("status") == "unavailable":
                await reply_to_line(reply_token, f"⚠️ ขออภัยค่ะ! ไม่สามารถจองช่วงเวลานี้ได้\n\n🎤 Event: {full_event_name}\n⏰ เวลา: {input_time}\n\n❌ ช่วงเวลานี้ถูกตั้งค่าเป็นปิดให้บริการค่ะ")
                return {"message": "OK"}

            if target_slot and target_slot.get("status") == "booked":
                existing = next((b for b in all_bookings if b.date == target_schedule.date and re.sub(r'\s+', '', b.time_slot or "") == input_time and b.status != "cancelled"), None)
                u_name = existing.customer_name if existing else "แอดมิน (ตั้งค่ารอบเต็ม)"
                await reply_to_line(reply_token, f"⚠️ ขออภัยค่ะ! ไม่สามารถจองช่วงเวลานี้ได้\n\n🎤 Event: {full_event_name}\n⏰ เวลา: {input_time}\n\n❌ คิวนี้ถูกตั้งสถานะเป็นเต็มแล้ว (ผู้จอง: {u_name})")
                return {"message": "OK"}

            line_disp = line_name if line_name != "ไม่ระบุ" else await get_line_user_profile(user_id)
            has_explicit_payment = bool(pay_line or dep_line)

            if not has_explicit_payment and user_id:
                set_admin_session(db, user_id, "awaiting_payment_status", {
                    "date": target_schedule.date,
                    "eventName": full_event_name,
                    "timeSlot": input_time,
                    "customerName": customer_name,
                    "customerPhone": raw_phone,
                    "lineDisplayName": line_disp,
                    "cameraType": input_camera or None,
                    "notes": input_notes,
                })
                ask_pay_msg = {
                    "type": "text",
                    "text": f"💳 การชำระเงินของคิว คุณ{customer_name} ({input_time} น.) มีการชำระเงินไหมคะ?\n(กรุณากดเลือกจากปุ่มด้านล่างได้เลยค่ะ 👇)",
                    "quickReply": {
                        "items": [
                            {"type": "action", "action": {"type": "message", "label": "ยังไม่มัดจำ", "text": "ยังไม่มัดจำ"}},
                            {"type": "action", "action": {"type": "message", "label": "มัดจำแล้ว", "text": "มัดจำแล้ว"}},
                            {"type": "action", "action": {"type": "message", "label": "ชำระเต็มจำนวน", "text": "ชำระเต็มจำนวน"}},
                        ]
                    },
                }
                await reply_to_line(reply_token, ask_pay_msg)
                return {"message": "OK"}

            create_booking(db, {
                "date": target_schedule.date,
                "eventName": full_event_name,
                "timeSlot": input_time,
                "customerName": customer_name,
                "customerPhone": raw_phone,
                "lineDisplayName": line_disp,
                "lineUserId": user_id,
                "cameraType": input_camera or None,
                "status": input_status,
                "paymentStatus": input_payment,
                "depositAmount": input_deposit,
                "remainingAmount": input_remaining,
                "notes": input_notes,
            })

            status_lbl = "✅ ยืนยัน" if input_status == "confirmed" else ("❌ ยกเลิก" if input_status == "cancelled" else "⏳ รอยืนยัน")
            rem_text = f"\n💵 ยอดต้องเก็บเพิ่ม: {input_remaining:,} ฿" if input_remaining > 0 else ""
            if input_payment == "paid":
                p_lbl = f"ชำระเต็ม{f' ({input_deposit:,} ฿)' if input_deposit > 0 else ''}"
            elif input_payment == "deposit":
                p_lbl = f"มัดจำแล้ว{f' ({input_deposit:,} ฿)' if input_deposit > 0 else ''}{rem_text}"
            else:
                p_lbl = "ยังไม่ชำระ"

            cam_text = f"\n📷 กล้อง: {input_camera}" if input_camera else ""
            note_text = f"\n📝 โน้ต: {input_notes}" if input_notes else ""
            reply_text = (
                f"✅ บันทึกการจองสำเร็จเรียบร้อย!\n\n"
                f"🎤 Event: {full_event_name}\n"
                f"📅 วันที่: {target_schedule.date}\n"
                f"⏰ เวลา: {input_time} น.{cam_text}\n"
                f"👤 ผู้จอง: K.{customer_name}\n"
                f"📞 เบอร์โทร: {formatted_phone}\n"
                f"💬 ชื่อไลน์: {line_disp}\n"
                f"📋 สถานะ: {status_lbl}\n"
                f"💳 ชำระเงิน: {p_lbl}{note_text}\n\n"
                f"ลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️🙇🏻‍♀️"
            )
            await reply_to_line(reply_token, reply_text)
            return {"message": "OK"}

        # =========================================================================
        # Function 2.5: Admin Booking Form Template
        # =========================================================================
        elif re.match(r'^(จอง|จองคิว|วิธีจอง|ลงคิว|วิธีลงคิว|แบบฟอร์ม|ฟอร์ม|ขอแบบฟอร์ม|วิธีพิมพ์|form|help|คู่มือ)$', user_message, re.IGNORECASE):
            admin_form_template = (
                "📋 แบบฟอร์มลงคิวสำหรับ Admin Bot\n"
                "(ก๊อปปี้ข้อความลูกค้า แล้วเพิ่ม ชำระเงิน และ มัดจำ ส่งหาบอทเพื่อบันทึกคิวได้เลยค่ะ ✨)\n\n"
                "#ชื่องาน\n"
                "วันที่ : 2026-08-20\n"
                "เวลา : 12:00-12:20\n"
                "📷 กล้อง : RICOH GR IIIx + Flash\n"
                "K.ชื่อลูกค้า 0812345678\n"
                "ชื่อไลน์ : line_name\n"
                "ชำระเงิน : มัดจำแล้ว\n"
                "มัดจำ : 500\n"
                "โน้ต : ลูกค้ารับกล้องหน้างาน\n\n"
                "📌 *คำอธิบาย:\n"
                "- ชำระเงิน: ยังไม่มัดจำ | มัดจำแล้ว | ชำระเต็มจำนวน\n"
                "- มัดจำ: จำนวนเงินมัดจำ (เช่น 500, 1000)\n"
                "- (สถานะคิวจะถูกตั้งเป็น \"คอนเฟิร์ม\" อัตโนมัติ)"
            )
            await reply_to_line(reply_token, admin_form_template)
            return {"message": "OK"}

        # =========================================================================
        # Fallback Help Manual
        # =========================================================================
        else:
            admin_manual = (
                "🤖 คู่มือคำสั่งสำหรับ Ren เลขาจองคิว:\n\n"
                "1️⃣ คิวรออนุมัติ: พิมพ์ 'คิวรออนุมัติ' หรือกดปุ่มด้านล่าง 👇\n"
                "2️⃣ เช็กคิว: พิมพ์ 'เช็ก' หรือกดปุ่มด้านล่าง 👇\n"
                "3️⃣ ขอแบบฟอร์มลงคิว: พิมพ์ 'แบบฟอร์ม' หรือกดปุ่มด้านล่าง 👇\n\n"
                "📋 ตัวอย่างแบบฟอร์มสั่งจองคิว (ก๊อปไปส่งหาบอท):\n\n"
                "#ชื่องาน\n"
                "วันที่ : 2026-08-20\n"
                "เวลา : 12:00-12:20\n"
                "📷 กล้อง : RICOH GR IIIx + Flash\n"
                "K.ชื่อลูกค้า 0812345678\n"
                "ชื่อไลน์ : line_name\n"
                "ชำระเงิน : มัดจำแล้ว\n"
                "มัดจำ : 500"
            )
            await reply_to_line(reply_token, admin_manual)
            return {"message": "OK"}

    return {"message": "OK"}
