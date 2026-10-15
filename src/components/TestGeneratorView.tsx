import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Copy,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Key,
  Layers,
  Minus,
  Paperclip,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Table,
  Trash2,
  UploadCloud,
  X,
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
  SubjectConfig,
  calculateExamScores,
} from '../types';

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
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [totalPoints, setTotalPoints] = useState(10);
  const [curriculum, setCurriculum] = useState<CurriculumType>('Kết nối tri thức với cuộc sống');

  // Cấu hình đặc thù môn học
  const [subjectConfig, setSubjectConfig] = useState<SubjectConfig>({
    readingPassageType: 'truyen',
    writingGenre: 'nghi_luan_xa_hoi',
    englishSkills: ['phonetics', 'grammar_vocab', 'reading', 'writing_transformation'],
    physicsDomain: 'tong_hop',
    chemistryDomain: 'tong_hop',
    biologyDomain: 'tong_hop',
  });

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

  // 1c. Khung Ma trận bộ môn có sẵn (Tùy chọn nâng cao)
  const [matrixInputMode, setMatrixInputMode] = useState<'auto' | 'custom'>('auto');
  const [customMatrixContext, setCustomMatrixContext] = useState('');
  const [customMatrixImages, setCustomMatrixImages] = useState<string[]>([]);
  const [showMatrixHelp, setShowMatrixHelp] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');

  const MATRIX_TEMPLATES: Record<
    string,
    { label: string; text: string; defaultP1?: number; defaultP2?: number; defaultP3?: number; defaultP4?: number; defaultP3Pts?: number; defaultP4Pts?: number }
  > = {
    toan_thcs_18: {
      label: '📐 Toán THCS (18 câu - 29 ý)',
      text: `### MA TRẬN ĐỀ KIỂM TRA MÔN TOÁN THCS (18 CÂU / 29 Ý - CHUẨN 7991)
| TT | Mạch kiến thức / Chủ đề | Phần I (TN 4 lựa chọn) | Phần II (TN Đúng/Sai - 4 ý) | Phần III (TN Trả lời ngắn) | Phần IV (Tự luận) | Tổng số câu | Điểm |
|---|---|---|---|---|---|---|---|
| 1 | Số & Phép tính / Số học | 4 câu (Câu 1, 2, 3, 4: NB) | 1 câu (Câu 13: 4 ý a,b,c,d - 2 NB, 2 VD) | 2 câu (Câu 15a: NB, 15b: VD) | 2 câu (Câu 16a: TH, 16b: VD; Câu 17: VD) | 9 câu | 4.75đ |
| 2 | Tính chất số học / Chia hết | 3 câu (Câu 5, 6: NB; Câu 7: TH) | 0 | 2 câu (Câu 15c: NB, 15d: TH) | 0 | 5 câu | 1.75đ |
| 3 | Hình học phẳng thực tiễn | 5 câu (Câu 8, 10: NB; Câu 9, 11, 12: TH) | 1 câu (Câu 14: 4 ý a,b,c,d - 3 NB, 1 TH) | 0 | 1 câu (Câu 18: 2 ý 18.1: TH, 18.2: VD) | 7 câu | 3.50đ |
| **CỘNG** | | **12 câu (3.0đ)** | **2 câu lớn (2.0đ)** | **4 câu (2.0đ)** | **3 câu (3.0đ)** | **18 câu (29 ý)** | **10.0đ** |

🎯 ĐỊNH HƯỚNG CẤU TRÚC ĐỀ CHO AI BÁM SÁT 100%:
1. Phần I: 12 câu trắc nghiệm 4 lựa chọn (Câu 1 đến 12 | mỗi câu 0.25đ = 3.0đ).
2. Phần II: 2 câu hỏi Đúng/Sai (Câu 13 và Câu 14, mỗi câu gồm 4 ý a, b, c, d chia đều 0.25đ/ý = 2.0đ).
3. Phần III: 4 câu trả lời ngắn độc lập (15a, 15b, 15c, 15d | mỗi câu 0.5đ = 2.0đ).
4. Phần IV: 3 câu tự luận (Câu 16 gồm 2 ý a, b; Câu 17; Câu 18 gồm 2 ý 18.1, 18.2 | Tổng = 3.0đ).`,
      defaultP1: 12,
      defaultP2: 2,
      defaultP3: 4,
      defaultP4: 3,
      defaultP3Pts: 0.5,
      defaultP4Pts: 1.0,
    },
    toan: {
      label: '📐 Toán (Chuẩn 7991)',
      text: `### MA TRẬN ĐỀ KIỂM TRA MÔN TOÁN (CHUẨN BGD&ĐT)
| TT | Mạch kiến thức / Chủ đề | Phần I (TN 4 lựa chọn) | Phần II (TN Đúng/Sai - 4 ý) | Phần III (TN Trả lời ngắn) | Phần IV (Tự luận) | Tổng số câu | Điểm |
|---|---|---|---|---|---|---|---|
| 1 | Mạch Số & Đại số (Đơn thức, đa thức, phương trình) | 6 câu (4 NB, 2 TH) | 1 câu (2 NB, 1 TH, 1 VD) | 2 câu (1 TH, 1 VD) | 1 câu (VD: 2.0đ) | 10 câu | 5.0đ |
| 2 | Mạch Hình học & Đo lường (Tam giác, tứ giác, khối hình) | 4 câu (2 NB, 2 TH) | 1 câu (1 NB, 2 TH, 1 VD) | 1 câu (VD: 1.0đ) | 1 câu (VDC: 2.0đ) | 7 câu | 3.5đ |
| 3 | Mạch Thống kê & Xác suất thực nghiệm | 2 câu (1 NB, 1 TH) | 0 | 1 câu (TH: 1.0đ) | 0 | 3 câu | 1.5đ |
| **CỘNG** | | **12 câu (3.0đ)** | **2 câu (2.0đ)** | **4 câu (1.0đ)** | **2 câu (4.0đ)** | **20 câu** | **10.0đ** |
* Tỷ lệ nhận thức: Nhận biết 40% (4.0đ) - Thông hiểu 30% (3.0đ) - Vận dụng 20% (2.0đ) - Vận dụng cao 10% (1.0đ).`,
      defaultP1: 12,
      defaultP2: 2,
      defaultP3: 4,
      defaultP4: 2,
    },
    van: {
      label: '📖 Ngữ văn (Đọc hiểu & Viết)',
      text: `### MA TRẬN ĐỀ KIỂM TRA MÔN NGỮ VĂN
| TT | Kỹ năng / Đơn vị kiến thức | Nhận biết (NB) | Thông hiểu (TH) | Vận dụng (VD) | Vận dụng cao (VDC) | Tổng điểm / Tỷ lệ |
|---|---|---|---|---|---|---|
| 1 | **I. ĐỌC HIỂU** (Ngữ liệu văn bản truyện / thơ ngoài SGK) | 4 câu TN (1.0đ) | 4 câu TN (1.0đ) | 2 câu TN/TL ngắn (1.0đ) | 1 câu TL ngắn (1.0đ) | **4.0 điểm** (40%) |
| 2 | **II. VIẾT** (Tạo lập văn bản) | - | - | 1 bài Nghị luận XH/Đoạn văn (2.0đ) | 1 bài Nghị luận VH/Bài viết (4.0đ) | **6.0 điểm** (60%) |
| **TỔNG CỘNG** | | **1.0đ (10%)** | **1.0đ (10%)** | **3.0đ (30%)** | **5.0đ (50%)** | **10.0 điểm (100%)** |
* Bảng đặc tả: Phần Đọc hiểu kiểm tra nhận diện thể loại, phương thức biểu đạt, phân tích chi tiết, thông điệp tư tưởng. Phần Viết yêu cầu lập dàn ý, luận điểm chặt chẽ, dẫn chứng xác thực, cảm xúc chân thực.`,
      defaultP1: 8,
      defaultP2: 0,
      defaultP3: 2,
      defaultP4: 2,
    },
    anh: {
      label: '🇬🇧 Tiếng Anh (Kỹ năng)',
      text: `### MATRIX SPECIFICATION FOR ENGLISH EXAMINATION
| TT | Language Component / Skill | Remember (NB) | Understand (TH) | Apply (VD) | Advanced (VDC) | Total Qs / Points |
|---|---|---|---|---|---|---|
| 1 | Phonetics (Pronunciation & Stress) | 4 MCQs (1.0 pt) | - | - | - | 4 Qs (1.0 pt) |
| 2 | Language Focus (Grammar & Vocabulary) | 6 MCQs (1.5 pts) | 4 MCQs (1.0 pt) | - | - | 10 Qs (2.5 pts) |
| 3 | Reading Comprehension (Passage reading) | 2 MCQs (0.5 pt) | 4 MCQs (1.0 pt) | 2 MCQs (0.5 pt) | - | 8 Qs (2.0 pts) |
| 4 | Writing (Sentence transformation & Paragraph) | - | 2 Qs (1.0 pt) | 2 Qs (1.5 pts) | 1 Q (2.0 pts) | 5 Qs (4.5 pts) |
| **TOTAL** | | **3.0 pts (30%)** | **3.0 pts (30%)** | **2.0 pts (20%)** | **2.0 pts (20%)** | **27 Qs (10.0 pts)** |`,
      defaultP1: 18,
      defaultP2: 2,
      defaultP3: 2,
      defaultP4: 2,
    },
    khtn: {
      label: '🔬 KHTN / Vật lí / Hóa học',
      text: `### MA TRẬN ĐỀ KIỂM TRA KHOA HỌC TỰ NHIÊN / VẬT LÍ / HÓA HỌC
| TT | Mạch nội dung kiến thức | Phần I (TN 4 lựa chọn) | Phần II (TN Đúng/Sai - 4 ý) | Phần III (TN Trả lời ngắn) | Phần IV (Tự luận bài toán) | Tổng điểm |
|---|---|---|---|---|---|---|
| 1 | Chủ đề 1: Khái niệm & Nguyên lí cốt lõi | 6 câu (4 NB, 2 TH) | 1 câu (2 NB, 2 TH) | 1 câu (TH: 1) | 1 câu (VD: 1.5đ) | 4.0 điểm |
| 2 | Chủ đề 2: Tính toán & Phương trình hiện tượng | 4 câu (2 NB, 2 TH) | 1 câu (1 TH, 2 VD, 1 VDC) | 2 câu (1 TH, 1 VD) | 1 câu (VDC: 1.5đ) | 4.0 điểm |
| 3 | Chủ đề 3: Thực nghiệm & Ứng dụng công nghệ | 2 câu (1 NB, 1 TH) | 0 | 1 câu (VD: 1) | 0 | 2.0 điểm |
| **CỘNG** | | **12 câu (3.0đ)** | **2 câu (2.0đ)** | **4 câu (1.0đ)** | **2 câu (4.0đ)** | **10.0 điểm** |
* Mức độ nhận thức: Nhận biết 40% (4.0đ) - Thông hiểu 30% (3.0đ) - Vận dụng 20% (2.0đ) - Vận dụng cao 10% (1.0đ).`,
      defaultP1: 12,
      defaultP2: 2,
      defaultP3: 4,
      defaultP4: 2,
    },
    suDia: {
      label: '🌏 Lịch sử - Địa lí / GDCD',
      text: `### MA TRẬN ĐỀ KIỂM TRA LỊCH SỬ - ĐỊA LÍ / XÃ HỘI
| TT | Mạch chuyên đề | Phần I (TN Nhiều lựa chọn) | Phần II (TN Đúng/Sai) | Phần III (Trả lời ngắn) | Phần IV (Tự luận phân tích) | Tổng điểm |
|---|---|---|---|---|---|---|
| 1 | Chủ đề trọng tâm 1 | 6 câu (4 NB, 2 TH) | 1 câu (2 NB, 2 TH) | 2 câu (1 TH, 1 VD) | 1 câu (VD: 2.0đ) | 5.0 điểm |
| 2 | Chủ đề trọng tâm 2 | 6 câu (2 NB, 4 TH) | 1 câu (1 TH, 2 VD, 1 VDC) | 2 câu (1 TH, 1 VD) | 1 câu (VDC: 2.0đ) | 5.0 điểm |
| **CỘNG** | | **12 câu (3.0đ)** | **2 câu (2.0đ)** | **4 câu (1.0đ)** | **2 câu (4.0đ)** | **10.0 điểm** |`,
      defaultP1: 12,
      defaultP2: 2,
      defaultP3: 4,
      defaultP4: 2,
    },
  };

  const handleApplyTemplate = (key: string) => {
    const tpl = MATRIX_TEMPLATES[key];
    if (!tpl) return;
    setCustomMatrixContext(tpl.text);
    setMatrixInputMode('custom');
    setSelectedTemplateKey(key);
    if (
      tpl.defaultP1 !== undefined &&
      tpl.defaultP2 !== undefined &&
      tpl.defaultP3 !== undefined &&
      tpl.defaultP4 !== undefined
    ) {
      setQuestionCounts((prev) => ({
        ...prev,
        part1_MCQSingle: tpl.defaultP1!,
        part2_MCQTrueFalse: tpl.defaultP2!,
        part3_MCQShort: tpl.defaultP3!,
        part4_Essay: tpl.defaultP4!,
        part3_PointsPerQuestion: tpl.defaultP3Pts ?? prev.part3_PointsPerQuestion,
        part4_ApplyPoints: tpl.defaultP4Pts ?? prev.part4_ApplyPoints,
        part4_AdvancedPoints: tpl.defaultP4Pts ?? prev.part4_AdvancedPoints,
      }));
    }
  };

  const handleInsertStructurePrompt = (type: 'thcs_18' | 'thpt_22' | 'van') => {
    let snippet = '';
    if (type === 'thcs_18') {
      snippet = `\n\n### CẤU TRÚC ĐỀ BÁM SÁT MA TRẬN TRÊN (18 CÂU - 29 Ý | TỔNG 10.0 ĐIỂM):
- Phần I (Câu 1 -> 12): Đúng 12 câu trắc nghiệm 4 lựa chọn (8 Biết, 4 Hiểu - mỗi câu 0.25đ = 3.0đ).
- Phần II (Câu 13, 14): Đúng 2 câu lớn Đúng/Sai (Câu 13 gồm 4 ý a,b,c,d; Câu 14 gồm 4 ý a,b,c,d - mỗi câu 1.0đ = 2.0đ).
- Phần III (Câu 15a, 15b, 15c, 15d): Đúng 4 câu trả lời ngắn độc lập (2 Biết, 1 Hiểu, 1 Vận dụng - mỗi câu 0.5đ = 2.0đ).
- Phần IV (Câu 16, 17, 18): Đúng 3 câu tự luận (Câu 16 gồm ý a, b; Câu 17; Câu 18 gồm ý 18.1, 18.2 - Tổng = 3.0đ).
* YÊU CẦU AI: Ra đủ 100% 18 câu hỏi trên, không gộp và không bỏ sót bất kỳ câu nào!`;
      setQuestionCounts((prev) => ({
        ...prev,
        part1_MCQSingle: 12,
        part1_PointsPerQuestion: 0.25,
        part2_MCQTrueFalse: 2,
        part2_PointsPerQuestion: 1.0,
        part3_MCQShort: 4,
        part3_PointsPerQuestion: 0.5,
        part4_Essay: 3,
        part4_ApplyCount: 2,
        part4_ApplyPoints: 1.0,
        part4_AdvancedCount: 1,
        part4_AdvancedPoints: 1.0,
      }));
    } else if (type === 'thpt_22') {
      snippet = `\n\n### CẤU TRÚC ĐỀ CHUẨN THPT/ĐGNL (22 CÂU | TỔNG 10.0 ĐIỂM):
- Phần I: 12 câu trắc nghiệm 4 lựa chọn (Câu 1-12 | 0.25đ/câu = 3.0đ).
- Phần II: 4 câu trắc nghiệm Đúng/Sai (Câu 1-4 | mỗi câu 4 ý a,b,c,d = 4.0đ).
- Phần III: 6 câu trắc nghiệm Trả lời ngắn (Câu 1-6 | 0.5đ/câu = 3.0đ).
* Phần IV: 0 câu Tự luận.`;
      setQuestionCounts((prev) => ({
        ...prev,
        part1_MCQSingle: 12,
        part1_PointsPerQuestion: 0.25,
        part2_MCQTrueFalse: 4,
        part2_PointsPerQuestion: 1.0,
        part3_MCQShort: 6,
        part3_PointsPerQuestion: 0.5,
        part4_Essay: 0,
      }));
    } else if (type === 'van') {
      snippet = `\n\n### CẤU TRÚC ĐỀ MÔN NGỮ VĂN (ĐỌC HIỂU & VIẾT | TỔNG 10.0 ĐIỂM):
- Phần I Đọc hiểu: 8 câu (Câu 1-8 | 4.0đ).
- Phần II Viết (Tự luận): 2 câu (Câu 1: Viết đoạn văn nghị luận 2.0đ; Câu 2: Bài văn 4.0đ).`;
      setQuestionCounts((prev) => ({
        ...prev,
        part1_MCQSingle: 8,
        part1_PointsPerQuestion: 0.5,
        part2_MCQTrueFalse: 0,
        part3_MCQShort: 0,
        part4_Essay: 2,
        part4_ApplyCount: 1,
        part4_ApplyPoints: 2.0,
        part4_AdvancedCount: 1,
        part4_AdvancedPoints: 4.0,
      }));
    }

    setCustomMatrixContext((prev) => (prev ? prev.trim() + snippet : snippet.trim()));
    setMatrixInputMode('custom');
  };

  const handleClearMatrix = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ nội dung ma trận và ảnh đính kèm không?')) {
      setCustomMatrixContext('');
      setCustomMatrixImages([]);
      setSelectedTemplateKey('');
    }
  };

  const isCustomMatrixActive =
    matrixInputMode === 'custom' &&
    (Boolean(customMatrixContext.trim()) || customMatrixImages.length > 0);

  // Xử lý tải ảnh / file khung ma trận có sẵn
  const processMatrixFiles = (files: FileList | File[]) => {
    setMatrixInputMode('custom');
    Array.from(files).forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setCustomMatrixImages((prev) => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      } else if (
        file.type === 'text/plain' ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.csv')
      ) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            setCustomMatrixContext((prev) => (prev ? prev + '\n\n' + text : text));
          }
        };
        reader.readAsText(file);
      } else {
        alert(
          'Vui lòng chọn các file định dạng hình ảnh (PNG, JPG, WEBP) hoặc file văn bản (.txt, .csv) để tải lên.'
        );
      }
    });
  };

  const handleMatrixFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processMatrixFiles(files);
    e.target.value = '';
  };

  const handleMatrixPaste = (e: React.ClipboardEvent) => {
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
      processMatrixFiles(imageFiles);
    }
  };

  const handleMatrixDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMatrixFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveMatrixImage = (index: number) => {
    setCustomMatrixImages((prev) => prev.filter((_, i) => i !== index));
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
        chapterTitle,
        durationMinutes,
        totalPoints,
        curriculum,
        examMode,
        questionCounts,
        cognitiveRatio,
        codeCount,
        subjectConfig,
        referenceContext,
        referenceImages,
        customMatrixContext: customMatrixContext.trim() || undefined,
        customMatrixImages: customMatrixImages.length > 0 ? customMatrixImages : undefined,
      });
      setShowApiKeyModal(true);
      return;
    }

    const hasCustomMatrix = Boolean(
      customMatrixContext.trim() || customMatrixImages.length > 0
    );

    if (!hasCustomMatrix) {
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
      chapterTitle,
      durationMinutes,
      totalPoints,
      curriculum,
      examMode,
      questionCounts,
      cognitiveRatio,
      codeCount,
      subjectConfig,
      referenceContext,
      referenceImages,
      customMatrixContext: customMatrixContext.trim() || undefined,
      customMatrixImages: customMatrixImages.length > 0 ? customMatrixImages : undefined,
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
                onChange={(e) => {
                  const newSub = e.target.value as SubjectType;
                  setSubject(newSub);
                  // Tự động gợi ý tên chương / chủ đề theo môn học
                  if (newSub === 'Ngữ văn') {
                    setChapterTitle('Đọc hiểu văn bản truyện/thơ và Viết đoạn văn nghị luận xã hội');
                  } else if (newSub === 'Tiếng Anh') {
                    setChapterTitle('Unit 1 - Unit 3: Pronunciation, Grammar, Reading Comprehension & Writing');
                  } else if (newSub === 'Vật lí') {
                    setChapterTitle('Chương I: Động học & Động lực học chất điểm');
                  } else if (newSub === 'Hóa học') {
                    setChapterTitle('Chương I: Cấu tạo nguyên tử & Bảng tuần hoàn');
                  } else if (newSub === 'Sinh học') {
                    setChapterTitle('Chương I: Cơ sở di truyền học & Biến dị');
                  } else if (newSub === 'Lịch sử') {
                    setChapterTitle('Chủ đề: Lịch sử Việt Nam thời cận - hiện đại');
                  } else if (newSub === 'Địa lí') {
                    setChapterTitle('Địa lí tự nhiên & Dân cư Việt Nam');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              >
                <option value="Toán">Toán học</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Vật lí">Vật lí</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="KHTN">KHTN (Khoa học tự nhiên THCS)</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lí">Địa lí</option>
                <option value="Lịch sử và Địa lí">Lịch sử và Địa lí (THCS)</option>
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
                onChange={(e) => setGrade(e.target.value)}
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
                <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
                <option value="Cánh Diều">Cánh Diều</option>
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

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên Bài / Tên Chương / Mạch Nội Dung Kiến Thức
              </label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="VD: Chương I. Đa thức"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                required
              />
            </div>

            {/* BẢNG CẤU HÌNH ĐẶC THÙ MÔN HỌC (THEO ĐỊNH HƯỚNG BỘ GD&ĐT GDPT 2018) */}
            {subject === 'Ngữ văn' && (
              <div className="md:col-span-2 lg:col-span-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                  <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Cấu hình Đặc thù Môn Ngữ văn (Chuẩn GDPT 2018 - Ngữ liệu ngoài SGK)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Thể loại ngữ liệu Đọc hiểu:
                    </label>
                    <select
                      value={subjectConfig.readingPassageType || 'truyen'}
                      onChange={(e) => setSubjectConfig((prev) => ({ ...prev, readingPassageType: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="truyen">Văn bản Truyện / Tản văn / Ký ngoài SGK</option>
                      <option value="tho">Văn bản Thơ / Thơ tự do ngoài SGK</option>
                      <option value="nghi_luan">Văn bản Nghị luận xã hội / Văn học ngoài SGK</option>
                      <option value="thong_tin">Văn bản Thông tin / Báo chí khoa học</option>
                      <option value="tu_do">Tự do do AI lựa chọn phù hợp lứa tuổi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dạng bài Viết (Phần Tự luận):
                    </label>
                    <select
                      value={subjectConfig.writingGenre || 'nghi_luan_xa_hoi'}
                      onChange={(e) => setSubjectConfig((prev) => ({ ...prev, writingGenre: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="nghi_luan_xa_hoi">Đoạn văn / Bài văn Nghị luận xã hội (200 chữ)</option>
                      <option value="nghi_luan_van_hoc">Nghị luận văn học (Phân tích, cảm nhận đoạn trích)</option>
                      <option value="thuyet_minh">Bài văn Thuyết minh về một hiện tượng / danh lam</option>
                      <option value="tu_su">Bài văn Tự sự / Kể lại một trải nghiệm ý nghĩa</option>
                      <option value="bieu_cam">Bài văn Biểu cảm về con người, cuộc sống</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                  * Hệ thống sẽ tự động chỉ đạo AI trích dẫn văn bản ngoài SGK kèm nguồn xuất bản và tạo Rubric chấm 4 tiêu chí (Hình thức, Nội dung, Lập luận, Sáng tạo & chính tả).
                </p>
              </div>
            )}

            {subject === 'Tiếng Anh' && (
              <div className="md:col-span-2 lg:col-span-3 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-sky-800 dark:text-sky-300 font-bold text-xs uppercase tracking-wide">
                  <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Cấu hình Đặc thù Môn Tiếng Anh (English Exam Blueprint)</span>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kỹ năng & Mảng ngôn ngữ tích hợp trong đề:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                    {[
                      { id: 'phonetics', label: 'Ngữ âm (Phonetics)' },
                      { id: 'grammar_vocab', label: 'Từ vựng & Ngữ pháp' },
                      { id: 'cloze_test', label: 'Điền từ (Cloze Test)' },
                      { id: 'reading', label: 'Đọc hiểu (Reading)' },
                      { id: 'writing_transformation', label: 'Viết lại câu / Viết' },
                    ].map((skill) => {
                      const isSelected = (subjectConfig.englishSkills || []).includes(skill.id as any);
                      return (
                        <label
                          key={skill.id}
                          className={`flex items-center space-x-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500 text-sky-900 dark:text-sky-200 font-semibold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const cur = subjectConfig.englishSkills || [];
                              const updated = e.target.checked
                                ? [...cur, skill.id as any]
                                : cur.filter((s) => s !== skill.id);
                              setSubjectConfig((prev) => ({ ...prev, englishSkills: updated }));
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-[11px]">{skill.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[11px] text-sky-700 dark:text-sky-400 italic">
                  * Toàn bộ câu hỏi, phương án A/B/C/D và bài đọc sẽ được tạo 100% bằng tiếng Anh chuẩn theo lứa tuổi {grade}.
                </p>
              </div>
            )}

            {subject === 'Vật lí' && (
              <div className="md:col-span-2 lg:col-span-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-800 dark:text-indigo-300 font-bold text-xs uppercase tracking-wide">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Cấu hình Đặc thù Môn Vật lí (Thực nghiệm & Hiện tượng khoa học)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mạch chuyên đề trọng tâm:
                    </label>
                    <select
                      value={subjectConfig.physicsDomain || 'tong_hop'}
                      onChange={(e) => setSubjectConfig((prev) => ({ ...prev, physicsDomain: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="tong_hop">Tổng hợp kiến thức theo chương trình</option>
                      <option value="co_hoc">Cơ học (Động học, Động lực học, Năng lượng, Cân bằng)</option>
                      <option value="nhiet_hoc">Nhiệt học (Chất khí, Nhiệt động lực học, Sự chuyển thể)</option>
                      <option value="dien_quang">Điện trường, Từ trường & Dòng điện xoay chiều</option>
                      <option value="song_anh_sang">Sóng cơ, Sóng âm & Giao thoa ánh sáng</option>
                      <option value="hat_nhan">Vật lí hạt nhân & Lượng tử ánh sáng</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={subjectConfig.hasContextData ?? true}
                        onChange={(e) => setSubjectConfig((prev) => ({ ...prev, hasContextData: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Ưu tiên bài toán có số liệu thí nghiệm / Đồ thị hiện tượng thực tiễn</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {subject === 'Hóa học' && (
              <div className="md:col-span-2 lg:col-span-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cấu hình Đặc thù Môn Hóa học (Công thức chuẩn LaTeX & Thí nghiệm)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mạch kiến thức Hóa học:
                    </label>
                    <select
                      value={subjectConfig.chemistryDomain || 'tong_hop'}
                      onChange={(e) => setSubjectConfig((prev) => ({ ...prev, chemistryDomain: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="tong_hop">Tổng hợp theo chủ đề bài học</option>
                      <option value="vo_co">Hóa học Vô cơ (Kim loại, Phi kim, Axit, Muối)</option>
                      <option value="huu_co">Hóa học Hữu cơ (Hydrocarbon, Dẫn xuất, Polymer)</option>
                      <option value="hoa_dai_cuong">Hóa đại cương (Cấu tạo nguyên tử, Liên kết, Tốc độ phản ứng)</option>
                      <option value="thi_nghiem">Hiện tượng thí nghiệm & Ứng dụng thực tế đời sống</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                      {`* Mọi công thức C2H5OH, CH3COOH, H2SO4 và phương trình phản ứng hóa học sẽ được tự động định dạng chuẩn công thức LaTeX.`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {subject === 'Sinh học' && (
              <div className="md:col-span-2 lg:col-span-3 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-300 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Cấu hình Đặc thù Môn Sinh học (Di truyền, Tiến hóa & Sinh thái)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mạch kiến thức Sinh học:
                    </label>
                    <select
                      value={subjectConfig.biologyDomain || 'tong_hop'}
                      onChange={(e) => setSubjectConfig((prev) => ({ ...prev, biologyDomain: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="tong_hop">Tổng hợp theo chủ đề bài học</option>
                      <option value="di_truyen">Di truyền học (ADN, Nhiễm sắc thể, Phép lai Men-đen, Phả hệ)</option>
                      <option value="sinh_thai">Sinh thái học & Môi trường sống</option>
                      <option value="te_bao">Sinh học tế bào & Vi sinh vật</option>
                      <option value="co_the">Sinh học cơ thể (Thực vật & Động vật, Con người)</option>
                      <option value="tien_hoa">Tiến hóa và các học thuyết</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 italic">
                      * Đề sẽ tập trung vào phân tích quy luật, biện luận phép lai, sơ đồ chuỗi thức ăn hoặc sơ đồ phả hệ.
                    </span>
                  </div>
                </div>
              </div>
            )}

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

        {/* 2. Khung Ma Trận & Bản Đặc Tả Bộ Môn Có Sẵn */}
        <div
          className={`rounded-2xl p-6 shadow-xs border transition-all space-y-4 ${
            customMatrixContext.trim() || customMatrixImages.length > 0
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <Table className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    2. Ra Đề Dựa Trên Ma Trận Bộ Môn Có Sẵn (Tùy Chọn)
                  </h3>
                  {(customMatrixContext.trim() || customMatrixImages.length > 0) && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1 animate-fade-in">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Đã nạp Ma trận ({customMatrixContext.trim() ? 'Văn bản' : ''}{customMatrixContext.trim() && customMatrixImages.length ? ' + ' : ''}{customMatrixImages.length ? `${customMatrixImages.length} ảnh chụp` : ''})</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Khi tổ chuyên môn đã có Ma trận &amp; Bản đặc tả được duyệt, nhập hoặc dán vào đây để AI sinh đề bám sát tuyệt đối từng dòng mạch kiến thức.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowMatrixHelp(!showMatrixHelp)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{showMatrixHelp ? 'Ẩn hướng dẫn' : 'Cách nhập ma trận'}</span>
              </button>
            </div>
          </div>

          {/* Lựa chọn chế độ ma trận */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMatrixInputMode('auto');
              }}
              className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                matrixInputMode === 'auto' && !customMatrixContext.trim() && customMatrixImages.length === 0
                  ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>A. AI Tự Động Xây Dựng Ma Trận (Mặc định)</span>
                </span>
                {matrixInputMode === 'auto' && !customMatrixContext.trim() && customMatrixImages.length === 0 && (
                  <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                AI phân tích chủ đề, chương bài và tự phân bổ số câu, mức độ nhận thức (NB, TH, VD, VDC) chuẩn Công văn 7991.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMatrixInputMode('custom');
              }}
              className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                matrixInputMode === 'custom' || customMatrixContext.trim() || customMatrixImages.length > 0
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>B. Ra Đề Bám Sát Khung Ma Trận Bộ Môn Có Sẵn</span>
                </span>
                {(matrixInputMode === 'custom' || customMatrixContext.trim() || customMatrixImages.length > 0) && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Dán bảng ma trận Word/Excel hoặc tải ảnh chụp ma trận đã duyệt. AI sẽ đọc từng dòng và bám sát 100%.
              </p>
            </button>
          </div>

          {/* Hướng dẫn chi tiết */}
          {showMatrixHelp && (
            <div className="text-xs text-slate-700 dark:text-slate-300 bg-teal-50/80 dark:bg-slate-800/90 p-4 rounded-xl border border-teal-200 dark:border-teal-800 space-y-2 leading-relaxed animate-fade-in">
              <p className="font-bold text-teal-800 dark:text-teal-300 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Cách thức hoạt động &amp; Lợi ích khi ra đề theo ma trận bộ môn:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[12px]">
                <li><b>Sao chép từ Word / Excel:</b> Bạn có thể chọn toàn bộ bảng ma trận trong Word hoặc Excel, nhấn <b>Ctrl+C</b> rồi <b>Ctrl+V</b> vào ô văn bản dưới đây. AI sẽ tự động hiểu các cột mức độ (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) và số câu từng phần.</li>
                <li><b>Chụp ảnh màn hình:</b> Nếu bạn có file PDF hoặc ảnh chụp ma trận do nhà trường ban hành, chỉ cần chụp màn hình rồi nhấn <b>Ctrl+V</b> để dán ảnh trực tiếp vào đây hoặc bấm <b>"Tải ảnh ma trận lên"</b>.</li>
                <li><b>Bảo toàn chuẩn 10 điểm:</b> AI sẽ tạo ra đề thi có câu hỏi khớp chính xác với từng dòng ma trận của bạn, đồng thời xuất bảng Ma trận và Bản đặc tả tương ứng.</li>
              </ul>
            </div>
          )}

          {/* Vùng làm việc Nhập ma trận (Hiển thị khi chọn B hoặc đã có dữ liệu) */}
          {(matrixInputMode === 'custom' || customMatrixContext.trim() || customMatrixImages.length > 0) && (
            <div className="space-y-3 pt-1 animate-fade-in">
              {/* Presets nạp mẫu nhanh */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 mr-1">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    <span>Nạp mẫu ma trận gợi ý:</span>
                  </span>
                  {Object.entries(MATRIX_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyTemplate(key)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                        selectedTemplateKey === key && customMatrixContext.includes(tpl.label.slice(2, 6))
                          ? 'bg-teal-600 text-white shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-300'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

                {(customMatrixContext.trim() || customMatrixImages.length > 0) && (
                  <button
                    type="button"
                    onClick={handleClearMatrix}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa ma trận</span>
                  </button>
                )}
              </div>

              {/* Hộp gợi ý cấu trúc đề bám sát ma trận */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Gợi ý chèn cấu trúc đề chính xác (Giúp AI ra đề chuẩn 100% khớp ma trận):</span>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  Nếu ma trận của thầy/cô có đánh số theo từng ý (như <b>13a-d</b>, <b>15a-d</b>, <b>16a-b</b>), hãy nhấn nút dưới đây để hệ thống tự động bổ sung hướng dẫn chi tiết số câu lớn - số ý con và tự cân bằng điểm cho AI:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleInsertStructurePrompt('thcs_18')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>📐 Chèn cấu trúc 18 câu - 29 ý (Toán 6, 7, 8, 9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertStructurePrompt('thpt_22')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 font-semibold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>⚡ Chèn cấu trúc 22 câu (THPT 2025)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertStructurePrompt('van')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 font-semibold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <span>📖 Chèn cấu trúc Ngữ văn</span>
                  </button>
                </div>
              </div>

              {/* Textarea nhập / dán ma trận */}
              <div
                onPaste={handleMatrixPaste}
                onDragOver={handleMatrixDrop}
                className="relative"
              >
                <textarea
                  rows={6}
                  value={customMatrixContext}
                  onChange={(e) => {
                    setCustomMatrixContext(e.target.value);
                    if (e.target.value.trim() && matrixInputMode !== 'custom') {
                      setMatrixInputMode('custom');
                    }
                  }}
                  placeholder="Dán (Ctrl+V) bảng ma trận sao chép từ Word, Excel hoặc nhập văn bản mô tả ma trận bộ môn vào đây (Có thể chụp ảnh màn hình và nhấn Ctrl+V để dán trực tiếp)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white/95 dark:bg-slate-900/95 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 pointer-events-none">
                  <span>Dán bảng Word/Excel hoặc nhấn <b>Ctrl+V</b> để dán ảnh</span>
                </div>
              </div>

              {/* Nút tải ảnh / tệp ma trận */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95">
                    <UploadCloud className="w-4 h-4" />
                    <span>Tải ảnh / file ma trận lên</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.txt,.md,.csv"
                      onChange={handleMatrixFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    (Hỗ trợ ảnh chụp .png, .jpg hoặc tệp văn bản .txt, .csv)
                  </span>
                </div>

                {customMatrixImages.length > 0 && (
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Đã đính kèm {customMatrixImages.length} ảnh ma trận</span>
                  </span>
                )}
              </div>

              {/* Danh sách ảnh ma trận đã tải lên */}
              {customMatrixImages.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                      <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>Ảnh chụp khung ma trận bộ môn ({customMatrixImages.length} ảnh):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomMatrixImages([])}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa hết ảnh</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {customMatrixImages.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 aspect-square shadow-xs"
                      >
                        <img
                          src={imgSrc}
                          alt={`Ma trận ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMatrixImage(idx)}
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
          )}
        </div>

        {/* 3. Chọn loại đề */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                3. Chọn Chế Độ Đề Kiểm Tra (3 Loại)
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

        {/* 4. Cấu trúc số lượng câu hỏi & Tùy chọn điểm số */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                4. Cấu Trúc / Số Lượng Câu Hỏi & Thang Điểm (Yêu cầu đúng 10 điểm)
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

          {/* Banner thông báo Bỏ qua mục này nếu đang ra đề theo Ma trận */}
          {isCustomMatrixActive && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 flex items-start space-x-2.5 text-xs text-teal-900 dark:text-teal-200">
              <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-teal-950 dark:text-teal-100">
                  ⚡ Đang ở chế độ Ra đề theo Ma trận bộ môn:
                </p>
                <p className="text-teal-800 dark:text-teal-300 leading-relaxed">
                  AI sẽ <strong>BỎ QUA</strong> cấu trúc số câu ở mục này và chỉ dựa duy nhất vào nội dung Ma trận (Mục 2) của bạn để ra đúng và đủ số lượng câu hỏi theo từng phần.
                </p>
              </div>
            </div>
          )}

          {/* Banner thông báo nếu chưa đủ hoặc vượt quá 10 điểm + Nút Tự động cân bằng */}
          {!isCustomMatrixActive && Math.abs(currentScores.totalScore - 10.0) >= 0.01 && (
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

        {/* 5. Mức độ nhận thức (Thanh kéo %) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                5. Tỷ Lệ Mức Độ Nhận Thức (Thanh Kéo / Số %)
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

          {/* Banner thông báo Bỏ qua mục này nếu đang ra đề theo Ma trận */}
          {isCustomMatrixActive && (
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 flex items-start space-x-2.5 text-xs text-teal-900 dark:text-teal-200">
              <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-teal-950 dark:text-teal-100">
                  ⚡ Đang ở chế độ Ra đề theo Ma trận bộ môn:
                </p>
                <p className="text-teal-800 dark:text-teal-300 leading-relaxed">
                  AI sẽ <strong>BỎ QUA</strong> thanh kéo tỷ lệ % ở mục này. Tỷ lệ nhận thức (Nhận biết, Thông hiểu, Vận dụng) sẽ được AI tính toán tự động dựa trên số câu thực tế trong khung ma trận của bạn.
                </p>
              </div>
            </div>
          )}

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

        {/* 6. Chọn số mã đề */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Copy className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              6. Số Lượng Mã Đề Cần Sinh (Đảo Câu Hỏi & Đáp Án)
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
