'use server';

import {
  getAllCameras,
  getActiveCameras,
  createCamera,
  updateCamera,
  deleteCamera,
  CameraRecord,
} from '@/lib/camera-service';

export async function fetchAllCamerasAction(): Promise<{
  success: boolean;
  data?: CameraRecord[];
  message?: string;
}> {
  try {
    const data = await getAllCameras();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลรายการกล้องได้' };
  }
}

export async function fetchActiveCamerasAction(): Promise<{
  success: boolean;
  data?: CameraRecord[];
  message?: string;
}> {
  try {
    const data = await getActiveCameras();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message || 'ไม่สามารถดึงข้อมูลกล้องได้' };
  }
}

export async function createCameraAction(data: {
  name: string;
  priceInfo: string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; data?: CameraRecord; message?: string }> {
  try {
    if (!data.name || !data.priceInfo) {
      return { success: false, message: 'กรุณากรอกชื่อกล้องและราคา/เงื่อนไขให้ครบถ้วน' };
    }
    const result = await createCamera(data);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึกกล้อง' };
  }
}

export async function updateCameraAction(
  id: number,
  data: {
    name?: string;
    priceInfo?: string;
    imageUrl?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; data?: CameraRecord; message?: string }> {
  try {
    const result = await updateCamera(id, data);
    if (!result) {
      return { success: false, message: 'ไม่พบรายการกล้องที่ต้องการอัปเดต' };
    }
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการแก้ไขกล้อง' };
  }
}

export async function deleteCameraAction(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    await deleteCamera(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || 'เกิดข้อผิดพลาดในการลบกล้อง' };
  }
}
