import React, { useEffect, useState } from 'react';
import { 
  AppUser, 
  userService 
} from '../services/userService';
import { UserDataSync } from '../services/userDataSync';
import { useAuth } from '../auth/useAuth';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Shield, 
  UserCheck, 
  UserX, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Calendar,
  Eye,
  EyeOff,
  User,
  Database,
  Flame,
  RefreshCw,
  HardDrive,
  AlertOctagon,
  Check,
  Copy,
  GraduationCap,
  School,
  Cloud,
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  ShieldCheck,
  KeyRound,
  FileText
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'user'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL');

  // Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'user' as 'admin' | 'user',
    active: true,
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Confirm State
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Wipe / Reset Database Modal State
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);
  const [wipeStatusMessage, setWipeStatusMessage] = useState('');
  const [wipeResult, setWipeResult] = useState<{ deletedCount: number; errors: string[] } | null>(null);
  const [wipeOptions, setWipeOptions] = useState({
    wipeUsersExceptAdmin: true,
    wipeAllUserData: true,
    wipePublishedExams: true,
    wipeStudentResults: true,
    wipeClassesAndStudents: true,
    resetAdminPasswordToDefault: true,
    clearBrowserCache: true,
  });

  // State for toggling password visibility in table rows
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});

  // Teacher Data Inspector State
  const [inspectingUser, setInspectingUser] = useState<AppUser | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [loadingInspect, setLoadingInspect] = useState<boolean>(false);

  // Copy Feedback State
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyTeacherAccount = (u: AppUser) => {
    const rawPass = u.password || '(Liên hệ Admin để đặt lại mật khẩu)';
    const roleText = u.role === 'admin' ? 'Quản trị viên (Admin)' : 'Giáo viên (Teacher)';
    const appUrl = window.location.origin;

    const message = `📋 THÔNG TIN TÀI KHOẢN GIÁO VIÊN - VISION TEST AI
--------------------------------------------------
• Kính gửi Thầy/Cô: ${u.displayName || u.username}
• Tên đăng nhập: ${u.username}
• Mật khẩu: ${rawPass}
• Vai trò: ${roleText}
• Quyền hạn:
  + Khởi tạo đề thi trắc nghiệm & tự luận bằng AI chuẩn CV 7991 của Bộ GD&ĐT
  + Xuất file Word (.docx) chuẩn hóa, PDF, Excel bảng điểm
  + Phát hành và quản lý kho đề thi trực tuyến, cấp mã làm bài cho học sinh
  + Quản lý danh sách lớp học và học sinh cá nhân
  + Thống kê kết quả thi, bảng điểm học sinh do chính mình tạo
• Lưu ý: Dữ liệu của Thầy/Cô được lưu trữ trên Cloud Firestore an toàn, hoàn toàn riêng biệt và tự động đồng bộ trên mọi máy tính và trình duyệt.
• Link truy cập: ${appUrl}
--------------------------------------------------`;

    navigator.clipboard.writeText(message);
    const uKey = u.id || u.username;
    setCopiedUserId(uKey);
    setTimeout(() => {
      setCopiedUserId(null);
    }, 3000);
  };

  const handleInspectUserData = async (u: AppUser) => {
    setInspectingUser(u);
    setLoadingInspect(true);
    setInspectData(null);
    try {
      const targetId = u.id || u.username || 'admin';
      const docRef = doc(db, 'user_data', targetId);
      let dataFound: any = null;

      try {
        const snap = await Promise.race([
          getDoc(docRef),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
        ]);
        if (snap && snap.exists()) {
          dataFound = snap.data();
        }
      } catch (e) {
        console.warn('Bỏ qua lỗi Firestore offline khi kiểm tra data, đọc cache LocalStorage:', e);
      }

      if (!dataFound) {
        const local = UserDataSync.getLocalUserData(targetId);
        if (
          (local.examHistory && local.examHistory.length > 0) || 
          (local.classes && local.classes.length > 0) || 
          (local.onlineExams && local.onlineExams.length > 0)
        ) {
          dataFound = local;
        }
      }

      if (dataFound) {
        setInspectData(dataFound);
      } else {
        setInspectData({
          examHistory: [],
          onlineExams: [],
          classes: [],
          students: [],
          questionBank: [],
          note: 'Chưa có dữ liệu khởi tạo trên Firestore (sẽ tự động tạo khi giáo viên đăng nhập lần đầu).'
        });
      }
    } catch (err: any) {
      console.warn('Lỗi đọc dữ liệu giáo viên:', err);
      setInspectData({ error: 'Không thể tải dữ liệu: ' + (err.message || 'Lỗi mạng') });
    } finally {
      setLoadingInspect(false);
    }
  };

  // Subscribe to real-time users list
  useEffect(() => {
    setLoading(true);
    const unsubscribe = userService.subscribeUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter & Search logic
  const filteredUsers = users.filter((u) => {
    const searchTarget = `${u.username || ''} ${u.displayName || ''} ${u.email || ''}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'active' && u.active) ||
      (statusFilter === 'inactive' && !u.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      displayName: '',
      role: 'user',
      active: true,
    });
    setShowFormPassword(false);
    setFormError('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (targetUser: AppUser) => {
    setEditingUser(targetUser);
    setFormData({
      username: targetUser.username || targetUser.email || '',
      password: '', // Keep blank if unchanged
      displayName: targetUser.displayName || '',
      role: targetUser.role,
      active: targetUser.active,
    });
    setShowFormPassword(false);
    setFormError('');
    setShowAddModal(true);
  };

  // Save (Add or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim()) {
      setFormError('Vui lòng nhập tên đăng nhập');
      return;
    }

    if (!editingUser) {
      if (!formData.password || formData.password.trim().length < 4) {
        setFormError('Mật khẩu phải có ít nhất 4 ký tự');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingUser) {
        const targetId = editingUser.id || editingUser.username || 'admin';
        await userService.updateUser(targetId, {
          username: formData.username.trim(),
          displayName: formData.displayName.trim() || undefined,
          role: formData.role,
          active: formData.active,
          password: formData.password.trim() ? formData.password.trim() : undefined,
        });
      } else {
        await userService.addUser({
          username: formData.username.trim(),
          password: formData.password.trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          active: formData.active,
        });
      }
      setShowAddModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Quick Lock / Unlock
  const handleToggleLock = async (targetUser: AppUser) => {
    const targetId = targetUser.id || targetUser.username || 'admin';
    try {
      await userService.updateUser(targetId, {
        active: !targetUser.active,
      });
    } catch (err: any) {
      alert('Không thể thay đổi trạng thái tài khoản: ' + err.message);
    }
  };

  // Toggle Quick Role Switch (Admin <-> User)
  const handleToggleRole = async (targetUser: AppUser) => {
    if (currentUser?.username === targetUser.username) {
      if (!confirm('Bạn có chắc muốn tự đổi vai trò của tài khoản hiện tại không?')) return;
    }
    const targetId = targetUser.id || targetUser.username || 'admin';
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await userService.updateUser(targetId, {
        role: newRole,
      });
    } catch (err: any) {
      alert('Không thể đổi vai trò: ' + err.message);
    }
  };

  // Confirm Delete
  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      const targetId = deletingUser.id || deletingUser.username || 'admin';
      await userService.deleteUser(targetId);
      setDeletingUser(null);
    } catch (err: any) {
      alert('Không thể xóa tài khoản: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Execute Database Wipe
  const handleExecuteWipeDatabase = async () => {
    if (wipeConfirmText.trim() !== 'XOA_DATABASE') {
      alert('Vui lòng nhập chính xác "XOA_DATABASE" để xác nhận.');
      return;
    }

    setWiping(true);
    setWipeProgress(5);
    setWipeStatusMessage('Đang kết nối Cloud Firestore...');
    setWipeResult(null);

    try {
      const result = await userService.wipeEntireFirestoreDatabase(
        wipeOptions,
        (msg, pct) => {
          setWipeStatusMessage(msg);
          setWipeProgress(pct);
        }
      );
      setWipeResult(result);
    } catch (err: any) {
      alert('Lỗi trong quá trình xóa dữ liệu: ' + err.message);
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Quản Trị Hệ Thống & Phân Quyền Giáo Viên
                </h2>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 font-black px-2.5 py-0.5 rounded-full border border-indigo-700">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấp tài khoản & phân quyền cho giáo viên khác sử dụng ứng dụng. Mỗi người dùng sở hữu dữ liệu riêng biệt trên Cloud Firestore, truy cập mọi lúc, mọi nơi trên mọi trình duyệt.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setWipeConfirmText('');
              setWipeResult(null);
              setWipeStatusMessage('');
              setWipeProgress(0);
              setShowWipeModal(true);
            }}
            className="px-4 py-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer active:scale-95 shrink-0"
            title="Xóa tất cả dữ liệu hệ thống (Cloud Firestore & LocalStorage)"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Xóa Dữ Liệu Firestore</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cấp Tài Khoản Giáo Viên Mới</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Tổng tài khoản</p>
            <p className="text-lg font-black text-white">{users.length}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Giáo viên (User)</p>
            <p className="text-lg font-black text-teal-400">{users.filter((u) => u.role === 'user').length}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Quản trị viên (Admin)</p>
            <p className="text-lg font-black text-purple-400">{users.filter((u) => u.role === 'admin').length}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Đang hoạt động</p>
            <p className="text-lg font-black text-emerald-400">{users.filter((u) => u.active).length}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-md col-span-2 lg:col-span-1">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
            <Cloud className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Cloud Firestore</p>
            <p className="text-xs font-bold text-cyan-300">Đồng bộ riêng 100%</p>
          </div>
        </div>
      </div>

      {/* Permissions & Data Isolation Explainer Card */}
      <div className="p-4 md:p-5 bg-slate-900/80 border border-indigo-950/80 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Quy Định Phân Quyền & Đảm Bảo Độc Lập Dữ Liệu Người Dùng</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-teal-900/40 space-y-1">
            <div className="flex items-center space-x-1.5 text-teal-400 font-bold">
              <GraduationCap className="w-4 h-4" />
              <span>Quyền hạn của Giáo Viên (Teacher / User):</span>
            </div>
            <ul className="text-slate-300 space-y-1 pl-5 list-disc text-[11px] leading-relaxed">
              <li>Tạo đề kiểm tra bằng AI theo ma trận & đặc tả chuẩn CV 7991 của Bộ GD&ĐT.</li>
              <li>Xuất file Word (.docx), PDF, Excel đề thi & đáp án chuẩn hóa.</li>
              <li>Phát hành đề thi trực tuyến (Online), quản lý mã đề và giám sát gian lận.</li>
              <li>Quản lý lớp học và danh sách học sinh của riêng mình.</li>
              <li>Xem thống kê điểm số & bài làm của học sinh do chính mình tạo ra.</li>
              <li><strong>Độc lập dữ liệu:</strong> Dữ liệu lưu tại <code className="text-teal-400">user_data/{'{userId}'}</code>, không bị trùng lặp với giáo viên khác và tự động đồng bộ trên mọi trình duyệt.</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-indigo-900/40 space-y-1">
            <div className="flex items-center space-x-1.5 text-indigo-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>Quyền hạn của Quản Trị Viên (Admin):</span>
            </div>
            <ul className="text-slate-300 space-y-1 pl-5 list-disc text-[11px] leading-relaxed">
              <li>Toàn quyền sử dụng mọi tính năng như Giáo viên.</li>
              <li>Quản trị hệ thống: Thêm mới, chỉnh sửa, đổi mật khẩu và xóa tài khoản giáo viên.</li>
              <li>Phân quyền vai trò (Admin / User) và Khóa / Mở khóa quyền truy cập.</li>
              <li>Xem chi tiết tài nguyên và đề thi lưu trên Cloud Firestore của từng giáo viên.</li>
              <li>Quản lý, bảo trì và dọn dẹp cơ sở dữ liệu Cloud Firestore khi cần thiết.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên đăng nhập hoặc Họ tên giáo viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 dark:bg-slate-900 border border-slate-700/80 rounded-2xl text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 py-1.5">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium shrink-0">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-transparent text-xs text-slate-200 font-bold focus:outline-hidden w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">Tất cả vai trò ({users.length})</option>
            <option value="admin" className="bg-slate-900 text-slate-200">Quản trị viên - Admin ({users.filter(u => u.role === 'admin').length})</option>
            <option value="user" className="bg-slate-900 text-slate-200">Giáo viên - User ({users.filter(u => u.role === 'user').length})</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 py-1.5">
          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 font-medium shrink-0">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent text-xs text-slate-200 font-bold focus:outline-hidden w-full cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">Tất cả trạng thái</option>
            <option value="active" className="bg-slate-900 text-slate-200">Đang hoạt động ({users.filter(u => u.active).length})</option>
            <option value="inactive" className="bg-slate-900 text-slate-200">Đã khóa / Tạm ngưng ({users.filter(u => !u.active).length})</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-slate-900/90 dark:bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Đang tải danh sách tài khoản từ Firestore...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <UserX className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-400">Không tìm thấy tài khoản phù hợp</p>
            <p className="text-xs text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc bấm "Cấp Tài Khoản Giáo Viên Mới".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Tên đăng nhập & Họ tên</th>
                  <th className="px-5 py-4">Mật khẩu</th>
                  <th className="px-5 py-4">Vai trò & Phân quyền</th>
                  <th className="px-5 py-4">Quyền hạn ứng dụng</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-center">Dữ liệu Cloud</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.username === u.username;
                  const uKey = u.id || u.username;
                  const isCopied = copiedUserId === uKey;

                  return (
                    <tr key={uKey} className="hover:bg-slate-800/40 transition-colors">
                      {/* Username & Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-teal-950 text-teal-300 border border-teal-800'
                          }`}>
                            {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-emerald-400 text-xs">{u.username}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-emerald-950 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded border border-emerald-800">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-100 text-[11px]">
                              {u.displayName || 'Giáo viên bộ môn'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Password Preview & Copy */}
                      <td className="px-5 py-4 font-mono text-slate-400 text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300 font-mono inline-block min-w-[70px] text-center">
                            {visiblePasswordIds[uKey] ? (u.password || '••••••') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(uKey)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title={visiblePasswordIds[uKey] ? "Ẩn mật khẩu" : "Xem mật khẩu"}
                          >
                            {visiblePasswordIds[uKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyTeacherAccount(u)}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'text-slate-400 hover:text-teal-400 hover:bg-slate-800'
                            }`}
                            title="Sao chép toàn bộ thông tin đăng nhập gửi cho giáo viên"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {isCopied && (
                          <span className="text-[9px] text-emerald-400 font-bold block mt-0.5 animate-in fade-in">
                            Đã sao chép!
                          </span>
                        )}
                      </td>

                      {/* Role & Quick Switch */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleRole(u)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-extrabold inline-flex items-center space-x-1.5 transition-all cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900'
                              : 'bg-teal-950 text-teal-300 border border-teal-800 hover:bg-teal-900'
                          }`}
                          title="Bấm để đổi vai trò giữa Giáo viên và Quản trị viên"
                        >
                          <Shield className="w-3 h-3" />
                          <span>{u.role === 'admin' ? 'Quản trị viên (Admin)' : 'Giáo viên (Teacher)'}</span>
                        </button>
                      </td>

                      {/* Explicit Permissions Tag */}
                      <td className="px-5 py-4">
                        {u.role === 'admin' ? (
                          <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-lg font-bold inline-flex items-center space-x-1">
                            <Shield className="w-2.5 h-2.5 text-purple-400" />
                            <span>Toàn quyền quản trị & Phân quyền</span>
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] bg-teal-950/80 text-teal-300 border border-teal-800/80 px-2 py-0.5 rounded-lg font-bold inline-flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5 text-teal-400" />
                              <span>Ra đề AI • Đề online • Lớp & HS riêng</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleLock(u)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-extrabold inline-flex items-center space-x-1.5 transition-all cursor-pointer ${
                            u.active
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                              : 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                          }`}
                          title="Bấm để Khóa / Mở khóa tài khoản"
                        >
                          {u.active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Đang hoạt động</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>Đã khóa</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Cloud Data Inspector */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleInspectUserData(u)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-950 hover:text-indigo-300 text-slate-300 border border-slate-700 hover:border-indigo-700 rounded-xl text-[10px] font-bold transition-all inline-flex items-center space-x-1 cursor-pointer"
                          title="Xem dữ liệu đề thi, lớp học đã lưu trên Cloud Firestore của giáo viên này"
                        >
                          <Cloud className="w-3 h-3 text-indigo-400" />
                          <span>Xem dữ liệu</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Sửa thông tin / Đổi mật khẩu"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                            title={isSelf ? 'Không thể xóa tài khoản hiện tại' : 'Xóa tài khoản'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danger Zone: Cloud Firestore Database Reset */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-rose-900/40 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800 rounded-xl">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Khu Vực Quản Trị: Dọn Dẹp & Xóa Sạch Cloud Firestore Database
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Tính năng dành cho Quản trị viên cấp cao. Cho phép bạn dọn dẹp và xóa sạch các bảng dữ liệu trên Cloud Firestore (đề thi, bài làm học sinh, danh sách lớp, ngân hàng câu hỏi, tài khoản phụ) và khôi phục hệ thống về trạng thái ban đầu một cách an toàn.
            </p>
          </div>

          <button
            onClick={() => {
              setWipeConfirmText('');
              setWipeResult(null);
              setWipeStatusMessage('');
              setWipeProgress(0);
              setShowWipeModal(true);
            }}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Flame className="w-4 h-4" />
            <span>Mở Công Cụ Xóa Sạch Database</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tài khoản</p>
            <p className="text-xs font-bold text-slate-300 mt-0.5">Xóa tài khoản phụ, giữ Admin</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dữ liệu đề thi</p>
            <p className="text-xs font-bold text-slate-300 mt-0.5">Xóa sạch `user_data`</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Thi trực tuyến</p>
            <p className="text-xs font-bold text-slate-300 mt-0.5">Xóa đề thi & bảng điểm</p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bảo mật</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">Xác nhận mã bảo vệ</p>
          </div>
        </div>
      </div>

      {/* Cloud Firestore Database Wipe / Reset Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-rose-800/60 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800 rounded-xl">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Xóa Sạch Cloud Firestore Database
                  </h3>
                  <p className="text-[11px] text-slate-400">Thiết lập lại toàn bộ cơ sở dữ liệu trên đám mây</p>
                </div>
              </div>
              {!wiping && (
                <button
                  onClick={() => setShowWipeModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-2xl flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-200 leading-relaxed">
                <strong className="text-rose-100 block font-bold mb-0.5">CẢNH BÁO NGUY HIỂM:</strong>
                Thao tác này sẽ kết nối trực tiếp đến Cloud Firestore Database và xóa vĩnh viễn các tài liệu được chọn. Hành động này <strong>KHÔNG THỂ HOÀN TÁC</strong>.
              </div>
            </div>

            {/* Options Selection */}
            {!wiping && !wipeResult && (
              <div className="space-y-3">
                <p className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Chọn các mục cần dọn dẹp:
                </p>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa tất cả tài khoản người dùng / giáo viên</p>
                      <p className="text-[11px] text-slate-400">Giữ lại duy nhất tài khoản Quản trị viên (admin)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.wipeUsersExceptAdmin}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, wipeUsersExceptAdmin: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa toàn bộ đề thi & Ngân hàng câu hỏi</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">user_data</code> của toàn bộ người dùng</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.wipeAllUserData}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, wipeAllUserData: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa kỳ thi trực tuyến & Bài nộp học sinh</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">published_exams</code> và <code className="text-rose-400">student_results</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.wipePublishedExams && wipeOptions.wipeStudentResults}
                      onChange={(e) => setWipeOptions({ 
                        ...wipeOptions, 
                        wipePublishedExams: e.target.checked,
                        wipeStudentResults: e.target.checked 
                      })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Xóa danh sách lớp học & học sinh hệ thống</p>
                      <p className="text-[11px] text-slate-400">Bộ sưu tập <code className="text-rose-400">system_classes</code> và <code className="text-rose-400">system_students</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.wipeClassesAndStudents}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, wipeClassesAndStudents: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Đặt lại mật khẩu Admin về mặc định</p>
                      <p className="text-[11px] text-slate-400">Tên đăng nhập: <code className="text-emerald-400">pqhacker@gamil.com</code> / Mật khẩu: <code className="text-emerald-400">Hungdiemly300506</code></p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.resetAdminPasswordToDefault}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, resetAdminPasswordToDefault: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">Dọn sạch bộ nhớ đệm trình duyệt (LocalStorage)</p>
                      <p className="text-[11px] text-slate-400">Đồng bộ dữ liệu trống ngay lập tức trên máy này</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wipeOptions.clearBrowserCache}
                      onChange={(e) => setWipeOptions({ ...wipeOptions, clearBrowserCache: e.target.checked })}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </label>
                </div>

                {/* Safety Input Confirmation */}
                <div className="pt-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Để xác nhận, vui lòng nhập chính xác chữ: <span className="text-rose-400 font-mono font-black select-all">XOA_DATABASE</span>
                  </label>
                  <input
                    type="text"
                    value={wipeConfirmText}
                    onChange={(e) => setWipeConfirmText(e.target.value)}
                    placeholder="Nhập XOA_DATABASE"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-rose-900/80 rounded-xl text-xs text-rose-300 font-mono tracking-wider focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            {/* In Progress Status */}
            {wiping && (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
                <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="font-extrabold text-white text-sm">Đang Xóa Sạch Database...</p>
                  <p className="text-xs text-rose-300 font-mono">{wipeStatusMessage}</p>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-rose-600 to-amber-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${wipeProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Vui lòng không tắt hoặc tải lại trang trong khi đang dọn dẹp</p>
              </div>
            )}

            {/* Result Report */}
            {wipeResult && (
              <div className="p-5 bg-emerald-950/60 border border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-sm text-white">Đã Xóa Sạch Cloud Firestore Thành Công!</h4>
                </div>
                <p className="text-xs text-emerald-200">
                  Hệ thống đã xóa tổng cộng <strong className="text-white">{wipeResult.deletedCount} tài liệu</strong> từ các bộ sưu tập Cloud Firestore.
                </p>
                <div className="p-3 bg-slate-950/80 rounded-xl text-[11px] text-slate-300 space-y-1 font-mono">
                  <p>• Tài khoản Admin: <span className="text-emerald-400">pqhacker@gamil.com / Hungdiemly300506</span></p>
                  <p>• Dữ liệu LocalStorage: <span className="text-emerald-400">Đã làm mới sạch sẽ</span></p>
                </div>
                {wipeResult.errors.length > 0 && (
                  <div className="text-[11px] text-amber-300">
                    <p className="font-bold">Ghi chú:</p>
                    <ul className="list-disc list-inside">
                      {wipeResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Buttons Footer */}
            <div className="flex items-center space-x-3 pt-2">
              {!wipeResult ? (
                <>
                  <button
                    type="button"
                    disabled={wiping}
                    onClick={() => setShowWipeModal(false)}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    disabled={wiping || wipeConfirmText.trim() !== 'XOA_DATABASE'}
                    onClick={handleExecuteWipeDatabase}
                    className="w-2/3 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {wiping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        <span>Xác Nhận Xóa Sạch Database</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowWipeModal(false);
                    window.location.reload();
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Hoàn Tất & Tải Lại Trang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal - Redesigned with responsive layout, scrollable body and sticky footer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[min(90vh,680px)] my-auto overflow-hidden">
            {/* Modal Header (Fixed / Non-scrollable) */}
            <div className="px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl border ${
                  editingUser 
                    ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800/80' 
                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                }`}>
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">
                    {editingUser ? 'Chỉnh Sửa Tài Khoản' : 'Cấp Tài Khoản Người Dùng Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {editingUser 
                      ? `Cập nhật thông tin & phân quyền cho "${editingUser.username}"` 
                      : 'Tạo tài khoản giáo viên với kho dữ liệu độc lập trên Cloud'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">
                {formError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 2-Column Grid: Username & Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Username Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                        <span>Tên đăng nhập</span>
                        <span className="text-rose-400">*</span>
                      </label>
                      {editingUser && (
                        <span className="text-[10px] text-emerald-400 font-medium">Bảo toàn dữ liệu</span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="VD: giaovien1"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono transition-colors"
                    />
                    <p className="text-[10px] text-slate-500">
                      Tên viết liền không dấu dùng khi đăng nhập.
                    </p>
                  </div>

                  {/* Display Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">
                      Họ và Tên Giáo viên
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="VD: Thầy Nguyễn Văn A"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 transition-colors"
                    />
                    <p className="text-[10px] text-slate-500">
                      Tên hiển thị trên bài thi và báo cáo lớp.
                    </p>
                  </div>
                </div>

                {/* 2-Column Grid: Password & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Password Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                      <span>{editingUser ? 'Mật khẩu mới' : 'Mật khẩu'}</span>
                      {!editingUser && <span className="text-rose-400">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingUser ? 'Để trống nếu không đổi' : 'Tối thiểu 4 ký tự'}
                        className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                        tabIndex={-1}
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {editingUser ? 'Bỏ trống để giữ mật khẩu hiện tại.' : 'Mật khẩu cấp ban đầu cho người dùng.'}
                    </p>
                  </div>

                  {/* Role Selection Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                      <span>Vai trò & Quyền hạn</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer transition-colors"
                    >
                      <option value="user">Giáo viên (Teacher) - Ra đề AI, Đề Online, Lớp & HS riêng</option>
                      <option value="admin">Quản trị viên (Admin) - Toàn quyền quản trị hệ thống</option>
                    </select>
                    <p className="text-[10px] text-slate-500">
                      {formData.role === 'admin' ? 'Có quyền quản lý tài khoản & xóa DB.' : 'Chỉ quản lý dữ liệu giảng dạy cá nhân.'}
                    </p>
                  </div>
                </div>

                {/* Role Quick Selector Cards */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'user' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.role === 'user'
                        ? 'bg-teal-950/40 border-teal-500/80 text-teal-200 shadow-sm shadow-teal-950'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <GraduationCap className={`w-3.5 h-3.5 ${formData.role === 'user' ? 'text-teal-400' : 'text-slate-500'}`} />
                      <span>Giáo viên (User)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Ra đề AI, đề trực tuyến, kho câu hỏi & lớp học riêng biệt.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.role === 'admin'
                        ? 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200 shadow-sm shadow-indigo-950'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs">
                      <Shield className={`w-3.5 h-3.5 ${formData.role === 'admin' ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span>Quản trị viên (Admin)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Toàn quyền quản trị hệ thống, thêm/sửa/xóa tài khoản.
                    </p>
                  </button>
                </div>

                {/* Data Isolation Guarantee Callout */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-emerald-400 font-bold">Dữ liệu phân vùng độc lập 100%:</p>
                    <p className="leading-relaxed">
                      Mỗi người dùng sở hữu kho lưu trữ riêng biệt trên Cloud Firestore. Đề thi, lớp học và kết quả học sinh không trùng lặp và truy cập được ở mọi trình duyệt.
                    </p>
                  </div>
                </div>

                {/* Active Switch */}
                <div 
                  onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-slate-200">Kích hoạt tài khoản</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        formData.active 
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}>
                        {formData.active ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Cho phép người dùng đăng nhập ngay lập tức</p>
                  </div>
                  <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    formData.active ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      formData.active ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>

              {/* STICKY FOOTER (Permanently Visible Action Buttons) */}
              <div className="px-5 py-3.5 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  (*) Các trường bắt buộc nhập
                </span>
                <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 sm:flex-initial px-5 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-slate-950" />
                        <span>{editingUser ? 'Cập Nhật Tài Khoản' : 'Tạo Tài Khoản Ngay'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Cloud Data Inspector Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-indigo-800/80 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-xl">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Dữ Liệu Đám Mây Cloud Firestore
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tài khoản: <span className="font-mono text-emerald-400">{inspectingUser.username}</span> ({inspectingUser.displayName || 'Giáo viên'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {loadingInspect ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Đang truy xuất dữ liệu từ Cloud Firestore...</p>
              </div>
            ) : inspectData ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Đường dẫn Firestore:</span>
                  </div>
                  <span className="font-mono text-xs text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900">
                    user_data/{inspectingUser.id || inspectingUser.username}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Đề thi đã sinh (AI)</span>
                    </div>
                    <p className="text-lg font-black text-white">
                      {Array.isArray(inspectData.examHistory) ? inspectData.examHistory.length : 0} đề thi
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <Cloud className="w-3.5 h-3.5 text-teal-400" />
                      <span>Đề thi Online phát hành</span>
                    </div>
                    <p className="text-lg font-black text-teal-400">
                      {Array.isArray(inspectData.onlineExams) ? inspectData.onlineExams.length : 0} đề online
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <School className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Lớp học quản lý</span>
                    </div>
                    <p className="text-lg font-black text-white">
                      {Array.isArray(inspectData.classes) ? inspectData.classes.length : 0} lớp học
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Danh sách học sinh</span>
                    </div>
                    <p className="text-lg font-black text-white">
                      {Array.isArray(inspectData.students) ? inspectData.students.length : 0} học sinh
                    </p>
                  </div>
                </div>

                {/* Question Bank & Online Codes List */}
                {Array.isArray(inspectData.onlineExams) && inspectData.onlineExams.length > 0 && (
                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-200">Mã đề thi Online đang mở của giáo viên:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectData.onlineExams.map((oe: any, idx: number) => (
                        <span key={idx} className="font-mono text-xs bg-indigo-950 text-indigo-300 border border-indigo-700 px-2.5 py-0.5 rounded-lg font-bold">
                          {oe.code} ({oe.title || 'Đề thi'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(inspectData.classes) && inspectData.classes.length > 0 && (
                  <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-200">Các lớp học trực thuộc:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectData.classes.map((cls: any, idx: number) => (
                        <span key={idx} className="text-xs bg-teal-950 text-teal-300 border border-teal-800 px-2.5 py-0.5 rounded-lg font-medium">
                          {cls.name} ({cls.grade || 'Khối'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Đồng bộ đa trình duyệt:</span>
                    <span className="text-emerald-400 font-bold">✓ Đã bật tự động</span>
                  </div>
                  {inspectData.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span>Lần cập nhật gần nhất:</span>
                      <span className="text-slate-300 font-mono">{new Date(inspectData.updatedAt).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl my-auto">
            <div className="w-12 h-12 bg-rose-950 text-rose-400 border border-rose-800 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Xác Nhận Xóa Tài Khoản</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bạn có chắc chắn muốn xóa tài khoản <strong className="text-rose-400">{deletingUser.username}</strong> không?
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Xóa Ngay</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
