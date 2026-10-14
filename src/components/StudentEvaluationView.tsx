import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Printer,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import {
  AiEvaluationService,
  StudentEvaluationData,
  StudentResultForEvaluation,
  ClassSubjectExamSummary,
  EvaluationTone,
} from '../services/aiEvaluationService';
import { StudentResultItem, OnlineExamItem } from '../services/onlineExamService';
import { ClassItem, StudentItem } from '../types';
import { naturalCompare, sortStudentsDefault } from '../utils/vietnameseSort';

interface StudentEvaluationViewProps {
  results: StudentResultItem[];
  classes: ClassItem[];
  students: StudentItem[];
  exams: OnlineExamItem[];
  defaultClass?: string;
  defaultExamCode?: string;
  onRefresh?: () => void;
}

export const StudentEvaluationView: React.FC<StudentEvaluationViewProps> = ({
  results,
  classes,
  students,
  exams,
  defaultClass = 'ALL',
  defaultExamCode = 'ALL',
  onRefresh,
}) => {
  // Danh sách các Lớp
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => c.name && set.add(c.name));
    students.forEach((s) => s.className && set.add(s.className));
    results.forEach((r) => r.studentClass && set.add(r.studentClass));
    return Array.from(set).sort(naturalCompare);
  }, [classes, students, results]);

  // Selected state
  const [selectedClass, setSelectedClass] = useState<string>(
    defaultClass !== 'ALL' && availableClasses.includes(defaultClass)
      ? defaultClass
      : availableClasses[0] || 'ALL'
  );

  // Danh sách các Môn học từ đề thi hoặc kết quả
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.subject) set.add(e.subject.trim());
    });
    // Thêm các môn học phổ biến nếu chưa có
    if (set.size === 0) {
      ['Toán', 'Vật lí', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lí', 'Tin học'].forEach(
        (sub) => set.add(sub)
      );
    }
    return Array.from(set).sort();
  }, [exams]);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    availableSubjects[0] || 'Toán'
  );

  // Lọc các đề thi theo môn học và lớp đã chọn
  const filteredExamsForSelection = useMemo(() => {
    return exams.filter((e) => {
      const matchSubject =
        !selectedSubject ||
        selectedSubject === 'ALL' ||
        (e.subject && e.subject.trim().toLowerCase() === selectedSubject.trim().toLowerCase());

      const matchClass =
        !selectedClass ||
        selectedClass === 'ALL' ||
        !e.allowedClasses ||
        e.allowedClasses.length === 0 ||
        e.allowedClasses.some(
          (cls) => cls.trim().toLowerCase() === selectedClass.trim().toLowerCase()
        );

      return matchSubject && matchClass;
    });
  }, [exams, selectedSubject, selectedClass]);

  const [selectedExamCode, setSelectedExamCode] = useState<string>(
    defaultExamCode !== 'ALL'
      ? defaultExamCode
      : filteredExamsForSelection[0]?.code || 'ALL'
  );

  // Cập nhật selectedExamCode khi filteredExamsForSelection thay đổi
  useEffect(() => {
    if (filteredExamsForSelection.length > 0) {
      const hasCurrent = filteredExamsForSelection.some((e) => e.code === selectedExamCode);
      if (!hasCurrent && selectedExamCode !== 'ALL') {
        setSelectedExamCode(filteredExamsForSelection[0].code);
      }
    }
  }, [filteredExamsForSelection]);

  // Filters & display state
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('ALL');
  const [tone, setTone] = useState<EvaluationTone>('pedagogical');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // AI Generation Progress State
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progressInfo, setProgressInfo] = useState<{
    completed: number;
    total: number;
    currentName: string;
  } | null>(null);

  const [evaluatingStudentId, setEvaluatingStudentId] = useState<string | null>(null);

  // Stored Evaluations State: key = sbd/id
  const [evaluations, setEvaluations] = useState<Record<string, StudentEvaluationData>>({});

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<StudentEvaluationData | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editAdvice, setEditAdvice] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Exam Summary metadata
  const currentExam = useMemo(() => {
    return exams.find(
      (e) => e.code.toUpperCase() === (selectedExamCode || '').toUpperCase()
    );
  }, [exams, selectedExamCode]);

  const examSummary: ClassSubjectExamSummary = useMemo(() => {
    return {
      className: selectedClass,
      subject: selectedSubject,
      examCode: selectedExamCode,
      examTitle: currentExam?.title || `Đề kiểm tra môn ${selectedSubject}`,
      grade: currentExam?.grade || 'Khối lớp',
      duration: currentExam?.duration || 45,
    };
  }, [selectedClass, selectedSubject, selectedExamCode, currentExam]);

  // Load saved evaluations from localStorage whenever Class, Subject or Exam changes
  useEffect(() => {
    const saved = AiEvaluationService.loadSavedEvaluations(
      selectedClass,
      selectedSubject,
      selectedExamCode
    );
    setEvaluations(saved);
  }, [selectedClass, selectedSubject, selectedExamCode]);

  // Save evaluations when state updates
  const updateAndSaveEvaluations = (newEvals: Record<string, StudentEvaluationData>) => {
    setEvaluations(newEvals);
    AiEvaluationService.saveEvaluations(
      selectedClass,
      selectedSubject,
      selectedExamCode,
      newEvals
    );
  };

  // Danh sách học sinh thuộc Lớp đã chọn và kết quả thi
  const classStudentsForEvaluation = useMemo(() => {
    // 1. Lọc học sinh trong lớp được chọn
    let targetStudents: StudentItem[] = [];
    if (selectedClass !== 'ALL') {
      const norm = selectedClass.trim().toLowerCase();
      targetStudents = students.filter(
        (s) => s.className && s.className.trim().toLowerCase() === norm
      );
    } else {
      targetStudents = [...students];
    }

    // Sắp xếp thứ tự danh sách học sinh theo SBD/Tên đã nhập
    targetStudents = sortStudentsDefault(targetStudents);

    // 2. Tìm bài nộp tương ứng cho từng học sinh
    const list: StudentResultForEvaluation[] = [];
    const matchedResultIds = new Set<string>();

    targetStudents.forEach((st, idx) => {
      const stSbdNorm = (st.sbd || '').trim().toUpperCase();
      const stNameNorm = (st.name || '').trim().toLowerCase();
      const stClassNorm = (st.className || '').trim().toLowerCase();

      let matchedRes: StudentResultItem | undefined;

      // Ưu tiên khớp theo SBD và Mã đề (hoặc môn học nếu examCode là ALL)
      if (stSbdNorm) {
        matchedRes = results.find((r) => {
          if (selectedExamCode !== 'ALL' && r.examCode.toUpperCase() !== selectedExamCode.toUpperCase()) {
            return false;
          }
          const rSbd = (r.studentSbd || r.studentId || '').trim().toUpperCase();
          return rSbd === stSbdNorm;
        });
      }

      // Khớp theo tên + lớp
      if (!matchedRes) {
        matchedRes = results.find((r) => {
          if (selectedExamCode !== 'ALL' && r.examCode.toUpperCase() !== selectedExamCode.toUpperCase()) {
            return false;
          }
          const rName = (r.studentName || '').trim().toLowerCase();
          const rClass = (r.studentClass || '').trim().toLowerCase();
          return rName === stNameNorm && (rClass === stClassNorm || !rClass || !stClassNorm);
        });
      }

      if (matchedRes) {
        matchedResultIds.add(matchedRes.id);
        list.push({
          id: matchedRes.id,
          sbd: st.sbd || matchedRes.studentSbd || matchedRes.studentId || '',
          studentName: matchedRes.studentName || st.name,
          studentClass: st.className || matchedRes.studentClass,
          examCode: matchedRes.examCode,
          status: 'submitted',
          score: matchedRes.score,
          correctCount: matchedRes.correctCount,
          incorrectCount: matchedRes.incorrectCount,
          totalQuestions: matchedRes.totalQuestions,
          durationMinutes: matchedRes.durationMinutes,
          tabSwitches: matchedRes.tabSwitches,
          detailedGrading: matchedRes.detailedGrading,
          activityLogs: matchedRes.activityLogs,
        });
      } else {
        list.push({
          id: st.id || `st_${idx}`,
          sbd: st.sbd || '',
          studentName: st.name,
          studentClass: st.className,
          examCode: selectedExamCode !== 'ALL' ? selectedExamCode : '---',
          status: 'not_taken',
          score: undefined,
          correctCount: undefined,
          incorrectCount: undefined,
          totalQuestions: undefined,
          durationMinutes: undefined,
          tabSwitches: 0,
        });
      }
    });

    // 3. Thêm các bài nộp tự do của lớp này nếu có
    results.forEach((r) => {
      if (!matchedResultIds.has(r.id)) {
        if (selectedExamCode !== 'ALL' && r.examCode.toUpperCase() !== selectedExamCode.toUpperCase()) {
          return;
        }
        if (
          selectedClass !== 'ALL' &&
          r.studentClass.trim().toLowerCase() !== selectedClass.trim().toLowerCase()
        ) {
          return;
        }
        list.push({
          id: r.id,
          sbd: r.studentSbd || r.studentId || '',
          studentName: r.studentName,
          studentClass: r.studentClass || selectedClass,
          examCode: r.examCode,
          status: 'submitted',
          score: r.score,
          correctCount: r.correctCount,
          incorrectCount: r.incorrectCount,
          totalQuestions: r.totalQuestions,
          durationMinutes: r.durationMinutes,
          tabSwitches: r.tabSwitches,
          detailedGrading: r.detailedGrading,
          activityLogs: r.activityLogs,
        });
      }
    });

    return list;
  }, [students, results, selectedClass, selectedExamCode]);

  // Tự động gán đánh giá (nếu đã có lưu thì dùng bản lưu, chưa có thì tự động tạo đánh giá chuẩn tức thời)
  const unifiedEvaluations = useMemo(() => {
    return classStudentsForEvaluation.map((st) => {
      const key = st.sbd || st.id;
      if (evaluations[key]) {
        return evaluations[key];
      }
      // Sinh tức thời theo rule-based chuẩn sư phạm để luôn có nội dung đầy đủ
      return AiEvaluationService.generateRuleBasedEvaluation(st, examSummary, tone);
    });
  }, [classStudentsForEvaluation, evaluations, examSummary, tone]);

  // Bộ lọc tìm kiếm và xếp loại
  const filteredEvaluations = useMemo(() => {
    return unifiedEvaluations.filter((ev) => {
      const matchSearch =
        ev.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.sbd && ev.sbd.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRating = ratingFilter === 'ALL' || ev.classification === ratingFilter;

      return matchSearch && matchRating;
    });
  }, [unifiedEvaluations, searchTerm, ratingFilter]);

  // Thống kê phân loại học lực và phổ điểm lớp
  const stats = useMemo(() => {
    const total = classStudentsForEvaluation.length;
    const submitted = classStudentsForEvaluation.filter((s) => s.status === 'submitted');
    const notTaken = total - submitted.length;

    const scores = submitted
      .map((s) => s.score)
      .filter((sc): sc is number => typeof sc === 'number');

    const avgScore =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : '0.00';

    const maxScore = scores.length > 0 ? Math.max(...scores).toFixed(2) : '---';
    const minScore = scores.length > 0 ? Math.min(...scores).toFixed(2) : '---';

    const countXuatSac = scores.filter((s) => s >= 9.0).length;
    const countGioi = scores.filter((s) => s >= 8.0 && s < 9.0).length;
    const countKha = scores.filter((s) => s >= 6.5 && s < 8.0).length;
    const countTB = scores.filter((s) => s >= 5.0 && s < 6.5).length;
    const countYeu = scores.filter((s) => s < 5.0).length;

    const passRate =
      scores.length > 0
        ? (((countXuatSac + countGioi + countKha + countTB) / scores.length) * 100).toFixed(1)
        : '0.0';

    const highRate =
      scores.length > 0
        ? (((countXuatSac + countGioi) / scores.length) * 100).toFixed(1)
        : '0.0';

    return {
      total,
      submittedCount: submitted.length,
      notTakenCount: notTaken,
      avgScore,
      maxScore,
      minScore,
      passRate,
      highRate,
      distribution: {
        xuatSac: { count: countXuatSac, percent: scores.length ? ((countXuatSac / scores.length) * 100).toFixed(1) : 0 },
        gioi: { count: countGioi, percent: scores.length ? ((countGioi / scores.length) * 100).toFixed(1) : 0 },
        kha: { count: countKha, percent: scores.length ? ((countKha / scores.length) * 100).toFixed(1) : 0 },
        tb: { count: countTB, percent: scores.length ? ((countTB / scores.length) * 100).toFixed(1) : 0 },
        yeu: { count: countYeu, percent: scores.length ? ((countYeu / scores.length) * 100).toFixed(1) : 0 },
      },
    };
  }, [classStudentsForEvaluation]);

  // Hành động 1: Chạy AI đánh giá cả lớp
  const handleBatchGenerateAi = async () => {
    if (classStudentsForEvaluation.length === 0) {
      showToast('error', 'Chưa có học sinh nào trong lớp này để đánh giá.');
      return;
    }

    setIsGeneratingAll(true);
    setProgressInfo({
      completed: 0,
      total: classStudentsForEvaluation.length,
      currentName: 'Bắt đầu phân tích AI...',
    });

    try {
      const generated = await AiEvaluationService.generateAiEvaluationsForClass(
        classStudentsForEvaluation,
        examSummary,
        tone,
        undefined,
        (completed, total, currentName) => {
          setProgressInfo({ completed, total, currentName });
        }
      );

      const merged = { ...evaluations, ...generated };
      updateAndSaveEvaluations(merged);
      showToast(
        'success',
        `Hoàn tất đánh giá AI cho ${classStudentsForEvaluation.length} học sinh môn ${selectedSubject} (Lớp ${selectedClass})!`
      );
    } catch (err: any) {
      console.error('Lỗi khi đánh giá hàng loạt:', err);
      showToast('error', 'Không thể hoàn tất đánh giá AI: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsGeneratingAll(false);
      setProgressInfo(null);
    }
  };

  // Hành động 2: Chạy AI đánh giá cho 1 học sinh cụ thể
  const handleGenerateSingleStudentAi = async (student: StudentResultForEvaluation) => {
    const key = student.sbd || student.id;
    setEvaluatingStudentId(key);

    try {
      const generated = await AiEvaluationService.generateAiEvaluationForStudent(
        student,
        examSummary,
        tone
      );

      const updated = { ...evaluations, [key]: generated };
      updateAndSaveEvaluations(updated);
      showToast('success', `Đã cập nhật đánh giá AI cho học sinh ${student.studentName}!`);
    } catch (err: any) {
      console.error('Lỗi khi đánh giá học sinh:', err);
      showToast('error', 'Không thể cập nhật đánh giá: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setEvaluatingStudentId(null);
    }
  };

  // Hành động 3: Chỉnh sửa thủ công nhận xét của giáo viên
  const handleOpenEditModal = (item: StudentEvaluationData) => {
    setEditingItem(item);
    setEditComment(item.comment);
    setEditAdvice(item.advice);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const key = editingItem.sbd || editingItem.id;
    const updated: StudentEvaluationData = {
      ...editingItem,
      comment: editComment.trim(),
      advice: editAdvice.trim(),
      isCustomEdited: true,
      generatedAt: new Date().toISOString(),
    };

    const newMap = { ...evaluations, [key]: updated };
    updateAndSaveEvaluations(newMap);
    setEditingItem(null);
    showToast('success', `Đã lưu nhận xét tùy chỉnh cho học sinh ${editingItem.studentName}!`);
  };

  // Hành động 4: Sao chép nhận xét của 1 học sinh
  const handleCopySingleEvaluation = (item: StudentEvaluationData) => {
    const text = `[ĐÁNH GIÁ MÔN ${item.subject.toUpperCase()} - LỚP ${item.studentClass}]
Học sinh: ${item.studentName} (SBD: ${item.sbd || '---'})
Điểm số: ${typeof item.score === 'number' ? item.score.toFixed(2) + '/10đ' : 'Chưa làm bài'} - Xếp loại: ${item.classification}
• Nhận xét: ${item.comment}
• Lời khuyên & Định hướng: ${item.advice}`;

    navigator.clipboard.writeText(text);
    showToast('info', `Đã sao chép nhận xét của ${item.studentName} vào bộ nhớ tạm!`);
  };

  // Hành động 5: Sao chép toàn bộ nhận xét của cả lớp
  const handleCopyAllEvaluations = () => {
    if (filteredEvaluations.length === 0) return;
    const header = `BÁO CÁO ĐÁNH GIÁ KẾT QUẢ HỌC TẬP MÔN ${selectedSubject.toUpperCase()} - LỚP ${selectedClass}\nĐiểm TB: ${stats.avgScore}đ | Tỷ lệ Đạt: ${stats.passRate}%\n${'='.repeat(60)}\n\n`;

    const body = filteredEvaluations
      .map(
        (ev, i) =>
          `${i + 1}. [${ev.sbd || '---'}] ${ev.studentName} | ${typeof ev.score === 'number' ? ev.score.toFixed(2) + 'đ' : 'Chưa làm'} (${ev.classification})\n- Nhận xét: ${ev.comment}\n- Lời khuyên: ${ev.advice}\n`
      )
      .join('\n');

    navigator.clipboard.writeText(header + body);
    showToast('success', `Đã sao chép toàn bộ ${filteredEvaluations.length} nhận xét của lớp vào Clipboard!`);
  };

  // Hành động 6: Xuất Excel
  const handleExportExcel = () => {
    if (filteredEvaluations.length === 0) {
      showToast('error', 'Không có dữ liệu đánh giá để xuất Excel.');
      return;
    }
    try {
      AiEvaluationService.exportClassEvaluationToExcel(filteredEvaluations, examSummary);
      showToast('success', `Đã xuất ${filteredEvaluations.length} đánh giá học sinh ra file Excel thành công!`);
    } catch (e: any) {
      showToast('error', 'Lỗi khi xuất file Excel: ' + (e.message || 'Lỗi không xác định'));
    }
  };

  // Hành động 7: In báo cáo / Phiếu đánh giá
  const handlePrintReports = () => {
    window.print();
  };

  const getClassificationBadgeStyle = (classification: StudentEvaluationData['classification']) => {
    switch (classification) {
      case 'Xuất sắc':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'Giỏi':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Khá':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      case 'Trung bình':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Yếu':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-indigo-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>AI SƯ PHẠM ĐÁNH GIÁ NĂNG LỰC & LỜI KHUYÊN HỌC TẬP</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <span>Đánh Giá Kết Quả HS Theo Môn - Lớp</span>
          </h2>
          <p className="text-xs md:text-sm text-indigo-200/90 leading-relaxed">
            Hệ thống trí tuệ nhân tạo (AI Gemini 3.8 Flash) tự động phân tích điểm số, câu đúng/sai, thời gian làm bài
            để sinh <strong>Nhận xét năng lực</strong> và <strong>Lời khuyên cá nhân hóa</strong> cho từng học sinh theo chuẩn Thông tư 22/BGDĐT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleBatchGenerateAi}
            disabled={isGeneratingAll || classStudentsForEvaluation.length === 0}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center space-x-2 cursor-pointer"
            title="AI phân tích và sinh nhận xét cho toàn bộ học sinh trong lớp"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>{isGeneratingAll ? 'Đang Đánh Giá AI...' : '⚡ AI Đánh Giá Cả Lớp'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-3 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1.5 border border-indigo-600/50 shadow-md cursor-pointer"
            title="Xuất bảng đánh giá và lời khuyên ra Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleCopyAllEvaluations}
            className="px-4 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1.5 border border-slate-700 shadow-md cursor-pointer"
            title="Sao chép toàn bộ nhận xét để dán vào Zalo / Sổ liên lạc"
          >
            <Copy className="w-4 h-4 text-sky-400" />
            <span>Sao Chép Tất Cả</span>
          </button>

          <button
            onClick={handlePrintReports}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 transition-colors cursor-pointer"
            title="In / Lưu PDF trang này"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar when running Batch AI */}
      {isGeneratingAll && progressInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-4 rounded-3xl shadow-sm space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Tiến độ đánh giá AI: {progressInfo.currentName}</span>
            </span>
            <span>
              {progressInfo.completed} / {progressInfo.total} học sinh (
              {Math.round((progressInfo.completed / (progressInfo.total || 1)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((progressInfo.completed / (progressInfo.total || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main Filter & Selector Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {/* Select Lớp */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>1. Chọn Lớp Học:</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              {availableClasses.length === 0 ? (
                <option value="ALL">Chưa có lớp</option>
              ) : (
                availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Lớp {cls}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Select Môn học */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-500" />
              <span>2. Chọn Môn Học:</span>
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-hidden cursor-pointer"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  Môn: {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Select Đề thi / Mã đề */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>3. Đề Thi / Mã Đề:</span>
            </label>
            <select
              value={selectedExamCode}
              onChange={(e) => setSelectedExamCode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả đề thi môn {selectedSubject}</option>
              {filteredExamsForSelection.map((ex) => (
                <option key={ex.code} value={ex.code}>
                  [{ex.code}] {ex.title || `Đề kiểm tra ${ex.code}`}
                </option>
              ))}
            </select>
          </div>

          {/* Phong cách nhận xét AI */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
              <span>4. Phong Cách AI:</span>
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as EvaluationTone)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer"
            >
              <option value="pedagogical">Sư phạm & Khích lệ (Mặc định)</option>
              <option value="concise">Ngắn gọn (Sổ liên lạc / Zalo)</option>
              <option value="in_depth">Phân tích học thuật chi tiết</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter: Search & Classification Filter & View Mode */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm học sinh theo Họ tên hoặc SBD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Xếp loại:</span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'Xuất sắc', label: 'Xuất sắc (≥9)' },
              { id: 'Giỏi', label: 'Giỏi (8-8.9)' },
              { id: 'Khá', label: 'Khá (6.5-7.9)' },
              { id: 'Trung bình', label: 'TB (5-6.4)' },
              { id: 'Yếu', label: 'Yếu (<5)' },
              { id: 'Chưa làm bài', label: 'Chưa làm' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setRatingFilter(btn.id)}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  ratingFilter === btn.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Thẻ chi tiết
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Dạng bảng
            </button>
          </div>
        </div>
      </div>

      {/* Class Statistics Overview Cards & Score Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Sĩ Số Lớp</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}{' '}
            <span className="text-xs font-normal text-slate-400">HS</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {stats.submittedCount} đã nộp ({stats.total > 0 ? Math.round((stats.submittedCount / stats.total) * 100) : 0}%)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Điểm Trung Bình</span>
            <Award className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-teal-600 dark:text-teal-400">
            {stats.avgScore}{' '}
            <span className="text-xs font-normal text-slate-400">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">
            Môn {selectedSubject}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tỷ Lệ Đạt (≥5.0)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.passRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">
            Đạt chuẩn môn học
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Khá & Giỏi (≥8.0)</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.highRate}%
          </div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">
            {stats.distribution.xuatSac.count + stats.distribution.gioi.count} học sinh
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Thủ Khoa Lớp</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.maxScore}đ
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            Thấp nhất: {stats.minScore}đ
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Chưa Làm Bài</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.notTakenCount}{' '}
            <span className="text-xs font-normal text-slate-400">HS</span>
          </div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            Cần nhắc nhở làm bù
          </div>
        </div>
      </div>

      {/* Visual Score Distribution Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Phổ Điểm & Cơ Cấu Học Lực Lớp {selectedClass} - Môn {selectedSubject}</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-medium">
            (Tổng số: {stats.submittedCount} bài nộp)
          </span>
        </div>

        {/* Multi-colored bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div
            style={{ width: `${stats.distribution.xuatSac.percent}%` }}
            className="bg-purple-500 hover:opacity-90 transition-all"
            title={`Xuất sắc: ${stats.distribution.xuatSac.count} HS (${stats.distribution.xuatSac.percent}%)`}
          />
          <div
            style={{ width: `${stats.distribution.gioi.percent}%` }}
            className="bg-emerald-500 hover:opacity-90 transition-all"
            title={`Giỏi: ${stats.distribution.gioi.count} HS (${stats.distribution.gioi.percent}%)`}
          />
          <div
            style={{ width: `${stats.distribution.kha.percent}%` }}
            className="bg-sky-500 hover:opacity-90 transition-all"
            title={`Khá: ${stats.distribution.kha.count} HS (${stats.distribution.kha.percent}%)`}
          />
          <div
            style={{ width: `${stats.distribution.tb.percent}%` }}
            className="bg-amber-500 hover:opacity-90 transition-all"
            title={`Trung bình: ${stats.distribution.tb.count} HS (${stats.distribution.tb.percent}%)`}
          />
          <div
            style={{ width: `${stats.distribution.yeu.percent}%` }}
            className="bg-rose-500 hover:opacity-90 transition-all"
            title={`Yếu: ${stats.distribution.yeu.count} HS (${stats.distribution.yeu.percent}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs pt-1">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Xuất sắc (≥9):</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {stats.distribution.xuatSac.count} ({stats.distribution.xuatSac.percent}%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Giỏi (8-8.9):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {stats.distribution.gioi.count} ({stats.distribution.gioi.percent}%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Khá (6.5-7.9):</span>
            <span className="font-bold text-sky-600 dark:text-sky-400">
              {stats.distribution.kha.count} ({stats.distribution.kha.percent}%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Trung bình (5-6.4):</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {stats.distribution.tb.count} ({stats.distribution.tb.percent}%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Yếu (&lt;5):</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {stats.distribution.yeu.count} ({stats.distribution.yeu.percent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Student List View (Cards or Table) */}
      {filteredEvaluations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <UserX className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Không tìm thấy học sinh phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Không có học sinh nào thỏa mãn bộ lọc hiện tại của Lớp {selectedClass} và Môn {selectedSubject}.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvaluations.map((item, idx) => {
            const studentMatch = classStudentsForEvaluation.find(
              (s) => (s.sbd && s.sbd === item.sbd) || s.id === item.id
            );
            const isEvaluatingThis = evaluatingStudentId === (item.sbd || item.id);

            return (
              <div
                key={item.id || idx}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${
                  item.classification === 'Xuất sắc'
                    ? 'border-purple-200 dark:border-purple-900/60'
                    : item.classification === 'Giỏi'
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : item.classification === 'Khá'
                    ? 'border-sky-200 dark:border-sky-900/60'
                    : item.classification === 'Trung bình'
                    ? 'border-amber-200 dark:border-amber-900/60'
                    : item.classification === 'Yếu'
                    ? 'border-rose-200 dark:border-rose-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top: Student Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
                      {item.studentName ? item.studentName.split(' ').pop()?.slice(0, 2).toUpperCase() : 'HS'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.studentName}</span>
                        {item.isCustomEdited && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal"
                            title="Đã được giáo viên chỉnh sửa"
                          >
                            Đã sửa
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          SBD: {item.sbd || '---'}
                        </span>
                        <span>•</span>
                        <span>Lớp {item.studentClass}</span>
                        <span>•</span>
                        <span className="font-semibold text-teal-600 dark:text-teal-400">{item.subject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score & Rating Badge */}
                  <div className="text-right shrink-0">
                    {typeof item.score === 'number' ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {item.score.toFixed(2)}
                          <span className="text-xs font-normal text-slate-400">/10</span>
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border mt-1 ${getClassificationBadgeStyle(
                            item.classification
                          )}`}
                        >
                          {item.classification}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300">
                        Chưa làm bài
                      </span>
                    )}
                  </div>
                </div>

                {/* Performance Mini Stats */}
                {typeof item.score === 'number' && (
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Đúng</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.correctCount}/{item.totalQuestions || 0} câu
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Thời gian</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {item.durationMinutes || 0} phút
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tập trung</span>
                      <span
                        className={`font-bold ${
                          (item.tabSwitches || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {(item.tabSwitches || 0) > 0 ? `${item.tabSwitches} lần rời` : '✓ Chuẩn mực'}
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Comment Section */}
                <div className="space-y-1.5 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center space-x-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Nhận xét của AI:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {item.comment}
                  </p>
                </div>

                {/* AI Advice & Guidance Section */}
                <div className="space-y-1.5 p-3.5 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/40">
                  <div className="flex items-center space-x-1.5 text-xs font-extrabold text-teal-900 dark:text-teal-200">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span>Lời khuyên & Định hướng cải thiện:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {item.advice}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    {item.generatedAt ? `Đánh giá: ${new Date(item.generatedAt).toLocaleDateString('vi-VN')}` : ''}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopySingleEvaluation(item)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Sao chép nhận xét của học sinh này"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Chỉnh sửa nhận xét"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {studentMatch && studentMatch.status === 'submitted' && (
                      <button
                        onClick={() => handleGenerateSingleStudentAi(studentMatch)}
                        disabled={isEvaluatingThis}
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="AI phân tích và đánh giá lại học sinh này"
                      >
                        <RefreshCw className={`w-3 h-3 ${isEvaluatingThis ? 'animate-spin' : ''}`} />
                        <span>{isEvaluatingThis ? 'Đang phân tích...' : 'AI Đánh giá lại'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3.5 w-12 text-center">STT</th>
                  <th className="p-3.5 w-24">SBD</th>
                  <th className="p-3.5 w-36">Họ Và Tên</th>
                  <th className="p-3.5 w-20">Lớp</th>
                  <th className="p-3.5 w-20 text-center">Điểm</th>
                  <th className="p-3.5 w-24 text-center">Xếp Loại</th>
                  <th className="p-3.5">Nhận Xét Của AI</th>
                  <th className="p-3.5">Lời Khuyên Của AI</th>
                  <th className="p-3.5 w-24 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredEvaluations.map((item, idx) => {
                  const studentMatch = classStudentsForEvaluation.find(
                    (s) => (s.sbd && s.sbd === item.sbd) || s.id === item.id
                  );
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.sbd || '---'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {item.studentName}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-400">
                        {item.studentClass}
                      </td>
                      <td className="p-3.5 text-center font-black">
                        {typeof item.score === 'number' ? (
                          <span
                            className={
                              item.score >= 8.0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.score >= 5.0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {item.score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">Chưa làm</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getClassificationBadgeStyle(
                            item.classification
                          )}`}
                        >
                          {item.classification}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed text-[11px]">
                        {item.comment}
                      </td>
                      <td className="p-3.5 text-teal-800 dark:text-teal-300 max-w-xs leading-relaxed text-[11px]">
                        {item.advice}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleCopySingleEvaluation(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Sao chép"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {studentMatch && studentMatch.status === 'submitted' && (
                            <button
                              onClick={() => handleGenerateSingleStudentAi(studentMatch)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                              title="AI Đánh giá lại"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Evaluation Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Chỉnh Sửa Nhận Xét & Lời Khuyên
                </h3>
                <p className="text-xs text-slate-500">
                  Học sinh: {editingItem.studentName} | Lớp {editingItem.studentClass} | Môn {editingItem.subject}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Nhận xét của giáo viên (Đánh giá năng lực & bài làm):
                </label>
                <textarea
                  rows={4}
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Nhập nội dung nhận xét..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Lời khuyên & Định hướng cải thiện cho học sinh:
                </label>
                <textarea
                  rows={4}
                  value={editAdvice}
                  onChange={(e) => setEditAdvice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  placeholder="Nhập lời khuyên và lộ trình học tập..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Lưu Nhận Xét
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : toast.type === 'info'
                ? 'bg-indigo-950 text-indigo-200 border-indigo-800'
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toast.type === 'info' ? (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
