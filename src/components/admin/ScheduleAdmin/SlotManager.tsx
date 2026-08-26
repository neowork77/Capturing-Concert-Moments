import { useState, useEffect, useMemo } from 'react';
import { ScheduleRecord } from '@/lib/schedule-service';
import { SlotStatus, TimeSlot } from '@/data/schedule';
import { fetchBookingsAction, updateBookingStatusAction } from '@/app/actions/booking-actions';
import { BookingRecord } from '@/lib/booking-service';
import { CameraRecord } from '@/lib/camera-service';
import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

interface SlotManagerProps {
  activeSlotSchedule: ScheduleRecord;
  selectedCameraName?: string;
  cameras?: CameraRecord[];
  onSelectCamera?: (cameraName: string) => void;
  onClose: () => void;
  handleToggleSlot: (
    schedule: ScheduleRecord,
    slotTime: string,
    currentStatus: SlotStatus,
    cameraType?: string
  ) => Promise<boolean> | void;
  setAllSlotsStatus: (
    schedule: ScheduleRecord,
    targetStatus: SlotStatus,
    cameraType?: string
  ) => Promise<void> | void;
}

export default function SlotManager({
  activeSlotSchedule,
  selectedCameraName,
  cameras = [],
  onSelectCamera,
  onClose,
  handleToggleSlot,
  setAllSlotsStatus,
}: SlotManagerProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [activeCamera, setActiveCamera] = useState<string>(
    selectedCameraName || cameras[0]?.name || 'all'
  );
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [togglingSlotTime, setTogglingSlotTime] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedCameraName) {
      setActiveCamera(selectedCameraName);
    }
  }, [selectedCameraName]);

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

  // คัดกรองการจองเฉพาะวันที่นี้ และเฉพาะรุ่นกล้องที่เลือก (หรือทั้งหมดถ้าเลือก 'all')
  const bookingsBySlot = useMemo(() => {
    const map: Record<string, BookingRecord[]> = {};
    const schedDate = activeSlotSchedule.date.trim();
    const activeCamNorm = activeCamera.trim().toLowerCase();

    bookings.forEach(b => {
      if (b.date.trim() === schedDate) {
        const normCam = (b.cameraType || '').trim().toLowerCase();
        const isMatchCam =
          activeCamera === 'all' ||
          !activeCamera ||
          !b.cameraType ||
          normCam === activeCamNorm ||
          normCam.includes(activeCamNorm) ||
          activeCamNorm.includes(normCam);

        if (isMatchCam) {
          const normTime = b.timeSlot.replace(/\s+/g, '');
          if (!map[normTime]) map[normTime] = [];
          map[normTime].push(b);
        }
      }
    });
    return map;
  }, [bookings, activeSlotSchedule.date, activeCamera]);

  // ฟังก์ชันตรวจเช็คว่ารอบเวลาสำหรับกล้องที่เลือกนั้น "เต็ม" หรือ "ว่าง"
  const isSlotBookedForCurrentCamera = (slot: TimeSlot): boolean => {
    const normTime = slot.time.replace(/\s+/g, '');
    const activeBookings = (bookingsBySlot[normTime] || []).filter(b => b.status !== 'cancelled');

    if (activeCamera && activeCamera !== 'all') {
      // 1. มีรายการจองของกล้องนี้ที่ยังไม่ยกเลิก
      if (activeBookings.length > 0) return true;

      // 2. แอดมินตั้งค่าล็อกเฉพาะกล้องนี้
      if (slot.cameraStatuses) {
        const activeCamNorm = activeCamera.trim().toLowerCase();
        const key = Object.keys(slot.cameraStatuses).find(
          k =>
            k.toLowerCase() === activeCamNorm ||
            k.toLowerCase().includes(activeCamNorm) ||
            activeCamNorm.includes(k.toLowerCase())
        );
        if (key) {
          return slot.cameraStatuses[key] === 'booked';
        }
      }

      // 3. Fallback สถานะหลักของรอบเวลา
      return slot.status === 'booked';
    }

    // กรณีดูภาพรวม 'all'
    if (activeBookings.length > 0) return true;
    return slot.status === 'booked';
  };

  const slotStats = useMemo(() => {
    const total = activeSlotSchedule.slots.length;
    let booked = 0;
    activeSlotSchedule.slots.forEach(s => {
      if (isSlotBookedForCurrentCamera(s)) {
        booked++;
      }
    });
    const available = Math.max(0, total - booked);
    const bookedPercent = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { total, available, booked, bookedPercent };
  }, [activeSlotSchedule.slots, bookingsBySlot, activeCamera]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotTime) return null;
    return (
      activeSlotSchedule.slots.find(
        s => s.time.replace(/\s+/g, '') === selectedSlotTime.replace(/\s+/g, '')
      ) || null
    );
  }, [activeSlotSchedule.slots, selectedSlotTime]);

  const selectedSlotBookings = useMemo(() => {
    if (!selectedSlotTime) return [];
    return bookingsBySlot[selectedSlotTime.replace(/\s+/g, '')] || [];
  }, [bookingsBySlot, selectedSlotTime]);

  const onToggleSingleSlot = async (slotTime: string, currentEffectiveStatus: SlotStatus) => {
    setTogglingSlotTime(slotTime);
    try {
      await handleToggleSlot(activeSlotSchedule, slotTime, currentEffectiveStatus, activeCamera);
    } finally {
      setTogglingSlotTime(null);
    }
  };

  const onBulkSetStatus = async (targetStatus: SlotStatus) => {
    setIsBulkLoading(true);
    try {
      await setAllSlotsStatus(activeSlotSchedule, targetStatus, activeCamera);
    } finally {
      setIsBulkLoading(false);
    }
  };

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
                <span className="text-[11px] font-bold text-[#F4A0B5] uppercase tracking-widest">
                  Slot Manager
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeSlotSchedule.status === 'available'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activeSlotSchedule.status === 'full'
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                  }`}
                >
                  {activeSlotSchedule.status === 'available'
                    ? '● เปิดรับคิว'
                    : activeSlotSchedule.status === 'full'
                    ? '● คิวเต็ม'
                    : '● ปิดรับคิว'}
                </span>
                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-full">
                  ⚡ Sync LINE Real-time
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-[#3D3040] truncate">
                {activeSlotSchedule.eventName || 'ไม่ได้ระบุชื่องาน'}
              </h3>
              <p className="text-[11px] text-[#9E8E95] flex flex-wrap items-center gap-2 mt-0.5">
                <span>📅 {activeSlotSchedule.date}</span>
                {activeSlotSchedule.location && <span>📍 {activeSlotSchedule.location}</span>}
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

        {/* ===== CAMERA SELECTOR TABS ===== */}
        <div className="px-6 py-2.5 bg-neutral-50/90 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-bold text-[#3D3040] flex items-center gap-1">
              <span>📸</span> เลือกรุ่นกล้อง:
            </span>
            {cameras.map(cam => (
              <button
                key={cam.id}
                type="button"
                onClick={() => {
                  setActiveCamera(cam.name);
                  onSelectCamera?.(cam.name);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 border ${
                  activeCamera === cam.name
                    ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white border-transparent shadow-xs scale-[1.02]'
                    : 'bg-white text-[#3D3040] border-[rgba(0,0,0,0.08)] hover:bg-neutral-100/80 hover:border-[#F4A0B5]/40'
                }`}
              >
                <span>📷</span>
                <span>{cam.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setActiveCamera('all');
                onSelectCamera?.('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 border ${
                activeCamera === 'all'
                  ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white border-transparent shadow-xs scale-[1.02]'
                  : 'bg-white text-[#3D3040] border-[rgba(0,0,0,0.08)] hover:bg-neutral-100/80 hover:border-[#F4A0B5]/40'
              }`}
            >
              <span>✨</span>
              <span>ทุกกล้อง (ภาพรวม)</span>
            </button>
          </div>
          <span className="text-[10px] text-[#9E8E95] font-medium hidden md:inline-block">
            * คิวและสล็อตว่าง/เต็มแยกตามรุ่นกล้องอย่างอิสระ
          </span>
        </div>

        {/* ===== BODY: 2-COLUMN LAYOUT ===== */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* ---- LEFT PANEL: Slot Grid ---- */}
          <div className="sm:w-80 flex-shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-[rgba(0,0,0,0.06)] bg-white/60">
            {/* Stats Bar */}
            <div className="px-4 pt-3 pb-3 flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-[#3D3040] truncate">
                  รอบเวลา {activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera}
                </span>
                <span className="text-[#9E8E95]">{slotStats.bookedPercent}% เต็ม</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${slotStats.bookedPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  🟢 ว่าง {slotStats.available}
                </span>
                <span className="flex-1 text-center py-1 rounded-lg bg-rose-50 text-rose-600 font-bold border border-rose-200">
                  🔴 เต็ม {slotStats.booked}
                </span>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-50 border border-[rgba(0,0,0,0.05)]">
                <button
                  disabled={isBulkLoading}
                  onClick={() => onBulkSetStatus('available')}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {isBulkLoading ? (
                    <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>🟢 เปิดทั้งหมด</span>
                  )}
                </button>
                <button
                  disabled={isBulkLoading}
                  onClick={() => onBulkSetStatus('booked')}
                  className="flex-1 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 border border-rose-200 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {isBulkLoading ? (
                    <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>🔴 เต็มทั้งหมด</span>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Slot Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#9E8E95] uppercase tracking-wider">
                  รอบเวลา / สลับสถานะ
                </p>
                <span className="text-[9px] text-[#9E8E95]">คลิกเพื่อสลับทันที</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeSlotSchedule.slots.map(slot => {
                  const normTime = slot.time.replace(/\s+/g, '');
                  const slotBookingsList = (bookingsBySlot[normTime] || []).filter(
                    b => b.status !== 'cancelled'
                  );
                  const hasActiveBooking = slotBookingsList.length > 0;
                  const isEffectivelyBooked = isSlotBookedForCurrentCamera(slot);
                  const isEffectivelyAvailable = !isEffectivelyBooked;

                  const isSelected = selectedSlotTime?.replace(/\s+/g, '') === normTime;
                  const isToggling = togglingSlotTime === slot.time;
                  const firstCustomer = slotBookingsList[0]?.customerName;

                  return (
                    <div
                      key={slot.time}
                      onClick={() => setSelectedSlotTime(isSelected ? null : slot.time)}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex flex-col justify-between border cursor-pointer relative group ${
                        isSelected
                          ? 'bg-[#F4A0B5]/15 border-[#F4A0B5] text-[#3D3040] shadow-sm ring-2 ring-[#F4A0B5]/40 scale-[1.02]'
                          : isEffectivelyAvailable
                          ? 'bg-white border-emerald-200/80 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50/40'
                          : 'bg-white border-rose-200/80 text-rose-900 hover:border-rose-400 hover:bg-rose-50/40'
                      }`}
                    >
                      {/* Time and Customer Header */}
                      <div className="w-full flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#3D3040]">
                          {slot.time}
                        </span>
                        {hasActiveBooking && (
                          <span
                            className="text-[9px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200 truncate max-w-[80px]"
                            title={`คุณ${firstCustomer}`}
                          >
                            👤 {firstCustomer}
                          </span>
                        )}
                      </div>

                      {/* Interactive Toggle Button inside Card */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={e => {
                          e.stopPropagation();
                          onToggleSingleSlot(slot.time, isEffectivelyBooked ? 'booked' : 'available');
                        }}
                        className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer shadow-2xs ${
                          isToggling
                            ? 'bg-neutral-100 text-neutral-400 border-neutral-200'
                            : isEffectivelyAvailable
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                        }`}
                        title={`คลิกเพื่อสลับสถานะรอบเวลานี้ (${activeCamera})`}
                      >
                        {isToggling ? (
                          <>
                            <span className="w-2.5 h-2.5 border border-neutral-400 border-t-transparent rounded-full animate-spin" />
                            <span>กำลังสลับ...</span>
                          </>
                        ) : (
                          <>
                            <span>{isEffectivelyAvailable ? '🟢 ว่าง' : '🔴 เต็ม'}</span>
                            <span className="text-[9px] opacity-75 font-normal ml-0.5">🔄 สลับ</span>
                          </>
                        )}
                      </button>
                    </div>
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
                <p className="text-xs text-[#9E8E95] font-light max-w-sm">
                  คลิกที่รอบเวลาด้านซ้ายเพื่อดูข้อมูลผู้จองสำหรับกล้อง{' '}
                  <strong className="text-[#3D3040]">{activeCamera === 'all' ? 'ทุกรุ่น' : activeCamera}</strong>{' '}
                  หรือกดปุ่ม <strong>🔄 สลับ</strong> เพื่อเปลี่ยนสถานะ ว่าง/เต็ม ทันที
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Selected Slot Header with Quick Action */}
                {(() => {
                  const activeBookings = selectedSlotBookings.filter(b => b.status !== 'cancelled');
                  const hasActive = activeBookings.length > 0;
                  const isEffBooked = selectedSlot
                    ? isSlotBookedForCurrentCamera(selectedSlot)
                    : hasActive;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-[#9E8E95] uppercase tracking-wider font-semibold">
                            รอบเวลาที่เลือก ({activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              !isEffBooked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            {!isEffBooked
                              ? '🟢 สถานะ: ว่าง'
                              : hasActive
                              ? '🔴 สถานะ: เต็ม (มีผู้จอง)'
                              : '🔴 สถานะ: เต็ม (แอดมินล็อก)'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xl text-[#3D3040] font-mono mt-0.5">
                          {selectedSlotTime}{' '}
                          <span className="text-sm font-sans text-[#9E8E95] font-normal">น.</span>
                        </h4>
                      </div>

                      {selectedSlot && (
                        <button
                          type="button"
                          disabled={togglingSlotTime === selectedSlot.time}
                          onClick={() =>
                            onToggleSingleSlot(
                              selectedSlot.time,
                              isEffBooked ? 'booked' : 'available'
                            )
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border ${
                            !isEffBooked
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {togglingSlotTime === selectedSlot.time ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              <span>กำลังบันทึก...</span>
                            </>
                          ) : (
                            <>
                              <span>🔄</span>
                              <span>
                                สลับเป็น{' '}
                                {!isEffBooked
                                  ? `🔴 เต็ม (${activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})`
                                  : `🟢 ว่าง (${activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})`}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}

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
                      👤 ผู้จองในรอบนี้ ({activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera}){' '}
                      <span className="font-normal text-[#9E8E95]">
                        ({selectedSlotBookings.length} รายการ)
                      </span>
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
                              <a
                                href={`tel:${b.customerPhone}`}
                                className="text-xs text-[#F4A0B5] hover:underline font-mono"
                              >
                                📞 {b.customerPhone}
                              </a>
                            </div>
                          </div>

                          {/* Status Select */}
                          <select
                            value={b.status}
                            onChange={e => handleUpdateStatus(b.id, e.target.value as any)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/30 flex-shrink-0 ${
                              statusColorMap[b.status]
                            }`}
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
                            <span className="font-semibold text-[#3D3040] truncate block">
                              {b.lineDisplayName || '—'}
                            </span>
                          </div>
                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-[10px] text-[#9E8E95] block mb-0.5">📷 รุ่นกล้อง</span>
                            <span className="font-semibold text-[#3D3040] truncate block">
                              {b.cameraType || activeCamera || '—'}
                            </span>
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
                              <>
                                <span>✨</span>
                                <span>คัดลอกสำเร็จ!</span>
                              </>
                            ) : (
                              <>
                                <span>📋</span>
                                <span>คัดลอกข้อความยืนยันคิว</span>
                              </>
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
                    <p className="font-bold text-sm text-[#3D3040]">
                      ยังไม่มีผู้จองกล้อง "{activeCamera === 'all' ? 'ทุกรุ่น' : activeCamera}" ในรอบนี้
                    </p>
                    <p className="text-xs text-[#9E8E95] font-light max-w-xs">
                      รอบ {selectedSlotTime} น. ยังไม่มีประวัติการจองสำหรับกล้องรุ่นนี้
                    </p>
                    {selectedSlot && isSlotBookedForCurrentCamera(selectedSlot) && (
                      <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl mt-1">
                        🔒 รอบเวลานี้ถูกล็อกเป็น "เต็ม" สำหรับกล้อง "{activeCamera}" โดยแอดมิน
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
            💡 การเปลี่ยนสถานะรอบเวลาจะบันทึกและ Sync กับ LINE Bot ของกล้องแต่ละรุ่นโดยอัตโนมัติ
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
