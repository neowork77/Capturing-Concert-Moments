export type SlotStatus = 'available' | 'booked';
export type DayStatus = 'available' | 'booked' | 'unavailable' | 'na';

export interface TimeSlot {
  time: string;
  status: SlotStatus;
  cameraStatuses?: Record<string, SlotStatus>;
}

export interface DaySchedule {
  status: DayStatus;
  eventName?: string;
  location?: string;
  slots?: TimeSlot[];
}

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
 * Parse time string to minutes from 00:00 for chronological sorting
 */
export function parseSlotMinutes(slotTimeStr: string): number {
  if (!slotTimeStr) return 0;
  const start = slotTimeStr.split('-')[0].trim().replace(/\s+/g, '');
  const clean = start.replace(/น\.?$/i, '');
  const parts = clean.split(/[:.]/);
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Sort time slots in chronological order
 */
export function sortTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort((a, b) => parseSlotMinutes(a.time) - parseSlotMinutes(b.time));
}

export const scheduleData: Record<string, DaySchedule> = {};

