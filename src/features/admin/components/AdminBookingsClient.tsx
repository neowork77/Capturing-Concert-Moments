'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BookingAdmin from '@/features/admin/components/BookingAdmin';
import Footer from '@/shared/components/Footer';
import { DialogHost } from '@/features/admin/components/ui';
import { AdminDataProvider, AdminInitialData } from '@/features/admin/hooks/useAdminData';

export default function AdminBookingsClient({ initialData }: { initialData?: AdminInitialData }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    router.refresh();
  };

  return (
    <AdminDataProvider initialData={initialData}>
      <div className="admin-ui min-h-screen bg-[#FFFBFC] text-[#3D3040] flex flex-col justify-between">
        <div>
          <header className="relative pt-6 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 border-b border-[rgba(0,0,0,0.06)] pb-6 sm:pb-8">
              <div>
                <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-2 sm:mb-3">
                  ✦ Supabase Booking Details
                </span>
                <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#3D3040] mb-2 sm:mb-3">
                  Customer Bookings Panel
                </h1>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] font-light leading-relaxed max-w-xl">
                  รวมรายชื่อลูกค้าที่ทำการจองคิวถ่ายรูปผ่าน LINE และระบบ สามารถตรวจสอบชื่อ เบอร์โทร สลับสถานะคิว และกดคัดลอกข้อความตอบกลับได้ทันที
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link
                  href="/admin/schedules"
                  className="py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs sm:text-sm font-medium text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🗓️ ตารางคิวงาน
                </Link>
                <Link
                  href="/admin"
                  className="py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs sm:text-sm font-medium text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ‹ หน้า Admin หลัก
                </Link>
                <button
                  onClick={handleLogout}
                  className="py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl border border-rose-200 text-xs sm:text-sm font-medium text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </header>

          <main>
            <BookingAdmin />
          </main>
        </div>

        <Footer />
        <DialogHost />
      </div>
    </AdminDataProvider>
  );
}

