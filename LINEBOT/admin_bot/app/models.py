from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, JSON
from .database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="available")
    event_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    slots = Column(JSON, nullable=False, default=list)
    created_at = Column(BigInteger, nullable=False)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String, nullable=False, index=True)
    event_name = Column(String, nullable=False)
    time_slot = Column(String, nullable=False)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    line_display_name = Column(String, nullable=True)
    line_user_id = Column(String, nullable=True)
    camera_type = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")
    payment_status = Column(String, nullable=False, default="unpaid")
    deposit_amount = Column(Integer, default=0)
    remaining_amount = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(BigInteger, nullable=False)


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    price_info = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(BigInteger, nullable=False)


class LineSession(Base):
    __tablename__ = "line_sessions"

    line_user_id = Column(String, primary_key=True, index=True)
    event_name = Column(String, nullable=True)
    date = Column(String, nullable=True)
    camera_type = Column(String, nullable=True)
    step = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    payment_type = Column(String, nullable=True)
    updated_at = Column(BigInteger, nullable=False)


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    line_user_id = Column(String, primary_key=True, index=True)
    step = Column(String, nullable=False)
    draft_booking = Column(JSON, nullable=False, default=dict)
    updated_at = Column(BigInteger, nullable=False)

