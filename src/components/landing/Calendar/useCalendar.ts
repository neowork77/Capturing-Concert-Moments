'use client';

import { useState, useEffect } from 'react';
import { DaySchedule } from '@/data/schedule';
import { useThailandDate } from '@/hooks/useThailandDate';

export function useCalendar() {
  const { thYear, thMonth, thDay } = useThailandDate();

  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ day: number; data: DaySchedule } | null>(null);
  const [remoteScheduleData, setRemoteScheduleData] = useState<Record<string, DaySchedule>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (thYear !== undefined && thMonth !== undefined && thDay !== undefined) {
      setCurrentDate(new Date(thYear, thMonth, thDay));
    }
  }, [thYear, thMonth, thDay]);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/schedule', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRemoteScheduleData(data || {});
        }
      } catch (error) {
        console.error("Failed to fetch schedule data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedule();

    const onFocus = () => {
      fetchSchedule();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSchedule();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);


  const fallbackDate = new Date();
  const year = currentDate ? currentDate.getFullYear() : (thYear !== undefined ? thYear : fallbackDate.getFullYear());
  const month = currentDate ? currentDate.getMonth() : (thMonth !== undefined ? thMonth : fallbackDate.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = firstDayOfMonth;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prefixDays = Array.from({ length: startDay }, (_, i) => i);

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => {
    if (year === thYear && month === thMonth) return;
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const isCurrentMonth = year === thYear && month === thMonth;

  const handleDayClick = (day: number, data: DaySchedule) => {
    setSelectedDay({ day, data });
  };

  return {
    year,
    month,
    days,
    prefixDays,
    isCurrentMonth,
    selectedDay,
    setSelectedDay,
    remoteScheduleData,
    isLoading,
    thDay,
    thMonth,
    thYear,
    nextMonth,
    prevMonth,
    handleDayClick,
  };
}
