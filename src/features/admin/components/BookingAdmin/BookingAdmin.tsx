'use client';

import { Fragment, useState } from 'react';
import { useBookingAdmin } from './useBookingAdmin';
import { Button, StatusBadge } from '@/features/admin/components/ui';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/shared/utils/status-display';
import { formatBaht, formatPhoneNumber } from '@/shared/utils/format-utils';
import BookingKPI from './BookingKPI';
import BookingForm from './BookingForm';
import BookingBotModal from './BookingBotModal';
import BookingEditModal from './BookingEditModal';

export default function BookingAdmin() {
  const {
    cameras,
    schedules,
    isLoading,
    isRefreshing,
    errorMessage,
    refreshData,
    step,
    selectedEvent,
    selectedCamera,
    selectEvent,
    selectCamera,
    goBack,
    goToStep,
    eventGroups,
    cameraGroups,
    selectedEventBookingCount,
    selectedEventImageUrl,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBookings,
    stats,
    isModalOpen,
    setIsModalOpen,
    openCreateModal,
    editingBooking,
    openEditModal,
    closeEditModal,
    handleBookingEdited,
    isBotModalOpen,
    openBotModal,
    closeBotModal,
    formData,
    setFormData,
    isSaving,
    copiedId,
    handleStatusChange,
    handlePaymentStatusChange,
    handleDelete,
    handleCreateBooking,
    copyConfirmationText,
  } = useBookingAdmin();

  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  return (
    <section className="py-6 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#F4A0B5]/10 text-[#F4A0B5] font-bold text-micro sm:text-xs uppercase tracking-wider">
              Booking Management
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D3040] mt-1">
            รายละเอียดรายการจองคิว
          </h2>
          <p className="text-xs text-[var(--ink-muted)] font-light mt-1">
            จัดการข้อมูลผู้จองจาก LINE และสร้างรายการจองด้วยตนเอง พร้อมเปลี่ยนสถานะการจองแบบ Real-time
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-white border border-[rgba(0,0,0,0.08)] hover:bg-[#FFFBFC] text-[#3D3040] text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            title="ดึงข้อมูลรายการจองล่าสุดจาก Database"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`w-4 h-4 text-[#F4A0B5] ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรชคิว'}</span>
          </button>

          <button
            onClick={openBotModal}
            className="flex-1 sm:flex-initial py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-white border border-[#F4A0B5]/40 hover:bg-[#FFFBFC] text-[#3D3040] text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="text-base">🤖</span>
            <span>บอทฟอร์ม</span>
          </button>

          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto py-2 sm:py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>เพิ่มรายการจองใหม่</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {step !== 'event' && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => goToStep('event')}
            className="text-xs font-semibold text-[#F4A0B5] hover:text-[#D4708F] transition-colors cursor-pointer flex items-center gap-1"
          >
            📋 รายการจอง
          </button>
          {step === 'camera' && selectedEvent && (
            <>
              <span className="text-xs text-[#C8BBC0]">›</span>
              <span className="text-xs font-bold text-[#3D3040] truncate max-w-[200px]">
                {selectedEvent}
              </span>
              <span className="text-xs text-[#C8BBC0]">›</span>
              <span className="text-xs font-medium text-[var(--ink-muted)]">
                เลือกกล้อง
              </span>
            </>
          )}
          {step === 'bookings' && selectedEvent && (
            <>
              <span className="text-xs text-[#C8BBC0]">›</span>
              <button
                onClick={() => goToStep('camera')}
                className="text-xs font-semibold text-[#F4A0B5] hover:text-[#D4708F] transition-colors cursor-pointer truncate max-w-[200px]"
              >
                {selectedEvent}
              </button>
              <span className="text-xs text-[#C8BBC0]">›</span>
              <span className="text-xs font-bold text-[#3D3040]">
                {selectedCamera || 'ทุกกล้อง'}
              </span>
            </>
          )}
        </div>
      )}

      {/* Back Button */}
      {step !== 'event' && (
        <button
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] hover:text-[#3D3040] transition-all group cursor-pointer"
        >
          <span className="text-sm transform group-hover:-translate-x-1 transition-transform">‹</span>
          <span>ย้อนกลับ</span>
        </button>
      )}

      {/* Summary KPI Cards */}
      <BookingKPI stats={stats} />

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin" />
          <p className="text-xs text-[var(--ink-muted)]">กำลังโหลดรายการจองจาก Supabase...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-[#FFF0F3] border border-rose-200 rounded-2xl text-rose-500 text-sm text-center">
          {errorMessage}
        </div>
      ) : (
        <>
          {/* ================= STEP 1: EVENT SELECTION ================= */}
          {step === 'event' && (
            <>
              {eventGroups.length === 0 ? (
                <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
                  <p className="text-sm text-[var(--ink-muted)] mb-4">ยังไม่มีรายการจอง</p>
                  <button
                    onClick={openCreateModal}
                    className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
                  >
                    เพิ่มรายการจองแรกของคุณ
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {eventGroups.map((group) => {
                    const confirmedPercent = group.totalCount > 0
                      ? Math.round((group.confirmedCount / group.totalCount) * 100)
                      : 0;
                    const sortedDates = [...group.dates].sort((a, b) => a.localeCompare(b));
                    const dateDisplay = sortedDates.length > 1
                      ? `${sortedDates[0]} ~ ${sortedDates[sortedDates.length - 1]}`
                      : sortedDates[0] || '-';

                    return (
                      <div
                        key={group.eventName}
                        onClick={() => selectEvent(group.eventName)}
                        className="group relative bg-white/90 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40 cursor-pointer flex flex-col justify-between overflow-hidden"
                      >
                        {/* Top Section */}
                        <div className="flex gap-4 items-start">
                          {/* Event Poster Image */}
                          <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-[rgba(0,0,0,0.08)] shadow-2xs group-hover:scale-[1.02] transition-transform duration-300">
                            {group.imageUrl ? (
                              <img
                                src={group.imageUrl}
                                alt={group.eventName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#FFFBFC] via-[#F9F5FA] to-[#F4A0B5]/20 flex flex-col items-center justify-center text-center p-2 text-[#F4A0B5]">
                                <span className="text-2xl mb-1">🎤</span>
                                <span className="text-micro font-bold tracking-wider uppercase text-[var(--ink-muted)]">
                                  NO POSTER
                                </span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <span className="text-micro font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs border bg-purple-500/90 text-white border-purple-400">
                                {sortedDates.length} วัน
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Date Badge */}
                            <div className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#FFFBFC] to-[#F9F5FA] border border-[rgba(0,0,0,0.06)] mb-2 shadow-2xs">
                              <span className="text-micro font-bold text-[#F4A0B5] flex-shrink-0">🗓️</span>
                              <span className="font-mono text-micro sm:text-xs font-bold text-[#3D3040] truncate min-w-0" title={dateDisplay}>
                                {dateDisplay}
                              </span>
                            </div>

                            {/* Event Name */}
                            <h3 className="font-bold text-base text-[#3D3040] leading-snug line-clamp-2 group-hover:text-[#F4A0B5] transition-colors">
                              {group.eventName}
                            </h3>

                            {/* Booking Count */}
                            <p className="text-xs text-[var(--ink-muted)] mt-1 flex items-center gap-1 font-light">
                              <span>📋</span>
                              <span>{group.totalCount} รายการจอง</span>
                            </p>
                          </div>
                        </div>

                        {/* Bottom Stats */}
                        <div className="mt-4 pt-3 border-t border-[rgba(0,0,0,0.04)] space-y-2">
                          {/* Status Counts */}
                          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-600 font-bold">✅ {group.confirmedCount}</span>
                              <span className="text-[#C8BBC0]">/</span>
                              <span className="text-amber-500 font-bold">⏳ {group.pendingCount}</span>
                              <span className="text-[#C8BBC0]">/</span>
                              <span className="text-rose-500 font-bold">🚫 {group.cancelledCount}</span>
                            </div>
                            <span className="text-micro font-semibold text-[var(--ink-muted)]">
                              ยืนยัน {confirmedPercent}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${confirmedPercent}%` }}
                            />
                          </div>

                          {/* CTA Button */}
                          <div className="w-full bg-gradient-to-r from-[#FEE1E8] to-[#FAD4E2] group-hover:from-[#F4A0B5] group-hover:to-[#D4B5E0] text-[#3D3040] group-hover:text-white py-2.5 px-4 rounded-xl font-bold text-xs text-center transition-all duration-300 flex items-center justify-center gap-1.5 shadow-2xs group-hover:shadow-md">
                            <span>📷 เลือกกล้องเพื่อดูคิว</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ================= STEP 2: CAMERA SELECTION ================= */}
          {step === 'camera' && selectedEvent && (
            <div className="animate-fade-in">
              {/* Event Title Recap */}
              <div className="mb-8 p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] shadow-xs flex items-center gap-4">
                {selectedEventImageUrl ? (
                  <img
                    src={selectedEventImageUrl}
                    alt={selectedEvent || 'Event Poster'}
                    className="w-14 h-20 rounded-2xl object-cover border border-[rgba(0,0,0,0.08)] shadow-xs flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-2xl flex-shrink-0">
                    🎤
                  </div>
                )}
                <div>
                  <p className="text-micro font-bold text-[#F4A0B5]">งานที่เลือก</p>
                  <h3 className="font-display text-lg font-bold text-[#3D3040]">{selectedEvent}</h3>
                  <p className="text-xs text-[var(--ink-muted)] font-light mt-0.5">
                    รวม {selectedEventBookingCount} รายการจอง — กรุณาเลือกกล้องที่ต้องการดูคิว
                  </p>
                </div>
              </div>

              {/* Camera Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* "All Cameras" Card */}
                <div
                  onClick={() => selectCamera(null)}
                  className="group relative bg-white/90 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40 cursor-pointer flex flex-col items-center text-center gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F9F5FA] to-[#F4A0B5]/10 flex items-center justify-center text-3xl border border-[rgba(0,0,0,0.06)] group-hover:scale-110 transition-transform duration-300">
                    📋
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#3D3040] group-hover:text-[#F4A0B5] transition-colors">
                      ดูทั้งหมด (All Cameras)
                    </h4>
                    <p className="text-xs text-[var(--ink-muted)] mt-1 font-light">
                      แสดงรายการจองทุกกล้อง
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#F4A0B5]/10 text-[#F4A0B5] border border-[#F4A0B5]/20">
                    {selectedEventBookingCount} คิว
                  </span>
                  <div className="w-full bg-gradient-to-r from-[#FEE1E8] to-[#FAD4E2] group-hover:from-[#F4A0B5] group-hover:to-[#D4B5E0] text-[#3D3040] group-hover:text-white py-2 px-4 rounded-xl font-bold text-xs text-center transition-all duration-300 shadow-2xs group-hover:shadow-md mt-1">
                    เปิดดูคิวทั้งหมด
                  </div>
                </div>

                {/* Individual Camera Cards */}
                {cameraGroups.map((cam) => (
                  <div
                    key={cam.cameraType}
                    onClick={() => selectCamera(cam.cameraType)}
                    className="group relative bg-white/90 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40 cursor-pointer flex flex-col items-center text-center gap-3"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F9F5FA] to-[#F4A0B5]/10 flex items-center justify-center overflow-hidden border border-[rgba(0,0,0,0.06)] group-hover:scale-105 transition-transform duration-300 shadow-2xs">
                      {cam.imageUrl ? (
                        <img
                          src={cam.imageUrl}
                          alt={cam.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl">{cam.icon}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#3D3040] group-hover:text-[#F4A0B5] transition-colors">
                        {cam.label}
                      </h4>
                      <p className="text-xs text-[var(--ink-muted)] mt-1 font-light">
                        กล้องรุ่นนี้
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      cam.count > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-neutral-50 text-neutral-400 border-neutral-200'
                    }`}>
                      {cam.count} คิว
                    </span>
                    <div className="w-full bg-gradient-to-r from-[#FEE1E8] to-[#FAD4E2] group-hover:from-[#F4A0B5] group-hover:to-[#D4B5E0] text-[#3D3040] group-hover:text-white py-2 px-4 rounded-xl font-bold text-xs text-center transition-all duration-300 shadow-2xs group-hover:shadow-md mt-1">
                      ดูรายการจอง
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= STEP 3: BOOKING TABLE ================= */}
          {step === 'bookings' && (
            <div className="animate-fade-in">
              {/* Context Header */}
              <div className="mb-6 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] shadow-xs flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  {selectedEventImageUrl ? (
                    <img
                      src={selectedEventImageUrl}
                      alt={selectedEvent || 'Event Poster'}
                      className="w-9 h-12 rounded-lg object-cover border border-[rgba(0,0,0,0.08)] shadow-xs flex-shrink-0"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-sm">🎤</span>
                  )}
                  <span className="text-xs font-bold text-[#3D3040]">{selectedEvent}</span>
                </div>
                <span className="text-[#C8BBC0]">›</span>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-sm">
                    {selectedCamera ? '📷' : '📋'}
                  </span>
                  <span className="text-xs font-bold text-[#3D3040]">{selectedCamera || 'ทุกกล้อง'}</span>
                </div>
                <span className="ml-auto text-xs text-[var(--ink-muted)] font-medium">
                  {filteredBookings.length} รายการ
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6 bg-white/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-xs">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อลูกค้า, เบอร์โทร, วันที่..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                  <svg className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-medium text-[var(--ink-muted)] whitespace-nowrap">กรองสถานะ:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  >
                    <option value="all">ทั้งหมด (All Status)</option>
                    <option value="pending">⏳ รอคอนเฟิร์ม (Pending)</option>
                    <option value="confirmed">✅ คอนเฟิร์มแล้ว (Confirmed)</option>
                    <option value="cancelled">🚫 ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Booking List / Table */}
              {filteredBookings.length === 0 ? (
                <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
                  <p className="text-sm text-[var(--ink-muted)] mb-4">ไม่พบรายการจองตามเงื่อนไขที่ค้นหา</p>
                  <button
                    onClick={openCreateModal}
                    className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
                  >
                    เพิ่มรายการจองใหม่
                  </button>
                </div>
              ) : (
                <>
                  {/* ================= MOBILE BOOKING CARDS LIST (< md) ================= */}
                  {/* ตารางชุดเดียวใช้ได้ทั้งมือถือและเดสก์ท็อป — คอลัมน์รองซ่อนบนจอแคบ
                      แถวที่กางออกเก็บข้อมูลติดต่อและปุ่มจัดการทั้งหมด */}
                  <div className="bg-white rounded-3xl border border-[var(--hairline)] shadow-sm overflow-hidden animate-fade-in">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#FFFBFC] border-b border-[var(--hairline)] text-xs font-bold text-[var(--ink-muted)]">
                          <th className="p-3 pl-4 sm:pl-6">ลูกค้า</th>
                          <th className="p-3 whitespace-nowrap">รอบเวลา</th>
                          <th className="p-3 hidden sm:table-cell">กล้อง</th>
                          <th className="p-3 text-center">สถานะคิว</th>
                          <th className="p-3 hidden sm:table-cell text-center pr-4 sm:pr-6">ชำระเงิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hairline)]">
                        {filteredBookings.map((b) => {
                          const isOpen = expandedBookingId === b.id;
                          const pay = PAYMENT_STATUS[b.paymentStatus || 'unpaid'];
                          return (
                            <Fragment key={b.id}>
                              <tr
                                onClick={() => setExpandedBookingId(isOpen ? null : b.id)}
                                className={`cursor-pointer transition-colors ${
                                  isOpen ? 'bg-[#F4A0B5]/8' : 'hover:bg-[#FFFBFC]'
                                }`}
                              >
                                <td className="p-3 pl-4 sm:pl-6">
                                  <div className="flex items-center gap-2">
                                    <span
                                      aria-hidden
                                      className="text-[var(--ink-muted)] w-3 flex-shrink-0"
                                    >
                                      {isOpen ? '▾' : '▸'}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-bold text-sm text-[var(--ink)] truncate">
                                        คุณ{b.customerName}
                                      </div>
                                      <div className="text-xs text-[var(--ink-muted)] font-mono">
                                        #BK-{b.id}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-sm text-[var(--ink)] whitespace-nowrap">
                                  {b.timeSlot}
                                  <span className="block text-xs text-[var(--ink-muted)]">{b.date}</span>
                                </td>
                                <td className="p-3 hidden sm:table-cell text-sm text-[var(--ink)]">
                                  {b.cameraType || '—'}
                                </td>
                                <td className="p-3 text-center">
                                  <StatusBadge status={BOOKING_STATUS[b.status]} short />
                                </td>
                                <td className="p-3 hidden sm:table-cell text-center pr-4 sm:pr-6">
                                  <StatusBadge status={pay} short />
                                </td>
                              </tr>

                              {isOpen && (
                                <tr className="bg-[#FFFBFC]">
                                  <td colSpan={5} className="px-4 sm:px-6 pb-5 pt-1">
                                    <div className="space-y-4">
                                      {/* ติดต่อ */}
                                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                        <a
                                          href={`tel:${b.customerPhone}`}
                                          className="font-mono text-[var(--ink)] underline decoration-[#F4A0B5] decoration-2 underline-offset-2 hover:decoration-[#D4708F]"
                                        >
                                          {formatPhoneNumber(b.customerPhone)}
                                        </a>
                                        {b.lineDisplayName && (
                                          <span className="text-[var(--ink-muted)]">
                                            LINE: <span className="text-[var(--ink)]">{b.lineDisplayName}</span>
                                          </span>
                                        )}
                                        <span className="text-[var(--ink-muted)] sm:hidden">
                                          กล้อง: <span className="text-[var(--ink)]">{b.cameraType || '—'}</span>
                                        </span>
                                      </div>

                                      {/* สถานะคิว */}
                                      <div>
                                        <span className="text-xs font-bold text-[var(--ink-muted)] block mb-1.5">
                                          สถานะคิว — กดเพื่อเปลี่ยน
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(['confirmed', 'pending', 'cancelled'] as const).map((k) => (
                                            <button
                                              key={k}
                                              type="button"
                                              onClick={() => handleStatusChange(b.id, k)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                b.status === k
                                                  ? BOOKING_STATUS[k].solid
                                                  : 'bg-white border-[var(--hairline)] text-[var(--ink-muted)] hover:border-[#F4A0B5]/50 hover:text-[var(--ink)]'
                                              }`}
                                            >
                                              {BOOKING_STATUS[k].label}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* ชำระเงิน */}
                                      <div>
                                        <span className="text-xs font-bold text-[var(--ink-muted)] block mb-1.5">
                                          สถานะชำระเงิน — กดเพื่อเปลี่ยน
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {(['unpaid', 'deposit', 'paid'] as const).map((k) => (
                                            <button
                                              key={k}
                                              type="button"
                                              onClick={() => handlePaymentStatusChange(b.id, k)}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                (b.paymentStatus || 'unpaid') === k
                                                  ? PAYMENT_STATUS[k].solid
                                                  : 'bg-white border-[var(--hairline)] text-[var(--ink-muted)] hover:border-[#F4A0B5]/50 hover:text-[var(--ink)]'
                                              }`}
                                            >
                                              {PAYMENT_STATUS[k].label}
                                            </button>
                                          ))}
                                          {b.depositAmount ? (
                                            <span className="text-xs font-mono text-emerald-800 ml-1">
                                              มัดจำ {formatBaht(b.depositAmount)}
                                            </span>
                                          ) : null}
                                          {b.remainingAmount ? (
                                            <span className="text-xs font-mono text-amber-800">
                                              · คงเหลือ {formatBaht(b.remainingAmount)}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>

                                      {b.notes && (
                                        <p className="text-sm text-[var(--ink)] bg-white border border-[var(--hairline)] rounded-xl px-3 py-2">
                                          <span className="text-[var(--ink-muted)]">หมายเหตุ: </span>
                                          {b.notes}
                                        </p>
                                      )}

                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--hairline)] flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => handleDelete(b.id, b.customerName)}
                                          >
                                            ลบรายการ
                                          </Button>
                                          <button
                                            type="button"
                                            onClick={() => openEditModal(b)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#F4A0B5]/40 text-[#D4708F] bg-[#F4A0B5]/10 hover:bg-[#F4A0B5]/20 transition-all cursor-pointer flex items-center gap-1"
                                          >
                                            <span>✏️</span> แก้ไขข้อมูลทั้งหมด
                                          </button>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant={copiedId === b.id ? 'primary' : 'secondary'}
                                          onClick={() => copyConfirmationText(b)}
                                        >
                                          {copiedId === b.id ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ LINE'}
                                        </Button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="p-3 bg-[#FFFBFC] border-t border-[var(--hairline)] text-right text-xs text-[var(--ink-muted)]">
                      แสดงทั้งหมด {filteredBookings.length} รายการ · {selectedEvent}
                      {selectedCamera ? ` · ${selectedCamera}` : ' · ทุกกล้อง'}
                    </div>
                  </div>
              </>
            )}
          </div>
        )}
      </>
    )}

      {/* CREATE MANUAL BOOKING MODAL */}
      {isModalOpen && (
        <BookingForm
          cameras={cameras}
          schedules={schedules}
          formData={formData}
          setFormData={setFormData}
          isSaving={isSaving}
          handleCreateBooking={handleCreateBooking}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* BOOKING BOT FORM MODAL */}
      {isBotModalOpen && (
        <BookingBotModal
          cameras={cameras}
          schedules={schedules}
          onClose={closeBotModal}
        />
      )}

      {/* EDIT BOOKING MODAL */}
      {editingBooking && (
        <BookingEditModal
          booking={editingBooking}
          cameras={cameras}
          schedules={schedules}
          onClose={closeEditModal}
          onSuccess={handleBookingEdited}
        />
      )}
    </section>
  );
}

