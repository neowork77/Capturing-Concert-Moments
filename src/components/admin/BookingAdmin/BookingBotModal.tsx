'use client';

import { useState, useEffect } from 'react';
import { CameraRecord } from '@/lib/camera-service';
import { ScheduleRecord } from '@/lib/schedule-service';

interface BookingBotModalProps {
  cameras: CameraRecord[];
  schedules: ScheduleRecord[];
  onClose: () => void;
}

export default function BookingBotModal({
  cameras,
  schedules,
  onClose,
}: BookingBotModalProps) {
  const [activeTab, setActiveTab] = useState<'customer' | 'admin_bot' | 'confirm' | 'guide'>('admin_bot');

  // Form State for Admin Bot Generator
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [eventName, setEventName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState<string>('12:00-12:20');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [lineDisplayName, setLineDisplayName] = useState<string>('');
  const [cameraType, setCameraType] = useState<string>('RICOH GR IIIx + Flash');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('confirmed');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'deposit' | 'paid'>('deposit');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Sync initial selection
  useEffect(() => {
    if (schedules.length > 0) {
      const first = schedules[0];
      setSelectedScheduleId(String(first.id));
      setEventName(first.eventName || '');
      setDate(first.date);
      const defaultSlot = first.slots.find(s => s.status === 'available')?.time || first.slots[0]?.time || '12:00-12:20';
      setTimeSlot(defaultSlot);
    }
    if (cameras.length > 0) {
      setCameraType(cameras[0].name);
    }
  }, [schedules, cameras]);

  const handleSelectSchedule = (val: string) => {
    setSelectedScheduleId(val);
    if (val === 'custom' || !val) return;

    const sched = schedules.find(s => String(s.id) === val);
    if (sched) {
      setEventName(sched.eventName || '');
      setDate(sched.date);
      const defaultSlot = sched.slots.find(s => s.status === 'available')?.time || sched.slots[0]?.time || '12:00-12:20';
      setTimeSlot(defaultSlot);
    }
  };

  const activeSchedule = schedules.find(s => String(s.id) === selectedScheduleId);

  // Generated Text Formats
  const customerBlankFormText = `📝 แบบฟอร์มจองคิว (Booking Form)
━━━━━━━━━━━━━━
กรุณาก๊อปปี้ข้อความด้านล่างแล้วกรอกข้อมูลส่งมาได้เลยค่ะ:

ชื่อผู้จอง: 
เบอร์โทรศัพท์: 
ช่วงเวลาที่ต้องการ: 
(เช่น 12:00-12:20)

📌 คำแนะนำ: สามารถกดเลือกรอบงานและกล้องจากปุ่ม 'เช็ครอบเวลาว่าง' ในเมนูด้านล่างก่อนได้เลยนะคะ ✨`;

  const adminBotFormText = `#${eventName || 'ชื่องาน'}
วันที่ : ${date}
เวลา : ${timeSlot} น.
📷 กล้อง : ${cameraType || '-'}
K.${customerName || 'ชื่อลูกค้า'} ${customerPhone || '08xxxxxxxx'}
ชื่อไลน์ : ${lineDisplayName || 'ไม่ระบุ'}
สถานะ : ${status === 'confirmed' ? 'confirmed' : status === 'cancelled' ? 'cancelled' : 'pending'}
ชำระเงิน : ${paymentStatus}
${depositAmount > 0 ? `มัดจำ : ${depositAmount}\n` : ''}${paymentStatus === 'deposit' && remainingAmount > 0 ? `เก็บเพิ่ม : ${remainingAmount}\n` : ''}${notes ? `โน้ต : ${notes}` : ''}`.trim();

  const confirmationReplyText = `#${eventName || 'ชื่องาน'}
วันที่ : ${date}
เวลา : ${timeSlot} น.
📷 กล้อง : ${cameraType || '-'}
K.${customerName || 'ชื่อลูกค้า'} ${customerPhone || ''}
ชื่อไลน์ : ${lineDisplayName || '-'}
สถานะ : ${status === 'confirmed' ? 'คอนเฟิร์มคิวแล้วเรียบร้อยค่ะ ✨' : 'รอคอนเฟิร์มคิว ⏳'}
ชำระเงิน : ${paymentStatus === 'paid' ? `ชำระเงินเต็มจำนวนเรียบร้อยค่ะ 💚 (${depositAmount ? depositAmount.toLocaleString() : 0} ฿)` : paymentStatus === 'deposit' ? `ได้รับมัดจำเรียบร้อยค่ะ 🟡 (${depositAmount ? depositAmount.toLocaleString() : 0} ฿)${remainingAmount > 0 ? `\n💵 ยอดต้องเก็บเพิ่มอีก: ${remainingAmount.toLocaleString()} ฿` : ''}` : 'ยังไม่ได้ชำระ 🔴'}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/30 border border-[#F4A0B5]/30 flex items-center justify-center text-xl shrink-0">
            🤖
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-[#3D3040]">
              บอทพิมพ์แบบฟอร์มจองคิว (Booking Form Bot)
            </h3>
            <p className="text-xs text-[#9E8E95] font-light">
              เครื่องมือสร้างและคัดลอกแบบฟอร์มจองคิวสำหรับ LINE Admin Bot และลูกค้า
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-2xl mb-5 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('admin_bot')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'admin_bot'
                ? 'bg-white text-[#3D3040] shadow-sm'
                : 'text-[#9E8E95] hover:text-[#3D3040]'
            }`}
          >
            <span>⚡ เจนแบบฟอร์มส่ง Admin Bot</span>
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'customer'
                ? 'bg-white text-[#3D3040] shadow-sm'
                : 'text-[#9E8E95] hover:text-[#3D3040]'
            }`}
          >
            <span>📄 แบบฟอร์มเปล่าส่งลูกค้า</span>
          </button>
          <button
            onClick={() => setActiveTab('confirm')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'confirm'
                ? 'bg-white text-[#3D3040] shadow-sm'
                : 'text-[#9E8E95] hover:text-[#3D3040]'
            }`}
          >
            <span>✨ ข้อความคอนเฟิร์มคิว</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-white text-[#3D3040] shadow-sm'
                : 'text-[#9E8E95] hover:text-[#3D3040]'
            }`}
          >
            <span>📖 คู่มือคำสั่งบอท</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: ADMIN BOT FORM GENERATOR */}
          {activeTab === 'admin_bot' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[#F4A0B5]/20 text-xs text-[#3D3040]">
                💡 <b>วิธีใช้งาน:</b> กรอกข้อมูลการจองด้านล่าง ระบบจะเจนบล็อกข้อความสำหรับ Admin Bot อัตโนมัติ สามารถกดปุ่ม <b>"คัดลอกเพื่อส่งใน LINE"</b> ไปวางส่งใน LINE OA Admin เพื่อลงคิวอัตโนมัติได้ทันที
              </div>

              {/* Event Select */}
              <div>
                <label className="block text-xs font-bold text-[#3D3040] uppercase mb-1">
                  🎤 เลือกคอนเสิร์ตในระบบ
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={e => handleSelectSchedule(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                >
                  {schedules.map(sched => (
                    <option key={sched.id} value={sched.id}>
                      🎤 {sched.eventName || 'ไม่มีชื่องาน'} (📅 {sched.date})
                    </option>
                  ))}
                  <option value="custom">✍️ ระบุชื่องานเอง (Custom Event)</option>
                </select>
              </div>

              {/* Free text Event Name (if custom) */}
              {selectedScheduleId === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    ชื่องาน (Event Name)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ITZY 3rd World Tour"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              )}

              {/* Date & Slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    วันที่ (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    รอบเวลา (Time Slot)
                  </label>
                  {activeSchedule && activeSchedule.slots.length > 0 ? (
                    <select
                      value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                    >
                      {activeSchedule.slots.map(slot => (
                        <option key={slot.time} value={slot.time}>
                          ⏰ {slot.time} {slot.status === 'available' ? '🟢 (ว่าง)' : '🔴 (เต็ม)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="12:00-12:20"
                      value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                    />
                  )}
                </div>
              </div>

              {/* Camera & Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    รุ่นกล้อง (Camera)
                  </label>
                  <select
                    value={cameraType}
                    onChange={e => setCameraType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                  >
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.name}>
                        📷 {cam.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คิมโดยอง"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    placeholder="0812345678"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    ชื่อไลน์ (LINE Name)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Doyoung_KIM"
                    value={lineDisplayName}
                    onChange={e => setLineDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              </div>

              {/* Status & Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    สถานะการจอง
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                  >
                    <option value="confirmed">✅ confirmed (ยืนยันคิว)</option>
                    <option value="pending">⏳ pending (รอยืนยัน)</option>
                    <option value="cancelled">❌ cancelled (ยกเลิก)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    สถานะการชำระเงิน
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40 bg-white cursor-pointer"
                  >
                    <option value="deposit">🟡 deposit (มัดจำแล้ว)</option>
                    <option value="paid">✅ paid (ชำระเต็ม)</option>
                    <option value="unpaid">⚫ unpaid (ยังไม่ชำระ)</option>
                  </select>
                </div>
              </div>

              {/* Deposit & Remaining Amount Fields */}
              {paymentStatus === 'deposit' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                      💵 จำนวนเงินมัดจำ (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="500"
                      value={depositAmount || ''}
                      onChange={e => setDepositAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                      💵 ยอดต้องเก็บเพิ่มอีก (บาท)
                    </label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={remainingAmount || ''}
                      onChange={e => setRemainingAmount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                    />
                  </div>
                </div>
              )}

              {paymentStatus === 'paid' && (
                <div>
                  <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                    💵 จำนวนเงินที่ชำระแล้ว (บาท)
                  </label>
                  <input
                    type="number"
                    placeholder="2000"
                    value={depositAmount || ''}
                    onChange={e => {
                      setDepositAmount(parseInt(e.target.value, 10) || 0);
                      setRemainingAmount(0);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
                  />
                </div>
              )}

              {/* Preview Box & Copy Button */}
              <div>
                <label className="block text-xs font-bold text-[#3D3040] uppercase mb-1">
                  📋 ตัวอย่างบล็อกข้อความสำหรับ Admin Bot
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    rows={8}
                    value={adminBotFormText}
                    className="w-full font-mono text-xs p-4 rounded-2xl bg-neutral-90 border border-[rgba(0,0,0,0.1)] text-[#3D3040] focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => copyToClipboard(adminBotFormText, 'admin_bot')}
                    className={`absolute bottom-3 right-3 py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      copiedType === 'admin_bot'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white'
                    }`}
                  >
                    {copiedType === 'admin_bot' ? '✓ คัดลอกสำเร็จ!' : '📋 คัดลอกส่งให้ Admin Bot'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMER BLANK FORM */}
          {activeTab === 'customer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[#F4A0B5]/20 text-xs text-[#3D3040]">
                💬 <b>สำหรับแอดมิน:</b> คัดลอกแบบฟอร์มนี้ส่งให้ลูกค้าทาง LINE เพื่อให้ลูกค้าก๊อปไปกรอกรายละเอียดการจอง
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={10}
                  value={customerBlankFormText}
                  className="w-full font-mono text-xs p-4 rounded-2xl bg-neutral-90 border border-[rgba(0,0,0,0.1)] text-[#3D3040] focus:outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={() => copyToClipboard(customerBlankFormText, 'customer')}
                  className={`absolute bottom-3 right-3 py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    copiedType === 'customer'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white'
                  }`}
                >
                  {copiedType === 'customer' ? '✓ คัดลอกสำเร็จ!' : '📋 คัดลอกแบบฟอร์มเปล่าส่งลูกค้า'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIRMATION REPLY */}
          {activeTab === 'confirm' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-[#FFFBFC] border border-[#F4A0B5]/20 text-xs text-[#3D3040]">
                ✨ <b>ข้อความสรุปคิว:</b> ใช้สำหรับคัดลอกไปตอบกลับยืนยันคิวให้ลูกค้าใน LINE
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={9}
                  value={confirmationReplyText}
                  className="w-full font-mono text-xs p-4 rounded-2xl bg-neutral-90 border border-[rgba(0,0,0,0.1)] text-[#3D3040] focus:outline-none resize-none leading-relaxed"
                />
                <button
                  onClick={() => copyToClipboard(confirmationReplyText, 'confirm')}
                  className={`absolute bottom-3 right-3 py-2 px-4 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    copiedType === 'confirm'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white'
                  }`}
                >
                  {copiedType === 'confirm' ? '✓ คัดลอกสำเร็จ!' : '✨ คัดลอกข้อความสรุปยืนยันคิว'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BOT CHEATSHEET & GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 animate-fade-in text-xs text-[#3D3040]">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-[rgba(0,0,0,0.06)] space-y-3">
                <h4 className="font-bold text-sm text-[#3D3040] flex items-center gap-2">
                  <span>🤖</span>
                  <span>คำสั่งบอทสำหรับ Admin (พิมพ์ใน LINE Admin Webhook)</span>
                </h4>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">1. เช็ก</span> หรือ <span className="font-bold text-[#F4A0B5]">เช็กทั้งหมด</span>
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">ดึงตารางอีเวนต์ทั้งหมดในระบบและปุ่มเลือกเช็กคิวว่าง</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">2. เช็ก [ชื่องาน]</span> (เช่น <code className="bg-neutral-100 px-1 rounded text-neutral-600">เช็ก ITZY</code>)
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">รายงานรายการคิวที่ถูกจองแล้วและรอบเวลาที่ยังว่างอยู่</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">3. แบบฟอร์ม</span> หรือ <span className="font-bold text-[#F4A0B5]">วิธีพิมพ์</span>
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">ให้บอทพ่นแบบฟอร์มเปล่ามาให้ก๊อปปี้ไปแก้ไขในแชท LINE</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-[rgba(0,0,0,0.06)] space-y-3">
                <h4 className="font-bold text-sm text-[#3D3040] flex items-center gap-2">
                  <span>📱</span>
                  <span>คำสั่งบอทสำหรับลูกค้า (พิมพ์ใน LINE OA ลูกค้า)</span>
                </h4>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">1. สนใจจองคิว</span>
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">แสดงการ์ดอีเวนต์ทั้งหมดที่เปิดรับคิว</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">2. แบบฟอร์ม</span> หรือ <span className="font-bold text-[#F4A0B5]">ขอแบบฟอร์ม</span>
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">ส่งแบบฟอร์มเปล่าให้ลูกค้าก๊อปไปกรอกข้อความ</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[rgba(0,0,0,0.06)]">
                    <span className="font-bold text-[#F4A0B5]">3. พิมพ์: "ชื่อ เบอร์โทร เวลาที่ต้องการ"</span>
                    <p className="text-[10px] text-[#9E8E95] font-sans mt-0.5">เช่น: คิมโดยอง 0812345678 12:00-12:20 (ระบบสร้างคิวลง Supabase อัตโนมัติ)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-[rgba(0,0,0,0.06)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-[#3D3040] text-xs font-semibold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
