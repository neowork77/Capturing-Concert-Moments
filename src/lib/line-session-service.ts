import { db } from '@/db/db';
import { lineSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface LineSessionData {
  eventName?: string;
  date?: string;
  cameraType?: string;
  step?: string;
  timeSlot?: string;
  customerName?: string;
  customerPhone?: string;
  paymentType?: string;
}

export async function getLineUserSession(lineUserId: string): Promise<LineSessionData | null> {
  if (!lineUserId) return null;
  try {
    const [existing] = await db
      .select()
      .from(lineSessions)
      .where(eq(lineSessions.lineUserId, lineUserId));

    if (!existing) return null;

    return {
      eventName: existing.eventName || undefined,
      date: existing.date || undefined,
      cameraType: existing.cameraType || undefined,
      step: existing.step || undefined,
      timeSlot: existing.timeSlot || undefined,
      customerName: existing.customerName || undefined,
      customerPhone: existing.customerPhone || undefined,
      paymentType: existing.paymentType || undefined,
    };
  } catch (error) {
    console.error('Failed to fetch LINE session:', error);
    return null;
  }
}

export async function setLineUserSession(
  lineUserId: string,
  session: Partial<LineSessionData>
): Promise<void> {
  if (!lineUserId) return;
  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    const existing = await getLineUserSession(lineUserId);
    const merged: LineSessionData = { ...(existing || {}), ...session };

    await db
      .insert(lineSessions)
      .values({
        lineUserId,
        eventName: merged.eventName || null,
        date: merged.date || null,
        cameraType: merged.cameraType || null,
        step: merged.step || null,
        timeSlot: merged.timeSlot || null,
        customerName: merged.customerName || null,
        customerPhone: merged.customerPhone || null,
        paymentType: merged.paymentType || null,
        updatedAt: nowUnix,
      })
      .onConflictDoUpdate({
        target: lineSessions.lineUserId,
        set: {
          eventName: merged.eventName || null,
          date: merged.date || null,
          cameraType: merged.cameraType || null,
          step: merged.step || null,
          timeSlot: merged.timeSlot || null,
          customerName: merged.customerName || null,
          customerPhone: merged.customerPhone || null,
          paymentType: merged.paymentType || null,
          updatedAt: nowUnix,
        },
      });
  } catch (error) {
    console.error('Failed to set LINE session:', error);
  }
}

export async function clearLineUserSession(lineUserId: string): Promise<void> {
  if (!lineUserId) return;
  try {
    await db.delete(lineSessions).where(eq(lineSessions.lineUserId, lineUserId));
  } catch (error) {
    console.error('Failed to clear LINE session:', error);
  }
}
