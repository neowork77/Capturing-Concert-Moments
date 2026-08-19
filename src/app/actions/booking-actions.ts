'use server';

import {
  getAllBookings,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  BookingRecord,
} from '@/lib/booking-service';
import { revalidatePath } from 'next/cache';

export async function fetchBookingsAction(): Promise<{ success: boolean; data?: BookingRecord[]; message?: string }> {
  try {
    const data = await getAllBookings();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลการจองได้' };
  }
}

export async function createBookingAction(formData: {
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
}): Promise<{ success: boolean; data?: BookingRecord; message?: string }> {

  try {
    if (!formData.date || !formData.customerName || !formData.customerPhone || !formData.timeSlot) {
      return { success: false, message: 'กรุณากรอกข้อมูลวันที่ ชื่องาน ชื่อลูกค้า เบอร์โทร และเวลาให้ครบถ้วน' };
    }
    const result = await createBooking(formData);
    revalidatePath('/admin');
    revalidatePath('/admin/bookings');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง' };
  }
}

export async function updateBookingStatusAction(
  id: number,
  status: 'pending' | 'confirmed' | 'cancelled',
  notes?: string,
  paymentStatus?: 'unpaid' | 'deposit' | 'paid',
  depositAmount?: number,
  remainingAmount?: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const success = await updateBookingStatus(id, status, notes, paymentStatus, depositAmount, remainingAmount);
    if (!success) {
      return { success: false, message: 'ไม่พบรายการจองที่ต้องการอัปเดต' };
    }
    revalidatePath('/admin');
    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถอัปเดตสถานะการจองได้' };
  }
}

export async function updatePaymentStatusAction(
  id: number,
  paymentStatus: 'unpaid' | 'deposit' | 'paid',
  depositAmount?: number,
  remainingAmount?: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const success = await updateBookingStatus(id, undefined, undefined, paymentStatus, depositAmount, remainingAmount);
    if (!success) {
      return { success: false, message: 'ไม่พบรายการจองที่ต้องการอัปเดต' };
    }
    revalidatePath('/admin');
    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถอัปเดตสถานะการชำระเงินได้' };
  }
}

export async function deleteBookingAction(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteBooking(id);
    revalidatePath('/admin');
    revalidatePath('/admin/bookings');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถลบรายการจองได้' };
  }
}
