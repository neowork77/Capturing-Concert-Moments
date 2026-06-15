'use client';

import { useState, useEffect, useCallback } from 'react';

export const getThailandDateDetails = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(new Date());

  const thYear = parseInt(parts.find(p => p.type === 'year')?.value || '2026', 10);
  const thMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10) - 1;
  const thDay = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);

  return { thYear, thMonth, thDay };
};

export const useThailandDate = () => {
  const [dateDetails, setDateDetails] = useState(getThailandDateDetails);

  const updateDate = useCallback(() => {
    setDateDetails(prev => {
      const current = getThailandDateDetails();
      if (
        prev.thYear !== current.thYear ||
        prev.thMonth !== current.thMonth ||
        prev.thDay !== current.thDay
      ) {
        return current;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    // 1. ตรวจจับการสลับแท็บหรือกลับมาที่แอป (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDate();
      }
    };

    // 2. ตรวจจับเมื่อหน้าต่างกลับมาโฟกัส (Window Focus)
    const handleFocus = () => {
      updateDate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. อัปเดตอัตโนมัติทุกๆ 1 นาที (เผื่อเปิดค้างไว้ข้ามคืนโดยไม่ได้สลับหน้า)
    const intervalId = setInterval(updateDate, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [updateDate]);

  return dateDetails;
};
