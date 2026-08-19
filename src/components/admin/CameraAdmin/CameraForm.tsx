import { CameraRecord } from '@/lib/camera-service';
import { useState } from 'react';

interface CameraFormProps {
  editingCamera: CameraRecord | null;
  formData: {
    name: string;
    priceInfo: string;
    imageUrl: string;
    description: string;
    isActive: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    priceInfo: string;
    imageUrl: string;
    description: string;
    isActive: boolean;
  }>>;
  isSaving: boolean;
  handleSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function CameraForm({
  editingCamera,
  formData,
  setFormData,
  isSaving,
  handleSave,
  onClose,
}: CameraFormProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-[2rem] max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-[rgba(0,0,0,0.06)] relative max-h-[90vh] flex flex-col my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 rounded-full border border-[rgba(0,0,0,0.08)] flex items-center justify-center text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6 pr-8 flex-shrink-0">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5]/20 to-[#D4B5E0]/20 flex items-center justify-center text-lg flex-shrink-0">
            📷
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#3D3040] truncate">
              {editingCamera ? 'แก้ไขข้อมูลรุ่นกล้อง' : 'เพิ่มรุ่นกล้องใหม่'}
            </h3>
            <p className="text-xs text-[#9E8E95] mt-0.5 truncate">
              {editingCamera ? 'อัปเดตข้อมูลกล้องและรูปถ่าย' : 'กรอกข้อมูลเพื่อเปิดให้เลือกใน LINE'}
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 sm:pr-2 pb-2 space-y-3 sm:space-y-4">
            {/* Camera Name */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                ชื่อรุ่นกล้อง *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น RICOH GR IIIx + Flash"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />
            </div>

            {/* Price Info */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                ราคา / เงื่อนไข *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ฿219 / 20 นาที หรือ ฿65 / 1 รูป"
                value={formData.priceInfo}
                onChange={e => setFormData({ ...formData, priceInfo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />
            </div>

            {/* Image URL + Preview */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                Image URL (รูปถ่ายกล้องสำหรับแสดงใน LINE Flex Message)
              </label>
              <input
                type="url"
                placeholder="https://pub-xxx.r2.dev/camera.jpg"
                value={formData.imageUrl}
                onChange={e => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setImageError(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-sm text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />

              {/* Image Preview */}
              {formData.imageUrl && (
                <div className="mt-3 p-3 rounded-2xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)]">
                  <span className="text-[10px] font-bold text-[#9E8E95] uppercase tracking-wider mb-2 block">
                    ตัวอย่างรูปที่จะแสดงใน LINE Flex Card:
                  </span>
                  {imageError ? (
                    <div className="w-full h-32 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center gap-1 text-rose-400 p-2 text-center">
                      <span className="text-xl">⚠️</span>
                      <span className="text-xs font-medium">ไม่สามารถโหลดรูปได้ — ตรวจสอบ URL</span>
                    </div>
                  ) : (
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      onError={() => setImageError(true)}
                      className="w-full h-36 object-cover rounded-xl border border-[rgba(0,0,0,0.08)] shadow-2xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Description / Bullet Points */}
            <div>
              <label className="block text-xs font-bold text-[#9E8E95] uppercase mb-1">
                รายละเอียดจุดเด่น (แยกบรรทัดด้วยขึ้นบรรทัดใหม่)
              </label>
              <textarea
                rows={3}
                placeholder="• ไม่จำกัดจำนวนรูป&#10;• สวยจบหลังกล้อง โทนภาพคมชัด&#10;• รับรูปภายในวันหลังงานจบ"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs text-[#3D3040] bg-[#FFFBFC] focus:outline-none focus:ring-2 focus:ring-[#F4A0B5]/40"
              />
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFFBFC] border border-[rgba(0,0,0,0.06)]">
              <div>
                <p className="text-xs font-bold text-[#3D3040]">สถานะเปิดรับคิว (Active Status)</p>
                <p className="text-[11px] text-[#9E8E95] font-light">เปิดให้ลูกค้าเลือกใน LINE Flex Message</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 accent-[#F4A0B5] cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(0,0,0,0.06)] flex-shrink-0 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[rgba(0,0,0,0.1)] text-xs font-medium text-[#9E8E95] hover:bg-neutral-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs font-semibold shadow-md cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
