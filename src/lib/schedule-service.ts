import { db } from '@/db/db';
import { bookings, schedules } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { DaySchedule, DayStatus, SlotStatus, TimeSlot } from '@/data/schedule';
import { getTodayThailandDateString } from '@/lib/line-utils';

export interface ScheduleRecord {
  id: number;
  date: string;
  status: string;
  eventName: string | null;
  location: string | null;
  imageUrl: string | null;
  slots: TimeSlot[];
  createdAt: number;
}

export const DEFAULT_TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

/**
 * Fetch all schedules mapped to Record<string, DaySchedule> for Frontend Calendar
 * Seamlessly merges manual slot locks and active customer bookings
 */
export async function getCalendarScheduleData(): Promise<Record<string, DaySchedule>> {
  const [records, allBookings] = await Promise.all([
    db.select().from(schedules).orderBy(asc(schedules.date)),
    db.select().from(bookings),
  ]);

  const scheduleData: Record<string, DaySchedule> = {};

  for (const record of records) {
    const normDate = record.date.trim();
    const eventBookings = allBookings.filter(b => b.date.trim() === normDate && b.status !== 'cancelled');
    const bookedSlotsSet = new Set(eventBookings.map(b => (b.timeSlot || '').replace(/\s+/g, '')));

    const currentSlots = (record.slots || []) as TimeSlot[];
    const baseSlots: TimeSlot[] = currentSlots.length > 0
      ? currentSlots
      : DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available' as SlotStatus }));

    const mergedSlots: TimeSlot[] = baseSlots.map(s => {
      const cleanTime = s.time.replace(/\s+/g, '');
      const isBooked = s.status === 'booked' || bookedSlotsSet.has(cleanTime);
      return {
        time: s.time,
        status: isBooked ? ('booked' as SlotStatus) : ('available' as SlotStatus),
        cameraStatuses: s.cameraStatuses,
      };
    });

    const isExplicitFull = record.status?.toLowerCase().trim() === 'full';
    const isAllSlotsBooked = mergedSlots.length > 0 && mergedSlots.every(s => s.status === 'booked');
    const isDayFull = isExplicitFull || isAllSlotsBooked;

    let dayStatus: DayStatus = 'available';
    if (record.status?.toLowerCase().trim() === 'unavailable') {
      dayStatus = 'unavailable';
    } else if (isDayFull) {
      dayStatus = 'booked';
    }

    scheduleData[normDate] = {
      status: dayStatus,
      ...(record.eventName?.trim() && { eventName: record.eventName.trim() }),
      ...(record.location?.trim() && { location: record.location.trim() }),
      ...(record.imageUrl?.trim() && { imageUrl: record.imageUrl.trim() }),
      slots: mergedSlots,
    };
  }

  return scheduleData;
}

/**
 * Fetch raw schedule records (used by LINE Webhook & Admin)
 */
export async function getAllScheduleRecords(): Promise<ScheduleRecord[]> {
  const records = await db.select().from(schedules).orderBy(asc(schedules.date));
  return records as ScheduleRecord[];
}

/**
 * Fetch available schedule records (excluding past dates)
 */
export async function getAvailableScheduleRecords(): Promise<ScheduleRecord[]> {
  const today = getTodayThailandDateString();
  const records = await db
    .select()
    .from(schedules)
    .where(eq(schedules.status, 'available'))
    .orderBy(asc(schedules.date));
  
  const activeRecords = records.filter(r => r.date.trim() >= today);
  return activeRecords as ScheduleRecord[];
}

/**
 * Update slot status or schedule status in Supabase (with camera support)
 */
export async function updateScheduleSlotStatus(
  scheduleIdOrDate: number | string,
  eventNameOrSlotTime: string,
  timeSlotOrNewStatus: string | SlotStatus,
  optionalNewStatusOrCamera?: SlotStatus | string,
  optionalCameraType?: string
): Promise<boolean> {
  let targetId: number | null = null;
  let targetDate: string = '';
  let targetEventName: string = '';
  let timeSlot: string = '';
  let newStatus: SlotStatus = 'available';
  let cameraType: string | undefined = undefined;

  if (typeof scheduleIdOrDate === 'number') {
    targetId = scheduleIdOrDate;
    timeSlot = eventNameOrSlotTime;
    newStatus = timeSlotOrNewStatus as SlotStatus;
    if (typeof optionalNewStatusOrCamera === 'string') {
      cameraType = optionalNewStatusOrCamera;
    }
  } else {
    targetDate = scheduleIdOrDate;
    targetEventName = eventNameOrSlotTime;
    timeSlot = timeSlotOrNewStatus as string;
    newStatus = optionalNewStatusOrCamera as SlotStatus;
    cameraType = optionalCameraType;
  }

  let target: any = null;
  if (targetId) {
    const [record] = await db.select().from(schedules).where(eq(schedules.id, targetId));
    target = record;
  } else if (targetDate) {
    const records = await db.select().from(schedules).where(eq(schedules.date, targetDate));
    target = records.find(r => r.eventName === targetEventName || !targetEventName) || records[0];
  }

  if (!target) return false;

  const cleanTargetSlot = timeSlot.replace(/\s+/g, '');
  const currentSlots = (target.slots || []) as TimeSlot[];

  let found = false;
  const updatedSlots = currentSlots.map(s => {
    if (s.time.replace(/\s+/g, '') === cleanTargetSlot) {
      found = true;
      const updatedCamStatuses = { ...(s.cameraStatuses || {}) };
      if (cameraType && cameraType !== 'all') {
        updatedCamStatuses[cameraType.trim()] = newStatus;
      }
      return {
        ...s,
        status: (!cameraType || cameraType === 'all') ? newStatus : s.status,
        ...(cameraType && cameraType !== 'all' ? { cameraStatuses: updatedCamStatuses } : {}),
      };
    }
    return s;
  });

  if (!found) {
    const camStatuses: Record<string, SlotStatus> = {};
    if (cameraType && cameraType !== 'all') {
      camStatuses[cameraType.trim()] = newStatus;
    }
    updatedSlots.push({
      time: timeSlot.trim(),
      status: (!cameraType || cameraType === 'all') ? newStatus : 'available',
      ...(cameraType && cameraType !== 'all' ? { cameraStatuses: camStatuses } : {}),
    });
  }

  await db
    .update(schedules)
    .set({ slots: updatedSlots })
    .where(eq(schedules.id, target.id));

  return true;
}

/**
 * Create or Update a full schedule record (Admin CRUD)
 */
export async function upsertSchedule(data: {
  id?: number;
  date: string;
  status: string;
  eventName?: string;
  location?: string;
  imageUrl?: string;
  slots?: TimeSlot[];
}): Promise<ScheduleRecord> {
  const defaultSlots: TimeSlot[] = DEFAULT_TIME_SLOTS.map(time => ({
    time,
    status: 'available' as SlotStatus
  }));

  const slotsToSave = data.slots && data.slots.length > 0 ? data.slots : defaultSlots;
  const nowUnix = Math.floor(Date.now() / 1000);

  if (data.id) {
    const [updated] = await db
      .update(schedules)
      .set({
        date: data.date,
        status: data.status,
        eventName: data.eventName || null,
        location: data.location || null,
        imageUrl: data.imageUrl || null,
        slots: slotsToSave,
      })
      .where(eq(schedules.id, data.id))
      .returning();
    return updated as ScheduleRecord;
  } else {
    const [inserted] = await db
      .insert(schedules)
      .values({
        date: data.date,
        status: data.status,
        eventName: data.eventName || null,
        location: data.location || null,
        imageUrl: data.imageUrl || null,
        slots: slotsToSave,
        createdAt: nowUnix,
      })
      .returning();
    return inserted as ScheduleRecord;
  }
}

/**
 * Delete a schedule record (Admin CRUD)
 */
export async function deleteSchedule(id: number): Promise<boolean> {
  await db.delete(schedules).where(eq(schedules.id, id));
  return true;
}
