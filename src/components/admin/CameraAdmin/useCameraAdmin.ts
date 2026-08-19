'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllCamerasAction,
  createCameraAction,
  updateCameraAction,
  deleteCameraAction,
} from '@/app/actions/camera-actions';
import { CameraRecord } from '@/lib/camera-service';
import { CACHE_KEYS, getAdminCache, setAdminCache } from '@/lib/admin-cache';

export function useCameraAdmin() {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCamera, setEditingCamera] = useState<CameraRecord | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    priceInfo: '',
    imageUrl: '',
    description: '',
    isActive: true,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCameras = async (forceRefresh = false) => {
    const cached = getAdminCache<CameraRecord[]>(CACHE_KEYS.CAMERAS_ALL);
    if (cached && !forceRefresh) {
      setCameras(cached);
      setIsLoading(false);
      return;
    }

    if (!cached) setIsLoading(true);
    setErrorMessage(null);
    const res = await fetchAllCamerasAction();
    if (res.success && res.data) {
      setCameras(res.data);
      setAdminCache(CACHE_KEYS.CAMERAS_ALL, res.data);
    } else {
      setErrorMessage(res.message || 'ไม่สามารถโหลดข้อมูลกล้องได้');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCameras();
  }, []);

  const openCreateModal = () => {
    setEditingCamera(null);
    setFormData({
      name: '',
      priceInfo: '',
      imageUrl: '',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (camera: CameraRecord) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      priceInfo: camera.priceInfo,
      imageUrl: camera.imageUrl || '',
      description: camera.description || '',
      isActive: camera.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (camera: CameraRecord) => {
    const newActive = !camera.isActive;
    const res = await updateCameraAction(camera.id, { isActive: newActive });
    if (res.success) {
      setCameras(prev => {
        const next = prev.map(c => (c.id === camera.id ? { ...c, isActive: newActive } : c));
        setAdminCache(CACHE_KEYS.CAMERAS_ALL, next);
        return next;
      });
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (editingCamera) {
      const res = await updateCameraAction(editingCamera.id, formData);
      if (res.success) {
        setIsModalOpen(false);
        await loadCameras(true);
      } else {
        alert(res.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } else {
      const res = await createCameraAction(formData);
      if (res.success) {
        setIsModalOpen(false);
        await loadCameras(true);
      } else {
        alert(res.message || 'เกิดข้อผิดพลาดในการสร้างกล้อง');
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`คุณต้องการลบกล้องรุ่น "${name}" ใช่หรือไม่?`)) return;
    setDeletingId(id);
    const res = await deleteCameraAction(id);
    if (res.success) {
      await loadCameras(true);
    } else {
      alert(res.message || 'เกิดข้อผิดพลาดในการลบกล้อง');
    }
    setDeletingId(null);
  };

  return {
    cameras,
    isLoading,
    errorMessage,
    isModalOpen,
    setIsModalOpen,
    editingCamera,
    formData,
    setFormData,
    isSaving,
    deletingId,
    openCreateModal,
    openEditModal,
    handleToggleStatus,
    handleSave,
    handleDelete,
  };
}
