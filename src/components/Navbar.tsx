'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Gallery', href: '#gallery' },
  { label: 'Packages', href: '#Packages' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    setIsMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ${
          isScrolled
            ? 'navbar-scrolled border-b border-[rgba(0,0,0,0.05)] shadow-[0_1px_20px_rgba(244,160,181,0.08)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl border border-[#FDDDE6] bg-[#FFF5F7] flex items-center justify-center group-hover:border-[#F4A0B5]/50 group-hover:bg-[#FDDDE6] transition-all duration-300">
                <svg
                  className="w-4 h-4 text-[#F4A0B5]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-[#3D3040]">
                รับถ่ายรูปหน้าคอนเสิร์ต
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] transition-colors duration-300 cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
              <a
                href="#contact"
                className="px-5 py-2 text-sm font-medium rounded-xl border border-[#F4A0B5]/40 text-[#F4A0B5] hover:bg-[#F4A0B5]/10 hover:border-[#F4A0B5]/60 transition-all duration-300"
              >
                Hire Me ♡
              </a>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center cursor-pointer"
              aria-label="Toggle menu"
            >
              <div className="flex flex-col gap-1.5">
                <span
                  className={`block w-5 h-[1.5px] bg-[#3D3040] transition-all duration-300 ${
                    isMobileOpen ? 'rotate-45 translate-y-[7px]' : ''
                  }`}
                />
                <span
                  className={`block w-5 h-[1.5px] bg-[#3D3040] transition-all duration-300 ${
                    isMobileOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`block w-5 h-[1.5px] bg-[#3D3040] transition-all duration-300 ${
                    isMobileOpen ? '-rotate-45 -translate-y-[7px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-white pt-28 px-8 md:hidden"
          >
            <div className="flex flex-col gap-8">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => scrollToSection(link.href)}
                  className="text-2xl font-display font-semibold text-[#3D3040] hover:text-[#F4A0B5] transition-colors text-left cursor-pointer"
                >
                  {link.label}
                </motion.button>
              ))}
              <motion.a
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                href="#contact"
                onClick={() => setIsMobileOpen(false)}
                className="mt-4 px-6 py-3 text-center text-base font-medium rounded-xl border border-[#F4A0B5]/40 text-[#F4A0B5]"
              >
                Hire Me ♡
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
