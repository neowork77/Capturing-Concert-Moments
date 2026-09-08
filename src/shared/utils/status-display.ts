/**
 * แหล่งความจริงเดียวสำหรับ "สถานะ" ทุกชนิดในหน้า admin — คำเรียก สี และไอคอน
 *
 * ก่อนหน้านี้ตรรกะนี้กระจายอยู่กว่า 20 จุดในรูป ternary ที่เขียนซ้ำกัน ทำให้คำเรียก
 * ของสถานะเดียวกันไม่ตรงกัน เช่น สถานะวันงานมีทั้ง "เปิดรับ" / "AVAILABLE" / "● เปิดรับคิว"
 *
 * `soft`  = badge บนพื้นอ่อน (ใช้เป็นค่าเริ่มต้น)
 * `solid` = ปุ่มที่ถูกเลือกใน segmented control
 * `dot`   = จุดสีสำหรับใช้คู่กับข้อความ แทนการพึ่ง emoji อย่างเดียว
 */

export interface StatusStyle {
  /** คำเต็ม ใช้ใน dropdown และที่มีพื้นที่พอ */
  label: string;
  /** คำสั้น ใช้ในตารางและ badge แคบๆ */
  short: string;
  emoji: string;
  soft: string;
  solid: string;
  dot: string;
}

/** สถานะคิว — ตรงกับ BookingRecord['status'] ใน src/lib/booking-service.ts */
export const BOOKING_STATUS = {
  confirmed: {
    label: 'คอนเฟิร์มแล้ว',
    short: 'คอนเฟิร์ม',
    emoji: '✅',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    solid: 'bg-emerald-600 text-white border-emerald-600',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'รอคอนเฟิร์ม',
    short: 'รอ',
    emoji: '⏳',
    soft: 'bg-amber-50 text-amber-800 border-amber-300',
    solid: 'bg-amber-500 text-white border-amber-500',
    dot: 'bg-amber-400',
  },
  cancelled: {
    label: 'ยกเลิกคิว',
    short: 'ยกเลิก',
    emoji: '🚫',
    soft: 'bg-rose-50 text-rose-800 border-rose-300',
    solid: 'bg-rose-600 text-white border-rose-600',
    dot: 'bg-rose-500',
  },
} as const satisfies Record<string, StatusStyle>;

/** สถานะชำระเงิน — ตรงกับ BookingRecord['paymentStatus'] */
export const PAYMENT_STATUS = {
  unpaid: {
    label: 'ยังไม่ชำระ',
    short: 'ยังไม่ชำระ',
    emoji: '⚫',
    soft: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    solid: 'bg-neutral-600 text-white border-neutral-600',
    dot: 'bg-neutral-400',
  },
  deposit: {
    label: 'มัดจำแล้ว',
    short: 'มัดจำ',
    emoji: '🟡',
    soft: 'bg-amber-50 text-amber-800 border-amber-300',
    solid: 'bg-amber-500 text-white border-amber-500',
    dot: 'bg-amber-400',
  },
  paid: {
    label: 'ชำระครบแล้ว',
    short: 'จ่ายเต็ม',
    emoji: '✅',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    solid: 'bg-emerald-600 text-white border-emerald-600',
    dot: 'bg-emerald-500',
  },
} as const satisfies Record<string, StatusStyle>;

/** สถานะวันงาน — ScheduleRecord['status'] ถูก type ไว้กว้างเป็น string จึงต้องมี fallback */
export const SCHEDULE_STATUS = {
  available: {
    label: 'เปิดรับคิว',
    short: 'เปิดรับ',
    emoji: '🟢',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    solid: 'bg-emerald-600 text-white border-emerald-600',
    dot: 'bg-emerald-500',
  },
  full: {
    label: 'คิวเต็ม',
    short: 'เต็ม',
    emoji: '🔴',
    soft: 'bg-rose-50 text-rose-800 border-rose-300',
    solid: 'bg-rose-600 text-white border-rose-600',
    dot: 'bg-rose-500',
  },
  unavailable: {
    label: 'ปิดรับคิว',
    short: 'ปิดรับ',
    emoji: '⚫',
    soft: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    solid: 'bg-neutral-600 text-white border-neutral-600',
    dot: 'bg-neutral-400',
  },
} as const satisfies Record<string, StatusStyle>;

/** สถานะรอบเวลา */
export const SLOT_STATUS = {
  available: {
    label: 'ว่าง',
    short: 'ว่าง',
    emoji: '🟢',
    soft: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    solid: 'bg-emerald-600 text-white border-emerald-600',
    dot: 'bg-emerald-500',
  },
  booked: {
    label: 'เต็ม',
    short: 'เต็ม',
    emoji: '🔴',
    soft: 'bg-rose-50 text-rose-800 border-rose-300',
    solid: 'bg-rose-600 text-white border-rose-600',
    dot: 'bg-rose-500',
  },
} as const satisfies Record<string, StatusStyle>;

export type BookingStatus = keyof typeof BOOKING_STATUS;
export type PaymentStatus = keyof typeof PAYMENT_STATUS;
export type ScheduleStatus = keyof typeof SCHEDULE_STATUS;
export type SlotStatus = keyof typeof SLOT_STATUS;

/** อ่านสไตล์อย่างปลอดภัยเมื่อค่าที่ได้มาเป็น string กว้างๆ (เช่น ScheduleRecord.status) */
export function scheduleStatusOf(status?: string | null): StatusStyle {
  if (status === 'available' || status === 'full' || status === 'unavailable') {
    return SCHEDULE_STATUS[status];
  }
  return SCHEDULE_STATUS.unavailable;
}
