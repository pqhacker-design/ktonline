import React from 'react';
import { useAuth } from './useAuth';
import { Login } from './Login';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
}) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  // Role restriction
  if (requiredRole === 'admin' && !isAdmin) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Quyền Truy Cập Bị Giới Hạn</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Khu vực này chỉ dành riêng cho tài khoản Quản trị viên (Admin). Tài khoản của bạn không có quyền truy cập vào mục này.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
