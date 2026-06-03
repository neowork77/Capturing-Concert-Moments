'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PhotoEntry {
  id: string;
  imgKey: string;
  artist: string;
  event: string;
  venue: string;
  date: string;
  deleted: boolean;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

// We need the image map for thumbnails — import statically
import img1 from '../../assets/optimized/gallery-1.webp';
import img2 from '../../assets/optimized/gallery-2.webp';
import img3 from '../../assets/optimized/gallery-3.webp';
import img4 from '../../assets/optimized/gallery-4.webp';
import img5 from '../../assets/optimized/gallery-5.webp';
import img6 from '../../assets/optimized/gallery-6.webp';
import img7 from '../../assets/optimized/gallery-7.webp';
import img8 from '../../assets/optimized/gallery-8.webp';
import img9 from '../../assets/optimized/gallery-9.webp';
import img10 from '../../assets/optimized/gallery-10.webp';
import img11 from '../../assets/optimized/gallery-11.webp';
import img12 from '../../assets/optimized/gallery-12.webp';
import img13 from '../../assets/optimized/gallery-13.webp';
import img14 from '../../assets/optimized/gallery-14.webp';
import img15 from '../../assets/optimized/gallery-15.webp';
import img16 from '../../assets/optimized/gallery-16.webp';
import img17 from '../../assets/optimized/gallery-17.webp';
import img18 from '../../assets/optimized/gallery-18.webp';
import img19 from '../../assets/optimized/gallery-19.webp';
import img20 from '../../assets/optimized/gallery-20.webp';
import img21 from '../../assets/optimized/gallery-21.webp';
import img22 from '../../assets/optimized/gallery-22.webp';
import img23 from '../../assets/optimized/gallery-23.webp';
import img24 from '../../assets/optimized/gallery-24.webp';
import img25 from '../../assets/optimized/gallery-25.webp';
import img26 from '../../assets/optimized/gallery-26.webp';
import img27 from '../../assets/optimized/gallery-27.webp';
import img29 from '../../assets/optimized/gallery-29.webp';
import img30 from '../../assets/optimized/gallery-30.webp';
import img31 from '../../assets/optimized/gallery-31.webp';
import img32 from '../../assets/optimized/gallery-32.webp';
import { StaticImageData } from 'next/image';

const imageMap: Record<string, StaticImageData> = {
  img1, img2, img3, img4, img5, img6, img7, img8, img9, img10,
  img11, img12, img13, img14, img15, img16, img17, img18, img19, img20,
  img21, img22, img23, img24, img25, img26, img27,
  img29, img30, img31, img32,
};

type FilterMode = 'all' | 'active' | 'deleted';

export default function AdminDashboard() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');

  // Fetch photos on mount
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/photos');
      const data = await res.json();
      setPhotos(data.photos);
      setOriginalPhotos(JSON.parse(JSON.stringify(data.photos)));
      setLoading(false);
    } catch {
      showToast('โหลดข้อมูลไม่สำเร็จ', 'error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Toast
  const showToast = (message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Update local field
  const updateField = (id: string, field: keyof PhotoEntry, value: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Check if a photo has unsaved changes
  const hasChanges = (photo: PhotoEntry): boolean => {
    const original = originalPhotos.find((p) => p.id === photo.id);
    if (!original) return false;
    return (
      photo.artist !== original.artist ||
      photo.event !== original.event ||
      photo.venue !== original.venue ||
      photo.date !== original.date
    );
  };

  // Save a single photo
  const savePhoto = async (photo: PhotoEntry) => {
    setSaving((prev) => ({ ...prev, [photo.id]: true }));
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: photo.id,
          artist: photo.artist,
          event: photo.event,
          venue: photo.venue,
          date: photo.date,
        }),
      });

      if (!res.ok) throw new Error('Save failed');

      // Update original to match saved state
      setOriginalPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...photo } : p))
      );
      showToast(`บันทึกรูปที่ ${photo.id} สำเร็จ ✓`, 'success');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setSaving((prev) => ({ ...prev, [photo.id]: false }));
    }
  };

  // Hide photo (soft-delete)
  const hidePhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/photos?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Hide failed');

      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted: true } : p))
      );
      setOriginalPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted: true } : p))
      );
      showToast(`ซ่อนรูปที่ ${id} แล้ว`, 'info');
    } catch {
      showToast('ซ่อนไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  };

  // Restore photo
  const restorePhoto = async (id: string) => {
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Restore failed');

      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted: false } : p))
      );
      setOriginalPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, deleted: false } : p))
      );
      showToast(`แสดงรูปที่ ${id} อีกครั้ง ✓`, 'success');
    } catch {
      showToast('กู้คืนไม่สำเร็จ กรุณาลองใหม่', 'error');
    }
  };

  // Filtered & searched photos
  const filteredPhotos = useMemo(() => {
    let result = photos;

    // Filter
    if (filter === 'active') result = result.filter((p) => !p.deleted);
    if (filter === 'deleted') result = result.filter((p) => p.deleted);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.artist.toLowerCase().includes(q) ||
          p.event.toLowerCase().includes(q) ||
          p.venue.toLowerCase().includes(q) ||
          p.id.includes(q)
      );
    }

    return result;
  }, [photos, filter, search]);

  // Stats
  const activeCount = photos.filter((p) => !p.deleted).length;
  const deletedCount = photos.filter((p) => p.deleted).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBFC] via-[#FFF5F7] to-[#FBF0F5] px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-[1400px] mx-auto mb-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center md:mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F4A0B5] bg-[#F4A0B5]/10 px-3 py-1.5 rounded-full tracking-wider mb-2">✦ Admin</div>
            <h1 className="font-[var(--font-outfit)] text-[1.75rem] md:text-3xl font-bold text-[#3D3040] tracking-tight">Photo Management</h1>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/60 border border-black/5 rounded-[1.25rem] overflow-hidden">
              <div className="w-full aspect-[4/3] bg-gradient-to-r from-[#FFF5F7] via-[#FDDDE6] to-[#FFF5F7] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
              <div className="p-5">
                <div className="h-3 rounded-md mb-3 bg-gradient-to-r from-[#FFF5F7] via-[#FDDDE6] to-[#FFF5F7] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] w-[60%]" style={{ animationDelay: '0.1s' }} />
                <div className="h-3 rounded-md mb-3 bg-gradient-to-r from-[#FFF5F7] via-[#FDDDE6] to-[#FFF5F7] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] w-[90%]" style={{ animationDelay: '0.2s' }} />
                <div className="h-3 rounded-md mb-3 bg-gradient-to-r from-[#FFF5F7] via-[#FDDDE6] to-[#FFF5F7] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] w-[40%]" style={{ animationDelay: '0.3s' }} />
                <div className="h-3 rounded-md mb-3 bg-gradient-to-r from-[#FFF5F7] via-[#FDDDE6] to-[#FFF5F7] bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] w-[50%]" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBFC] via-[#FFF5F7] to-[#FBF0F5] px-6 py-8 md:px-12 md:py-10">
      {/* Back Link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#9E8E95] no-underline transition-colors duration-200 mb-4 hover:text-[#F4A0B5]">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        กลับหน้าหลัก
      </Link>

      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center md:mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F4A0B5] bg-[#F4A0B5]/10 px-3 py-1.5 rounded-full tracking-wider mb-2">✦ Admin Panel</div>
          <h1 className="font-[var(--font-outfit)] text-[1.75rem] md:text-3xl font-bold text-[#3D3040] tracking-tight">จัดการรูปภาพ</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/80 border border-black/5 px-4 py-2 rounded-full text-[0.8rem] text-[#9E8E95] backdrop-blur-md">
            📸 ทั้งหมด <strong className="text-[#3D3040] font-semibold">{photos.length}</strong>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 border border-black/5 px-4 py-2 rounded-full text-[0.8rem] text-[#9E8E95] backdrop-blur-md">
            ✅ แสดงอยู่ <strong className="text-[#3D3040] font-semibold">{activeCount}</strong>
          </div>
          {deletedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-white/80 border border-black/5 px-4 py-2 rounded-full text-[0.8rem] text-[#9E8E95] backdrop-blur-md">
              🗑️ ซ่อนอยู่ <strong className="text-[#3D3040] font-semibold">{deletedCount}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-[1400px] mx-auto mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap m-0">
          <button
            className={`px-4 py-2 rounded-full text-xs font-medium border border-black/5 bg-white/70 text-[#9E8E95] cursor-pointer transition-all hover:border-[#F4A0B5]/30 hover:text-[#3D3040] ${filter === 'all' ? 'bg-[#F4A0B5] !text-white border-[#F4A0B5] shadow-[0_2px_12px_rgba(244,160,181,0.25)]' : ''}`}
            onClick={() => setFilter('all')}
          >
            ทั้งหมด ({photos.length})
          </button>
          <button
            className={`px-4 py-2 rounded-full text-xs font-medium border border-black/5 bg-white/70 text-[#9E8E95] cursor-pointer transition-all hover:border-[#F4A0B5]/30 hover:text-[#3D3040] ${filter === 'active' ? 'bg-[#F4A0B5] !text-white border-[#F4A0B5] shadow-[0_2px_12px_rgba(244,160,181,0.25)]' : ''}`}
            onClick={() => setFilter('active')}
          >
            แสดงอยู่ ({activeCount})
          </button>
          <button
            className={`px-4 py-2 rounded-full text-xs font-medium border border-black/5 bg-white/70 text-[#9E8E95] cursor-pointer transition-all hover:border-[#F4A0B5]/30 hover:text-[#3D3040] ${filter === 'deleted' ? 'bg-[#F4A0B5] !text-white border-[#F4A0B5] shadow-[0_2px_12px_rgba(244,160,181,0.25)]' : ''}`}
            onClick={() => setFilter('deleted')}
          >
            ซ่อนอยู่ ({deletedCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-[320px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C8BBC0] pointer-events-none" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="w-full py-2.5 pr-4 pl-10 border border-black/5 rounded-full text-[0.825rem] text-[#3D3040] bg-white/80 backdrop-blur-md transition-all font-[var(--font-inter)] focus:outline-none focus:border-[#F4A0B5] focus:ring-[3px] focus:ring-[#F4A0B5]/15 placeholder-[#D8CDD2]"
            placeholder="ค้นหา artist, event, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 px-8 text-[#C8BBC0]">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm leading-relaxed">ไม่พบรูปภาพที่ตรงกับการค้นหา</p>
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPhotos.map((photo) => {
            const img = imageMap[photo.imgKey];
            const changed = hasChanges(photo);
            const isSaving = saving[photo.id] || false;

            return (
              <div
                key={photo.id}
                className={`bg-white/85 border border-black/5 rounded-[1.25rem] overflow-hidden transition-all duration-300 backdrop-blur-md relative hover:border-[#F4A0B5]/30 hover:shadow-[0_8px_32px_rgba(244,160,181,0.1)] hover:-translate-y-0.5 ${photo.deleted ? 'opacity-50 grayscale hover:opacity-70 hover:grayscale-[0.5]' : ''}`}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#FFF5F7] group">
                  {(photo.imgKey?.startsWith('http://') || photo.imgKey?.startsWith('https://')) ? (
                    <Image
                      src={photo.imgKey}
                      alt={`Photo ${photo.id}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      quality={50}
                      priority={filteredPhotos.indexOf(photo) < 4}
                    />
                  ) : img ? (
                    <Image
                      src={img}
                      alt={`Photo ${photo.id}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      quality={50}
                      priority={filteredPhotos.indexOf(photo) < 4}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#333]">
                      <span className="text-[#888] text-[0.8rem]">No Image</span>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[0.7rem] font-semibold text-[#3D3040] border border-black/5">#{photo.id}</span>
                  {photo.deleted && (
                    <span className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[0.65rem] font-semibold text-white uppercase tracking-wider">ซ่อนอยู่</span>
                  )}
                </div>

                {/* Form */}
                <div className="p-4 pt-4 pb-5">
                  <div className="mb-3">
                    <label htmlFor={`artist-${photo.id}`} className="block text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#C8BBC0] mb-1">Artist</label>
                    <input
                      id={`artist-${photo.id}`}
                      type="text"
                      value={photo.artist}
                      onChange={(e) => updateField(photo.id, 'artist', e.target.value)}
                      className={`w-full px-3 py-2 border border-black/10 rounded-[0.625rem] text-[0.825rem] text-[#3D3040] bg-[#FFFBFC]/80 transition-all font-[var(--font-inter)] focus:outline-none focus:border-[#F4A0B5] focus:ring-[3px] focus:ring-[#F4A0B5]/15 focus:bg-white ${photo.artist !== originalPhotos.find(p => p.id === photo.id)?.artist ? 'border-[#F4A0B5] bg-[#F4A0B5]/5' : ''}`}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor={`event-${photo.id}`} className="block text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#C8BBC0] mb-1">Event</label>
                    <input
                      id={`event-${photo.id}`}
                      type="text"
                      value={photo.event}
                      onChange={(e) => updateField(photo.id, 'event', e.target.value)}
                      className={`w-full px-3 py-2 border border-black/10 rounded-[0.625rem] text-[0.825rem] text-[#3D3040] bg-[#FFFBFC]/80 transition-all font-[var(--font-inter)] focus:outline-none focus:border-[#F4A0B5] focus:ring-[3px] focus:ring-[#F4A0B5]/15 focus:bg-white ${photo.event !== originalPhotos.find(p => p.id === photo.id)?.event ? 'border-[#F4A0B5] bg-[#F4A0B5]/5' : ''}`}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor={`venue-${photo.id}`} className="block text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#C8BBC0] mb-1">Venue</label>
                    <input
                      id={`venue-${photo.id}`}
                      type="text"
                      value={photo.venue}
                      onChange={(e) => updateField(photo.id, 'venue', e.target.value)}
                      className={`w-full px-3 py-2 border border-black/10 rounded-[0.625rem] text-[0.825rem] text-[#3D3040] bg-[#FFFBFC]/80 transition-all font-[var(--font-inter)] focus:outline-none focus:border-[#F4A0B5] focus:ring-[3px] focus:ring-[#F4A0B5]/15 focus:bg-white ${photo.venue !== originalPhotos.find(p => p.id === photo.id)?.venue ? 'border-[#F4A0B5] bg-[#F4A0B5]/5' : ''}`}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor={`date-${photo.id}`} className="block text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#C8BBC0] mb-1">Date</label>
                    <input
                      id={`date-${photo.id}`}
                      type="date"
                      value={photo.date}
                      onChange={(e) => updateField(photo.id, 'date', e.target.value)}
                      className={`w-full px-3 py-2 border border-black/10 rounded-[0.625rem] text-[0.825rem] text-[#3D3040] bg-[#FFFBFC]/80 transition-all font-[var(--font-inter)] focus:outline-none focus:border-[#F4A0B5] focus:ring-[3px] focus:ring-[#F4A0B5]/15 focus:bg-white ${photo.date !== originalPhotos.find(p => p.id === photo.id)?.date ? 'border-[#F4A0B5] bg-[#F4A0B5]/5' : ''}`}
                    />
                  </div>

                  {/* Actions — Save + Hide/Show only */}
                  <div className="flex gap-2">
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.625rem] text-xs font-medium border cursor-pointer transition-all font-[var(--font-inter)] bg-[#F4A0B5] text-white border-[#F4A0B5] hover:bg-[#ef8da3] hover:shadow-[0_4px_16px_rgba(244,160,181,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      onClick={() => savePhoto(photo)}
                      disabled={!changed || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M12 2v4m0 12v4m-7.07-14.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round" />
                          </svg>
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          บันทึก
                        </>
                      )}
                    </button>

                    {photo.deleted ? (
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.625rem] text-xs font-medium border cursor-pointer transition-all font-[var(--font-inter)] bg-transparent text-green-500 border-green-500/20 hover:bg-green-500/5 hover:border-green-500/40"
                        onClick={() => restorePhoto(photo.id)}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        กู้คืน
                      </button>
                    ) : (
                      <button
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[0.625rem] text-xs font-medium border cursor-pointer transition-all font-[var(--font-inter)] bg-transparent text-red-500 border-red-500/20 hover:bg-red-500/5 hover:border-red-500/40"
                        onClick={() => hidePhoto(photo.id)}
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.11 6.11m3.768 3.768l4.242 4.242m0 0l3.768 3.768M6.11 6.11L3 3m3.11 3.11l4.242 4.242" />
                        </svg>
                        ซ่อน
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 py-4 px-6 rounded-2xl text-[0.85rem] font-medium text-white z-[1000] animate-[toastSlideIn_0.4s_cubic-bezier(0.16,1,0.3,1)] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${toast.type === 'success' ? 'bg-green-500/95' : toast.type === 'error' ? 'bg-red-500/95' : 'bg-[#F4A0B5]/95'}`}>
          {toast.message}
        </div>
      )}

      {/* Custom keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(1rem) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
