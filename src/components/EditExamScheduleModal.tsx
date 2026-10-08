import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Zap,
  Save,
  Check,
  Hourglass,
  Timer,
  Info,
} from 'lucide-react';
import { OnlineExamItem } from '../services/onlineExamService';
import { OnlineExamService } from '../services/onlineExamService';

interface EditExamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: OnlineExamItem | null;
  onSuccess: () => void;
}

export const EditExamScheduleModal: React.FC<EditExamScheduleModalProps> = ({
  isOpen,
  onClose,
  exam,
  onSuccess,
}) => {
  const [startTimeMode, setStartTimeMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(45);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Helper to format Date to input datetime-local string (YYYY-MM-DDTHH:mm)
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (isOpen && exam) {
      setErrorMsg('');
      setSuccessToast('');
      setDuration(exam.duration || 45);

      if (exam.startTimeType === 'scheduled' && exam.scheduledStartTime) {
        setStartTimeMode('scheduled');
        try {
          const d = new Date(exam.scheduledStartTime);
          if (!isNaN(d.getTime())) {
            setScheduledStartTime(toLocalISOString(d));
          } else {
            setScheduledStartTime(toLocalISOString(new Date(Date.now() + 15 * 60 * 1000)));
          }
        } catch {
          setScheduledStartTime(toLocalISOString(new Date(Date.now() + 15 * 60 * 1000)));
        }
      } else {
        setStartTimeMode('immediate');
        const defaultDate = new Date(Date.now() + 15 * 60 * 1000);
        setScheduledStartTime(toLocalISOString(defaultDate));
      }
    }
  }, [isOpen, exam]);

  if (!isOpen || !exam) return null;

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

  const handleSave = async () => {
    if (!exam) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessToast('');

    try {
      let isoScheduledTime: string | undefined = undefined;

      if (startTimeMode === 'scheduled') {
        if (!scheduledStartTime) {
          setErrorMsg('Vui lòng chọn ngày và giờ bắt đầu mở đề thi.');
          setLoading(false);
          return;
        }
        const timeVal = new Date(scheduledStartTime).getTime();
        if (isNaN(timeVal)) {
          setErrorMsg('Thời gian hẹn giờ không hợp lệ. Vui lòng chọn lại.');
          setLoading(false);
          return;
        }
        isoScheduledTime = new Date(scheduledStartTime).toISOString();
      }

      await OnlineExamService.updateExam(exam.code, {
        startTimeType: startTimeMode,
        scheduledStartTime: isoScheduledTime,
        duration: Math.max(5, duration || 45),
      });

      setSuccessToast('Đã lưu cấu hình thời gian thi thành công!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật cấu hình thời gian làm bài.');
    } finally {
      setLoading(false);
    }
  };

  // Preview formatted string
  let formattedPreview = '';
  if (startTimeMode === 'scheduled' && scheduledStartTime) {
    const d = new Date(scheduledStartTime);
    if (!isNaN(d.getTime())) {
      formattedPreview = d.toLocaleString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <div
      id="edit-exam-schedule-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl relative my-auto max-h-[95vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          id="btn-close-schedule-modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 pr-10 shrink-0 gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Tùy Chỉnh Lịch Thi & Thời Gian Làm Bài
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bố trí thời gian bắt đầu mở đề và thời lượng làm bài cho học sinh
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 font-mono font-bold px-3.5 py-1.5 rounded-xl flex items-center space-x-2">
              <span className="text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400 font-sans">Mã Đề:</span>
              <span className="text-sm font-black tracking-wider">{exam.code}</span>
            </div>
          </div>
        </div>

        {/* Modal Body - 2 Columns Horizontal Layout */}
        <div className="overflow-y-auto py-5 space-y-4">
          {/* Error / Success Notices */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">{successToast}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Exam Details & Mode Choice (5 cols) */}
            <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
              {/* Exam Info Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Đề thi đang cấu hình
                </span>
                <div className="font-extrabold text-slate-800 dark:text-slate-100 text-sm line-clamp-2 leading-snug">
                  {exam.title}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300">
                    Môn: {exam.subject}
                  </span>
                  <span className="bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300">
                    {exam.grade}
                  </span>
                  <span className="bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300">
                    {exam.questionCount} câu
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  1. Chế độ mở đề
                </label>

                {/* Immediate */}
                <button
                  id="mode-btn-immediate"
                  type="button"
                  onClick={() => setStartTimeMode('immediate')}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                    startTimeMode === 'immediate'
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center ${
                      startTimeMode === 'immediate'
                        ? 'bg-teal-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {startTimeMode === 'immediate' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs">Làm bài tự do (Mở ngay)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Học sinh có thể vào làm bài bất cứ khi nào đề thi đang bật
                    </div>
                  </div>
                </button>

                {/* Scheduled */}
                <button
                  id="mode-btn-scheduled"
                  type="button"
                  onClick={() => {
                    setStartTimeMode('scheduled');
                    if (!scheduledStartTime) {
                      setScheduledStartTime(toLocalISOString(new Date(Date.now() + 15 * 60 * 1000)));
                    }
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start space-x-3 transition-all cursor-pointer ${
                    startTimeMode === 'scheduled'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center ${
                      startTimeMode === 'scheduled'
                        ? 'bg-amber-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {startTimeMode === 'scheduled' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs flex items-center space-x-1.5">
                      <span>Hẹn giờ mở đề thi</span>
                      <span className="bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] px-1.5 py-0.2 rounded-sm font-bold">
                        Đếm ngược
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Đúng giờ đã hẹn mới mở đề. Trước giờ thi sẽ hiện đồng hồ đếm ngược
                    </div>
                  </div>
                </button>
              </div>

              {/* Duration Setting */}
              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>2. Thời gian làm bài</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Tối đa</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-exam-duration"
                      type="number"
                      min={5}
                      max={300}
                      value={duration}
                      onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 45))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-hidden pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                      phút
                    </span>
                  </div>
                  {/* Quick duration presets */}
                  <div className="flex gap-1">
                    {[15, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(mins)}
                        className={`px-2 py-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          duration === mins
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Timing Pickers & Status Preview (7 cols) */}
            <div className="md:col-span-7 space-y-3.5 bg-slate-50/70 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
              {startTimeMode === 'scheduled' ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40 pb-2.5">
                    <label className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Cài Đặt Ngày & Giờ Bắt Đầu Thi</span>
                    </label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                      Hẹn giờ tự động
                    </span>
                  </div>

                  {/* Input Datetime Local */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Chọn thời điểm mở đề:
                    </span>
                    <input
                      id="input-scheduled-datetime"
                      type="datetime-local"
                      value={scheduledStartTime}
                      onChange={(e) => setScheduledStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-xs"
                    />
                  </div>

                  {/* Formatted Preview Box */}
                  {formattedPreview && (
                    <div className="p-3.5 bg-amber-100/70 dark:bg-amber-950/60 rounded-xl border border-amber-300/80 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-extrabold">
                        <Hourglass className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                        <span>Xem trước thời gian mở đề:</span>
                      </div>
                      <div className="text-sm font-black text-amber-900 dark:text-amber-100 pl-5 capitalize">
                        {formattedPreview}
                      </div>
                      <div className="text-[11px] text-amber-800 dark:text-amber-300/90 pl-5">
                        Học sinh truy cập trước giờ này sẽ thấy đồng hồ đếm ngược và chỉ làm bài khi đến giờ.
                      </div>
                    </div>
                  )}

                  {/* Quick Preset Buttons */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                      Phím tắt đặt giờ nhanh:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSetQuickTime(15)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        +15 phút nữa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickTime(30)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        +30 phút nữa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickTime(60)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        +1 giờ nữa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTomorrow(7, 30)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        Sáng mai 07:30
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTomorrow(14, 0)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        Chiều mai 14:00
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetTomorrow(19, 30)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors text-center shadow-2xs"
                      >
                        Tối mai 19:30
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200 my-auto p-4 text-center">
                  <div className="w-14 h-14 bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Chế độ Làm bài Tự Do Đang Được Chọn
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Học sinh có thể truy cập mã đề <strong>{exam.code}</strong> và bắt đầu làm bài ngay khi đề ở trạng thái <strong>Mở</strong> mà không bị ràng buộc bởi khung giờ hẹn trước.
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 rounded-xl text-xs text-teal-800 dark:text-teal-300 font-medium inline-block">
                    ⏱️ Thời lượng làm bài: <strong>{duration} phút</strong> tính từ lúc học sinh bấm Bắt đầu.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            * Thay đổi có hiệu lực ngay lập tức đối với học sinh tham gia thi.
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-schedule"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              id="btn-save-schedule"
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Lịch Thi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
