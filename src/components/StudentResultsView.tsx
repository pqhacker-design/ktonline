import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { OnlineExamService, StudentResultItem, OnlineExamItem } from '../services/onlineExamService';
import { ExportExcel } from '../services/exportExcel';
import { ClassItem, StudentItem } from '../types';
import { sortStudentsDefault, naturalCompare } from '../utils/vietnameseSort';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export interface UnifiedResultItem {
  id: string;
  sbd: string;
  studentName: string;
  studentClass: string;
  studentSchool?: string;
  examCode: string;
  status: 'submitted' | 'not_taken';
  score?: number;
  correctCount?: number;
  incorrectCount?: number;
  totalQuestions?: number;
  startTime?: string;
  submitTime?: string;
  durationMinutes?: number;
  tabSwitches?: number;
  activityLogs?: { timestamp: string; event: string; details?: string }[];
  orderIndex: number;
  notes?: string;
  rawResult?: StudentResultItem;
  rawStudent?: StudentItem;
}

interface StudentResultsViewProps {
  selectedExamCode?: string;
  onNavigateTab: (tab: any) => void;
}

export const StudentResultsView: React.FC<StudentResultsViewProps> = ({
  selectedExamCode = 'ALL',
  onNavigateTab,
}) => {
  const [results, setResults] = useState<StudentResultItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [exams, setExams] = useState<OnlineExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [examCodeFilter, setExamCodeFilter] = useState<string>(selectedExamCode);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'submitted' | 'not_taken'>('ALL');

  // Detail Modal State
  const [detailModalItem, setDetailModalItem] = useState<StudentResultItem | null>(null);

  // Custom Confirm Modal & Toast state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'retake';
    item: StudentResultItem;
    title: string;
    message: string;
  } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resResults, resClasses, resStudents, resExams] = await Promise.all([
        OnlineExamService.getTeacherResults(examCodeFilter).catch(() => ({ success: false, results: [] })),
        OnlineExamService.getClasses().catch(() => ({ success: false, classes: [] })),
        OnlineExamService.getStudents().catch(() => ({ success: false, students: [] })),
        OnlineExamService.listExams().catch(() => ({ success: false, exams: [] })),
      ]);

      if (resResults.success) {
        setResults(resResults.results || []);
      }
      if (resClasses.success && Array.isArray(resClasses.classes)) {
        setClasses(resClasses.classes);
      }
      if (resStudents.success && Array.isArray(resStudents.students)) {
        setStudents(resStudents.students);
      }
      const examList = Array.isArray(resExams) ? resExams : (resExams?.exams || []);
      setExams(examList);
    } catch (err: any) {
      console.error('Lỗi lấy dữ liệu kết quả học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examCodeFilter]);

  const requestDeleteResult = (item: StudentResultItem) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      item,
      title: 'Xóa Bài Làm Của Học Sinh',
      message: `Bạn có chắc chắn muốn xóa bài làm của học sinh "${item.studentName}" (Lớp ${item.studentClass}, Mã đề [${item.examCode}])?`,
    });
  };

  const requestAllowRetake = (item: StudentResultItem) => {
    setConfirmModal({
      isOpen: true,
      type: 'retake',
      item,
      title: 'Cho Phép Học Sinh Làm Lại Bài Thi',
      message: `Cho phép học sinh "${item.studentName}" (Lớp ${item.studentClass}) làm lại bài thi mã đề [${item.examCode}]? Hành động này sẽ xóa lượt làm bài cũ để SBD/Học sinh có thể đăng nhập và làm lại bài thi mới.`,
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmModal) return;
    const { type, item } = confirmModal;
    setConfirmModal(null);

    if (type === 'delete') {
      try {
        await OnlineExamService.deleteResult(item.id);
        setResults((prev) => prev.filter((r) => r.id !== item.id));
        showToast('success', `Đã xóa bài làm của học sinh ${item.studentName}.`);
      } catch (err: any) {
        showToast('error', 'Không thể xóa bài làm: ' + err.message);
      }
    } else if (type === 'retake') {
      try {
        const res = await OnlineExamService.resetStudentSession({
          sessionId: item.id,
          examCode: item.examCode,
          sbd: item.studentSbd || item.studentId,
          studentName: item.studentName,
        });
        if (res.success) {
          setResults((prev) => prev.filter((r) => r.id !== item.id));
          showToast('success', res.message || `Đã cho phép học sinh ${item.studentName} làm lại bài thi.`);
        }
      } catch (err: any) {
        showToast('error', 'Không thể cấp phép làm lại: ' + err.message);
      }
    }
  };

  // Danh sách các Mã đề khả dụng
  const availableExams = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => e.code && set.add(e.code.toUpperCase()));
    results.forEach((r) => r.examCode && set.add(r.examCode.toUpperCase()));
    return Array.from(set).sort();
  }, [exams, results]);

  // Danh sách các Lớp khả dụng
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => c.name && set.add(c.name));
    students.forEach((s) => s.className && set.add(s.className));
    results.forEach((r) => r.studentClass && set.add(r.studentClass));
    return Array.from(set).sort(naturalCompare);
  }, [classes, students, results]);

  // Ghép nối Danh sách học sinh theo lớp và Kết quả nộp bài
  // Đảm bảo giữ đúng thứ tự đã nhập vào (orderIndex), và đánh dấu "Chưa làm" cho thí sinh chưa làm bài
  const unifiedResults = useMemo(() => {
    // 1. Xác định đề thi mục tiêu (nếu filter là cụ thể)
    const targetExam = exams.find((e) => e.code.toUpperCase() === examCodeFilter.toUpperCase());

    // 2. Xác định các lớp hợp lệ cho đề thi này (nếu có allowedClasses)
    let eligibleClassNames: Set<string> | null = null;
    if (targetExam && targetExam.allowedClasses && targetExam.allowedClasses.length > 0) {
      eligibleClassNames = new Set(targetExam.allowedClasses.map((c) => c.trim().toLowerCase()));
    }

    // 3. Lọc danh sách học sinh theo lớp được chọn (classFilter) và theo đề thi
    let targetStudents = [...students];

    if (classFilter !== 'ALL') {
      const normClass = classFilter.trim().toLowerCase();
      targetStudents = targetStudents.filter(
        (s) => s.className && s.className.trim().toLowerCase() === normClass
      );
    } else if (eligibleClassNames && eligibleClassNames.size > 0) {
      targetStudents = targetStudents.filter(
        (s) => s.className && eligibleClassNames.has(s.className.trim().toLowerCase())
      );
    }

    // 4. Nhóm học sinh theo từng lớp để giữ đúng thứ tự nhập chuẩn của từng lớp
    const studentsByClass: Record<string, StudentItem[]> = {};
    targetStudents.forEach((st) => {
      const cName = st.className || 'Chung';
      if (!studentsByClass[cName]) studentsByClass[cName] = [];
      studentsByClass[cName].push(st);
    });

    const sortedClassKeys = Object.keys(studentsByClass).sort(naturalCompare);
    const unifiedList: UnifiedResultItem[] = [];
    const matchedResultIds = new Set<string>();

    sortedClassKeys.forEach((clsKey) => {
      // Sắp xếp danh sách học sinh trong lớp theo đúng thứ tự đã nhập vào (orderIndex / SBD / Tên)
      const sortedStudentsInClass = sortStudentsDefault(studentsByClass[clsKey]);

      sortedStudentsInClass.forEach((st, idx) => {
        const stSbdNorm = (st.sbd || '').trim().toUpperCase();
        const stNameNorm = (st.name || '').trim().toLowerCase();
        const stClassNorm = (st.className || '').trim().toLowerCase();

        let matchedRes: StudentResultItem | undefined;

        // Ưu tiên khớp theo SBD
        if (stSbdNorm) {
          matchedRes = results.find((r) => {
            if (examCodeFilter !== 'ALL' && r.examCode.toUpperCase() !== examCodeFilter.toUpperCase()) {
              return false;
            }
            const rSbd = (r.studentSbd || r.studentId || '').trim().toUpperCase();
            return rSbd === stSbdNorm;
          });
        }

        // Nếu chưa khớp hoặc không có SBD, khớp theo Họ tên + Lớp
        if (!matchedRes) {
          matchedRes = results.find((r) => {
            if (examCodeFilter !== 'ALL' && r.examCode.toUpperCase() !== examCodeFilter.toUpperCase()) {
              return false;
            }
            const rName = (r.studentName || '').trim().toLowerCase();
            const rClass = (r.studentClass || '').trim().toLowerCase();
            return rName === stNameNorm && (rClass === stClassNorm || !rClass || !stClassNorm);
          });
        }

        if (matchedRes) {
          matchedResultIds.add(matchedRes.id);
          unifiedList.push({
            id: matchedRes.id,
            sbd: st.sbd || matchedRes.studentSbd || matchedRes.studentId || '',
            studentName: matchedRes.studentName || st.name,
            studentClass: st.className || matchedRes.studentClass,
            studentSchool: matchedRes.studentSchool || st.notes || '',
            examCode: matchedRes.examCode,
            status: 'submitted',
            score: matchedRes.score,
            correctCount: matchedRes.correctCount,
            incorrectCount: matchedRes.incorrectCount,
            totalQuestions: matchedRes.totalQuestions,
            startTime: matchedRes.startTime,
            submitTime: matchedRes.submitTime,
            durationMinutes: matchedRes.durationMinutes,
            tabSwitches: matchedRes.tabSwitches,
            activityLogs: matchedRes.activityLogs,
            orderIndex: typeof st.orderIndex === 'number' ? st.orderIndex : idx + 1,
            notes: 'Đã nộp bài',
            rawResult: matchedRes,
            rawStudent: st,
          });
        } else {
          // Thí sinh CHƯA LÀM BÀI -> Ghi chú hiển thị "Chưa làm"
          unifiedList.push({
            id: `unsubmitted_${st.id || idx}`,
            sbd: st.sbd || '',
            studentName: st.name,
            studentClass: st.className,
            studentSchool: st.notes || '',
            examCode: examCodeFilter !== 'ALL' ? examCodeFilter : (availableExams[0] || '---'),
            status: 'not_taken',
            score: undefined,
            correctCount: undefined,
            incorrectCount: undefined,
            totalQuestions: undefined,
            startTime: undefined,
            submitTime: undefined,
            durationMinutes: undefined,
            tabSwitches: 0,
            activityLogs: [],
            orderIndex: typeof st.orderIndex === 'number' ? st.orderIndex : idx + 1,
            notes: 'Chưa làm',
            rawStudent: st,
          });
        }
      });
    });

    // 5. Thêm các bài nộp tự do / vãng lai (không nằm trong danh sách lớp đã tạo)
    results.forEach((r, idx) => {
      if (!matchedResultIds.has(r.id)) {
        if (examCodeFilter !== 'ALL' && r.examCode.toUpperCase() !== examCodeFilter.toUpperCase()) {
          return;
        }
        if (classFilter !== 'ALL' && r.studentClass.trim().toLowerCase() !== classFilter.trim().toLowerCase()) {
          return;
        }
        unifiedList.push({
          id: r.id,
          sbd: r.studentSbd || r.studentId || '',
          studentName: r.studentName,
          studentClass: r.studentClass || 'Tự do',
          studentSchool: r.studentSchool || '',
          examCode: r.examCode,
          status: 'submitted',
          score: r.score,
          correctCount: r.correctCount,
          incorrectCount: r.incorrectCount,
          totalQuestions: r.totalQuestions,
          startTime: r.startTime,
          submitTime: r.submitTime,
          durationMinutes: r.durationMinutes,
          tabSwitches: r.tabSwitches,
          activityLogs: r.activityLogs,
          orderIndex: 99999 + idx,
          notes: 'Đã nộp bài',
          rawResult: r,
        });
      }
    });

    return unifiedList;
  }, [results, classes, students, exams, examCodeFilter, classFilter, availableExams]);

  // Lọc theo tìm kiếm và trạng thái (Tất cả / Đã làm / Chưa làm)
  const filteredUnifiedResults = useMemo(() => {
    return unifiedResults.filter((item) => {
      const matchSearch =
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.studentClass.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sbd.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.examCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [unifiedResults, searchTerm, statusFilter]);

  // Thống kê KPIs
  const totalStudents = unifiedResults.length;
  const submittedCount = unifiedResults.filter((r) => r.status === 'submitted').length;
  const notTakenCount = unifiedResults.filter((r) => r.status === 'not_taken').length;
  const submittedItems = unifiedResults.filter((r) => r.status === 'submitted' && typeof r.score === 'number');

  const avgScore =
    submittedItems.length > 0
      ? (submittedItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / submittedItems.length).toFixed(2)
      : '0.00';
  const passRate =
    submittedItems.length > 0
      ? (
          (submittedItems.filter((r) => (r.score || 0) >= 5.0).length / submittedItems.length) *
          100
        ).toFixed(1)
      : '0.0';
  const totalCheatingAlerts = submittedItems.reduce((acc, curr) => acc + (curr.tabSwitches || 0), 0);

  // Xuất Excel theo đúng thứ tự danh sách đã nhập vào và thêm cột Ghi Chú "Chưa làm"
  const handleExportExcel = () => {
    if (filteredUnifiedResults.length === 0) {
      alert('Không có dữ liệu học sinh để xuất Excel.');
      return;
    }

    try {
      ExportExcel.exportStudentResultsToExcel(filteredUnifiedResults, {
        examCode: examCodeFilter,
        className: classFilter,
      });
      showToast('success', `Đã xuất ${filteredUnifiedResults.length} học sinh ra file Excel theo đúng thứ tự thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi xuất Excel:', err);
      showToast('error', 'Lỗi khi xuất file Excel: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // Xuất PDF tóm tắt
  const handleExportPdf = () => {
    if (filteredUnifiedResults.length === 0) {
      alert('Không có dữ liệu học sinh để xuất PDF.');
      return;
    }

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`BANG KET QUA BAI THI TRUC TUYEN - MA DE ${examCodeFilter}`, 14, 20);

    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(
      `Tong so HS: ${totalStudents} | Da nop: ${submittedCount} | Chua lam: ${notTakenCount} | Diem TB: ${avgScore} | Ty le dat: ${passRate}%`,
      14,
      28
    );

    let y = 38;
    doc.setFont('Helvetica', 'bold');
    doc.text('STT | SBD | Ho Ten | Lop | Ma De | Diem | Tinh Trang', 14, y);
    doc.line(14, y + 2, 195, y + 2);
    y += 8;

    doc.setFont('Helvetica', 'normal');
    filteredUnifiedResults.forEach((r, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const scoreStr = r.status === 'submitted' && typeof r.score === 'number' ? `${r.score.toFixed(2)}d` : '---';
      const statusStr = r.status === 'submitted' ? 'Da nop bai' : 'Chua lam';
      const line = `${idx + 1}. [${r.sbd || '---'}] ${r.studentName} | ${r.studentClass} | ${r.examCode} | ${scoreStr} | ${statusStr}`;
      doc.text(line, 14, y);
      y += 7;
    });

    doc.save(`BangKetQua_MaDe_${examCodeFilter}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-teal-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-teal-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight">Thống Kê Kết Quả Học Sinh (Online)</h2>
          <p className="text-xs text-teal-200/90 max-w-2xl">
            Theo dõi chi tiết kết quả làm bài của học sinh theo đúng thứ tự danh sách lớp đã nhập. Xuất báo cáo Excel đồng bộ với cột ghi chú tình trạng làm bài.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={fetchData}
            className="p-3 bg-teal-800/80 hover:bg-teal-700 text-teal-100 rounded-2xl border border-teal-600/50 transition-colors cursor-pointer"
            title="Làm mới bảng điểm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
            title="Xuất bảng điểm ra file Excel chuẩn thứ tự danh sách"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel Theo Thứ Tự</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs transition-colors flex items-center space-x-1.5 shadow-md cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng Học Sinh</span>
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalStudents}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Đã Nộp Bài</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {submittedCount}{' '}
              <span className="text-[11px] font-normal text-slate-400">
                ({totalStudents > 0 ? ((submittedCount / totalStudents) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Chưa Làm Bài</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              {notTakenCount}{' '}
              <span className="text-[11px] font-normal text-slate-400">
                ({totalStudents > 0 ? ((notTakenCount / totalStudents) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Điểm Trung Bình</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {avgScore}{' '}
              <span className="text-[10px] font-normal text-slate-400">(≥5đ: {passRate}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Cảnh Báo Chuyển Tab</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">
              {totalCheatingAlerts} <span className="text-xs font-normal">lần</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Tìm theo Số báo danh, Họ tên, Lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
          />
        </div>

        {/* Status Tab Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất cả ({totalStudents})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Đã làm ({submittedCount})
          </button>
          <button
            onClick={() => setStatusFilter('not_taken')}
            className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
              statusFilter === 'not_taken'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Chưa làm ({notTakenCount})
          </button>
        </div>

        {/* Exam Code Dropdown */}
        <div className="flex items-center space-x-2 shrink-0">
          <select
            value={examCodeFilter}
            onChange={(e) => setExamCodeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Mã Đề: Tất cả đề thi</option>
            {availableExams.map((code) => (
              <option key={code} value={code}>
                Mã Đề: {code}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">Tất cả các Lớp</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Lớp {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Đang tải bảng kết quả bài thi học sinh...</p>
          </div>
        ) : filteredUnifiedResults.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Không tìm thấy học sinh phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không có dữ liệu phù hợp với bộ lọc tìm kiếm hiện tại. Vui lòng kiểm tra lại từ khóa hoặc chuyển bộ lọc Lớp/Mã đề.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">STT</th>
                  <th className="p-4 w-28">Số Báo Danh</th>
                  <th className="p-4">Họ Và Tên</th>
                  <th className="p-4">Lớp</th>
                  <th className="p-4">Mã Đề</th>
                  <th className="p-4 text-center">Điểm Số</th>
                  <th className="p-4 text-center">Số Câu Đúng</th>
                  <th className="p-4 text-center">Thời Gian Làm</th>
                  <th className="p-4">Thời Gian Nộp</th>
                  <th className="p-4 text-center">Ghi Chú</th>
                  <th className="p-4 text-center">Gian Lận</th>
                  <th className="p-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredUnifiedResults.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      item.status === 'not_taken' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.sbd ? (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {item.sbd}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">---</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {item.studentName}
                    </td>
                    <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                      {item.studentClass}
                    </td>
                    <td className="p-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {item.examCode}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'submitted' && typeof item.score === 'number' ? (
                        <span
                          className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                            item.score >= 8.0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : item.score >= 5.0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {item.score.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">---</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'submitted' && typeof item.correctCount === 'number' ? (
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {item.correctCount}/{item.totalQuestions || 0}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">---</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'submitted' && item.durationMinutes ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{item.durationMinutes} phút</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">---</span>
                      )}
                    </td>
                    <td className="p-4 text-[11px] text-slate-500 dark:text-slate-400">
                      {item.status === 'submitted' && item.submitTime ? (
                        new Date(item.submitTime).toLocaleString('vi-VN')
                      ) : (
                        <span className="text-slate-400 italic">Chưa nộp</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'not_taken' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[11px] font-bold border border-amber-300/60">
                          Chưa làm
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300/60">
                          Đã nộp bài
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'submitted' ? (
                        (item.tabSwitches || 0) > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            <span>{item.tabSwitches} lần</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓ Chuẩn mực
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 font-medium">---</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.status === 'submitted' && item.rawResult ? (
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => requestAllowRetake(item.rawResult!)}
                            className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/80 rounded-xl transition-colors font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Cho phép học sinh làm lại bài thi"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Làm lại</span>
                          </button>
                          <button
                            onClick={() => setDetailModalItem(item.rawResult!)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors cursor-pointer"
                            title="Xem chi tiết nhật ký thi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDeleteResult(item.rawResult!)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                            title="Xóa kết quả"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Chưa có bài nộp</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Activity Detail Modal */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chi Tiết Bài Làm - {detailModalItem.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp {detailModalItem.studentClass} | Mã đề: {detailModalItem.examCode}
                </p>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Điểm Số</span>
                <div className="text-xl font-black text-teal-600 dark:text-teal-400">
                  {detailModalItem.score.toFixed(2)}/10
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Thời Gian Làm</span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {detailModalItem.durationMinutes} phút
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Chuyển Tab</span>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {detailModalItem.tabSwitches} lần
                </div>
              </div>
            </div>

            {/* Activity Log list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhật ký hoạt động (Activity Log):
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                {detailModalItem.activityLogs && detailModalItem.activityLogs.length > 0 ? (
                  detailModalItem.activityLogs.map((log, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-start justify-between space-x-2"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.event}
                        </span>
                        {log.details && (
                          <p className="text-[11px] text-slate-500 font-sans mt-0.5">{log.details}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Không ghi nhận hành vi bất thường.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailModalItem(null)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div
                className={`p-3 rounded-2xl ${
                  confirmModal.type === 'delete'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                }`}
              >
                {confirmModal.type === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <RotateCcw className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Xác nhận thao tác quản lý bài thi</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={executeConfirmAction}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors shadow-xs cursor-pointer ${
                  confirmModal.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmModal.type === 'delete' ? 'Xác nhận Xóa' : 'Đồng ý Cho Làm Lại'}
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
                : 'bg-rose-950 text-rose-200 border-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
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

