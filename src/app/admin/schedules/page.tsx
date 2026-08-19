'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ScheduleAdmin from '@/components/admin/ScheduleAdmin';
import Footer from '@/components/common/Footer';

export default function AdminSchedulesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        setIsAuthenticated(data.authenticated === true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setUsername('');
        setPassword('');
      } else {
        setLoginError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#FFFBFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin" />
          <p className="text-[#9E8E95] text-sm font-light">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFFBFC] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="w-full max-w-md animate-fade-in relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4A0B5] to-[#D4B5E0] flex items-center justify-center mx-auto mb-5 shadow-lg">
              <span className="text-2xl">🗓️</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#3D3040] mb-2">
              Schedule Admin
            </h1>
            <p className="text-sm text-[#9E8E95] font-light">
              เข้าสู่ระบบเพื่อจัดการตารางงาน & คิวถ่ายรูป
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[rgba(0,0,0,0.04)] shadow-sm">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase tracking-wider mb-2">
                  ชื่อผู้ใช้งาน
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.07)] bg-[#FFFBFC] text-sm text-[#3D3040]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9E8E95] uppercase tracking-wider mb-2">
                  รหัสผ่าน
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(0,0,0,0.07)] bg-[#FFFBFC] text-sm text-[#3D3040]"
                />
              </div>

              {loginError && (
                <p className="text-xs text-rose-500">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#F4A0B5] to-[#D4B5E0] text-white text-sm font-semibold shadow-md cursor-pointer"
              >
                {isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBFC] text-[#3D3040] flex flex-col justify-between">
      <div>
        <header className="relative pt-12 pb-8 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-[rgba(0,0,0,0.06)] pb-8">
            <div>
              <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-3">
                ✦ Supabase Schedule Management
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#3D3040] mb-3">
                Schedule & Booking Control
              </h1>
              <p className="text-sm text-[#9E8E95] font-light leading-relaxed max-w-xl">
                ระบบจัดการตารางงานคิวถ่ายรูปรูปภาพแทน Google Sheets สามารถเพิ่ม แก้ไข ลบ และคลิกสลับสถานะคิวแต่ละรอบเวลาได้แบบ Real-time
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="py-3 px-5 rounded-xl border border-[rgba(0,0,0,0.08)] text-xs sm:text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ‹ กลับหน้า Admin หลัก
              </Link>
              <button
                onClick={handleLogout}
                className="py-3 px-5 rounded-xl border border-rose-200 text-xs sm:text-sm font-medium text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </header>

        <main>
          <ScheduleAdmin />
        </main>
      </div>

      <Footer />
    </div>
  );
}
