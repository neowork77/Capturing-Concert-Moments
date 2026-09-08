import time
from sqlalchemy.orm import Session
from ..models import Camera

DEFAULT_CAMERAS = [
    {
        "name": "RICOH GR IIIx + Flash",
        "price_info": "฿219 / 20 นาที",
        "image_url": "/assets/Ricohgr3x.webp",
        "description": "• ไม่จำกัดจำนวนรูป\n• สวยจบหลังกล้อง โทนภาพคมชัด\n• รับรูปภายในวันหลังงานจบ",
        "is_active": True,
    },
    {
        "name": "Fujifilm instax mini 11",
        "price_info": "฿65 / 1 รูป",
        "image_url": "/assets/fujiinstax11.webp",
        "description": "• กล้องโพลารอยด์ ได้รูปจริงทันที\n• โทนภาพฟิล์ม คลาสสิก มีเอกลักษณ์\n• เหมาะรับรูปเป็นของที่ระลึกกลับบ้าน",
        "is_active": True,
    },
]


def seed_default_cameras_if_empty(db: Session) -> None:
    try:
        count = db.query(Camera).count()
        if count == 0:
            now_unix = int(time.time())
            for cam in DEFAULT_CAMERAS:
                new_cam = Camera(
                    name=cam["name"],
                    price_info=cam["price_info"],
                    image_url=cam["image_url"],
                    description=cam["description"],
                    is_active=cam["is_active"],
                    created_at=now_unix,
                )
                db.add(new_cam)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to seed default cameras: {e}")


def get_active_cameras(db: Session) -> list[Camera]:
    seed_default_cameras_if_empty(db)
    return db.query(Camera).filter(Camera.is_active.is_(True)).order_by(Camera.id.asc()).all()


def get_all_cameras(db: Session) -> list[Camera]:
    seed_default_cameras_if_empty(db)
    return db.query(Camera).order_by(Camera.id.asc()).all()

