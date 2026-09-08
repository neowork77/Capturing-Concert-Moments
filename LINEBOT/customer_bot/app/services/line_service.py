import re
import httpx
from ..config import settings
from .utils import resolve_public_image_url


async def reply_to_line(reply_token: str, message_data: any, token_override: str | None = None) -> None:
    if not reply_token or reply_token in ["00000000000000000000000000000000", "ffffffffffffffffffffffffffffffff"]:
        return

    token = token_override or settings.LINE_CHANNEL_ACCESS_TOKEN
    if not token:
        print("❌ LINE Channel Access Token is missing")
        return

    if isinstance(message_data, list):
        messages = [
            {"type": "text", "text": m} if isinstance(m, str) else m
            for m in message_data
        ]
    elif isinstance(message_data, str):
        messages = [{"type": "text", "text": message_data}]
    elif isinstance(message_data, dict):
        messages = [message_data if "type" in message_data else {"type": "text", "text": str(message_data)}]
    else:
        messages = [{"type": "text", "text": str(message_data)}]

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
                print(f"❌ LINE Reply Error: {resp.status_code} - {resp.text}")
    except Exception as err:
        print(f"❌ LINE Reply Exception: {err}")


async def push_line_message(user_id: str, message_data: any, token_type: str = "customer") -> bool:
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
            {"type": "text", "text": m} if isinstance(m, str) else m
            for m in message_data
        ]
    elif isinstance(message_data, str):
        messages = [{"type": "text", "text": message_data}]
    elif isinstance(message_data, dict):
        messages = [message_data if "type" in message_data else {"type": "text", "text": str(message_data)}]
    else:
        messages = [{"type": "text", "text": str(message_data)}]

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


async def get_line_user_profile(user_id: str | None, token_override: str | None = None) -> str:
    if not user_id:
        return "ไม่ระบุชื่อไลน์"
    token = token_override or settings.LINE_CHANNEL_ACCESS_TOKEN
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


def check_slot_status_for_camera(
    time_label: str,
    camera_type: str,
    record,
    booked_slots_for_this_camera: set[str]
) -> bool:
    clean_time = re.sub(r'\s+', '', time_label)
    if clean_time in booked_slots_for_this_camera:
        return True

    slots = getattr(record, 'slots', None) or []
    slot_obj = next((s for s in slots if re.sub(r'\s+', '', s.get("time", "")) == clean_time), None)
    if not slot_obj:
        return False

    norm_cam = camera_type.strip().lower()
    cam_statuses = slot_obj.get("cameraStatuses")
    if cam_statuses:
        for k, v in cam_statuses.items():
            k_norm = k.strip().lower()
            if k_norm == norm_cam or k_norm in norm_cam or norm_cam in k_norm:
                return v == "booked"

    return slot_obj.get("status") in ["booked", "unavailable"]


def build_available_events_flex(available_events: list, base_url: str | None = None, host: str | None = None) -> dict:
    grouped_events = {}
    for item in available_events:
        d = item.date.strip() if item.date else ""
        ev = item.event_name.strip() if item.event_name else "ไม่มีชื่อตาราง"
        if ev not in grouped_events:
            grouped_events[ev] = {"row": item, "dates": []}
        if d and d not in grouped_events[ev]["dates"]:
            grouped_events[ev]["dates"].append(d)

    cards = []
    for group in list(grouped_events.values())[:10]:
        row = group["row"]
        dates = group["dates"]
        event_name = row.event_name or "ไม่มีชื่อตาราง"
        location_name = row.location or "-"
        image_url = row.image_url

        is_multi_day = len(dates) > 1
        date_display = f"{dates[0]} ~ {dates[-1]} \n({len(dates)} วัน)" if is_multi_day else (dates[0] if dates else "-")
        action_text = f"[เลือกวัน] งาน: {event_name}" if is_multi_day else f"[ดูคิว] งาน: {event_name} ({dates[0]})"

        bubble = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                    {
                        "type": "text",
                        "text": event_name,
                        "weight": "bold",
                        "size": "md",
                        "wrap": True,
                        "maxLines": 2,
                        "color": "#111111",
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "🗓️", "size": "sm", "flex": 0},
                                    {"type": "text", "text": f"วันที่: {date_display}", "size": "sm", "color": "#555555", "flex": 1, "wrap": True},
                                ],
                            },
                            {
                                "type": "box",
                                "layout": "baseline",
                                "spacing": "sm",
                                "contents": [
                                    {"type": "text", "text": "📍", "size": "sm", "flex": 0},
                                    {"type": "text", "text": location_name, "size": "sm", "color": "#555555", "flex": 1, "wrap": True},
                                ],
                            },
                        ],
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "vertical",
                        "backgroundColor": "#FEE1E8",
                        "cornerRadius": "md",
                        "paddingAll": "md",
                        "action": {
                            "type": "message",
                            "label": "🔍 เช็ครอบเวลาว่าง",
                            "text": action_text,
                        },
                        "contents": [
                            {
                                "type": "text",
                                "text": "🔍 เช็ครอบเวลาว่าง",
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

        full_hero_url = resolve_public_image_url(image_url, base_url=base_url, host=host)
        if full_hero_url:
            bubble["hero"] = {
                "type": "image",
                "url": full_hero_url,
                "size": "full",
                "aspectRatio": "3:4",
                "aspectMode": "cover",
            }

        cards.append(bubble)

    return {
        "type": "flex",
        "altText": "🗓️ กรุณาเลือกงานที่ต้องการเช็คตารางคิว",
        "contents": {
            "type": "carousel",
            "contents": cards,
        },
    }


def build_cameras_flex(active_cameras: list, event_name: str, date: str, base_url: str | None = None, host: str | None = None) -> dict:
    bg_colors = ["#FEE1E8", "#E8D8F8", "#D8F0F8", "#F8F3D8"]
    cards = []

    for idx, cam in enumerate(active_cameras):
        desc_lines = (
            [line for line in cam.description.split("\n") if line.strip()]
            if cam.description
            else ["• บริการถ่ายภาพคุณภาพสูง"]
        )
        btn_bg = bg_colors[idx % len(bg_colors)]

        desc_contents = [
            {
                "type": "text",
                "text": line if line.startswith("•") else f"• {line}",
                "size": "xs",
                "color": "#555555",
                "wrap": True,
            }
            for line in desc_lines
        ]

        card = {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                    {"type": "text", "text": cam.name, "weight": "bold", "size": "md", "color": "#111111", "wrap": True},
                    {"type": "text", "text": cam.price_info, "weight": "bold", "size": "lg", "color": "#F4A0B5"},
                    {"type": "separator"},
                    {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "xs",
                        "contents": desc_contents,
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "vertical",
                        "backgroundColor": btn_bg,
                        "cornerRadius": "md",
                        "paddingAll": "md",
                        "action": {
                            "type": "message",
                            "label": f"เลือก {cam.name}"[:20],
                            "text": f"[เลือกกล้อง] {cam.name} | งาน: {event_name} ({date})",
                        },
                        "contents": [
                            {
                                "type": "text",
                                "text": "เลือก",
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

        full_cam_url = resolve_public_image_url(cam.image_url, base_url=base_url, host=host)
        if full_cam_url:
            card["hero"] = {
                "type": "image",
                "url": full_cam_url,
                "size": "full",
                "aspectRatio": "16:9",
                "aspectMode": "cover",
            }

        cards.append(card)

    return {
        "type": "flex",
        "altText": "📸 กรุณาเลือกกล้องที่ต้องการถ่าย",
        "contents": {
            "type": "carousel",
            "contents": cards,
        },
    }


def build_multi_day_date_buttons_flex(event_name: str, unique_dates: list[str]) -> dict:
    date_buttons = [
        {
            "type": "box",
            "layout": "vertical",
            "backgroundColor": "#FEE1E8",
            "cornerRadius": "md",
            "paddingAll": "md",
            "margin": "sm",
            "action": {
                "type": "message",
                "label": f"วันที่ {d}"[:20],
                "text": f"[ดูคิว] งาน: {event_name} ({d})",
            },
            "contents": [
                {
                    "type": "text",
                    "text": f"🗓️ วันที่ {d}",
                    "align": "center",
                    "color": "#000000",
                    "weight": "bold",
                    "size": "sm",
                }
            ],
        }
        for d in unique_dates[:10]
    ]

    return {
        "type": "flex",
        "altText": f"🗓️ กรุณาเลือกวันสำหรับงาน {event_name}",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": [
                    {"type": "text", "text": "🗓️ เลือกรอบวันที่ต้องการ", "weight": "bold", "size": "md", "color": "#111111"},
                    {"type": "text", "text": f"งาน: {event_name}", "size": "sm", "color": "#555555", "wrap": True},
                    {"type": "separator", "margin": "md"},
                    {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "xs",
                        "contents": date_buttons,
                    },
                ],
            },
        },
    }

