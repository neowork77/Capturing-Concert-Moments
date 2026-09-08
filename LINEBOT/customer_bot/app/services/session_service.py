import time
from sqlalchemy.orm import Session
from ..models import LineSession, AdminSession
from ..config import settings


def get_line_user_session(db: Session, line_user_id: str) -> dict | None:
    if not line_user_id:
        return None
    session = db.query(LineSession).filter(LineSession.line_user_id == line_user_id).first()
    if not session:
        return None
    return {
        "eventName": session.event_name,
        "date": session.date,
        "cameraType": session.camera_type,
        "step": session.step,
        "timeSlot": session.time_slot,
        "customerName": session.customer_name,
        "customerPhone": session.customer_phone,
        "paymentType": session.payment_type,
    }


def set_line_user_session(db: Session, line_user_id: str, updates: dict) -> None:
    if not line_user_id:
        return
    now_unix = int(time.time())
    session = db.query(LineSession).filter(LineSession.line_user_id == line_user_id).first()
    if session:
        if "eventName" in updates:
            session.event_name = updates["eventName"]
        if "date" in updates:
            session.date = updates["date"]
        if "cameraType" in updates:
            session.camera_type = updates["cameraType"]
        if "step" in updates:
            session.step = updates["step"]
        if "timeSlot" in updates:
            session.time_slot = updates["timeSlot"]
        if "customerName" in updates:
            session.customer_name = updates["customerName"]
        if "customerPhone" in updates:
            session.customer_phone = updates["customerPhone"]
        if "paymentType" in updates:
            session.payment_type = updates["paymentType"]
        session.updated_at = now_unix
    else:
        new_session = LineSession(
            line_user_id=line_user_id,
            event_name=updates.get("eventName"),
            date=updates.get("date"),
            camera_type=updates.get("cameraType"),
            step=updates.get("step"),
            time_slot=updates.get("timeSlot"),
            customer_name=updates.get("customerName"),
            customer_phone=updates.get("customerPhone"),
            payment_type=updates.get("paymentType"),
            updated_at=now_unix,
        )
        db.add(new_session)
    db.commit()


def clear_line_user_session(db: Session, line_user_id: str) -> None:
    if not line_user_id:
        return
    db.query(LineSession).filter(LineSession.line_user_id == line_user_id).delete()
    db.commit()


def get_latest_admin_user_id(db: Session) -> str | None:
    if settings.LINE_ADMIN_USER_ID:
        return settings.LINE_ADMIN_USER_ID
    latest = db.query(AdminSession).order_by(AdminSession.updated_at.desc()).first()
    return latest.line_user_id if latest else None


def set_admin_session(db: Session, line_user_id: str, step: str, draft_booking: dict) -> None:
    now_unix = int(time.time())
    session = db.query(AdminSession).filter(AdminSession.line_user_id == line_user_id).first()
    if session:
        session.step = step
        session.draft_booking = draft_booking
        session.updated_at = now_unix
    else:
        new_session = AdminSession(
            line_user_id=line_user_id,
            step=step,
            draft_booking=draft_booking,
            updated_at=now_unix,
        )
        db.add(new_session)
    db.commit()


def clear_admin_session(db: Session, line_user_id: str) -> None:
    if not line_user_id:
        return
    db.query(AdminSession).filter(AdminSession.line_user_id == line_user_id).delete()
    db.commit()

