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
}) => {
  const { user, loading } = useAuth();

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

  return <>{children}</>;
};
