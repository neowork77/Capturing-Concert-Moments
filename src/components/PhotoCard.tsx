'use client';

import Image from 'next/image';
import { Photo } from '@/data/photos';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  sizes?: string;
}

export default function PhotoCard({ photo, index, onClick, priority = false, loading, sizes }: PhotoCardProps) {
  return (
    <div className="masonry-item animate-fade-in-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div
        onClick={onClick}
        className="group relative rounded-2xl overflow-hidden cursor-pointer border border-[rgba(0,0,0,0.05)] hover:border-[#F4A0B5]/30 hover:shadow-[0_8px_30px_rgba(244,160,181,0.12)] transition-[border-color,box-shadow] duration-500 bg-white"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes={sizes ?? "(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"}
            className="w-full h-auto object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out will-change-transform"
            priority={priority}
            loading={priority ? undefined : (loading ?? (index < 4 ? 'eager' : 'lazy'))}
            placeholder={photo.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={photo.blurDataURL}
            quality={75}
          />
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/5 via-40% to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {/* Info overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-500 translate-y-2 group-hover:translate-y-0">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-black font-light">{photo.event}</p>
              <p className="text-xs text-black mt-1">{new Date(photo.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          {/* Expand icon */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 translate-y-1 group-hover:translate-y-0">
            <div className="w-8 h-8 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/80 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}