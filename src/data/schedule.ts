export type SlotStatus = 'available' | 'booked';
export type DayStatus = 'available' | 'booked' | 'unavailable';

export interface TimeSlot {
  time: string;
  status: SlotStatus;
}

export interface DaySchedule {
  status: DayStatus;
  eventName?: string; // ชื่อคอนเสิร์ต
  location?: string; // สถานที่
  slots?: TimeSlot[];
}

// แก้ไขข้อมูลตารางงานได้ที่นี่
// รูปแบบวันที่: YYYY-MM-DD
export const scheduleData: Record<string, DaySchedule> = {
  // ตัวอย่างการเปิดคิวงาน (คุณสามารถ copy รูปแบบด้านล่างนี้ไปใช้กับวันที่ต้องการได้เลย)
  /*
  '2026-05-25': {
    status: 'available', // สถานะหลักของวัน (available = ว่าง, booked = เต็ม, unavailable = ไม่รับงาน)
    eventName: 'SEVENTEEN TOUR "FOLLOW" AGAIN', // ชื่อคอนเสิร์ต (ใส่หรือไม่ใส่ก็ได้)
    location: 'Supachalasai Stadium', // สถานที่ (ใส่หรือไม่ใส่ก็ได้)
    slots: [
      { time: '15:00-15:20', status: 'available' },
      { time: '15:30-15:50', status: 'available' },
      { time: '16:00-16:20', status: 'booked' },
    ]
  }
  */
};
