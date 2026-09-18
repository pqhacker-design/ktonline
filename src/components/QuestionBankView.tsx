import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  Filter,
  Layers,
  FolderMinus,
  AlertOctagon,
  X,
  Check,
  Loader2,
  FileText,
  BookmarkCheck,
  Clock,
  Calendar,
} from 'lucide-react';
import { ExamPackage, QuestionBankItem, SubjectType } from '../types';
import { MathText } from './MathText';
import { QuestionDetailCard } from './QuestionDetailCard';

// Helper function to format date time in Vietnamese format
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

interface QuestionBankViewProps {
  questionBank: QuestionBankItem[];
  examHistory?: ExamPackage[];
  onAddQuestion: (item: QuestionBankItem) => void;
  onDeleteQuestion: (id: string) => void;
  onDeleteMultipleQuestions?: (ids: string[]) => void;
  onClearQuestionBank?: () => void;
  onExportExcel?: () => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questionBank,
  examHistory = [],
  onAddQuestion,
  onDeleteQuestion,
  onDeleteMultipleQuestions,
  onClearQuestionBank,
  onExportExcel,
}) => {
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedCognitive, setSelectedCognitive] = useState<string>('ALL');

  // Bulk Delete Modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteType, setBulkDeleteType] = useState<'FILTER' | 'EXAM_NAME' | 'SUBJECT_GRADE' | 'TOPIC' | 'CLEAR_ALL'>('FILTER');
  const [targetExamKey, setTargetExamKey] = useState<string>('');
  const [examSearchFilter, setExamSearchFilter] = useState<string>('');
  const [targetSubject, setTargetSubject] = useState<string>('ALL');
  const [targetGrade, setTargetGrade] = useState<string>('ALL');
  const [targetTopic, setTargetTopic] = useState<string>('');
  const [confirmClearText, setConfirmClearText] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState<SubjectType>('Toán');
  const [newGrade, setNewGrade] = useState('Khối 10');
  const [newChapter, setNewChapter] = useState('Chương I. Hàm số');
  const [newCognitive, setNewCognitive] = useState<'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ADVANCED'>('REMEMBER');
  const [newOptA, setNewOptA] = useState('');
  const [newOptB, setNewOptB] = useState('');
  const [newOptC, setNewOptC] = useState('');
  const [newOptD, setNewOptD] = useState('');
  const [newCorrectOpt, setNewCorrectOpt] = useState('A');

  // Filtered List
  const filteredList = questionBank.filter((item) => {
    const matchesSearch =
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.chapter && item.chapter.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.topic && item.topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sourceExamTitle && item.sourceExamTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.examTitle && item.examTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject = selectedSubject === 'ALL' || item.subject === selectedSubject;
    const matchesGrade = selectedGrade === 'ALL' || item.grade === selectedGrade;
    const matchesCognitive =
      selectedCognitive === 'ALL' || item.cognitiveLevel === selectedCognitive;

    return matchesSearch && matchesSubject && matchesGrade && matchesCognitive;
  });

  // Extract unique topics/chapters for bulk delete picker
  const uniqueTopics = Array.from(
    new Set(
      questionBank
        .map((q) => q.chapter || q.topic || '')
        .filter((t) => t && t.trim().length > 0)
    )
  ).sort();

  // Extract unique subjects & grades present in bank
  const uniqueSubjectsInBank = Array.from(
    new Set(questionBank.map((q) => q.subject).filter(Boolean))
  );
  const uniqueGradesInBank = Array.from(
    new Set(questionBank.map((q) => q.grade).filter(Boolean))
  );

  // Extract unique exams with exact dates & times from questionBank & examHistory
  const examOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        title: string;
        createdDate?: string;
        formattedDate?: string;
        subject?: string;
        grade?: string;
        ids: string[];
        samples: string[];
      }
    >();

    questionBank.forEach((q) => {
      let examId = q.sourceExamId || '';
      let title = (q.sourceExamTitle || q.examTitle || '').trim();
      let createdDate = q.createdDate || '';

      // Match against examHistory to enrich title and created date
      if (examId && examHistory.length > 0) {
        const matched = examHistory.find((ex) => ex.id === examId);
        if (matched) {
          if (!title) title = (matched.metadata.examTitle || '').trim();
          if (!createdDate) createdDate = matched.createdAt;
        }
      } else if (examHistory.length > 0) {
        const matched = examHistory.find((ex) =>
          ex.exams.some((e) =>
            e.questions.some(
              (eq) => eq.id === q.id || (eq.content === q.content && eq.partType === q.partType)
            )
          )
        );
        if (matched) {
          examId = matched.id;
          if (!title) title = (matched.metadata.examTitle || '').trim();
          if (!createdDate) createdDate = matched.createdAt;
        }
      }

      if (title || examId) {
        const finalTitle = title || 'Đề kiểm tra';
        // Unique group key: either specific examId or composite title + date
        const dateSlice = createdDate ? createdDate.slice(0, 16) : 'nodate';
        const groupKey = examId ? `exam_${examId}` : `custom_${finalTitle}_${dateSlice}`;

        const entry = map.get(groupKey) || {
          key: groupKey,
          title: finalTitle,
          createdDate: createdDate,
          formattedDate: formatDateTime(createdDate),
          subject: q.subject,
          grade: q.grade,
          ids: [],
          samples: [],
        };

        if (!entry.createdDate && createdDate) {
          entry.createdDate = createdDate;
          entry.formattedDate = formatDateTime(createdDate);
        }
        if (!entry.subject && q.subject) entry.subject = q.subject;
        if (!entry.grade && q.grade) entry.grade = q.grade;

        entry.ids.push(q.id);
        if (entry.samples.length < 3 && q.content) {
          entry.samples.push(q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content);
        }
        map.set(groupKey, entry);
      }
    });

    // Also include exams from examHistory that have questions in bank
    if (examHistory.length > 0) {
      examHistory.forEach((ex) => {
        const groupKey = `exam_${ex.id}`;
        if (!map.has(groupKey)) {
          const title = (ex.metadata.examTitle || '').trim() || 'Đề kiểm tra';
          const matchedQs = questionBank.filter(
            (q) =>
              q.sourceExamId === ex.id ||
              (q.sourceExamTitle || q.examTitle || '').trim() === title ||
              ex.exams.some((e) => e.questions.some((eq) => eq.id === q.id || eq.content === q.content))
          );
          if (matchedQs.length > 0) {
            map.set(groupKey, {
              key: groupKey,
              title,
              createdDate: ex.createdAt,
              formattedDate: formatDateTime(ex.createdAt),
              subject: ex.metadata.subject,
              grade: ex.metadata.grade,
              ids: matchedQs.map((q) => q.id),
              samples: matchedQs
                .slice(0, 3)
                .map((q) => (q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content)),
            });
          }
        }
      });
    }

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        count: entry.ids.length,
      }))
      .sort((a, b) => {
        if (a.createdDate && b.createdDate) {
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        }
        return b.count - a.count;
      });
  }, [questionBank, examHistory]);

  // Filtered exam options for search (title, date/time, subject, grade)
  const filteredExamOptions = useMemo(() => {
    if (!examSearchFilter.trim()) return examOptions;
    const filterLower = examSearchFilter.trim().toLowerCase();
    return examOptions.filter(
      (opt) =>
        opt.title.toLowerCase().includes(filterLower) ||
        (opt.formattedDate && opt.formattedDate.toLowerCase().includes(filterLower)) ||
        (opt.createdDate && opt.createdDate.toLowerCase().includes(filterLower)) ||
        (opt.subject && opt.subject.toLowerCase().includes(filterLower)) ||
        (opt.grade && opt.grade.toLowerCase().includes(filterLower))
    );
  }, [examOptions, examSearchFilter]);

  // Compute items to delete for bulk modal
  const getItemsToDelete = (): QuestionBankItem[] => {
    if (bulkDeleteType === 'FILTER') {
      return filteredList;
    }
    if (bulkDeleteType === 'EXAM_NAME') {
      if (!targetExamKey) return [];
      const selectedOpt = examOptions.find((opt) => opt.key === targetExamKey);
      if (!selectedOpt) return [];
      return questionBank.filter((q) => selectedOpt.ids.includes(q.id));
    }
    if (bulkDeleteType === 'SUBJECT_GRADE') {
      return questionBank.filter((q) => {
        const matchSub = targetSubject === 'ALL' || q.subject === targetSubject;
        const matchGrd = targetGrade === 'ALL' || q.grade === targetGrade;
        return matchSub && matchGrd;
      });
    }
    if (bulkDeleteType === 'TOPIC') {
      if (!targetTopic) return [];
      return questionBank.filter(
        (q) =>
          (q.chapter && q.chapter.toLowerCase() === targetTopic.toLowerCase()) ||
          (q.topic && q.topic.toLowerCase() === targetTopic.toLowerCase())
      );
    }
    if (bulkDeleteType === 'CLEAR_ALL') {
      return questionBank;
    }
    return [];
  };

  const itemsToDelete = getItemsToDelete();
  const selectedExamOption = examOptions.find((opt) => opt.key === targetExamKey);

  const handleConfirmSingleDelete = async () => {
    if (!deletingQuestionId || isDeletingSingle) return;
    setIsDeletingSingle(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      onDeleteQuestion(deletingQuestionId);
    } finally {
      setIsDeletingSingle(false);
      setDeletingQuestionId(null);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (itemsToDelete.length === 0 || isDeletingBulk) return;
    setIsDeletingBulk(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      if (bulkDeleteType === 'CLEAR_ALL') {
        if (onClearQuestionBank) {
          onClearQuestionBank();
        } else if (onDeleteMultipleQuestions) {
          onDeleteMultipleQuestions(questionBank.map((q) => q.id));
        } else {
          questionBank.forEach((q) => onDeleteQuestion(q.id));
        }
      } else {
        const ids = itemsToDelete.map((q) => q.id);
        if (onDeleteMultipleQuestions) {
          onDeleteMultipleQuestions(ids);
        } else {
          ids.forEach((id) => onDeleteQuestion(id));
        }
      }
    } finally {
      setIsDeletingBulk(false);
      setShowBulkDeleteModal(false);
      setConfirmClearText('');
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent) return;

    const newItem: QuestionBankItem = {
      id: 'qb_' + Date.now(),
      subject: newSubject,
      grade: newGrade,
      chapter: newChapter,
      curriculum: 'Kết nối tri thức với cuộc sống',
      partType: 'PART1',
      partTitle: 'PHẦN I',
      number: 1,
      content: newContent,
      cognitiveLevel: newCognitive,
      points: 0.25,
      topic: newChapter,
      options: [
        { key: 'A', content: newOptA || 'Phương án A' },
        { key: 'B', content: newOptB || 'Phương án B' },
        { key: 'C', content: newOptC || 'Phương án C' },
        { key: 'D', content: newOptD || 'Phương án D' },
      ],
      correctOption: newCorrectOpt,
      createdDate: new Date().toISOString(),
    };

    onAddQuestion(newItem);
    setShowAddModal(false);
    setNewContent('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            Ngân Hàng Câu Hỏi Dùng Chung ({questionBank.length} câu)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động tích lũy các câu hỏi đã sinh từ các Đề kiểm tra đã tạo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Câu Hỏi</span>
          </button>

          <button
            onClick={() => {
              if (examOptions.length > 0 && !targetExamKey) {
                setTargetExamKey(examOptions[0].key);
              }
              if (uniqueTopics.length > 0 && !targetTopic) {
                setTargetTopic(uniqueTopics[0]);
              }
              setShowBulkDeleteModal(true);
            }}
            className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            title="Xóa câu hỏi theo tên bài kiểm tra, môn/khối, chủ đề hoặc xóa tất cả"
          >
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Xóa / Dọn Dẹp Ngân Hàng</span>
          </button>

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo nội dung, chủ đề..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>

        {/* Subject Filter */}
        <div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
          >
            <option value="ALL">Tất cả môn học</option>
            <option value="Toán">Toán</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="KHTN">KHTN</option>
            <option value="Lịch sử và Địa lí">Lịch sử và Địa lí</option>
          </select>
        </div>

        {/* Grade Filter */}
        <div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
          >
            <option value="ALL">Tất cả khối lớp</option>
            <option value="Khối 6">Khối 6</option>
            <option value="Khối 7">Khối 7</option>
            <option value="Khối 8">Khối 8</option>
            <option value="Khối 9">Khối 9</option>
            <option value="Khối 10">Khối 10</option>
            <option value="Khối 11">Khối 11</option>
            <option value="Khối 12">Khối 12</option>
          </select>
        </div>

        {/* Cognitive Filter */}
        <div>
          <select
            value={selectedCognitive}
            onChange={(e) => setSelectedCognitive(e.target.value)}
            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="REMEMBER">Nhận biết</option>
            <option value="UNDERSTAND">Thông hiểu</option>
            <option value="APPLY">Vận dụng</option>
            <option value="ADVANCED">Vận dụng cao</option>
          </select>
        </div>
      </div>

      {/* Active Filter status bar & quick delete filtered */}
      {(selectedSubject !== 'ALL' || selectedGrade !== 'ALL' || selectedCognitive !== 'ALL' || searchTerm) && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              Đang lọc: <strong>{filteredList.length}</strong> / <strong>{questionBank.length}</strong> câu hỏi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBulkDeleteType('FILTER');
              setShowBulkDeleteModal(true);
            }}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 cursor-pointer ml-2 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa {filteredList.length} câu đang lọc này</span>
          </button>
        </div>
      )}

      {/* Question Cards Grid */}
      {filteredList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Không tìm thấy câu hỏi nào phù hợp với bộ lọc
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((item, idx) => (
            <QuestionDetailCard
              key={item.id}
              question={item}
              questionNumber={idx + 1}
              showAnswers={true}
              showExplanation={true}
              defaultExpandedExplanation={false}
              badgeExtra={
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {item.subject} - {item.grade} {item.chapter ? `(${item.chapter})` : ''}
                  </span>
                  {(item.sourceExamTitle || item.examTitle) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/70 flex items-center space-x-1">
                      <FileText className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="truncate max-w-[200px]" title={item.sourceExamTitle || item.examTitle}>
                        Đề: {item.sourceExamTitle || item.examTitle}
                      </span>
                    </span>
                  )}
                  {item.createdDate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{formatDateTime(item.createdDate)}</span>
                    </span>
                  )}
                </div>
              }
              actions={
                <button
                  onClick={() => setDeletingQuestionId(item.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors cursor-pointer"
                  title="Xóa câu hỏi khỏi ngân hàng"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* Delete Single Question Modal */}
      {deletingQuestionId && (() => {
        const targetQ = questionBank.find((q) => q.id === deletingQuestionId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Xác Nhận Xóa Câu Hỏi</h3>
                {targetQ && (
                  <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-left text-xs space-y-1">
                    <p className="line-clamp-2 text-slate-700 dark:text-slate-300 font-medium">{targetQ.content}</p>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                      <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-300">
                        {targetQ.subject} - {targetQ.grade}
                      </span>
                      {(targetQ.sourceExamTitle || targetQ.examTitle) && (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold truncate max-w-[140px]">
                          Đề: {targetQ.sourceExamTitle || targetQ.examTitle}
                        </span>
                      )}
                      {targetQ.createdDate && (
                        <span className="text-amber-600 dark:text-amber-400">
                          ({formatDateTime(targetQ.createdDate)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Bạn có chắc muốn xóa câu hỏi này khỏi ngân hàng? Hành động này không thể hoàn tác.
                </p>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingQuestionId(null)}
                  disabled={isDeletingSingle}
                  className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleDelete}
                  disabled={isDeletingSingle}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingSingle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <span>Xóa Ngay</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BULK DELETE / CLEANUP MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header (Sticky) */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/60 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Quản Lý Xóa Câu Hỏi Ngân Hàng
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chọn phương thức xóa câu hỏi theo nhu cầu
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setShowBulkDeleteModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-3">
              {/* Select Delete Mode Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setBulkDeleteType('FILTER')}
                  className={`py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    bulkDeleteType === 'FILTER'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="truncate text-[10px] sm:text-[11px]">Theo Bộ Lọc</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBulkDeleteType('EXAM_NAME');
                    if (!targetExamKey && examOptions.length > 0) {
                      setTargetExamKey(examOptions[0].key);
                    }
                  }}
                  className={`py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    bulkDeleteType === 'EXAM_NAME'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate text-[10px] sm:text-[11px]">Tên Bài Thi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkDeleteType('SUBJECT_GRADE')}
                  className={`py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    bulkDeleteType === 'SUBJECT_GRADE'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate text-[10px] sm:text-[11px]">Môn & Khối</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkDeleteType('TOPIC')}
                  className={`py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    bulkDeleteType === 'TOPIC'
                      ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FolderMinus className="w-3.5 h-3.5" />
                  <span className="truncate text-[10px] sm:text-[11px]">Theo Chủ Đề</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkDeleteType('CLEAR_ALL')}
                  className={`py-1.5 px-1 rounded-xl transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                    bulkDeleteType === 'CLEAR_ALL'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                  }`}
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span className="truncate text-[10px] sm:text-[11px]">Xóa Tất Cả</span>
                </button>
              </div>

              {/* TAB CONTENT 1: FILTER */}
              {bulkDeleteType === 'FILTER' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                  <p className="text-slate-700 dark:text-slate-300">
                    Xóa tất cả câu hỏi hiện đang hiển thị theo bộ lọc tìm kiếm trên giao diện chính:
                  </p>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div>Môn học: <strong>{selectedSubject === 'ALL' ? 'Tất cả' : selectedSubject}</strong></div>
                    <div>Khối lớp: <strong>{selectedGrade === 'ALL' ? 'Tất cả' : selectedGrade}</strong></div>
                    <div>Mức độ: <strong>{selectedCognitive === 'ALL' ? 'Tất cả' : selectedCognitive}</strong></div>
                    {searchTerm && <div>Từ khóa: <strong>"{searchTerm}"</strong></div>}
                  </div>
                  <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-between">
                    <span>⚠️ Số câu hỏi sẽ bị xóa:</span>
                    <span className="text-sm font-black">{itemsToDelete.length} / {questionBank.length} câu</span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: EXAM NAME & CREATED TIME */}
              {bulkDeleteType === 'EXAM_NAME' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Chọn Bài Kiểm Tra (kèm Ngày & Giờ tạo):</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {examOptions.length} đợt đề
                      </span>
                    </div>

                    {examOptions.length > 3 && (
                      <div className="relative mb-1.5">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Lọc nhanh theo tên đề hoặc ngày giờ..."
                          value={examSearchFilter}
                          onChange={(e) => setExamSearchFilter(e.target.value)}
                          className="w-full pl-7 pr-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                        />
                      </div>
                    )}

                    {examOptions.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                        <p className="font-bold">Chưa tìm thấy bài kiểm tra nào được ghi nhận trong ngân hàng.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={targetExamKey}
                          onChange={(e) => setTargetExamKey(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-teal-700 dark:text-teal-300 shadow-xs outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                        >
                          <option value="">-- Chọn bài kiểm tra cần xóa --</option>
                          {filteredExamOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.formattedDate ? `[🕒 ${opt.formattedDate}] ` : ''}{opt.title} ({opt.count} câu {opt.subject ? `• ${opt.subject}` : ''})
                            </option>
                          ))}
                        </select>

                        {selectedExamOption && (
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 shadow-2xs">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1 truncate">
                                  <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                  <span className="truncate">{selectedExamOption.title}</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                  {selectedExamOption.formattedDate ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200/80 dark:border-amber-800/80">
                                      <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                      <span>Tạo: {selectedExamOption.formattedDate}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
                                      <span>Chưa rõ thời gian</span>
                                    </span>
                                  )}
                                  {selectedExamOption.subject && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                                      {selectedExamOption.subject} {selectedExamOption.grade ? `• ${selectedExamOption.grade}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
                                {itemsToDelete.length} câu
                              </span>
                            </div>

                            {itemsToDelete.length > 0 && (
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                <div className="space-y-1 max-h-16 overflow-y-auto pr-1">
                                  {itemsToDelete.slice(0, 2).map((q, idx) => (
                                    <div
                                      key={q.id}
                                      className="p-1 bg-slate-50 dark:bg-slate-900/60 rounded text-[10px] text-slate-600 dark:text-slate-300 flex items-start space-x-1 border border-slate-100 dark:border-slate-800/60"
                                    >
                                      <span className="font-bold text-teal-600 dark:text-teal-400 shrink-0">#{idx + 1}</span>
                                      <span className="line-clamp-1 flex-1">{q.content}</span>
                                    </div>
                                  ))}
                                  {itemsToDelete.length > 2 && (
                                    <p className="text-[9px] text-slate-400 italic text-center">
                                      và {itemsToDelete.length - 2} câu hỏi khác...
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-between text-xs">
                    <span>⚠️ Số câu sẽ xóa:</span>
                    <span className="font-black text-rose-600 dark:text-rose-400">{itemsToDelete.length} câu hỏi</span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: SUBJECT & GRADE */}
              {bulkDeleteType === 'SUBJECT_GRADE' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Chọn Môn học:</label>
                      <select
                        value={targetSubject}
                        onChange={(e) => setTargetSubject(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                      >
                        <option value="ALL">-- Tất cả môn --</option>
                        {['Toán', 'Ngữ văn', 'Tiếng Anh', 'KHTN', 'Lịch sử và Địa lí', ...uniqueSubjectsInBank]
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map((sub) => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Chọn Khối lớp:</label>
                      <select
                        value={targetGrade}
                        onChange={(e) => setTargetGrade(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                      >
                        <option value="ALL">-- Tất cả khối --</option>
                        {['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9', 'Khối 10', 'Khối 11', 'Khối 12', ...uniqueGradesInBank]
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map((grd) => (
                            <option key={grd} value={grd}>{grd}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-between">
                    <span>⚠️ Số câu phù hợp:</span>
                    <span className="font-black">{itemsToDelete.length} câu</span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 4: TOPIC */}
              {bulkDeleteType === 'TOPIC' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div>
                    <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                      Chọn Chủ Đề / Chương trong ngân hàng:
                    </label>
                    {uniqueTopics.length === 0 ? (
                      <p className="text-slate-500 italic">Chưa có chủ đề nào trong ngân hàng hiện tại.</p>
                    ) : (
                      <select
                        value={targetTopic}
                        onChange={(e) => setTargetTopic(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-teal-700 dark:text-teal-300"
                      >
                        {uniqueTopics.map((top) => (
                          <option key={top} value={top}>Chủ đề: {top}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-between">
                    <span>⚠️ Số câu thuộc chủ đề:</span>
                    <span className="font-black">{itemsToDelete.length} câu</span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 5: CLEAR ALL */}
              {bulkDeleteType === 'CLEAR_ALL' && (
                <div className="space-y-2 bg-rose-50 dark:bg-rose-950/60 p-3 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs">
                  <div className="flex items-start space-x-2 text-rose-800 dark:text-rose-200 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase">CẢNH BÁO: XÓA TOÀN BỘ NGÂN HÀNG CÂU HỎI</h4>
                      <p className="font-normal text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">
                        Thao tác này sẽ xóa vĩnh viễn toàn bộ <strong className="text-xs font-bold">{questionBank.length}</strong> câu hỏi có trong ngân hàng dùng chung.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold text-rose-900 dark:text-rose-200 mb-1">
                      Nhập từ khóa <strong className="text-rose-600 font-black">XÓA TẤT CẢ</strong> để xác nhận:
                    </label>
                    <input
                      type="text"
                      value={confirmClearText}
                      onChange={(e) => setConfirmClearText(e.target.value)}
                      placeholder="XÓA TẤT CẢ"
                      className="w-full p-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 font-bold text-rose-600 text-center outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Sticky) */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeletingBulk}
                className="flex-1 py-2 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                disabled={
                  isDeletingBulk ||
                  itemsToDelete.length === 0 ||
                  (bulkDeleteType === 'CLEAR_ALL' && confirmClearText.trim() !== 'XÓA TẤT CẢ')
                }
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDeletingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa {itemsToDelete.length} Câu Hỏi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Question */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white border-b pb-3">
              Thêm Câu Hỏi Mới Vào Ngân Hàng
            </h3>

            <form onSubmit={handleCreateNew} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Môn học</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value as SubjectType)}
                    className="w-full p-2 border rounded-xl"
                  >
                    <option value="Toán">Toán</option>
                    <option value="Ngữ văn">Ngữ văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="KHTN">KHTN</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Khối lớp</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  >
                    <option value="Khối 6">Khối 6</option>
                    <option value="Khối 10">Khối 10</option>
                    <option value="Khối 11">Khối 11</option>
                    <option value="Khối 12">Khối 12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Mức độ nhận thức</label>
                <select
                  value={newCognitive}
                  onChange={(e) => setNewCognitive(e.target.value as any)}
                  className="w-full p-2 border rounded-xl font-bold text-teal-700"
                >
                  <option value="REMEMBER">NHẬN BIẾT</option>
                  <option value="UNDERSTAND">THÔNG HIỂU</option>
                  <option value="APPLY">VẬN DỤNG</option>
                  <option value="ADVANCED">VẬN DỤNG CAO</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Tên bài / Chương</label>
                <input
                  type="text"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Nội dung câu hỏi (Có thể dùng công thức $...$)</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-xl font-medium"
                  required
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <label className="font-semibold block">4 Phương án trả lời & Chọn đáp án đúng:</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Phương án A"
                    value={newOptA}
                    onChange={(e) => setNewOptA(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Phương án B"
                    value={newOptB}
                    onChange={(e) => setNewOptB(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Phương án C"
                    value={newOptC}
                    onChange={(e) => setNewOptC(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Phương án D"
                    value={newOptD}
                    onChange={(e) => setNewOptD(e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <span className="font-bold">Đáp án đúng:</span>
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setNewCorrectOpt(opt)}
                      className={`px-3 py-1 rounded-lg font-bold ${
                        newCorrectOpt === opt ? 'bg-teal-600 text-white' : 'bg-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold"
                >
                  Lưu Câu Hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
