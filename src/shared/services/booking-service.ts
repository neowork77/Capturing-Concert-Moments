import { db } from '@/db/db';
import { bookings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { updateScheduleSlotStatus } from '@/shared/services/schedule-service';
import { isSameCamera } from '@/shared/utils/camera-utils';

export interface BookingRecord {
  id: number;
  date: string;
  eventName: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  lineDisplayName: string | null;
  lineUserId: string | null;
  cameraType: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'deposit' | 'paid';
  depositAmount?: number | null;
  remainingAmount?: number | null;
  notes: string | null;
  createdAt: number;
}

export interface FetchBookingsOptions {
  limit?: number;
  offset?: number;
}

// In-memory cache for all bookings to speed up /admin and fetchBookingsAction
let cachedAllBookings: { data: BookingRecord[]; expiresAt: number } | null = null;
const BOOKINGS_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateBookingCache() {
  cachedAllBookings = null;
}

/**
 * Fetch all booking records ordered by newest first with optional pagination
 */
export async function getAllBookings(options?: FetchBookingsOptions): Promise<BookingRecord[]> {
  const isDefaultFetch = !options?.limit && !options?.offset;
  const now = Date.now();

  if (isDefaultFetch && cachedAllBookings && now < cachedAllBookings.expiresAt) {
    return cachedAllBookings.data;
  }

  let query = db.select().from(bookings).orderBy(desc(bookings.id));
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  const records = await query;
  const result = records as BookingRecord[];

  if (isDefaultFetch) {
    cachedAllBookings = { data: result, expiresAt: now + BOOKINGS_CACHE_TTL_MS };
  }

  return result;
}

/**
 * Create a new booking (from LINE Chatbot or Admin UI)
 */
export async function createBooking(data: {
  date: string;
  eventName: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  lineDisplayName?: string;
  lineUserId?: string;
  cameraType?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'deposit' | 'paid';
  depositAmount?: number;
  remainingAmount?: number;
  notes?: string;
}): Promise<BookingRecord> {
  const nowUnix = Math.floor(Date.now() / 1000);
  const normDate = data.date.trim();
  const normEvent = data.eventName.trim();
  const normSlot = data.timeSlot.replace(/\s+/g, '');
  const normCam = (data.cameraType || '').trim();

  // Check for duplicate active booking for the same date, event, slot, and camera
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.date, normDate));

  const isDuplicate = existingBookings.some(b => {
    if (b.status === 'cancelled') return false;

    const sameEvent = !normEvent || !b.eventName || (b.eventName || '').trim() === normEvent;
    const sameSlot = (b.timeSlot || '').replace(/\s+/g, '') === normSlot;
    const sameCam = isSameCamera(b.cameraType, data.cameraType);

    return sameEvent && sameSlot && sameCam;
  });

  if (isDuplicate) {
    throw new Error(`รอบเวลา ${data.timeSlot} น. สำหรับกล้อง ${normCam || 'รุ่นนี้'} มีผู้ทำรายการจองคิวไว้แล้ว`);
  }

  const [inserted] = await db
    .insert(bookings)
    .values({
      date: normDate,
      eventName: normEvent,
      timeSlot: data.timeSlot.trim(),
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      lineDisplayName: data.lineDisplayName || null,
      lineUserId: data.lineUserId || null,
      cameraType: data.cameraType || null,
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'unpaid',
      depositAmount: data.depositAmount ?? 0,
      remainingAmount: data.remainingAmount ?? 0,
      notes: data.notes || null,
      createdAt: nowUnix,
    })
    .returning();

  if (inserted.status !== 'cancelled') {
    try {
      await updateScheduleSlotStatus(normDate, normEvent, data.timeSlot, 'booked', data.cameraType || undefined);
    } catch (e) {
      console.warn('Could not auto-sync slot status to schedules table:', e);
    }
  }

  invalidateBookingCache();
  return inserted as BookingRecord;
}

/**
 * Update booking status ('pending', 'confirmed', 'cancelled')
 */
export async function updateBookingStatus(
  id: number,
  status?: 'pending' | 'confirmed' | 'cancelled',
  notes?: string,
  paymentStatus?: 'unpaid' | 'deposit' | 'paid',
  depositAmount?: number,
  remainingAmount?: number
): Promise<boolean> {
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!existing) return false;

  await db
    .update(bookings)
    .set({
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(depositAmount !== undefined && { depositAmount }),
      ...(remainingAmount !== undefined && { remainingAmount }),
    })
    .where(eq(bookings.id, id));

  // If status is updated
  if (status === 'cancelled') {
    try {
      // Check if there are other active bookings for the same date, slot, and camera
      const otherBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.date, existing.date));

      const cleanSlot = (existing.timeSlot || '').replace(/\s+/g, '');
      const hasOtherActiveBookingForSameCam = otherBookings.some(
        b => b.id !== id && b.status !== 'cancelled' &&
             (b.timeSlot || '').replace(/\s+/g, '') === cleanSlot &&
             isSameCamera(b.cameraType, existing.cameraType)
      );

      if (!hasOtherActiveBookingForSameCam) {
        await updateScheduleSlotStatus(existing.date, existing.eventName, existing.timeSlot, 'available', existing.cameraType || undefined);
      }
    } catch (e) {
      console.warn('Could not sync slot status on cancellation:', e);
    }
  } else if (status === 'confirmed' || status === 'pending') {
    try {
      await updateScheduleSlotStatus(existing.date, existing.eventName, existing.timeSlot, 'booked', existing.cameraType || undefined);
    } catch (e) {
      console.warn('Could not sync slot status on update:', e);
    }
  }

  invalidateBookingCache();
  return true;
}

export interface UpdateBookingInput {
  date: string;
  eventName: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  lineDisplayName?: string | null;
  cameraType?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'deposit' | 'paid';
  depositAmount?: number | null;
  remainingAmount?: number | null;
  notes?: string | null;
}

/**
 * Full update of all fields in a booking record (Admin Edit)
 * Automatically synchronizes slot availability between old and new slot/camera/date
 */
export async function updateBookingFull(
  id: number,
  data: UpdateBookingInput
): Promise<BookingRecord> {
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!existing) {
    throw new Error('ไม่พบรายการจองที่ต้องการแก้ไข');
  }

  const normDate = data.date.trim();
  const normEvent = data.eventName.trim();
  const normSlot = data.timeSlot.trim();
  const cleanNewSlot = normSlot.replace(/\s+/g, '');
  const cleanOldSlot = (existing.timeSlot || '').replace(/\s+/g, '');
  const oldCam = (existing.cameraType || '').trim();
  const newCam = (data.cameraType || '').trim();

  const slotOrCamChanged =
    existing.date.trim() !== normDate ||
    (existing.eventName || '').trim() !== normEvent ||
    cleanOldSlot !== cleanNewSlot ||
    !isSameCamera(oldCam, newCam);

  const statusChanged = existing.status !== data.status;

  const [updated] = await db
    .update(bookings)
    .set({
      date: normDate,
      eventName: normEvent,
      timeSlot: normSlot,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      lineDisplayName: data.lineDisplayName ? data.lineDisplayName.trim() : null,
      cameraType: newCam || null,
      status: data.status,
      paymentStatus: data.paymentStatus,
      depositAmount: data.depositAmount ?? 0,
      remainingAmount: data.remainingAmount ?? 0,
      notes: data.notes ? data.notes.trim() : null,
    })
    .where(eq(bookings.id, id))
    .returning();

  // Handle slot sync:
  // 1. Release old slot if slot/cam/date changed OR status changed to cancelled
  const shouldReleaseOldSlot =
    (slotOrCamChanged || (statusChanged && data.status === 'cancelled')) &&
    existing.status !== 'cancelled';

  if (shouldReleaseOldSlot) {
    try {
      const otherOldBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.date, existing.date));

      const hasOtherActiveBooking = otherOldBookings.some(
        b =>
          b.id !== id &&
          b.status !== 'cancelled' &&
          (b.timeSlot || '').replace(/\s+/g, '') === cleanOldSlot &&
          isSameCamera(b.cameraType, existing.cameraType)
      );

      if (!hasOtherActiveBooking) {
        await updateScheduleSlotStatus(
          existing.date,
          existing.eventName,
          existing.timeSlot,
          'available',
          existing.cameraType || undefined
        );
      }
    } catch (e) {
      console.warn('Could not release old slot on booking edit:', e);
    }
  }

  // 2. Mark new slot as booked if updated booking is active
  if (data.status !== 'cancelled') {
    try {
      await updateScheduleSlotStatus(
        normDate,
        normEvent,
        normSlot,
        'booked',
        newCam || undefined
      );
    } catch (e) {
      console.warn('Could not reserve new slot on booking edit:', e);
    }
  }

  invalidateBookingCache();
  return updated as BookingRecord;
}

/**
 * Confirm an existing pending booking or create a new confirmed booking
 */
export async function confirmOrCreateBooking(data: {
  bookingId?: number;
  date: string;
  eventName: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  lineDisplayName?: string;
  lineUserId?: string;
  cameraType?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'deposit' | 'paid';
  depositAmount?: number;
  remainingAmount?: number;
  notes?: string;
}): Promise<BookingRecord> {
  const normDate = data.date.trim();
  const normEvent = data.eventName.trim();
  const normSlot = data.timeSlot.replace(/\s+/g, '');
  const normCam = (data.cameraType || '').trim().toLowerCase();

  // 1. If explicit bookingId provided, update that booking directly
  if (data.bookingId) {
    const [existing] = await db.select().from(bookings).where(eq(bookings.id, data.bookingId));
    if (existing) {
      const [updated] = await db
        .update(bookings)
        .set({
          status: data.status || 'confirmed',
          paymentStatus: data.paymentStatus || 'paid',
          depositAmount: data.depositAmount ?? existing.depositAmount ?? 0,
          remainingAmount: data.remainingAmount ?? existing.remainingAmount ?? 0,
          notes: data.notes || existing.notes,
        })
        .where(eq(bookings.id, data.bookingId))
        .returning();

      if (updated.status !== 'cancelled') {
        try {
          await updateScheduleSlotStatus(normDate, normEvent, data.timeSlot, 'booked', data.cameraType || undefined);
        } catch (e) {
          console.warn('Could not sync slot status on confirm bookingId:', e);
        }
      }

      return updated as BookingRecord;
    }
  }

  // 2. Check if there is an existing pending booking matching date, event, slot, camera
  const existingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.date, normDate));

  const pendingBooking = existingBookings.find(b => {
    if (b.status !== 'pending') return false;
    const sameEvent = !normEvent || !b.eventName || (b.eventName || '').trim() === normEvent;
    const sameSlot = (b.timeSlot || '').replace(/\s+/g, '') === normSlot;
    const sameCam = isSameCamera(b.cameraType, data.cameraType);
    return sameEvent && sameSlot && sameCam;
  });

  if (pendingBooking) {
    const [updated] = await db
      .update(bookings)
      .set({
        status: data.status || 'confirmed',
        paymentStatus: data.paymentStatus || 'paid',
        depositAmount: data.depositAmount ?? pendingBooking.depositAmount ?? 0,
        remainingAmount: data.remainingAmount ?? pendingBooking.remainingAmount ?? 0,
        notes: data.notes || pendingBooking.notes,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        lineDisplayName: data.lineDisplayName || pendingBooking.lineDisplayName,
        lineUserId: data.lineUserId || pendingBooking.lineUserId,
      })
      .where(eq(bookings.id, pendingBooking.id))
      .returning();

    if (updated.status !== 'cancelled') {
      try {
        await updateScheduleSlotStatus(normDate, normEvent, data.timeSlot, 'booked', data.cameraType || undefined);
      } catch (e) {
        console.warn('Could not sync slot status on confirm pendingBooking:', e);
      }
    }

    return updated as BookingRecord;
  }

  // 3. Otherwise create new booking via createBooking
  return await createBooking(data);
}


/**
 * Cancel pending booking if exists
 */
export async function cancelPendingBookingIfExists(draft: {
  bookingId?: number;
  date: string;
  eventName: string;
  timeSlot: string;
  cameraType?: string;
}): Promise<boolean> {
  if (draft.bookingId) {
    return await updateBookingStatus(draft.bookingId, 'cancelled');
  }

  const normDate = draft.date.trim();
  const normEvent = draft.eventName.trim();
  const normSlot = draft.timeSlot.replace(/\s+/g, '');
  const normCam = (draft.cameraType || '').trim().toLowerCase();

  const existingBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.date, normDate));

  const pendingBooking = existingBookings.find(b => {
    if (b.status !== 'pending') return false;
    const sameEvent = !normEvent || !b.eventName || (b.eventName || '').trim() === normEvent;
    const sameSlot = (b.timeSlot || '').replace(/\s+/g, '') === normSlot;
    const sameCam = isSameCamera(b.cameraType, draft.cameraType);
    return sameEvent && sameSlot && sameCam;
  });

  if (pendingBooking) {
    await updateBookingStatus(pendingBooking.id, 'cancelled');
    return true;
  }
  return false;
}

/**
 * Delete a booking record
 */
export async function deleteBooking(id: number): Promise<boolean> {
  const [existing] = await db.select().from(bookings).where(eq(bookings.id, id));
  await db.delete(bookings).where(eq(bookings.id, id));

  if (existing && existing.status !== 'cancelled') {
    try {
      const otherBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.date, existing.date));

      const cleanSlot = (existing.timeSlot || '').replace(/\s+/g, '');
      const hasOtherActiveBookingForSameCam = otherBookings.some(
        b => b.id !== id && b.status !== 'cancelled' &&
             (b.timeSlot || '').replace(/\s+/g, '') === cleanSlot &&
             isSameCamera(b.cameraType, existing.cameraType)
      );

      if (!hasOtherActiveBookingForSameCam) {
        await updateScheduleSlotStatus(existing.date, existing.eventName, existing.timeSlot, 'available', existing.cameraType || undefined);
      }
    } catch (e) {
      console.warn('Could not sync slot status on delete:', e);
    }
  }

  invalidateBookingCache();
  return true;
}
