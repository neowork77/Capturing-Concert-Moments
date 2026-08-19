import { db } from '@/db/db';
import { schedules } from '@/db/schema';
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
  slots: { time: string; status: SlotStatus }[];
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
 */
export async function getCalendarScheduleData(): Promise<Record<string, DaySchedule>> {
  const records = await db.select().from(schedules).orderBy(asc(schedules.date));
  
  const scheduleData: Record<string, DaySchedule> = {};
  
  for (const record of records) {
    scheduleData[record.date.trim()] = {
      status: (record.status?.toLowerCase().trim() || 'unavailable') as DayStatus,
      ...(record.eventName?.trim() && { eventName: record.eventName.trim() }),
      ...(record.location?.trim() && { location: record.location.trim() }),
      ...(record.imageUrl?.trim() && { imageUrl: record.imageUrl.trim() }),
      slots: (record.slots || []) as TimeSlot[],
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
 * Update slot status or schedule status in Supabase
 */
export async function updateScheduleSlotStatus(
  date: string,
  eventName: string,
  timeSlot: string,
  newStatus: SlotStatus
): Promise<boolean> {
  const records = await db
    .select()
    .from(schedules)
    .where(eq(schedules.date, date));

  const target = records.find(r => r.eventName === eventName || !eventName);
  if (!target) return false;

  const currentSlots = (target.slots || []) as TimeSlot[];
  const updatedSlots = currentSlots.map(s => 
    s.time.replace(/\s+/g, '') === timeSlot.replace(/\s+/g, '') 
      ? { ...s, status: newStatus } 
      : s
  );

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
