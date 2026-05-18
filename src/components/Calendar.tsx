'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';
import { DaySchedule, DayStatus, TimeSlot } from '../data/schedule';

// 🌟 ฟังก์ชันพิเศษสำหรับดึงวันที่/เดือน/ปี ของฝั่งประเทศไทย (Asia/Bangkok) เสมอ
const getThailandDateDetails = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(new Date());
  
  const thYear = parseInt(parts.find(p => p.type === 'year')?.value || '2026', 10);
  // Intl คืนค่า month เป็น 1-12 แต่ระบบ Date ทั่วไปใช้ 0-11 จึงต้องลบออก 1
  const thMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  const thDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

  return { thYear, thMonth, thDay };
};

// Helper to format date as YYYY-MM-DD
const formatDate = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Get data for a specific day, fallback to 'unavailable' if not set
const getDayData = (year: number, month: number, day: number, remoteScheduleData: Record<string, DaySchedule>): DaySchedule => {
  const dateStr = formatDate(year, month, day);
  
  if (remoteScheduleData[dateStr]) {
    return remoteScheduleData[dateStr];
  }

  // ค่าเริ่มต้นสำหรับวันที่ไม่ได้กำหนดใน Google Sheets จะตั้งเป็น "ไม่รับงาน" ทันที
  return { status: 'unavailable', slots: [] };
};

export default function Calendar() {
  // 🌟 เริ่มต้น State ปฏิทินโดยใช้ปีและเดือนตามเวลาของประเทศไทย
  const [currentDate, setCurrentDate] = useState(() => {
    const { thYear, thMonth, thDay } = getThailandDateDetails();
    return new Date(thYear, thMonth, thDay);
  });
  const [selectedDay, setSelectedDay] = useState<{ day: number, data: DaySchedule } | null>(null);
  const [remoteScheduleData, setRemoteScheduleData] = useState<Record<string, DaySchedule>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
          const data = await res.json();
          setRemoteScheduleData(data || {});
        }
      } catch (error) {
        console.error("Failed to fetch schedule data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Adjust for Sunday start: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const startDay = firstDayOfMonth;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prefixDays = Array.from({ length: startDay }, (_, i) => i);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 🌟 ดึงเวลาไทยมาเช็คสำหรับฟังก์ชันปุ่มเลื่อนเดือน
  const { thYear, thMonth, thDay } = getThailandDateDetails();

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => {
    if (year === thYear && month === thMonth) return;
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 🌟 เช็คเดือนปัจจุบันอิงตามเวลาไทย
  const isCurrentMonth = year === thYear && month === thMonth;

  const statusColors = {
    available: 'bg-[#4ADE80] shadow-[0_0_12px_rgba(74,222,128,0.6)]', // Green
    booked: 'bg-[#FB7185] shadow-[0_0_12px_rgba(251,113,133,0.6)]',   // Red
    unavailable: 'bg-[#D1C7CD] shadow-[0_0_12px_rgba(209,199,205,0.4)]', // Gray
  };

  const handleDayClick = (day: number, data: DaySchedule) => {
    setSelectedDay({ day, data });
  };

  return (
    <section id="calendar" className="relative py-12 sm:py-32 px-6 sm:px-8 lg:px-12 max-w-5xl mx-auto">
      {/* Decorative blobs — hidden on mobile for GPU perf */}
      <div className="hidden sm:block absolute top-20 left-0 w-[300px] h-[300px] rounded-full bg-[#F4A0B5]/[0.08] blur-[100px] pointer-events-none" />
      <div className="hidden sm:block absolute bottom-20 right-0 w-[300px] h-[300px] rounded-full bg-[#D8CCE8]/[0.08] blur-[100px] pointer-events-none" />

      <ScrollReveal className="text-center max-w-2xl mx-auto relative z-10 mb-12 sm:mb-16">
        <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#F4A0B5] mb-4">
          ✦ Schedule
        </span>
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#3D3040] mb-5">
          Check <span className="font-light bg-gradient-to-r from-[#F4A0B5] to-[#D8CCE8] bg-clip-text text-transparent">Availability</span>
        </h2>
        <p className="text-[#9E8E95] text-sm sm:text-base font-light">
          ดูตารางคิวงานเพื่อวางแผนจองคิวถ่ายรูปหน้าคอนเสิร์ต (คลิกที่วันที่เพื่อดูเวลา)
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.15} className="relative z-10">
        <div className="p-6 sm:p-10 lg:p-12 rounded-[2.5rem] bg-white/95 sm:bg-white/80 sm:backdrop-blur-xl border border-[rgba(244,160,181,0.15)] shadow-[0_20px_80px_rgba(216,204,232,0.25)] relative">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <button 
              onClick={prevMonth}
              disabled={isCurrentMonth}
              className={`p-3 rounded-2xl border ${isCurrentMonth ? 'bg-gray-50/50 border-gray-100 opacity-40 cursor-not-allowed' : 'bg-white border-[#F4A0B5]/20 hover:bg-[#F9F5FA] hover:shadow-[0_4px_12px_rgba(244,160,181,0.1)] active:scale-95'} text-[#3D3040] transition-all cursor-pointer`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h3 className="text-xl sm:text-2xl font-bold text-[#3D3040] tracking-wide">
              {monthNames[month]} {year}
            </h3>
            <button 
              onClick={nextMonth} 
              className="p-3 rounded-2xl bg-white border border-[#F4A0B5]/20 hover:bg-[#F9F5FA] hover:shadow-[0_4px_12px_rgba(244,160,181,0.1)] text-[#3D3040] transition-all active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-8 mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-[#F4A0B5]/15">
            <div className="flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/50 border border-white shadow-sm">
              <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${statusColors.available}`} />
              <span className="text-[10px] sm:text-sm font-medium text-[#7A6A73] whitespace-nowrap">ว่าง (Available)</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/50 border border-white shadow-sm">
              <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${statusColors.booked}`} />
              <span className="text-[10px] sm:text-sm font-medium text-[#7A6A73] whitespace-nowrap">คิวเต็ม (Booked)</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/50 border border-white shadow-sm">
              <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${statusColors.unavailable}`} />
              <span className="text-[10px] sm:text-sm font-medium text-[#7A6A73] whitespace-nowrap">ไม่รับงาน (N/A)</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-[#B0A3A8] uppercase tracking-widest pb-2 sm:pb-4">
                {d}
              </div>
            ))}
            
            {prefixDays.map(i => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map(day => {
              const dayData = getDayData(year, month, day, remoteScheduleData);
              // 🌟 บังคับตรวจจับ "วันปัจจุบัน (Today)" โดยเทียบตามเวลาไทยครบถ้วน
              const isToday = thDay === day && thMonth === month && thYear === year;

              return (
                <div key={day} className="aspect-square relative group">
                  <div 
                    onClick={() => handleDayClick(day, dayData)}
                    className={`w-full h-full rounded-[1rem] sm:rounded-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300 cursor-pointer border ${isToday ? 'bg-[#F4A0B5]/5 border-[#F4A0B5]/30' : 'bg-transparent border-transparent'} hover:bg-white hover:shadow-[0_8px_24px_rgba(244,160,181,0.15)] hover:-translate-y-0.5 hover:border-[#F4A0B5]/20 active:scale-95`}
                  >
                    <span className={`font-medium text-sm sm:text-lg ${isToday ? 'text-[#F4A0B5] font-bold' : 'text-[#3D3040]'}`}>
                      {day}
                    </span>
                    {!isLoading && <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${statusColors[dayData.status]} transition-transform duration-300 group-hover:scale-125`} />}
                    {isLoading && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-200 animate-pulse" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Overlay */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-white/90 sm:bg-white/60 sm:backdrop-blur-md rounded-[2.5rem]"
                onClick={() => setSelectedDay(null)}
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 20, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white w-full max-w-sm rounded-[2rem] p-6 sm:p-8 shadow-[0_24px_80px_rgba(244,160,181,0.3)] border border-[#F4A0B5]/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <h4 className="text-2xl font-bold text-[#3D3040]">
                          {selectedDay.day} {monthNames[month]} {year}
                        </h4>
                        <p className="text-sm font-medium text-[#B0A3A8] mt-1">
                          {selectedDay.data.status === 'available' ? 'มีคิวว่าง (Available)' : 
                           selectedDay.data.status === 'booked' ? 'คิวเต็มแล้ว (Fully Booked)' : 
                           'ไม่รับงาน (Unavailable)'}
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedDay(null)}
                        className="p-2 bg-[#F9F5FA] text-[#7A6A73] rounded-full hover:bg-[#F4A0B5]/10 hover:text-[#F4A0B5] transition-colors shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    {/* Event Details */}
                    {(selectedDay.data.eventName || selectedDay.data.location) && (
                      <div className="bg-[#F9F5FA] p-3.5 rounded-xl border border-[#F4A0B5]/10 mt-4 w-full">
                        {selectedDay.data.eventName && (
                          <p className="text-sm font-semibold text-[#3D3040] flex items-start gap-2">
                            <span className="text-lg leading-none">🎪</span> <span className="leading-tight pt-0.5">{selectedDay.data.eventName}</span>
                          </p>
                        )}
                        {selectedDay.data.location && (
                          <p className="text-xs font-medium text-[#7A6A73] flex items-start gap-2 mt-2">
                            <span className="text-lg leading-none">📍</span> <span className="leading-tight pt-0.5">{selectedDay.data.location}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div 
                    className="space-y-3 max-h-[210px] overflow-y-auto pr-2 custom-scrollbar overscroll-contain"
                    data-lenis-prevent="true"
                  >
                    {selectedDay.data.status === 'unavailable' ? (
                      <div className="text-center py-8">
                        <span className="text-4xl mb-3 block">😴</span>
                        <p className="text-[#9E8E95]">วันนี้ไม่ได้เปิดรับคิวถ่ายรูปค่ะ</p>
                      </div>
                    ) : selectedDay.data.slots && selectedDay.data.slots.length > 0 ? (
                      selectedDay.data.slots.map((slot, idx) => (
                        <div 
                          key={idx}
                          className={`flex justify-between items-center p-4 rounded-xl border ${
                            slot.status === 'available' 
                              ? 'bg-gradient-to-r from-white to-[#F0FAF0] border-[#00B900]/20' 
                              : 'bg-gradient-to-r from-white to-[#FFF0F0] border-[#FB7185]/20 opacity-70'
                          }`}
                        >
                          <span className="font-semibold text-[#3D3040]">{slot.time}</span>
                          {slot.status === 'available' ? (
                            <span className="text-xs font-bold text-[#00B900] bg-[#00B900]/10 px-3 py-1 rounded-full border border-[#00B900]/20">
                              ว่าง
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-[#FB7185] bg-[#FB7185]/10 px-3 py-1 rounded-full border border-[#FB7185]/20">
                              เต็ม
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <span className="text-4xl mb-3 block">🗓️</span>
                        <p className="text-[#9E8E95]">ไม่มีการระบุช่วงเวลา</p>
                      </div>
                    )}
                  </div>

                  {selectedDay.data.status === 'available' && (
                    <a 
                      href="#contact" 
                      onClick={() => setSelectedDay(null)}
                      className="mt-6 w-full block text-center py-3.5 rounded-2xl bg-[#3D3040] text-white font-semibold text-sm hover:bg-[#F4A0B5] hover:shadow-[0_8px_24px_rgba(244,160,181,0.4)] transition-all active:scale-95"
                    >
                      จองคิว / Book Now
                    </a>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollReveal>
    </section>
  );
}