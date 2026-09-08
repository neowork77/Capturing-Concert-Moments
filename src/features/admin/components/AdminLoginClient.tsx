'use client';

import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth';
import AdminLogin from '@/features/admin/components/AdminLogin';

export default function AdminLoginClient() {
  const router = useRouter();
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoggingIn,
    loginError,
    handleLogin: originalHandleLogin,
  } = useAdminAuth();

  const handleLoginWithRefresh = async (e: React.FormEvent) => {
    await originalHandleLogin(e);
    router.refresh();
  };

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
      handleLogin={handleLoginWithRefresh}
    />
  );
}

