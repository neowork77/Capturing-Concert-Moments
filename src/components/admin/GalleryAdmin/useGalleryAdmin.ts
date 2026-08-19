'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Photo } from '@/data/photos';
import { PHOTOS_PER_PAGE } from '@/components/landing/Gallery/useGallery';
import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

export function useGalleryAdmin() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Drag and drop sorting state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const fetchPhotos = async (forceRefresh = false) => {
    const cached = getAdminCache<Photo[]>(CACHE_KEYS.PHOTOS);
    if (cached && !forceRefresh) {
      setPhotos(cached);
      setIsLoading(false);
      return;
    }

    try {
      if (!cached) setIsLoading(true);
      const response = await fetch('/api/photos');
      const data = await response.json();
      if (data.success && Array.isArray(data.photos)) {
        setPhotos(data.photos);
        setAdminCache(CACHE_KEYS.PHOTOS, data.photos);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PAGE));

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const absoluteDragIndex = (currentPage - 1) * PHOTOS_PER_PAGE + draggedIndex;
    const absoluteTargetIndex = (currentPage - 1) * PHOTOS_PER_PAGE + targetIndex;

    const reorderedPhotos = [...photos];
    const [draggedItem] = reorderedPhotos.splice(absoluteDragIndex, 1);
    reorderedPhotos.splice(absoluteTargetIndex, 0, draggedItem);

    setPhotos(reorderedPhotos);
    setAdminCache(CACHE_KEYS.PHOTOS, reorderedPhotos);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      setSaveStatus('saving');
      const response = await fetch('/api/photos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reorderedPhotos.map((p) => p.id) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 4000);
      }
    } catch (error) {
      console.error('Failed to save photo order:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

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
        setPhotos((prevPhotos) => {
          const next = prevPhotos.filter((p) => p.id !== photoToDelete.id);
          setAdminCache(CACHE_KEYS.PHOTOS, next);
          return next;
        });
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

  return {
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
  };
}
