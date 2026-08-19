'use client';

import Link from 'next/link';
import PhotoCard from '@/components/common/PhotoCard';
import ScrollReveal from '@/components/common/ScrollReveal';
import { motion, AnimatePresence } from 'framer-motion';
import { useGalleryAdmin } from './useGalleryAdmin';

export default function GalleryAdmin() {
  const {
    photos,
    isLoading,
    currentPage,
    totalPages,
    paginatedPhotos,
    mobileScrollRef,
    photoToDelete,
    setPhotoToDelete,
    isDeleting,
    deleteError,
    setDeleteError,
    draggedIndex,
    dragOverIndex,
    saveStatus,
    goToPage,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleConfirmDelete,
  } = useGalleryAdmin();

  return (
    <section id="gallery" className="relative py-12 sm:py-32 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto">
      {/* Section Header */}
      <ScrollReveal className="text-center mb-8 sm:mb-10 relative">
        <div className="absolute top-0 right-0 left-0 flex justify-center -mt-8">
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' && (
              <motion.div
                key="saving"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[rgba(0,0,0,0.05)] shadow-sm rounded-full text-xs font-medium text-[#9E8E95]"
              >
                <div className="w-3.5 h-3.5 border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] rounded-full animate-spin" />
                <span>กำลังบันทึกลำดับรูปภาพ...</span>
              </motion.div>
            )}
            {saveStatus === 'saved' && (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#C5E8D8]/20 border border-[rgba(78,184,134,0.15)] shadow-sm rounded-full text-xs font-semibold text-[#348861]"
              >
                <span>✓ บันทึกลำดับสำเร็จ!</span>
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#FFF0F3] border border-[rgba(244,160,181,0.2)] shadow-sm rounded-full text-xs font-semibold text-[#F4A0B5]"
              >
                <span>⚠ เกิดข้อผิดพลาดในการบันทึก</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#F4A0B5] mb-4">
          ✦ Portfolio Management
        </span>
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-[#3D3040] mb-5">
          Gallery Shots
        </h2>
        <p className="text-xs text-[#F4A0B5] font-semibold mb-4 animate-pulse">
          💡 คุณสามารถคลิกค้างที่รูปภาพเพื่อลากจัดเรียงลำดับรูปภาพได้ทันที
        </p>
        <p className="text-[#9E8E95] max-w-lg mx-auto text-sm sm:text-base font-light leading-relaxed mb-6">
          ตัวอย่างรูปภาพผลงานการถ่ายภาพด้วยกล้อง Ricoh GRIIIx ถ่ายทอดโทนภาพและบรรยากาศจริงจากหน้างาน
        </p>

        {/* Upload Button */}
        <div className="flex justify-center mt-6">
          <Link
            href="/upload"
            className="py-3 px-6 rounded-2xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-xs sm:text-sm font-semibold shadow-[0_4px_16px_rgba(244,160,181,0.2)] hover:shadow-[0_6px_20px_rgba(244,160,181,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>อัปโหลดรูปภาพใหม่</span>
          </Link>
        </div>
      </ScrollReveal>

      {/* Pagination (Moved to Top) */}
      {totalPages > 1 && (
        <div className="mb-10 sm:mb-14">
          <ScrollReveal delay={0.1} className="flex items-center justify-center gap-2 sm:gap-3">
            {/* Previous Button */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm transition-all duration-300 cursor-pointer ${
                currentPage === 1
                  ? 'text-[#D8CDD2] border border-[rgba(0,0,0,0.04)] cursor-not-allowed'
                  : 'text-[#9E8E95] hover:text-[#3D3040] border border-[rgba(0,0,0,0.06)] hover:border-[#F4A0B5]/30 hover:bg-[#FFF5F7]'
              }`}
              aria-label="Previous page"
            >
              ‹
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#F4A0B5] text-white shadow-[0_2px_12px_rgba(244,160,181,0.25)]'
                    : 'text-[#9E8E95] hover:text-[#3D3040] border border-[rgba(0,0,0,0.06)] hover:border-[#F4A0B5]/30 hover:bg-[#FFF5F7]'
                }`}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm transition-all duration-300 cursor-pointer ${
                currentPage === totalPages
                  ? 'text-[#D8CDD2] border border-[rgba(0,0,0,0.04)] cursor-not-allowed'
                  : 'text-[#9E8E95] hover:text-[#3D3040] border border-[rgba(0,0,0,0.06)] hover:border-[#F4A0B5]/30 hover:bg-[#FFF5F7]'
              }`}
              aria-label="Next page"
            >
              ›
            </button>
          </ScrollReveal>

          {/* Page Info */}
          <p className="text-center text-[#C8BBC0] text-xs mt-4 tracking-wide">
            Page {currentPage} of {totalPages} · {photos.length} photos
          </p>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin"></div>
          <p className="text-[#9E8E95] text-sm font-light">กำลังโหลดรูปภาพ...</p>
        </div>
      ) : (
        <>
          {/* Mobile: Horizontal Swipe */}
          <div 
            ref={mobileScrollRef}
            className="flex sm:hidden overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-6 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {paginatedPhotos.map((photo, index) => (
              <div key={`mobile-${photo.id}`} className="w-[85vw] shrink-0 snap-center">
                <PhotoCard
                  photo={photo}
                  index={index}
                  priority={index < 2}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  sizes="85vw"
                  onDelete={setPhotoToDelete}
                />
              </div>
            ))}
          </div>

          {/* Admin Layout: Stable CSS Grid with Drag and Drop Reordering */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[600px] items-start">
            {paginatedPhotos.map((photo, index) => (
              <div
                key={`desktop-${photo.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`transition-all duration-300 relative border-2 border-transparent select-none cursor-grab active:cursor-grabbing ${
                  draggedIndex === index ? 'opacity-30 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'border-[#F4A0B5] rounded-3xl scale-105 bg-[#FFF5F7]/30 shadow-md' : ''
                }`}
              >
                {/* Grip drag handle icon overlay */}
                <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 text-[#9E8E95] shadow-md flex items-center justify-center hover:text-[#3D3040] transition-colors pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6h16.5" />
                  </svg>
                </div>
                <PhotoCard
                  photo={photo}
                  index={index}
                  priority={index < 4}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  onDelete={setPhotoToDelete}
                  className="w-full animate-fade-in-card"
                />
              </div>
            ))}
          </div>

          {paginatedPhotos.length === 0 && (
            <div className="text-center py-24">
              <p className="text-[#C8BBC0] text-base">No photos to display.</p>
            </div>
          )}
        </>
      )}

      {/* Custom Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-[rgba(0,0,0,0.05)] shadow-2xl transition-all duration-300 scale-100 text-[#3D3040] relative overflow-hidden">
            {/* Upper alert icon background */}
            <div className="w-12 h-12 rounded-full bg-[#FFF0F3] text-rose-500 flex items-center justify-center mb-4 mx-auto border border-[rgba(244,160,181,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <h3 className="font-display text-lg font-bold text-center mb-2">ยืนยันการลบรูปภาพ</h3>
            <p className="text-xs sm:text-sm text-[#9E8E95] text-center font-light leading-relaxed mb-5">
              คุณแน่ใจหรือไม่ที่จะลบรูปภาพนี้ออกจากระบบ? การลบไฟล์บน R2 และฐานข้อมูลจะไม่สามารถย้อนคืนได้
            </p>

            {/* Error Message inside Modal */}
            {deleteError && (
              <div className="mb-4 p-3 bg-[#FFF0F3] border border-[rgba(244,160,181,0.2)] rounded-xl text-[#F4A0B5] text-xs text-center font-medium">
                {deleteError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhotoToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs sm:text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ยืนยันลบ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
