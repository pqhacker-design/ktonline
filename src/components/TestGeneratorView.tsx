import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Minus,
  Paperclip,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  Key,
  Layers,
  ListPlus,
  ArrowUp,
  ArrowDown,
  Compass,
  Languages,
  PenTool,
  Bookmark,
  Check,
} from 'lucide-react';
import { ApiKeyInputModal, QuotaExceededModal } from './ApiModals';
import {
  AppSettings,
  CognitiveRatio,
  CurriculumType,
  ExamMetadata,
  ExamMode,
  QuestionCounts,
  SubjectType,
  calculateExamScores,
} from '../types';
import { getSubjectProfile } from '../services/subjectProfiles';

interface TestGeneratorViewProps {
  settings: AppSettings;
  onGenerate: (metadata: ExamMetadata) => Promise<void>;
  isGenerating: boolean;
  progressMessage: string;
  onSaveSettings?: (newSettings: AppSettings) => void;
}

export const TestGeneratorView: React.FC<TestGeneratorViewProps> = ({
  settings,
  onGenerate,
  isGenerating,
  progressMessage,
  onSaveSettings,
}) => {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [pendingMetadata, setPendingMetadata] = useState<ExamMetadata | null>(null);
  // 1. Thông tin hành chính
  const [schoolName, setSchoolName] = useState(settings.defaultSchoolName || 'Trường THCS Bình San');
  const [departmentName, setDepartmentName] = useState(settings.defaultDepartmentName || 'Sở Giáo dục và Đào tạo');
  const [subject, setSubject] = useState<SubjectType>('Toán');
  const [grade, setGrade] = useState('Khối 6');
  const [className, setClassName] = useState('6A1');
  const [semester, setSemester] = useState('Học kỳ I');
  const [schoolYear, setSchoolYear] = useState('2026 - 2027');
  const [examTitle, setExamTitle] = useState('Kiểm tra Giữa học kỳ I');
  const [chapterTitle, setChapterTitle] = useState('Chương I: Tập hợp số tự nhiên');
  const [topicsList, setTopicsList] = useState<string[]>([
    'Bài 1: Tập hợp các số tự nhiên',
    'Bài 2: Các phép tính trong tập hợp số tự nhiên',
    'Bài 3: Lũy thừa với số mũ tự nhiên',
  ]);
  const [topicInput, setTopicInput] = useState('');
  const [showBulkTopicModal, setShowBulkTopicModal] = useState(false);
  const [bulkTopicText, setBulkTopicText] = useState('');

  // Cấu hình đặc thù chuyên môn cho từng môn học
  const [literatureGenre, setLiteratureGenre] = useState<'truyen' | 'tho' | 'nghi_luan' | 'thong_tin' | 'ky' | 'auto'>('truyen');
  const [literatureEssayTopic, setLiteratureEssayTopic] = useState('');
  const [englishLevel, setEnglishLevel] = useState<'A2' | 'B1' | 'B2' | 'auto'>('auto');
  const [englishFocusAreas, setEnglishFocusAreas] = useState<string[]>([
    'phonetics',
    'grammar_vocab',
    'reading_cloze',
    'reading_comprehension',
    'sentence_rewrite',
  ]);
  const [presetAppliedToast, setPresetAppliedToast] = useState(false);

  const handleAddTopic = () => {
    const val = topicInput.trim();
    if (!val) return;
    setTopicsList((prev) => [...prev, val]);
    setTopicInput('');
  };

  const handleRemoveTopic = (index: number) => {
    setTopicsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTopic = (index: number, newText: string) => {
    setTopicsList((prev) => {
      const next = [...prev];
      next[index] = newText;
      return next;
    });
  };

  const handleMoveTopic = (from: number, to: number) => {
    setTopicsList((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleApplyBulkTopics = () => {
    if (!bulkTopicText.trim()) {
      setShowBulkTopicModal(false);
      return;
    }
    const lines = bulkTopicText
      .split(/[\r\n;]+/)
      .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      setTopicsList((prev) => [...prev, ...lines]);
    }
    setBulkTopicText('');
    setShowBulkTopicModal(false);
  };

  const handleApplySubjectPreset = (subj: SubjectType, targetGrade = grade) => {
    const profile = getSubjectProfile(subj);
    setDurationMinutes(profile.defaultDuration);
    setExamMode(profile.defaultExamMode);
    setQuestionCounts({ ...profile.recommendedQuestionCounts });
    if (profile.sampleChaptersByGrade[targetGrade]) {
      setChapterTitle(profile.sampleChaptersByGrade[targetGrade]);
    }
    if (profile.sampleTopicsByGrade[targetGrade]) {
      setTopicsList([...profile.sampleTopicsByGrade[targetGrade]]);
    }
    setPresetAppliedToast(true);
    setTimeout(() => setPresetAppliedToast(false), 3000);
  };

  const handleSubjectChange = (newSubj: SubjectType) => {
    setSubject(newSubj);
    handleApplySubjectPreset(newSubj, grade);
  };

  const handleGradeChange = (newGrade: string) => {
    setGrade(newGrade);
    const profile = getSubjectProfile(subject);
    if (profile.sampleChaptersByGrade[newGrade]) {
      setChapterTitle(profile.sampleChaptersByGrade[newGrade]);
    }
    if (profile.sampleTopicsByGrade[newGrade]) {
      setTopicsList([...profile.sampleTopicsByGrade[newGrade]]);
    }
  };

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [totalPoints, setTotalPoints] = useState(10);
  const [curriculum, setCurriculum] = useState<CurriculumType>('Kết nối tri thức với cuộc sống');

  // 1b. Nguồn tài liệu & Giới hạn kiến thức tham khảo (tùy chọn)
  const [referenceContext, setReferenceContext] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showRefHelp, setShowRefHelp] = useState(false);

  // Xử lý tải ảnh / file tài liệu tham khảo
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setReferenceImages((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      } else if (
        file.type === 'text/plain' ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md')
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            setReferenceContext((prev) => (prev ? prev + '\n\n' + text : text));
          }
        };
        reader.readAsText(file);
      } else {
        alert(
          'Vui lòng chọn các file định dạng hình ảnh (PNG, JPG, WEBP) hoặc file văn bản (.txt) để tải lên.'
        );
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          imageFiles.push(blob);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      processFiles(imageFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 2. Chế độ đề (3 lựa chọn)
  const [examMode, setExamMode] = useState<ExamMode>('MCQ_ESSAY');

  // 3. Số lượng câu hỏi & điểm số
  const [questionCounts, setQuestionCounts] = useState<QuestionCounts>({
    part1_MCQSingle: 12,
    part1_PointsPerQuestion: 0.25,
    part2_MCQTrueFalse: 2,
    part2_PointsPerQuestion: 1.0,
    part2_TFStatementsPerQuestion: 4,
    part3_MCQShort: 4,
    part3_PointsPerQuestion: 0.25,
    part4_Essay: 2,
    part4_ApplyCount: 1,
    part4_AdvancedCount: 1,
    part4_AdvancedPoints: 1.0,
  });

  // 4. Tỷ lệ mức độ nhận thức (%)
  const [cognitiveRatio, setCognitiveRatio] = useState<CognitiveRatio>({
    remember: 40,
    understand: 30,
    apply: 20,
    advanced: 10,
  });

  // 5. Số mã đề
  const [codeCount, setCodeCount] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');

  // Hàm thay đổi bộ đếm (+)(-) cho Phần 1, 2, 3
  const updateCount = (key: keyof QuestionCounts, delta: number) => {
    setQuestionCounts((prev) => {
      const val = Math.max(0, (prev[key] as number) + delta);
      return { ...prev, [key]: val };
    });
  };

  // Thay đổi số câu Tự luận tổng (Phần IV)
  const updateEssayCount = (delta: number) => {
    setQuestionCounts((prev) => {
      const newEssay = Math.max(0, prev.part4_Essay + delta);
      let apply = prev.part4_ApplyCount ?? Math.ceil(prev.part4_Essay / 2);
      let adv = prev.part4_AdvancedCount ?? Math.floor(prev.part4_Essay / 2);

      if (delta > 0) {
        apply += 1;
      } else if (delta < 0) {
        if (apply + adv > newEssay) {
          if (adv > 0) adv -= 1;
          else if (apply > 0) apply -= 1;
        }
      }

      return {
        ...prev,
        part4_Essay: newEssay,
        part4_ApplyCount: apply,
        part4_AdvancedCount: adv,
      };
    });
  };

  // Thay đổi số câu Vận dụng (VD) hoặc Vận dụng cao (VDC) trong Phần IV
  const updateEssaySubCount = (type: 'apply' | 'adv', delta: number) => {
    setQuestionCounts((prev) => {
      const total = prev.part4_Essay;
      if (total <= 0) return prev;

      const currentApply = prev.part4_ApplyCount ?? Math.ceil(total / 2);
      const currentAdv = prev.part4_AdvancedCount ?? Math.floor(total / 2);

      if (type === 'apply') {
        const newApply = Math.max(0, Math.min(total, currentApply + delta));
        const newAdv = total - newApply;
        return {
          ...prev,
          part4_ApplyCount: newApply,
          part4_AdvancedCount: newAdv,
        };
      } else {
        const newAdv = Math.max(0, Math.min(total, currentAdv + delta));
        const newApply = total - newAdv;
        return {
          ...prev,
          part4_ApplyCount: newApply,
          part4_AdvancedCount: newAdv,
        };
      }
    });
  };

  // Tính toán tổng điểm hiện tại
  const currentScores = calculateExamScores(questionCounts);

  // Tự động cân bằng tổng điểm các phần về tròn 10.0 điểm
  const handleAutoBalance = () => {
    setQuestionCounts((prev) => {
      const p1Count = prev.part1_MCQSingle || 0;
      const p2Count = prev.part2_MCQTrueFalse || 0;
      const p3Count = prev.part3_MCQShort || 0;
      const p4Count = prev.part4_Essay || 0;

      const p1Pts = 0.25;
      const p2Pts = 1.0;
      const p3Pts = 0.25;

      const mcqScore = p1Count * p1Pts + p2Count * p2Pts + p3Count * p3Pts;

      if (p4Count > 0) {
        let remainingP4 = 10.0 - mcqScore;
        if (remainingP4 < 0) remainingP4 = 2.0;

        let applyCount = prev.part4_ApplyCount ?? Math.ceil(p4Count / 2);
        let advCount = p4Count - applyCount;
        if (applyCount < 0 || advCount < 0) {
          advCount = Math.floor(p4Count / 2);
          applyCount = p4Count - advCount;
        }

        let advPts = prev.part4_AdvancedPoints ?? 1.0;
        if (advCount * advPts >= remainingP4 && advCount > 0) {
          advPts = 1.0;
        }

        return {
          ...prev,
          part1_PointsPerQuestion: p1Pts,
          part2_PointsPerQuestion: p2Pts,
          part3_PointsPerQuestion: p3Pts,
          part4_ApplyCount: applyCount,
          part4_AdvancedCount: advCount,
          part4_AdvancedPoints: advPts,
        };
      } else {
        return {
          ...prev,
          part1_PointsPerQuestion: 0.25,
          part2_PointsPerQuestion: 1.0,
          part3_PointsPerQuestion: 0.25,
        };
      }
    });
  };

  // Hàm cập nhật tỷ lệ %
  const updateRatio = (key: keyof CognitiveRatio, val: number) => {
    const newVal = Math.max(0, Math.min(100, val));
    setCognitiveRatio((prev) => ({ ...prev, [key]: newVal }));
  };

  const totalPercentage =
    cognitiveRatio.remember +
    cognitiveRatio.understand +
    cognitiveRatio.apply +
    cognitiveRatio.advanced;

  const handleModeChange = (mode: ExamMode) => {
    setExamMode(mode);
    if (mode === 'MCQ_ESSAY') {
      setQuestionCounts({
        part1_MCQSingle: 12,
        part1_PointsPerQuestion: 0.25,
        part2_MCQTrueFalse: 2,
        part2_PointsPerQuestion: 1.0,
        part3_MCQShort: 4,
        part3_PointsPerQuestion: 0.25,
        part4_Essay: 2,
        part4_ApplyCount: 1,
        part4_ApplyPoints: 2.0,
        part4_AdvancedCount: 1,
        part4_AdvancedPoints: 2.0,
      });
    } else if (mode === 'MCQ_ONLY') {
      setQuestionCounts({
        part1_MCQSingle: 20,
        part1_PointsPerQuestion: 0.25,
        part2_MCQTrueFalse: 3,
        part2_PointsPerQuestion: 1.0,
        part3_MCQShort: 8,
        part3_PointsPerQuestion: 0.25,
        part4_Essay: 0,
        part4_ApplyCount: 0,
        part4_ApplyPoints: 2.0,
        part4_AdvancedCount: 0,
        part4_AdvancedPoints: 2.0,
      });
    } else if (mode === 'ESSAY_ONLY') {
      setQuestionCounts({
        part1_MCQSingle: 0,
        part1_PointsPerQuestion: 0.25,
        part2_MCQTrueFalse: 0,
        part2_PointsPerQuestion: 1.0,
        part3_MCQShort: 0,
        part3_PointsPerQuestion: 0.25,
        part4_Essay: 5,
        part4_ApplyCount: 3,
        part4_ApplyPoints: 2.0,
        part4_AdvancedCount: 2,
        part4_AdvancedPoints: 2.0,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTopics = topicsList.map((t) => t.trim()).filter((t) => t.length > 0);
    const finalChapterTitle = chapterTitle.trim() || (cleanTopics.length > 0 ? cleanTopics.join(', ') : 'Kiến thức chung');

    if (!finalChapterTitle && cleanTopics.length === 0) {
      setErrorMsg('Vui lòng nhập Tên bài / Tên chương hoặc thêm ít nhất một mạch nội dung kiến thức.');
      return;
    }

    if (!settings.customApiKey || !settings.customApiKey.trim()) {
      setPendingMetadata({
        schoolName,
        departmentName,
        subject,
        grade,
        className,
        semester,
        schoolYear,
        examTitle,
        chapterTitle: finalChapterTitle,
        topicsList: cleanTopics.length > 0 ? cleanTopics : [finalChapterTitle],
        durationMinutes,
        totalPoints,
        curriculum,
        examMode,
        questionCounts,
        cognitiveRatio,
        codeCount,
        referenceContext,
        referenceImages,
      });
      setShowApiKeyModal(true);
      return;
    }

    if (totalPercentage !== 100) {
      setErrorMsg('Tổng tỷ lệ mức độ nhận thức phải bằng đúng 100% (Hiện tại: ' + totalPercentage + '%).');
      return;
    }

    const totalQuestionsSum =
      questionCounts.part1_MCQSingle +
      questionCounts.part2_MCQTrueFalse +
      questionCounts.part3_MCQShort +
      questionCounts.part4_Essay;

    if (totalQuestionsSum <= 0) {
      setErrorMsg('Tổng số câu hỏi phải lớn hơn 0.');
      return;
    }

    if (Math.abs(currentScores.totalScore - 10.0) > 0.01) {
      setErrorMsg(
        `Tổng điểm các phần hiện tại là ${currentScores.totalScore} điểm. Yêu cầu cấu hình các phần sao cho tổng điểm phải đúng 10.0 điểm! (Vui lòng bấm nút "Tự động cân bằng 10 điểm" để tự điều chỉnh).`
      );
      return;
    }

    const metadata: ExamMetadata = {
      schoolName,
      departmentName,
      subject,
      grade,
      className,
      semester,
      schoolYear,
      examTitle,
      chapterTitle: finalChapterTitle,
      topicsList: cleanTopics.length > 0 ? cleanTopics : [finalChapterTitle],
      durationMinutes,
      totalPoints,
      curriculum,
      examMode,
      questionCounts,
      cognitiveRatio,
      codeCount,
      referenceContext,
      referenceImages,
      subjectSpecificConfig: {
        literatureGenre,
        literatureEssayTopic: literatureEssayTopic.trim(),
        englishLevel,
        englishFocusAreas,
      },
    };

    try {
      setPendingMetadata(metadata);
      await onGenerate(metadata);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('[NO_API_KEY]') || msg.includes('Chưa cấu hình') || msg.includes('[INVALID_API_KEY]')) {
        setShowApiKeyModal(true);
      } else if (msg.includes('[QUOTA_EXHAUSTED]') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('Quota exceeded')) {
        setShowQuotaModal(true);
      } else {
        setErrorMsg(msg || 'Đã xảy ra lỗi khi tạo đề kiểm tra.');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Khởi Tạo Đề Kiểm Tra (7991)
            </h1>
            <p className="text-teal-100/80 text-sm mt-1 max-w-2xl">
              Hệ thống AI tự động sinh Ma trận đề, Bảng đặc tả, Đề thi, Đáp án chi tiết và Rubric chấm bài.
            </p>
          </div>
        </div>
      </div>

      {!settings.customApiKey && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-700 rounded-2xl text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="font-medium">
              <span className="font-bold">⚠️ Chưa cấu hình API Key:</span> Ứng dụng yêu cầu bắt buộc nhập Gemini API Key cá nhân để khởi tạo đề thi với AI.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeyModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Key className="w-4 h-4" />
            <span>Nhập API Key Ngay</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-start space-x-3 text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Thông tin chung */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <GraduationCap className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              1. Thông Tin Hành Chính & Môn Học
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên Cơ quan chủ quản
              </label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="VD: Sở Giáo dục và Đào tạo Hà Nội"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên Trường
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="VD: THCS Bình San"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Môn Học
              </label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value as SubjectType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              >
                <option value="Toán">Toán học</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="KHTN">KHTN (Khoa học tự nhiên THCS)</option>
                <option value="Vật lí">Vật lí (THPT)</option>
                <option value="Hóa học">Hóa học (THPT)</option>
                <option value="Sinh học">Sinh học (THPT)</option>
                <option value="Lịch sử và Địa lí">Lịch sử và Địa lí (THCS)</option>
                <option value="Lịch sử">Lịch sử (THPT)</option>
                <option value="Địa lí">Địa lí (THPT)</option>
                <option value="GDCD / GDKT&PL">GDCD / GD Kinh tế & Pháp luật</option>
                <option value="Tin học">Tin học</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Mỹ thuật">Mỹ thuật</option>
                <option value="Âm nhạc">Âm nhạc</option>
                <option value="Giáo dục thể chất">Giáo dục thể chất</option>
                <option value="Khác">Môn học khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Khối Lớp
              </label>
              <select
                value={grade}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              >
                <option value="Khối 6">Khối 6 (THCS)</option>
                <option value="Khối 7">Khối 7 (THCS)</option>
                <option value="Khối 8">Khối 8 (THCS)</option>
                <option value="Khối 9">Khối 9 (THCS)</option>
                <option value="Khối 10">Khối 10 (THPT)</option>
                <option value="Khối 11">Khối 11 (THPT)</option>
                <option value="Khối 12">Khối 12 (THPT)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bộ Sách / Chương Trình
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value as CurriculumType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium text-teal-700 dark:text-teal-300"
              >
                <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức với cuộc sống</option>
                <option value="Bộ SGK thống nhất 2026">Bộ SGK thống nhất 2026</option>
                <option value="Chương trình GDPT 2018 khác">Chương trình GDPT 2018 khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên Bài Kiểm Tra
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="VD: Kiểm tra Giữa học kỳ I"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                required
              />
            </div>

            {/* Khối Nhập Tên Bài / Tên Chương / Mạch Nội Dung Kiến Thức (Hỗ trợ 1 bài hoặc nhiều bài chi tiết) */}
            <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-br from-slate-50 to-teal-50/40 dark:from-slate-800/80 dark:to-teal-950/20 p-4 sm:p-5 rounded-2xl border border-teal-200 dark:border-teal-900/60 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center flex-wrap gap-1.5">
                      <span>Tên Bài / Tên Chương / Mạch Nội Dung Kiến Thức</span>
                      <span className="text-[10px] normal-case px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-200 font-semibold">
                        Hỗ trợ nhập nhiều bài
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowBulkTopicModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-700 transition font-medium shadow-2xs"
                    title="Dán nhanh danh sách nhiều bài (mỗi dòng 1 bài)"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Dán danh sách nhiều bài</span>
                  </button>
                  {topicsList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTopicsList([])}
                      className="text-slate-400 hover:text-rose-500 transition px-2 py-1 text-xs"
                      title="Xóa danh sách bài chi tiết"
                    >
                      Xóa danh sách bài
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Tiêu đề chương / Chủ đề chung */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tiêu đề chương / Chủ đề tổng quát:
                  </span>
                  <span className="text-[11px] text-slate-400 italic">
                    (Xuất hiện trên tiêu đề đầu bài thi)
                  </span>
                </div>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="VD: Chương I. Biểu thức đại số (hoặc Ôn tập Giữa học kỳ I)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                />
              </div>

              {/* 2. Danh sách các bài / mạch kiến thức cụ thể cần kiểm tra */}
              <div className="space-y-2.5 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Danh sách các bài / nội dung kiến thức cụ thể cần kiểm tra:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[11px] font-bold">
                      {topicsList.length} bài/nội dung
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                    🎯 AI sẽ chia đều ma trận & câu hỏi bám sát từng bài này
                  </span>
                </div>

                {/* Form thêm bài mới */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTopic();
                        }
                      }}
                      placeholder="Nhập tên bài hoặc nội dung kiến thức (VD: Bài 1: Đơn thức và đa thức) rồi bấm Thêm hoặc Enter..."
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    {topicInput && (
                      <button
                        type="button"
                        onClick={() => setTopicInput('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTopic}
                    disabled={!topicInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-medium text-xs sm:text-sm flex items-center space-x-1.5 transition shadow-2xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm bài</span>
                  </button>
                </div>

                {/* Danh sách các bài đã thêm */}
                {topicsList.length > 0 ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {topicsList.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 hover:border-teal-400 dark:hover:border-teal-600 transition group shadow-2xs"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={t}
                            onChange={(e) => handleEditTopic(idx, e.target.value)}
                            className="w-full bg-transparent text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium outline-none focus:bg-slate-50 dark:focus:bg-slate-900 px-1 py-0.5 rounded"
                          />
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveTopic(idx, idx - 1)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < topicsList.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveTopic(idx, idx + 1)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveTopic(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Xóa bài này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-slate-900/40 border border-dashed border-teal-200 dark:border-teal-900/60 text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      💡 <b>Chưa có danh sách bài chi tiết:</b> Bạn có thể nhập từng bài vào ô trên hoặc bấm <b>"Dán danh sách nhiều bài"</b> để AI chia ma trận và câu hỏi cụ thể theo từng bài.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Khối bổ sung Nguồn Tài Liệu Tham Khảo & Giới Hạn Kiến Thức */}
            <div
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="md:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 space-y-3 transition-colors hover:border-teal-400 dark:hover:border-teal-700"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Nguồn Tài Liệu Tham Khảo & Giới Hạn Kiến Thức (Tùy Chọn)
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-200 font-semibold">
                    Đảm bảo AI không sinh lệch bài
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRefHelp(!showRefHelp)}
                  className="text-slate-500 hover:text-teal-600 text-xs flex items-center space-x-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showRefHelp ? 'Ẩn hướng dẫn' : 'Hướng dẫn sử dụng'}</span>
                </button>
              </div>

              {showRefHelp && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-teal-50/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800 space-y-1.5 leading-relaxed">
                  <p className="font-bold text-teal-800 dark:text-teal-300">💡 Tại sao nên bổ sung nguồn tài liệu / giới hạn kiến thức?</p>
                  <p>• <b>Ví dụ điển hình:</b> Với đề Toán 8 (Chương 1 sách Kết nối tri thức) nội dung chỉ bao gồm <i>Đơn thức & Đa thức</i> và <b>chưa học Hằng đẳng thức</b> (Hằng đẳng thức thuộc Chương 2). Nếu chỉ chọn "Chương 1" mà không giới hạn, AI có thể tự ý đưa bài toán Hằng đẳng thức vào đề.</p>
                  <p>• <b>Giải pháp:</b> Bạn có thể ghi rõ giới hạn vào ô văn bản bên dưới (ví dụ: <i>"Chỉ kiểm tra đơn thức, đa thức. KHÔNG BAO GỒM hằng đẳng thức"</i>) hoặc bấm <b>"Tải ảnh/Tài liệu lên"</b> hoặc <b>chụp màn hình rồi nhấn Ctrl+V</b> để dán ảnh trực tiếp vào đây. AI sẽ đọc và tuân thủ 100% giới hạn này.</p>
                </div>
              )}

              <div>
                <textarea
                  rows={3}
                  value={referenceContext}
                  onChange={(e) => setReferenceContext(e.target.value)}
                  placeholder="Nhập hoặc dán nội dung bài học, yêu cầu cần đạt hoặc ghi chú giới hạn (có thể chụp màn hình và nhấn Ctrl+V để dán ảnh trực tiếp vào đây)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Tải ảnh / tài liệu đính kèm */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                      <span>Đính kèm ảnh trang SGK / Ảnh mục lục / Bảng YCCĐ:</span>
                    </label>
                    <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800/60">
                      💡 Chụp màn hình &amp; nhấn <b>Ctrl+V</b> để dán trực tiếp
                    </span>
                  </div>

                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95">
                    <UploadCloud className="w-4 h-4" />
                    <span>Tải ảnh tài liệu/SGK lên</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Danh sách hình ảnh đã tải lên */}
                {referenceImages.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                        <span>Đã tải lên {referenceImages.length} ảnh tài liệu đính kèm:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xóa tất cả ảnh tài liệu đính kèm không?')) {
                            setReferenceImages([]);
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa tất cả</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {referenceImages.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 aspect-square shadow-xs"
                        >
                          <img
                            src={imgSrc}
                            alt={`Tài liệu ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Bạn có chắc chắn muốn xóa ảnh này không?')) {
                                  handleRemoveImage(idx);
                                }
                              }}
                              className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition-transform hover:scale-110 cursor-pointer"
                              title="Xóa ảnh này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thời Gian Làm Bài (phút)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  required
                />
                <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thang Điểm Tổng
              </label>
              <input
                type="number"
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Học Kỳ / Năm Học
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                >
                  <option value="Học kỳ I">Học kỳ I</option>
                  <option value="Học kỳ II">Học kỳ II</option>
                  <option value="Cả năm">Cả năm</option>
                </select>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  placeholder="2026-2027"
                  className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ĐẶC THÙ MÔN HỌC & TỐI ƯU HÓA AI (CHUẨN GDPT 2018) */}
        {(() => {
          const profile = getSubjectProfile(subject);
          return (
            <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900/60 to-teal-950/20 dark:from-indigo-950/40 dark:via-slate-900/90 dark:to-teal-950/40 rounded-2xl p-6 shadow-sm border border-indigo-300/40 dark:border-indigo-800/60 space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header with quick preset button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/40 dark:border-indigo-900/50 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 p-0.5 text-white flex items-center justify-center shadow-md">
                    {subject === 'Ngữ văn' ? (
                      <PenTool className="w-5 h-5" />
                    ) : subject === 'Tiếng Anh' ? (
                      <Languages className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Đặc Thù Môn {subject} (AI Tối Ưu Hóa GDPT 2018)
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {profile.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {profile.shortDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApplySubjectPreset(subject)}
                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Áp dụng cấu trúc chuẩn môn {subject}</span>
                  </button>
                  {presetAppliedToast && (
                    <span className="text-xs text-emerald-500 font-bold flex items-center space-x-1 animate-fade-in">
                      <Check className="w-4 h-4" />
                      <span>Đã áp dụng!</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Pedagogical Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {profile.features.map((feat, fIdx) => (
                  <div
                    key={fIdx}
                    className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                      feat.highlight
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 text-indigo-950 dark:text-indigo-200 font-medium'
                        : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${feat.highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold">{feat.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ngữ văn Specific Controls */}
              {subject === 'Ngữ văn' && (
                <div className="pt-3 border-t border-indigo-200/40 dark:border-indigo-900/40 space-y-3 bg-indigo-50/40 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <PenTool className="w-4 h-4 text-indigo-500" />
                    <span>Tùy Chọn Chuyên Sâu Cho Môn Ngữ Văn:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Thể loại ngữ liệu đọc hiểu ngoài SGK:
                      </label>
                      <select
                        value={literatureGenre}
                        onChange={(e) => setLiteratureGenre(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="truyen">Truyện ngắn / Trích đoạn tiểu thuyết / Truyện đồng thoại</option>
                        <option value="tho">Thơ (Thơ tự do, 5 chữ, 7 chữ, lục bát...)</option>
                        <option value="nghi_luan">Văn bản nghị luận xã hội / tư tưởng đạo lý</option>
                        <option value="thong_tin">Văn bản thông tin nhật dụng / thuyết minh đời sống</option>
                        <option value="ky">Ký / Tản văn / Tùy bút</option>
                      </select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        AI sẽ tìm hoặc sáng tác ngữ liệu mới ngoài SGK bám sát thể loại này kèm nguồn trích dẫn.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Định hướng chủ đề Làm văn / Nghị luận (Tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={literatureEssayTopic}
                        onChange={(e) => setLiteratureEssayTopic(e.target.value)}
                        placeholder="VD: Bàn về lòng thấu cảm của giới trẻ / Khát vọng cống hiến..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Để trống nếu muốn AI tự động đề xuất vấn đề nghị luận sát với ngữ liệu đọc hiểu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiếng Anh Specific Controls */}
              {subject === 'Tiếng Anh' && (
                <div className="pt-3 border-t border-indigo-200/40 dark:border-indigo-900/40 space-y-3 bg-indigo-50/40 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40">
                  <div className="flex items-center space-x-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <Languages className="w-4 h-4 text-indigo-500" />
                    <span>Tùy Chọn Chuyên Sâu Cho Môn Tiếng Anh:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Khung năng lực ngoại ngữ (CEFR Level):
                      </label>
                      <select
                        value={englishLevel}
                        onChange={(e) => setEnglishLevel(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="auto">Tự động điều chỉnh theo khối lớp ({grade})</option>
                        <option value="A2">Cấp độ A2 (Cơ bản - THCS)</option>
                        <option value="B1">Cấp độ B1 (Trung cấp - THCS cuối cấp / THPT)</option>
                        <option value="B2">Cấp độ B2 (Khá - Giỏi THPT)</option>
                      </select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Từ vựng và độ phức tạp cấu trúc câu sẽ được tinh chỉnh theo khung năng lực này.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dạng bài kiểm tra trọng tâm:
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { id: 'phonetics', label: 'Phát âm & Trọng âm' },
                          { id: 'grammar_vocab', label: 'Từ vựng & Ngữ pháp' },
                          { id: 'reading_cloze', label: 'Đọc điền từ (Cloze)' },
                          { id: 'reading_comprehension', label: 'Đọc hiểu đoạn văn' },
                          { id: 'sentence_rewrite', label: 'Viết lại câu' },
                        ].map((area) => {
                          const active = englishFocusAreas.includes(area.id);
                          return (
                            <button
                              key={area.id}
                              type="button"
                              onClick={() => {
                                setEnglishFocusAreas((prev) =>
                                  active ? prev.filter((a) => a !== area.id) : [...prev, area.id]
                                );
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                                active
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {area.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. Chọn loại đề */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                2. Chọn Chế Độ Đề Kiểm Tra (3 Loại)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange('MCQ_ESSAY')}
              className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                examMode === 'MCQ_ESSAY'
                  ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm flex items-center justify-between">
                <span>① Trắc nghiệm + Tự luận</span>
                {examMode === 'MCQ_ESSAY' && <CheckCircle className="w-4 h-4 text-teal-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đầy đủ Phần I (TN 4 Lựa chọn), Phần II (Đúng/Sai), Phần III (Trả lời ngắn) & Phần IV (Tự luận).
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('MCQ_ONLY')}
              className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                examMode === 'MCQ_ONLY'
                  ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm flex items-center justify-between">
                <span>② Trắc nghiệm 100%</span>
                {examMode === 'MCQ_ONLY' && <CheckCircle className="w-4 h-4 text-teal-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Chỉ chứa các phần Trắc nghiệm (Phần I, II, III). Không bao gồm câu hỏi tự luận.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('ESSAY_ONLY')}
              className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                examMode === 'ESSAY_ONLY'
                  ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm flex items-center justify-between">
                <span>③ Tự luận 100%</span>
                {examMode === 'ESSAY_ONLY' && <CheckCircle className="w-4 h-4 text-teal-600" />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Chỉ chứa các câu hỏi Tự luận (Phần IV) kèm theo Rubric và Thang điểm chi tiết.
              </p>
            </button>
          </div>
        </div>

        {/* 3. Cấu trúc số lượng câu hỏi & Tùy chọn điểm số */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3. Cấu Trúc / Số Lượng Câu Hỏi & Thang Điểm (Yêu cầu đúng 10 điểm)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
                Tổng câu: {questionCounts.part1_MCQSingle + questionCounts.part2_MCQTrueFalse + questionCounts.part3_MCQShort + questionCounts.part4_Essay} câu
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                  Math.abs(currentScores.totalScore - 10.0) < 0.01
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse'
                }`}
              >
                {Math.abs(currentScores.totalScore - 10.0) < 0.01
                  ? '✓ Tổng điểm: 10/10 đ (Đạt chuẩn)'
                  : `⚠️ Tổng điểm: ${currentScores.totalScore}/10 đ`}
              </span>
            </div>
          </div>

          {/* Banner thông báo nếu chưa đủ hoặc vượt quá 10 điểm + Nút Tự động cân bằng */}
          {Math.abs(currentScores.totalScore - 10.0) >= 0.01 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Tổng điểm hiện tại: <strong>{currentScores.totalScore} điểm</strong>. Quy định yêu cầu tổng điểm tất cả các phần phải bằng đúng <strong>10.0 điểm</strong>!
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoBalance}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-lg shadow-xs transition-all shrink-0 flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tự động cân bằng 10 điểm</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Phần I */}
            {examMode !== 'ESSAY_ONLY' && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 tracking-wider uppercase">
                      Phần I
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                      Tổng {currentScores.part1Score}đ
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Trắc nghiệm 4 lựa chọn
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      4 phương án A, B, C, D
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Điểm / câu:</span>
                      <select
                        value={questionCounts.part1_PointsPerQuestion ?? 0.25}
                        onChange={(e) =>
                          setQuestionCounts((prev) => ({
                            ...prev,
                            part1_PointsPerQuestion: Number(e.target.value),
                          }))
                        }
                        className="px-2 py-1 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs focus:outline-none cursor-pointer"
                      >
                        <option value={0.1}>0.10 đ</option>
                        <option value={0.2}>0.20 đ</option>
                        <option value={0.25}>0.25 đ</option>
                        <option value={0.5}>0.50 đ</option>
                        <option value={1.0}>1.00 đ</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => updateCount('part1_MCQSingle', -1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-black text-slate-900 dark:text-white min-w-[3.5rem] text-center">
                    {questionCounts.part1_MCQSingle} câu
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCount('part1_MCQSingle', 1)}
                    className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition-all shadow-xs shadow-teal-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Phần II */}
            {examMode !== 'ESSAY_ONLY' && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 tracking-wider uppercase">
                      Phần II
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                      Tổng {currentScores.part2Score}đ
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Trắc nghiệm Đúng / Sai
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Xét tính Đúng/Sai từng ý
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Số ý / câu:</span>
                      <select
                        value={questionCounts.part2_TFStatementsPerQuestion ?? 4}
                        onChange={(e) =>
                          setQuestionCounts((prev) => ({
                            ...prev,
                            part2_TFStatementsPerQuestion: Number(e.target.value),
                          }))
                        }
                        className="px-2 py-1 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs focus:outline-none cursor-pointer"
                      >
                        <option value={2}>2 ý (a, b)</option>
                        <option value={3}>3 ý (a, b, c)</option>
                        <option value={4}>4 ý (a, b, c, d)</option>
                        <option value={5}>5 ý (a-e)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Điểm / câu:</span>
                      <select
                        value={questionCounts.part2_PointsPerQuestion ?? 1.0}
                        onChange={(e) =>
                          setQuestionCounts((prev) => ({
                            ...prev,
                            part2_PointsPerQuestion: Number(e.target.value),
                          }))
                        }
                        className="px-2 py-1 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs focus:outline-none cursor-pointer"
                      >
                        <option value={0.25}>0.25 đ</option>
                        <option value={0.5}>0.50 đ</option>
                        <option value={0.75}>0.75 đ</option>
                        <option value={1.0}>1.00 đ</option>
                        <option value={1.5}>1.50 đ</option>
                        <option value={2.0}>2.00 đ</option>
                      </select>
                    </div>

                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold text-right pt-0.5 border-t border-slate-200/50 dark:border-slate-800">
                      Mỗi ý đúng: {((questionCounts.part2_PointsPerQuestion ?? 1.0) / (questionCounts.part2_TFStatementsPerQuestion ?? 4)).toFixed(2)}đ (chia đều)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => updateCount('part2_MCQTrueFalse', -1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-black text-slate-900 dark:text-white min-w-[3.5rem] text-center">
                    {questionCounts.part2_MCQTrueFalse} câu
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCount('part2_MCQTrueFalse', 1)}
                    className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition-all shadow-xs shadow-teal-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Phần III */}
            {examMode !== 'ESSAY_ONLY' && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 tracking-wider uppercase">
                      Phần III
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                      Tổng {currentScores.part3Score}đ
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Trắc nghiệm Trả lời ngắn
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Điền câu trả lời ngắn
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Điểm / câu:</span>
                      <select
                        value={questionCounts.part3_PointsPerQuestion ?? 0.25}
                        onChange={(e) =>
                          setQuestionCounts((prev) => ({
                            ...prev,
                            part3_PointsPerQuestion: Number(e.target.value),
                          }))
                        }
                        className="px-2 py-1 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs focus:outline-none cursor-pointer"
                      >
                        <option value={0.25}>0.25 đ</option>
                        <option value={0.5}>0.50 đ</option>
                        <option value={0.75}>0.75 đ</option>
                        <option value={1.0}>1.00 đ</option>
                        <option value={1.5}>1.50 đ</option>
                        <option value={2.0}>2.00 đ</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => updateCount('part3_MCQShort', -1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-black text-slate-900 dark:text-white min-w-[3.5rem] text-center">
                    {questionCounts.part3_MCQShort} câu
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCount('part3_MCQShort', 1)}
                    className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition-all shadow-xs shadow-teal-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Phần IV */}
            {examMode !== 'MCQ_ONLY' && (
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 tracking-wider uppercase">
                      Phần IV
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                      Tổng {currentScores.part4Score}đ
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      Câu hỏi Tự luận
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kèm Rubric chấm chi tiết
                    </p>
                  </div>

                  {questionCounts.part4_Essay > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/70 text-xs space-y-2">
                      {/* Vận dụng (VD) */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                          câu VD:
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateEssaySubCount('apply', -1)}
                            className="w-5 h-5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-teal-700 dark:text-teal-400 w-3.5 text-center">
                            {currentScores.applyCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateEssaySubCount('apply', 1)}
                            className="w-5 h-5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[10px] border border-teal-200/80 dark:border-teal-800 shrink-0">
                          {currentScores.applyCount > 0
                            ? `Quỹ: ${currentScores.remainingForApply}đ`
                            : '0đ'}
                        </span>
                      </div>

                      {/* Vận dụng cao (VDC) */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300 shrink-0">
                          câu VDC:
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateEssaySubCount('adv', -1)}
                            className="w-5 h-5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-teal-700 dark:text-teal-400 w-3.5 text-center">
                            {currentScores.advCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateEssaySubCount('adv', 1)}
                            className="w-5 h-5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <select
                          value={questionCounts.part4_AdvancedPoints ?? 2.0}
                          onChange={(e) =>
                            setQuestionCounts((prev) => ({
                              ...prev,
                              part4_AdvancedPoints: Number(e.target.value),
                            }))
                          }
                          className="px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 text-[11px] font-bold focus:outline-none cursor-pointer"
                        >
                          <option value={0.5}>0.50đ/câu</option>
                          <option value={1.0}>1.00đ/câu</option>
                          <option value={1.5}>1.50đ/câu</option>
                          <option value={2.0}>2.00đ/câu</option>
                          <option value={2.5}>2.50đ/câu</option>
                          <option value={3.0}>3.00đ/câu</option>
                          <option value={3.5}>3.50đ/câu</option>
                          <option value={4.0}>4.00đ/câu</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => updateEssayCount(-1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-black text-slate-900 dark:text-white min-w-[3.5rem] text-center">
                    {questionCounts.part4_Essay} câu
                  </span>
                  <button
                    type="button"
                    onClick={() => updateEssayCount(1)}
                    className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition-all shadow-xs shadow-teal-600/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Mức độ nhận thức (Thanh kéo %) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                4. Tỷ Lệ Mức Độ Nhận Thức (Thanh Kéo / Số %)
              </h3>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                totalPercentage === 100
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
              }`}
            >
              Tổng: {totalPercentage}% {totalPercentage === 100 ? '✓ Khớp' : '!= 100%'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nhận biết */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Nhận biết</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{cognitiveRatio.remember}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cognitiveRatio.remember}
                onChange={(e) => updateRatio('remember', Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Thông hiểu */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Thông hiểu</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{cognitiveRatio.understand}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cognitiveRatio.understand}
                onChange={(e) => updateRatio('understand', Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Vận dụng */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Vận dụng</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{cognitiveRatio.apply}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cognitiveRatio.apply}
                onChange={(e) => updateRatio('apply', Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            {/* Vận dụng cao */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-800 dark:text-slate-200">Vận dụng cao</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{cognitiveRatio.advanced}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cognitiveRatio.advanced}
                onChange={(e) => updateRatio('advanced', Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 5. Chọn số mã đề */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Copy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              5. Số Lượng Mã Đề Cần Sinh (Đảo Câu Hỏi & Đáp Án)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 4, 6, 8, 10, 20, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCodeCount(num)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  codeCount === num
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {num} Mã đề
              </button>
            ))}

            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-xs font-medium text-slate-500">Tùy chỉnh:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={codeCount}
                onChange={(e) => setCodeCount(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold text-center"
              />
            </div>
          </div>
        </div>

        {/* Submit Action Button */}
        <div className="flex items-center justify-end space-x-4 pt-2">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-glow-emerald text-white font-black text-sm md:text-base shadow-2xl transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>{progressMessage || 'Đang khởi tạo Đề thi & Ma trận...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300 animate-bounce" />
                <span>Sinh Đề Thi & Ma Trận Ngay (Gemini AI)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* API Key Modal */}
      <ApiKeyInputModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={async (newApiKey: string) => {
          setShowApiKeyModal(false);
          if (newApiKey && onSaveSettings) {
            onSaveSettings({ ...settings, customApiKey: newApiKey });
          }
          if (pendingMetadata) {
            try {
              await onGenerate(pendingMetadata);
            } catch (err: any) {
              const msg = String(err?.message || err);
              if (msg.includes('[QUOTA_EXHAUSTED]') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                setShowQuotaModal(true);
              } else if (msg.includes('[NO_API_KEY]') || msg.includes('[INVALID_API_KEY]')) {
                setShowApiKeyModal(true);
              } else {
                setErrorMsg(msg);
              }
            }
          }
        }}
      />

      {/* Modal dán nhanh danh sách nhiều bài */}
      {showBulkTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ListPlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dán nhanh danh sách nhiều bài / nội dung
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkTopicModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bạn có thể copy danh sách mục lục SGK hoặc các bài cần kiểm tra rồi dán vào đây (<b>mỗi bài một dòng</b> hoặc cách nhau bằng dấu chấm phẩy). Hệ thống sẽ tự động tách thành từng bài riêng biệt.
            </p>

            <textarea
              rows={6}
              value={bulkTopicText}
              onChange={(e) => setBulkTopicText(e.target.value)}
              placeholder={`VD:\nBài 1: Đơn thức và đa thức nhiều biến\nBài 2: Các phép toán với đa thức nhiều biến\nBài 3: Những hằng đẳng thức đáng nhớ\nBài 4: Phân tích đa thức thành nhân tử`}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkTopicModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBulkTopics}
                disabled={!bulkTopicText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white transition shadow-sm"
              >
                Áp dụng vào đề thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Exceeded Modal */}
      <QuotaExceededModal
        isOpen={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        onSaveNewKeyAndRetry={async (newApiKey: string) => {
          setShowQuotaModal(false);
          if (newApiKey && onSaveSettings) {
            onSaveSettings({ ...settings, customApiKey: newApiKey });
          }
          if (pendingMetadata) {
            try {
              await onGenerate(pendingMetadata);
            } catch (err: any) {
              const msg = String(err?.message || err);
              if (msg.includes('[QUOTA_EXHAUSTED]') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                setShowQuotaModal(true);
              } else if (msg.includes('[NO_API_KEY]') || msg.includes('[INVALID_API_KEY]')) {
                setShowApiKeyModal(true);
              } else {
                setErrorMsg(msg);
              }
            }
          }
        }}
      />
    </div>
  );
};
