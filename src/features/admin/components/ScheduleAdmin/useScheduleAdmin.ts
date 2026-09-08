'use client';

import { useState, useMemo } from 'react';
import {
  upsertScheduleAction,
  deleteScheduleAction,
  toggleSlotStatusAction,
} from '@/features/admin/actions/schedule-actions';
import { ScheduleRecord } from '@/shared/services/schedule-service';
import { SlotStatus, TimeSlot } from '@/shared/types/schedule';
import { alertDialog, confirmDialog } from '@/features/admin/components/ui';
import { isSameCamera } from '@/shared/utils/camera-utils';
import { useAdminData } from '@/features/admin/hooks/useAdminData';

export const DEFAULT_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

export function useScheduleAdmin() {
  const { schedules, cameras, isLoading, mutateSchedules } = useAdminData();
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
    slots: TimeSlot[];
  }>({
    date: '',
    dates: [],
    status: 'available',
    eventName: '',
    location: '',
    imageUrl: '',
    slots: DEFAULT_SLOTS.map(t => ({ time: t, status: 'available' as const })),
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [activeSlotSchedule, setActiveSlotSchedule] = useState<ScheduleRecord | null>(null);

  // Always resolve activeSlotSchedule to the freshest one from schedules
  const currentActiveSchedule = useMemo(() => {
    if (!activeSlotSchedule) return null;
    return schedules.find(s => s.id === activeSlotSchedule.id) || activeSlotSchedule;
  }, [schedules, activeSlotSchedule]);

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
      slots: DEFAULT_SLOTS.map(t => ({ time: t, status: 'available' as const })),
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
      slots: schedule.slots && schedule.slots.length > 0
        ? schedule.slots
        : DEFAULT_SLOTS.map(t => ({ time: t, status: 'available' as const })),
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
      await alertDialog({ title: 'กรุณาเลือกวันที่จัดงานอย่างน้อย 1 วัน', danger: true });
      setIsSaving(false);
      return;
    }

    const results = await Promise.all(
      targetDates.map(dateStr => {
        const existing = existingDateMap.get(dateStr.trim());
        const baseSlots = formData.slots && formData.slots.length > 0
          ? formData.slots
          : DEFAULT_SLOTS.map(t => ({ time: t, status: 'available' as const }));

        // Preserve booking statuses if slot time matches existing slot
        const mergedSlots = baseSlots.map(newSlot => {
          if (existing) {
            const matchedOld = existing.slots.find(
              os => os.time.replace(/\s+/g, '') === newSlot.time.replace(/\s+/g, '')
            );
            if (matchedOld) {
              return {
                ...newSlot,
                status: matchedOld.status,
                ...(matchedOld.cameraStatuses ? { cameraStatuses: matchedOld.cameraStatuses } : {}),
              };
            }
          }
          return newSlot;
        });

        if (existing) {
          return upsertScheduleAction({
            id: existing.id,
            date: dateStr,
            status: formData.status,
            eventName: formData.eventName || undefined,
            location: formData.location || undefined,
            imageUrl: formData.imageUrl || undefined,
            slots: mergedSlots,
          });
        } else {
          return upsertScheduleAction({
            date: dateStr,
            status: formData.status,
            eventName: formData.eventName || undefined,
            location: formData.location || undefined,
            imageUrl: formData.imageUrl || undefined,
            slots: mergedSlots,
          });
        }
      })
    );


    const failed = results.find(r => !r.success);
    if (failed) {
      await alertDialog({ title: failed.message || 'เกิดข้อผิดพลาดในการบันทึกบางรายการ', danger: true });
    }

    const successfulUpdates = results.filter(r => r.success && r.data).map(r => r.data!);
    if (successfulUpdates.length > 0) {
      await mutateSchedules(
        (prev = []) => prev.map(s => {
          const updated = successfulUpdates.find(u => u.id === s.id);
          return updated || s;
        }),
        false
      );
      if (activeSlotSchedule) {
        const updatedActive = successfulUpdates.find(u => u.id === activeSlotSchedule.id);
        if (updatedActive) {
          setActiveSlotSchedule(updatedActive);
        }
      }
    } else {
      await mutateSchedules();
    }

    setIsModalOpen(false);
    await mutateSchedules();
    setIsSaving(false);

  };

  const handleDelete = async (id: number, dateStr: string) => {
    if (!(await confirmDialog({ title: `คุณต้องการลบตารางงานวันที่ ${dateStr} ใช่หรือไม่?`, confirmLabel: 'ลบรายการ', danger: true }))) return;
    setDeletingId(id);
    const res = await deleteScheduleAction(id);
    if (res.success) {
      await mutateSchedules();
    } else {
      await alertDialog({ title: res.message || 'เกิดข้อผิดพลาดในการลบรายการ', danger: true });
    }
    setDeletingId(null);
  };

  const handleToggleSlot = async (
    schedule: ScheduleRecord,
    slotTime: string,
    currentStatus: SlotStatus,
    cameraType?: string
  ): Promise<boolean> => {
    const newStatus: SlotStatus = currentStatus === 'available' ? 'booked' : 'available';
    const cleanTime = slotTime.replace(/\s+/g, '');

    const applySlotUpdate = (slotsList: TimeSlot[]) => {
      let matched = false;
      const updated = slotsList.map(slot => {
        if (slot.time.replace(/\s+/g, '') === cleanTime) {
          matched = true;
          const camStatuses = { ...(slot.cameraStatuses || {}) };
          let effectiveStatus: SlotStatus = slot.status;
          if (!cameraType || cameraType === 'all') {
            effectiveStatus = newStatus;
            if (cameras.length > 0) {
              cameras.forEach(c => {
                camStatuses[c.name] = newStatus;
              });
            }
          } else {
            camStatuses[cameraType] = newStatus;
            if (newStatus === 'available') {
              effectiveStatus = 'available';
            } else if (cameras.length > 0) {
              const allCamsBooked = cameras.every(c => {
                const k = Object.keys(camStatuses).find(ck => isSameCamera(ck, c.name));
                return k ? camStatuses[k] === 'booked' : false;
              });
              effectiveStatus = allCamsBooked ? 'booked' : 'available';
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
        if (!cameraType || cameraType === 'all') {
          initialStatus = newStatus;
          if (cameras.length > 0) {
            cameras.forEach(c => {
              camStatuses[c.name] = newStatus;
            });
          }
        } else {
          camStatuses[cameraType] = newStatus;
          initialStatus = 'available';
        }

        updated.push({
          time: slotTime.trim(),
          status: initialStatus,
          ...(Object.keys(camStatuses).length > 0 ? { cameraStatuses: camStatuses } : {}),
        });
      }
      return updated;
    };

    // Optimistic SWR updates
    const nextSchedules = schedules.map(s => {
      if (s.id !== schedule.id) return s;
      return { ...s, slots: applySlotUpdate(s.slots) };
    });
    mutateSchedules(nextSchedules, false);

    if (activeSlotSchedule && activeSlotSchedule.id === schedule.id) {
      setActiveSlotSchedule(prev => {
        if (!prev) return null;
        return {
          ...prev,
          slots: applySlotUpdate(prev.slots),
        };
      });
    }

    const res = await toggleSlotStatusAction(schedule.id, slotTime, currentStatus, cameraType);
    if (!res.success) {
      await mutateSchedules();
      await alertDialog({ title: res.message || 'ไม่สามารถอัปเดตสถานะรอบเวลาได้', danger: true });
      return false;
    }
    return true;
  };

  const setAllSlotsStatus = async (
    schedule: ScheduleRecord,
    targetStatus: SlotStatus,
    cameraType?: string
  ) => {
    const updatedSlots = schedule.slots.map(s => {
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
    const targetDayStatus = (!cameraType || cameraType === 'all') && targetStatus === 'booked' ? 'full' : 'available';

    // Optimistic SWR updates
    const nextSchedules = schedules.map(s => {
      if (s.id !== schedule.id) return s;
      return { ...s, slots: updatedSlots, status: targetDayStatus };
    });
    mutateSchedules(nextSchedules, false);

    if (activeSlotSchedule && activeSlotSchedule.id === schedule.id) {
      setActiveSlotSchedule(prev =>
        prev ? { ...prev, slots: updatedSlots, status: targetDayStatus } : null
      );
    }

    const res = await upsertScheduleAction({
      id: schedule.id,
      date: schedule.date,
      status: targetDayStatus,
      eventName: schedule.eventName || undefined,
      location: schedule.location || undefined,
      imageUrl: schedule.imageUrl || undefined,
      slots: updatedSlots,
    });

    if (!res.success) {
      await mutateSchedules();
      await alertDialog({ title: res.message || 'ไม่สามารถอัปเดตรอบเวลาทั้งหมดได้', danger: true });
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
    activeSlotSchedule: currentActiveSchedule,
    setActiveSlotSchedule,


    openCreateModal,
    openEditModal,
    handleSave,
    handleDelete,
    handleToggleSlot,
    setAllSlotsStatus,
  };
}
