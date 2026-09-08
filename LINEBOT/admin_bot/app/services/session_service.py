import time
from sqlalchemy.orm import Session
from ..models import AdminSession, LineSession


def get_admin_session(db: Session, line_user_id: str) -> dict | None:
    if not line_user_id:
        return None
    session = db.query(AdminSession).filter(AdminSession.line_user_id == line_user_id).first()
    if not session:
        return None
    return {
        "lineUserId": session.line_user_id,
        "step": session.step,
        "draftBooking": session.draft_booking,
        "updatedAt": session.updated_at,
    }


def set_admin_session(db: Session, line_user_id: str, step: str, draft_booking: dict) -> None:
    if not line_user_id:
        return
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


def register_admin_user_id(db: Session, line_user_id: str) -> None:
    if not line_user_id:
        return
    now_unix = int(time.time())
    existing = db.query(AdminSession).filter(AdminSession.line_user_id == line_user_id).first()
    if not existing:
        new_session = AdminSession(
            line_user_id=line_user_id,
            step="awaiting_final_confirmation",
            draft_booking={},
            updated_at=now_unix,
        )
        db.add(new_session)
        db.commit()


def clear_line_user_session(db: Session, line_user_id: str) -> None:
    if not line_user_id:
        return
    db.query(LineSession).filter(LineSession.line_user_id == line_user_id).delete()
    db.commit()

