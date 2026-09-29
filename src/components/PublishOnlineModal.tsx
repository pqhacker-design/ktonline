import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Clock, Lock, RefreshCw, School, Shield, Sparkles, X } from 'lucide-react';
import { ExamPackage, ClassItem, matchGrade } from '../types';
import { OnlineExamService } from '../services/onlineExamService';
import { StorageEngine } from '../services/storageEngine';

interface PublishOnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  examPackage: ExamPackage | null;
  examPackages?: ExamPackage[];
  onPublishedSuccess: (code: string) => void;
}

export const PublishOnlineModal: React.FC<PublishOnlineModalProps> = ({
  isOpen,
  onClose,
  examPackage,
  examPackages = [],
  onPublishedSuccess,
}) => {
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');

  const currentPkg = React.useMemo(() => {
    if (selectedPkgId && examPackages.length > 0) {
      const found = examPackages.find((p) => p.id === selectedPkgId);
      if (found) return found;
    }
    return examPackage || examPackages[0] || null;
  }, [selectedPkgId, examPackages, examPackage]);

  const [customCode, setCustomCode] = useState('');
  const [duration, setDuration] = useState<number>(45);
  const [allowExplanations, setAllowExplanations] = useState(true);

  // Sync initial values whenever currentPkg or isOpen changes
  useEffect(() => {
    if (isOpen && currentPkg) {
      setSelectedPkgId(currentPkg.id);
      const pkgDuration =
        (currentPkg.metadata as any)?.durationMinutes ||
        (currentPkg.metadata as any)?.duration ||
        45;
      setDuration(pkgDuration);
    }
  }, [isOpen, currentPkg?.id]);

  // Start Time Mode & Scheduled Time
  const [startTimeMode, setStartTimeMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');

  // Class selection state
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allowAllClasses, setAllowAllClasses] = useState(true);

  // Anti-cheat options
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [autoSubmitOnTimeout, setAutoSubmitOnTimeout] = useState(true);
  const [warnTabSwitch, setWarnTabSwitch] = useState(true);
  const [disallowPrevious, setDisallowPrevious] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Helper to format Date to input datetime-local string (YYYY-MM-DDTHH:mm)
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSetQuickTime = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setScheduledStartTime(toLocalISOString(d));
  };

  const handleSetTomorrow = (hours: number, minutes: number) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    setScheduledStartTime(toLocalISOString(d));
  };

  useEffect(() => {
    if (isOpen) {
      // Default to 15 minutes from now if switching to scheduled
      const defaultDate = new Date(Date.now() + 15 * 60 * 1000);
      setScheduledStartTime(toLocalISOString(defaultDate));

      OnlineExamService.getClasses()
        .then((res) => {
          if (res.success && res.classes) {
            setClassList(res.classes);
          }
        })
        .catch((err) => console.error('Lỗi khi tải danh sách lớp:', err));
    }
  }, [isOpen]);

  if (!isOpen || !currentPkg) return null;

  const handleToggleClass = (clsName: string) => {
    if (selectedClasses.includes(clsName)) {
      setSelectedClasses(selectedClasses.filter((c) => c !== clsName));
    } else {
      setSelectedClasses([...selectedClasses, clsName]);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      if (startTimeMode === 'scheduled') {
        if (!scheduledStartTime) {
          setErrorMsg('Vui lòng chọn ngày và giờ bắt đầu làm bài.');
          setLoading(false);
          return;
        }
        const timeVal = new Date(scheduledStartTime).getTime();
        if (isNaN(timeVal)) {
          setErrorMsg('Thời gian bắt đầu không hợp lệ.');
          setLoading(false);
          return;
        }
      }

      const allowedClassesToSend = allowAllClasses ? [] : selectedClasses;
      const title =
        currentPkg.metadata?.examTitle ||
        (currentPkg.metadata as any)?.title ||
        'Đề kiểm tra';
      const subject = currentPkg.metadata?.subject || 'Toán';
      const grade = currentPkg.metadata?.grade || 'Khối 10';
      const durationVal = Number(duration) || (currentPkg.metadata as any)?.durationMinutes || 45;

      const res = await OnlineExamService.saveExam({
        code: customCode.trim() || undefined,
        title,
        subject,
        grade,
        duration: durationVal,
        totalPoints: 10.0,
        topic: currentPkg.metadata?.chapterTitle || '',
        allowExplanations,
        allowedClasses: allowedClassesToSend,
        scheduledStartTime:
          startTimeMode === 'scheduled' && scheduledStartTime
            ? new Date(scheduledStartTime).toISOString()
            : undefined,
        startTimeType: startTimeMode,
        antiCheat: {
          shuffleQuestions,
          shuffleOptions,
          autoSubmitOnTimeout,
          warnTabSwitch,
          disallowPrevious,
          tabSwitchLimit: 3,
        },
        examPackage: currentPkg,
      });

      if (res.success && res.code) {
        if (currentPkg) {
          const updatedPkg: ExamPackage = {
            ...currentPkg,
            metadata: {
              ...currentPkg.metadata,
              onlineExamCode: res.code,
            },
          };
          StorageEngine.saveExamPackage(updatedPkg);
        }
        onPublishedSuccess(res.code);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu đề thi trực tuyến.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl relative space-y-6 my-auto max-h-[92vh] flex flex-col overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 border-b border-slate-100 dark:border-slate-800 pb-4 pr-8">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Lưu & Cấp Mã Thi Trực Tuyến</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phát hành mã đề online để học sinh truy cập làm bài trên mọi thiết bị
            </p>
          </div>
        </div>

        {/* Selected Package Banner / Picker */}
        <div className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Gói Đề Thi Được Chọn Để Cấp Mã Online:
              </span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {currentPkg.metadata?.examTitle || 'Đề kiểm tra'} - {currentPkg.metadata?.subject} {currentPkg.metadata?.grade}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {currentPkg.metadata?.chapterTitle || 'Mạch kiến thức'} • {currentPkg.exams.length} mã đề ({currentPkg.exams[0]?.questions?.length || 0} câu/đề)
              </p>
            </div>

            {examPackages.length > 1 && (
              <div className="shrink-0">
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Đổi gói đề khác trong Lịch sử:
                </label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-teal-500 outline-hidden"
                >
                  {examPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.metadata?.subject} - {pkg.metadata?.grade}: {pkg.metadata?.examTitle} ({new Date(pkg.createdAt).toLocaleDateString('vi-VN')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Horizontal Grid Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* LEFT COLUMN: Basic Info, Time & Start Schedule */}
          <div className="space-y-4">
            {/* Custom Code & Time Limit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Custom Code Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                  Mã đề thi (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Để trống = Ngẫu nhiên"
                  maxLength={10}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider font-bold text-teal-700 dark:text-teal-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Time Limit */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 text-[11px] uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Thời gian làm bài</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 45))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-hidden pr-12"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                    phút
                  </span>
                </div>
              </div>
            </div>

            {/* Start Time Configuration (Làm tự do vs Hẹn giờ bắt đầu) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Thời gian bắt đầu làm bài</span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStartTimeMode('immediate')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    startTimeMode === 'immediate'
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${startTimeMode === 'immediate' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span className="text-xs">Làm tự do</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    Học sinh vào làm lúc nào cũng được
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStartTimeMode('scheduled');
                    if (!scheduledStartTime) {
                      setScheduledStartTime(toLocalISOString(new Date(Date.now() + 15 * 60 * 1000)));
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    startTimeMode === 'scheduled'
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className={`w-2 h-2 rounded-full ${startTimeMode === 'scheduled' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                    <span className="text-xs">Hẹn giờ bắt đầu</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                    Đến giờ mới cho học sinh mở đề
                  </span>
                </button>
              </div>

              {/* Scheduled Date/Time Picker */}
              {startTimeMode === 'scheduled' && (
                <div className="pt-2 space-y-2.5 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-200 block text-[11px]">
                      Chọn ngày và giờ mở đề thi:
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3.5 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-xs"
                    />
                  </div>

                  {/* Quick Pick Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
                    <button
                      type="button"
                      onClick={() => handleSetQuickTime(5)}
                      className="px-2 py-1 bg-slate-200/70 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      +5 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickTime(15)}
                      className="px-2 py-1 bg-slate-200/70 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      +15 phút
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickTime(60)}
                      className="px-2 py-1 bg-slate-200/70 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      +1 giờ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetTomorrow(7, 30)}
                      className="px-2 py-1 bg-slate-200/70 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Sáng mai 07:30
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetTomorrow(14, 0)}
                      className="px-2 py-1 bg-slate-200/70 dark:bg-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Chiều mai 14:00
                    </button>
                  </div>

                  <p className="text-[10.5px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/60 leading-tight">
                    ⏳ Học sinh nhập mã trước giờ thi sẽ thấy <strong>đồng hồ đếm ngược</strong>. Đúng giờ mở đề, hệ thống sẽ tự động cho phép học sinh bắt đầu làm bài.
                  </p>
                </div>
              )}
            </div>

            {/* Target Classes Selection */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700/60 pb-2.5 justify-between">
                <div className="flex items-center space-x-2">
                  <School className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Phân công Lớp làm bài</span>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300 cursor-pointer hover:underline">
                  <input
                    type="checkbox"
                    checked={allowAllClasses}
                    onChange={(e) => setAllowAllClasses(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                  />
                  <span>Tất cả các lớp</span>
                </label>
              </div>

              {!allowAllClasses ? (
                <div className="space-y-2 pt-1">
                  {(() => {
                    const examGrade = examPackage?.metadata?.grade || '';
                    const filteredClasses = classList.filter((cls) => matchGrade(examGrade, cls.grade));

                    return (
                      <>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Đề thi thuộc <span className="font-extrabold text-teal-700 dark:text-teal-300">{examGrade || 'chưa phân khối'}</span>. Chỉ hiển thị các lớp của khối này:
                        </p>
                        {filteredClasses.length === 0 ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                            Chưa có lớp nào thuộc {examGrade || 'khối này'} trong hệ thống. Vui lòng vào mục "Quản lý Lớp & HS" để tạo lớp trước.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                            {filteredClasses.map((cls) => {
                              const isChecked = selectedClasses.includes(cls.name);
                              return (
                                <button
                                  key={cls.id}
                                  type="button"
                                  onClick={() => handleToggleClass(cls.name)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    isChecked
                                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                                  }`}
                                >
                                  {isChecked ? '✓ ' : ''}Lớp {cls.name} ({cls.grade})
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Đề thi mở công khai cho tất cả các lớp trong toàn trường.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Anti-Cheat & Explanations */}
          <div className="space-y-4">
            {/* Anti-Cheat Settings */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
                <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Cấu hình Chống gian lận & Trộn đề</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="font-medium">Trộn thứ tự câu hỏi cho từng học sinh</span>
                </label>

                <label className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="font-medium">Trộn vị trí đáp án các lựa chọn A, B, C, D</span>
                </label>

                <label className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoSubmitOnTimeout}
                    onChange={(e) => setAutoSubmitOnTimeout(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="font-medium">Tự động nộp bài ngay khi hết thời gian</span>
                </label>

                <label className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={warnTabSwitch}
                    onChange={(e) => setWarnTabSwitch(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="font-medium">Cảnh báo & ghi nhận lịch sử khi chuyển tab làm bài</span>
                </label>

                <label className="flex items-center space-x-2.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <input
                    type="checkbox"
                    checked={disallowPrevious}
                    onChange={(e) => setDisallowPrevious(e.target.checked)}
                    className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span className="font-medium">Không cho phép quay lại chỉnh sửa câu đã trả lời</span>
                </label>
              </div>
            </div>

            {/* Allow Explanations after submit */}
            <div className="bg-teal-50/80 dark:bg-teal-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800/50">
              <label className="flex items-start space-x-3 text-teal-950 dark:text-teal-200 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={allowExplanations}
                  onChange={(e) => setAllowExplanations(e.target.checked)}
                  className="rounded-md border-teal-400 text-teal-600 focus:ring-teal-500 w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="text-xs leading-relaxed">
                  Cho phép học sinh xem đáp án chuẩn & lời giải chi tiết sau khi hoàn thành bài nộp.
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Buttons Footer Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Mã đề trực tuyến sẽ được cấp ngay sau khi nhấn xác nhận.
          </p>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              onClick={handlePublish}
              disabled={loading}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center space-x-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Đang khởi tạo mã...' : 'Lưu & Bật Thi Online'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
