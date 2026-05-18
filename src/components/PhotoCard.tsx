'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Photo } from '@/data/photos';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
}

export default function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="masonry-item"
    >
      <div
        onClick={onClick}
        className="group relative rounded-2xl overflow-hidden cursor-pointer border border-[rgba(0,0,0,0.05)] hover:border-[#F4A0B5]/30 hover:shadow-[0_8px_30px_rgba(244,160,181,0.12)] transition-all duration-500 bg-white"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full h-auto object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            loading={index < 4 ? 'eager' : 'lazy'}
          />
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/5 via-40% to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* Info overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <div className="space-y-1">
              {/* เปลี่ยนเป็นสีดำ */}
              <p className="text-xs sm:text-sm text-black font-light">{photo.event}</p>
              <p className="text-xs text-black mt-1">{new Date(photo.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          {/* Expand icon */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            <div className="w-8 h-8 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
