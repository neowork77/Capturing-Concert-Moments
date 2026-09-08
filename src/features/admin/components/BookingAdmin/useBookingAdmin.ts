'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTodayThailandDateString } from '@/shared/utils/format-utils';
import {
  createBookingAction,
  updateBookingStatusAction,
  updatePaymentStatusAction,
  deleteBookingAction,
} from '@/features/admin/actions/booking-actions';
import { BookingRecord } from '@/shared/services/booking-service';
import { alertDialog, confirmDialog, promptDialog } from '@/features/admin/components/ui';
import { useAdminData } from '@/features/admin/hooks/useAdminData';

export type BookingStep = 'event' | 'camera' | 'bookings';

export interface EventGroup {
  eventName: string;
  imageUrl: string | null;
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
  imageUrl: string | null;
  count: number;
}

export function useBookingAdmin() {
  const {
    bookings,
    cameras,
    schedules,
    isLoading,
    isRefreshing,
    mutateBookings,
    refreshAll,
  } = useAdminData();
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
    date: getTodayThailandDateString(),
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
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Synchronize default camera into formData if available
  useEffect(() => {
    if (cameras.length > 0) {
      setFormData(prev => ({
        ...prev,
        cameraType: prev.cameraType || cameras[0].name,
      }));
    }
  }, [cameras]);

  // Group bookings by eventName for Step 1
  const eventGroups = useMemo<EventGroup[]>(() => {
    const groupsMap: Record<string, EventGroup> = {};

    // 1. Initialize groups from schedules first to maintain the schedule order and event metadata
    schedules.forEach(s => {
      const name = (s.eventName || '').trim();
      if (!name) return;
      if (!groupsMap[name]) {
        groupsMap[name] = {
          eventName: name,
          imageUrl: s.imageUrl || null,
          bookings: [],
          dates: [],
          totalCount: 0,
          pendingCount: 0,
          confirmedCount: 0,
          cancelledCount: 0,
        };
      }
      if (s.date && !groupsMap[name].dates.includes(s.date)) {
        groupsMap[name].dates.push(s.date);
      }
      if (!groupsMap[name].imageUrl && s.imageUrl) {
        groupsMap[name].imageUrl = s.imageUrl;
      }
    });

    // 2. Associate bookings into groups (matching case-insensitively or creating group if unlinked)
    bookings.forEach(b => {
      const bName = (b.eventName || 'ไม่มีชื่องาน').trim();
      const existingKey = Object.keys(groupsMap).find(k => k.toLowerCase() === bName.toLowerCase());
      const targetKey = existingKey || bName;

      if (!groupsMap[targetKey]) {
        const cleanName = bName.toLowerCase();
        const matchingSched = schedules.find(s => {
          const sName = (s.eventName || '').trim().toLowerCase();
          const isNameMatch = sName && (sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName));
          return isNameMatch && s.imageUrl;
        }) || schedules.find(s => s.date === b.date && s.imageUrl);

        groupsMap[targetKey] = {
          eventName: bName,
          imageUrl: matchingSched?.imageUrl || null,
          bookings: [],
          dates: [],
          totalCount: 0,
          pendingCount: 0,
          confirmedCount: 0,
          cancelledCount: 0,
        };
      }

      groupsMap[targetKey].bookings.push(b);
      groupsMap[targetKey].totalCount++;
      if (b.status === 'pending') groupsMap[targetKey].pendingCount++;
      if (b.status === 'confirmed') groupsMap[targetKey].confirmedCount++;
      if (b.status === 'cancelled') groupsMap[targetKey].cancelledCount++;
      if (b.date && !groupsMap[targetKey].dates.includes(b.date)) {
        groupsMap[targetKey].dates.push(b.date);
      }
    });

    // 3. Ensure dates inside every group are sorted chronologically ascending
    Object.values(groupsMap).forEach(g => {
      g.dates = Array.from(new Set(g.dates)).sort((a, b) => a.localeCompare(b));
    });

    // 4. Sort event cards to match "หน้าจริง" (ScheduleAdmin / DB asc(schedules.date) order)
    return Object.values(groupsMap).sort((a, b) => {
      const cleanA = a.eventName.toLowerCase();
      const cleanB = b.eventName.toLowerCase();
      const schedIndexA = schedules.findIndex(s => (s.eventName || '').trim().toLowerCase() === cleanA);
      const schedIndexB = schedules.findIndex(s => (s.eventName || '').trim().toLowerCase() === cleanB);

      // Match the exact appearance in schedules
      if (schedIndexA !== -1 && schedIndexB !== -1) {
        return schedIndexA - schedIndexB;
      }
      if (schedIndexA !== -1) return -1;
      if (schedIndexB !== -1) return 1;

      // Fallback to earliest date ascending
      const earliestA = a.dates[0] || '9999-99-99';
      const earliestB = b.dates[0] || '9999-99-99';
      const dateCompare = earliestA.localeCompare(earliestB);
      if (dateCompare !== 0) return dateCompare;

      return a.eventName.localeCompare(b.eventName);
    });
  }, [bookings, schedules]);

  // Camera groups for Step 2
  const cameraGroups = useMemo<CameraGroup[]>(() => {
    if (!selectedEvent) return [];

    const eventBookings = bookings.filter(
      b => (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent
    );

    const cameraCountMap: Record<string, number> = {};
    eventBookings.forEach(b => {
      const cam = (b.cameraType || 'ไม่ระบุ').trim();
      cameraCountMap[cam] = (cameraCountMap[cam] || 0) + 1;
    });

    const activeList = cameras.map(cam => {
      const count = Object.entries(cameraCountMap)
        .filter(([cName]) => cName.toLowerCase() === cam.name.toLowerCase() || cName.includes(cam.name) || cam.name.includes(cName))
        .reduce((sum, [, cnt]) => sum + cnt, 0);

      return {
        cameraType: cam.name,
        label: cam.name,
        icon: '📷',
        imageUrl: cam.imageUrl || null,
        count,
      };
    });

    // Handle bookings with cameras not currently in active cameras list
    const knownNames = cameras.map(c => c.name.toLowerCase());
    Object.entries(cameraCountMap).forEach(([camName, count]) => {
      if (
        camName !== 'ไม่ระบุ' &&
        !knownNames.some(k => camName.toLowerCase() === k || camName.toLowerCase().includes(k) || k.includes(camName.toLowerCase()))
      ) {
        activeList.push({
          cameraType: camName,
          label: camName,
          icon: '📸',
          imageUrl: null,
          count,
        });
      }
    });

    if (cameraCountMap['ไม่ระบุ']) {
      activeList.push({
        cameraType: 'ไม่ระบุ',
        label: 'ไม่ระบุรุ่นกล้อง',
        icon: '❓',
        imageUrl: null,
        count: cameraCountMap['ไม่ระบุ'],
      });
    }

    return activeList;
  }, [bookings, selectedEvent, cameras]);

  // Filtered bookings for Step 3
  const filteredBookings = useMemo(() => {
    if (!selectedEvent) return [];

    return bookings.filter(b => {
      const eventMatch = (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent;
      if (!eventMatch) return false;

      if (selectedCamera) {
        const bCam = (b.cameraType || 'ไม่ระบุ').trim();
        if (selectedCamera === 'ไม่ระบุ') {
          if (bCam !== 'ไม่ระบุ' && bCam !== '') return false;
        } else {
          const matchCam =
            bCam.toLowerCase() === selectedCamera.toLowerCase() ||
            bCam.toLowerCase().includes(selectedCamera.toLowerCase()) ||
            selectedCamera.toLowerCase().includes(bCam.toLowerCase());
          if (!matchCam) return false;
        }
      }

      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = b.customerName?.toLowerCase().includes(query);
        const phoneMatch = b.customerPhone?.replace(/[-\s]/g, '').includes(query.replace(/[-\s]/g, ''));
        const lineMatch = b.lineDisplayName?.toLowerCase().includes(query);
        const slotMatch = b.timeSlot?.toLowerCase().includes(query);
        const dateMatch = b.date?.includes(query);
        const idMatch = String(b.id).includes(query);

        if (!nameMatch && !phoneMatch && !lineMatch && !slotMatch && !dateMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, selectedEvent, selectedCamera, statusFilter, searchQuery]);

  // Stats for the active view
  const stats = useMemo(() => {
    const list = filteredBookings;
    return {
      total: list.length,
      pending: list.filter(b => b.status === 'pending').length,
      confirmed: list.filter(b => b.status === 'confirmed').length,
      cancelled: list.filter(b => b.status === 'cancelled').length,
      totalDeposit: list.reduce((sum, b) => sum + (b.depositAmount || 0), 0),
      totalRemaining: list.reduce((sum, b) => sum + (b.remainingAmount || 0), 0),
    };
  }, [filteredBookings]);

  // Selected event booking count
  const selectedEventBookingCount = useMemo(() => {
    if (!selectedEvent) return 0;
    return bookings.filter(b => (b.eventName || 'ไม่มีชื่องาน').trim() === selectedEvent).length;
  }, [bookings, selectedEvent]);

  // Selected event poster image
  const selectedEventImageUrl = useMemo(() => {
    if (!selectedEvent) return null;
    const group = eventGroups.find(g => g.eventName === selectedEvent);
    return group?.imageUrl || null;
  }, [eventGroups, selectedEvent]);

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

  // Booking CRUD with optimistic SWR updates
  const handleStatusChange = async (id: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const next = bookings.map(b => (b.id === id ? { ...b, status: newStatus } : b));
    mutateBookings(next, false);
    const res = await updateBookingStatusAction(id, newStatus);
    if (!res.success) {
      await mutateBookings();
      await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', danger: true });
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
        const inputDeposit = await promptDialog({ title: 'กรอกจำนวนเงินมัดจำ (บาท):', defaultValue: String(current?.depositAmount || 500), inputMode: 'numeric' });
        if (inputDeposit !== null) {
          const parsed = parseInt(inputDeposit, 10);
          depositAmt = isNaN(parsed) ? 0 : parsed;
        } else {
          return;
        }
      }
      if (remainingAmt === undefined) {
        const inputRemaining = await promptDialog({ title: 'กรอกจำนวนเงินที่ต้องเก็บเพิ่มอีก (บาท):', defaultValue: String(current?.remainingAmount || 0), inputMode: 'numeric' });
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

    const next = bookings.map(b => (b.id === id ? {
      ...b,
      paymentStatus: newPaymentStatus,
      depositAmount: depositAmt ?? b.depositAmount,
      remainingAmount: remainingAmt ?? b.remainingAmount,
    } : b));
    mutateBookings(next, false);

    const res = await updatePaymentStatusAction(id, newPaymentStatus, depositAmt, remainingAmt);
    if (!res.success) {
      await mutateBookings();
      await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะการชำระเงิน', danger: true });
    }
  };

  const handleDelete = async (id: number, customerName: string) => {
    if (!(await confirmDialog({ title: `คุณต้องการลบรายการจองของ คุณ${customerName} ใช่หรือไม่?`, confirmLabel: 'ลบรายการ', danger: true }))) return;
    const res = await deleteBookingAction(id);
    if (res.success) {
      await mutateBookings();
    } else {
      await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการลบรายการ', danger: true });
    }
  };

  const openCreateModal = () => {
    const defaultCam = cameras.length > 0 ? cameras[0].name : 'RICOH GR IIIx + Flash';
    setFormData({
      date: getTodayThailandDateString(),
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
      if (formData.eventName) {
        setSelectedEvent(formData.eventName.trim());
        setSelectedCamera(null);
        setSearchQuery('');
        setStatusFilter('all');
        setStep('bookings');
      }
      await mutateBookings();
    } else {
      await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง', danger: true });
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
    isRefreshing,
    errorMessage,

    // Step state
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
    selectedEventImageUrl,

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
    editingBooking,
    setEditingBooking,
    openEditModal: (b: BookingRecord) => setEditingBooking(b),
    closeEditModal: () => setEditingBooking(null),
    handleBookingEdited: async () => {
      setEditingBooking(null);
      await refreshAll();
    },
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
    refreshAll,
    refreshData: refreshAll,
  };
}

