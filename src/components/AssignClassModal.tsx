import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckSquare, RefreshCw, School, Square, X } from 'lucide-react';
import { ClassItem, matchGrade } from '../types';
import { OnlineExamItem, OnlineExamService } from '../services/onlineExamService';

interface AssignClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExamItem | null;
  onSuccess: () => void;
}

export const AssignClassModal: React.FC<AssignClassModalProps> = ({
  isOpen,
  onClose,
  exam,
  onSuccess,
}) => {
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allowAllClasses, setAllowAllClasses] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !exam) return;

    setErrorMsg('');
    setSuccessMsg('');
    const allowed = exam.allowedClasses || [];
    setSelectedClasses(allowed);
    setAllowAllClasses(allowed.length === 0);

    setLoading(true);
    OnlineExamService.getClasses(true)
      .then((res) => {
        if (res.success && res.classes) {
          setClassList(res.classes);
        }
      })
      .catch((err) => setErrorMsg('Lỗi tải danh sách lớp: ' + err.message))
      .finally(() => setLoading(false));
  }, [isOpen, exam]);

  if (!isOpen || !exam) return null;

  const targetGrade = exam.grade || '';
  const filteredClasses = classList.filter((cls) => matchGrade(targetGrade, cls.grade));

  const handleToggleClass = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className]
    );
  };

  const handleSave = async () => {
    if (!exam) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetAllowed = allowAllClasses ? [] : selectedClasses;

    try {
      await OnlineExamService.updateExam(exam.code, {
        allowedClasses: targetAllowed,
      });
      setSuccessMsg('Đã cập nhật phân công lớp thành công!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu phân công lớp.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800/60 shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-lg">
              Phân Công Lớp Làm Bài
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mã đề: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{exam.code}</span> - {exam.title}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Cho phép tất cả các lớp trong trường làm bài:
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowAllClasses}
                onChange={(e) => setAllowAllClasses(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {!allowAllClasses && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  Đề thi thuộc <span className="font-extrabold text-teal-600 dark:text-teal-400">{targetGrade || 'chưa phân khối'}</span>. Danh sách lớp của khối này:
                </span>
                <span className="text-[11px] text-slate-400">
                  Đã chọn: <strong className="text-teal-600">{selectedClasses.length}</strong> lớp
                </span>
              </div>

              {loading ? (
                <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Đang tải danh sách lớp...</span>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  ⚠️ Chưa có lớp nào thuộc <strong>{targetGrade}</strong> trong hệ thống. Vui lòng vào mục <strong>"Quản lý Lớp & HS"</strong> để thêm lớp mới thuộc {targetGrade}.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
                  {filteredClasses.map((cls) => {
                    const isChecked = selectedClasses.includes(cls.name);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleToggleClass(cls.name)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                        }`}
                      >
                        <span className="truncate">Lớp {cls.name}</span>
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 shrink-0 ml-1 text-white" />
                        ) : (
                          <Square className="w-4 h-4 shrink-0 ml-1 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu Phân Công'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
