import re
from sqlalchemy.orm import Session
from ..models import Schedule
from .utils import TIME_SLOTS, get_today_thailand_date_string

DEFAULT_TIME_SLOTS = TIME_SLOTS


def get_all_schedule_records(db: Session) -> list[Schedule]:
    return db.query(Schedule).order_by(Schedule.date.asc()).all()


def get_available_schedule_records(db: Session) -> list[Schedule]:
    today = get_today_thailand_date_string()
    records = db.query(Schedule).filter(Schedule.status == "available").order_by(Schedule.date.asc()).all()
    return [r for r in records if r.date and r.date.strip() >= today]


def update_schedule_slot_status(
    db: Session,
    target_date: str,
    target_event_name: str,
    time_slot: str,
    new_status: str = "booked",
    camera_type: str | None = None,
) -> bool:
    records = db.query(Schedule).filter(Schedule.date == target_date.strip()).all()
    if not records:
        return False

    norm_target_event = re.sub(r'[\u2018\u2019\u201C\u201D\'"]', '', target_event_name or '').strip().lower()
    target_record = None

    for r in records:
        if not norm_target_event:
            target_record = r
            break
        r_name = re.sub(r'[\u2018\u2019\u201C\u201D\'"]', '', r.event_name or '').strip().lower()
        if r_name == norm_target_event or r_name in norm_target_event or norm_target_event in r_name:
            target_record = r
            break

    if not target_record:
        target_record = records[0]

    clean_target_slot = re.sub(r'\s+', '', time_slot)
    current_slots = list(target_record.slots or [])

    found = False
    updated_slots = []
    for s in current_slots:
        s_copy = dict(s)
        s_time = re.sub(r'\s+', '', s_copy.get("time", ""))
        if s_time == clean_target_slot:
            found = True
            cam_statuses = dict(s_copy.get("cameraStatuses") or {})
            if camera_type and camera_type != "all":
                cam_statuses[camera_type.strip()] = new_status

            effective_status = s_copy.get("status", "available")
            if not camera_type or camera_type == "all":
                effective_status = new_status
            else:
                cam_keys = list(cam_statuses.keys())
                if new_status == "booked" and cam_keys and all(cam_statuses[k] == "booked" for k in cam_keys):
                    effective_status = "booked"
                elif new_status == "available":
                    effective_status = "available"

            s_copy["status"] = effective_status
            if cam_statuses:
                s_copy["cameraStatuses"] = cam_statuses
        updated_slots.append(s_copy)

    if not found:
        cam_statuses = {}
        if camera_type and camera_type != "all":
            cam_statuses[camera_type.strip()] = new_status
        new_slot_obj = {
            "time": time_slot.strip(),
            "status": new_status if (not camera_type or camera_type == "all") else "available",
        }
        if cam_statuses:
            new_slot_obj["cameraStatuses"] = cam_statuses
        updated_slots.append(new_slot_obj)

    target_record.slots = updated_slots
    db.commit()
    return True

