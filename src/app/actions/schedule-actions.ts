'use server';

import {
  getAllScheduleRecords,
  upsertSchedule,
  deleteSchedule,
  updateScheduleSlotStatus,
  ScheduleRecord,
} from '@/lib/schedule-service';
import { SlotStatus, TimeSlot } from '@/data/schedule';
import { revalidatePath } from 'next/cache';

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
    revalidatePath('/admin');
    revalidatePath('/admin/schedule');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถบันทึกข้อมูลตารางงานได้' };
  }
}

export async function deleteScheduleAction(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteSchedule(id);
    revalidatePath('/admin');
    revalidatePath('/admin/schedule');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถลบตารางงานได้' };
  }
}

export async function toggleSlotStatusAction(
  dateOrId: string | number,
  eventNameOrSlot: string,
  timeSlotOrStatus: string | SlotStatus,
  currentStatusOrCamera?: SlotStatus | string,
  scheduleIdOrCamera?: number | string,
  optionalCamera?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    let targetScheduleId: number | undefined = undefined;
    let targetDate: string = '';
    let targetEventName: string = '';
    let timeSlot: string = '';
    let effectiveCurrentStatus: SlotStatus = 'available';
    let cameraType: string | undefined = undefined;

    if (typeof dateOrId === 'number') {
      targetScheduleId = dateOrId;
      timeSlot = eventNameOrSlot;
      effectiveCurrentStatus = timeSlotOrStatus as SlotStatus;
      if (typeof currentStatusOrCamera === 'string') {
        cameraType = currentStatusOrCamera;
      }
    } else {
      targetDate = dateOrId;
      targetEventName = eventNameOrSlot;
      timeSlot = timeSlotOrStatus as string;
      effectiveCurrentStatus = (currentStatusOrCamera as SlotStatus) || 'available';
      if (typeof scheduleIdOrCamera === 'number') {
        targetScheduleId = scheduleIdOrCamera;
      } else if (typeof scheduleIdOrCamera === 'string') {
        cameraType = scheduleIdOrCamera;
      }
      if (optionalCamera) cameraType = optionalCamera;
    }

    const newStatus: SlotStatus = effectiveCurrentStatus === 'available' ? 'booked' : 'available';

    let success = false;
    if (targetScheduleId) {
      success = await updateScheduleSlotStatus(targetScheduleId, timeSlot, newStatus, cameraType);
    } else {
      success = await updateScheduleSlotStatus(targetDate, targetEventName, timeSlot, newStatus, cameraType);
    }

    if (!success) {
      return { success: false, message: 'ไม่พบรายการคิวงานที่ต้องการอัปเดต' };
    }

    revalidatePath('/admin');
    revalidatePath('/admin/schedule');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะรอบเวลา' };
  }
}
