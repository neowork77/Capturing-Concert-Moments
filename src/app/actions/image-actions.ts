'use server';

import { db } from '@/db/db';
import { images } from '@/db/schema';
import { uploadToR2 } from '@/lib/r2-service';

export interface UploadImageResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    url: string;
    createdAt: number;
  };
}

/**
 * Server Action to upload an image file to Cloudflare R2 and save its URL to Supabase PostgreSQL.
 * 
 * @param formData - The FormData containing the file input named 'file'.
 */
export async function uploadImageAction(formData: FormData): Promise<UploadImageResponse> {
  try {
    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      return { success: false, message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' };
    }

    // Validate that the file is indeed an image
    if (!file.type.startsWith('image/')) {
      return { success: false, message: 'ไฟล์ที่อัปโหลดต้องเป็นไฟล์รูปภาพเท่านั้น' };
    }

    // 1. Upload to Cloudflare R2
    const publicUrl = await uploadToR2(file, file.name, file.type);

    // 2. Calculate current Unix timestamp in seconds
    const unixSeconds = Math.floor(Date.now() / 1000);

    // 3. Save to database using Drizzle ORM
    const [insertedRecord] = await db
      .insert(images)
      .values({
        url: publicUrl,
        createdAt: unixSeconds,
      })
      .returning();

    if (!insertedRecord) {
      throw new Error('ไม่สามารถบันทึกข้อมูลรูปภาพลงฐานข้อมูลได้');
    }

    return {
      success: true,
      message: 'อัปโหลดรูปภาพและบันทึกข้อมูลเรียบร้อยแล้ว',
      data: {
        id: insertedRecord.id,
        url: insertedRecord.url,
        createdAt: insertedRecord.createdAt,
      },
    };
  } catch (error: any) {
    console.error('Error during uploadImageAction:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
    };
  }
}
