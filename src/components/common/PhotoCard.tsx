'use client';

import Image from 'next/image';
import { Photo } from '@/data/photos';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  sizes?: string;
  onDelete?: (photo: Photo) => void;
  className?: string;
}

export default function PhotoCard({ photo, index, priority = false, loading, sizes, onDelete, className }: PhotoCardProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(photo);
    }
  };

  return (
    <div className={className ?? "masonry-item animate-fade-in-card"} style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="relative rounded-2xl overflow-hidden cursor-pointer border border-[rgba(0,0,0,0.05)] bg-white group">
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes={sizes ?? "(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"}
            className="w-full h-auto object-cover"
            priority={priority}
            loading={priority ? undefined : (loading ?? (index < 4 ? 'eager' : 'lazy'))}
            placeholder={photo.blurDataURL ? 'blur' : 'empty'}
            blurDataURL={photo.blurDataURL}
            quality={75}
          />

          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 text-rose-500 hover:text-rose-600 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all duration-200 cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
              title="ลบรูปภาพ"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
