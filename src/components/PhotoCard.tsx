'use client';

import Image from 'next/image';
import { Photo } from '@/data/photos';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  sizes?: string;
}

export default function PhotoCard({ photo, index, priority = false, loading, sizes }: PhotoCardProps) {
  return (
    <div className="masonry-item animate-fade-in-card" style={{ animationDelay: `${index * 0.04}s` }}>
      <div className="relative rounded-2xl overflow-hidden cursor-pointer border border-[rgba(0,0,0,0.05)] bg-white">
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

        </div>
      </div>
    </div>
  );
}