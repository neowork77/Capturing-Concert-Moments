'use client';

import { useCameraAdmin } from './useCameraAdmin';
import CameraForm from './CameraForm';

export default function CameraAdmin() {
  const {
    cameras,
    isLoading,
    errorMessage,
    isModalOpen,
    setIsModalOpen,
    editingCamera,
    formData,
    setFormData,
    isSaving,
    deletingId,
    openCreateModal,
    openEditModal,
    handleToggleStatus,
    handleSave,
    handleDelete,
  } = useCameraAdmin();

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 w-full">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-2">
            ✦ Camera Management
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#3D3040]">
            จัดการรุ่นกล้อง & FLEX MESSAGE
          </h2>
          <p className="text-xs sm:text-sm text-[#9E8E95] font-light mt-1">
            เพิ่มรุ่นกล้อง, กำหนดราคา, อัปเดตรูปถ่าย และเปิด/ปิดกล้องที่จะแสดงใน LINE Flex Message
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] hover:from-[#F4A0B5]/90 hover:to-[#D4B5E0]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.25)] transition-all cursor-pointer flex items-center gap-2 hover:shadow-md hover:scale-[1.02]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>เพิ่มรุ่นกล้องใหม่</span>
        </button>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin" />
          <p className="text-xs text-[#9E8E95]">กำลังโหลดรายการกล้องจาก Supabase...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-[#FFF0F3] border border-rose-200 rounded-2xl text-rose-500 text-sm text-center">
          {errorMessage}
        </div>
      ) : cameras.length === 0 ? (
        <div className="py-16 text-center bg-white/60 rounded-3xl border border-[rgba(0,0,0,0.04)]">
          <p className="text-sm text-[#9E8E95] mb-4">ยังไม่มีรุ่นกล้องในระบบ</p>
          <button
            onClick={openCreateModal}
            className="text-xs font-semibold text-[#F4A0B5] hover:underline cursor-pointer"
          >
            + เพิ่มรุ่นกล้องแรกของคุณ
          </button>
        </div>
      ) : (
        /* Camera Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className={`group relative bg-white/90 backdrop-blur-xl border rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                camera.isActive
                  ? 'border-[rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(244,160,181,0.18)] hover:border-[#F4A0B5]/40'
                  : 'border-neutral-200 opacity-60 bg-neutral-50/50'
              }`}
            >
              {/* Camera Image Hero */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-neutral-100 mb-4 border border-[rgba(0,0,0,0.06)] shadow-2xs group-hover:scale-[1.01] transition-transform duration-300">
                {camera.imageUrl ? (
                  <img
                    src={camera.imageUrl}
                    alt={camera.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FFFBFC] via-[#F9F5FA] to-[#F4A0B5]/20 flex flex-col items-center justify-center text-center p-2 text-[#F4A0B5]">
                    <span className="text-4xl mb-1">📷</span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[#9E8E95]">
                      NO CAMERA IMAGE
                    </span>
                  </div>
                )}
                {/* Active Status Badge Overlay */}
                <div className="absolute top-3 left-3">
                  <span
                    onClick={() => handleToggleStatus(camera)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs border cursor-pointer transition-all ${
                      camera.isActive
                        ? 'bg-emerald-500/90 text-white border-emerald-400 hover:bg-emerald-600'
                        : 'bg-neutral-600/90 text-white border-neutral-500 hover:bg-neutral-700'
                    }`}
                    title="คลิกเพื่อสลับสถานะเปิด/ปิด"
                  >
                    {camera.isActive ? '🟢 เปิดใช้งานใน LINE' : '⚫ ปิดใช้งาน'}
                  </span>
                </div>
              </div>

              {/* Details Section */}
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-[#3D3040] leading-snug">
                    {camera.name}
                  </h3>
                  <span className="text-sm font-bold text-[#F4A0B5] whitespace-nowrap bg-[#F4A0B5]/10 px-2.5 py-0.5 rounded-lg">
                    {camera.priceInfo}
                  </span>
                </div>

                {camera.description && (
                  <p className="text-xs text-[#9E8E95] font-light leading-relaxed whitespace-pre-line bg-[#FFFBFC] p-3 rounded-xl border border-[rgba(0,0,0,0.04)]">
                    {camera.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => openEditModal(camera)}
                  className="py-1.5 px-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-xs font-semibold text-[#3D3040] hover:bg-[#F9F5FA] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>✏️ แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(camera.id, camera.name)}
                  disabled={deletingId === camera.id}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer text-xs disabled:opacity-50"
                  title="ลบกล้องรุ่นนี้"
                >
                  {deletingId === camera.id ? '⏳' : '🗑️ ลบ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <CameraForm
          editingCamera={editingCamera}
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
