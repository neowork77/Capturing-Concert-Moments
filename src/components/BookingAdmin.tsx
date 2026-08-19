'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  fetchBookingsAction,
  createBookingAction,
  updateBookingStatusAction,
  deleteBookingAction,
} from '@/app/actions/booking-actions';
import { BookingRecord } from '@/lib/booking-service';

export default function BookingAdmin() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State for Manual Booking
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eventName: '',
    timeSlot: '12:00-12:20',
    customerName: '',
    customerPhone: '',
    lineDisplayName: '',
    cameraType: 'RICOH GR IIIx + Flash',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadBookings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await fetchBookingsAction();
    if (res.success && res.data) {
      setBookings(res.data);
    } else {
      setErrorMessage(res.message || 'ไม่สามารถโหลดข้อมูลรายการจองได้');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
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
  }, [bookings, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    bookings.forEach(b => {
      if (b.status === 'pending') pending++;
      else if (b.status === 'confirmed') confirmed++;
      else if (b.status === 'cancelled') cancelled++;
    });

    return { total: bookings.length, pending, confirmed, cancelled };
  }, [bookings]);

  const handleStatusChange = async (id: number, newStatus: 'pending' | 'confirmed' | 'cancelled') => {
    const res = await updateBookingStatusAction(id, newStatus);
    if (res.success) {
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: newStatus } : b))
      );
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const handleDelete = async (id: number, customerName: string) => {
    if (!confirm(`คุณต้องการลบรายการจองของ คุณ${customerName} ใช่หรือไม่?`)) return;
    const res = await deleteBookingAction(id);
    if (res.success) {
      await loadBookings();
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการลบรายการ');
    }
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
      await loadBookings();
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง');
    }
    setIsSaving(false);
  };

  const copyConfirmationText = (b: BookingRecord) => {
    const text = `#${b.eventName}\nวันที่ : ${b.date}\nเวลา : ${b.timeSlot} น.\n📷 กล้อง : ${b.cameraType || '-'}\nK.${b.customerName} ${b.customerPhone}\nชื่อไลน์ : ${b.lineDisplayName || '-'}\nสถานะ : ${b.status === 'confirmed' ? 'คอนเฟิร์มคิวแล้วเรียบร้อยค่ะ ✨' : 'รอคอนเฟิร์มคิว'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

        <button
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.25)] transition-all cursor-pointer flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>เพิ่มรายการจองคิวใหม่</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-xs">
          <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider block">การจองทั้งหมด</span>
          <span className="font-display text-2xl font-bold text-[#3D3040]">{stats.total} <span className="text-xs font-normal text-[#9E8E95]">รายการ</span></span>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">⏳ รอคอนเฟิร์ม (Pending)</span>
          <span className="font-display text-2xl font-bold text-amber-700">{stats.pending} <span className="text-xs font-normal text-amber-600">คิว</span></span>
        </div>
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/60 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">✅ คอนเฟิร์มแล้ว (Confirmed)</span>
          <span className="font-display text-2xl font-bold text-emerald-700">{stats.confirmed} <span className="text-xs font-normal text-emerald-600">คิว</span></span>
        </div>
        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/60 shadow-xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">🚫 ยกเลิกแล้ว (Cancelled)</span>
          <span className="font-display text-2xl font-bold text-rose-600">{stats.cancelled} <span className="text-xs font-normal text-rose-500">คิว</span></span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-[rgba(0,0,0,0.05)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อลูกค้า, เบอร์โทร, ชื่องาน, วันที่..."
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

      {/* Booking List / Data Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin" />
          <p className="text-xs text-[#9E8E95]">กำลังโหลดรายการจองจาก Supabase...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-[#FFF0F3] border border-rose-200 rounded-2xl text-rose-500 text-sm text-center">
          {errorMessage}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
          <p className="text-sm text-[#9E8E95] mb-4">ยังไม่มีรายการจองตามเงื่อนไขที่ค้นหา</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
          >
            เพิ่มรายการจองแรกของคุณ
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[rgba(0,0,0,0.06)] shadow-lg overflow-hidden animate-fade-in">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gradient-to-r from-[#FFFBFC] via-[#F9F5FA] to-[#FFFBFC] border-b border-[rgba(0,0,0,0.06)] text-[11px] font-bold uppercase text-[#9E8E95] tracking-wider">
                  <th className="p-4 pl-6">ลูกค้า (Customer)</th>
                  <th className="p-4">ชื่องาน / คอนเสิร์ต</th>
                  <th className="p-4">วันที่ & รอบเวลา</th>
                  <th className="p-4">📷 กล้อง</th>
                  <th className="p-4">ชื่อไลน์ (LINE Name)</th>
                  <th className="p-4 text-center">สถานะการจอง</th>
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
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'text-neutral-400 hover:text-emerald-600'
                          }`}
                        >
                          ✓ คอนเฟิร์ม
                        </button>
                        <button
                          onClick={() => handleStatusChange(b.id, 'pending')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            b.status === 'pending'
                              ? 'bg-amber-400 text-white shadow-xs'
                              : 'text-neutral-400 hover:text-amber-600'
                          }`}
                        >
                          ⏳ รอ
                        </button>
                        <button
                          onClick={() => handleStatusChange(b.id, 'cancelled')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            b.status === 'cancelled'
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'text-neutral-400 hover:text-rose-600'
                          }`}
                        >
                          ✕ ยกเลิก
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
            แสดงผลทั้งหมด {filteredBookings.length} จาก {bookings.length} รายการ | ซิงก์เรียลไทม์กับ Supabase Bookings
          </div>
        </div>
      )}

      {/* CREATE MANUAL BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative">
            <h3 className="font-display text-xl font-bold text-[#3D3040] mb-4">
              เพิ่มรายการจองคิวใหม่ (Manual Booking)
            </h3>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    ชื่อลูกค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คิมโดยอง"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    เบอร์โทรศัพท์ (10 หลัก) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0812345678"
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  ชื่อคอนเสิร์ต / Event Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ITZY 3rd World Tour"
                  value={formData.eventName}
                  onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    วันที่ (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    ช่วงเวลา (Time Slot) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 12:00-12:20"
                    value={formData.timeSlot}
                    onChange={e => setFormData({ ...formData, timeSlot: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  เลือกกล้อง (Camera Type) *
                </label>
                <select
                  value={formData.cameraType}
                  onChange={e => setFormData({ ...formData, cameraType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white"
                >
                  <option value="RICOH GR IIIx + Flash">📷 RICOH GR IIIx + Flash (฿219 / 20 นาที)</option>
                  <option value="Fujifilm instax mini 11">📸 Fujifilm instax mini 11 (฿65 / 1 รูป)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                  ชื่อไลน์ (Optional)
                </label>
                <input
                  type="text"
                  placeholder="เช่น Doyoung_KIM"
                  value={formData.lineDisplayName}
                  onChange={e => setFormData({ ...formData, lineDisplayName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(0,0,0,0.06)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[#9E8E95] hover:bg-neutral-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกรายการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
