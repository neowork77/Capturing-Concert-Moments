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

/**
 * Ensures default cameras exist in database if empty
 */
async function seedDefaultCamerasIfEmpty() {
  try {
    const existing = await db.select().from(cameras);
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
  } catch (error) {
    console.error('Failed to seed default cameras:', error);
  }
}

/**
 * Fetch all cameras (used by Admin UI)
 */
export async function getAllCameras(): Promise<CameraRecord[]> {
  await seedDefaultCamerasIfEmpty();
  const records = await db.select().from(cameras).orderBy(asc(cameras.id));
  return records as CameraRecord[];
}

/**
 * Fetch active cameras (used by LINE Webhook & Customer frontend)
 */
export async function getActiveCameras(): Promise<CameraRecord[]> {
  await seedDefaultCamerasIfEmpty();
  const records = await db
    .select()
    .from(cameras)
    .where(eq(cameras.isActive, true))
    .orderBy(asc(cameras.id));
  return records as CameraRecord[];
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
  await db.delete(cameras).where(eq(cameras.id, id));
  return true;
}
