'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { packages } from './packages.data';

export function usePackages() {
  const [[activeIndex, direction], setSlide] = useState([0, 0]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const paginate = useCallback(
    (newDirection: number) => {
      setSlide(([prev]) => {
        const next = prev + newDirection;
        if (next < 0) return [packages.length - 1, newDirection];
        if (next >= packages.length) return [0, newDirection];
        return [next, newDirection];
      });
    },
    []
  );

  const goToSlide = useCallback((index: number) => {
    setSlide(([prev]) => [index, index > prev ? 1 : -1]);
  }, []);

  // Auto-play
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => paginate(1), 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, paginate]);

  const handleUserInteraction = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    // Resume after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const current = packages[activeIndex] || packages[0];

  return {
    activeIndex,
    direction,
    current,
    paginate,
    goToSlide,
    handleUserInteraction,
  };
}
