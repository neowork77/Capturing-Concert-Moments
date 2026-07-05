'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo } from '@/data/photos';
import PhotoCard from './PhotoCard';
import ScrollReveal from './ScrollReveal';

const PHOTOS_PER_PAGE = 12;

interface GalleryProps {
  isAdmin?: boolean;
}

export default function Gallery({ isAdmin = false }: GalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const response = await fetch(`/api/photos/${photoToDelete.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Remove from photos state
        setPhotos((prevPhotos) => prevPhotos.filter((p) => p.id !== photoToDelete.id));
        setPhotoToDelete(null);
      } else {
        setDeleteError(data.error || 'ไม่สามารถลบรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/photos');
        const data = await response.json();
        if (data.success && Array.isArray(data.photos)) {
          setPhotos(data.photos);
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));

  // Reset page if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * PHOTOS_PER_PAGE;
    const end = start + PHOTOS_PER_PAGE;
    return photos.slice(start, end);
  }, [currentPage, photos]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <section id="gallery" className="relative py-12 sm:py-32 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto">
      {/* Section Header */}
      <ScrollReveal className="text-center mb-8 sm:mb-10">
        <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#F4A0B5] mb-4">
          ✦ Portfolio
        </span>
        <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-[#3D3040] mb-5">
          Latest Shots
        </h2>
        <p className="text-[#9E8E95] max-w-lg mx-auto text-sm sm:text-base font-light leading-relaxed">
          ตัวอย่างรูปภาพผลงานการถ่ายภาพด้วยกล้อง Ricoh GRIIIx ถ่ายทอดโทนภาพและบรรยากาศจริงจากหน้างาน
        </p>
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
                  onDelete={isAdmin ? setPhotoToDelete : undefined}
                />
              </div>
            ))}
          </div>

          {/* Desktop: Masonry Grid */}
          <div className="hidden sm:block masonry-grid min-h-[1000px] lg:min-h-[1200px]">
            {paginatedPhotos.map((photo, index) => (
              <PhotoCard
                key={`desktop-${photo.id}`}
                photo={photo}
                index={index}
                priority={index < 4}
                loading={index < 6 ? 'eager' : 'lazy'}
                sizes="(min-width: 1024px) 33vw, 50vw"
                onDelete={isAdmin ? setPhotoToDelete : undefined}
              />
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
      {isAdmin && photoToDelete && (
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