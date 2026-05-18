'use client';

import { useEffect, useCallback, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Photo } from '@/data/photos';

interface LightboxProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
}

export default function Lightbox({
  photo,
  isOpen,
  onClose,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}: LightboxProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [photo?.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center lightbox-overlay"
          onClick={onClose}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-10 h-10 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 flex items-center justify-center hover:border-[#F4A0B5]/40 transition-[border-color] cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 px-3 py-1.5 rounded-full border border-[rgba(0,0,0,0.06)] bg-white/90 shadow-sm">
            <span className="text-xs text-[#9E8E95] font-medium tracking-wide">
              {currentIndex + 1} / {totalCount}
            </span>
          </div>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 flex items-center justify-center hover:border-[#F4A0B5]/40 transition-[border-color] cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/90 flex items-center justify-center hover:border-[#F4A0B5]/40 transition-[border-color] cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Image */}
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`relative max-w-[90vw] max-h-[85vh] sm:max-w-[80vw] ${isLoaded ? 'bg-white/50' : 'bg-transparent'} rounded-2xl flex items-center justify-center min-h-[50vh] transition-colors duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Loading indicator that shows behind the image */}
            <div className={`absolute inset-0 flex items-center justify-center -z-10 transition-opacity duration-300 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}>
              <svg className="w-8 h-8 text-[#F4A0B5] animate-spin opacity-50" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            {/* Wrapper for Image and Text to fade in together */}
            <div className={`relative transition-opacity duration-[400ms] ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="90vw"
                className="max-h-[85vh] w-auto h-auto object-contain rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] text-transparent"
                onLoad={() => setIsLoaded(true)}
                priority
                quality={85}
              />
              {/* Photo info */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 bg-gradient-to-t from-white/95 to-transparent rounded-b-2xl">
                <p className="text-sm text-black font-light">{photo.event}</p>
                <p className="text-xs text-black mt-1">{new Date(photo.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
