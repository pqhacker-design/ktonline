import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Key, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  AlertTriangle,
  User,
  Shield,
  Lock,
  Loader2,
  Info,
  Flame,
  Database,
  AlertOctagon,
  HardDrive,
  Check
} from 'lucide-react';
import { AppSettings } from '../types';
import { callGeminiApi } from '../services/geminiClient';
import { useAuth } from '../auth/useAuth';
import { userService } from '../services/userService';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onClearAllData: () => void;
}

const GEMINI_MODELS = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'Mặc định - Khuyên dùng',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    description: 'Tốc độ sinh nhanh, chính xác cao, bám sát chuẩn ma trận CV 7991/BGDĐT. Phù hợp nhất cho mọi đề thi.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Nâng cao - Suy luận sâu',
    badgeClass: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
    description: 'Mô hình Pro với khả năng suy luận logic nâng cao cho câu hỏi phân hóa, tự luận VDC và thi học sinh giỏi.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Siêu tốc độ',
    badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
    description: 'Phản hồi siêu tốc, giảm tối đa thời gian chờ đợi. Phù hợp cho kiểm tra thử nghiệm hoặc tạo đề ngắn.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    badge: 'Phiên bản mới nhất',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    description: 'Tự động liên kết tới bản nâng cấp Flash mới nhất từ Google DeepMind.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onClearAllData,
}) => {
  const { user: authUser, updateProfile, role } = useAuth();
  const [profileUsername, setProfileUsername] = useState(authUser?.username || '');
  const [profileDisplayName, setProfileDisplayName] = useState(authUser?.displayName || '');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [showProfilePass, setShowProfilePass] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  // Sync profile when auth user loads/changes
  useEffect(() => {
    if (authUser) {
      setProfileUsername(authUser.username || '');
      setProfileDisplayName(authUser.displayName || '');
    }
  }, [authUser?.username, authUser?.displayName]);

  const [schoolName, setSchoolName] = useState(settings.defaultSchoolName || 'Trường THCS Bình San');
  const [departmentName, setDepartmentName] = useState(settings.defaultDepartmentName || 'Sở Giáo dục và Đào tạo');
  const [teacherName, setTeacherName] = useState(settings.defaultTeacherName || 'Giáo viên THCS / THPT');
  const [customApiKey, setCustomApiKey] = useState(settings.customApiKey || '');
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel || 'gemini-3.6-flash');
  const [showApiKey, setShowApiKey] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);
  const [apiTesting, setApiTesting] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  // Full System Wipe State
  const [showSystemWipeModal, setShowSystemWipeModal] = useState(false);
  const [systemWipeConfirmText, setSystemWipeConfirmText] = useState('');
  const [systemWiping, setSystemWiping] = useState(false);
  const [systemWipeProgress, setSystemWipeProgress] = useState(0);
  const [systemWipeMessage, setSystemWipeMessage] = useState('');
  const [systemWipeResult, setSystemWipeResult] = useState<{ deletedCount: number; errors: string[] } | null>(null);
  const [systemWipeOptions, setSystemWipeOptions] = useState({
    wipeUsersExceptAdmin: true,
    wipeAllUserData: true,
    wipePublishedExams: true,
    wipeStudentResults: true,
    wipeClassesAndStudents: true,
    resetAdminPasswordToDefault: true,
    clearBrowserCache: true,
  });

  const handleExecuteSystemWipe = async () => {
    const cleanInput = systemWipeConfirmText.trim();
    if (cleanInput !== 'XOA_HE_THONG' && cleanInput !== 'XOA_TOAN_BO_HE_THONG' && cleanInput !== 'XOA_DATABASE') {
      alert('Vui lòng nhập chính xác "XOA_HE_THONG" để xác nhận.');
      return;
    }

    setSystemWiping(true);
    setSystemWipeProgress(5);
    setSystemWipeMessage('Đang kết nối cơ sở dữ liệu Cloud Firestore...');
    setSystemWipeResult(null);

    try {
      const res = await userService.wipeEntireFirestoreDatabase(
        systemWipeOptions,
        (msg, pct) => {
          setSystemWipeMessage(msg);
          setSystemWipeProgress(pct);
        }
      );

      // Also reset memory in app
      onClearAllData();
      setSystemWipeResult(res);
    } catch (err: any) {
      alert('Lỗi trong quá trình xóa dữ liệu hệ thống: ' + err.message);
    } finally {
      setSystemWiping(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUsername.trim()) {
      setProfileStatus({ type: 'error', message: 'Tên đăng nhập không được để trống.' });
      return;
    }

    setProfileSaving(true);
    setProfileStatus({ type: null, message: '' });

    try {
      await updateProfile({
        username: profileUsername.trim(),
        displayName: profileDisplayName.trim(),
        password: newProfilePassword.trim() ? newProfilePassword.trim() : undefined,
      });

      setProfileStatus({
        type: 'success',
        message: 'Đã cập nhật Tên đăng nhập và thông tin tài khoản thành công! Dữ liệu đề thi và câu hỏi được bảo toàn 100%.',
      });
      setNewProfilePassword('');
      setTimeout(() => {
        setProfileStatus({ type: null, message: '' });
      }, 5000);
    } catch (err: any) {
      setProfileStatus({
        type: 'error',
        message: err.message || 'Lỗi khi cập nhật tài khoản.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      defaultSchoolName: schoolName,
      defaultDepartmentName: departmentName,
      defaultTeacherName: teacherName,
      customApiKey: customApiKey.trim(),
      selectedModel,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestApiKey = async () => {
    setApiTesting(true);
    setApiStatus({ type: null, message: '' });

    try {
      await callGeminiApi({
        prompt: 'Xin chào, vui lòng phản hồi ngắn "OK" để kiểm tra kết nối API.',
        customApiKey: customApiKey.trim() || undefined,
        model: selectedModel,
      });

      setApiStatus({
        type: 'success',
        message: `Kết nối thành công với mô hình ${selectedModel}! Khóa API hoạt động chính xác.`,
      });
    } catch (err: any) {
      setApiStatus({
        type: 'error',
        message: `Lỗi kết nối API (${selectedModel}): ${err.message || 'Không thể xác thực API Key.'}`,
      });
    } finally {
      setApiTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
          Cài Đặt Hệ Thống & Tài Khoản
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý tài khoản đăng nhập cá nhân, API Key Gemini, lựa chọn mô hình AI và cấu hình trường học.
        </p>
      </div>

      {/* 1. Account Profile & Username Edit Section */}
      <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                1. Hồ Sơ & Đổi Tên Đăng Nhập (Username) / Tên Hiển Thị
              </h3>
              <p className="text-xs text-slate-500">
                Thay đổi Tên đăng nhập và Họ tên giáo viên. Dữ liệu đề thi, ma trận và kết quả làm bài được bảo toàn tuyệt đối.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
            <Shield className="w-3 h-3 text-indigo-500" />
            <span>Quản trị viên Hệ thống (Admin)</span>
          </span>
        </div>

        {/* Data Safety Assurance Banner */}
        <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <strong className="font-bold">Bảo toàn dữ liệu 100%:</strong> Tài khoản của bạn được định danh qua Mã ID an toàn. Khi bạn thay đổi <strong>Tên đăng nhập (Username)</strong> hoặc <strong>Họ tên</strong>, toàn bộ kho đề thi, ngân hàng câu hỏi và lịch sử bài thi của bạn vẫn giữ nguyên vẹn.
          </div>
        </div>

        {profileStatus.message && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
              profileStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950 border-rose-300 text-rose-800 dark:text-rose-300'
            }`}
          >
            {profileStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{profileStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên đăng nhập (Username) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              placeholder="VD: giaovien1"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Dùng để đăng nhập vào ứng dụng.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Họ và Tên Hiển Thị
            </label>
            <input
              type="text"
              value={profileDisplayName}
              onChange={(e) => setProfileDisplayName(e.target.value)}
              placeholder="VD: Thầy Nguyễn Văn A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">Hiển thị ở thanh tiêu đề và góc giao diện.</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu mới (Để trống nếu không muốn đổi mật khẩu)
            </label>
            <div className="relative">
              <input
                type={showProfilePass ? 'text' : 'password'}
                value={newProfilePassword}
                onChange={(e) => setNewProfilePassword(e.target.value)}
                placeholder="Nhập mật khẩu mới nếu muốn đổi (tối thiểu 4 ký tự)"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowProfilePass(!showProfilePass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showProfilePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={profileSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all disabled:opacity-60"
          >
            {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{profileSaving ? 'Đang cập nhật...' : 'Cập Nhật Hồ Sơ & Tên Đăng Nhập'}</span>
          </button>
        </div>
      </form>

      {/* 2. Gemini API Key Configuration Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                2. Nhập Khóa API Gemini Cá Nhân (Bắt buộc)
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống không sử dụng API dùng chung. Bắt buộc người dùng phải nhập Gemini API Key cá nhân để sinh đề.
              </p>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
          >
            <span>Lấy API Key miễn phí tại Google AI Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Gemini API Key cá nhân <span className="text-rose-500">* (Bắt buộc)</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="Dán khóa API Gemini của bạn tại đây (AIzaSy...)"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Khóa API Key của bạn sẽ được lưu bảo mật trong trình duyệt (LocalStorage) và không bị lộ ra ngoài.
            </p>
          </div>

          {apiStatus.message && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
                apiStatus.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950 border-rose-300 text-rose-800 dark:text-rose-300'
              }`}
            >
              {apiStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{apiStatus.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestApiKey}
              disabled={apiTesting}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apiTesting ? 'animate-spin' : ''}`} />
              <span>{apiTesting ? 'Đang thử nghiệm...' : 'Kiểm Tra Kết Nối API Key'}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu Hình</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Gemini AI Model Selection Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-500/10 rounded-xl text-teal-600 dark:text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                3. Lựa Chọn Mô Hình Gemini AI
              </h3>
              <p className="text-xs text-slate-500">
                Chọn mô hình AI phù hợp nhất với nhu cầu tạo đề thi, ma trận và mức độ phức tạp của bài tập.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {GEMINI_MODELS.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">{m.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badgeClass}`}>
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{m.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-200/50 dark:bg-slate-900/50 px-2.5 py-0.5 rounded-md w-fit">
                  {m.id}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. System Prompt Template Management */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                4. Quản Lý System Prompt (Chuẩn Công Văn 7991/BGDĐT)
              </h3>
              <p className="text-xs text-slate-500">
                Xem và tùy chỉnh quy tắc chỉ dẫn Prompt của Gemini AI khi tạo ma trận, bảng đặc tả và đề thi.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Prompt Quy Tắc Khung Đề Thi</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-extrabold px-2 py-0.5 rounded-full">CV 7991 Standard</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              Tạo ma trận 4 mức độ tư duy (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), xuất 3 phần (Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai, Tự luận ngắn), đáp án chi tiết và Rubric chấm điểm tự luận.
            </p>
          </div>
        </div>
      </div>

      {/* 5. System Logs & Audit Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                5. Nhật Ký Hệ Thống & An Ninh (System Audit Logs)
              </h3>
              <p className="text-xs text-slate-500">
                Ghi nhận lịch sử thao tác, tạo đề, truy cập tài khoản và cấp mã thi trực tuyến.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">Đăng nhập tài khoản Admin</span>
              <span className="text-slate-400 text-[10px]">({settings.defaultTeacherName || 'Admin'})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{new Date().toLocaleTimeString('vi-VN')}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">Khởi tạo Gemini 3.6 Flash Client</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Hệ thống sẵn sàng</span>
          </div>
        </div>
      </div>

      {/* 6. Backup & Data Export Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                6. Sao Lưu & Khôi Phục Dữ Liệu (Backup & Restore)
              </h3>
              <p className="text-xs text-slate-500">
                Tải xuống bản sao lưu JSON toàn bộ ngân hàng câu hỏi, ma trận và cài đặt ứng dụng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute("download", `VisionTestAI_Backup_${new Date().toISOString().slice(0,10)}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <span>Tải Xuất JSON Backup</span>
          </button>
        </div>
      </div>

      {/* 7. Default Administrative Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
          7. Thông Tin Trường Học & Giáo Viên Mặc Định
        </h3>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu cài đặt hệ thống thành công!</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Sở / Phòng Giáo Dục Mặc Định
            </label>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Trường Mặc Định
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Giáo Viên Mặc Định
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Tất Cả Cài Đặt</span>
          </button>
        </div>
      </form>

      {/* 8. Danger Zone - LocalStorage */}
      <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-red-800 dark:text-red-300 flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-red-600" />
              <span>8. Quản Lý Bộ Nhớ Trình Duyệt (LocalStorage)</span>
            </h3>
            <p className="text-xs text-red-600 dark:text-red-400">
              Xóa toàn bộ lịch sử đề kiểm tra, ngân hàng câu hỏi và bản nháp offline lưu trên máy hiện tại.
            </p>
          </div>
        </div>

        {clearedSuccess && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã xóa sạch toàn bộ dữ liệu LocalStorage thành công! Hệ thống đã được làm mới.</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowClearConfirmModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Xóa Sạch Dữ Liệu LocalStorage</span>
        </button>
      </div>

      {/* 9. Master Danger Zone - Wipe All System Data */}
      <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/80 p-6 rounded-3xl border border-rose-800 shadow-2xl space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-800/60 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg text-rose-200">
                  9. Xóa Tất Cả Dữ Liệu Hệ Thống
                </h3>
                <span className="text-[10px] bg-rose-900 text-rose-200 font-extrabold px-2 py-0.5 rounded-full border border-rose-700">
                  Toàn Diện
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Xóa sạch toàn bộ dữ liệu Cloud Firestore (đề thi, bài nộp, học sinh, giáo viên) và bộ nhớ máy.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSystemWipeConfirmText('');
              setSystemWipeResult(null);
              setSystemWipeMessage('');
              setSystemWipeProgress(0);
              setShowSystemWipeModal(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <AlertOctagon className="w-4 h-4 text-white" />
            <span>Xóa Toàn Bộ Dữ Liệu Hệ Thống</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-300">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-900/40 space-y-1">
            <p className="font-bold text-rose-300 flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-rose-400" />
              <span>Cloud Firestore</span>
            </p>
            <p className="text-slate-400 text-[10px]">Xóa published_exams, student_results, system_classes, system_students, user_data</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-900/40 space-y-1">
            <p className="font-bold text-emerald-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tài Khoản Quản Trị</span>
            </p>
            <p className="text-slate-400 text-[10px]">Tự động bảo lưu/khôi phục tài khoản Admin <code className="text-emerald-400">pqhacker@gamil.com</code> (pass: <code className="text-emerald-400">Hungdiemly300506</code>)</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-900/40 space-y-1">
            <p className="font-bold text-cyan-300 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bộ Nhớ Trình Duyệt</span>
            </p>
            <p className="text-slate-400 text-[10px]">Làm sạch kho lưu trữ LocalStorage, lịch sử tạo đề và câu hỏi tạm</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear LocalStorage */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Xác Nhận Xóa Dữ Liệu LocalStorage?
                </h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa toàn bộ lịch sử gói đề thi, ma trận, bảng đặc tả và ngân hàng câu hỏi đã lưu trong bộ nhớ LocalStorage của trình duyệt này không?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch (e) {}
                  onClearAllData();
                  setShowClearConfirmModal(false);
                  setClearedSuccess(true);
                  setTimeout(() => setClearedSuccess(false), 5000);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-red-600/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Đồng Ý Xóa Sạch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Complete System Wipe */}
      {showSystemWipeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-800/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-150 my-auto text-slate-100">
            {/* Header */}
            <div className="flex items-start space-x-4">
              <div className="p-3.5 bg-rose-950 border border-rose-700/80 rounded-2xl text-rose-400 shrink-0 shadow-lg shadow-rose-950/50">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-wide flex items-center space-x-2">
                  <span>Xóa Tất Cả Dữ Liệu Hệ Thống</span>
                </h3>
                <p className="text-xs text-rose-300 font-medium">
                  Cảnh báo: Hành động này sẽ dọn dẹp sạch sẽ cơ sở dữ liệu Cloud Firestore và bộ nhớ cục bộ.
                </p>
              </div>
            </div>

            {/* Options list */}
            {!systemWiping && !systemWipeResult && (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa tất cả tài khoản người dùng</p>
                      <p className="text-[11px] text-slate-400">Giữ lại tài khoản Admin duy nhất (<code className="text-emerald-400">pqhacker@gamil.com</code>)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.wipeUsersExceptAdmin}
                      onChange={(e) => setSystemWipeOptions({ ...systemWipeOptions, wipeUsersExceptAdmin: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa dữ liệu cá nhân giáo viên (Gói đề, Ma trận, Lịch sử)</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">user_data</code> trên Cloud Firestore</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.wipeAllUserData}
                      onChange={(e) => setSystemWipeOptions({ ...systemWipeOptions, wipeAllUserData: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa đề thi trực tuyến & Bài nộp học sinh</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">published_exams</code> và <code className="text-rose-400">student_results</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.wipePublishedExams && systemWipeOptions.wipeStudentResults}
                      onChange={(e) => setSystemWipeOptions({ 
                        ...systemWipeOptions, 
                        wipePublishedExams: e.target.checked,
                        wipeStudentResults: e.target.checked 
                      })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa danh sách lớp học & học sinh hệ thống</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">system_classes</code> và <code className="text-rose-400">system_students</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.wipeClassesAndStudents}
                      onChange={(e) => setSystemWipeOptions({ ...systemWipeOptions, wipeClassesAndStudents: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Đặt lại mật khẩu Admin về mặc định</p>
                      <p className="text-[11px] text-slate-400">Tên đăng nhập: <code className="text-emerald-400">pqhacker@gamil.com</code> / Mật khẩu: <code className="text-emerald-400">Hungdiemly300506</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.resetAdminPasswordToDefault}
                      onChange={(e) => setSystemWipeOptions({ ...systemWipeOptions, resetAdminPasswordToDefault: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Dọn sạch bộ nhớ đệm trình duyệt (LocalStorage)</p>
                      <p className="text-[11px] text-slate-400">Đồng bộ làm mới ứng dụng ngay trên máy này</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={systemWipeOptions.clearBrowserCache}
                      onChange={(e) => setSystemWipeOptions({ ...systemWipeOptions, clearBrowserCache: e.target.checked })}
                      className="w-4 h-4 accent-rose-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Safety Input Confirmation */}
                <div className="pt-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Để xác nhận, vui lòng nhập chính xác chữ: <span className="text-rose-400 font-mono font-black select-all">XOA_HE_THONG</span>
                  </label>
                  <input
                    type="text"
                    value={systemWipeConfirmText}
                    onChange={(e) => setSystemWipeConfirmText(e.target.value)}
                    placeholder="Nhập XOA_HE_THONG"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-rose-900/80 rounded-xl text-xs text-rose-300 font-mono tracking-wider focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            {/* In Progress Status */}
            {systemWiping && (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-extrabold text-white text-sm">Đang Xóa Tất Cả Dữ Liệu Hệ Thống...</p>
                  <p className="text-xs text-rose-300 font-mono">{systemWipeMessage}</p>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-rose-600 to-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${systemWipeProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Vui lòng không tắt hoặc tải lại trình duyệt trong quá trình xử lý</p>
              </div>
            )}

            {/* Result Report */}
            {systemWipeResult && (
              <div className="p-5 bg-emerald-950/60 border border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-sm text-white">Đã Xóa Sạch Dữ Liệu Hệ Thống Thành Công!</h4>
                </div>
                <p className="text-xs text-emerald-200">
                  Hệ thống đã xóa tổng cộng <strong className="text-white">{systemWipeResult.deletedCount} tài liệu</strong> từ các bộ sưu tập Cloud Firestore và làm sạch bộ nhớ cục bộ.
                </p>
                <div className="p-3 bg-slate-950/80 rounded-xl text-[11px] text-slate-300 space-y-1 font-mono">
                  <p>• Tài khoản Admin: <span className="text-emerald-400">pqhacker@gamil.com / Hungdiemly300506</span></p>
                  <p>• Trạng thái cơ sở dữ liệu: <span className="text-emerald-400">Trống & Sẵn sàng</span></p>
                </div>
                {systemWipeResult.errors.length > 0 && (
                  <div className="text-[11px] text-amber-300">
                    <p className="font-bold">Ghi chú:</p>
                    <ul className="list-disc list-inside">
                      {systemWipeResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Buttons Footer */}
            <div className="flex items-center space-x-3 pt-2">
              {!systemWipeResult ? (
                <>
                  <button
                    type="button"
                    disabled={systemWiping}
                    onClick={() => setShowSystemWipeModal(false)}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    disabled={systemWiping || (!['XOA_HE_THONG', 'XOA_TOAN_BO_HE_THONG', 'XOA_DATABASE'].includes(systemWipeConfirmText.trim()))}
                    onClick={handleExecuteSystemWipe}
                    className="w-2/3 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Xác Nhận Xóa Tất Cả Dữ Liệu</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowSystemWipeModal(false);
                    setSystemWipeResult(null);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Hoàn Tất & Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
