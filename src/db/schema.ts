import { pgTable, serial, text, bigint, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // "2026-08-01"
  status: text('status').notNull().default('available'), // "available" | "full" | "unavailable"
  eventName: text('event_name'),
  location: text('location'),
  imageUrl: text('image_url'),
  slots: jsonb('slots').notNull().$type<{ time: string; status: 'available' | 'booked' }[]>(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  eventName: text('event_name').notNull(),
  timeSlot: text('time_slot').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  lineDisplayName: text('line_display_name'),
  lineUserId: text('line_user_id'),
  cameraType: text('camera_type'),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: text('payment_status').notNull().default('unpaid'), // 'unpaid' | 'deposit' | 'paid'
  depositAmount: integer('deposit_amount').default(0),
  remainingAmount: integer('remaining_amount').default(0),
  notes: text('notes'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const cameras = pgTable('cameras', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priceInfo: text('price_info').notNull(),
  imageUrl: text('image_url'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

/**
 * Temporary LINE user session storage (replaces in-memory Map for serverless compatibility)
 * Stores the user's selected event/date/camera between webhook calls
 */
export const lineSessions = pgTable('line_sessions', {
  lineUserId: text('line_user_id').primaryKey(),
  eventName: text('event_name'),
  date: text('date'),
  cameraType: text('camera_type'),
  step: text('step'),
  timeSlot: text('time_slot'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  paymentType: text('payment_type'),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  lineUserId: text('line_user_id').primaryKey(),
  step: text('step').notNull(),
  draftBooking: jsonb('draft_booking').notNull().$type<{
    bookingId?: number;
    date: string;
    eventName: string;
    timeSlot: string;
    customerName: string;
    customerPhone: string;
    lineDisplayName?: string;
    customerLineUserId?: string;
    cameraType?: string;
    notes?: string;
    paymentStatus?: 'unpaid' | 'deposit' | 'paid';
    depositAmount?: number;
    remainingAmount?: number;
  }>(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

