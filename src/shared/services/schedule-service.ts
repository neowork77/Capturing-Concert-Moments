import { db } from '@/db/db';
import { bookings, schedules } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  DaySchedule,
  DayStatus,
  SlotStatus,
  TimeSlot,
  ScheduleRecord,
  DEFAULT_TIME_SLOTS,
  parseSlotMinutes,
  sortTimeSlots,
} from '@/shared/types/schedule';
import { getTodayThailandDateString } from '@/shared/utils/format-utils';
import { getActiveCameras } from '@/shared/services/camera-service';
import { isSameCamera } from '@/shared/utils/camera-utils';

export type { ScheduleRecord };
export { DEFAULT_TIME_SLOTS, parseSlotMinutes, sortTimeSlots };


/**
 * Fetch all schedules mapped to Record<string, DaySchedule> for Frontend Calendar
 * Seamlessly merges manual slot locks and active customer bookings
 */
export async function getCalendarScheduleData(): Promise<Record<string, DaySchedule>> {
  const [records, allBookings, activeCameras] = await Promise.all([
    db.select().from(schedules).orderBy(asc(schedules.date)),
    db.select().from(bookings),
    getActiveCameras(),
  ]);

  const activeCamNames = activeCameras.map(c => c.name);
  const scheduleData: Record<string, DaySchedule> = {};

  for (const record of records) {
    const normDate = record.date.trim();
    const eventBookings = allBookings.filter(b => b.date.trim() === normDate && b.status !== 'cancelled');

    // Group active bookings by clean time slot
    const bookingsByCleanSlot = new Map<string, typeof allBookings>();
    eventBookings.forEach(b => {
      const cleanTime = (b.timeSlot || '').replace(/\s+/g, '');
      const list = bookingsByCleanSlot.get(cleanTime) || [];
      list.push(b);
      bookingsByCleanSlot.set(cleanTime, list);
    });

    const currentSlots = (record.slots || []) as TimeSlot[];
    const baseSlots: TimeSlot[] = currentSlots.length > 0
      ? currentSlots
      : DEFAULT_TIME_SLOTS.map(t => ({ time: t, status: 'available' as SlotStatus }));

    const mergedSlots: TimeSlot[] = baseSlots.map(s => {
      const cleanTime = s.time.replace(/\s+/g, '');
      const slotBookings = bookingsByCleanSlot.get(cleanTime) || [];

      // Merge cameraStatuses if present
      const camStatuses = { ...(s.cameraStatuses || {}) };
      slotBookings.forEach(b => {
        if (b.cameraType && b.cameraType.trim()) {
          const matchedCam = activeCamNames.find(c => isSameCamera(c, b.cameraType));
          const camKey = matchedCam || b.cameraType.trim();
          camStatuses[camKey] = 'booked';
        }
      });

      let isBooked = false;
      if ((s.status as string) === 'unavailable') {
        isBooked = true;
      } else if (activeCamNames.length > 0) {
        // Slot is only booked if EVERY active camera is booked
        const allCamerasBooked = activeCamNames.every(camName => {
          const hasBooking = slotBookings.some(b => isSameCamera(b.cameraType, camName));
          if (hasBooking) return true;
          const statusKey = Object.keys(camStatuses).find(k => isSameCamera(k, camName));
          if (statusKey && camStatuses[statusKey] === 'booked') return true;
          return false;
        });

        // Global manual lock only when no cameraStatuses exist at all and no bookings
        const manualGlobalLock = (s.status === 'booked') &&
          (!s.cameraStatuses || Object.keys(s.cameraStatuses).length === 0) &&
          slotBookings.length === 0;

        isBooked = allCamerasBooked || manualGlobalLock;
      } else {
        // If no camera statuses configured, any active booking marks the slot as booked
        isBooked = slotBookings.length > 0 || s.status === 'booked';
      }

      return {
        time: s.time,
        status: isBooked ? ('booked' as SlotStatus) : ('available' as SlotStatus),
        ...(Object.keys(camStatuses).length > 0 ? { cameraStatuses: camStatuses } : (s.cameraStatuses ? { cameraStatuses: s.cameraStatuses } : {})),
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

// In-memory cache for schedule records to speed up repeated queries and /admin page renders
let cachedScheduleRecords: { data: ScheduleRecord[]; expiresAt: number } | null = null;
const SCHEDULE_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateScheduleCache() {
  cachedScheduleRecords = null;
}

/**
 * Fetch raw schedule records (used by LINE Webhook & Admin)
 */
export async function getAllScheduleRecords(): Promise<ScheduleRecord[]> {
  const now = Date.now();
  if (cachedScheduleRecords && now < cachedScheduleRecords.expiresAt) {
    return cachedScheduleRecords.data;
  }

  const records = await db.select().from(schedules).orderBy(asc(schedules.date));
  const result = records as ScheduleRecord[];
  cachedScheduleRecords = { data: result, expiresAt: now + SCHEDULE_CACHE_TTL_MS };
  return result;
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

  let target: { id: number; slots: any; eventName?: string | null } | null = null;
  if (targetId) {
    // Only select minimal fields needed for slot status update
    const [record] = await db
      .select({ id: schedules.id, slots: schedules.slots })
      .from(schedules)
      .where(eq(schedules.id, targetId));
    target = record || null;
  } else if (targetDate) {
    const records = await db
      .select({ id: schedules.id, eventName: schedules.eventName, slots: schedules.slots })
      .from(schedules)
      .where(eq(schedules.date, targetDate));
    const normTargetEvent = (targetEventName || '').replace(/[\u2018\u2019\u201C\u201D'"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    target = records.find(r => {
      if (!normTargetEvent) return true;
      const rName = (r.eventName || '').replace(/[\u2018\u2019\u201C\u201D'"]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      return rName === normTargetEvent || rName.includes(normTargetEvent) || normTargetEvent.includes(rName);
    }) || records[0] || null;
  }

  if (!target) return false;

  const activeCameras = await getActiveCameras();
  const cleanTargetSlot = timeSlot.replace(/\s+/g, '');
  const currentSlots = (target.slots || []) as TimeSlot[];

  let found = false;
  const updatedSlots = currentSlots.map(s => {
    if (s.time.replace(/\s+/g, '') === cleanTargetSlot) {
      found = true;
      const updatedCamStatuses = { ...(s.cameraStatuses || {}) };
      let effectiveStatus: SlotStatus = s.status;

      if (!cameraType || cameraType === 'all') {
        effectiveStatus = newStatus;
        if (activeCameras.length > 0) {
          activeCameras.forEach(cam => {
            updatedCamStatuses[cam.name] = newStatus;
          });
        }
      } else {
        const targetCamTrim = cameraType.trim();
        // Remove any loose duplicate matching keys first
        Object.keys(updatedCamStatuses).forEach(k => {
          if (isSameCamera(k, targetCamTrim)) {
            delete updatedCamStatuses[k];
          }
        });
        updatedCamStatuses[targetCamTrim] = newStatus;

        if (newStatus === 'available') {
          effectiveStatus = 'available';
        } else if (activeCameras.length > 0) {
          const allCamsBooked = activeCameras.every(cam => {
            const k = Object.keys(updatedCamStatuses).find(ck => isSameCamera(ck, cam.name));
            return k ? updatedCamStatuses[k] === 'booked' : false;
          });
          effectiveStatus = allCamsBooked ? 'booked' : 'available';
        } else {
          effectiveStatus = 'available';
        }
      }

      return {
        ...s,
        status: effectiveStatus,
        ...(Object.keys(updatedCamStatuses).length > 0 ? { cameraStatuses: updatedCamStatuses } : {}),
      };
    }
    return s;
  });

  if (!found) {
    const camStatuses: Record<string, SlotStatus> = {};
    let initialStatus: SlotStatus = 'available';

    if (!cameraType || cameraType === 'all') {
      initialStatus = newStatus;
      if (activeCameras.length > 0) {
        activeCameras.forEach(cam => {
          camStatuses[cam.name] = newStatus;
        });
      }
    } else {
      camStatuses[cameraType.trim()] = newStatus;
      initialStatus = 'available';
    }

    updatedSlots.push({
      time: timeSlot.trim(),
      status: initialStatus,
      ...(Object.keys(camStatuses).length > 0 ? { cameraStatuses: camStatuses } : {}),
    });
  }

  await db
    .update(schedules)
    .set({ slots: updatedSlots })
    .where(eq(schedules.id, target.id));

  invalidateScheduleCache();
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
  invalidateScheduleCache();
  const defaultSlots: TimeSlot[] = DEFAULT_TIME_SLOTS.map(time => ({
    time,
    status: 'available' as SlotStatus
  }));

  const slotsToSave = data.slots && data.slots.length > 0 ? sortTimeSlots(data.slots) : defaultSlots;

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
  invalidateScheduleCache();
  await db.delete(schedules).where(eq(schedules.id, id));
  return true;
}

/**
 * Add a new time slot to an existing schedule record
 */
export async function addScheduleSlot(
  scheduleId: number,
  slotTime: string
): Promise<ScheduleRecord> {
  const normTime = slotTime.trim();
  if (!normTime) {
    throw new Error('กรุณาระบุรอบเวลา');
  }

  const [record] = await db.select().from(schedules).where(eq(schedules.id, scheduleId));
  if (!record) {
    throw new Error('ไม่พบข้อมูลตารางงาน');
  }

  const currentSlots = (record.slots || []) as TimeSlot[];
  const cleanTarget = normTime.replace(/\s+/g, '');

  const alreadyExists = currentSlots.some(
    s => s.time.replace(/\s+/g, '') === cleanTarget
  );
  if (alreadyExists) {
    throw new Error(`รอบเวลา "${normTime}" มีอยู่ในตารางนี้แล้ว`);
  }

  const newSlot: TimeSlot = {
    time: normTime,
    status: 'available',
  };

  const updatedSlots = sortTimeSlots([...currentSlots, newSlot]);

  const [updated] = await db
    .update(schedules)
    .set({ slots: updatedSlots })
    .where(eq(schedules.id, scheduleId))
    .returning();

  invalidateScheduleCache();
  return updated as ScheduleRecord;
}

/**
 * Remove a time slot from an existing schedule record
 * Checks whether any active booking uses this slot before removing
 */
export async function removeScheduleSlot(
  scheduleId: number,
  slotTime: string
): Promise<ScheduleRecord> {
  const normTime = slotTime.trim();
  const [record] = await db.select().from(schedules).where(eq(schedules.id, scheduleId));
  if (!record) {
    throw new Error('ไม่พบข้อมูลตารางงาน');
  }

  // Check active bookings on this date and slot
  const eventBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.date, record.date));

  const cleanTarget = normTime.replace(/\s+/g, '');
  const activeBookings = eventBookings.filter(
    b => b.status !== 'cancelled' && (b.timeSlot || '').replace(/\s+/g, '') === cleanTarget
  );

  if (activeBookings.length > 0) {
    throw new Error(
      `ไม่สามารถลบรอบเวลา "${normTime}" ได้ เนื่องจากมีรายการจองที่ใช้งานอยู่ (${activeBookings.length} รายการ) กรุณายกเลิกหรือย้ายรอบการจองก่อน`
    );
  }

  const currentSlots = (record.slots || []) as TimeSlot[];
  const updatedSlots = currentSlots.filter(
    s => s.time.replace(/\s+/g, '') !== cleanTarget
  );

  const [updated] = await db
    .update(schedules)
    .set({ slots: updatedSlots })
    .where(eq(schedules.id, scheduleId))
    .returning();

  invalidateScheduleCache();
  return updated as ScheduleRecord;
}
