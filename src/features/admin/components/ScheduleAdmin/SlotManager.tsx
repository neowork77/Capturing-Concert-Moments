import { useState, useEffect, useMemo, useOptimistic, useTransition } from 'react';
import type { ScheduleRecord } from '@/shared/types/schedule';
import { SlotStatus, TimeSlot } from '@/shared/types/schedule';
import {
  fetchBookingsAction,
  createBookingAction,
  updateBookingStatusAction,
  updatePaymentStatusAction,
  deleteBookingAction,
} from '@/features/admin/actions/booking-actions';
import {
  addScheduleSlotAction,
  removeScheduleSlotAction,
} from '@/features/admin/actions/schedule-actions';
import type { BookingRecord } from '@/shared/services/booking-service';
import type { CameraRecord } from '@/shared/services/camera-service';

import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/features/admin/lib/admin-cache';
import { alertDialog, confirmDialog, promptDialog, StatusBadge, StatCard, Spinner } from '@/features/admin/components/ui';
import { SLOT_STATUS } from '@/shared/utils/status-display';
import { formatBaht, formatThaiDateTime } from '@/shared/utils/format-utils';
import { isSameCamera } from '@/shared/utils/camera-utils';
import { useAdminData } from '@/features/admin/hooks/useAdminData';
import BookingEditModal from '@/features/admin/components/BookingAdmin/BookingEditModal';
import BookingForm from '@/features/admin/components/BookingAdmin/BookingForm';

interface SlotManagerProps {
  activeSlotSchedule: ScheduleRecord;
  selectedCameraName?: string;
  cameras?: CameraRecord[];
  onSelectCamera?: (cameraName: string) => void;
  onClose: () => void;
  onEditSchedule?: (schedule: ScheduleRecord) => void;
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
  onUpdateActiveSchedule?: (schedule: ScheduleRecord) => void;
}



/**
 * Normalizes date string into YYYY-MM-DD
 */
function normalizeDate(d?: string | null): string {
  if (!d) return '';
  return d.split('T')[0].replace(/\//g, '-').trim();
}

function isDateMatch(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  return normalizeDate(d1) === normalizeDate(d2);
}

/**
 * Normalizes time string: "11.00", "11:00 น.", " 11:00 " -> "11:00"
 */
function cleanTimeStr(t?: string | null): string {
  if (!t) return '';
  return t
    .replace(/\s+/g, '')
    .replace(/\./g, ':')
    .replace(/น\.?$/i, '')
    .trim();
}

/**
 * Robust time slot matching:
 * Matches "11:00" to "11:00-11:20", "11.00" to "11:00", exact matches, or substring ranges.
 */
function isTimeSlotMatch(bTime?: string | null, sTime?: string | null): boolean {
  if (!bTime || !sTime) return false;
  const bNorm = cleanTimeStr(bTime);
  const sNorm = cleanTimeStr(sTime);
  if (bNorm === sNorm) return true;

  // Split range if present (e.g. "11:00-11:20" -> start "11:00")
  const bStart = bNorm.split('-')[0].trim();
  const sStart = sNorm.split('-')[0].trim();
  if (bStart && sStart && bStart === sStart) return true;

  if (sNorm.includes(bNorm) || bNorm.includes(sNorm)) return true;
  return false;
}

/**
 * Lenient event name matching when date matches:
 * Does not discard bookings due to minor quote, case, or keyword variations.
 */
function isEventMatch(bEvent?: string | null, sEvent?: string | null): boolean {
  if (!sEvent || !sEvent.trim()) return true;
  if (!bEvent || !bEvent.trim()) return true;

  const clean = (s: string) =>
    s
      .replace(/[\u2018\u2019\u201C\u201D'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  const b = clean(bEvent);
  const s = clean(sEvent);

  if (b === s || b.includes(s) || s.includes(b)) return true;

  const bWords = b.split(' ').filter(w => w.length > 2);
  const sWords = s.split(' ').filter(w => w.length > 2);
  if (bWords.length > 0 && sWords.length > 0) {
    const common = bWords.filter(w => sWords.includes(w));
    if (common.length >= 1) return true;
  }
  return false;
}

/**
 * Camera matching:
 * Empty/all camera filter matches everything.
 */
function isCameraMatch(bCam?: string | null, activeCam?: string | null): boolean {
  if (!activeCam || activeCam === 'all') return true;
  if (!bCam || !bCam.trim()) return true;
  const bNorm = bCam.trim().toLowerCase();
  const aNorm = activeCam.trim().toLowerCase();
  return bNorm === aNorm || bNorm.includes(aNorm) || aNorm.includes(bNorm);
}


export default function SlotManager({
  activeSlotSchedule: propSchedule,
  selectedCameraName,
  cameras = [],
  onSelectCamera,
  onClose,
  onEditSchedule,
  handleToggleSlot,
  setAllSlotsStatus,
  onUpdateActiveSchedule,
}: SlotManagerProps) {

  const { bookings, mutateBookings, schedules, mutateSchedules, isLoading: isLoadingBookings } = useAdminData();

  // Dynamically resolve activeSlotSchedule to the latest one from SWR schedules
  const activeSlotSchedule = useMemo(() => {
    return schedules.find(s => s.id === propSchedule.id) || propSchedule;
  }, [schedules, propSchedule]);

  const [, startTransition] = useTransition();

  // Optimistic UI for immediate slot status flips without waiting for server response
  const [optimisticSlots, setOptimisticSlots] = useOptimistic(
    activeSlotSchedule.slots || [],
    (
      currentSlots: TimeSlot[],
      action:
        | { type: 'toggle'; slotTime: string; newStatus: SlotStatus; cameraType?: string }
        | { type: 'bulk'; targetStatus: SlotStatus; cameraType?: string }
    ) => {
      if (action.type === 'bulk') {
        const { targetStatus, cameraType } = action;
        return currentSlots.map(s => {
          if (cameraType && cameraType !== 'all') {
            const camStatuses = { ...(s.cameraStatuses || {}), [cameraType]: targetStatus };
            let slotStatus: SlotStatus = s.status;
            if (targetStatus === 'available') {
              slotStatus = 'available';
            } else if (cameras.length > 0) {
              const allCamsBooked = cameras.every(c => {
                const k = Object.keys(camStatuses).find(ck => isSameCamera(ck, c.name));
                return k ? camStatuses[k] === 'booked' : false;
              });
              slotStatus = allCamsBooked ? 'booked' : 'available';
            }
            return { ...s, cameraStatuses: camStatuses, status: slotStatus };
          }
          return { ...s, status: targetStatus };
        });
      }

      const cleanTime = action.slotTime.replace(/\s+/g, '');
      let matched = false;
      const updated = currentSlots.map(slot => {
        if (slot.time.replace(/\s+/g, '') === cleanTime) {
          matched = true;
          const camStatuses = { ...(slot.cameraStatuses || {}) };
          let effectiveStatus: SlotStatus = slot.status;

          if (!action.cameraType || action.cameraType === 'all') {
            effectiveStatus = action.newStatus;
            if (cameras.length > 0) {
              cameras.forEach(c => {
                camStatuses[c.name] = action.newStatus;
              });
            }
          } else {
            const targetCamTrim = action.cameraType.trim();
            Object.keys(camStatuses).forEach(k => {
              if (isSameCamera(k, targetCamTrim)) {
                delete camStatuses[k];
              }
            });
            camStatuses[targetCamTrim] = action.newStatus;

            if (action.newStatus === 'available') {
              effectiveStatus = 'available';
            } else if (cameras.length > 0) {
              const allCamsBooked = cameras.every(c => {
                const k = Object.keys(camStatuses).find(ck => isSameCamera(ck, c.name));
                return k ? camStatuses[k] === 'booked' : false;
              });
              effectiveStatus = allCamsBooked ? 'booked' : 'available';
            } else {
              effectiveStatus = 'available';
            }
          }

          return {
            ...slot,
            status: effectiveStatus,
            ...(Object.keys(camStatuses).length > 0 ? { cameraStatuses: camStatuses } : {}),
          };
        }
        return slot;
      });

      if (!matched) {
        const camStatuses: Record<string, SlotStatus> = {};
        let initialStatus: SlotStatus = 'available';

        if (!action.cameraType || action.cameraType === 'all') {
          initialStatus = action.newStatus;
          if (cameras.length > 0) {
            cameras.forEach(c => {
              camStatuses[c.name] = action.newStatus;
            });
          }
        } else {
          camStatuses[action.cameraType.trim()] = action.newStatus;
          initialStatus = 'available';
        }

        updated.push({
          time: action.slotTime.trim(),
          status: initialStatus,
          ...(Object.keys(camStatuses).length > 0 ? { cameraStatuses: camStatuses } : {}),
        });
      }

      return updated;
    }
  );

  const [activeCamera, setActiveCamera] = useState<string>(
    selectedCameraName || cameras[0]?.name || 'all'
  );
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [slotCameraFilter, setSlotCameraFilter] = useState<'selected' | 'all'>('selected');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);
  const [copiedLineUserId, setCopiedLineUserId] = useState<number | null>(null);
  const [togglingSlotTime, setTogglingSlotTime] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'slots' | 'details'>('slots');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Dynamic Slot Management States
  const [newSlotTime, setNewSlotTime] = useState<string>('');
  const [isAddingSlot, setIsAddingSlot] = useState<boolean>(false);
  const [deletingSlotTime, setDeletingSlotTime] = useState<string | null>(null);
  const [isSlotAddOpen, setIsSlotAddOpen] = useState<boolean>(false);

  // Full Booking Editing State
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);

  // Manual Create Booking State
  const [isCreateBookingModalOpen, setIsCreateBookingModalOpen] = useState<boolean>(false);
  const [isSavingBooking, setIsSavingBooking] = useState<boolean>(false);
  const [bookingFormData, setBookingFormData] = useState({
    date: '',
    eventName: '',
    timeSlot: '',
    customerName: '',
    customerPhone: '',
    lineDisplayName: '',
    cameraType: '',
    notes: '',
    paymentStatus: 'unpaid' as 'unpaid' | 'deposit' | 'paid',
    depositAmount: 0,
    remainingAmount: 0,
  });

  const handleOpenCreateBooking = () => {
    const defaultCam = (activeCamera !== 'all' ? activeCamera : cameras[0]?.name) || '';
    setBookingFormData({
      date: normalizeDate(activeSlotSchedule.date) || activeSlotSchedule.date || '',
      eventName: activeSlotSchedule.eventName || '',
      timeSlot: selectedSlotTime || '',
      customerName: '',
      customerPhone: '',
      lineDisplayName: '',
      cameraType: defaultCam,
      notes: '',
      paymentStatus: 'unpaid',
      depositAmount: 0,
      remainingAmount: 0,
    });
    setIsCreateBookingModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBooking(true);
    try {
      const res = await createBookingAction({
        ...bookingFormData,
        status: 'confirmed',
      });
      if (res.success) {
        setIsCreateBookingModalOpen(false);
        await Promise.all([mutateBookings(), mutateSchedules()]);
      } else {
        await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง', danger: true });
      }
    } catch {
      await alertDialog({ title: 'เกิดข้อผิดพลาดในการบันทึกการจอง', danger: true });
    } finally {
      setIsSavingBooking(false);
    }
  };

  // Overview Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [overviewCamFilter, setOverviewCamFilter] = useState<'active' | 'all'>('active');

  // Inline Note Editing State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  const suggestedNextSlot = useMemo(() => {
    if (!optimisticSlots || optimisticSlots.length === 0) {
      return '11:00-11:20';
    }
    const last = optimisticSlots[optimisticSlots.length - 1].time;
    const endPart = last.includes('-') ? last.split('-')[1].trim() : last.trim();
    const clean = endPart.replace(/น\.?$/i, '').replace(/\s+/g, '');
    const [hStr, mStr] = clean.split(/[:.]/);
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(h) && !isNaN(m)) {
      let startTotal = h * 60 + m + 10;
      let endTotal = startTotal + 20;
      const sh = String(Math.floor(startTotal / 60) % 24).padStart(2, '0');
      const sm = String(startTotal % 60).padStart(2, '0');
      const eh = String(Math.floor(endTotal / 60) % 24).padStart(2, '0');
      const em = String(endTotal % 60).padStart(2, '0');
      return `${sh}:${sm}-${eh}:${em}`;
    }
    return '18:00-18:20';
  }, [optimisticSlots]);


  useEffect(() => {
    if (selectedCameraName) {
      setActiveCamera(selectedCameraName);
    }
  }, [selectedCameraName]);

  const handleRefreshBookings = async () => {
    setIsRefreshing(true);
    await mutateBookings();
    await Promise.all([mutateBookings(), mutateSchedules()]);
    setIsRefreshing(false);
  };


  // 1) All bookings for this date and event (regardless of camera)
  const allDateBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!isDateMatch(b.date, activeSlotSchedule.date)) return false;
      return isEventMatch(b.eventName, activeSlotSchedule.eventName);
    });
  }, [bookings, activeSlotSchedule.date, activeSlotSchedule.eventName]);

  // Helper to fetch all bookings for a specific slot time
  const getBookingsForSlot = (slotTime: string, cameraName?: string) => {
    return allDateBookings.filter(b => {
      if (!isTimeSlotMatch(b.timeSlot, slotTime)) return false;
      if (cameraName && cameraName !== 'all') {
        return isCameraMatch(b.cameraType, cameraName);
      }

      return true;
    });
  };

  // Check if slot is effectively booked for current camera
  const isSlotBookedForCurrentCamera = (slot: TimeSlot): boolean => {
    const camBookings = getBookingsForSlot(slot.time, activeCamera);
    const activeBookings = camBookings.filter(b => b.status !== 'cancelled');

    if (activeCamera && activeCamera !== 'all') {
      if (activeBookings.length > 0) return true;

      if (slot.cameraStatuses && Object.keys(slot.cameraStatuses).length > 0) {
        const key = Object.keys(slot.cameraStatuses).find(k => isSameCamera(k, activeCamera));
        if (key) {
          return slot.cameraStatuses[key] === 'booked';
        }
        return false;
      }

      return slot.status === 'booked';
    }

    // When activeCamera is 'all'
    if (cameras.length > 0) {
      const allBooked = cameras.every(cam => {
        const camB = getBookingsForSlot(slot.time, cam.name).filter(b => b.status !== 'cancelled');
        if (camB.length > 0) return true;
        if (slot.cameraStatuses) {
          const k = Object.keys(slot.cameraStatuses).find(ck => isSameCamera(ck, cam.name));
          if (k && slot.cameraStatuses[k] === 'booked') return true;
        }
        return false;
      });
      return allBooked || (slot.status === 'booked' && (!slot.cameraStatuses || Object.keys(slot.cameraStatuses).length === 0) && activeBookings.length === 0);
    }

    if (activeBookings.length > 0) return true;
    return slot.status === 'booked';
  };

  // Stats calculation
  const slotStats = useMemo(() => {
    const total = optimisticSlots.length;
    let booked = 0;
    optimisticSlots.forEach(s => {
      if (isSlotBookedForCurrentCamera(s)) booked++;
    });
    const available = Math.max(0, total - booked);
    const bookedPercent = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { total, available, booked, bookedPercent };
  }, [optimisticSlots, allDateBookings, activeCamera]);

  // Selected Slot Object
  const selectedSlot = useMemo(() => {
    if (!selectedSlotTime) return null;
    return (
      optimisticSlots.find(s => isTimeSlotMatch(s.time, selectedSlotTime)) || null
    );
  }, [optimisticSlots, selectedSlotTime]);

  // Bookings for selected slot
  const selectedSlotAllBookings = useMemo(() => {
    if (!selectedSlotTime) return [];
    return getBookingsForSlot(selectedSlotTime);
  }, [selectedSlotTime, allDateBookings]);

  const selectedSlotCamBookings = useMemo(() => {
    if (!selectedSlotTime) return [];
    return getBookingsForSlot(selectedSlotTime, activeCamera);
  }, [selectedSlotTime, allDateBookings, activeCamera]);

  // Bookings to display on right panel based on filter toggle
  const selectedSlotDisplayBookings = useMemo(() => {
    if (activeCamera === 'all' || slotCameraFilter === 'all') {
      return selectedSlotAllBookings;
    }
    return selectedSlotCamBookings;
  }, [selectedSlotAllBookings, selectedSlotCamBookings, activeCamera, slotCameraFilter]);

  // Unmatched bookings on this date (outside standard schedule slots)
  const unmatchedBookings = useMemo(() => {
    return allDateBookings.filter(b => {
      return !optimisticSlots.some(s => isTimeSlotMatch(b.timeSlot, s.time));
    });
  }, [allDateBookings, optimisticSlots]);

  // Filtered bookings for the overview screen (when no slot is selected)
  const filteredOverviewBookings = useMemo(() => {
    return allDateBookings.filter(b => {
      // Camera filter
      if (overviewCamFilter === 'active' && activeCamera !== 'all') {
        if (!isCameraMatch(b.cameraType, activeCamera)) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (b.customerName || '').toLowerCase().includes(q);
        const matchPhone = (b.customerPhone || '').includes(q);
        const matchLine = (b.lineDisplayName || '').toLowerCase().includes(q);
        const matchTime = (b.timeSlot || '').toLowerCase().includes(q);
        const matchCam = (b.cameraType || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchLine && !matchTime && !matchCam) return false;
      }
      return true;
    });
  }, [allDateBookings, overviewCamFilter, activeCamera, statusFilter, searchQuery]);

  // KPI metrics for this date
  const overviewMetrics = useMemo(() => {
    const total = allDateBookings.length;
    const confirmed = allDateBookings.filter(b => b.status === 'confirmed').length;
    const pending = allDateBookings.filter(b => b.status === 'pending').length;
    const cancelled = allDateBookings.filter(b => b.status === 'cancelled').length;
    const totalDeposit = allDateBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.depositAmount || 0), 0);
    const totalRemaining = allDateBookings
      .filter(b => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.remainingAmount || 0), 0);

    return { total, confirmed, pending, cancelled, totalDeposit, totalRemaining };
  }, [allDateBookings]);

  // Handlers
  const handleAddNewSlot = async (customTime?: string) => {
    const targetTime = (customTime || newSlotTime || suggestedNextSlot).trim();
    if (!targetTime) {
      await alertDialog({ title: 'กรุณากรอกรอบเวลา เช่น 18:00-18:20', danger: true });
      return;
    }

    const cleanTarget = targetTime.replace(/\s+/g, '');
    const alreadyExists = optimisticSlots.some(
      s => s.time.replace(/\s+/g, '') === cleanTarget
    );
    if (alreadyExists) {
      await alertDialog({ title: `รอบเวลา "${targetTime}" มีอยู่ในตารางนี้แล้ว`, danger: true });
      return;
    }

    setIsAddingSlot(true);
    try {
      const res = await addScheduleSlotAction(activeSlotSchedule.id, targetTime);
      if (res.success) {
        setNewSlotTime('');
        setIsSlotAddOpen(false);
        await mutateSchedules();
        const updated = res.data;
        if (updated) {
          await mutateSchedules(
            (prev = []) => prev.map(s => (s.id === updated.id ? updated : s)),
            false
          );
          onUpdateActiveSchedule?.(updated);
        } else {
          await mutateSchedules();
        }
      } else {
        await alertDialog({ title: res.message || 'ไม่สามารถเพิ่มรอบเวลาได้', danger: true });
      }
    } finally {
      setIsAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotTime: string, activeBookingCount: number) => {
    if (activeBookingCount > 0) {
      await alertDialog({
        title: `ไม่สามารถลบรอบเวลา "${slotTime}" ได้ เนื่องจากมีรายการจองค้างอยู่ ${activeBookingCount} รายการ กรุณาย้ายหรือยกเลิกการจองก่อน`,
        danger: true,
      });
      return;
    }

    if (
      !(await confirmDialog({
        title: `คุณแน่ใจหรือไม่ว่าต้องการลบรอบเวลา "${slotTime}" ออกจากตารางงาน?`,
        confirmLabel: 'ลบรอบเวลา',
        danger: true,
      }))
    ) {
      return;
    }

    setDeletingSlotTime(slotTime);
    try {
      const res = await removeScheduleSlotAction(activeSlotSchedule.id, slotTime);
      if (res.success) {
        if (selectedSlotTime === slotTime) {
          setSelectedSlotTime(null);
        }
        await mutateSchedules();
        const updated = res.data;
        if (updated) {
          await mutateSchedules(
            (prev = []) => prev.map(s => (s.id === updated.id ? updated : s)),
            false
          );
          onUpdateActiveSchedule?.(updated);
        } else {
          await mutateSchedules();
        }
      } else {
        await alertDialog({ title: res.message || 'ไม่สามารถลบรอบเวลาได้', danger: true });
      }
    } finally {
      setDeletingSlotTime(null);
    }
  };


  const onToggleSingleSlot = (slotTime: string, currentEffectiveStatus: SlotStatus) => {
    const newStatus: SlotStatus = currentEffectiveStatus === 'available' ? 'booked' : 'available';
    setTogglingSlotTime(slotTime);

    startTransition(async () => {
      // 1. Instantly flip status & color optimistically (0ms)
      setOptimisticSlots({
        type: 'toggle',
        slotTime,
        newStatus,
        cameraType: activeCamera,
      });

      try {
        // 2. Sync to server in background
        await handleToggleSlot(activeSlotSchedule, slotTime, currentEffectiveStatus, activeCamera);
      } finally {
        setTogglingSlotTime(null);
      }
    });
  };

  const onBulkSetStatus = (targetStatus: SlotStatus) => {
    setIsBulkLoading(true);

    startTransition(async () => {
      // 1. Instantly flip all slots optimistically (0ms)
      setOptimisticSlots({
        type: 'bulk',
        targetStatus,
        cameraType: activeCamera,
      });

      try {
        await setAllSlotsStatus(activeSlotSchedule, targetStatus, activeCamera);
      } finally {
        setIsBulkLoading(false);
      }
    });
  };

  const handleUpdateStatus = async (id: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const res = await updateBookingStatusAction(id, newStatus);
    if (res.success) {
      await mutateBookings();
    } else {
      await alertDialog({ title: res.message || 'ไม่สามารถอัปเดตสถานะได้', danger: true });
    }
  };

  const handleUpdatePaymentStatus = async (
    id: number,
    newPaymentStatus: 'unpaid' | 'deposit' | 'paid',
    depositAmount?: number,
    remainingAmount?: number
  ) => {
    const res = await updatePaymentStatusAction(id, newPaymentStatus, depositAmount, remainingAmount);
    if (res.success) {
      await mutateBookings();
    } else {
      await alertDialog({ title: res.message || 'ไม่สามารถอัปเดตสถานะชำระเงินได้', danger: true });
    }
  };

  const handleSaveNote = async (id: number) => {
    setIsSavingNote(true);
    try {
      const b = bookings.find(item => item.id === id);
      if (!b) return;
      const res = await updateBookingStatusAction(
        id,
        b.status,
        noteDraft,
        b.paymentStatus,
        b.depositAmount || 0,
        b.remainingAmount || 0
      );
      if (res.success) {
        setEditingNoteId(null);
        await mutateBookings();
      } else {
        await alertDialog({ title: res.message || 'ไม่สามารถบันทึกหมายเหตุได้', danger: true });
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteBooking = async (id: number, customerName: string) => {
    if (!(await confirmDialog({ title: `คุณแน่ใจหรือไม่ว่าต้องการลบรายการจองของ คุณ${customerName} (#BK-${id})?`, confirmLabel: 'ลบรายการ', danger: true }))) {
      return;
    }
    const res = await deleteBookingAction(id);
    if (res.success) {
      await mutateBookings();
    } else {
      await alertDialog({ title: res.message || 'ไม่สามารถลบรายการจองได้', danger: true });
    }
  };

  const copyConfirmationText = (b: BookingRecord) => {
    const text = `#${b.eventName}\n📅 วันที่: ${b.date}\n⏰ เวลา: ${b.timeSlot} น.\n📷 กล้อง: ${b.cameraType || '-'}\n👤 K.${b.customerName} (${b.customerPhone})\n💬 LINE: ${b.lineDisplayName || '-'}\n💰 สถานะชำระ: ${b.paymentStatus === 'paid' ? 'ชำระเต็มแล้ว' : b.paymentStatus === 'deposit' ? `มัดจำ ฿${b.depositAmount?.toLocaleString() || 0}` : 'ยังไม่ชำระ'}\nสถานะคิว: ${b.status === 'confirmed' ? 'คอนเฟิร์มคิวแล้วเรียบร้อยค่ะ ✨' : 'รอคอนเฟิร์มคิว'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPhone = (phone: string, id: number) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const copyLineId = (lineUserId: string, id: number) => {
    navigator.clipboard.writeText(lineUserId);
    setCopiedLineUserId(id);
    setTimeout(() => setCopiedLineUserId(null), 2000);
  };

  const statusColorMap = {
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        data-lenis-prevent
        className="bg-[#FDFBFC] rounded-[1.75rem] sm:rounded-[2rem] w-full max-w-6xl shadow-2xl border border-[rgba(0,0,0,0.06)] relative flex flex-col h-[calc(100dvh-1rem)] sm:h-[88vh] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0 bg-white/90">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {activeSlotSchedule.imageUrl ? (
              <img
                src={activeSlotSchedule.imageUrl}
                alt={activeSlotSchedule.eventName || 'Concert Poster'}
                className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl object-cover border border-[rgba(0,0,0,0.08)] shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 border border-[#F4A0B5]/20 flex flex-col items-center justify-center text-[#F4A0B5] flex-shrink-0">
                <span className="text-base sm:text-lg">🎤</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-micro sm:text-xs font-bold text-[#F4A0B5] uppercase tracking-widest">
                  Slot Manager & Bookings
                </span>
                <span
                  className={`text-micro sm:text-micro font-bold px-2 py-0.5 rounded-full border ${
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
                <span className="text-micro sm:text-micro bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded-full">
                  📋 ผู้จอง {allDateBookings.length} รายการ
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-lg text-[#3D3040] truncate mt-0.5">
                {activeSlotSchedule.eventName || 'ไม่ได้ระบุชื่องาน'}
              </h3>
              <p className="text-micro sm:text-xs text-[var(--ink-muted)] flex flex-wrap items-center gap-2 mt-0.5">
                <span>📅 {activeSlotSchedule.date}</span>
                {activeSlotSchedule.location && (
                  <span className="truncate max-w-[200px]">📍 {activeSlotSchedule.location}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEditSchedule && (
              <button
                type="button"
                onClick={() => onEditSchedule(activeSlotSchedule)}
                className="px-2.5 py-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white hover:bg-neutral-50 text-xs font-semibold text-[#3D3040] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="แก้ไขรายละเอียดงานนี้ (ชื่องาน, สถานที่, รูปภาพ, วันที่)"
              >
                <span>✏️</span>
                <span className="hidden sm:inline">แก้ไขข้อมูลงาน</span>
              </button>
            )}
            <button
              onClick={handleRefreshBookings}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-100 cursor-pointer transition-all disabled:opacity-50"
              title="โหลดข้อมูลผู้จองใหม่จากฐานข้อมูล"
            >
              <span className={isRefreshing ? 'animate-spin inline-block' : 'inline-block'}>🔄</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-100 cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ===== CAMERA SELECTOR TABS ===== */}
        <div className="px-4 sm:px-6 py-2 sm:py-2.5 bg-neutral-50/90 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between gap-3 overflow-x-auto flex-shrink-0 no-scrollbar">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-[#3D3040] flex items-center gap-1">
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
                {(() => {
                  const count = allDateBookings.filter(b => isCameraMatch(b.cameraType, cam.name) && b.status !== 'cancelled').length;
                  return count > 0 ? (
                    <span className={`text-micro px-1.5 py-0.5 rounded-full font-mono ${
                      activeCamera === cam.name ? 'bg-white/30 text-white' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {count}
                    </span>
                  ) : null;
                })()}
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
              <span className={`text-micro px-1.5 py-0.5 rounded-full font-mono ${
                activeCamera === 'all' ? 'bg-white/30 text-white' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {allDateBookings.filter(b => b.status !== 'cancelled').length}
              </span>
            </button>
          </div>
          <span className="text-micro text-[var(--ink-muted)] font-medium hidden md:inline-block flex-shrink-0">
            * คิวและสล็อตแยกตามรุ่นกล้องอย่างอิสระ
          </span>
        </div>

        {/* ===== MOBILE VIEW SWITCHER TABS ===== */}
        <div className="flex sm:hidden items-center border-b border-[rgba(0,0,0,0.06)] bg-neutral-100/70 p-1.5 gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('slots')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'slots'
                ? 'bg-white text-[#3D3040] shadow-xs'
                : 'text-[var(--ink-muted)] hover:text-[#3D3040]'
            }`}
          >
            <span>⏰ ผังสล็อตเวลา</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('details')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'details'
                ? 'bg-white text-[#3D3040] shadow-xs'
                : 'text-[var(--ink-muted)] hover:text-[#3D3040]'
            }`}
          >
            <span>📋 ข้อมูลผู้จอง</span>
            <span className="text-micro px-1.5 py-0.5 rounded-md bg-[#F4A0B5]/20 text-[#D4708F] font-mono font-bold">
              {selectedSlotTime ? selectedSlotTime : allDateBookings.length}
            </span>
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* ---- LEFT PANEL: Slot Grid ---- */}
          <div
            className={`${
              mobileTab === 'details' ? 'hidden sm:flex' : 'flex'
            } sm:w-72 lg:w-80 flex-shrink-0 flex-col border-b sm:border-b-0 sm:border-r border-[rgba(0,0,0,0.06)] bg-white/60 min-h-0 flex-1 sm:flex-initial overflow-hidden`}
          >
            <div className="px-4 pt-3 pb-3 flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#3D3040] truncate">
                  รอบเวลา {activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera}
                </span>
                <span className="text-[var(--ink-muted)]">{slotStats.bookedPercent}% เต็ม</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${slotStats.bookedPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  🟢 ว่าง {slotStats.available}
                </span>
                <span className="flex-1 text-center py-1 rounded-lg bg-rose-50 text-rose-600 font-bold border border-rose-200">
                  🔴 เต็ม {slotStats.booked}
                </span>
              </div>
            </div>

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

            {/* Quick Add Slot Section */}
            <div className="px-4 pb-2.5 flex-shrink-0">
              {isSlotAddOpen ? (
                <div className="p-2.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#3D3040]">
                    <span>➕ เพิ่มรอบเวลาใหม่</span>
                    <button
                      type="button"
                      onClick={() => setIsSlotAddOpen(false)}
                      className="text-[var(--ink-muted)] hover:text-[#3D3040] text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={suggestedNextSlot}
                      value={newSlotTime}
                      onChange={e => setNewSlotTime(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewSlot();
                        }
                      }}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-[rgba(0,0,0,0.12)] text-xs text-[#3D3040] bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                    />
                    <button
                      type="button"
                      disabled={isAddingSlot}
                      onClick={() => handleAddNewSlot()}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-60 flex items-center gap-1 flex-shrink-0"
                    >
                      {isAddingSlot ? '⏳' : '+ เพิ่ม'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-micro text-[var(--ink-muted)]">แนะนำ:</span>
                    <button
                      type="button"
                      onClick={() => handleAddNewSlot(suggestedNextSlot)}
                      className="text-micro font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-purple-200 text-purple-700 hover:bg-purple-100/60 cursor-pointer"
                    >
                      + {suggestedNextSlot}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSlotAddOpen(true)}
                  className="w-full py-1.5 px-3 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200/80 text-purple-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>➕ เพิ่มรอบเวลาใหม่</span>
                </button>
              )}
            </div>

            {/* Quick reset slot selection to view all overview */}
            {selectedSlotTime && (
              <div className="px-4 pb-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedSlotTime(null)}
                  className="w-full py-1 px-2.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>✕ ยกเลิกการเลือกรอบเวลา (ดูภาพรวมทั้งหมด)</span>
                </button>
              </div>
            )}

            {/* Slots Grid List */}
            <div
              data-lenis-prevent
              className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro font-semibold text-[var(--ink-muted)]">
                  รอบเวลา / สลับสถานะ
                </p>
                <span className="text-micro text-[var(--ink-muted)]">คลิกเพื่อดูรายละเอียด</span>
              </div>
              <div className="flex flex-col gap-2">
                {optimisticSlots.map(slot => {
                  const slotAllBookings = getBookingsForSlot(slot.time);
                  const slotActiveAllBookings = slotAllBookings.filter(b => b.status !== 'cancelled');

                  const slotCamBookings =
                    activeCamera === 'all'
                      ? slotActiveAllBookings
                      : slotActiveAllBookings.filter(b => isCameraMatch(b.cameraType, activeCamera));

                  const otherCamCount =
                    activeCamera !== 'all'
                      ? slotActiveAllBookings.filter(b => !isCameraMatch(b.cameraType, activeCamera)).length
                      : 0;

                  const hasActiveBooking = slotCamBookings.length > 0;
                  const isEffectivelyBooked = isSlotBookedForCurrentCamera(slot);
                  const isEffectivelyAvailable = !isEffectivelyBooked;
                  const isSelected = selectedSlotTime && isTimeSlotMatch(slot.time, selectedSlotTime);
                  const isToggling = togglingSlotTime === slot.time;
                  const firstBooking = slotCamBookings[0] || slotActiveAllBookings[0];

                  // บรรทัดที่สองของแถว: บอกบริบทของรอบนี้แบบข้อความเดียว
                  const contextLine = hasActiveBooking
                    ? `คุณ${firstBooking.customerName}${
                        activeCamera === 'all' && firstBooking.cameraType
                          ? ` · ${firstBooking.cameraType}`
                          : ''
                      }`
                    : isEffectivelyBooked
                      ? '🔒 แอดมินล็อกไว้'
                      : otherCamCount > 0
                        ? `📷 มีผู้จองกล้องรุ่นอื่น ${otherCamCount} รายการ (กล้องนี้ว่าง)`
                        : 'ยังไม่มีผู้จอง';

                  return (
                    <div
                      key={slot.time}
                      onClick={() => {
                        const nextTime = isSelected ? null : slot.time;
                        setSelectedSlotTime(nextTime);
                        setSlotCameraFilter('selected');
                        if (nextTime) setMobileTab('details');
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer touch-pan-y ${
                        isSelected
                          ? 'bg-[#F4A0B5]/15 border-[#F4A0B5] ring-2 ring-[#F4A0B5]/40'
                          : isEffectivelyAvailable
                            ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-400'
                            : 'bg-rose-50/60 border-rose-200 hover:border-rose-400'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-base font-bold text-[var(--ink)]">
                            {slot.time}
                          </span>
                          <StatusBadge
                            status={isEffectivelyAvailable ? SLOT_STATUS.available : SLOT_STATUS.booked}
                          />
                          {slotCamBookings.length > 1 && (
                            <span className="text-micro font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md">
                              +{slotCamBookings.length} คิว
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-1 text-xs text-[var(--ink-muted)] truncate"
                          title={contextLine}
                        >
                          {contextLine}
                        </p>
                      </div>
                    
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={e => {
                            e.stopPropagation();
                            onToggleSingleSlot(slot.time, isEffectivelyBooked ? 'booked' : 'available');
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer touch-manipulation disabled:opacity-80 ${
                            isEffectivelyAvailable
                              ? 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                          title={`สลับรอบนี้เป็น ${isEffectivelyAvailable ? 'เต็ม' : 'ว่าง'} สำหรับ ${activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera}`}
                        >
                          <span className={isToggling ? 'animate-spin inline-block' : ''} aria-hidden>🔄</span>
                          <span>{isEffectivelyAvailable ? 'ปิดรับ' : 'เปิดรับ'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={deletingSlotTime === slot.time}
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteSlot(slot.time, slotActiveAllBookings.length);
                          }}
                          className="p-1.5 rounded-lg text-xs text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                          title={`ลบรอบ ${slot.time} ออก`}
                        >
                          {deletingSlotTime === slot.time ? (
                            <span className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            '🗑️'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---- RIGHT PANEL ---- */}
          {/* ---- RIGHT PANEL: Booking Details & Management ---- */}
          <div
            className={`${
              mobileTab === 'slots' ? 'hidden sm:flex' : 'flex'
            } flex-1 flex-col min-w-0 overflow-hidden min-h-0 bg-[#FCFAFB]`}
          >
            {/* VIEW A: NO SLOT SELECTED -> SHOW ALL BOOKINGS FOR THIS DATE */}
            {!selectedSlotTime ? (
              <div
                data-lenis-prevent
                className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
              >
                <div className="sm:hidden mb-2">
                  <button
                    type="button"
                    onClick={() => setMobileTab('slots')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4A0B5]/10 text-xs font-semibold text-[#F4A0B5] hover:bg-[#F4A0B5]/20 cursor-pointer"
                  >
                    <span>‹ กลับไปเลือกผังสล็อต</span>
                  </button>
                </div>

                {isLoadingBookings ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--ink-muted)]">
                    <div className="w-7 h-7 rounded-full border-2 border-[#F4A0B5] border-t-transparent animate-spin" />
                    <span className="text-xs font-medium">กำลังโหลดข้อมูลผู้จอง...</span>
                  </div>
                ) : allDateBookings.length > 0 ? (
                  <>
                    {/* สรุปยอดของวันงานนี้ — ใช้ overviewMetrics ที่คำนวณไว้แล้ว */}
                    <section className="space-y-2.5">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[var(--ink)]">
                          สรุปผู้จองวันที่ {activeSlotSchedule.date}
                        </h4>
                        <span className="text-xs text-[var(--ink-muted)]">
                          ทั้งหมด {overviewMetrics.total} รายการ
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <StatCard
                          label="คอนเฟิร์มแล้ว"
                          value={overviewMetrics.confirmed}
                          unit="คิว"
                          tone="emerald"
                        />
                        <StatCard
                          label="รอคอนเฟิร์ม"
                          value={overviewMetrics.pending}
                          unit="คิว"
                          tone="amber"
                        />
                        <StatCard
                          label="ยกเลิก"
                          value={overviewMetrics.cancelled}
                          unit="คิว"
                          tone="rose"
                        />
                        <StatCard
                          label="ยอดมัดจำรวม"
                          value={formatBaht(overviewMetrics.totalDeposit)}
                          tone="purple"
                        />
                      </div>
                      {overviewMetrics.totalRemaining > 0 && (
                        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center justify-between gap-2">
                          <span>ยอดคงเหลือรอชำระในวันงาน</span>
                          <span className="font-mono font-bold">
                            {formatBaht(overviewMetrics.totalRemaining)}
                          </span>
                        </p>
                      )}
                    </section>

                    {/* Unmatched Bookings Banner (Off-schedule) */}
                    {unmatchedBookings.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                          <span>⚠️</span>
                          <span>พบคิวนอกรอบเวลาปกติ ({unmatchedBookings.length} รายการ)</span>
                        </div>
                        <p className="text-xs text-amber-700 font-light">
                          รายการจองด้านล่างมีรอบเวลาที่ไม่ได้อยู่ในผังสล็อตมาตรฐานของงานนี้:
                        </p>
                        <div className="space-y-1.5">
                          {unmatchedBookings.map(b => (
                            <div
                              key={b.id}
                              className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#3D3040]">คุณ{b.customerName}</span>
                                <span className="font-mono text-amber-700">⏰ {b.timeSlot} น.</span>
                                {b.cameraType && <span className="text-micro text-[var(--ink-muted)]">📷 {b.cameraType}</span>}
                              </div>
                              <span className={`text-micro font-bold px-1.5 py-0.5 rounded border ${statusColorMap[b.status]}`}>
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search & Filter Bar */}
                    <div className="p-3 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, LINE, รอบเวลา..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                        />
                        <span className="absolute left-2.5 top-1.5 text-xs text-[var(--ink-muted)]">🔍</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Filter */}
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none cursor-pointer"
                        >
                          <option value="all">ทุกสถานะ ({allDateBookings.length})</option>
                          <option value="confirmed">🟢 คอนเฟิร์ม ({overviewMetrics.confirmed})</option>
                          <option value="pending">🟡 รอคอนเฟิร์ม ({overviewMetrics.pending})</option>
                          <option value="cancelled">🔴 ยกเลิก ({overviewMetrics.cancelled})</option>
                        </select>

                        {/* Camera Filter toggle */}
                        {activeCamera !== 'all' && (
                          <button
                            type="button"
                            onClick={() =>
                              setOverviewCamFilter(prev => (prev === 'active' ? 'all' : 'active'))
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                              overviewCamFilter === 'active'
                                ? 'bg-[#F4A0B5]/15 text-[#D4708F] border-[#F4A0B5]/40'
                                : 'bg-white text-[var(--ink-muted)] border-[rgba(0,0,0,0.08)]'
                            }`}
                          >
                            {overviewCamFilter === 'active' ? `📷 เฉพาะ ${activeCamera}` : '✨ ทุกกล้อง'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bookings List Cards */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-[#3D3040] px-1">
                        <span>👤 รายชื่อผู้จอง ({filteredOverviewBookings.length} รายการ)</span>
                        <span className="text-micro text-[var(--ink-muted)] font-normal">
                          💡 คลิกที่รายการเพื่อดูหรือแก้ไขรายละเอียดเต็ม
                        </span>
                      </div>

                      {filteredOverviewBookings.length === 0 ? (
                        <div className="py-8 text-center bg-white rounded-2xl border border-[rgba(0,0,0,0.05)] text-[var(--ink-muted)] text-xs">
                          ไม่พบรายการจองตามเงื่อนไขที่ค้นหา
                        </div>
                      ) : (
                        filteredOverviewBookings.map(b => (
                          <div
                            key={b.id}
                            onClick={() => {
                              setSelectedSlotTime(b.timeSlot);
                              setMobileTab('details');
                            }}
                            className="group p-3.5 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs hover:border-[#F4A0B5]/50 hover:shadow-sm cursor-pointer transition-all space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 flex items-center justify-center text-sm flex-shrink-0">
                                  👤
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-[#3D3040] truncate">
                                      คุณ{b.customerName}
                                    </span>
                                    <span className="text-micro font-mono font-bold text-[var(--ink-muted)] bg-neutral-100 px-1.5 py-0.5 rounded">
                                      #BK-{b.id}
                                    </span>
                                    <span
                                      className={`text-micro font-bold px-1.5 py-0.5 rounded-md border ${
                                        statusColorMap[b.status]
                                      }`}
                                    >
                                      {b.status === 'confirmed'
                                        ? '✅ คอนเฟิร์ม'
                                        : b.status === 'pending'
                                        ? '🟡 รอ'
                                        : '🔴 ยกเลิก'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)] mt-0.5">
                                    <span className="font-mono text-[var(--ink)] font-semibold">
                                      📞 {b.customerPhone}
                                    </span>
                                    {b.lineDisplayName && (
                                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-micro">
                                        💬 {b.lineDisplayName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="font-mono text-xs font-bold text-[#3D3040] bg-neutral-100 px-2 py-0.5 rounded-lg">
                                  ⏰ {b.timeSlot} น.
                                </span>
                                {b.cameraType && (
                                  <span className="text-micro text-[var(--ink-muted)] mt-1">
                                    📷 {b.cameraType}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Payment & Action row */}
                            <div className="flex items-center justify-between pt-2 border-t border-[rgba(0,0,0,0.04)] text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded-lg border text-micro ${
                                    b.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : b.paymentStatus === 'deposit'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                                  }`}
                                >
                                  {b.paymentStatus === 'paid'
                                    ? '✅ ชำระครบแล้ว'
                                    : b.paymentStatus === 'deposit'
                                    ? `💵 มัดจำ ฿${b.depositAmount?.toLocaleString() || 0}`
                                    : '⏳ ยังไม่ชำระ'}
                                </span>
                                {b.paymentStatus === 'deposit' && b.remainingAmount && b.remainingAmount > 0 && (
                                  <span className="text-amber-700 font-mono font-medium text-micro">
                                    คงเหลือ ฿{b.remainingAmount.toLocaleString()}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">

                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setEditingBooking(b);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#F4A0B5]/10 hover:bg-[#F4A0B5]/20 text-[#D4708F] border border-[#F4A0B5]/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                                  title="แก้ไขข้อมูลทั้งหมดของผู้จองรายนี้"
                                >
                                  <span>✏️</span>
                                  <span>แก้ไข</span>
                                </button>
                                <span className="text-micro text-[#F4A0B5] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                                  <span>ดูรอบเวลา</span>
                                  <span>›</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-[var(--ink-muted)]">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/10 to-[#D4B5E0]/20 border border-[#F4A0B5]/20 flex items-center justify-center mb-4">
                      <span className="text-3xl">📭</span>
                    </div>
                    <p className="font-bold text-sm text-[#3D3040] mb-1">ยังไม่มีผู้จองในงานนี้</p>
                    <p className="text-xs text-[var(--ink-muted)] font-light max-w-sm">
                      คลิกที่รอบเวลาด้านซ้ายเพื่อดูรายละเอียด หรือกดปุ่ม <strong>🔄 สลับ</strong> เพื่อเปลี่ยนสถานะ ว่าง/เต็ม ทันที
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* VIEW B: A SPECIFIC SLOT IS SELECTED */
              <div
                data-lenis-prevent
                className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
              >
                {/* Back button on Mobile */}
                <div className="sm:hidden flex items-center justify-between pb-1 border-b border-[rgba(0,0,0,0.04)]">
                  <button
                    type="button"
                    onClick={() => setMobileTab('slots')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4A0B5] hover:text-[#D4708F] py-1 cursor-pointer"
                  >
                    <span>‹ กลับไปเลือกผังสล็อต</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlotTime(null)}
                    className="text-xs text-[var(--ink-muted)] hover:text-[#3D3040] py-1 cursor-pointer"
                  >
                    ดูภาพรวมทั้งหมด
                  </button>
                </div>

                {/* Slot Status Summary & Quick Toggle Card */}
                {(() => {
                  const isEffBooked = selectedSlot
                    ? isSlotBookedForCurrentCamera(selectedSlot)
                    : selectedSlotCamBookings.filter(b => b.status !== 'cancelled').length > 0;

                  const hasBookingsInSlot = selectedSlotCamBookings.filter(b => b.status !== 'cancelled').length > 0;

                  return (
                    <div className="p-4 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-micro text-[var(--ink-muted)] font-bold">
                              รอบเวลา ({activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})
                            </p>
                            <span
                              className={`text-micro font-bold px-2 py-0.5 rounded-full border ${
                                !isEffBooked
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
                              }`}
                            >
                              {!isEffBooked
                                ? '🟢 สถานะ: ว่าง'
                                : hasBookingsInSlot
                                ? `🔴 สถานะ: เต็ม (${selectedSlotCamBookings.filter(b => b.status !== 'cancelled').length} ผู้จอง)`
                                : '🔴 สถานะ: เต็ม (แอดมินล็อก)'}
                            </span>
                          </div>
                          <h4 className="font-bold text-2xl text-[#3D3040] font-mono mt-0.5">
                            {selectedSlotTime}{' '}
                            <span className="text-sm font-sans text-[var(--ink-muted)] font-normal">น.</span>
                          </h4>
                        </div>

                        {selectedSlot && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              disabled={togglingSlotTime === selectedSlot.time}
                              onClick={() =>
                                onToggleSingleSlot(
                                  selectedSlot.time,
                                  isEffBooked ? 'booked' : 'available'
                                )
                              }
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border disabled:opacity-80 ${
                                !isEffBooked
                                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              <span className={togglingSlotTime === selectedSlot.time ? 'animate-spin inline-block' : ''}>🔄</span>
                              <span>
                                สลับเป็น{' '}
                                {!isEffBooked
                                  ? `🔴 เต็ม (${activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})`
                                  : `🟢 ว่าง (${activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})`}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenCreateBooking}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              title="เพิ่มการจองคิวในรอบเวลานี้"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <span>+ เพิ่มการจองคิว</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Camera Filter Switcher within selected slot */}
                      {activeCamera !== 'all' && selectedSlotAllBookings.length > 0 && (
                        <div className="pt-2 border-t border-[rgba(0,0,0,0.04)] flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[var(--ink-muted)]">แสดงผู้จองในรอบนี้:</span>
                            <button
                              type="button"
                              onClick={() => setSlotCameraFilter('selected')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                slotCameraFilter === 'selected'
                                  ? 'bg-[#F4A0B5] text-white border-transparent shadow-xs'
                                  : 'bg-white text-[#3D3040] border-[rgba(0,0,0,0.08)]'
                              }`}
                            >
                              📷 เฉพาะ {activeCamera} ({selectedSlotCamBookings.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSlotCameraFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                slotCameraFilter === 'all'
                                  ? 'bg-[#F4A0B5] text-white border-transparent shadow-xs'
                                  : 'bg-white text-[#3D3040] border-[rgba(0,0,0,0.08)]'
                              }`}
                            >
                              ✨ ทุกกล้อง ({selectedSlotAllBookings.length})
                            </button>
                          </div>
                          {slotCameraFilter === 'selected' &&
                            selectedSlotAllBookings.length > selectedSlotCamBookings.length && (
                              <span className="text-micro text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                                มีอีก {selectedSlotAllBookings.length - selectedSlotCamBookings.length} คิวในกล้องรุ่นอื่น
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bookings in Selected Slot */}
                {isLoadingBookings ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--ink-muted)]">
                    <div className="w-7 h-7 rounded-full border-2 border-[#F4A0B5] border-t-transparent animate-spin" />
                    <span className="text-xs font-medium">กำลังโหลดข้อมูลผู้จอง...</span>
                  </div>
                ) : selectedSlotDisplayBookings.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3D3040]">
                      <span className="flex items-center gap-1.5">
                        <span>👤</span>
                        <span>
                          ผู้จองในรอบ {selectedSlotTime} น. (
                          {slotCameraFilter === 'all' || activeCamera === 'all' ? 'ทุกกล้อง' : activeCamera})
                        </span>
                      </span>
                      <span className="text-micro text-[var(--ink-muted)] font-normal">
                        พบ {selectedSlotDisplayBookings.length} รายการ
                      </span>
                    </div>

                    {selectedSlotDisplayBookings.map(b => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] shadow-xs space-y-5 relative overflow-hidden"
                      >
                        {/* Top Bar: Customer Info + Status selector */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 flex items-center justify-center text-lg flex-shrink-0">
                              👤
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-base text-[#3D3040]">คุณ{b.customerName}</h4>
                                <span className="text-micro font-mono font-bold text-[var(--ink-muted)] bg-neutral-100 px-1.5 py-0.5 rounded">
                                  #BK-{b.id}
                                </span>
                              </div>
                              <p className="text-micro text-[var(--ink-muted)] mt-0.5">
                                ⏱️ ทำรายการ: {formatThaiDateTime(b.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Status Selector Dropdown */}
                          <div className="flex items-center gap-2">
                            <select
                              value={b.status}
                              onChange={e =>
                                handleUpdateStatus(
                                  b.id,
                                  e.target.value as 'confirmed' | 'pending' | 'cancelled'
                                )
                              }
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/30 flex-shrink-0 ${
                                statusColorMap[b.status]
                              }`}
                            >
                              <option value="confirmed">🟢 คอนเฟิร์มแล้ว (Confirmed)</option>
                              <option value="pending">🟡 รอคอนเฟิร์ม (Pending)</option>
                              <option value="cancelled">🔴 ยกเลิกคิว (Cancelled)</option>
                            </select>
                          </div>
                        </div>

                        {/* Contact Row */}
                        <div className="p-2.5 rounded-xl bg-neutral-50/70 border border-[rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--ink-muted)]">เบอร์โทร:</span>
                              <a
                                href={`tel:${b.customerPhone}`}
                                className="font-mono font-bold text-[var(--ink)] underline decoration-[#F4A0B5] decoration-2 underline-offset-2 hover:decoration-[#D4708F]"
                              >
                                {b.customerPhone}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyPhone(b.customerPhone, b.id)}
                                className="p-1 rounded-md text-micro text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-200 cursor-pointer"
                                title="คัดลอกเบอร์โทร"
                              >
                                {copiedPhoneId === b.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                              </button>
                            </div>

                            {b.lineDisplayName && (
                              <div className="flex items-center gap-1">
                                <span className="text-[var(--ink-muted)]">LINE:</span>
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  💬 {b.lineDisplayName}
                                </span>
                              </div>
                            )}
                          </div>

                          {b.lineUserId && (
                            <div className="flex items-center gap-1 text-micro text-[var(--ink-muted)]">
                              <span>LINE ID:</span>
                              <span className="font-mono truncate max-w-[120px]" title={b.lineUserId}>
                                {b.lineUserId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyLineId(b.lineUserId!, b.id)}
                                className="p-0.5 text-[#F4A0B5] hover:underline cursor-pointer"
                              >
                                {copiedLineUserId === b.id ? '✓' : '📋'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Grid: Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-micro text-[var(--ink-muted)] block mb-0.5">📷 รุ่นกล้อง</span>
                            <span className="font-bold text-[#3D3040] truncate block">
                              {b.cameraType || 'ไม่ระบุ'}
                            </span>
                          </div>

                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-micro text-[var(--ink-muted)] block mb-0.5">⏰ รอบเวลา / วันที่</span>
                            <span className="font-mono font-bold text-[#3D3040] block">
                              {b.timeSlot} น.
                            </span>
                            <span className="text-micro text-[var(--ink-muted)] block font-mono">{b.date}</span>
                          </div>

                          <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)]">
                            <span className="text-micro text-[var(--ink-muted)] block mb-0.5">🧾 ยอดเงิน</span>
                            <div className="font-semibold text-[#3D3040] text-xs font-mono space-y-0.5">
                              {b.depositAmount ? (
                                <div className="text-emerald-700">มัดจำ: ฿{b.depositAmount.toLocaleString()}</div>
                              ) : null}
                              {b.remainingAmount ? (
                                <div className="text-amber-700">คงเหลือ: ฿{b.remainingAmount.toLocaleString()}</div>
                              ) : null}
                              {!b.depositAmount && !b.remainingAmount && <div>—</div>}
                            </div>
                          </div>
                        </div>

                        {/* Payment Toggle Buttons */}
                        <div className="pt-1">
                          <span className="text-micro font-bold text-[var(--ink-muted)] block mb-1">
                            สถานะชำระเงิน — กดเพื่อเปลี่ยน
                          </span>
                          <div className="grid grid-cols-3 gap-1.5 bg-[#FFFBFC] p-1.5 rounded-xl border border-[rgba(0,0,0,0.05)]">
                            <button
                              type="button"
                              onClick={() => handleUpdatePaymentStatus(b.id, 'unpaid')}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                b.paymentStatus === 'unpaid'
                                  ? 'bg-neutral-600 text-white shadow-xs'
                                  : 'bg-white border border-[var(--hairline)] text-[var(--ink-muted)] hover:text-neutral-800 hover:border-neutral-300'
                              }`}
                            >
                              ⚫ ยังไม่ชำระ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePaymentStatus(b.id, 'deposit', b.depositAmount || 500, b.remainingAmount ?? undefined)}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                b.paymentStatus === 'deposit'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-white border border-[var(--hairline)] text-[var(--ink-muted)] hover:text-amber-800 hover:border-amber-300'
                              }`}
                            >
                              🟡 มัดจำแล้ว
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePaymentStatus(b.id, 'paid')}
                              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                b.paymentStatus === 'paid'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-[var(--hairline)] text-[var(--ink-muted)] hover:text-emerald-800 hover:border-emerald-300'
                              }`}
                            >
                              ✅ ชำระครบแล้ว
                            </button>
                          </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-[#FFFBFC] p-2.5 rounded-xl border border-[rgba(0,0,0,0.04)] text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-micro text-[var(--ink-muted)] font-bold">
                              📝 บันทึก / หมายเหตุ
                            </span>
                            {editingNoteId !== b.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(b.id);
                                  setNoteDraft(b.notes || '');
                                }}
                                className="text-micro text-[#F4A0B5] hover:underline cursor-pointer"
                              >
                                {b.notes ? '✏️ แก้ไขบันทึก' : '+ เพิ่มบันทึก'}
                              </button>
                            )}
                          </div>
                          {editingNoteId === b.id ? (
                            <div className="space-y-2 mt-1">
                              <textarea
                                value={noteDraft}
                                onChange={e => setNoteDraft(e.target.value)}
                                rows={2}
                                placeholder="พิมพ์ข้อความบันทึกช่วยจำ..."
                                className="w-full p-2 rounded-lg border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/30 bg-white"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2.5 py-1 rounded-lg text-xs text-[var(--ink-muted)] hover:bg-neutral-100 cursor-pointer"
                                >
                                  ยกเลิก
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingNote}
                                  onClick={() => handleSaveNote(b.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-[#F4A0B5] text-white hover:bg-[#D4708F] transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingNote ? 'กำลังบันทึก...' : 'บันทึก'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[#3D3040] font-light">
                              {b.notes || <span className="text-[var(--ink-muted)] italic">ไม่มีหมายเหตุ</span>}
                            </p>
                          )}
                        </div>

                        {/* Action Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-[rgba(0,0,0,0.04)] flex-wrap gap-2">

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b.id, b.customerName)}
                              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span>🗑️</span>
                              <span>ลบรายการ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBooking(b)}
                              className="text-xs text-[#D4708F] bg-[#F4A0B5]/10 hover:bg-[#F4A0B5]/20 border border-[#F4A0B5]/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold shadow-2xs"
                            >
                              <span>✏️</span>
                              <span>แก้ไขข้อมูลทั้งหมด</span>
                            </button>
                          </div>

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
                                <span>คัดลอกข้อความยืนยันคิว (LINE)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No bookings in this slot */
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-center bg-white rounded-2xl border border-[rgba(0,0,0,0.05)] p-6">
                    <span className="text-3xl">📭</span>
                    <p className="font-bold text-sm text-[#3D3040]">
                      ยังไม่มีผู้จองในรอบ {selectedSlotTime} น. (
                      {activeCamera === 'all' ? 'ทุกรุ่น' : activeCamera})
                    </p>
                    <p className="text-xs text-[var(--ink-muted)] font-light max-w-xs">
                      รอบนี้ยังว่างและพร้อมรับลูกค้า คุณสามารถกดปุ่มสลับสถานะด้านบนเพื่อล็อกเป็น &ldquo;เต็ม&rdquo; ได้ตลอดเวลา
                    </p>
                    {selectedSlot && isSlotBookedForCurrentCamera(selectedSlot) && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl mt-2 font-medium">
                        🔒 รอบเวลานี้ถูกล็อกเป็น &ldquo;เต็ม&rdquo; โดยแอดมิน (ไม่มีประวัติการจองจากลูกค้า)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0 bg-white/90">
          <p className="text-xs text-[var(--ink-muted)] hidden sm:block">
            💡 ข้อมูลผู้จองจะ Sync กับ LINE Bot และฐานข้อมูลโดยอัตโนมัติ
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white text-xs font-semibold shadow-xs cursor-pointer hover:shadow-md transition-all"
            >
              ✅ เสร็จสิ้น
            </button>
          </div>
        </div>
      </div>

      {/* FULL EDIT BOOKING MODAL */}
      {editingBooking && (
        <BookingEditModal
          booking={editingBooking}
          cameras={cameras}
          schedules={schedules}
          onClose={() => setEditingBooking(null)}
          onSuccess={async () => {
            setEditingBooking(null);
            await mutateBookings();
            await mutateSchedules();
          }}
        />
      )}

      {/* CREATE MANUAL BOOKING MODAL */}
      {isCreateBookingModalOpen && (
        <BookingForm
          cameras={cameras}
          schedules={schedules}
          formData={bookingFormData}
          setFormData={setBookingFormData}
          isSaving={isSavingBooking}
          handleCreateBooking={handleCreateBooking}
          onClose={() => setIsCreateBookingModalOpen(false)}
        />
      )}
    </div>
  );
}

