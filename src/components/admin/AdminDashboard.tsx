'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/common/Footer';
import GalleryAdmin from './GalleryAdmin';
import ScheduleAdmin from './ScheduleAdmin';
import BookingAdmin from './BookingAdmin';
import CameraAdmin from './CameraAdmin';
import { clearAdminCache } from '@/lib/admin-cache';

interface AdminDashboardProps {
  handleLogout: () => void;
}

export default function AdminDashboard({ handleLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'booking' | 'camera' | 'gallery'>('schedule');

  const navItems = [
    { id: 'schedule', label: 'ตารางงาน & รอบเวลา', icon: '🗓️' },
    { id: 'booking', label: 'รายละเอียดการจองคิว', icon: '📋' },
    { id: 'camera', label: 'จัดการรุ่นกล้อง', icon: '📸' },
    { id: 'gallery', label: 'จัดการแกลเลอรีรูปภาพ', icon: '🖼️' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#3D3040] flex flex-col md:flex-row">
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 lg:w-72 bg-white/80 border-b md:border-b-0 md:border-r border-[rgba(0,0,0,0.06)] backdrop-blur-md p-5 lg:p-6 flex flex-col justify-between shrink-0 md:sticky md:top-0 md:h-screen z-20">
        <div>
          {/* Header Branding */}
          <div className="pb-6 border-b border-[rgba(0,0,0,0.06)] mb-6">
            <span className="inline-block text-[11px] font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-2">
              ✦ Studio Administration
            </span>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#3D3040]">
              Admin Panel
            </h1>
            <p className="text-xs text-[#9E8E95] font-light mt-1 leading-relaxed">
              พื้นที่จัดการระบบหลังบ้าน แกลเลอรีรูปภาพ และคิวงาน
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#9E8E95]/80 px-3 mb-2">
              เมนูหลัก / Navigation
            </p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-3 text-left ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white shadow-[0_4px_16px_rgba(244,160,181,0.25)]'
                    : 'bg-transparent text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-100/60'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Actions Footer */}
        <div className="pt-6 border-t border-[rgba(0,0,0,0.06)] mt-6 space-y-2.5">
          <button
            onClick={() => {
              clearAdminCache();
              window.location.reload();
            }}
            className="w-full py-2.5 px-4 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 transition-all flex items-center gap-2 cursor-pointer"
            title="ล้างข้อมูลใน localStorage และโหลดข้อมูลใหม่จาก Server"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>รีเฟรชข้อมูล (Clear Cache)</span>
          </button>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center gap-2 cursor-pointer"
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
      <div className="flex-1 min-w-0 flex flex-col justify-between overflow-x-hidden">
        <main className="flex-1">
          {activeTab === 'booking' ? (
            <BookingAdmin />
          ) : activeTab === 'schedule' ? (
            <ScheduleAdmin />
          ) : activeTab === 'camera' ? (
            <CameraAdmin />
          ) : (
            <GalleryAdmin />
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
