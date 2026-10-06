import React from 'react';
import { useAuth } from './useAuth';
import { Login } from './Login';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  fallback?: React.ReactNode;
  onGoToStudentExam?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
  onGoToStudentExam,
}) => {
  const { user, isAdmin, loading } = useAuth();

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
    return <Login onGoToStudentExam={onGoToStudentExam} />;
  }

  // Role requirement check
  if (requiredRole === 'admin' && !isAdmin) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-white">Yêu Cầu Quyền Quản Trị Viên</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Khu vực này chỉ dành cho Quản trị viên (Admin) quản lý người dùng và cấu hình hệ thống.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
