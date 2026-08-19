import { useState, useEffect, useMemo } from 'react';
import { ScheduleRecord } from '@/lib/schedule-service';
import { SlotStatus } from '@/data/schedule';
import { fetchBookingsAction, updateBookingStatusAction } from '@/app/actions/booking-actions';
import { BookingRecord } from '@/lib/booking-service';
import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

interface SlotManagerProps {
  activeSlotSchedule: ScheduleRecord;
  selectedCameraName?: string;
  onClose: () => void;
  handleToggleSlot: (schedule: ScheduleRecord, slotTime: string, currentStatus: SlotStatus) => void;
  setAllSlotsStatus: (schedule: ScheduleRecord, targetStatus: SlotStatus) => void;
}

export default function SlotManager({
  activeSlotSchedule,
  selectedCameraName,
  onClose,
  handleToggleSlot,
  setAllSlotsStatus,
}: SlotManagerProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadBookings = async (forceRefresh = false) => {
    const cached = getAdminCache<BookingRecord[]>(CACHE_KEYS.BOOKINGS);
    if (cached && !forceRefresh) {
      setBookings(cached);
      setIsLoadingBookings(false);
      return;
    }

    if (!cached) setIsLoadingBookings(true);
    const res = await fetchBookingsAction();
    if (res.success && res.data) {
      setBookings(res.data);
      setAdminCache(CACHE_KEYS.BOOKINGS, res.data);
    }
    setIsLoadingBookings(false);
  };

  useEffect(() => {
    loadBookings();
  }, [activeSlotSchedule]);

  const bookingsBySlot = useMemo(() => {
    const map: Record<string, BookingRecord[]> = {};
    const schedDate = activeSlotSchedule.date.trim();
    bookings.forEach(b => {
      if (b.date.trim() === schedDate) {
        const normTime = b.timeSlot.replace(/\s+/g, '');
        if (!map[normTime]) map[normTime] = [];
        map[normTime].push(b);
      }
    });
    return map;
  }, [bookings, activeSlotSchedule.date]);

  const slotStats = useMemo(() => {
    const total = activeSlotSchedule.slots.length;
    const available = activeSlotSchedule.slots.filter(s => s.status === 'available').length;
    const booked = activeSlotSchedule.slots.filter(s => s.status === 'booked').length;
    const bookedPercent = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { total, available, booked, bookedPercent };
  }, [activeSlotSchedule.slots]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotTime) return null;
    return activeSlotSchedule.slots.find(
      s => s.time.replace(/\s+/g, '') === selectedSlotTime.replace(/\s+/g, '')
    ) || null;
  }, [activeSlotSchedule.slots, selectedSlotTime]);

  const selectedSlotBookings = useMemo(() => {
    if (!selectedSlotTime) return [];
    return bookingsBySlot[selectedSlotTime.replace(/\s+/g, '')] || [];
  }, [bookingsBySlot, selectedSlotTime]);

  const handleUpdateStatus = async (id: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const res = await updateBookingStatusAction(id, newStatus);
    if (res.success) await loadBookings(true);
    else alert(res.message || 'ไม่สามารถอัปเดตสถานะได้');
  };

  const copyConfirmationText = (b: BookingRecord) => {
    const text = `#${b.eventName}\nวันที่ : ${b.date}\nเวลา : ${b.timeSlot} น.\n📷 กล้อง : ${b.cameraType || '-'}\nK.${b.customerName} ${b.customerPhone}\nชื่อไลน์ : ${b.lineDisplayName || '-'}\nสถานะ : ${b.status === 'confirmed' ? 'คอนเฟิร์มคิวแล้วเรียบร้อยค่ะ ✨' : 'รอคอนเฟิร์มคิว'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusColorMap = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFBFC] rounded-[2rem] w-full max-w-5xl shadow-2xl border border-[rgba(0,0,0,0.06)] relative flex flex-col"
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {activeSlotSchedule.imageUrl ? (
              <img
                src={activeSlotSchedule.imageUrl}
                alt={activeSlotSchedule.eventName || 'Concert Poster'}
                className="w-12 h-14 rounded-xl object-cover border border-[rgba(0,0,0,0.08)] shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-14 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 border border-[#F4A0B5]/20 flex flex-col items-center justify-center text-[#F4A0B5] flex-shrink-0">
                <span className="text-lg">🎤</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#F4A0B5] uppercase tracking-widest">Slot Manager</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  activeSlotSchedule.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeSlotSchedule.status === 'full'
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                }`}>
                  {activeSlotSchedule.status === 'available' ? '● เปิดรับคิว' : activeSlotSchedule.status === 'full' ? '● คิวเต็ม' : '● ปิดรับคิว'}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#3D3040] truncate">
                {activeSlotSchedule.eventName || 'ไม่ได้ระบุชื่องาน'}
              </h3>
              <p className="text-[11px] text-[#9E8E95] flex flex-wrap items-center gap-2 mt-0.5">
                <span>📅 {activeSlotSchedule.date}</span>
                {activeSlotSchedule.location && <span>📍 {activeSlotSchedule.location}</span>}
                {selectedCameraName && <span>📷 {selectedCameraName}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex-shrink-0 flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-100 cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        {/* ===== BODY: 2-COLUMN LAYOUT ===== */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ---- LEFT PANEL: Slot Grid ---- */}
          <div className="sm:w-72 flex-shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-[rgba(0,0,0,0.06)] bg-white/60">
            {/* Stats Bar */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#3D3040]">รอบเวลาทั้งหมด ({slotStats.total} รอบ)</span>
                <span className="text-[#9E8E95]">{slotStats.bookedPercent}% เต็ม</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${slotStats.bookedPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">🟢 ว่าง {slotStats.available}</span>
                <span className="flex-1 text-center py-1 rounded-lg bg-rose-50 text-rose-600 font-bold border border-rose-200">🔴 เต็ม {slotStats.booked}</span>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 border border-[rgba(0,0,0,0.05)]">
                <button
                  onClick={() => setAllSlotsStatus(activeSlotSchedule, 'available')}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  🟢 เปิดทั้งหมด
                </button>
                <button
                  onClick={() => setAllSlotsStatus(activeSlotSchedule, 'booked')}
                  className="flex-1 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  🔴 เต็มทั้งหมด
                </button>
              </div>
            </div>

            {/* Scrollable Slot Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <p className="text-[10px] font-semibold text-[#9E8E95] uppercase tracking-wider mb-2">
                เลือกรอบเวลาเพื่อดูผู้จอง
              </p>
              <div className="grid grid-cols-2 gap-2">
                {activeSlotSchedule.slots.map(slot => {
                  const normTime = slot.time.replace(/\s+/g, '');
                  const isAvailable = slot.status === 'available';
                  const isSelected = selectedSlotTime?.replace(/\s+/g, '') === normTime;
                  const slotBookingsList = bookingsBySlot[normTime] || [];
                  const hasBooking = slotBookingsList.length > 0;
                  const firstCustomer = slotBookingsList[0]?.customerName;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedSlotTime(isSelected ? null : slot.time)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-150 flex flex-col items-center gap-0.5 border cursor-pointer ${
                        isSelected
                          ? 'bg-[#F4A0B5]/20 border-[#F4A0B5] text-[#3D3040] shadow-sm ring-2 ring-[#F4A0B5]/40 scale-[1.03]'
                          : isAvailable
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:scale-[1.01]'
                          : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="font-mono text-[11px] font-bold leading-tight">{slot.time}</span>
                      <span className="text-[10px]">{isAvailable ? '🟢 ว่าง' : '🔴 เต็ม'}</span>
                      {hasBooking && (
                        <span className="text-[9px] font-medium text-[#3D3040]/70 bg-white/80 px-1.5 py-px rounded-full border border-neutral-200 mt-0.5 max-w-full truncate">
                          👤 {firstCustomer}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---- RIGHT PANEL: Booking Detail ---- */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!selectedSlotTime ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#9E8E95]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/10 to-[#D4B5E0]/20 border border-[#F4A0B5]/20 flex items-center justify-center mb-4">
                  <span className="text-3xl">⏰</span>
                </div>
                <p className="font-bold text-sm text-[#3D3040] mb-1">เลือกรอบเวลา</p>
                <p className="text-xs text-[#9E8E95] font-light">คลิกที่ปุ่มรอบเวลาด้านซ้ายเพื่อดูข้อมูลผู้จองในรอบนั้น</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Selected Slot Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#9E8E95] uppercase tracking-wider font-semibold">รอบเวลาที่เลือก</p>
                    <h4 className="font-bold text-xl text-[#3D3040] font-mono">{selectedSlotTime} <span className="text-sm font-sans text-[#9E8E95] font-normal">น.</span></h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                      selectedSlot?.status === 'available'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {selectedSlot?.status === 'available' ? '🟢 ว่าง' : '🔴 เต็ม'}
                    </span>
                    {selectedSlot && (
                      <button
                        onClick={() => {
                          handleToggleSlot(activeSlotSchedule, selectedSlot.time, selectedSlot.status);
                          loadBookings();
                        }}
                        className="px-3 py-1.5 rounded-full bg-white border border-[rgba(0,0,0,0.10)] text-xs font-semibold text-[#3D3040] hover:bg-neutral-50 cursor-pointer transition-all shadow-2xs"
                      >
                        🔄 สลับสถานะ
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-neutral-100" />

                {/* Booking Content */}
                {isLoadingBookings ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-3 text-[#9E8E95]">
                    <div className="w-6 h-6 rounded-full border-2 border-[#F4A0B5] border-t-transparent animate-spin" />
                    <span className="text-xs">กำลังโหลดข้อมูลผู้จอง...</span>
                  </div>
                ) : selectedSlotBookings.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#3D3040]">
                      👤 ผู้จองในรอบนี้ <span className="font-normal text-[#9E8E95]">({selectedSlotBookings.length} รายการ)</span>
                    </p>

                    {selectedSlotBookings.map(b => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs space-y-3"
                      >
                        {/* Customer Info Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 flex items-center justify-center text-sm flex-shrink-0">
                              👤
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#3D3040]">คุณ{b.customerName}</p>
                              <a href={`tel:${b.customerPhone}`} className="text-xs text-[#F4A0B5] hover:underline font-mono">
                                📞 {b.customerPhone}
                              </a>
                            </div>
                          </div>

                          {/* Status Select */}
                          <select
                            value={b.status}
                            onChange={e => handleUpdateStatus(b.id, e.target.value as any)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/30 flex-shrink-0 ${statusColorMap[b.status]}`}
                          >
                            <option value="confirmed">🟢 คอนเฟิร์มแล้ว</option>
                            <option value="pending">🟡 รอคอนเฟิร์ม</option>
                            <option value="cancelled">🔴 ยกเลิกคิว</option>
                          </select>
                        </div>

                        {/* Detail Fields */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-[10px] text-[#9E8E95] block mb-0.5">💬 ชื่อ LINE</span>
                            <span className="font-semibold text-[#3D3040] truncate block">{b.lineDisplayName || '—'}</span>
                          </div>
                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-[10px] text-[#9E8E95] block mb-0.5">📷 กล้องที่เช่า</span>
                            <span className="font-semibold text-[#3D3040] truncate block">{b.cameraType || selectedCameraName || '—'}</span>
                          </div>
                          {b.notes && (
                            <div className="col-span-2 bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                              <span className="text-[10px] text-[#9E8E95] block mb-0.5">📝 หมายเหตุ</span>
                              <span className="text-[#3D3040] font-light">{b.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Copy Button */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => copyConfirmationText(b)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                              copiedId === b.id
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-none'
                                : 'bg-white border-[rgba(0,0,0,0.08)] text-[#3D3040] hover:bg-neutral-50 shadow-2xs hover:shadow-sm'
                            }`}
                          >
                            {copiedId === b.id ? (
                              <><span>✨</span><span>คัดลอกสำเร็จ!</span></>
                            ) : (
                              <><span>📋</span><span>คัดลอกข้อความยืนยันคิว</span></>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No bookings */
                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
                    <span className="text-3xl">📭</span>
                    <p className="font-bold text-sm text-[#3D3040]">ยังไม่มีผู้จองในรอบนี้</p>
                    <p className="text-xs text-[#9E8E95] font-light max-w-xs">
                      รอบ {selectedSlotTime} น. ยังไม่มีประวัติการจองจากระบบ LINE หรือ Admin
                    </p>
                    {selectedSlot?.status === 'booked' && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl mt-1">
                        ⚠️ รอบเวลานี้ถูกตั้งเป็น "เต็ม" แต่ไม่มีข้อมูลผู้จองในระบบ
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0 bg-white/80">
          <p className="text-[11px] text-[#9E8E95]">
            คลิกที่รอบเวลาใดๆ เพื่อดู/แก้ไขข้อมูลผู้จอง
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white text-xs font-semibold shadow-xs cursor-pointer hover:shadow-md transition-all"
          >
            ✅ เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
