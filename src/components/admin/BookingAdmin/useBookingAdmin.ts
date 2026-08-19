'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  fetchBookingsAction,
  createBookingAction,
  updateBookingStatusAction,
  updatePaymentStatusAction,
  deleteBookingAction,
} from '@/app/actions/booking-actions';
import { fetchActiveCamerasAction } from '@/app/actions/camera-actions';
import { fetchSchedulesAction } from '@/app/actions/schedule-actions';
import { BookingRecord } from '@/lib/booking-service';
import { CameraRecord } from '@/lib/camera-service';
import { ScheduleRecord } from '@/lib/schedule-service';
import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

export type BookingStep = 'event' | 'camera' | 'bookings';

export interface EventGroup {
  eventName: string;
  bookings: BookingRecord[];
  dates: string[];
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  cancelledCount: number;
}

export interface CameraGroup {
  cameraType: string;
  label: string;
  icon: string;
  count: number;
}

export function useBookingAdmin() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step navigation state
  const [step, setStep] = useState<BookingStep>('event');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);

  // Filters (for step 3)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State for Manual Booking
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eventName: '',
    timeSlot: '12:00-12:20',
    customerName: '',
    customerPhone: '',
    lineDisplayName: '',
    cameraType: 'RICOH GR IIIx + Flash',
    notes: '',
    paymentStatus: 'unpaid' as 'unpaid' | 'deposit' | 'paid',
    depositAmount: 0,
    remainingAmount: 0,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadData = async (forceRefresh = false) => {
    const cachedBookings = getAdminCache<BookingRecord[]>(CACHE_KEYS.BOOKINGS);
    const cachedCameras = getAdminCache<CameraRecord[]>(CACHE_KEYS.CAMERAS_ACTIVE);
    const cachedSchedules = getAdminCache<ScheduleRecord[]>(CACHE_KEYS.SCHEDULES);

    if (cachedBookings && cachedCameras && cachedSchedules && !forceRefresh) {
      setBookings(cachedBookings);
      setCameras(cachedCameras);
      if (cachedCameras.length > 0) {
        setFormData(prev => ({
          ...prev,
          cameraType: prev.cameraType || cachedCameras[0].name,
        }));
      }
      setSchedules(cachedSchedules);
      setIsLoading(false);
      return;
    }

    if (!cachedBookings) setIsLoading(true);
    setErrorMessage(null);

    const [bookingRes, cameraRes, scheduleRes] = await Promise.all([
      (forceRefresh || !cachedBookings) ? fetchBookingsAction() : Promise.resolve(null),
      (forceRefresh || !cachedCameras) ? fetchActiveCamerasAction() : Promise.resolve(null),
      (forceRefresh || !cachedSchedules) ? fetchSchedulesAction() : Promise.resolve(null),
    ]);

    if (bookingRes) {
      if (bookingRes.success && bookingRes.data) {
        setBookings(bookingRes.data);
        setAdminCache(CACHE_KEYS.BOOKINGS, bookingRes.data);
      } else {
        setErrorMessage(bookingRes.message || 'ไม่สามารถโหลดข้อมูลรายการจองได้');
      }
    } else if (cachedBookings) {
      setBookings(cachedBookings);
    }

    if (cameraRes) {
      if (cameraRes.success && cameraRes.data) {
        setCameras(cameraRes.data);
        setAdminCache(CACHE_KEYS.CAMERAS_ACTIVE, cameraRes.data);
        if (cameraRes.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            cameraType: prev.cameraType || cameraRes.data![0].name,
          }));
        }
      }
    } else if (cachedCameras) {
      setCameras(cachedCameras);
      if (cachedCameras.length > 0) {
        setFormData(prev => ({
          ...prev,
          cameraType: prev.cameraType || cachedCameras[0].name,
        }));
      }
    }

    if (scheduleRes) {
      if (scheduleRes.success && scheduleRes.data) {
        setSchedules(scheduleRes.data);
        setAdminCache(CACHE_KEYS.SCHEDULES, scheduleRes.data);
      }
    } else if (cachedSchedules) {
      setSchedules(cachedSchedules);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group bookings by eventName for Step 1
  const eventGroups = useMemo<EventGroup[]>(() => {
    const groupsMap: Record<string, EventGroup> = {};

    bookings.forEach(b => {
      const name = (b.eventName || 'ไม่มีชื่องาน').trim();
      if (!groupsMap[name]) {
        groupsMap[name] = {
          eventName: name,
          bookings: [],
          dates: [],
          totalCount: 0,
          pendingCount: 0,
          confirmedCount: 0,
          cancelledCount: 0,
        };
      }
      groupsMap[name].bookings.push(b);
      groupsMap[name].totalCount++;
      if (!groupsMap[name].dates.includes(b.date)) {
        groupsMap[name].dates.push(b.date);
      }
      if (b.status === 'pending') groupsMap[name].pendingCount++;
      else if (b.status === 'confirmed') groupsMap[name].confirmedCount++;
      else if (b.status === 'cancelled') groupsMap[name].cancelledCount++;
    });

    return Object.values(groupsMap)
      .map(g => ({ ...g, dates: g.dates.sort() }))
      .sort((a, b) => {
        const aLatest = a.dates[a.dates.length - 1] || '';
        const bLatest = b.dates[b.dates.length - 1] || '';
        return bLatest.localeCompare(aLatest);
      });
  }, [bookings]);

  // Get camera types available for selected event (Step 2)
  const cameraGroups = useMemo<CameraGroup[]>(() => {
    if (!selectedEvent) return [];

    const eventBookings = bookings.filter(
      b => (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent
    );

    const cameraMap: Record<string, number> = {};
    eventBookings.forEach(b => {
      const cam = b.cameraType || 'ไม่ระบุกล้อง';
      cameraMap[cam] = (cameraMap[cam] || 0) + 1;
    });

    const groups: CameraGroup[] = [];

    // Add active cameras from DB
    cameras.forEach(cam => {
      groups.push({
        cameraType: cam.name,
        label: cam.name,
        icon: '📷',
        count: cameraMap[cam.name] || 0,
      });
      delete cameraMap[cam.name];
    });

    // Add any unknown camera types from previous bookings
    Object.entries(cameraMap).forEach(([cam, count]) => {
      groups.push({
        cameraType: cam,
        label: cam,
        icon: '📷',
        count,
      });
    });

    return groups;
  }, [bookings, selectedEvent, cameras]);

  // Total count for selected event
  const selectedEventBookingCount = useMemo(() => {
    if (!selectedEvent) return 0;
    return bookings.filter(
      b => (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent
    ).length;
  }, [bookings, selectedEvent]);

  // Filtered bookings for Step 3
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedEvent && (b.eventName || 'ไม่มีชื่องาน').trim() !== selectedEvent) {
        return false;
      }

      if (selectedCamera && (b.cameraType || 'ไม่ระบุกล้อง') !== selectedCamera) {
        return false;
      }

      const matchSearch =
        !searchQuery ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery) ||
        b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.date.includes(searchQuery) ||
        (b.cameraType && b.cameraType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.lineDisplayName && b.lineDisplayName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' || b.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [bookings, selectedEvent, selectedCamera, searchQuery, statusFilter]);

  // Stats for current view
  const stats = useMemo(() => {
    const source = step === 'bookings' ? filteredBookings :
                   step === 'camera' && selectedEvent
                     ? bookings.filter(b => (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent)
                     : bookings;

    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    source.forEach(b => {
      if (b.status === 'pending') pending++;
      else if (b.status === 'confirmed') confirmed++;
      else if (b.status === 'cancelled') cancelled++;
    });

    return { total: source.length, pending, confirmed, cancelled };
  }, [bookings, filteredBookings, step, selectedEvent]);

  // Navigation handlers
  const selectEvent = (eventName: string) => {
    setSelectedEvent(eventName);
    setSelectedCamera(null);
    setSearchQuery('');
    setStatusFilter('all');
    setStep('camera');
  };

  const selectCamera = (cameraType: string | null) => {
    setSelectedCamera(cameraType);
    setSearchQuery('');
    setStatusFilter('all');
    setStep('bookings');
  };

  const goBack = () => {
    if (step === 'bookings') {
      setSelectedCamera(null);
      setSearchQuery('');
      setStatusFilter('all');
      setStep('camera');
    } else if (step === 'camera') {
      setSelectedEvent(null);
      setSelectedCamera(null);
      setStep('event');
    }
  };

  const goToStep = (target: BookingStep) => {
    if (target === 'event') {
      setSelectedEvent(null);
      setSelectedCamera(null);
      setSearchQuery('');
      setStatusFilter('all');
    } else if (target === 'camera') {
      setSelectedCamera(null);
      setSearchQuery('');
      setStatusFilter('all');
    }
    setStep(target);
  };

  // Booking CRUD
  const handleStatusChange = async (id: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const res = await updateBookingStatusAction(id, newStatus);
    if (res.success) {
      setBookings(prev => {
        const next = prev.map(b => (b.id === id ? { ...b, status: newStatus } : b));
        setAdminCache(CACHE_KEYS.BOOKINGS, next);
        return next;
      });
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const handlePaymentStatusChange = async (
    id: number,
    newPaymentStatus: 'unpaid' | 'deposit' | 'paid',
    customDepositAmount?: number,
    customRemainingAmount?: number
  ) => {
    let depositAmt = customDepositAmount;
    let remainingAmt = customRemainingAmount;
    const current = bookings.find(b => b.id === id);

    if (newPaymentStatus === 'deposit') {
      if (depositAmt === undefined) {
        const inputDeposit = prompt('กรอกจำนวนเงินมัดจำ (บาท):', String(current?.depositAmount || 500));
        if (inputDeposit !== null) {
          const parsed = parseInt(inputDeposit, 10);
          depositAmt = isNaN(parsed) ? 0 : parsed;
        } else {
          return;
        }
      }
      if (remainingAmt === undefined) {
        const inputRemaining = prompt('กรอกจำนวนเงินที่ต้องเก็บเพิ่มอีก (บาท):', String(current?.remainingAmount || 0));
        if (inputRemaining !== null) {
          const parsed = parseInt(inputRemaining, 10);
          remainingAmt = isNaN(parsed) ? 0 : parsed;
        } else {
          remainingAmt = current?.remainingAmount || 0;
        }
      }
    } else if (newPaymentStatus === 'paid') {
      depositAmt = depositAmt ?? (current?.depositAmount || 0);
      remainingAmt = 0;
    } else if (newPaymentStatus === 'unpaid') {
      depositAmt = 0;
      remainingAmt = 0;
    }

    const res = await updatePaymentStatusAction(id, newPaymentStatus, depositAmt, remainingAmt);
    if (res.success) {
      setBookings(prev => {
        const next = prev.map(b => (b.id === id ? {
          ...b,
          paymentStatus: newPaymentStatus,
          depositAmount: depositAmt ?? b.depositAmount,
          remainingAmount: remainingAmt ?? b.remainingAmount,
        } : b));
        setAdminCache(CACHE_KEYS.BOOKINGS, next);
        return next;
      });
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะการชำระเงิน');
    }
  };

  const handleDelete = async (id: number, customerName: string) => {
    if (!confirm(`คุณต้องการลบรายการจองของ คุณ${customerName} ใช่หรือไม่?`)) return;
    const res = await deleteBookingAction(id);
    if (res.success) {
      await loadData(true);
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการลบรายการ');
    }
  };

  const openCreateModal = () => {
    const defaultCam = cameras.length > 0 ? cameras[0].name : 'RICOH GR IIIx + Flash';
    setFormData({
      date: new Date().toISOString().split('T')[0],
      eventName: selectedEvent || '',
      timeSlot: '12:00-12:20',
      customerName: '',
      customerPhone: '',
      lineDisplayName: '',
      cameraType: selectedCamera || defaultCam,
      notes: '',
      paymentStatus: 'unpaid',
      depositAmount: 0,
      remainingAmount: 0,
    });
    setIsModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await createBookingAction({
      ...formData,
      status: 'confirmed',
    });

    if (res.success) {
      setIsModalOpen(false);
      await loadData(true);
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง');
    }
    setIsSaving(false);
  };

  const copyConfirmationText = (b: BookingRecord) => {
    const remainingText = b.paymentStatus === 'deposit' && b.remainingAmount && b.remainingAmount > 0
      ? ` (ยอดเก็บเพิ่มอีก: ${b.remainingAmount.toLocaleString()} บาท)`
      : '';
    const depositText = b.paymentStatus === 'deposit'
      ? `\nมัดจำแล้ว : ${b.depositAmount ? b.depositAmount.toLocaleString() : 0} บาท${remainingText}`
      : b.paymentStatus === 'paid'
      ? '\nชำระเงิน : จ่ายเต็มจำนวนเรียบร้อย'
      : '';
    const text = `#${b.eventName}\nวันที่ : ${b.date}\nเวลา : ${b.timeSlot} น.\n📷 กล้อง : ${b.cameraType || '-'}\nK.${b.customerName} ${b.customerPhone}\nชื่อไลน์ : ${b.lineDisplayName || '-'}\nสถานะ : ${b.status === 'confirmed' ? 'คอนเฟิร์มคิวแล้วเรียบร้อยค่ะ ✨' : 'รอคอนเฟิร์มคิว'}${depositText}`;
    navigator.clipboard.writeText(text);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return {
    bookings,
    cameras,
    schedules,
    isLoading,
    errorMessage,

    // Step navigation
    step,
    selectedEvent,
    selectedCamera,
    selectEvent,
    selectCamera,
    goBack,
    goToStep,

    // Step 1: Event groups
    eventGroups,

    // Step 2: Camera groups
    cameraGroups,
    selectedEventBookingCount,

    // Step 3: Filtered bookings
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBookings,
    stats,

    // Modal & form
    isModalOpen,
    setIsModalOpen,
    openCreateModal,
    isBotModalOpen,
    setIsBotModalOpen,
    openBotModal: () => setIsBotModalOpen(true),
    closeBotModal: () => setIsBotModalOpen(false),
    formData,
    setFormData,
    isSaving,
    copiedId,

    // Actions
    handleStatusChange,
    handlePaymentStatusChange,
    handleDelete,
    handleCreateBooking,
    copyConfirmationText,
  };
}
