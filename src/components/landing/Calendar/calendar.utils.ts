import { DaySchedule } from '@/data/schedule';

export const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const getDayData = (year: number, month: number, day: number, remoteScheduleData: Record<string, DaySchedule>): DaySchedule => {
  const dateStr = formatDate(year, month, day);

  if (remoteScheduleData[dateStr]) {
    return remoteScheduleData[dateStr];
  }

  return { status: 'na' as any, slots: [] };
};

export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const statusColors: Record<string, string> = {
  available: 'bg-[#4ADE80] shadow-[0_0_12px_rgba(74,222,128,0.6)]', // Green
  booked: 'bg-[#FB7185] shadow-[0_0_12px_rgba(251,113,133,0.6)]',   // Red
  unavailable: 'bg-[#FB7185] shadow-[0_0_12px_rgba(251,113,133,0.6)]', // Red
  na: 'bg-[#D1C7CD] shadow-[0_0_12px_rgba(209,199,205,0.4)]', // Gray
};
