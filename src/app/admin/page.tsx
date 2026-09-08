import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/features/admin/lib/admin-auth-server';
import { getAllBookings } from '@/shared/services/booking-service';
import { getActiveCameras } from '@/shared/services/camera-service';
import { getAllScheduleRecords } from '@/shared/services/schedule-service';
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import AdminLoginClient from '@/features/admin/components/AdminLoginClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  const isAuthenticated = verifyAdminSessionToken(sessionToken);

  if (!isAuthenticated) {
    return <AdminLoginClient />;
  }

  // Fetch all initial data in parallel directly inside Node.js server runtime!
  // Utilizes in-memory caches to deliver instant server-rendered dashboard data.
  const startMs = Date.now();
  const [initialBookings, initialCameras, initialSchedules] = await Promise.all([
    getAllBookings(),
    getActiveCameras(),
    getAllScheduleRecords(),
  ]);
  console.log(`[AdminPage] parallel initial data fetched in ${Date.now() - startMs}ms`);

  return (
    <AdminDashboard
      initialData={{
        bookings: initialBookings,
        cameras: initialCameras,
        schedules: initialSchedules,
      }}
    />
  );
}
