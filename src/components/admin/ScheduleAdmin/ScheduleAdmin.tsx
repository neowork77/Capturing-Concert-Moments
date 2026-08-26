'use client';

import { useState, useMemo } from 'react';
import { useScheduleAdmin } from './useScheduleAdmin';
import ScheduleForm from './ScheduleForm';
import SlotManager from './SlotManager';
import DateSelectModal, { ConcertGroup } from './DateSelectModal';
import CameraSelectModal from './CameraSelectModal';
import { ScheduleRecord } from '@/lib/schedule-service';

export default function ScheduleAdmin() {
  const {
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
  } = useScheduleAdmin();

  const [selectedGroupForDateModal, setSelectedGroupForDateModal] = useState<ConcertGroup | null>(null);
  const [selectedScheduleForCameraModal, setSelectedScheduleForCameraModal] = useState<ScheduleRecord | null>(null);
  const [selectedCameraName, setSelectedCameraName] = useState<string>('');

  const handleOpenSlotFlow = (sched: ScheduleRecord) => {
    setSelectedScheduleForCameraModal(sched);
  };

  // Group schedules by eventName for LINE Flex style card view
  const concertGroups = useMemo(() => {
    const groupsMap: Record<string, ConcertGroup> = {};

    filteredSchedules.forEach((schedule) => {
      const name = (schedule.eventName || 'ไม่มีชื่อตาราง').trim();
      if (!groupsMap[name]) {
        groupsMap[name] = {
          eventName: name,
          location: schedule.location || '',
          imageUrl: schedule.imageUrl || null,
          schedules: [],
        };
      }
      groupsMap[name].schedules.push(schedule);
    });

    return Object.values(groupsMap);
  }, [filteredSchedules]);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 w-full">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-2">
            ✦ Studio Schedule Management
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#3D3040]">
            จัดการคิวงาน & รอบเวลา
          </h2>
          <p className="text-xs sm:text-sm text-[#9E8E95] font-light mt-1">
            คลิกที่การ์ดงานเพื่อเลือกรุ่นกล้องและดูสล็อตเวลาว่าง
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-white/80 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-2xl p-1 flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white shadow-xs'
                  : 'text-[#9E8E95] hover:text-[#3D3040]'
              }`}
            >
              <span>🂠 Card View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white shadow-xs'
                  : 'text-[#9E8E95] hover:text-[#3D3040]'
              }`}
            >
              <span>📋 Table View</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.25)] transition-all cursor-pointer flex items-center gap-2 hover:shadow-md hover:scale-[1.02]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>เพิ่มคิวงานใหม่</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-[rgba(0,0,0,0.04)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="ค้นหาชื่องาน, สถานที่, หรือวันที่..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[rgba(0,0,0,0.07)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
          />
          <svg className="w-4 h-4 text-[#9E8E95] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-medium text-[#9E8E95]">สถานะวัน:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-[rgba(0,0,0,0.07)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 cursor-pointer font-medium"
          >
            <option value="all">ทั้งหมด (All Status)</option>
            <option value="available">🟢 available (เปิดรับคิว)</option>
            <option value="full">🔴 full (คิวเต็มทั้งหมด)</option>
            <option value="unavailable">⚫ unavailable (ปิดรับคิว)</option>
          </select>
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin" />
          <p className="text-xs text-[#9E8E95]">กำลังโหลดตารางงานจาก Supabase...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-[#FFF0F3] border border-rose-200 rounded-2xl text-rose-500 text-sm text-center">
          {errorMessage}
        </div>
      ) : concertGroups.length === 0 ? (
        <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
          <p className="text-sm text-[#9E8E95] mb-4">ไม่พบข้อมูลตารางงานตามเงื่อนไขที่ค้นหา</p>
          <button
            onClick={openCreateModal}
            className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
          >
            + เพิ่มตารางงานใหม่
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= CONCERT CARDS GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {concertGroups.map((group) => {
            const isMultiDay = group.schedules.length > 1;
            const dates = group.schedules.map(s => s.date.trim());
            const dateDisplay = isMultiDay
              ? `${dates[0]} ~ ${dates[dates.length - 1]} (${dates.length} วัน)`
              : dates[0];

            let totalSlots = 0;
            let availableSlots = 0;
            let bookedSlots = 0;

            group.schedules.forEach(s => {
              s.slots.forEach(slot => {
                totalSlots++;
                if (slot.status === 'available') availableSlots++;
                else if (slot.status === 'booked') bookedSlots++;
              });
            });

            const fillPercentage = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
            const isAnyAvailable = group.schedules.some(s => s.status === 'available');
            const isAllFull = group.schedules.every(s => s.status === 'full');

            const statusLabel = isAnyAvailable ? 'เปิดรับ' : isAllFull ? 'คิวเต็ม' : 'ปิดรับ';
            const statusClass = isAnyAvailable
              ? 'bg-emerald-500/90 text-white border-emerald-400'
              : isAllFull
              ? 'bg-rose-500/90 text-white border-rose-400'
              : 'bg-neutral-600/90 text-white border-neutral-500';

            const handleCardClick = () => {
              if (isMultiDay) {
                setSelectedGroupForDateModal(group);
              } else {
                handleOpenSlotFlow(group.schedules[0]);
              }
            };

            return (
              <div
                key={group.eventName}
                onClick={handleCardClick}
                className="group relative bg-white/90 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Hero / Top Section: Poster Image & Details */}
                <div className="flex gap-4 items-start">
                  <div className="relative w-24 h-32 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-[rgba(0,0,0,0.08)] shadow-2xs group-hover:scale-[1.02] transition-transform duration-300">
                    {group.imageUrl ? (
                      <img
                        src={group.imageUrl}
                        alt={group.eventName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#FFFBFC] via-[#F9F5FA] to-[#F4A0B5]/20 flex flex-col items-center justify-center text-center p-2 text-[#F4A0B5]">
                        <span className="text-2xl mb-1">🎤</span>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-[#9E8E95]">
                          NO POSTER
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs border ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#FFFBFC] to-[#F9F5FA] border border-[rgba(0,0,0,0.06)] mb-2 shadow-2xs">
                        <span className="text-[10px] font-bold text-[#F4A0B5] flex-shrink-0">🗓️</span>
                        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#3D3040] truncate min-w-0" title={dateDisplay}>{dateDisplay}</span>
                      </div>

                      <h3 className="font-bold text-base text-[#3D3040] leading-snug line-clamp-2 group-hover:text-[#F4A0B5] transition-colors">
                        {group.eventName}
                      </h3>

                      <p className="text-xs text-[#9E8E95] mt-1 flex items-center gap-1 truncate font-light">
                        <span>📍</span>
                        <span className="truncate">{group.location || 'ไม่ได้ระบุสถานที่'}</span>
                      </p>
                    </div>

                    {!isMultiDay && (
                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-[rgba(0,0,0,0.04)]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(group.schedules[0]);
                          }}
                          className="p-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer text-xs"
                          title="แก้ไขข้อมูลงาน"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group.schedules[0].id, group.schedules[0].date);
                          }}
                          disabled={deletingId === group.schedules[0].id}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-xs disabled:opacity-50"
                          title="ลบวันงานนี้"
                        >
                          {deletingId === group.schedules[0].id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar: Progress & Action Button */}
                <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.04)] space-y-2">
                  {/* Slot availability numbers */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">🟢 {availableSlots} ว่าง</span>
                      <span className="text-[#C8BBC0]">/</span>
                      <span className="text-rose-500 font-bold">🔴 {bookedSlots} เต็ม</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#9E8E95]">
                      เต็ม {fillPercentage}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>

                  {/* CTA Button */}
                  <div className="w-full bg-gradient-to-r from-[#FEE1E8] to-[#FAD4E2] group-hover:from-[#F4A0B5] group-hover:to-[#D4B5E0] text-[#3D3040] group-hover:text-white py-2.5 px-4 rounded-xl font-bold text-xs text-center transition-all duration-300 flex items-center justify-center gap-1.5 shadow-2xs group-hover:shadow-md">
                    {isMultiDay ? (
                      <span>🗓️ เลือกรอบวันที่ต้องการ ({group.schedules.length} วัน)</span>
                    ) : (
                      <span>📷 เลือกรุ่นกล้อง & รอบเวลา</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= REFINED CLEAN TABLE VIEW ================= */
        <div className="bg-white rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-lg overflow-hidden animate-fade-in">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-[900px]">
              <thead>
                <tr className="bg-[#FFFBFC] border-b border-[rgba(0,0,0,0.06)] text-[11px] font-bold uppercase text-[#9E8E95] tracking-wider">
                  <th className="p-4 pl-6">รูป / วันที่</th>
                  <th className="p-4">ชื่อคอนเสิร์ต / งาน</th>
                  <th className="p-4">สถานที่</th>
                  <th className="p-4 text-center">สถานะภาพรวม</th>
                  <th className="p-4 text-center">สรุปรอบเวลา</th>
                  <th className="p-4 pr-6 text-right">จัดการคิว</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(0,0,0,0.04)] text-xs">
                {filteredSchedules.map((schedule, idx) => {
                  const availableCount = schedule.slots.filter(s => s.status === 'available').length;
                  const bookedCount = schedule.slots.filter(s => s.status === 'booked').length;

                  return (
                    <tr
                      key={schedule.id}
                      onClick={() => handleOpenSlotFlow(schedule)}
                      className={`hover:bg-[#F9F5FA]/80 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FFFBFC]/40'}`}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          {schedule.imageUrl ? (
                            <img
                              src={schedule.imageUrl}
                              alt={schedule.eventName || 'Concert Poster'}
                              className="w-10 h-12 rounded-xl object-cover border border-[rgba(0,0,0,0.08)] shadow-2xs flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-xl bg-gradient-to-br from-[#FFFBFC] to-[#F4A0B5]/20 border border-[#F4A0B5]/20 flex items-center justify-center text-xs flex-shrink-0">
                              🎤
                            </div>
                          )}
                          <span className="font-mono font-bold text-xs sm:text-sm text-[#3D3040]">
                            {schedule.date}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-[#3D3040]">
                        {schedule.eventName || '-'}
                      </td>

                      <td className="p-4 text-[#9E8E95]">
                        {schedule.location || '-'}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-full border ${
                          schedule.status === 'available'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : schedule.status === 'full'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                        }`}>
                          {schedule.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-medium text-emerald-600">ว่าง {availableCount}</span>
                        <span className="text-[#C8BBC0] mx-1">/</span>
                        <span className="font-medium text-rose-500">เต็ม {bookedCount}</span>
                      </td>

                      <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenSlotFlow(schedule)}
                            className="py-1.5 px-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-xs font-semibold text-[#3D3040] hover:bg-[#F9F5FA] transition-all cursor-pointer flex items-center gap-1 shadow-2xs hover:shadow-xs"
                          >
                            <span>⏰ รอบเวลา</span>
                          </button>
                          <button
                            onClick={() => openEditModal(schedule)}
                            className="p-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id, schedule.date)}
                            disabled={deletingId === schedule.id}
                            className="p-1.5 rounded-xl border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
                            title="ลบรายการ"
                          >
                            {deletingId === schedule.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DATE SELECT MODAL FOR MULTI-DAY CONCERTS */}
      {selectedGroupForDateModal && (
        <DateSelectModal
          group={selectedGroupForDateModal}
          onClose={() => setSelectedGroupForDateModal(null)}
          onSelectSlot={(sched) => {
            setSelectedGroupForDateModal(null);
            handleOpenSlotFlow(sched);
          }}
          onEdit={(sched) => openEditModal(sched)}
          onDelete={(id, dateStr) => handleDelete(id, dateStr)}
          deletingId={deletingId}
        />
      )}

      {/* CAMERA SELECT MODAL */}
      {selectedScheduleForCameraModal && (
        <CameraSelectModal
          schedule={selectedScheduleForCameraModal}
          cameras={cameras}
          onSelect={(cam) => {
            setSelectedCameraName(cam.name);
            setActiveSlotSchedule(selectedScheduleForCameraModal);
            setSelectedScheduleForCameraModal(null);
          }}
          onClose={() => setSelectedScheduleForCameraModal(null)}
        />
      )}

      {/* QUICK SLOT MANAGER MODAL */}
      {activeSlotSchedule && (
        <SlotManager
          activeSlotSchedule={activeSlotSchedule}
          selectedCameraName={selectedCameraName}
          cameras={cameras}
          onSelectCamera={(camName) => setSelectedCameraName(camName)}
          onClose={() => setActiveSlotSchedule(null)}
          handleToggleSlot={handleToggleSlot}
          setAllSlotsStatus={setAllSlotsStatus}
        />
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <ScheduleForm
          editingSchedule={editingSchedule}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          handleSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  );
}
