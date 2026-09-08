import json
import re
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..config import settings
from ..services.utils import verify_line_signature, resolve_public_image_url, TIME_SLOTS
from ..services.line_service import (
    reply_to_line,
    push_line_message,
    get_line_user_profile,
    check_slot_status_for_camera,
    build_available_events_flex,
    build_cameras_flex,
    build_multi_day_date_buttons_flex,
)
from ..services.schedule_service import get_all_schedule_records, get_available_schedule_records
from ..services.camera_service import get_active_cameras
from ..services.booking_service import get_all_bookings, create_booking
from ..services.session_service import (
    get_line_user_session,
    set_line_user_session,
    clear_line_user_session,
    get_latest_admin_user_id,
    set_admin_session,
)

router = APIRouter()


async def send_available_events_flex(
    reply_token: str,
    db: Session,
    greeting_text: str | None = None,
    host: str | None = None,
):
    available_events = get_available_schedule_records(db)
    if not available_events:
        await reply_to_line(
            reply_token,
            {"type": "text", "text": "⚠️ ขออภัยค่ะ ตอนนี้ยังไม่มีข้อมูลงานที่เปิดรับคิวในระบบค่ะ"}
        )
        return

    flex_carousel = build_available_events_flex(
        available_events,
        base_url=settings.NEXT_PUBLIC_BASE_URL,
        host=host,
    )
    messages = []
    if greeting_text:
        messages.append({"type": "text", "text": greeting_text})
    messages.append(flex_carousel)
    await reply_to_line(reply_token, messages)


async def send_timetable_with_interest_prompt(
    reply_token: str,
    event_name: str,
    date: str,
    camera_type: str,
    record,
    db: Session,
):
    location_name = record.location or "-"
    reply_text = "🗓️ ตารางรอบเวลาของงานคิวนี้ค่ะ\n"
    reply_text += f"🎪 งาน: {event_name}\n"
    reply_text += f"🗓️ วันที่: {date}\n"
    reply_text += f"📍 สถานที่: {location_name}\n"
    reply_text += f"📷 กล้องที่เลือก: \n{camera_type}\n"
    reply_text += "━━━━━━━━━━━━━━\n"

    all_bookings = get_all_bookings(db)
    norm_date = date.strip()
    norm_event = event_name.strip().lower()
    norm_cam = camera_type.strip().lower()

    booked_slots = set()
    for b in all_bookings:
        if b.status == "cancelled":
            continue
        same_date = (b.date or "").strip() == norm_date
        b_event = (b.event_name or "").strip().lower()
        same_event = not norm_event or not b_event or norm_event in b_event or b_event in norm_event
        b_cam = (b.camera_type or "").strip().lower()
        same_cam = not norm_cam or not b_cam or norm_cam == b_cam or norm_cam in b_cam or b_cam in norm_cam

        if same_date and same_event and same_cam:
            clean_s = re.sub(r'\s+', '', b.time_slot or '')
            booked_slots.add(clean_s)

    slots_to_display = [s.get("time") for s in (record.slots or [])] if record.slots else TIME_SLOTS

    for time_label in slots_to_display:
        is_booked = check_slot_status_for_camera(time_label, camera_type, record, booked_slots)
        if not is_booked:
            reply_text += f"  ✅ {time_label} (ว่าง)\n"
        else:
            reply_text += f"  ❌ {time_label} (เต็ม)\n"

    reply_text += "━━━━━━━━━━━━━━\n"
    reply_text += "สนใจจองคิวไหมคะ? ✨"

    await reply_to_line(reply_token, {
        "type": "text",
        "text": reply_text.strip(),
        "quickReply": {
            "items": [
                {
                    "type": "action",
                    "action": {"type": "message", "label": "ต้องการจองคิว", "text": "ต้องการจองคิว"},
                },
                {
                    "type": "action",
                    "action": {"type": "message", "label": "ยังไม่สนใจ", "text": "ยังไม่สนใจ"},
                },
            ]
        },
    })


async def send_available_time_slots_quick_reply(
    reply_token: str,
    event_name: str,
    date: str,
    camera_type: str,
    record,
    db: Session,
):
    all_bookings = get_all_bookings(db)
    norm_date = date.strip()
    norm_event = event_name.strip().lower()
    norm_cam = camera_type.strip().lower()

    booked_slots = set()
    for b in all_bookings:
        if b.status == "cancelled":
            continue
        same_date = (b.date or "").strip() == norm_date
        b_event = (b.event_name or "").strip().lower()
        same_event = not norm_event or not b_event or norm_event in b_event or b_event in norm_event
        b_cam = (b.camera_type or "").strip().lower()
        same_cam = not norm_cam or not b_cam or norm_cam == b_cam or norm_cam in b_cam or b_cam in norm_cam

        if same_date and same_event and same_cam:
            clean_s = re.sub(r'\s+', '', b.time_slot or '')
            booked_slots.add(clean_s)

    available_slots = []
    slots_to_display = [s.get("time") for s in (record.slots or [])] if record.slots else TIME_SLOTS
    for time_label in slots_to_display:
        is_booked = check_slot_status_for_camera(time_label, camera_type, record, booked_slots)
        if not is_booked:
            available_slots.append(time_label)

    if not available_slots:
        await reply_to_line(reply_token, {
            "type": "text",
            "text": f'⚠️ ขออภัยค่ะ รอบเวลาสำหรับกล้อง "{camera_type}" ในงาน "{event_name}" ({date}) เต็มหมดทุกรอบแล้วค่ะ 🙇🏻‍♀️',
        })
        return

    quick_items = [
        {
            "type": "action",
            "action": {
                "type": "message",
                "label": slot[:20],
                "text": f"[เลือกเวลา] {slot}",
            },
        }
        for slot in available_slots[:13]
    ]

    await reply_to_line(reply_token, {
        "type": "text",
        "text": "สนใจเป็นช่วงเวลากี่โมงดีคะ? ⏰\n\nกรุณากดเลือกรอบเวลาที่ต้องการจองด้านล่างได้เลยค่ะ 👇",
        "quickReply": {"items": quick_items},
    })


@router.post("/api/line-webhook")
@router.post("/webhook")
async def handle_customer_webhook(
    request: Request,
    x_line_signature: str | None = Header(default=None, alias="x-line-signature"),
    db: Session = Depends(get_db),
):
    body_bytes = await request.body()
    body_text = body_bytes.decode("utf-8")

    if not body_text.strip():
        return {"message": "Empty body"}

    if settings.LINE_CHANNEL_SECRET and not verify_line_signature(body_bytes, x_line_signature, settings.LINE_CHANNEL_SECRET):
        print("❌ Signature Verification Failed for Customer LINE Webhook")
        raise HTTPException(status_code=401, detail="Unauthorized signature")

    try:
        body = json.loads(body_text)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    events = body.get("events", [])
    if not events:
        return {"message": "Verify Success"}

    host_header = request.headers.get("x-forwarded-host") or request.headers.get("host")

    for event in events:
        reply_token = event.get("replyToken")
        source = event.get("source", {})
        user_id = source.get("userId")
        event_type = event.get("type")
        message_obj = event.get("message", {})
        user_message = message_obj.get("text", "").strip() if event_type == "message" and message_obj.get("type") == "text" else ""

        if reply_token in ["00000000000000000000000000000000", "ffffffffffffffffffffffffffffffff"]:
            continue

        # 0. Follow Event
        if event_type == "follow":
            if user_id:
                clear_line_user_session(db, user_id)
            greeting = '✨ ยินดีต้อนรับค่ะ! ท่านสามารถพิมพ์คำว่า "เช็คคิว" หรือเลือกรอบงานด้านล่างเพื่อเช็ครอบเวลาว่างและทำรายการจองคิวได้เลยนะคะ 👇'
            await send_available_events_flex(reply_token, db, greeting, host=host_header)
            continue

        # 0.5 Cancellation / Reset
        if user_message in ["ยกเลิก", "ยกเลิกการจอง", "เริ่มใหม่", "reset"]:
            if user_id:
                clear_line_user_session(db, user_id)
            await reply_to_line(reply_token, {
                "type": "text",
                "text": "ยกเลิกรายการเรียบร้อยค่ะ ✨\nหากต้องการจองคิวใหม่ สามารถพิมพ์คำว่า \"เช็คคิว\" หรือ \"จองคิว\" ได้เสมอนะคะ 💖",
            })
            continue

        # 1. Not interested
        if user_message in ["ยังไม่สนใจ", "ไม่สนใจจอง", "[ไม่สนใจจอง]"]:
            if user_id:
                clear_line_user_session(db, user_id)
            await send_available_events_flex(
                reply_token,
                db,
                "✨ ไม่เป็นไรค่ะ! ท่านสามารถเลือกดูรายการคอนเสิร์ตทั้งหมดที่มีในระบบได้จากด้านล่างนี้เลยนะคะ 👇",
                host=host_header,
            )
            continue

        # 2. Booking Intent
        is_booking_intent = (
            user_message in ["ต้องการจองคิว", "[ต้องการจองคิว]", "สนใจจองคิว", "[สนใจจองคิว]"] or
            (not user_message.startswith("[") and bool(re.search(r"(สนใจจองคิว|ต้องการจองคิว|^จองคิว$|^เช็คคิว$|^เช็กคิว$|^สวัสดี$|^เมนู$|^hi$|^hello$)", user_message, re.IGNORECASE)))
        )

        if is_booking_intent:
            session = get_line_user_session(db, user_id) if user_id else None
            if session and session.get("step") == "confirm_booking_interest" and session.get("eventName") and session.get("date"):
                target_date = session["date"]
                target_event = session["eventName"]
                all_records = get_all_schedule_records(db)

                matched_record = next(
                    (
                        r for r in all_records
                        if (r.date or "").strip() == target_date.strip() and
                        ((r.event_name or "").strip().lower() in target_event.strip().lower() or target_event.strip().lower() in (r.event_name or "").strip().lower())
                    ),
                    None,
                )

                if matched_record:
                    if user_id:
                        set_line_user_session(db, user_id, {"step": "awaiting_time_slot"})
                    await send_available_time_slots_quick_reply(
                        reply_token,
                        target_event,
                        target_date,
                        session.get("cameraType") or "กล้องหลัก",
                        matched_record,
                        db,
                    )
                    continue

            if user_id:
                clear_line_user_session(db, user_id)
            greeting = "✨ ยินดีต้อนรับค่ะ! ท่านสามารถเลือกรอบงานด้านล่างเพื่อเช็ครอบเวลาว่างและทำรายการจองคิวได้เลยค่ะ 👇"
            await send_available_events_flex(reply_token, db, greeting, host=host_header)
            continue

        # 3. Select Time Slot
        is_select_slot = user_message.startswith("[เลือกเวลา]")
        current_session = get_line_user_session(db, user_id) if user_id else None
        time_slot_regex = r"(?:เวลา\s*)?(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})"
        is_slot_text_in_step = (current_session and current_session.get("step") == "awaiting_time_slot" and bool(re.search(time_slot_regex, user_message)))

        if is_select_slot or is_slot_text_in_step:
            selected_slot = ""
            if user_message.startswith("[เลือกเวลา]"):
                selected_slot = user_message.replace("[เลือกเวลา]", "").strip()
            else:
                m = re.search(time_slot_regex, user_message)
                if m:
                    selected_slot = m.group(1).replace(".", ":").replace(" ", "")

            session = current_session
            if not session or not session.get("eventName") or not session.get("date"):
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": "⚠️ ไม่พบข้อมูลงานที่ต้องการจอง กรุณาเลือกงานและกล้องใหม่อีกครั้งนะคะ",
                })
                continue

            session_event = session["eventName"]
            session_date = session["date"]

            all_records = get_all_schedule_records(db)
            matched_record = next(
                (
                    r for r in all_records
                    if (r.date or "").strip() == session_date.strip() and
                    ((r.event_name or "").strip().lower() in session_event.strip().lower() or session_event.strip().lower() in (r.event_name or "").strip().lower())
                ),
                None,
            )

            if matched_record:
                all_bookings = get_all_bookings(db)
                norm_date = session_date.strip()
                norm_event = session_event.strip().lower()
                norm_cam = (session.get("cameraType") or "").strip().lower()

                booked_slots = set()
                for b in all_bookings:
                    if b.status == "cancelled":
                        continue
                    same_date = (b.date or "").strip() == norm_date
                    b_event = (b.event_name or "").strip().lower()
                    same_event = not norm_event or not b_event or norm_event in b_event or b_event in norm_event
                    b_cam = (b.camera_type or "").strip().lower()
                    same_cam = not norm_cam or not b_cam or norm_cam == b_cam or norm_cam in b_cam or b_cam in norm_cam
                    if same_date and same_event and same_cam:
                        booked_slots.add(re.sub(r'\s+', '', b.time_slot or ''))

                is_booked = check_slot_status_for_camera(
                    selected_slot,
                    session.get("cameraType") or "",
                    matched_record,
                    booked_slots,
                )

                if is_booked:
                    await reply_to_line(reply_token, {
                        "type": "text",
                        "text": f'⚠️ ขออภัยค่ะ รอบเวลา {selected_slot} น. สำหรับกล้อง "{session.get("cameraType") or "รุ่นนี้"}" ถูกจองไปแล้ว กรุณากดเลือกรอบเวลาอื่นนะคะ 🙇🏻‍♀️',
                    })
                    await send_available_time_slots_quick_reply(
                        reply_token,
                        session["eventName"],
                        session["date"],
                        session.get("cameraType") or "กล้องหลัก",
                        matched_record,
                        db,
                    )
                    continue

            if user_id:
                set_line_user_session(db, user_id, {"timeSlot": selected_slot, "step": "awaiting_name"})

            await reply_to_line(reply_token, {
                "type": "text",
                "text": f'คุณเลือกรอบเวลา: {selected_slot} น. \nสำหรับกล้อง: \n"{session.get("cameraType") or "กล้องหลัก"}" \nเรียบร้อยค่ะ ✨\n\nกรุณาระบุ "ชื่อผู้จอง" สำหรับทำรายการค่ะ (เช่น คิมโดยอง)',
            })
            continue

        # 4. Select Camera
        if user_message.startswith("[เลือกกล้อง]"):
            match = re.match(r'^\[เลือกกล้อง\]\s*(.*?)\s*\|\s*งาน:\s*(.*?)\s*\((.*?)\)$', user_message)
            selected_camera = "RICOH GR IIIx + Flash"
            target_event_name = ""
            target_date = ""

            if match:
                selected_camera = match.group(1).strip()
                target_event_name = match.group(2).strip()
                target_date = match.group(3).strip()
            else:
                parts = user_message.split("|")
                selected_camera = parts[0].replace("[เลือกกล้อง]", "").strip()

            if user_id and target_event_name and target_date:
                set_line_user_session(db, user_id, {
                    "eventName": target_event_name,
                    "date": target_date,
                    "cameraType": selected_camera,
                    "step": "confirm_booking_interest",
                })

            all_records = get_all_schedule_records(db)
            matched_record = next(
                (
                    r for r in all_records
                    if (r.date or "").strip() == target_date.strip() and
                    (not target_event_name or (r.event_name or "").strip().lower() in target_event_name.strip().lower() or target_event_name.strip().lower() in (r.event_name or "").strip().lower())
                ),
                None,
            )

            if matched_record:
                await send_timetable_with_interest_prompt(
                    reply_token,
                    target_event_name,
                    target_date,
                    selected_camera,
                    matched_record,
                    db,
                )
            else:
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": f"📷 เลือกกล้อง: {selected_camera}\n🎪 งาน: {target_event_name} ({target_date})\n\nสนใจจองคิวเลยไหมคะ? ✨",
                    "quickReply": {
                        "items": [
                            {"type": "action", "action": {"type": "message", "label": "ต้องการจองคิว", "text": "ต้องการจองคิว"}},
                            {"type": "action", "action": {"type": "message", "label": "ยังไม่สนใจ", "text": "ยังไม่สนใจ"}},
                        ]
                    },
                })
            continue

        # 5. Select Multi-day Date
        if user_message.startswith("[เลือกวัน]"):
            event_name_search = user_message.replace("[เลือกวัน] งาน:", "").strip()
            available_events = get_available_schedule_records(db)
            matched_rows = [r for r in available_events if (r.event_name or "").strip() == event_name_search]
            unique_dates = list(dict.fromkeys([(r.date or "").strip() for r in matched_rows if r.date]))

            if unique_dates:
                flex_msg = build_multi_day_date_buttons_flex(event_name_search, unique_dates)
                await reply_to_line(reply_token, flex_msg)
            else:
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": "⚠️ ขออภัยค่ะ ไม่พบรอบวันที่ว่างสำหรับงานนี้ในระบบแล้วค่ะ",
                })
            continue

        # 6. View Queue for Day -> Camera Carousel
        if user_message.startswith("[ดูคิว]"):
            all_records = get_all_schedule_records(db)
            matched_record = None
            for r in all_records:
                format_check = f"[ดูคิว] งาน: {r.event_name or '-'} ({r.date})"
                if user_message == format_check:
                    matched_record = r
                    break

            if matched_record:
                active_cameras = get_active_cameras(db)
                cameras_flex = build_cameras_flex(
                    active_cameras,
                    matched_record.event_name or "-",
                    matched_record.date,
                    base_url=settings.NEXT_PUBLIC_BASE_URL,
                    host=host_header,
                )
                await reply_to_line(reply_token, [
                    {"type": "text", "text": f'กรุณาเลือกกล้องที่ต้องการถ่ายสำหรับงาน "{matched_record.event_name}" ({matched_record.date}) ค่ะ 👇'},
                    cameras_flex,
                ])
            else:
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": "⚠️ ไม่พบข้อมูลรอบเวลาของงานนี้ กรุณาลองเลือกงานอีกครั้งค่ะ",
                })
            continue

        # 7. Customer sends Payment Slip Image
        if event_type == "message" and message_obj.get("type") == "image":
            session = get_line_user_session(db, user_id) if user_id else None
            if session and session.get("step") in ["awaiting_slip", "awaiting_payment_type"]:
                line_display_name = await get_line_user_profile(user_id)
                confirm_slip_text = "ได้รับสลิปโอนเงินเรียบร้อยแล้วค่ะ \n\nรับข้อมูลการจองเรียบร้อยแล้วค่ะ\nรอทางแอดมินคอนเฟิร์มคิวสักครู่ค่ะ"
                await reply_to_line(reply_token, {"type": "text", "text": confirm_slip_text})

                created_booking = None
                try:
                    created_booking = create_booking(db, {
                        "date": session.get("date", ""),
                        "eventName": session.get("eventName", ""),
                        "timeSlot": session.get("timeSlot", ""),
                        "customerName": session.get("customerName", ""),
                        "customerPhone": session.get("customerPhone", ""),
                        "lineDisplayName": line_display_name,
                        "lineUserId": user_id,
                        "cameraType": session.get("cameraType"),
                        "paymentStatus": "deposit",
                        "depositAmount": 100,
                        "notes": "การชำระเงิน: มัดจำ (ลูกค้าแนบสลิปเรียบร้อย)",
                        "status": "pending",
                    })
                except Exception as e:
                    print(f"⚠️ Error saving pending slip booking: {e}")

                admin_user_id = get_latest_admin_user_id(db)
                if admin_user_id:
                    set_admin_session(db, admin_user_id, "awaiting_deposit_amount", {
                        "bookingId": created_booking.id if created_booking else None,
                        "date": session.get("date", ""),
                        "eventName": session.get("eventName", ""),
                        "timeSlot": session.get("timeSlot", ""),
                        "customerName": session.get("customerName", ""),
                        "customerPhone": session.get("customerPhone", ""),
                        "lineDisplayName": line_display_name,
                        "customerLineUserId": user_id,
                        "cameraType": session.get("cameraType"),
                        "paymentStatus": "deposit",
                        "depositAmount": 100,
                    })

                    queue_id_text = f" #{created_booking.id}" if created_booking else ""
                    admin_prompt = {
                        "type": "text",
                        "text": (
                            f"📌 มีการจองคิวใหม่เข้ามาค่ะ{queue_id_text}! (ลูกค้าส่งสลิปโอนเงินแล้ว 📄)\n"
                            f"🎤 Event: {session.get('eventName')}\n"
                            f"📅 วันที่: {session.get('date')}\n"
                            f"⏰ เวลา: {session.get('timeSlot')} น.\n"
                            f"📷 กล้อง: {session.get('cameraType') or '-'}\n"
                            f"👤 ผู้จอง: K.{session.get('customerName')} ({session.get('customerPhone')})\n"
                            f"💬 ชื่อไลน์: {line_display_name}\n"
                            f"💳 ลูกค้าส่ง: 📄 สลิปมัดจำ\n"
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
                    await push_line_message(admin_user_id, admin_prompt, token_type="admin")
                    if message_obj.get("id"):
                        await push_line_message(admin_user_id, f"📄 ได้รับรูปภาพสลิปการโอนเงินจาก K.{session.get('customerName')} เรียบร้อยแล้วค่ะ", token_type="admin")

                if user_id:
                    clear_line_user_session(db, user_id)
                continue

        # 8. Interactive Step-by-Step Flow
        if event_type == "message" and message_obj.get("type") == "text":
            session = get_line_user_session(db, user_id) if user_id else None
            current_step = session.get("step") if session else None

            # Step A: Awaiting Name
            if current_step == "awaiting_name":
                cust_name = user_message.strip()
                if not cust_name:
                    await reply_to_line(reply_token, {"type": "text", "text": "⚠️ กรุณาระบุชื่อผู้จองด้วยนะคะ"})
                    continue
                if user_id:
                    set_line_user_session(db, user_id, {"customerName": cust_name, "step": "awaiting_phone"})
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": f'ยินดีต้อนรับค่ะ คุณ {cust_name} 🙇🏻‍♀️\n\nกรุณาระบุ "เบอร์โทรศัพท์มือถือ" \n10 หลัก สำหรับติดต่อค่ะ \n(เช่น 0812345678)',
                })
                continue

            # Step B: Awaiting Phone
            elif current_step == "awaiting_phone":
                phone_match = re.search(r'(0[0-9-]{8,14})', user_message)
                raw_phone = phone_match.group(0) if phone_match else user_message
                clean_phone = raw_phone.replace("-", "").strip()

                if len(clean_phone) != 10 or not clean_phone.isdigit():
                    await reply_to_line(reply_token, {
                        "type": "text",
                        "text": "⚠️ โปรดกรอกเบอร์มือถือให้ครบ 10 หลัก ตัวอย่าง 0812345678",
                    })
                    continue

                if user_id:
                    set_line_user_session(db, user_id, {"customerPhone": clean_phone, "step": "awaiting_payment_type"})

                cust_name = session.get("customerName") or "ผู้จอง"
                await reply_to_line(reply_token, {
                    "type": "text",
                    "text": f'ขอบคุณค่ะ คุณ {cust_name} 🙇🏻‍♀️\n\nสนใจ "มัดจำ" หรือ "ชำระเต็มจำนวน" ดีคะ? ✨',
                    "quickReply": {
                        "items": [
                            {"type": "action", "action": {"type": "message", "label": "มัดจำ", "text": "มัดจำ"}},
                            {"type": "action", "action": {"type": "message", "label": "ชำระเต็มจำนวน", "text": "ชำระเต็มจำนวน"}},
                        ]
                    },
                })
                continue

            # Step C: Awaiting Payment Type
            elif (
                current_step == "awaiting_payment_type" or
                user_message in ["มัดจำ", "ชำระเต็มจำนวน"] or
                user_message.startswith("[เลือกชำระ]")
            ):
                payment_choice = "มัดจำ"
                if "ชำระเต็มจำนวน" in user_message:
                    payment_choice = "ชำระเต็มจำนวน"
                elif "มัดจำ" in user_message:
                    payment_choice = "มัดจำ"
                elif session and session.get("paymentType"):
                    payment_choice = session["paymentType"]

                if not session or not all(session.get(k) for k in ["eventName", "date", "timeSlot", "customerName", "customerPhone"]):
                    await reply_to_line(reply_token, {
                        "type": "text",
                        "text": "⚠️ ไม่พบข้อมูลการจองที่สมบูรณ์ กรุณาเลือกงานและทำรายการใหม่อีกครั้งค่ะ",
                    })
                    if user_id:
                        clear_line_user_session(db, user_id)
                    continue

                line_display_name = await get_line_user_profile(user_id)
                is_deposit = payment_choice == "มัดจำ"

                if is_deposit:
                    qr_image_url = resolve_public_image_url("/assets/qrcode.png", base_url=settings.NEXT_PUBLIC_BASE_URL, host=host_header) or "https://promptpay.io/0812345678/100.png"
                    deposit_prompt_text = "💳 ยอดชำระเงินมัดจำ: 100 บาท\n\nกรุณาสแกน QR Code ด้านล่างนี้เพื่อโอนเงินมัดจำ แล้วส่งรูปภาพสลิปโอนเงินเข้ามาในแชทนี้เพื่อยืนยันคิวจองนะคะ 🙇🏻‍♀️"

                    await reply_to_line(reply_token, [
                        {"type": "text", "text": deposit_prompt_text},
                        {
                            "type": "image",
                            "originalContentUrl": qr_image_url,
                            "previewImageUrl": qr_image_url,
                        },
                    ])

                    if user_id:
                        set_line_user_session(db, user_id, {"step": "awaiting_slip", "paymentType": "มัดจำ"})
                    continue

                # Case Full Payment
                pending_text = "รับข้อมูลการจองเรียบร้อยแล้วค่ะ🙇🏻‍♀️\n\nรอทางแอดมินคอนเฟิร์มคิวสักครู่ค่ะ"
                await reply_to_line(reply_token, {"type": "text", "text": pending_text})

                created_booking = None
                try:
                    created_booking = create_booking(db, {
                        "date": session["date"],
                        "eventName": session["eventName"],
                        "timeSlot": session["timeSlot"],
                        "customerName": session["customerName"],
                        "customerPhone": session["customerPhone"],
                        "lineDisplayName": line_display_name,
                        "lineUserId": user_id,
                        "cameraType": session.get("cameraType"),
                        "paymentStatus": "paid",
                        "depositAmount": 0,
                        "remainingAmount": 0,
                        "notes": "การชำระเงิน: ชำระเต็มจำนวน",
                        "status": "pending",
                    })
                except Exception as err:
                    print(f"⚠️ Error saving pending paid booking: {err}")

                admin_user_id = get_latest_admin_user_id(db)
                if admin_user_id:
                    set_admin_session(db, admin_user_id, "awaiting_final_confirmation", {
                        "bookingId": created_booking.id if created_booking else None,
                        "date": session["date"],
                        "eventName": session["eventName"],
                        "timeSlot": session["timeSlot"],
                        "customerName": session["customerName"],
                        "customerPhone": session["customerPhone"],
                        "lineDisplayName": line_display_name,
                        "customerLineUserId": user_id,
                        "cameraType": session.get("cameraType"),
                        "paymentStatus": "paid",
                        "depositAmount": 0,
                        "remainingAmount": 0,
                    })

                    queue_id_text = f" #{created_booking.id}" if created_booking else ""
                    admin_prompt = {
                        "type": "text",
                        "text": (
                            f"📌 มีการจองคิวใหม่เข้ามาค่ะ{queue_id_text}!\n"
                            f"🎤 Event: {session['eventName']}\n"
                            f"📅 วันที่: {session['date']}\n"
                            f"⏰ เวลา: {session['timeSlot']} น.\n"
                            f"📷 กล้อง: {session.get('cameraType') or '-'}\n"
                            f"👤 ผู้จอง: K.{session['customerName']}\n"
                            f"📞 เบอร์โทร: {session['customerPhone']}\n"
                            f"💬 ชื่อไลน์: {line_display_name}\n"
                            f"💳 ชำระเงิน: 💚 ชำระเต็มจำนวน (แอดมินแจ้งรายละเอียดโอนเงินในแชท)\n\n"
                            f"กรุณากดปุ่มเพื่อยืนยันหรือยกเลิกการจองนะคะ 👇"
                        ),
                        "quickReply": {
                            "items": [
                                {"type": "action", "action": {"type": "message", "label": "✅ ยืนยันการจอง", "text": "ยืนยันการจอง"}},
                                {"type": "action", "action": {"type": "message", "label": "❌ ยกเลิกการจอง", "text": "ยกเลิกการจอง"}},
                            ]
                        },
                    }
                    await push_line_message(admin_user_id, admin_prompt, token_type="admin")

                if user_id:
                    clear_line_user_session(db, user_id)
                continue

            # Step D: Non-command fallback -> Do not reply automatically
            else:
                continue

    return {"message": "OK"}
