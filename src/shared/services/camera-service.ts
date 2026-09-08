import { db } from '@/db/db';
import { cameras } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export interface CameraRecord {
  id: number;
  name: string;
  priceInfo: string;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: number;
}

const DEFAULT_CAMERAS = [
  {
    name: 'RICOH GR IIIx + Flash',
    priceInfo: '฿219 / 20 นาที',
    imageUrl: '/assets/Ricohgr3x.webp',
    description: '• ไม่จำกัดจำนวนรูป\n• สวยจบหลังกล้อง โทนภาพคมชัด\n• รับรูปภายในวันหลังงานจบ',
    isActive: true,
  },
  {
    name: 'Fujifilm instax mini 11',
    priceInfo: '฿65 / 1 รูป',
    imageUrl: '/assets/fujiinstax11.webp',
    description: '• กล้องโพลารอยด์ ได้รูปจริงทันที\n• โทนภาพฟิล์ม คลาสสิก มีเอกลักษณ์\n• เหมาะรับรูปเป็นของที่ระลึกกลับบ้าน',
    isActive: true,
  },
];

// In-memory cache for camera records to eliminate redundant network roundtrips
let cachedActiveCameras: { data: CameraRecord[]; expiresAt: number } | null = null;
let cachedAllCameras: { data: CameraRecord[]; expiresAt: number } | null = null;
let isSeedChecked = false;
const CAMERA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateCameraCache() {
  cachedActiveCameras = null;
  cachedAllCameras = null;
}

/**
 * Ensures default cameras exist in database if empty (executed at most once per process)
 */
async function seedDefaultCamerasIfEmpty() {
  if (isSeedChecked) return;
  try {
    const existing = await db.select({ id: cameras.id }).from(cameras).limit(1);
    if (existing.length === 0) {
      const nowUnix = Math.floor(Date.now() / 1000);
      for (const cam of DEFAULT_CAMERAS) {
        await db.insert(cameras).values({
          name: cam.name,
          priceInfo: cam.priceInfo,
          imageUrl: cam.imageUrl,
          description: cam.description,
          isActive: cam.isActive,
          createdAt: nowUnix,
        });
      }
    }
    isSeedChecked = true;
  } catch (error) {
    console.error('Failed to seed default cameras:', error);
  }
}

/**
 * Fetch all cameras (used by Admin UI)
 */
export async function getAllCameras(): Promise<CameraRecord[]> {
  const now = Date.now();
  if (cachedAllCameras && now < cachedAllCameras.expiresAt) {
    return cachedAllCameras.data;
  }

  await seedDefaultCamerasIfEmpty();
  const records = await db.select().from(cameras).orderBy(asc(cameras.id));
  const result = records as CameraRecord[];
  cachedAllCameras = { data: result, expiresAt: now + CAMERA_CACHE_TTL_MS };
  return result;
}

/**
 * Fetch active cameras (used by LINE Webhook, Admin UI & Customer frontend)
 */
export async function getActiveCameras(): Promise<CameraRecord[]> {
  const now = Date.now();
  if (cachedActiveCameras && now < cachedActiveCameras.expiresAt) {
    return cachedActiveCameras.data;
  }

  await seedDefaultCamerasIfEmpty();
  const records = await db
    .select()
    .from(cameras)
    .where(eq(cameras.isActive, true))
    .orderBy(asc(cameras.id));
  const result = records as CameraRecord[];
  cachedActiveCameras = { data: result, expiresAt: now + CAMERA_CACHE_TTL_MS };
  return result;
}

/**
 * Create a new camera
 */
export async function createCamera(data: {
  name: string;
  priceInfo: string;
  imageUrl?: string;
  description?: string;
  isActive?: boolean;
}): Promise<CameraRecord> {
  invalidateCameraCache();
  const nowUnix = Math.floor(Date.now() / 1000);
  const [inserted] = await db
    .insert(cameras)
    .values({
      name: data.name.trim(),
      priceInfo: data.priceInfo.trim(),
      imageUrl: data.imageUrl?.trim() || null,
      description: data.description?.trim() || null,
      isActive: data.isActive ?? true,
      createdAt: nowUnix,
    })
    .returning();

  return inserted as CameraRecord;
}

/**
 * Update an existing camera
 */
export async function updateCamera(
  id: number,
  data: {
    name?: string;
    priceInfo?: string;
    imageUrl?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<CameraRecord | null> {
  invalidateCameraCache();
  const [updated] = await db
    .update(cameras)
    .set({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.priceInfo !== undefined && { priceInfo: data.priceInfo.trim() }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl.trim() || null }),
      ...(data.description !== undefined && { description: data.description.trim() || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    })
    .where(eq(cameras.id, id))
    .returning();

  return (updated as CameraRecord) || null;
}

/**
 * Delete a camera
 */
export async function deleteCamera(id: number): Promise<boolean> {
  invalidateCameraCache();
  await db.delete(cameras).where(eq(cameras.id, id));
  return true;
}
