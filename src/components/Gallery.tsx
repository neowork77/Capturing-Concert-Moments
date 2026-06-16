'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { photos, Photo } from '@/data/photos';
import PhotoCard from './PhotoCard';
import ScrollReveal from './ScrollReveal';

const PHOTOS_PER_PAGE = 12;

export default function Gallery() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));

  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * PHOTOS_PER_PAGE;
    const end = start + PHOTOS_PER_PAGE;
    return photos.slice(start, end);
  }, [currentPage]);

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
          />
        ))}
      </div>

      {paginatedPhotos.length === 0 && (
        <div className="text-center py-24">
          <p className="text-[#C8BBC0] text-base">No photos to display.</p>
        </div>
      )}

    </section>
  );
}