/**
 * ฟังก์ชันจัดรูปแบบข้อความสำหรับแสดงผล — ปลอดภัยสำหรับทั้ง client และ server
 */

/** จัดรูปแบบเบอร์โทรเป็น 081-234-5678 */
export function formatPhoneNumber(phoneStr: string): string {
  const cleaned = phoneStr.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 9) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '0$1-$2-$3');
  }
  return phoneStr;
}

/**
 * วันที่ปัจจุบันตามเวลาไทย (Asia/Bangkok) รูปแบบ YYYY-MM-DD
 *
 * ห้ามใช้ `new Date().toISOString().split('T')[0]` แทน — นั่นคือเวลา UTC
 * ซึ่งช่วงเย็นของไทย (หลัง 17:00 น. = 10:00 UTC วันเดียวกัน แต่หลังเที่ยงคืน UTC
 * จะเป็นวันถัดไป) จะได้วันที่คลาดไป 1 วัน
 */
export function getTodayThailandDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/** วันที่+เวลาไทยจาก Unix timestamp (รับได้ทั้งหน่วยวินาทีและมิลลิวินาที) */
export function formatThaiDateTime(unixTimestamp?: number | null): string {
  if (!unixTimestamp) return '—';
  const ms = unixTimestamp < 10000000000 ? unixTimestamp * 1000 : unixTimestamp;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** จำนวนเงินบาท เช่น ฿1,500 — คืน '—' เมื่อไม่มีค่า */
export function formatBaht(amount?: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `฿${amount.toLocaleString('th-TH')}`;
}
