'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

import img1 from '../assets/Ricohgr3x.webp';
import img2 from '../assets/fujiinstax11.webp';

interface PackageItem {
  title: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  image: { src: string; width: number; height: number; blurDataURL?: string };
  imageClassName?: string;
  accent: string;
  accentBg: string;
}

const packages: PackageItem[] = [
  {
    title: 'กล้อง RICOH GR IIIx + Flash',
    description:
      'เหมาะสำหรับการถ่ายภาพหน้าคอนเสิร์ตหรืออีเวนต์ขนาดเล็ก เน้นเก็บโมเมนต์สดๆ แบบเป็นธรรมชาติ ด้วยกล้อง Ricoh GRIIIx ที่ให้โทนภาพสวย คม ชัด และมีเอกลักษณ์เฉพาะตัว เหมาะสำหรับคนที่ต้องการภาพที่ดูดีแบบไม่ต้องแต่งเพิ่ม',
    price: '฿199',
    priceNote: '20 นาที',
    features: ['ไม่จำกัดจำนวนรูป', 'สวยจบหลังกล้อง', 'พร้อมรับรูปภายในวันหลังคอนเสิร์ตจบ', 'เหมาะสำหรับเก็บโมเมนต์หน้าคอนเสิร์ต'],
    image: img1,
    imageClassName: 'object-contain scale-[0.95]',
    accent: '#F4A0B5',
    accentBg: '#FFF5F7',
  },
  {
    title: 'Fujifilm instax mini 11 Instant Film กล้องโพลารอยด์',
    description:
      'ถ่ายด้วยกล้องโพลารอยด์ Fujifilm instax mini 11 ได้รูปจริงทันทีหลังถ่าย ให้ฟีลภาพฟิล์มคลาสสิก สีสวย มีเอกลักษณ์เฉพาะตัว',
    price: '฿59',
    priceNote: '1 รูป',
    features: ['ถ่ายภาพด้วยกล้องโพลารอยด์ ได้รูปจริงทันทีหลังถ่าย รอเพียงไม่กี่นาที', 'โทนภาพฟิล์ม ให้ฟีลคลาสสิก สีสวย มีเอกลักษณ์เฉพาะตัว', 'เหมาะสำหรับถ่ายเดี่ยว คู่ หรือกลุ่มเล็ก', 'สามารถรับรูปกลับได้ทันทีหลังถ่าย เป็นของที่ระลึกจากงานนั้นๆ'],
    image: img2,
    accent: '#D8CCE8',
    accentBg: '#F8F5FC',
  }
];

const getSlideDistance = () =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? 250 : 600;

const getImageDistance = () =>
  typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 400;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? getSlideDistance() : -getSlideDistance(),
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -getSlideDistance() : getSlideDistance(),
    opacity: 0,
    scale: 0.95,
  }),
};

const imageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? getImageDistance() : -getImageDistance(),
    opacity: 0,
    scale: 1.1,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -getImageDistance() : getImageDistance(),
    opacity: 0,
    scale: 0.95,
  }),
};

export default function About() {
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

  return (
    <section
      id="Packages"
      className="relative py-10 sm:py-20 md:py-28 px-3 sm:px-6 md:px-8 lg:px-12 max-w-7xl mx-auto overflow-hidden"
    >
      {/* Section Header */}
      <ScrollReveal>
        <div className="text-center mb-14 sm:mb-20">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#F4A0B5] mb-4">
            ✦ Packages &amp; Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#3D3040] leading-tight">
            Choose Your{' '}
            <span className="font-light bg-gradient-to-r from-[#F4A0B5] to-[#D8CCE8] bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>
          <p className="mt-4 text-[#9E8E95] text-sm sm:text-base max-w-lg mx-auto font-light">
            เลือกแพ็กเกจที่เหมาะกับสไตล์และความต้องการของคุณ เพื่อให้ได้ภาพถ่ายที่ตรงใจมากที่สุด
          </p>
        </div>
      </ScrollReveal>

      {/* Carousel Container */}
      <ScrollReveal delay={0.15}>
        <div className="relative">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-[rgba(0,0,0,0.06)] shadow-[0_8px_60px_rgba(244,160,181,0.08)] min-h-0 lg:min-h-[550px] flex">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                }}
                className="flex flex-col lg:grid lg:grid-cols-2 w-full flex-1 min-h-0"
              >
                {/* Left — Details & Pricing */}
                <div className="flex flex-col justify-center flex-1 p-4 sm:p-8 md:p-10 xl:p-14 order-2 lg:order-1">

                  {/* Title */}
                  <h3 className="font-display text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#3D3040] mb-2 sm:mb-3 leading-snug">
                    {current.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#9E8E95] text-xs sm:text-sm md:text-base leading-relaxed font-light mb-4 sm:mb-6 line-clamp-4 sm:line-clamp-none">
                    {current.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-4 sm:mb-6 md:mb-8">
                    <span
                      className="text-2xl sm:text-3xl md:text-5xl font-display font-bold"
                      style={{ color: current.accent }}
                    >
                      {current.price}
                    </span>
                    <span className="text-[#C8BBC0] text-sm font-light">/ {current.priceNote}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                    {current.features.map((feat, i) => (
                      <motion.li
                        key={feat}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#3D3040]"
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: current.accentBg }}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke={current.accent}
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="font-light">{feat}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {/* CTA Button (Desktop Only) */}
                  <div className="hidden lg:flex mt-6 xl:mt-auto pt-2 xl:pt-4">
                    <motion.a
                      href="#contact"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium text-white transition-all duration-300 shadow-lg w-fit"
                      style={{
                        background: `linear-gradient(135deg, ${current.accent}, ${current.accent}dd)`,
                        boxShadow: `0 8px 25px ${current.accent}33`,
                      }}
                    >
                      จองคิวถ่ายรูป
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </motion.a>
                  </div>

                </div>

                {/* Right — Image */}
                <div className="relative order-1 lg:order-2 h-[200px] sm:h-[280px] md:h-[350px] lg:h-full shrink-0">
                  <motion.div
                    custom={direction}
                    variants={imageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.4 },
                      scale: { duration: 0.4 },
                    }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={current.image.src}
                      alt={current.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className={current.imageClassName || "object-cover"}
                      placeholder={current.image.blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={current.image.blurDataURL}
                      priority={activeIndex === 0}
                    />
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to right, white 0%, transparent 30%), linear-gradient(to top, ${current.accent}15 0%, transparent 50%)`,
                      }}
                    />
                  </motion.div>
                </div>
                {/* CTA Button (Mobile Only - Bottom of Card) */}
                <div className="lg:hidden px-4 pb-4 sm:px-8 sm:pb-6 md:px-10 md:pb-8 pt-0 order-3 mt-auto">
                  <motion.a
                    href="#contact"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 px-5 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-medium text-white transition-all duration-300 shadow-lg w-full"
                    style={{
                      background: `linear-gradient(135deg, ${current.accent}, ${current.accent}dd)`,
                      boxShadow: `0 8px 25px ${current.accent}33`,
                    }}
                  >
                    จองคิวถ่ายรูป
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </motion.a>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-between mt-8">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {packages.map((pkg, i) => (
                <button
                  key={i}
                  onClick={() => {
                    goToSlide(i);
                    handleUserInteraction();
                  }}
                  className="group relative p-1"
                  aria-label={`Go to ${pkg.title}`}
                >
                  <motion.div
                    className="rounded-full transition-all duration-300"
                    animate={{
                      width: i === activeIndex ? 32 : 8,
                      height: 8,
                      backgroundColor: i === activeIndex ? current.accent : '#FDDDE6',
                    }}
                    whileHover={{ scale: 1.2 }}
                  />
                </button>
              ))}
            </div>

            {/* Arrow Buttons */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  paginate(-1);
                  handleUserInteraction();
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[rgba(0,0,0,0.08)] bg-white flex items-center justify-center shadow-sm hover:border-[#F4A0B5]/40 hover:shadow-md transition-all duration-300 cursor-pointer"
                aria-label="Previous package"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  paginate(1);
                  handleUserInteraction();
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[rgba(0,0,0,0.08)] bg-white flex items-center justify-center shadow-sm hover:border-[#F4A0B5]/40 hover:shadow-md transition-all duration-300 cursor-pointer"
                aria-label="Next package"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#3D3040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
