import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { ShieldAlert, Loader2, KeyRound, User, Eye, EyeOff, Lock, Laptop, UserPlus, CheckCircle2 } from 'lucide-react';
import { userService } from '../services/userService';

interface LoginProps {
  onGoToStudentExam?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onGoToStudentExam }) => {
  const { user, isUnauthorized, login, logout, loading } = useAuth();
  
  // Tab Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoggingIn(true);
    try {
      await login(usernameInput, passwordInput);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');

    const cleanUser = regUsername.trim().toLowerCase();
    const cleanName = regDisplayName.trim();
    const cleanPass = regPassword.trim();

    if (!cleanUser) {
      setErrorMsg('Vui lòng nhập tên đăng nhập hoặc email.');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setErrorMsg('Mật khẩu phải có ít nhất 4 ký tự.');
      return;
    }

    if (cleanPass !== regConfirmPassword.trim()) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setRegistering(true);
    try {
      // 1. Create account (Instant local cache + non-blocking Firestore sync)
      await userService.addUser({
        username: cleanUser,
        displayName: cleanName || cleanUser,
        password: cleanPass,
        role: 'user',
        active: true,
      });

      setRegSuccessMsg('Tạo tài khoản thành công! Đang tự động đăng nhập...');

      // 2. Immediately log in the user
      await login(cleanUser, cleanPass);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setRegistering(false);
    }
  };

  // Screen for Unauthorized Account (Inactive/Locked)
  if (user && isUnauthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6 backdrop-blur-xl my-auto">
          <div className="w-16 h-16 bg-rose-950/80 border border-rose-800/60 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-950/50">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-wide">
              Tài khoản bị khóa hoặc tạm ngưng
            </h2>
            <p className="text-xs text-rose-300 font-semibold bg-rose-950/40 border border-rose-800/40 px-3 py-1.5 rounded-xl inline-block font-mono">
              {user.username}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              Tài khoản của bạn chưa được kích hoạt hoặc đã bị khóa bởi Admin. Vui lòng liên hệ Quản trị viên để mở lại quyền truy cập.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-md cursor-pointer"
            >
              <span>Quay lại trang Đăng nhập</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-y-auto">
      {/* Background Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 backdrop-blur-xl my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-indigo-600 p-[2px] mx-auto shadow-xl shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-black text-xl">
              AI
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              VISION TEST AI
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Đăng Nhập Hệ Thống Quản Lý & Tạo Đề Thi
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setRegSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
              setRegSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              authMode === 'register'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tạo Tài Khoản Mới</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-start space-x-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Notification */}
        {regSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl flex items-start space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{regSuccessMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleSubmitLogin} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tên đăng nhập / Email</span>
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="pqhacker@gamil.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mật khẩu</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loggingIn || loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 pt-3"
            >
              {loggingIn || loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <span>Đăng Nhập Dành Cho Giáo Viên</span>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {authMode === 'register' && (
          <form onSubmit={handleSubmitRegister} className="space-y-3.5">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tên đăng nhập / Email (*)</span>
              </label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="Ví dụ: gv_toan10 hoặc thukhanh@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Display Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Họ và Tên Giáo Viên</span>
              </label>
              <input
                type="text"
                value={regDisplayName}
                onChange={(e) => setRegDisplayName(e.target.value)}
                placeholder="Ví dụ: Thầy Trần Minh Khang"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mật khẩu (tối thiểu 4 ký tự) (*)</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                <span>Xác nhận lại mật khẩu (*)</span>
              </label>
              <input
                type={showRegPassword ? 'text' : 'password'}
                required
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={registering}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 pt-3"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-emerald-200" />
                  <span>Tạo Tài Khoản & Vào Hệ Thống Ngay</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick link for Students to take online tests without teacher login */}
        {onGoToStudentExam && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onGoToStudentExam}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500/15 to-cyan-500/15 hover:from-indigo-500/25 hover:to-cyan-500/25 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-sm group"
            >
              <Laptop className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>👉 Bạn là Học Sinh? Vào làm bài thi online ngay</span>
            </button>
          </div>
        )}

        <p className="text-[10px] text-center text-slate-500">
          Liên hệ Zalo - 0913117321.
        </p>
      </div>
    </div>
  );
};

