import { cookies } from 'next/headers';
import { verifyAdminSessionToken } from '@/features/admin/lib/admin-auth-server';
import { getAllBookings } from '@/shared/services/booking-service';
import { getActiveCameras } from '@/shared/services/camera-service';
import { getAllScheduleRecords } from '@/shared/services/schedule-service';
import AdminLoginClient from '@/features/admin/components/AdminLoginClient';
import AdminSchedulesClient from '@/features/admin/components/AdminSchedulesClient';

export const dynamic = 'force-dynamic';

export default async function AdminSchedulesPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  const isAuthenticated = verifyAdminSessionToken(sessionToken);

  if (!isAuthenticated) {
    return <AdminLoginClient />;
  }

  const [initialBookings, initialCameras, initialSchedules] = await Promise.all([
    getAllBookings(),
    getActiveCameras(),
    getAllScheduleRecords(),
  ]);

  return (
    <AdminSchedulesClient
      initialData={{
        bookings: initialBookings,
        cameras: initialCameras,
        schedules: initialSchedules,
      }}
    />
  );
}
