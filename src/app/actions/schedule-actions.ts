'use server';

import {
  getAllScheduleRecords,
  upsertSchedule,
  deleteSchedule,
  updateScheduleSlotStatus,
  ScheduleRecord,
} from '@/lib/schedule-service';
import { SlotStatus, TimeSlot } from '@/data/schedule';

export async function fetchSchedulesAction(): Promise<{ success: boolean; data?: ScheduleRecord[]; message?: string }> {
  try {
    const data = await getAllScheduleRecords();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลตารางงานได้' };
  }
}

export async function upsertScheduleAction(formData: {
  id?: number;
  date: string;
  status: string;
  eventName?: string;
  location?: string;
  imageUrl?: string;
  slots?: TimeSlot[];
}): Promise<{ success: boolean; data?: ScheduleRecord; message?: string }> {
  try {
    if (!formData.date) {
      return { success: false, message: 'กรุณาระบุวันที่' };
    }
    const result = await upsertSchedule(formData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถบันทึกข้อมูลตารางงานได้' };
  }
}

export async function deleteScheduleAction(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteSchedule(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถลบตารางงานได้' };
  }
}

export async function toggleSlotStatusAction(
  date: string,
  eventName: string,
  timeSlot: string,
  currentStatus: SlotStatus
): Promise<{ success: boolean; message?: string }> {
  try {
    const newStatus: SlotStatus = currentStatus === 'available' ? 'booked' : 'available';
    const success = await updateScheduleSlotStatus(date, eventName, timeSlot, newStatus);
    if (!success) {
      return { success: false, message: 'ไม่พบรายการคิวงานที่ต้องการอัปเดต' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรอบเวลา' };
  }
}
