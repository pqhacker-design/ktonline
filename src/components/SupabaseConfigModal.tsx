import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  UploadCloud, 
  X, 
  ShieldCheck, 
  FileText,
  Server,
  Layers
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  isSupabaseConfigured, 
  testSupabaseConnection 
} from '../supabase/supabaseClient';
import { SupabaseService } from '../services/supabaseService';
import { OnlineExamService } from '../services/onlineExamService';
import { StorageEngine } from '../services/storageEngine';
import { userService, AppUser } from '../services/userService';
import { UserDataSync } from '../services/userDataSync';

import { SUPABASE_SCHEMA_SQL } from '../supabase/schemaSql';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; missingTables?: string[] } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{ stage: string; percent: number } | null>(null);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setIsConnected(isSupabaseConfigured());
      setTestResult(null);
      setMigrationSummary(null);
      setMigrationProgress(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleCopySql = async () => {
    const sql = SUPABASE_SCHEMA_SQL;
    let copied = false;

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(sql);
        copied = true;
      } catch {}
    }

    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = sql;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {}
    }

    if (copied) {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } else {
      setShowSqlPreview(true);
      alert('Trình duyệt chưa cấp quyền sao chép tự động. Hệ thống đã mở khung xem mã SQL bên dưới để bạn bôi đen và copy.');
    }
  };

  const handleTestConnection = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập cả Supabase URL và Anon API Key trước khi kiểm tra.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection({ url: url.trim(), anonKey: anonKey.trim() });
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      setIsConnected(true);
    }
  };

  const handleSave = async () => {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      alert('Vui lòng nhập đầy đủ Supabase Project URL và Anon API Key.');
      return;
    }

    // Save client-side
    setSupabaseConfig({ url: cleanUrl, anonKey: cleanKey });

    // Sync to server backend
    try {
      await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
      });
    } catch {}

    setIsConnected(true);
    alert('Đã lưu cấu hình Supabase thành công! Hệ thống sẽ ưu tiên lưu trữ và đồng bộ qua Supabase.');
    onSuccess?.();
    onClose();
  };

  const handleDisconnect = async () => {
    if (!confirm('Bạn có chắc muốn ngắt kết nối Supabase và quay lại lưu trữ Firestore / LocalStorage không?')) {
      return;
    }
    setSupabaseConfig(null);
    setUrl('');
    setAnonKey('');
    setIsConnected(false);
    setTestResult(null);
    try {
      await fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '', anonKey: '' }),
      });
    } catch {}
    alert('Đã gỡ bỏ cấu hình Supabase.');
  };

  const handleMigrateAll = async () => {
    if (!isSupabaseConfigured() && !isConnected) {
      alert('Vui lòng kiểm tra và lưu cấu hình kết nối Supabase thành công trước khi chuyển dữ liệu.');
      return;
    }

    if (!confirm('Hệ thống sẽ tổng hợp toàn bộ Người dùng, Lớp học, Học sinh, Đề thi, Ngân hàng câu hỏi và Kết quả làm bài hiện tại để tải lên cơ sở dữ liệu Supabase. Bắt đầu chuyển ngay?')) {
      return;
    }

    setIsMigrating(true);
    setMigrationSummary(null);
    setMigrationProgress({ stage: 'Đang chuẩn bị dữ liệu nguồn...', percent: 5 });

    try {
      // 1. Thu thập dữ liệu người dùng
      let usersList: AppUser[] = [];
      try {
        const snap = await userService.getAllUsers();
        usersList = snap;
      } catch (uErr) {
        console.warn('Lỗi lấy danh sách users:', uErr);
      }
      if (usersList.length === 0) {
        const defaultAdmin = await userService.ensureDefaultAdmin();
        usersList = [defaultAdmin];
      }

      // 2. Thu thập danh sách Lớp học từ cả API và Local
      const localClasses = OnlineExamService.getLocalClasses();
      let classesList: any[] = [...localClasses];
      try {
        const remoteRes = await OnlineExamService.getClasses(true);
        const remoteArray = Array.isArray(remoteRes) ? remoteRes : remoteRes?.classes;
        if (remoteArray && remoteArray.length > 0) {
          const map = new Map();
          localClasses.forEach((c) => map.set(c.id, c));
          remoteArray.forEach((c) => map.set(c.id, c));
          classesList = Array.from(map.values());
        }
      } catch {}

      // 3. Thu thập danh sách Học sinh từ cả API và Local
      const localStudents = OnlineExamService.getLocalStudents();
      let studentsList: any[] = [...localStudents];
      try {
        const remoteRes = await OnlineExamService.getStudents(undefined, true);
        const remoteArray = Array.isArray(remoteRes) ? remoteRes : remoteRes?.students;
        if (remoteArray && remoteArray.length > 0) {
          const map = new Map();
          localStudents.forEach((s) => map.set(s.id, s));
          remoteArray.forEach((s) => map.set(s.id, s));
          studentsList = Array.from(map.values());
        }
      } catch {}

      // 4. Thu thập Đề thi từ cả API và Local
      const localExams = OnlineExamService.getLocalExams();
      let examsList: any[] = [...localExams];
      try {
        const res = await fetch('/api/exam/list').then((r) => r.json());
        const remoteArray = Array.isArray(res) ? res : res?.exams;
        if (remoteArray && remoteArray.length > 0) {
          const map = new Map();
          localExams.forEach((e) => map.set((e.code || '').toUpperCase(), e));
          remoteArray.forEach((e) => map.set((e.code || '').toUpperCase(), e));
          examsList = Array.from(map.values());
        }
      } catch {}

      // 5. Thu thập Kết quả làm bài
      const localSessions = OnlineExamService.getLocalSessions();
      let resultsList: any[] = localSessions.filter((s) => s.status === 'submitted' || s.score !== undefined);
      try {
        const remoteRes = await OnlineExamService.getTeacherResults('ALL');
        const remoteArray = Array.isArray(remoteRes) ? remoteRes : remoteRes?.results;
        if (remoteArray && remoteArray.length > 0) {
          const map = new Map();
          resultsList.forEach((r) => map.set(r.id, r));
          remoteArray.forEach((r) => map.set(r.id, r));
          resultsList = Array.from(map.values());
        }
      } catch {}

      // 6. Thu thập Cài đặt, Lịch sử đề thi, Ngân hàng câu hỏi
      const settings = StorageEngine.getSettings();
      const examHistory = StorageEngine.getExamHistory();
      const questionBank = StorageEngine.getQuestionBank();

      const sourceData = {
        users: usersList,
        classes: classesList,
        students: studentsList,
        exams: examsList,
        results: resultsList,
        userDataPayloads: {
          shared_workspace: {
            settings,
            examHistory,
            questionBank,
            classes: classesList,
            students: studentsList,
            onlineExams: examsList,
          },
        },
      };

      const result = await SupabaseService.migrateAllDataToSupabase(sourceData, (p) => {
        setMigrationProgress(p);
      });

      setIsMigrating(false);
      setMigrationSummary(result.message);
    } catch (err: any) {
      setIsMigrating(false);
      alert('Lỗi chuyển dữ liệu sang Supabase: ' + err.message);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Fixed & Always Visible */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
                <span>Cấu hình Lưu trữ Supabase (PostgreSQL)</span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Đang hoạt động
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-3 h-3" /> Chưa kết nối
                  </span>
                )}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate sm:whitespace-normal mt-0.5">
                Chuyển đổi toàn bộ người dùng, đề thi, danh sách lớp & học sinh sang Supabase không giới hạn lượt ghi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Quick guide banner */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 text-xs text-emerald-950 dark:text-emerald-200 space-y-2">
            <div className="flex items-center justify-between font-bold text-sm text-emerald-900 dark:text-emerald-100">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                3 bước nhanh để kết nối Supabase miễn phí:
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 underline font-semibold hover:text-emerald-900"
              >
                Mở Supabase Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed">
              <li>Tạo một dự án mới trên Supabase (hoặc dùng dự án có sẵn).</li>
              <li>
                Vào mục <strong>SQL Editor</strong> trên Supabase, dán và chạy kịch bản SQL khởi tạo bảng:
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedSql ? '✓ Đã sao chép SQL!' : 'Sao chép mã SQL khởi tạo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSqlPreview(!showSqlPreview)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer text-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showSqlPreview ? 'Ẩn mã SQL' : 'Xem mã SQL'}
                  </button>
                </div>

                {showSqlPreview && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-mono">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                      <span>supabase_schema.sql ({SUPABASE_SCHEMA_SQL.split('\n').length} dòng)</span>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedSql ? 'Đã copy!' : 'Copy tất cả'}
                      </button>
                    </div>
                    <pre className="max-h-48 overflow-y-auto whitespace-pre font-mono text-[11px] leading-relaxed text-slate-300 selection:bg-emerald-600 selection:text-white">
                      {SUPABASE_SCHEMA_SQL}
                    </pre>
                  </div>
                )}
              </li>
              <li>Vào <strong>Project Settings → API</strong> để lấy <strong>Project URL</strong> và <strong>anon / public API key</strong> rồi dán vào bên dưới.</li>
            </ol>
          </div>

          {/* Form input fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Supabase Project URL:
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Supabase Anon / Public API Key:
              </label>
              <textarea
                rows={2}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Test result status message */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.missingTables && testResult.missingTables.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Sao chép mã SQL để tạo bảng ngay
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Connection Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </button>

                {isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-3 py-2 text-xs font-medium rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    Ngắt kết nối
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>

          {/* Section: One-Click Data Migration */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Chuyển toàn bộ dữ liệu hiện tại sang Supabase (1-Click Migration)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Đồng bộ tất cả Người dùng, Đề thi, Lớp học, Học sinh và Kết quả làm bài từ máy bạn lên Supabase
                </p>
              </div>
              <button
                type="button"
                onClick={handleMigrateAll}
                disabled={isMigrating || (!isConnected && !isSupabaseConfigured())}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isMigrating ? 'animate-bounce' : ''}`} />
                {isMigrating ? 'Đang chuyển...' : 'Bắt đầu chuyển'}
              </button>
            </div>

            {/* Migration progress bar */}
            {isMigrating && migrationProgress && (
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>{migrationProgress.stage}</span>
                  <span>{migrationProgress.percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300 ease-out" 
                    style={{ width: `${migrationProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Migration summary alert */}
            {migrationSummary && (
              <div className="p-3.5 rounded-2xl text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{migrationSummary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 flex items-center justify-between shrink-0">
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            Dữ liệu trên Supabase được bảo mật bằng PostgreSQL RLS (Row Level Security).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-3"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
