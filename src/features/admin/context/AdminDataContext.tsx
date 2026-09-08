'use client';

import React, { createContext, useContext } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { fetchBookingsAction } from '@/features/admin/actions/booking-actions';
import { fetchActiveCamerasAction } from '@/features/admin/actions/camera-actions';
import { fetchSchedulesAction } from '@/features/admin/actions/schedule-actions';
import { BookingRecord } from '@/shared/services/booking-service';
import { CameraRecord } from '@/shared/services/camera-service';
import { ScheduleRecord } from '@/shared/services/schedule-service';

export interface AdminInitialData {
  bookings?: BookingRecord[];
  cameras?: CameraRecord[];
  schedules?: ScheduleRecord[];
}

export const ADMIN_CACHE_KEYS = {
  BOOKINGS: 'admin/bookings',
  CAMERAS: 'admin/cameras',
  SCHEDULES: 'admin/schedules',
} as const;

interface AdminDataContextValue {
  bookings: BookingRecord[];
  cameras: CameraRecord[];
  schedules: ScheduleRecord[];
  isLoading: boolean;
  isRefreshing: boolean;
  bookingsError?: any;
  camerasError?: any;
  schedulesError?: any;
  mutateBookings: KeyedMutator<BookingRecord[]>;
  mutateCameras: KeyedMutator<CameraRecord[]>;
  mutateSchedules: KeyedMutator<ScheduleRecord[]>;
  refreshAll: () => Promise<any>;
}

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({
  initialData,
  children,
}: {
  initialData?: AdminInitialData;
  children: React.ReactNode;
}) {
  // SWR for Bookings with automatic deduplication & server fallback
  const {
    data: bookings = initialData?.bookings || [],
    error: bookingsError,
    isLoading: isLoadingBookings,
    isValidating: isValidatingBookings,
    mutate: mutateBookings,
  } = useSWR<BookingRecord[]>(
    ADMIN_CACHE_KEYS.BOOKINGS,
    async () => {
      const res = await fetchBookingsAction();
      if (res.success && res.data) return res.data;
      throw new Error(res.message || 'Failed to fetch bookings');
    },
    {
      fallbackData: initialData?.bookings,
      revalidateOnFocus: false,
      revalidateIfStale: !initialData?.bookings,
      dedupingInterval: 30000,
    }
  );

  // SWR for Cameras
  const {
    data: cameras = initialData?.cameras || [],
    error: camerasError,
    isLoading: isLoadingCameras,
    isValidating: isValidatingCameras,
    mutate: mutateCameras,
  } = useSWR<CameraRecord[]>(
    ADMIN_CACHE_KEYS.CAMERAS,
    async () => {
      const res = await fetchActiveCamerasAction();
      if (res.success && res.data) return res.data;
      throw new Error(res.message || 'Failed to fetch cameras');
    },
    {
      fallbackData: initialData?.cameras,
      revalidateOnFocus: false,
      revalidateIfStale: !initialData?.cameras,
      dedupingInterval: 60000,
    }
  );

  // SWR for Schedules
  const {
    data: schedules = initialData?.schedules || [],
    error: schedulesError,
    isLoading: isLoadingSchedules,
    isValidating: isValidatingSchedules,
    mutate: mutateSchedules,
  } = useSWR<ScheduleRecord[]>(
    ADMIN_CACHE_KEYS.SCHEDULES,
    async () => {
      const res = await fetchSchedulesAction();
      if (res.success && res.data) return res.data;
      throw new Error(res.message || 'Failed to fetch schedules');
    },
    {
      fallbackData: initialData?.schedules,
      revalidateOnFocus: false,
      revalidateIfStale: !initialData?.schedules,
      dedupingInterval: 30000,
    }
  );

  const refreshAll = async () => {
    return Promise.all([
      mutateBookings(),
      mutateCameras(),
      mutateSchedules(),
    ]);
  };

  const value: AdminDataContextValue = {
    bookings,
    cameras,
    schedules,
    isLoading: (!initialData && (isLoadingBookings || isLoadingCameras || isLoadingSchedules)),
    isRefreshing: isValidatingBookings || isValidatingCameras || isValidatingSchedules,
    bookingsError,
    camerasError,
    schedulesError,
    mutateBookings,
    mutateCameras,
    mutateSchedules,
    refreshAll,
  };

  return (
    <AdminDataContext.Provider value={value}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData(): AdminDataContextValue {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}

