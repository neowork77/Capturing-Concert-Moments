'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  fetchSchedulesAction,
  upsertScheduleAction,
  deleteScheduleAction,
  toggleSlotStatusAction,
} from '@/app/actions/schedule-actions';
import { fetchActiveCamerasAction } from '@/app/actions/camera-actions';
import { ScheduleRecord } from '@/lib/schedule-service';
import { CameraRecord } from '@/lib/camera-service';
import { SlotStatus } from '@/data/schedule';

import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

export const DEFAULT_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

export function useScheduleAdmin() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [formData, setFormData] = useState<{
    date: string;
    dates: string[];
    status: string;
    eventName: string;
    location: string;
    imageUrl: string;
  }>({
    date: '',
    dates: [],
    status: 'available',
    eventName: '',
    location: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [activeSlotSchedule, setActiveSlotSchedule] = useState<ScheduleRecord | null>(null);

  const loadSchedules = async (forceRefresh = false) => {
    // Check localStorage cache first
    const cached = getAdminCache<ScheduleRecord[]>(CACHE_KEYS.SCHEDULES);
    if (cached && !forceRefresh) {
      setSchedules(cached);
      setIsLoading(false);
      return;
    }

    if (!cached) setIsLoading(true);
    setErrorMessage(null);
    const res = await fetchSchedulesAction();
    if (res.success && res.data) {
      setSchedules(res.data);
      setAdminCache(CACHE_KEYS.SCHEDULES, res.data);
    } else {
      setErrorMessage(res.message || 'ไม่สามารถโหลดข้อมูลคิวงานได้');
    }
    setIsLoading(false);
  };

  const loadCameras = async (forceRefresh = false) => {
    const cached = getAdminCache<CameraRecord[]>(CACHE_KEYS.CAMERAS_ACTIVE);
    if (cached && !forceRefresh) {
      setCameras(cached);
      return;
    }

    const res = await fetchActiveCamerasAction();
    if (res.success && res.data) {
      setCameras(res.data);
      setAdminCache(CACHE_KEYS.CAMERAS_ACTIVE, res.data);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadCameras();
  }, []);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const matchSearch =
        !searchQuery ||
        s.date.includes(searchQuery) ||
        (s.eventName && s.eventName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' || s.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [schedules, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    let totalSlots = 0;
    let availableSlots = 0;
    let bookedSlots = 0;

    schedules.forEach(s => {
      s.slots.forEach(slot => {
        totalSlots++;
        if (slot.status === 'available') availableSlots++;
        else if (slot.status === 'booked') bookedSlots++;
      });
    });

    return { totalEvents: schedules.length, totalSlots, availableSlots, bookedSlots };
  }, [schedules]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      date: '',
      dates: [],
      status: 'available',
      eventName: '',
      location: '',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (schedule: ScheduleRecord) => {
    setEditingSchedule(schedule);
    const concertName = (schedule.eventName || '').trim();
    const sameEventSchedules = concertName
      ? schedules.filter(s => (s.eventName || '').trim() === concertName)
      : [schedule];

    const allDates = Array.from(new Set(sameEventSchedules.map(s => s.date))).sort();

    setFormData({
      date: schedule.date,
      dates: allDates.length > 0 ? allDates : [schedule.date],
      status: schedule.status,
      eventName: schedule.eventName || '',
      location: schedule.location || '',
      imageUrl: schedule.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const eventName = (formData.eventName || '').trim();
    const existingSchedules = schedules.filter(
      s => (editingSchedule && s.id === editingSchedule.id) ||
           (eventName && (s.eventName || '').trim() === eventName)
    );

    const existingDateMap = new Map<string, ScheduleRecord>();
    existingSchedules.forEach(s => existingDateMap.set(s.date.trim(), s));

    const targetDates = formData.dates.length > 0 ? formData.dates : formData.date ? [formData.date] : [];
    if (targetDates.length === 0) {
      alert('กรุณาเลือกวันที่จัดงานอย่างน้อย 1 วัน');
      setIsSaving(false);
      return;
    }

    const results = await Promise.all(
      targetDates.map(dateStr => {
        const existing = existingDateMap.get(dateStr.trim());
        if (existing) {
          return upsertScheduleAction({
            id: existing.id,
            date: dateStr,
            status: formData.status,
            eventName: formData.eventName || undefined,
            location: formData.location || undefined,
            imageUrl: formData.imageUrl || undefined,
            slots: existing.slots,
          });
        } else {
          return upsertScheduleAction({
            date: dateStr,
            status: formData.status,
            eventName: formData.eventName || undefined,
            location: formData.location || undefined,
            imageUrl: formData.imageUrl || undefined,
            slots: DEFAULT_SLOTS.map(t => ({ time: t, status: 'available' as const })),
          });
        }
      })
    );

    const failed = results.find(r => !r.success);
    if (failed) {
      alert(failed.message || 'เกิดข้อผิดพลาดในการบันทึกบางรายการ');
    }

    setIsModalOpen(false);
    await loadSchedules(true);
    setIsSaving(false);
  };

  const handleDelete = async (id: number, dateStr: string) => {
    if (!confirm(`คุณต้องการลบตารางงานวันที่ ${dateStr} ใช่หรือไม่?`)) return;
    setDeletingId(id);
    const res = await deleteScheduleAction(id);
    if (res.success) {
      await loadSchedules(true);
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการลบรายการ');
    }
    setDeletingId(null);
  };

  const handleToggleSlot = async (schedule: ScheduleRecord, slotTime: string, currentStatus: SlotStatus) => {
    const res = await toggleSlotStatusAction(schedule.date, schedule.eventName || '', slotTime, currentStatus);
    if (res.success) {
      setSchedules(prev => {
        const next = prev.map(s => {
          if (s.id !== schedule.id) return s;
          const updatedSlots = s.slots.map(slot =>
            slot.time.replace(/\s+/g, '') === slotTime.replace(/\s+/g, '')
              ? { ...slot, status: (currentStatus === 'available' ? 'booked' : 'available') as SlotStatus }
              : slot
          );
          return { ...s, slots: updatedSlots };
        });
        setAdminCache(CACHE_KEYS.SCHEDULES, next);
        return next;
      });

      if (activeSlotSchedule && activeSlotSchedule.id === schedule.id) {
        setActiveSlotSchedule(prev => {
          if (!prev) return null;
          return {
            ...prev,
            slots: prev.slots.map(slot =>
              slot.time.replace(/\s+/g, '') === slotTime.replace(/\s+/g, '')
                ? { ...slot, status: (currentStatus === 'available' ? 'booked' : 'available') as SlotStatus }
                : slot
            )
          };
        });
      }
    } else {
      alert(res.message || 'ไม่สามารถอัปเดตสถานะรอบเวลาได้');
    }
  };

  const setAllSlotsStatus = async (schedule: ScheduleRecord, targetStatus: SlotStatus) => {
    const updatedSlots = schedule.slots.map(s => ({ ...s, status: targetStatus }));
    const res = await upsertScheduleAction({
      id: schedule.id,
      date: schedule.date,
      status: targetStatus === 'booked' ? 'full' : 'available',
      eventName: schedule.eventName || undefined,
      location: schedule.location || undefined,
      imageUrl: schedule.imageUrl || undefined,
      slots: updatedSlots,
    });

    if (res.success) {
      await loadSchedules(true);
      if (activeSlotSchedule && activeSlotSchedule.id === schedule.id) {
        setActiveSlotSchedule(prev => prev ? { ...prev, slots: updatedSlots, status: targetStatus === 'booked' ? 'full' : 'available' } : null);
      }
    } else {
      alert('ไม่สามารถอัปเดตรอบเวลาทั้งหมดได้');
    }
  };

  return {
    schedules,
    cameras,
    isLoading,
    errorMessage,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredSchedules,
    stats,
    isModalOpen,
    setIsModalOpen,
    editingSchedule,
    formData,
    setFormData,
    isSaving,
    deletingId,
    activeSlotSchedule,
    setActiveSlotSchedule,
    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    handleToggleSlot,
    setAllSlotsStatus,
  };
}
