import re
import hmac
import hashlib
import base64
from datetime import datetime
import zoneinfo

BANGKOK_TZ = zoneinfo.ZoneInfo("Asia/Bangkok")

TIME_SLOTS = [
    "11:00-11:20", "11:30-11:50",
    "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
    "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
    "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
]


def format_phone_number(phone_str: str) -> str:
    """Format phone string into 081-234-5678 or 02-123-4567."""
    cleaned = re.sub(r'\D', '', phone_str or '')
    if len(cleaned) == 10:
        return f"{cleaned[:3]}-{cleaned[3:6]}-{cleaned[6:]}"
    elif len(cleaned) == 9:
        return f"0{cleaned[:2]}-{cleaned[2:5]}-{cleaned[5:]}"
    return phone_str


def get_today_thailand_date_string() -> str:
    """Return today's date in Thailand timezone (Asia/Bangkok) as YYYY-MM-DD."""
    return datetime.now(BANGKOK_TZ).strftime("%Y-%m-%d")


def format_thai_datetime(unix_timestamp: int | float | None) -> str:
    """Format Unix timestamp to Thai localized date and time string."""
    if not unix_timestamp:
        return "—"
    ms = unix_timestamp * 1000 if unix_timestamp < 10000000000 else unix_timestamp
    dt = datetime.fromtimestamp(ms / 1000, tz=BANGKOK_TZ)
    thai_months = [
        "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ]
    year_be = (dt.year + 543) % 100
    return f"{dt.day} {thai_months[dt.month]} {year_be:02d} {dt.hour:02d}:{dt.minute:02d}"


def format_baht(amount: int | float | None) -> str:
    """Format amount to Thai Baht currency, e.g. ฿1,500."""
    if amount is None:
        return "—"
    return f"฿{amount:,.0f}"


def verify_line_signature(body: bytes | str, signature: str | None, channel_secret: str | None) -> bool:
    """Verify LINE Webhook Signature securely with HMAC-SHA256."""
    if not signature or not channel_secret:
        return False
    if isinstance(body, str):
        body_bytes = body.encode('utf-8')
    else:
        body_bytes = body
    secret_bytes = channel_secret.encode('utf-8')
    computed_digest = hmac.new(secret_bytes, body_bytes, hashlib.sha256).digest()
    expected_signature = base64.b64encode(computed_digest).decode('utf-8')
    return hmac.compare_digest(expected_signature, signature)


def resolve_public_image_url(
    raw_image_url: str | None,
    base_url: str | None = None,
    host: str | None = None
) -> str | None:
    """Format image URL for LINE Flex Message hero images."""
    if not raw_image_url or not raw_image_url.strip():
        return None
    cleaned = raw_image_url.strip()

    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        if cleaned.startswith("http://") and "localhost" not in cleaned and "127.0.0.1" not in cleaned:
            return "https://" + cleaned[7:]
        return cleaned

    resolved_host = None
    if base_url and not any(x in base_url for x in ["localhost", "127.0.0.1", "example.com", "yourdomain"]):
        clean_env = re.sub(r'^https?://', '', base_url).rstrip('/')
        if clean_env and "ngrok" not in (host or ""):
            resolved_host = clean_env

    if not resolved_host and host and "localhost" not in host and "127.0.0.1" not in host:
        resolved_host = host

    if not resolved_host:
        return None

    clean_path = cleaned if cleaned.startswith('/') else f'/{cleaned}'
    return f"https://{resolved_host}{clean_path}"

