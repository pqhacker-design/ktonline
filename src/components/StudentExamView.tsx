import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  Hourglass,
  Loader2,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { OnlineExamService } from '../services/onlineExamService';
import { MathText } from './MathText';
import { extractGradeNumber, matchGrade, normalizeClassName, validateStudentEligibility, ClassItem, StudentItem } from '../types';

interface StudentExamViewProps {
  initialCode?: string;
  onExit?: () => void;
}

export const StudentExamView: React.FC<StudentExamViewProps> = ({
  initialCode = '',
  onExit,
}) => {
  // Step: 'login' | 'taking' | 'result' | 'closed'
  const [step, setStep] = useState<'login' | 'taking' | 'result' | 'closed'>('login');

  // Login Form States
  const [examCode, setExamCode] = useState((initialCode || '').trim().toUpperCase());

  useEffect(() => {
    if (initialCode) {
      setExamCode(initialCode.trim().toUpperCase());
    }
  }, [initialCode]);

  const [sbdInput, setSbdInput] = useState('');
  const [sbdVerified, setSbdVerified] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentSchool, setStudentSchool] = useState('');
  const [loginMode, setLoginMode] = useState<'SBD' | 'MANUAL'>('SBD');

  // Exam Public Info (Loaded during login)
  const [examInfo, setExamInfo] = useState<any>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Scheduled Exam Countdown State
  const [secondsUntilStart, setSecondsUntilStart] = useState<number | null>(null);

  // Active Session States
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Timer Clock
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Anti-cheat States
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showAntiCheatModal, setShowAntiCheatModal] = useState(false);

  // Exit Confirmation Modal State
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Submission / Loading
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  // Result State
  const [examResult, setExamResult] = useState<any>(null);

  // System Classes and Students for validation
  const [systemClasses, setSystemClasses] = useState<any[]>([]);
  const [systemStudents, setSystemStudents] = useState<any[]>([]);

  useEffect(() => {
    OnlineExamService.getClasses(true)
      .then((res) => {
        if (res.success && res.classes) {
          setSystemClasses(res.classes);
        }
      })
      .catch((err) => console.error('Lỗi khi tải danh sách lớp:', err));

    OnlineExamService.getStudents(undefined, true)
      .then((res) => {
        if (res.success && res.students) {
          setSystemStudents(res.students);
        }
      })
      .catch((err) => console.error('Lỗi khi tải danh sách học sinh:', err));
  }, []);

  const normalizeClassStr = (str: string) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(lớp|lop|class|khối|khoi)\s*/gi, '')
      .replace(/[^a-z0-9]/gi, '');
  };

  const normalizeNameStr = (str: string) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  };

  // Auto-check Exam Code metadata on typing or initial load
  useEffect(() => {
    if (examCode.trim().length >= 4) {
      checkExamCodeInfo(examCode.trim().toUpperCase());
    } else {
      setExamInfo(null);
      setLoginError('');
      setSecondsUntilStart(null);
    }
  }, [examCode]);

  const checkExamCodeInfo = async (code: string) => {
    setCheckingCode(true);
    setLoginError('');
    try {
      const res = await OnlineExamService.getStudentExamInfo(code);
      if (res.success) {
        setExamInfo(res.info);
      }
    } catch (err: any) {
      setExamInfo(null);
      setLoginError(err.message || 'Mã đề không tồn tại.');
    } finally {
      setCheckingCode(false);
    }
  };

  // Scheduled Start Time Countdown Effect
  useEffect(() => {
    if (!examInfo || examInfo.startTimeType !== 'scheduled' || !examInfo.scheduledStartTime) {
      setSecondsUntilStart(null);
      return;
    }

    const calculateRemaining = () => {
      const startMs = new Date(examInfo.scheduledStartTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.floor((startMs - nowMs) / 1000);
      if (diffSecs > 0) {
        setSecondsUntilStart(diffSecs);
      } else {
        setSecondsUntilStart(0);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [examInfo]);

  // Format Scheduled Start Countdown string: Days, Hours, Minutes, Seconds
  const formatScheduledCountdown = (totalSecs: number) => {
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    return {
      days,
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      isStarted: totalSecs <= 0,
    };
  };

  // Tra cứu SBD
  const handleLookupSbd = async (sbdToLookup?: string) => {
    const sbd = (sbdToLookup || sbdInput).trim();
    if (!sbd) {
      setLoginError('Vui lòng nhập Số báo danh.');
      return;
    }

    setCheckingCode(true);
    setLoginError('');
    try {
      const res = await OnlineExamService.lookupStudentBySbd(sbd, examCode.trim());
      if (res.success && res.student) {
        setStudentName(res.student.name);
        setStudentClass(res.student.className);
        setStudentId(res.student.sbd);
        if (res.student.school) setStudentSchool(res.student.school);
        setSbdVerified(true);
        setLoginError('');
      }
    } catch (err: any) {
      setSbdVerified(false);
      setLoginError(err.message || `Không tìm thấy thông tin cho SBD: ${sbd}`);
    } finally {
      setCheckingCode(false);
    }
  };

  // Start or Resume Exam
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingCode(true);
    setLoginError('');

    // Check if scheduled exam has not started yet
    if (examInfo?.startTimeType === 'scheduled' && examInfo?.scheduledStartTime) {
      const startTime = new Date(examInfo.scheduledStartTime).getTime();
      if (startTime > Date.now()) {
        const timeStr = new Date(examInfo.scheduledStartTime).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        setLoginError(`Chưa đến giờ mở đề thi. Đề thi sẽ chính thức bắt đầu lúc ${timeStr}. Vui lòng theo dõi đồng hồ đếm ngược!`);
        setCheckingCode(false);
        return;
      }
    }

    let curName = studentName.trim();
    let curClass = studentClass.trim();
    let curId = studentId.trim();
    let curSchool = studentSchool.trim();

    // Auto lookup if loginMode is SBD and info not filled yet
    if (loginMode === 'SBD') {
      const targetSbd = (sbdInput || curId).trim();
      if (!targetSbd) {
        setLoginError('Vui lòng nhập Số báo danh.');
        setCheckingCode(false);
        return;
      }
      try {
        const lookup = await OnlineExamService.lookupStudentBySbd(targetSbd, examCode.trim());
        if (lookup.success && lookup.student) {
          curName = lookup.student.name;
          curClass = lookup.student.className;
          curId = lookup.student.sbd;
          if (lookup.student.school) curSchool = lookup.student.school;
          setStudentName(curName);
          setStudentClass(curClass);
          setStudentId(curId);
          setStudentSchool(curSchool);
          setSbdVerified(true);
        } else {
          setLoginError(`Không tìm thấy thông tin cho SBD: ${targetSbd}`);
          setCheckingCode(false);
          return;
        }
      } catch (err: any) {
        setLoginError(err.message || `Số báo danh ${targetSbd} không thuộc lớp được dự thi.`);
        setCheckingCode(false);
        return;
      }
    }

    if (!examCode.trim() || !curName || !curClass) {
      setLoginError('Vui lòng điền đầy đủ Mã đề, Họ tên và Lớp.');
      setCheckingCode(false);
      return;
    }

    // 1. Client-side Grade Compatibility Check (e.g., Grade 9 student attempting Grade 7 exam)
    if (examInfo?.grade) {
      const examGradeNum = extractGradeNumber(examInfo.grade);
      const studentGradeNum = extractGradeNumber(curClass);

      if (examGradeNum && studentGradeNum && examGradeNum !== studentGradeNum) {
        setLoginError(
          `Cảnh báo: Đề thi này dành riêng cho học sinh Khối ${examGradeNum} (${examInfo.grade}). Học sinh thuộc Khối ${studentGradeNum} (Lớp ${curClass}) không được phép tham gia bài thi này!`
        );
        setCheckingCode(false);
        return;
      }
    }

    // 2. Client-side validation for Allowed Classes (Strict matching)
    if (examInfo && examInfo.allowedClasses && Array.isArray(examInfo.allowedClasses) && examInfo.allowedClasses.length > 0) {
      const studentNorm = normalizeClassName(curClass);
      const isAllowed = examInfo.allowedClasses.some((c: string) => {
        const cNorm = normalizeClassName(c);
        return cNorm === studentNorm || c === curClass;
      });
      if (!isAllowed) {
        setLoginError(
          `Cảnh báo: Tên lớp "${curClass}" không thuộc danh sách các lớp được phân công làm bài thi này (${examInfo.allowedClasses.join(', ')}). Vui lòng kiểm tra lại thông tin tên và lớp!`
        );
        setCheckingCode(false);
        return;
      }
    }

    const studentNormClass = normalizeClassName(curClass);
    const studentNormName = curName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    const examGradeNum = examInfo?.grade ? extractGradeNumber(examInfo.grade) : null;

    // 3. Client-side validation for System Classes
    if (systemClasses.length > 0 || systemStudents.length > 0) {
      const matchingClass = systemClasses.find((c) => normalizeClassName(c.name) === studentNormClass || c.id === curClass);
      if (matchingClass && examGradeNum) {
        const classGradeNum = extractGradeNumber(matchingClass.grade) || extractGradeNumber(matchingClass.name);
        if (classGradeNum && classGradeNum !== examGradeNum) {
          setLoginError(`Cảnh báo: Lớp "${curClass}" thuộc Khối ${classGradeNum}, không phù hợp với bài thi Khối ${examGradeNum} (${examInfo?.grade || ''})!`);
          setCheckingCode(false);
          return;
        }
      }

      const isClassValid =
        !!matchingClass ||
        systemStudents.some((s) => normalizeClassName(s.className) === studentNormClass) ||
        (examInfo?.allowedClasses && examInfo.allowedClasses.some((c: string) => normalizeClassName(c) === studentNormClass));

      if (!isClassValid) {
        setLoginError(`Cảnh báo: Lớp "${curClass}" không tồn tại trên hệ thống. Vui lòng kiểm tra lại thông tin Lớp!`);
        setCheckingCode(false);
        return;
      }
    }

    // 4. Client-side validation for System Students
    if (systemStudents.length > 0) {
      const matchingNameStudents = systemStudents.filter(
        (s) => s.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ') === studentNormName ||
               s.name.trim().toLowerCase() === curName.trim().toLowerCase()
      );

      if (matchingNameStudents.length > 0) {
        const exactMatch = matchingNameStudents.find(
          (s) => normalizeClassName(s.className) === studentNormClass || s.classId === curClass
        );
        if (!exactMatch) {
          const actualClass = matchingNameStudents[0].className;
          setLoginError(`Cảnh báo: Học sinh "${curName}" được ghi nhận thuộc Lớp "${actualClass}", không phải Lớp "${curClass}". Vui lòng kiểm tra lại thông tin Lớp!`);
          setCheckingCode(false);
          return;
        }
        if (examGradeNum) {
          const matchedGrade = extractGradeNumber(exactMatch.className);
          if (matchedGrade && matchedGrade !== examGradeNum) {
            setLoginError(`Cảnh báo: Học sinh "${exactMatch.name}" (Lớp ${exactMatch.className}) thuộc Khối ${matchedGrade}, không được phép tham gia bài thi Khối ${examGradeNum} (${examInfo?.grade || ''})!`);
            setCheckingCode(false);
            return;
          }
        }
      } else {
        const studentsInClass = systemStudents.filter(
          (s) => normalizeClassName(s.className) === studentNormClass || s.classId === curClass
        );
        if (studentsInClass.length > 0) {
          setLoginError(`Cảnh báo: Không tìm thấy học sinh "${curName}" trong danh sách Lớp "${curClass}" trên hệ thống. Vui lòng kiểm tra lại chính xác Họ và Tên!`);
          setCheckingCode(false);
          return;
        } else {
          setLoginError(`Cảnh báo: Học sinh "${curName}" (Lớp ${curClass}) không có trong danh sách học sinh của hệ thống. Vui lòng kiểm tra lại thông tin tên và lớp!`);
          setCheckingCode(false);
          return;
        }
      }
    }

    try {
      const res = await OnlineExamService.startStudentExam({
        code: examCode.trim().toUpperCase(),
        studentName: curName,
        studentClass: curClass,
        studentId: curId,
        studentSchool: curSchool,
      });

      if (res.isAlreadySubmitted) {
        setExamResult(res.result);
        if (res.examInfo) setExamInfo(res.examInfo);
        if (res.session) setSession(res.session);
        setStep('result');
        return;
      }

      setSession(res.session);
      setQuestions(res.questions || []);
      setAnswers(res.session?.answers || {});
      setRemainingSeconds(res.session?.remainingSeconds || (res.examInfo?.duration || 45) * 60);
      setExamInfo(res.examInfo);

      // Transition to Taking Exam
      setStep('taking');
    } catch (err: any) {
      setLoginError(err.message || 'Không thể vào thi.');
    } finally {
      setCheckingCode(false);
    }
  };

  // Timer countdown hook for Taking Exam
  useEffect(() => {
    if (step === 'taking' && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Auto submit on timer end
            handleFinalSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, remainingSeconds]);

  // Periodic Auto-Save Progress (every 15 seconds)
  useEffect(() => {
    if (step !== 'taking' || !session?.id) return;
    const saveInterval = setInterval(() => {
      OnlineExamService.saveProgress(session.id, answers, remainingSeconds);
    }, 15000);

    return () => clearInterval(saveInterval);
  }, [step, session, answers, remainingSeconds]);

  // Anti-Cheat Tab Switching Detector
  useEffect(() => {
    if (step !== 'taking' || !examInfo?.antiCheat?.warnTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const newCount = tabSwitches + 1;
        setTabSwitches(newCount);
        setShowAntiCheatModal(true);

        if (session?.id) {
          OnlineExamService.logActivity(
            session.id,
            `Cảnh báo: Chuyển tab lần thứ ${newCount}`,
            `Thời điểm: ${new Date().toLocaleTimeString('vi-VN')}`
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [step, tabSwitches, examInfo, session]);

  // Handle Option / Answer Select
  const handleAnswerSelect = (questionId: string, answerValue: any) => {
    const updatedAnswers = { ...answers, [questionId]: answerValue };
    setAnswers(updatedAnswers);

    // Save progress immediately
    if (session?.id) {
      OnlineExamService.saveProgress(session.id, updatedAnswers, remainingSeconds);
    }
  };

  // Submit Exam
  const handleFinalSubmit = async (isAutoTimeout = false) => {
    if (submitting) return;
    setSubmitting(true);
    setShowSubmitConfirmModal(false);

    try {
      const res = await OnlineExamService.submitExam(session.id, answers, remainingSeconds);
      if (res.success) {
        setExamResult(res.result);
        setStep('result');
      }
    } catch (err: any) {
      alert('Lỗi khi nộp bài: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Exit Confirmation Modal Component
  const renderExitConfirmModal = () => {
    if (!showExitConfirmModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-rose-950/80 text-rose-400 border border-rose-800/50 rounded-2xl flex items-center justify-center mx-auto">
            <LogOut className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-white">Xác nhận thoát khỏi bài thi?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {step === 'taking'
              ? 'Bài thi của bạn đang diễn ra. Nếu thoát bây giờ, phiên làm bài sẽ kết thúc và không thể tiếp tục.'
              : 'Bạn có chắc chắn muốn thoát khỏi trang làm bài thi trực tuyến không?'}
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowExitConfirmModal(false)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Ở lại
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExitConfirmModal(false);
                if (onExit) {
                  onExit();
                } else {
                  try {
                    window.close();
                  } catch (e) {}
                  setStep('closed');
                }
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-md transition-colors cursor-pointer"
            >
              Thoát Ngay
            </button>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // STEP 1: LOGIN & WAITING ROOM FORM
  // -------------------------------------------------------------
  if (step === 'login') {
    const isScheduledInFuture =
      examInfo?.startTimeType === 'scheduled' &&
      examInfo?.scheduledStartTime &&
      secondsUntilStart !== null &&
      secondsUntilStart > 0;

    const cd = secondsUntilStart !== null ? formatScheduledCountdown(secondsUntilStart) : null;

    const formattedScheduledDate = examInfo?.scheduledStartTime
      ? new Date(examInfo.scheduledStartTime).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

    return (
      <div className="min-h-screen max-h-screen overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full my-auto bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 bg-teal-500/20 border border-teal-400/30 text-teal-300 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Học Sinh Làm Bài Trực Tuyến</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/60 hidden sm:inline-block">
                    Cổng Thi Trực Tuyến
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nhập mã đề thi và xác thực thông tin học sinh để tham gia làm bài kiểm tra
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowExitConfirmModal(true)}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700/60"
              title="Thoát khỏi bài thi"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>

          {/* System Notification Banner (if any) */}
          {loginError && (
            <div className="p-3.5 bg-rose-950/90 border-2 border-rose-600/80 text-rose-100 rounded-2xl text-xs space-y-1 shadow-xl animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center space-x-2 font-black text-rose-300 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>THÔNG BÁO TỪ HỆ THỐNG</span>
              </div>
              <p className="text-rose-100 font-medium leading-relaxed text-[11px] sm:text-xs">
                {loginError}
              </p>
            </div>
          )}

          {/* Horizontal 2-Column Main Layout */}
          <form onSubmit={handleStartExam} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch text-xs">
            {/* LEFT COLUMN: Exam Code & Info & Large Countdown Timer (6 cols) */}
            <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
              {/* Exam Code Input Box */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>MÃ ĐỀ THI (*)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Nhập mã gồm các chữ và số</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="VD: WTCS3R"
                    maxLength={10}
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    className="w-full bg-slate-950 border-2 border-slate-700/90 focus:border-teal-500 rounded-2xl px-4 py-3 font-mono font-black text-xl sm:text-2xl tracking-widest text-teal-300 focus:ring-2 focus:ring-teal-500/20 focus:outline-hidden uppercase shadow-inner"
                  />
                  {checkingCode && (
                    <Loader2 className="w-6 h-6 text-teal-400 animate-spin absolute right-3.5 top-3.5" />
                  )}
                </div>
              </div>

              {/* Exam Info & Prominent Countdown Box */}
              {examInfo ? (
                <div className="p-4 bg-teal-950/40 border border-teal-700/60 rounded-2xl space-y-3.5 text-teal-200 animate-in fade-in flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded-md border border-teal-800">
                        Thông Tin Đề Thi
                      </span>
                      <div className="flex items-center space-x-1.5 text-amber-300 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Thời gian làm bài: {examInfo.duration} phút</span>
                      </div>
                    </div>
                    <h3 className="font-extrabold text-base sm:text-lg text-white mt-1.5 line-clamp-2 leading-snug">
                      {examInfo.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-teal-300 font-semibold pt-1">
                      <span className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-teal-800/60">
                        Môn: {examInfo.subject}
                      </span>
                      <span className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-teal-800/60">
                        Khối: {examInfo.grade}
                      </span>
                      {examInfo.questionCount ? (
                        <span className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-teal-800/60">
                          {examInfo.questionCount} câu hỏi
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* SCHEDULED START COUNTDOWN BOX - SUPER LARGE & PROMINENT */}
                  {isScheduledInFuture && cd ? (
                    <div className="p-3.5 sm:p-4 bg-slate-950/90 border-2 border-amber-500/60 rounded-2xl space-y-3 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-amber-500/30 pb-2">
                        <div className="flex items-center space-x-2 text-amber-300 font-black text-xs sm:text-sm tracking-wide">
                          <Hourglass className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>CHƯA ĐẾN GIỜ MỞ ĐỀ THI</span>
                        </div>
                        <span className="text-[11px] text-slate-300">
                          Mở lúc: <strong className="text-amber-200 font-bold">{formattedScheduledDate}</strong>
                        </span>
                      </div>

                      {/* Giant Digital Countdown Timer Display */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center font-mono">
                        {cd.days > 0 && (
                          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl py-2 sm:py-3 shadow-inner">
                            <div className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-400 tracking-tight">
                              {cd.days}
                            </div>
                            <div className="text-[10px] sm:text-xs text-amber-200 font-bold uppercase font-sans mt-0.5 tracking-wider">
                              Ngày
                            </div>
                          </div>
                        )}
                        <div className={`${cd.days === 0 ? 'col-span-1' : ''} bg-slate-900 border border-amber-500/50 rounded-2xl py-2 sm:py-3 shadow-inner`}>
                          <div className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-400 tracking-tight">
                            {cd.hours}
                          </div>
                          <div className="text-[10px] sm:text-xs text-amber-200 font-bold uppercase font-sans mt-0.5 tracking-wider">
                            Giờ
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-amber-500/50 rounded-2xl py-2 sm:py-3 shadow-inner">
                          <div className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-400 tracking-tight">
                            {cd.minutes}
                          </div>
                          <div className="text-[10px] sm:text-xs text-amber-200 font-bold uppercase font-sans mt-0.5 tracking-wider">
                            Phút
                          </div>
                        </div>
                        <div className="bg-slate-900 border border-rose-500/60 rounded-2xl py-2 sm:py-3 shadow-inner">
                          <div className="text-2xl sm:text-4xl md:text-5xl font-black text-rose-400 tracking-tight animate-pulse">
                            {cd.seconds}
                          </div>
                          <div className="text-[10px] sm:text-xs text-rose-300 font-bold uppercase font-sans mt-0.5 tracking-wider">
                            Giây
                          </div>
                        </div>
                      </div>

                      <div className="text-center text-[10px] sm:text-[11px] text-amber-300/80 font-medium pt-0.5">
                        ⏳ Hệ thống sẽ tự động kích hoạt nút vào thi khi đồng hồ đếm về 0.
                      </div>
                    </div>
                  ) : examInfo?.startTimeType === 'scheduled' ? (
                    <div className="p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-300 font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>Đã đến giờ mở đề thi! Học sinh vui lòng điền thông tin và bấm Bắt đầu làm bài.</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-teal-950/70 border border-teal-500/60 rounded-2xl flex items-center space-x-2.5 text-xs text-teal-200 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>Đề thi đang mở ở chế độ làm bài tự do. Bạn có thể bắt đầu ngay khi sẵn sàng.</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Placeholder when no exam code entered yet */
                <div className="p-5 bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-center space-y-2 flex-1 flex flex-col justify-center items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Nhập mã đề thi bên trên để xem thông tin chi tiết và lịch thi
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Candidate Info & Start Exam Action (6 cols) */}
            <div className="lg:col-span-6 space-y-4 bg-slate-950/60 border border-slate-800/90 p-4 sm:p-5 md:p-6 rounded-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    Thông Tin Thí Sinh
                  </span>
                  <span className="text-[10px] text-teal-400 font-bold">Bước 2 / 2</span>
                </div>

                {/* Login Mode Toggle: SBD vs Manual */}
                <div className="flex items-center justify-between p-1 bg-slate-900 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLoginMode('SBD')}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      loginMode === 'SBD'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Đăng nhập bằng SBD
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('MANUAL')}
                    className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      loginMode === 'MANUAL'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Nhập Tên & Lớp
                  </button>
                </div>

                {loginMode === 'SBD' ? (
                  <div className="space-y-3">
                    {/* SBD Lookup Input */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                        Số Báo Danh (SBD) (*)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="VD: 9A07 hoặc 10A101"
                          value={sbdInput}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setSbdInput(val);
                            if (val.length >= 3) {
                              handleLookupSbd(val);
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 sm:py-3 font-mono font-black text-base sm:text-lg tracking-wider text-teal-300 focus:ring-2 focus:ring-teal-500 uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => handleLookupSbd()}
                          className="px-4 py-2.5 sm:py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md transition-colors"
                        >
                          Xác Nhận
                        </button>
                      </div>
                    </div>

                    {/* Verified Student Info Card */}
                    {sbdVerified && studentName ? (
                      <div className="p-3.5 bg-teal-950/70 border-2 border-teal-500/70 rounded-2xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-teal-300 font-extrabold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          <span>ĐÃ XÁC THỰC THÍ SINH THÀNH CÔNG</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Họ và Tên:</span>
                            <span className="font-black text-white text-sm">{studentName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Lớp:</span>
                            <span className="font-black text-teal-200 text-sm">Lớp {studentClass}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic leading-relaxed">
                        * Nhập Số báo danh (SBD) để hệ thống tự động tìm và xác thực thông tin học sinh dự thi.
                      </p>
                    )}
                  </div>
                ) : (
                  /* Manual Input Fallback */
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                        <span>Họ Và Tên Học Sinh (*)</span>
                        {studentClass && systemStudents.some((s) => normalizeClassStr(s.className) === normalizeClassStr(studentClass)) && (
                          <span className="text-[10px] text-teal-400 font-semibold">
                            Gợi ý theo Lớp {studentClass}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        list="system-students-name-list"
                        required={loginMode === 'MANUAL'}
                        placeholder="VD: Nguyễn Văn An"
                        value={studentName}
                        onChange={(e) => {
                          setStudentName(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        className={`w-full bg-slate-900 border rounded-2xl px-4 py-2.5 font-semibold text-slate-100 focus:ring-2 focus:outline-hidden transition-all ${
                          loginError && (loginError.includes('Họ') || loginError.includes('tên') || loginError.includes('học sinh') || loginError.includes('Học sinh'))
                            ? 'border-rose-500 focus:ring-rose-500 bg-rose-950/20'
                            : 'border-slate-700 focus:ring-teal-500'
                        }`}
                      />
                      <datalist id="system-students-name-list">
                        {systemStudents
                          .filter((s) =>
                            studentClass
                              ? normalizeClassStr(s.className) === normalizeClassStr(studentClass) || s.classId === studentClass
                              : true
                          )
                          .map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.className} {s.sbd ? `- SBD: ${s.sbd}` : ''}
                            </option>
                          ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
                          <span>Lớp (*)</span>
                        </label>
                        <input
                          type="text"
                          list="exam-allowed-classes-list"
                          required={loginMode === 'MANUAL'}
                          placeholder="VD: 10A1"
                          value={studentClass}
                          onChange={(e) => {
                            setStudentClass(e.target.value);
                            if (loginError) setLoginError('');
                          }}
                          className={`w-full bg-slate-900 border rounded-2xl px-3 sm:px-4 py-2.5 font-semibold text-slate-100 focus:ring-2 focus:outline-hidden transition-all ${
                            loginError && (loginError.includes('lớp') || loginError.includes('Lớp'))
                              ? 'border-rose-500 focus:ring-rose-500 bg-rose-950/20'
                              : 'border-slate-700 focus:ring-teal-500'
                          }`}
                        />
                        <datalist id="exam-allowed-classes-list">
                          {examInfo?.allowedClasses && examInfo.allowedClasses.length > 0
                            ? examInfo.allowedClasses.map((cls: string) => (
                                <option key={cls} value={cls} />
                              ))
                            : Array.from(
                                new Set([
                                  ...systemClasses.map((c) => c.name),
                                  ...systemStudents.map((s) => s.className),
                                ])
                              ).map((clsName) => <option key={clsName} value={clsName} />)}
                        </datalist>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                          SBD / Mã HS
                        </label>
                        <input
                          type="text"
                          placeholder="VD: 10A101"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-3 sm:px-4 py-2.5 font-semibold text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkingCode || isScheduledInFuture}
                  className={`w-full py-3.5 text-slate-950 font-black rounded-2xl text-sm sm:text-base transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
                    isScheduledInFuture
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-amber-500/50 hover:bg-slate-800'
                      : 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 shadow-teal-500/20 hover:shadow-teal-500/30'
                  }`}
                >
                  {isScheduledInFuture ? (
                    <>
                      <Clock className="w-5 h-5 text-amber-400 animate-spin" />
                      <span>Chờ Đến Giờ Mở Đề ({cd?.hours}:{cd?.minutes}:{cd?.seconds})</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Bắt Đầu Làm Bài Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
        {renderExitConfirmModal()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: TAKING EXAM (COMPACT, NO-OVERFLOW FULL-SCREEN VIEW)
  // -------------------------------------------------------------
  if (step === 'taking') {
    const currentQ = questions[currentQuestionIdx];
    const isLastQuestion = currentQuestionIdx === questions.length - 1;
    const isFirstQuestion = currentQuestionIdx === 0;

    return (
      <div className="h-screen max-h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
        {/* Compact Fixed Header Bar */}
        <header className="shrink-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 bg-teal-500 text-slate-950 font-black rounded-xl flex items-center justify-center text-xs shrink-0">
              {examInfo?.code}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold truncate max-w-xs sm:max-w-md">{examInfo?.title}</h2>
              <p className="text-[10px] text-teal-300 truncate">
                {studentName} • Lớp {studentClass} {studentId ? `(${studentId})` : ''}
              </p>
            </div>
          </div>

          {/* Digital Countdown Timer Clock & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div
              className={`px-3 py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm flex items-center space-x-1.5 transition-colors ${
                remainingSeconds <= 300
                  ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-slate-800 text-amber-300 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{formatTime(remainingSeconds)}</span>
            </div>

            <button
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center space-x-1 shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp Bài</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExitConfirmModal(true)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Thoát khỏi bài thi"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area: Responsive Grid fitting 100% viewport */}
        <div className="flex-1 overflow-hidden p-2 sm:p-4 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Left/Main Question Card (Scrollable inside, fixed outer) */}
          <div className="lg:col-span-3 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {questions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-3xl flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Đang tải câu hỏi của đề thi...
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nếu chưa thấy câu hỏi xuất hiện, vui lòng bấm nút bên dưới để tải lại nội dung đề thi từ máy chủ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (examCode) {
                      OnlineExamService.getExamDetail(examCode).then((res) => {
                        const qs = res.exam?.questions || res.exam?.examPackage?.exams?.[0]?.questions || [];
                        if (qs.length > 0) {
                          setQuestions(qs);
                          setCurrentQuestionIdx(0);
                        } else {
                          alert('Chưa tải được câu hỏi. Giáo viên vui lòng bấm "Đồng bộ Cloud" tại Kho đề thi để đẩy đầy đủ câu hỏi lên hệ thống.');
                        }
                      });
                    }
                  }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tải Lại Câu Hỏi</span>
                </button>
              </div>
            ) : currentQ ? (
              <>
                {/* Question Header */}
                <div className="shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                      Câu {currentQ.number || currentQuestionIdx + 1} / {questions.length}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({currentQ.points || 0.25} điểm)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium truncate max-w-xs">
                    {currentQ.partType === 'PART1'
                      ? 'Trắc nghiệm 4 lựa chọn'
                      : currentQ.partType === 'PART2'
                      ? 'Trắc nghiệm Đúng/Sai'
                      : currentQ.partType === 'PART3'
                      ? 'Trả lời ngắn'
                      : 'Tự luận'}
                  </span>
                </div>

                {/* Question Content & Answers Body: Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-full break-words">
                  {/* Question Content */}
                  <div className="text-sm sm:text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-100 overflow-x-auto">
                    <MathText content={currentQ.content || currentQ.text || currentQ.questionText || ''} />
                  </div>

                  {/* SVG Diagram if available */}
                  {currentQ.svgDiagram && (
                    <div
                      className="my-3 flex justify-center overflow-x-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl"
                      dangerouslySetInnerHTML={{ __html: currentQ.svgDiagram }}
                    />
                  )}

                  {/* Part 1: MCQ 4 Options */}
                  {(currentQ.partType === 'PART1' || !currentQ.partType) && (
                    <div className="grid grid-cols-1 gap-2.5 pt-1">
                      {currentQ.options?.map((opt: any, optIdx: number) => {
                        const optKey = opt.key || opt.id || ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);
                        const isSelected = answers[currentQ.id] === optKey;
                        const optText = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
                        return (
                          <button
                            key={optKey + '_' + optIdx}
                            onClick={() => handleAnswerSelect(currentQ.id, optKey)}
                            className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border-2 transition-all flex items-start space-x-3 cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 font-bold shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {optKey}
                            </div>
                            <div className="text-xs sm:text-sm pt-0.5 overflow-x-auto flex-1 break-words">
                              <MathText content={optText} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Part 2: True/False Statements */}
                  {currentQ.partType === 'PART2' && (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-xs font-bold text-slate-500">
                        Chọn Đúng hoặc Sai cho mỗi ý dưới đây:
                      </p>
                      <div className="space-y-2">
                        {(currentQ.trueFalseStatements || currentQ.statements || [])?.map((st: any, stIdx: number) => {
                          const stKey = st.key || ['a', 'b', 'c', 'd'][stIdx] || String.fromCharCode(97 + stIdx);
                          const currentTfState = answers[currentQ.id] || {};
                          const selectedVal = currentTfState[stKey];
                          const stText = typeof st === 'string' ? st : (st.content || st.text || '');

                          return (
                            <div
                              key={stKey + '_' + stIdx}
                              className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 flex-1 overflow-x-auto break-words">
                                <span className="font-bold text-teal-600 dark:text-teal-400 mr-2">
                                  {stKey})
                                </span>
                                <MathText content={stText} />
                              </div>

                              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newMap = { ...currentTfState, [stKey]: true };
                                    handleAnswerSelect(currentQ.id, newMap);
                                  }}
                                  className={`px-3.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    selectedVal === true
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Đúng
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const newMap = { ...currentTfState, [stKey]: false };
                                    handleAnswerSelect(currentQ.id, newMap);
                                  }}
                                  className={`px-3.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    selectedVal === false
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Sai
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Part 3: Short Answer */}
                  {currentQ.partType === 'PART3' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Điền kết quả trả lời ngắn của bạn:
                      </label>
                      <input
                        type="text"
                        placeholder="Nhập số hoặc đáp án ngắn gọn..."
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 sm:p-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      />
                    </div>
                  )}

                  {/* Part 4: Essay */}
                  {currentQ.partType === 'PART4' && (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Trình bày lời giải tự luận chi tiết:
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Viết các bước giải chi tiết tại đây..."
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Fixed Bottom Navigation Controls */}
                <div className="shrink-0 px-4 sm:px-6 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                  <button
                    disabled={isFirstQuestion || examInfo?.antiCheat?.disallowPrevious}
                    onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    ← Câu Trước
                  </button>

                  <button
                    onClick={() => {
                      if (isLastQuestion) {
                        setShowSubmitConfirmModal(true);
                      } else {
                        setCurrentQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1));
                      }
                    }}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {isLastQuestion ? 'Xem lại & Nộp bài' : 'Câu Tiếp Theo →'}
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Right Question Palette (Self-contained, scrollable list) */}
          <div className="hidden lg:flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <h3 className="shrink-0 font-bold text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>Danh Sách Câu Hỏi</span>
              <span className="text-[10px] text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full font-extrabold">
                {Object.keys(answers).length}/{questions.length}
              </span>
            </h3>

            {/* Grid Palette: Scrollable */}
            <div className="flex-1 overflow-y-auto py-2.5 grid grid-cols-5 gap-1.5 auto-rows-max content-start">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIdx;
                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';

                return (
                  <button
                    key={q.id}
                    disabled={examInfo?.antiCheat?.disallowPrevious && idx < currentQuestionIdx}
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-teal-500 bg-teal-600 text-white shadow-md'
                        : isAnswered
                        ? 'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {q.number}
                  </button>
                );
              })}
            </div>

            {/* Legend: Compact bottom */}
            <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[10px] text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block"></span>
                <span>Đang chọn</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-100 dark:bg-teal-950 border border-teal-400 inline-block"></span>
                <span>Đã làm ({Object.keys(answers).length})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-800 inline-block"></span>
                <span>Chưa làm ({questions.length - Object.keys(answers).length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat Tab Switch Warning Modal */}
        {showAntiCheatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-rose-800/80 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 bg-rose-950 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-lg text-white">CẢNH BÁO VI PHẠM THI</h3>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Bạn vừa rời khỏi màn hình bài thi ({tabSwitches} lần)! Hành vi này đã được ghi lại trong nhật ký chống gian lận.
              </p>
              <button
                onClick={() => setShowAntiCheatModal(false)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tôi Đã Hiểu - Quay Lại Bài Thi
              </button>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Xác nhận nộp bài thi?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bạn đã hoàn thành <span className="font-bold text-teal-600">{Object.keys(answers).length}</span>/
                {questions.length} câu hỏi.
              </p>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  Tiếp tục làm
                </button>
                <button
                  onClick={() => handleFinalSubmit(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {submitting ? 'Đang nộp...' : 'Nộp Bài Ngay'}
                </button>
              </div>
            </div>
          </div>
        )}

        {renderExitConfirmModal()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 4: CLOSED VIEW
  // -------------------------------------------------------------
  if (step === 'closed') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl text-center space-y-5 bg-slate-900 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 bg-emerald-500/15 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Đã Hoàn Thành Bài Thi!
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Cảm ơn bạn đã thực hiện bài kiểm tra. Kết quả bài làm đã được lưu trữ an toàn và nộp thành công lên hệ thống của Giáo viên.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-medium space-y-1">
            <p className="text-emerald-400 font-bold">✓ Phiên làm bài đã kết thúc an toàn</p>
            <p>Bạn có thể đóng thẻ trình duyệt này bất kỳ lúc nào.</p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                if (onExit) {
                  onExit();
                } else {
                  try {
                    window.close();
                  } catch (e) {}
                }
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs transition-colors cursor-pointer shadow-lg"
            >
              Đóng Trình Duyệt / Thoát
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 3: RESULT VIEW
  // -------------------------------------------------------------
  if (step === 'result') {
    if (!examResult) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-slate-800 p-6 rounded-3xl text-center space-y-4 border border-slate-700">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg sm:text-xl font-bold">Bài Thi Đã Được Nộp Thành Công!</h2>
            <p className="text-xs text-slate-400">Cảm ơn bạn đã hoàn thành bài thi.</p>
            <button
              onClick={() => {
                if (onExit) {
                  onExit();
                } else {
                  try {
                    window.close();
                  } catch (e) {}
                  setStep('closed');
                }
              }}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Thoát Bài Thi
            </button>
          </div>
        </div>
      );
    }

    const formatAnswerVal = (val: any) => {
      if (val === null || val === undefined) return 'Chưa trả lời';
      if (typeof val === 'object') {
        const entries = Object.entries(val).filter(([_, v]) => v !== undefined && v !== null && v !== '');
        if (entries.length === 0) return 'Chưa trả lời';
        return entries
          .map(([k, v]) => `${k.toUpperCase()}: ${v ? 'Đúng' : 'Sai'}`)
          .join(' | ');
      }
      return String(val);
    };

    const isQuestionAnswered = (studentAns: any) => {
      if (studentAns === null || studentAns === undefined) return false;
      if (typeof studentAns === 'string') {
        const trimmed = studentAns.trim();
        return (
          trimmed !== '' &&
          trimmed !== 'Chưa trả lời' &&
          trimmed !== 'null' &&
          trimmed !== 'undefined'
        );
      }
      if (typeof studentAns === 'number') {
        return !isNaN(studentAns);
      }
      if (typeof studentAns === 'boolean') {
        return true;
      }
      if (typeof studentAns === 'object') {
        const keys = Object.keys(studentAns);
        if (keys.length === 0) return false;
        return keys.some(
          (k) =>
            studentAns[k] !== undefined &&
            studentAns[k] !== null &&
            studentAns[k] !== ''
        );
      }
      return false;
    };

    const detailedList: any[] = Array.isArray(examResult.detailedGrading) ? examResult.detailedGrading : [];
    const answeredQuestions = detailedList.filter((item: any) => isQuestionAnswered(item.studentAnswer));
    const unansweredCount = detailedList.length - answeredQuestions.length;

    return (
      <div className="min-h-screen max-h-screen overflow-y-auto bg-slate-900 text-slate-100 p-3 sm:p-6 flex items-center justify-center relative">
        <div className="max-w-2xl w-full my-auto bg-slate-800/95 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 relative">
          <button
            type="button"
            onClick={() => setShowExitConfirmModal(true)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer"
            title="Thoát khỏi bài thi"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* Top Result Notification Banner */}
          <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-xs space-y-1.5 shadow-lg animate-in fade-in">
            <div className="flex items-center space-x-2 text-emerald-300 font-extrabold text-sm sm:text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>THÔNG BÁO: ĐÃ NỘP BÀI THI THÀNH CÔNG!</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
              Kết quả làm bài của bạn đã được lưu lại và gửi tới giáo viên. Hệ thống hiển thị câu hỏi và đáp án chi tiết cho{' '}
              <strong className="text-emerald-400">{answeredQuestions.length} câu đã làm</strong>.
              {unansweredCount > 0 ? (
                <> Các câu chưa làm (<strong className="text-amber-300">{unansweredCount} câu</strong>) <span className="text-amber-300 font-semibold">không hiển thị cả nội dung câu hỏi và đáp án</span> theo quy chế thi.</>
              ) : (
                <> Bạn đã hoàn thành toàn bộ tất cả câu hỏi của đề thi.</>
              )}
            </p>
          </div>

          {/* Top Gauge Header */}
          <div className="text-center space-y-1.5">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Award className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Kết Quả Bài Thi Trực Tuyến</h2>
            <p className="text-xs text-slate-400">
              {studentName || session?.studentName} • Lớp {studentClass || session?.studentClass} {studentId || session?.studentId ? `(SBD: ${studentId || session?.studentId})` : ''} | Mã đề: {examInfo?.code || session?.examCode}
            </p>
          </div>

          {/* Big Score Card */}
          <div className="bg-gradient-to-br from-teal-900/60 to-slate-900 p-5 rounded-2xl sm:rounded-3xl border border-teal-700/50 text-center space-y-1">
            <span className="text-[11px] font-bold text-teal-300 uppercase tracking-widest">
              ĐIỂM SỐ ĐẠT ĐƯỢC
            </span>
            <div className="text-4xl sm:text-5xl font-black text-teal-300 tracking-tight">
              {Number(examResult.score).toFixed(2)} <span className="text-lg sm:text-xl text-teal-400 font-normal">/ 10</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Số câu đúng</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                {examResult.correctCount} câu
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Số câu sai</span>
              <div className="text-base sm:text-lg font-black text-rose-400 mt-0.5">
                {examResult.incorrectCount} câu
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Đã làm</span>
              <div className="text-base sm:text-lg font-black text-teal-300 mt-0.5">
                {answeredQuestions.length}/{detailedList.length} câu
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Thời Gian Nộp</span>
              <div className="text-xs font-bold text-slate-200 mt-1">
                {examResult.submitTime ? new Date(examResult.submitTime).toLocaleTimeString('vi-VN') : '—'}
              </div>
            </div>
          </div>

          {/* Detailed Review Section: ONLY DISPLAY ANSWERED QUESTIONS */}
          {detailedList.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-teal-300 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Đáp Án & Lời Giải Các Câu Đã Làm ({answeredQuestions.length} câu):</span>
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  {answeredQuestions.length}/{detailedList.length} câu đã làm
                </span>
              </div>

              {/* Unanswered Notice Banner */}
              {unansweredCount > 0 && (
                <div className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-[11px] text-slate-300 flex items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Đã ẩn <strong className="text-amber-300">{unansweredCount} câu chưa làm</strong> (hệ thống không hiển thị cả câu hỏi và đáp án cho câu chưa làm).
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded-lg font-bold shrink-0">
                    Ẩn {unansweredCount} câu
                  </span>
                </div>
              )}

              {/* Review Question Cards List */}
              <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2.5 p-2.5 sm:p-3 bg-slate-900/80 rounded-2xl border border-slate-700 text-xs shadow-inner">
                {answeredQuestions.length > 0 ? (
                  answeredQuestions.map((item: any, i: number) => {
                    return (
                      <div
                        key={item.questionId || i}
                        className={`p-3 sm:p-3.5 rounded-2xl border space-y-2 transition-all ${
                          item.isCorrect
                            ? 'bg-emerald-950/20 border-emerald-800/50'
                            : 'bg-rose-950/20 border-rose-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-teal-300 font-extrabold text-xs sm:text-sm">
                            Câu {item.questionNumber}:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                              item.isCorrect
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.isCorrect ? '✓ Đúng' : '✗ Sai'} ({item.points}/{item.maxPoints}đ)
                          </span>
                        </div>

                        {/* Question Content */}
                        <div className="text-slate-200 font-medium text-xs leading-relaxed overflow-x-auto break-words">
                          <MathText content={item.content || item.questionContent || ''} />
                        </div>

                        {/* Answer Details */}
                        <div className="pt-1.5 text-[11px] space-y-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80">
                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-400 font-medium shrink-0">Bạn đã chọn:</span>
                            <div
                              className={`font-bold overflow-x-auto ${
                                item.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              <MathText content={formatAnswerVal(item.studentAnswer)} />
                            </div>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-slate-400 font-medium shrink-0">Đáp án chuẩn:</span>
                            <div className="font-extrabold text-emerald-400 overflow-x-auto">
                              <MathText content={formatAnswerVal(item.correctAnswer)} />
                            </div>
                          </div>

                          {item.explanation && (
                            <div className="pt-1.5 text-teal-300 border-t border-slate-800 space-y-1 mt-1.5">
                              <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-wider">
                                Lời giải chi tiết:
                              </span>
                              <div className="text-slate-200 bg-slate-950/80 p-2 rounded-lg border border-slate-800 overflow-x-auto">
                                <MathText content={item.explanation} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                    <p className="text-xs font-semibold text-slate-300">Bạn chưa làm câu hỏi nào trong bài thi này.</p>
                    <p className="text-[11px] text-slate-500">Theo quy định, hệ thống không hiển thị cả câu hỏi và đáp án cho các câu chưa làm.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exit Button */}
          <div className="pt-1">
            <button
              onClick={() => {
                if (onExit) {
                  onExit();
                } else {
                  try {
                    window.close();
                  } catch (e) {}
                  setStep('closed');
                }
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm transition-all cursor-pointer shadow-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Hoàn Thành & Thoát Bài Thi</span>
            </button>
          </div>
        </div>
        {renderExitConfirmModal()}
      </div>
    );
  }

  return null;
};
