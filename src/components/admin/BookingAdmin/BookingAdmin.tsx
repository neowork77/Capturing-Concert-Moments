'use client';

import { useBookingAdmin } from './useBookingAdmin';
import BookingKPI from './BookingKPI';
import BookingForm from './BookingForm';
import BookingBotModal from './BookingBotModal';

export default function BookingAdmin() {
  const {
    cameras,
    schedules,
    isLoading,
    errorMessage,
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
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredBookings,
    stats,
    isModalOpen,
    setIsModalOpen,
    openCreateModal,
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

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-[#F4A0B5]/10 text-[#F4A0B5] font-bold text-[11px] uppercase tracking-wider">
              Booking Management
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#3D3040] mt-1">
            รายละเอียดรายการจองคิว (Booking Details)
          </h2>
          <p className="text-xs text-[#9E8E95] font-light mt-1">
            จัดการข้อมูลผู้จองจาก LINE และสร้างรายการจองด้วยตนเอง พร้อมเปลี่ยนสถานะการจองแบบ Real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openBotModal}
            className="py-2.5 px-4 rounded-xl bg-white border border-[#F4A0B5]/40 hover:bg-[#FFFBFC] text-[#3D3040] text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="text-base">🤖</span>
            <span>บอทพิมพ์แบบฟอร์ม</span>
          </button>

          <button
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.25)] transition-all cursor-pointer flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>เพิ่มรายการจองคิวใหม่</span>
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
              <span className="text-xs font-medium text-[#9E8E95]">
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
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[#9E8E95] hover:text-[#3D3040] transition-all group cursor-pointer"
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
          <p className="text-xs text-[#9E8E95]">กำลังโหลดรายการจองจาก Supabase...</p>
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
                  <p className="text-sm text-[#9E8E95] mb-4">ยังไม่มีรายการจอง</p>
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

                    return (
                      <div
                        key={group.eventName}
                        onClick={() => selectEvent(group.eventName)}
                        className="group relative bg-white/90 backdrop-blur-xl border border-[rgba(0,0,0,0.06)] rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40 cursor-pointer flex flex-col justify-between overflow-hidden"
                      >
                        {/* Top Section */}
                        <div className="flex gap-4 items-start">
                          {/* Event Icon */}
                          <div className="relative w-16 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFFBFC] via-[#F9F5FA] to-[#F4A0B5]/20 border border-[rgba(0,0,0,0.08)] shadow-2xs flex-shrink-0 flex flex-col items-center justify-center text-center group-hover:scale-[1.02] transition-transform duration-300">
                            <span className="text-2xl mb-1">🎤</span>
                            <span className="text-[9px] font-bold text-[#9E8E95] uppercase tracking-wider leading-tight px-1">
                              {group.dates.length} วัน
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Date Badge */}
                            <div className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#FFFBFC] to-[#F9F5FA] border border-[rgba(0,0,0,0.06)] mb-2 shadow-2xs">
                              <span className="text-[10px] font-bold text-[#F4A0B5] flex-shrink-0">🗓️</span>
                              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#3D3040] truncate min-w-0">
                                {group.dates.length > 1
                                  ? `${group.dates[0]} ~ ${group.dates[group.dates.length - 1]}`
                                  : group.dates[0] || '-'}
                              </span>
                            </div>

                            {/* Event Name */}
                            <h3 className="font-bold text-base text-[#3D3040] leading-snug line-clamp-2 group-hover:text-[#F4A0B5] transition-colors">
                              {group.eventName}
                            </h3>

                            {/* Booking Count */}
                            <p className="text-xs text-[#9E8E95] mt-1 flex items-center gap-1 font-light">
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
                            <span className="text-[10px] font-semibold text-[#9E8E95]">
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-xl flex-shrink-0">
                  🎤
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#F4A0B5] uppercase tracking-wider">งานที่เลือก</p>
                  <h3 className="font-display text-lg font-bold text-[#3D3040]">{selectedEvent}</h3>
                  <p className="text-xs text-[#9E8E95] font-light mt-0.5">
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
                    <p className="text-xs text-[#9E8E95] mt-1 font-light">
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
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F9F5FA] to-[#F4A0B5]/10 flex items-center justify-center text-3xl border border-[rgba(0,0,0,0.06)] group-hover:scale-110 transition-transform duration-300">
                      {cam.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#3D3040] group-hover:text-[#F4A0B5] transition-colors">
                        {cam.label}
                      </h4>
                      <p className="text-xs text-[#9E8E95] mt-1 font-light">
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
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-sm">🎤</span>
                  <span className="text-xs font-bold text-[#3D3040]">{selectedEvent}</span>
                </div>
                <span className="text-[#C8BBC0]">›</span>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-sm">
                    {selectedCamera ? '📷' : '📋'}
                  </span>
                  <span className="text-xs font-bold text-[#3D3040]">{selectedCamera || 'ทุกกล้อง'}</span>
                </div>
                <span className="ml-auto text-[11px] text-[#9E8E95] font-medium">
                  {filteredBookings.length} รายการ
                </span>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-xs">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="🔍 ค้นหาชื่อลูกค้า, เบอร์โทร, วันที่..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                  <svg className="w-4 h-4 text-[#9E8E95] absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-medium text-[#9E8E95] whitespace-nowrap">กรองสถานะ:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  >
                    <option value="all">ทั้งหมด (All Status)</option>
                    <option value="pending">⏳ รอคอนเฟิร์ม (Pending)</option>
                    <option value="confirmed">✅ คอนเฟิร์มแล้ว (Confirmed)</option>
                    <option value="cancelled">🚫 ยกเลิก (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Booking Table */}
              {filteredBookings.length === 0 ? (
                <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
                  <p className="text-sm text-[#9E8E95] mb-4">ไม่พบรายการจองตามเงื่อนไขที่ค้นหา</p>
                  <button
                    onClick={openCreateModal}
                    className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
                  >
                    เพิ่มรายการจองใหม่
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[rgba(0,0,0,0.06)] shadow-lg overflow-hidden">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#FFFBFC] via-[#F9F5FA] to-[#FFFBFC] border-b border-[rgba(0,0,0,0.06)] text-[11px] font-bold uppercase text-[#9E8E95] tracking-wider">
                          <th className="p-4 pl-6">ลูกค้า (Customer)</th>
                          <th className="p-4">ชื่องาน / คอนเสิร์ต</th>
                          <th className="p-4">วันที่ &amp; รอบเวลา</th>
                          <th className="p-4">📷 กล้อง</th>
                          <th className="p-4">ชื่อไลน์ (LINE Name)</th>
                          <th className="p-4 text-center">สถานะการจอง</th>
                          <th className="p-4 text-center">💰 ชำระเงิน</th>
                          <th className="p-4 text-right pr-6">คัดลอก / จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(0,0,0,0.04)] text-xs">
                        {filteredBookings.map((b, idx) => (
                          <tr
                            key={b.id}
                            className={`hover:bg-[#F9F5FA]/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FFFBFC]/40'}`}
                          >
                            {/* Customer Info */}
                            <td className="p-4 pl-6">
                              <div className="font-bold text-sm text-[#3D3040]">K. {b.customerName}</div>
                              <a
                                href={`tel:${b.customerPhone}`}
                                className="text-xs text-[#F4A0B5] hover:underline font-mono"
                              >
                                📞 {b.customerPhone}
                              </a>
                            </td>

                            {/* Event Name */}
                            <td className="p-4">
                              <div className="font-medium text-[#3D3040]">{b.eventName}</div>
                            </td>

                            {/* Date & Time Slot */}
                            <td className="p-4">
                              <div className="font-mono text-xs font-semibold text-[#3D3040]">🗓️ {b.date}</div>
                              <div className="font-mono text-[11px] text-[#9E8E95] mt-0.5">⏰ {b.timeSlot} น.</div>
                            </td>

                            {/* Camera Type */}
                            <td className="p-4">
                              {b.cameraType ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F4A0B5]/10 text-[#D4708F]">
                                  📷 {b.cameraType}
                                </span>
                              ) : (
                                <span className="text-[#C8BBC0]">-</span>
                              )}
                            </td>

                            {/* LINE Display Name */}
                            <td className="p-4 text-[#9E8E95]">
                              {b.lineDisplayName ? (
                                <span className="inline-flex items-center gap-1 text-[#00B900] font-medium">
                                  💬 {b.lineDisplayName}
                                </span>
                              ) : (
                                <span className="text-[#C8BBC0]">-</span>
                              )}
                            </td>

                            {/* Status Toggle Buttons */}
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center gap-1 bg-[#FFFBFC] p-1 rounded-xl border border-[rgba(0,0,0,0.06)]">
                                <button
                                  onClick={() => handleStatusChange(b.id, 'confirmed')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${b.status === 'confirmed'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-emerald-600'
                                    }`}
                                >
                                  ✓ คอนเฟิร์ม
                                </button>
                                <button
                                  onClick={() => handleStatusChange(b.id, 'pending')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${b.status === 'pending'
                                      ? 'bg-amber-400 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-amber-600'
                                    }`}
                                >
                                  ⏳ รอ
                                </button>
                                <button
                                  onClick={() => handleStatusChange(b.id, 'cancelled')}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${b.status === 'cancelled'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-rose-600'
                                    }`}
                                >
                                  ✕ ยกเลิก
                                </button>
                              </div>
                            </td>

                            {/* Payment Status Toggle Buttons */}
                            <td className="p-4 text-center">
                              <div className="inline-flex items-center gap-1 bg-[#FFFBFC] p-1 rounded-xl border border-[rgba(0,0,0,0.06)]">
                                <button
                                  onClick={() => handlePaymentStatusChange(b.id, 'unpaid')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    b.paymentStatus === 'unpaid'
                                      ? 'bg-neutral-500 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-neutral-600'
                                  }`}
                                >
                                  ⚫ ยังไม่มัดจำ
                                </button>
                                <button
                                  onClick={() => handlePaymentStatusChange(b.id, 'deposit')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    b.paymentStatus === 'deposit'
                                      ? 'bg-amber-400 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-amber-600'
                                  }`}
                                  title="คลิกเพื่อแก้ไขจำนวนมัดจำ"
                                >
                                  🟡 มัดจำ {b.paymentStatus === 'deposit' && b.depositAmount ? `(${b.depositAmount.toLocaleString()}฿)` : ''}
                                </button>
                                <button
                                  onClick={() => handlePaymentStatusChange(b.id, 'paid')}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                    b.paymentStatus === 'paid'
                                      ? 'bg-emerald-500 text-white shadow-xs'
                                      : 'text-neutral-400 hover:text-emerald-600'
                                  }`}
                                >
                                  ✅ จ่ายเต็ม
                                </button>
                              </div>
                            </td>

                            {/* Actions & Copy Button */}
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => copyConfirmationText(b)}
                                  className="px-2.5 py-1.5 rounded-xl border border-[#F4A0B5]/30 bg-[#F4A0B5]/5 text-[#F4A0B5] hover:bg-[#F4A0B5] hover:text-white transition-all text-[11px] font-medium cursor-pointer"
                                  title="คัดลอกข้อความตอบกลับ LINE"
                                >
                                  {copiedId === b.id ? '✓ คัดลอกแล้ว' : '📋 คัดลอก LINE'}
                                </button>
                                <button
                                  onClick={() => handleDelete(b.id, b.customerName)}
                                  className="p-1.5 rounded-xl border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-[11px]"
                                  title="ลบรายการ"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-[#FFFBFC] border-t border-[rgba(0,0,0,0.04)] text-right text-[11px] text-[#9E8E95]">
                    แสดงผลทั้งหมด {filteredBookings.length} รายการ | {selectedEvent} {selectedCamera ? `· ${selectedCamera}` : '· ทุกกล้อง'}
                  </div>
                </div>
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
    </section>
  );
}
