'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo } from '@/data/photos';

export const PHOTOS_PER_PAGE = 12;

export function useGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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

  return {
    photos,
    isLoading,
    currentPage,
    totalPages,
    paginatedPhotos,
    mobileScrollRef,
    goToPage,
  };
}
