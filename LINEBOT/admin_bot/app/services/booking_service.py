import time
import re
from sqlalchemy.orm import Session
from ..models import Booking
from .schedule_service import update_schedule_slot_status


def get_all_bookings(db: Session) -> list[Booking]:
    return db.query(Booking).order_by(Booking.id.desc()).all()


def create_booking(db: Session, data: dict) -> Booking:
    now_unix = int(time.time())
    norm_date = data["date"].strip()
    norm_event = data["eventName"].strip()
    norm_slot = re.sub(r'\s+', '', data["timeSlot"])
    norm_cam = (data.get("cameraType") or "").strip()

    existing_bookings = db.query(Booking).filter(Booking.date == norm_date).all()
    for b in existing_bookings:
        if b.status == "cancelled":
            continue
        same_event = not norm_event or not b.event_name or b.event_name.strip() == norm_event
        same_slot = re.sub(r'\s+', '', b.time_slot or "") == norm_slot
        b_cam = (b.camera_type or "").strip()
        same_cam = not norm_cam or not b_cam or norm_cam.lower() == b_cam.lower()

        if same_event and same_slot and same_cam:
            raise ValueError(f"รอบเวลา {data['timeSlot']} น. สำหรับกล้อง {norm_cam or 'รุ่นนี้'} มีผู้ทำรายการจองคิวไว้แล้ว")

    new_booking = Booking(
        date=norm_date,
        event_name=norm_event,
        time_slot=data["timeSlot"].strip(),
        customer_name=data["customerName"].strip(),
        customer_phone=data["customerPhone"].strip(),
        line_display_name=data.get("lineDisplayName"),
        line_user_id=data.get("lineUserId"),
        camera_type=data.get("cameraType"),
        status=data.get("status", "pending"),
        payment_status=data.get("paymentStatus", "unpaid"),
        deposit_amount=data.get("depositAmount", 0),
        remaining_amount=data.get("remainingAmount", 0),
        notes=data.get("notes"),
        created_at=now_unix,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    if new_booking.status != "cancelled":
        try:
            update_schedule_slot_status(
                db=db,
                target_date=norm_date,
                target_event_name=norm_event,
                time_slot=data["timeSlot"],
                new_status="booked",
                camera_type=data.get("cameraType"),
            )
        except Exception as e:
            print(f"Warning: could not auto-sync slot status to schedules: {e}")

    return new_booking


def update_booking_status(
    db: Session,
    booking_id: int,
    status: str | None = None,
    notes: str | None = None,
    payment_status: str | None = None,
    deposit_amount: int | None = None,
    remaining_amount: int | None = None,
) -> bool:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return False

    if status is not None:
        booking.status = status
    if notes is not None:
        booking.notes = notes
    if payment_status is not None:
        booking.payment_status = payment_status
    if deposit_amount is not None:
        booking.deposit_amount = deposit_amount
    if remaining_amount is not None:
        booking.remaining_amount = remaining_amount

    db.commit()

    if status == "cancelled":
        try:
            other_bookings = db.query(Booking).filter(Booking.date == booking.date).all()
            clean_slot = re.sub(r'\s+', '', booking.time_slot or "")
            existing_cam_norm = (booking.camera_type or "").strip().lower()

            has_other_active = any(
                b.id != booking_id and b.status != "cancelled" and
                re.sub(r'\s+', '', b.time_slot or "") == clean_slot and
                (not existing_cam_norm or not (b.camera_type or "").strip() or (b.camera_type or "").strip().lower() == existing_cam_norm)
                for b in other_bookings
            )

            if not has_other_active:
                update_schedule_slot_status(
                    db=db,
                    target_date=booking.date,
                    target_event_name=booking.event_name,
                    time_slot=booking.time_slot,
                    new_status="available",
                    camera_type=booking.camera_type or None,
                )
        except Exception as e:
            print(f"Warning: could not sync slot on cancellation: {e}")
    elif status in ["confirmed", "pending"]:
        try:
            update_schedule_slot_status(
                db=db,
                target_date=booking.date,
                target_event_name=booking.event_name,
                time_slot=booking.time_slot,
                new_status="booked",
                camera_type=booking.camera_type or None,
            )
        except Exception as e:
            print(f"Warning: could not sync slot on update: {e}")

    return True


def confirm_or_create_booking(db: Session, data: dict) -> Booking:
    booking_id = data.get("bookingId")
    norm_date = data["date"].strip()
    norm_event = data["eventName"].strip()
    norm_slot = re.sub(r'\s+', '', data["timeSlot"])
    norm_cam = (data.get("cameraType") or "").strip().lower()

    if booking_id:
        existing = db.query(Booking).filter(Booking.id == booking_id).first()
        if existing:
            existing.status = data.get("status", "confirmed")
            existing.payment_status = data.get("paymentStatus", "paid")
            if data.get("depositAmount") is not None:
                existing.deposit_amount = data["depositAmount"]
            if data.get("remainingAmount") is not None:
                existing.remaining_amount = data["remainingAmount"]
            if data.get("notes") is not None:
                existing.notes = data["notes"]
            db.commit()
            db.refresh(existing)

            if existing.status != "cancelled":
                try:
                    update_schedule_slot_status(
                        db=db,
                        target_date=norm_date,
                        target_event_name=norm_event,
                        time_slot=data["timeSlot"],
                        new_status="booked",
                        camera_type=data.get("cameraType"),
                    )
                except Exception as e:
                    print(f"Warning: could not sync slot on confirm: {e}")
            return existing

    # Check for pending booking
    existing_bookings = db.query(Booking).filter(Booking.date == norm_date).all()
    pending = None
    for b in existing_bookings:
        if b.status != "pending":
            continue
        same_event = not norm_event or not b.event_name or b.event_name.strip() == norm_event
        same_slot = re.sub(r'\s+', '', b.time_slot or "") == norm_slot
        b_cam = (b.camera_type or "").strip().lower()
        same_cam = not norm_cam or not b_cam or norm_cam == b_cam
        if same_event and same_slot and same_cam:
            pending = b
            break

    if pending:
        pending.status = data.get("status", "confirmed")
        pending.payment_status = data.get("paymentStatus", "paid")
        if data.get("depositAmount") is not None:
            pending.deposit_amount = data["depositAmount"]
        if data.get("remainingAmount") is not None:
            pending.remaining_amount = data["remainingAmount"]
        if data.get("notes") is not None:
            pending.notes = data["notes"]
        pending.customer_name = data["customerName"].strip()
        pending.customer_phone = data["customerPhone"].strip()
        if data.get("lineDisplayName"):
            pending.line_display_name = data["lineDisplayName"]
        if data.get("lineUserId"):
            pending.line_user_id = data["lineUserId"]
        db.commit()
        db.refresh(pending)

        if pending.status != "cancelled":
            try:
                update_schedule_slot_status(
                    db=db,
                    target_date=norm_date,
                    target_event_name=norm_event,
                    time_slot=data["timeSlot"],
                    new_status="booked",
                    camera_type=data.get("cameraType"),
                )
            except Exception as e:
                print(f"Warning: could not sync slot on confirm: {e}")
        return pending

    return create_booking(db, data)


def cancel_pending_booking_if_exists(db: Session, draft: dict) -> bool:
    booking_id = draft.get("bookingId")
    if booking_id:
        return update_booking_status(db, booking_id, status="cancelled")

    norm_date = draft["date"].strip()
    norm_event = draft["eventName"].strip()
    norm_slot = re.sub(r'\s+', '', draft["timeSlot"])
    norm_cam = (draft.get("cameraType") or "").strip().lower()

    existing_bookings = db.query(Booking).filter(Booking.date == norm_date).all()
    for b in existing_bookings:
        if b.status != "pending":
            continue
        same_event = not norm_event or not b.event_name or b.event_name.strip() == norm_event
        same_slot = re.sub(r'\s+', '', b.time_slot or "") == norm_slot
        b_cam = (b.camera_type or "").strip().lower()
        same_cam = not norm_cam or not b_cam or norm_cam == b_cam
        if same_event and same_slot and same_cam:
            return update_booking_status(db, b.id, status="cancelled")

    return False

