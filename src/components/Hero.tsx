'use client';

import { motion } from 'framer-motion';

export default function Hero() {
  const scrollToGallery = () => {
    const el = document.querySelector('#gallery');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Decorative pastel blobs */}
      <div className="absolute top-20 -left-32 w-[500px] h-[500px] rounded-full bg-[#F4A0B5]/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-[400px] h-[400px] rounded-full bg-[#D8CCE8]/[0.1] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C5E8D8]/[0.06] blur-[150px] pointer-events-none" />

      <div className="relative z-10 text-center px-6 sm:px-8 max-w-3xl mx-auto">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#FDDDE6] bg-white/80 backdrop-blur-sm mb-8 sm:mb-10 shadow-[0_2px_12px_rgba(244,160,181,0.1)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F4A0B5] opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F4A0B5]" />
          </span>
          <span className="text-xs sm:text-sm font-medium text-[#9E8E95]">Available for bookings</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-6 sm:mb-8"
        >
          <span className="text-[#3D3040]">Capturing </span>
          <span className="font-light bg-gradient-to-r from-[#F4A0B5] via-[#D8CCE8] to-[#C5E8D8] bg-clip-text text-transparent">Concert Moments</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-base sm:text-lg lg:text-xl text-[#9E8E95] max-w-xl mx-auto mb-10 sm:mb-12 leading-relaxed font-light"
        >
          รับถ่ายรูปหน้าคอนเสิร์ต เก็บโมเมนต์หน้าคอน 20 นาที 199 บาท ไม่จำกัดจำนวนรูป ใช้กล้อง Ricoh GRIIIx + Flash ภาพสวยคม จบหลังกล้อง พร้อมรับรูปภายในวันหลังคอนจบ
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={scrollToGallery}
            className="px-8 py-3 rounded-full bg-[#F4A0B5] text-white font-medium text-sm hover:bg-[#E8899F] hover:shadow-[0_4px_20px_rgba(244,160,181,0.3)] transition-all duration-300 cursor-pointer"
          >
            View Gallery ✦
          </button>
          <a
            href="#Packages"
            className="px-8 py-3 rounded-full border border-[rgba(0,0,0,0.08)] text-[#3D3040] font-medium text-sm hover:border-[#F4A0B5]/40 hover:bg-[#FFF5F7] transition-all duration-300"
          >
            Packages
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-[#C8BBC0] tracking-[0.2em] uppercase">Scroll</span>
          <svg className="w-3.5 h-3.5 text-[#C8BBC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
