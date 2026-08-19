import { db } from '@/db/db';
import { bookings, schedules } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

/**
 * Fetch all booking records ordered by newest first
 */
export async function getAllBookings(): Promise<BookingRecord[]> {
  const records = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  return records as BookingRecord[];
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
    const bCam = (b.cameraType || '').trim();
    const sameCam = !normCam || !bCam || normCam.toLowerCase() === bCam.toLowerCase();

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

  return true;
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
    const bCam = (b.cameraType || '').trim().toLowerCase();
    const sameCam = !normCam || !bCam || normCam === bCam;
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
    const bCam = (b.cameraType || '').trim().toLowerCase();
    const sameCam = !normCam || !bCam || normCam === bCam;
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
  await db.delete(bookings).where(eq(bookings.id, id));
  return true;
}
