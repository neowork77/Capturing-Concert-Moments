'use client';

import { useAdminAuth } from '@/components/admin/useAdminAuth';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const {
    isAuthenticated,
    isCheckingAuth,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoggingIn,
    loginError,
    handleLogin,
    handleLogout,
  } = useAdminAuth();

  // Loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#FFFBFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#F4A0B5]/20 border-t-[#F4A0B5] animate-spin"></div>
          <p className="text-[#9E8E95] text-sm font-light">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLogin
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoggingIn={isLoggingIn}
        loginError={loginError}
        handleLogin={handleLogin}
      />
    );
  }

  return <AdminDashboard handleLogout={handleLogout} />;
}
