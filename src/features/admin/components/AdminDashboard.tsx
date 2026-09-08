'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/shared/components/Footer';
import GalleryAdmin from './GalleryAdmin';
import ScheduleAdmin from './ScheduleAdmin';
import BookingAdmin from './BookingAdmin';
import CameraAdmin from './CameraAdmin';
import { clearAdminCache } from '@/features/admin/lib/admin-cache';
import { DialogHost } from '@/features/admin/components/ui';
import { AdminDataProvider, AdminInitialData, useAdminData } from '@/features/admin/hooks/useAdminData';

interface AdminDashboardProps {
  handleLogout?: () => void;
  initialData?: AdminInitialData;
}

export default function AdminDashboard({ handleLogout, initialData }: AdminDashboardProps) {
  return (
    <AdminDataProvider initialData={initialData}>
      <AdminDashboardContent handleLogout={handleLogout} />
    </AdminDataProvider>
  );
}

function AdminDashboardContent({ handleLogout: propHandleLogout }: { handleLogout?: () => void }) {
  const { refreshAll } = useAdminData();
  const [activeTab, setActiveTab] = useState<'schedule' | 'camera' | 'gallery'>('schedule');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = propHandleLogout || (async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/admin';
  });

  const handleRefresh = async () => {
    clearAdminCache();
    await refreshAll();
  };

  const navItems = [
    { id: 'schedule', label: 'ตารางงาน & รอบเวลา', shortLabel: 'ตารางงาน', icon: '🗓️' },
    { id: 'camera', label: 'จัดการรุ่นกล้อง', shortLabel: 'รุ่นกล้อง', icon: '📸' },
    { id: 'gallery', label: 'จัดการแกลเลอรี', shortLabel: 'แกลเลอรี', icon: '🖼️' },
  ] as const;

  const currentNav = navItems.find(i => i.id === activeTab);

  return (
    <div className="admin-ui min-h-screen bg-[#FFFBFC] text-[#3D3040] flex flex-col md:flex-row">
      {/* ================= MOBILE STICKY HEADER (< md) ================= */}
      <div className="block md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[rgba(0,0,0,0.06)] shadow-xs">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Hamburger Menu & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer flex-shrink-0"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5] to-[#D4B5E0] flex items-center justify-center text-white text-sm shadow-xs flex-shrink-0">
              ✦
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold tracking-tight text-[#3D3040] leading-none truncate">
                Admin Panel
              </h1>
              <p className="text-micro text-[var(--ink-muted)] font-medium truncate mt-0.5">
                {currentNav?.icon} {currentNav?.label}
              </p>
            </div>
          </div>

          {/* Right: Quick Refresh */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl border border-amber-200/80 bg-amber-50/60 text-amber-700 hover:bg-amber-100/60 transition-all cursor-pointer"
              title="รีเฟรชข้อมูล (Clear Cache)"
              aria-label="Clear Cache"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MOBILE DRAWER SIDEBAR (< md) ================= */}
      {/* Backdrop */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sliding Drawer Panel from Left */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#FFFBFC] z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation Drawer"
      >
        <div className="p-5 overflow-y-auto flex-1">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[rgba(0,0,0,0.06)] mb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F4A0B5] to-[#D4B5E0] flex items-center justify-center text-white text-sm shadow-xs flex-shrink-0">
                ✦
              </div>
              <div className="min-w-0">
                <span className="block text-micro font-semibold tracking-[0.2em] uppercase text-[#F4A0B5]">
                  Studio Admin
                </span>
                <h2 className="font-display text-base font-bold tracking-tight text-[#3D3040] truncate">
                  Admin Panel
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-100 transition-all cursor-pointer"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links inside Drawer */}
          <nav className="space-y-1.5">
            <p className="text-micro font-bold text-[var(--ink-muted)]/80 px-3 mb-2">
              เมนูหลัก / Navigation
            </p>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full py-3 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-3 text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white shadow-[0_4px_16px_rgba(244,160,181,0.25)]'
                      : 'bg-transparent text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-100/70'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Bottom Actions Footer */}
        <div className="p-4 border-t border-[rgba(0,0,0,0.06)] space-y-2 bg-white/60">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-full py-2.5 px-3.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white text-xs font-medium text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--ink-muted)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>ดูหน้าเว็บหลัก (Home)</span>
          </Link>

          <button
            onClick={handleRefresh}
            className="w-full py-2.5 px-3.5 rounded-xl border border-amber-200/80 bg-amber-50/70 text-xs font-medium text-amber-700 hover:bg-amber-100/70 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>รีเฟรชข้อมูล (Clear Cache)</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3.5 rounded-xl border border-rose-200/80 bg-rose-50/50 text-xs font-medium text-rose-600 hover:bg-rose-100/60 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ================= DESKTOP SIDEBAR (>= md) ================= */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white/70 backdrop-blur-xl border-r border-[rgba(0,0,0,0.06)] flex-col justify-between p-6 shrink-0 h-screen sticky top-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4A0B5] to-[#D4B5E0] flex items-center justify-center text-white text-lg shadow-sm">
              ✦
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-[#3D3040] leading-none">
                Admin Panel
              </h1>
              <span className="text-micro text-[var(--ink-muted)] font-medium">Capture Moments</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5" aria-label="Desktop Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white shadow-md shadow-[#F4A0B5]/15'
                      : 'text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-black/[0.02]'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-[rgba(0,0,0,0.06)] mt-6 space-y-2.5">
          <button
            onClick={handleRefresh}
            className="w-full py-2.5 px-4 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 transition-all flex items-center gap-2 cursor-pointer"
            title="ล้างข้อมูลใน Cache และโหลดข้อมูลล่าสุดจาก Server"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>รีเฟรชข้อมูล (Clear Cache)</span>
          </button>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs font-medium text-[var(--ink-muted)] hover:text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>ดูหน้าเว็บหลัก</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-xs font-medium text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 min-w-0 flex flex-col justify-between overflow-x-hidden">
        <main className="flex-1">
          {activeTab === 'schedule' ? (
            <ScheduleAdmin />
          ) : activeTab === 'camera' ? (
            <CameraAdmin />
          ) : (
            <GalleryAdmin />
          )}
        </main>

        <Footer />
      </div>
      <DialogHost />
    </div>
  );
}
