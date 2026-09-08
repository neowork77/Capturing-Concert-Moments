import httpx
from ..config import settings
from .utils import format_phone_number

ADMIN_MAIN_QUICK_REPLY = {
    "items": [
        {
            "type": "action",
            "action": {
                "type": "message",
                "label": "📌 คิวรออนุมัติ",
                "text": "คิวรออนุมัติ",
            },
        },
        {
            "type": "action",
            "action": {
                "type": "message",
                "label": "🗓️ เช็ก",
                "text": "เช็ก",
            },
        },
    ]
}


def build_summary_text(draft: dict) -> str:
    formatted_phone = format_phone_number(draft.get("customerPhone", "-"))
    payment_status = draft.get("paymentStatus") or "unpaid"
    deposit_amt = draft.get("depositAmount") or 0
    remaining_amt = draft.get("remainingAmount") or 0

    if payment_status == "paid":
        payment_label = "ชำระเต็มจำนวน"
    elif payment_status == "deposit":
        payment_label = f"มัดจำแล้ว ({f'{deposit_amt:,} ฿' if deposit_amt > 0 else 'ไม่ได้ระบุยอด'})"
    else:
        payment_label = "ยังไม่มัดจำ"

    camera_line = f"\n📷 กล้อง: {draft['cameraType']}" if draft.get("cameraType") else ""
    text = (
        f"✅ บันทึกการจองสำเร็จเรียบร้อย!\n\n"
        f"🎤 Event: {draft.get('eventName', '-')}\n"
        f"📅 วันที่: {draft.get('date', '-')}\n"
        f"⏰ เวลา: {draft.get('timeSlot', '-')} น.{camera_line}\n"
        f"👤 ผู้จอง: K.{draft.get('customerName', '-')}\n"
        f"📞 เบอร์โทร: {formatted_phone}\n"
        f"💬 ชื่อไลน์: {draft.get('lineDisplayName', '-')}\n"
        f"📋 สถานะ: ✅ ยืนยัน\n"
        f"💳 ชำระเงิน: {payment_label}"
    )

    if payment_status == "deposit" and remaining_amt > 0:
        text += f"\n💵 ยอดต้องเก็บเพิ่ม: {remaining_amt:,} ฿"

    if draft.get("notes"):
        text += f"\n📝 โน้ต: {draft['notes']}"

    return text


def build_final_confirmed_text(draft: dict) -> str:
    formatted_phone = format_phone_number(draft.get("customerPhone", "-"))
    camera_line = f"\n📷 กล้อง: {draft['cameraType']}" if draft.get("cameraType") else ""
    return (
        f"ลงคิวเรียบร้อยค่ะ 🙇🏻‍♀️\n\n"
        f"🎤 Event: {draft.get('eventName', '-')}\n"
        f"📅 วันที่: {draft.get('date', '-')}\n"
        f"⏰ เวลา: {draft.get('timeSlot', '-')} น.{camera_line}\n"
        f"👤 ผู้จอง: K.{draft.get('customerName', '-')}\n"
        f"📞 เบอร์โทร: {formatted_phone}"
    )


async def reply_to_line(
    reply_token: str,
    message_data: any,
    append_quick_reply: bool = True,
    token_override: str | None = None
) -> None:
    if not reply_token or reply_token in ["00000000000000000000000000000000", "ffffffffffffffffffffffffffffffff"]:
        return

    token = token_override or settings.LINE_ADMIN_CHANNEL_ACCESS_TOKEN or settings.LINE_CHANNEL_ACCESS_TOKEN
    if not token:
        print("❌ LINE Admin Channel Access Token is missing")
        return

    if isinstance(message_data, list):
        messages = [
            {"type": "text", "text": m} if isinstance(m, str) else dict(m)
            for m in message_data
        ]
    elif isinstance(message_data, str):
        messages = [{"type": "text", "text": message_data}]
    elif isinstance(message_data, dict):
        messages = [dict(message_data) if "type" in message_data else {"type": "text", "text": str(message_data)}]
    else:
        messages = [{"type": "text", "text": str(message_data)}]

    if append_quick_reply and messages:
        last_idx = len(messages) - 1
        if "quickReply" not in messages[last_idx]:
            messages[last_idx]["quickReply"] = ADMIN_MAIN_QUICK_REPLY

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.line.me/v2/bot/message/reply",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                json={
                    "replyToken": reply_token,
                    "messages": messages,
                },
            )
            if resp.status_code != 200:
                print(f"❌ LINE Admin Reply Error: {resp.status_code} - {resp.text}")
    except Exception as err:
        print(f"❌ LINE Admin Reply Exception: {err}")


async def push_line_message(user_id: str, message_data: any, token_type: str = "admin") -> bool:
    if not user_id:
        return False

    token = (
        (settings.LINE_ADMIN_CHANNEL_ACCESS_TOKEN or settings.LINE_CHANNEL_ACCESS_TOKEN)
        if token_type == "admin"
        else (settings.LINE_CHANNEL_ACCESS_TOKEN or settings.LINE_ADMIN_CHANNEL_ACCESS_TOKEN)
    )

    if not token:
        print(f"❌ LINE Channel Access Token missing for push ({token_type})")
        return False

    if isinstance(message_data, list):
        messages = [
            {"type": "text", "text": m} if isinstance(m, str) else dict(m)
            for m in message_data
        ]
    elif isinstance(message_data, str):
        messages = [{"type": "text", "text": message_data}]
    elif isinstance(message_data, dict):
        messages = [dict(message_data) if "type" in message_data else {"type": "text", "text": str(message_data)}]
    else:
        messages = [{"type": "text", "text": str(message_data)}]

    if token_type == "admin" and messages:
        last_idx = len(messages) - 1
        if "quickReply" not in messages[last_idx]:
            messages[last_idx]["quickReply"] = ADMIN_MAIN_QUICK_REPLY

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.line.me/v2/bot/message/push",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                json={
                    "to": user_id,
                    "messages": messages,
                },
            )
            if resp.status_code != 200:
                print(f"❌ LINE Push Error ({token_type}): {resp.status_code} - {resp.text}")
                return False
            return True
    except Exception as err:
        print(f"❌ LINE Push Exception ({token_type}): {err}")
        return False


async def get_line_user_profile(user_id: str | None) -> str:
    if not user_id:
        return "ไม่ระบุชื่อไลน์"
    token = settings.LINE_ADMIN_CHANNEL_ACCESS_TOKEN or settings.LINE_CHANNEL_ACCESS_TOKEN
    if not token:
        return "ไม่ระบุชื่อไลน์"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.line.me/v2/bot/profile/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("displayName") or "ไม่ระบุชื่อไลน์"
    except Exception as err:
        print(f"❌ ดึงโปรไฟล์ LINE ล้มเหลว: {err}")
    return "ไม่ระบุชื่อไลน์"


def build_pending_queue_carousel(pending_bookings: list) -> dict:
    cards = []
    for b in pending_bookings[:10]:
        is_dep = b.payment_status == "deposit" or "มัดจำ" in (b.notes or "")
        pay_label = "🟡 มัดจำ" if is_dep else "💚 ชำระเต็มจำนวน"

        card = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {"type": "text", "text": f"📌 คิวรออนุมัติ #{b.id}", "weight": "bold", "size": "md", "color": "#F4A0B5"},
                    {"type": "text", "text": f"🎤 {b.event_name or 'ไม่ได้ระบุงาน'}", "weight": "bold", "size": "sm", "wrap": True},
                    {"type": "text", "text": f"📅 วันที่: {b.date}", "size": "xs", "color": "#555555"},
                    {"type": "text", "text": f"⏰ เวลา: {b.time_slot} น.", "size": "xs", "color": "#555555"},
                    {"type": "text", "text": f"📷 กล้อง: {b.camera_type or '-'}", "size": "xs", "color": "#555555", "wrap": True},
                    {"type": "text", "text": f"💳 การชำระเงิน: {pay_label}", "size": "xs", "color": "#333333", "weight": "bold"},
                    {"type": "separator"},
                    {"type": "text", "text": f"👤 ผู้จอง: K.{b.customer_name or '-'} ({b.customer_phone or '-'})", "size": "xs", "color": "#111111", "wrap": True},
                    {"type": "text", "text": f"💬 ชื่อไลน์: {b.line_display_name or '-'}", "size": "xs", "color": "#777777"},
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "vertical",
                        "backgroundColor": "#FFB6C1",
                        "cornerRadius": "md",
                        "paddingAll": "md",
                        "action": {
                            "type": "message",
                            "label": f"เลือกอนุมัติคิว #{b.id}",
                            "text": f"[เลือกอนุมัติคิว] #{b.id}",
                        },
                        "contents": [
                            {
                                "type": "text",
                                "text": f"👉 เลือกอนุมัติคิว #{b.id}",
                                "align": "center",
                                "color": "#000000",
                                "weight": "bold",
                                "size": "sm",
                            }
                        ],
                    }
                ],
            },
        }
        cards.append(card)

    return {
        "type": "flex",
        "altText": f"📌 มีคิวรอการอนุมัติทั้งหมด {len(pending_bookings)} รายการ",
        "contents": {
            "type": "carousel",
            "contents": cards,
        },
    }

