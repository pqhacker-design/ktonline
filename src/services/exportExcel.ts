import * as XLSX from 'xlsx';
import { ExamPackage, QuestionBankItem, getSpecRowQuestionDetails } from '../types';
import { cleanLatexForDocx } from './exportDocx';

export class ExportExcel {
  /**
   * Xuất gói đề thi (Ma trận, Đặc tả, Bảng Đáp án) ra Workbook Excel (.xlsx)
   */
  static exportExamPackageToExcel(examPack: ExamPackage): void {
    const wb = XLSX.utils.book_new();
    const { metadata, matrix, specification, answerKeys } = examPack;

    // --- SHEET 1: MA TRẬN ĐỀ KIỂM TRA ---
    const matrixData = matrix.map((row) => {
      const getNum = (part: any, field: string): number => (part && part[field]) ? Number(part[field]) : 0;

      return {
        STT: row.stt,
        'Chủ đề / Mạch nội dung': cleanLatexForDocx(row.topic),
        'Đơn vị kiến thức': cleanLatexForDocx(row.subTopic),
        'Nhận biết (TN)': getNum(row.part1, 'remember') + getNum(row.part2, 'remember') + getNum(row.part3, 'remember'),
        'Nhận biết (TL)': getNum(row.part4, 'remember'),
        'Thông hiểu (TN)': getNum(row.part1, 'understand') + getNum(row.part2, 'understand') + getNum(row.part3, 'understand'),
        'Thông hiểu (TL)': getNum(row.part4, 'understand'),
        'Vận dụng (TN)': getNum(row.part1, 'apply') + getNum(row.part2, 'apply') + getNum(row.part3, 'apply'),
        'Vận dụng (TL)': getNum(row.part4, 'apply'),
        'Vận dụng cao (TN)': getNum(row.part1, 'advanced') + getNum(row.part2, 'advanced') + getNum(row.part3, 'advanced'),
        'Vận dụng cao (TL)': getNum(row.part4, 'advanced'),
        'Phần I (4 lựa chọn)': Object.values(row.part1).reduce((a, b) => a + Number(b || 0), 0),
        'Phần II (Đúng/Sai)': Object.values(row.part2).reduce((a, b) => a + Number(b || 0), 0),
        'Phần III (Trả lời ngắn)': Object.values(row.part3).reduce((a, b) => a + Number(b || 0), 0),
        'Phần IV (Tự luận)': Object.values(row.part4).reduce((a, b) => a + Number(b || 0), 0),
        'Tổng số câu': row.totalQuestions,
        'Tổng điểm': row.totalPoints,
        'Tỷ lệ %': `${row.percentage}%`,
      };
    });

    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Ma trận đề');

    // --- SHEET 2: BẢNG ĐẶC TẢ ---
    const primaryQuestions = examPack.exams[0]?.questions || [];
    const specData = specification.map((row, rowIdx) => {
      const details = getSpecRowQuestionDetails(row, rowIdx, specification, primaryQuestions);
      return {
        STT: row.stt,
        'Chủ đề / Đơn vị kiến thức': cleanLatexForDocx(row.topic),
        'Yêu cầu cần đạt': cleanLatexForDocx(row.requirements),
        'Số câu / Dạng câu': details.join('; '),
        'Điểm số': row.totalPoints,
      };
    });

    const wsSpec = XLSX.utils.json_to_sheet(specData);
    XLSX.utils.book_append_sheet(wb, wsSpec, 'Bảng đặc tả');

    // --- SHEET 3: BẢNG ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ ---
    const answersData: any[] = [];

    answerKeys.forEach((ak) => {
      ak.part1Answers.forEach((p1) => {
        answersData.push({
          'Mã đề': ak.code,
          'Phần': 'Phần I (TN 4 lựa chọn)',
          'Câu số': p1.questionNumber,
          'Đáp án': p1.correctOption,
          'Điểm': p1.points,
        });
      });

      ak.part2Answers.forEach((p2) => {
        const formatted = p2.statements
          .map((s) => `${s.key}:${s.isCorrect ? 'Đ' : 'S'}`)
          .join(', ');
        answersData.push({
          'Mã đề': ak.code,
          'Phần': 'Phần II (TN Đúng/Sai)',
          'Câu số': p2.questionNumber,
          'Đáp án': formatted,
          'Điểm': p2.points,
        });
      });

      ak.part3Answers.forEach((p3) => {
        answersData.push({
          'Mã đề': ak.code,
          'Phần': 'Phần III (TN Trả lời ngắn)',
          'Câu số': p3.questionNumber,
          'Đáp án': cleanLatexForDocx(p3.shortAnswer),
          'Điểm': p3.points,
        });
      });

      ak.part4Answers.forEach((p4) => {
        answersData.push({
          'Mã đề': ak.code,
          'Phần': 'Phần IV (Tự luận)',
          'Câu số': p4.questionNumber,
          'Đáp án': cleanLatexForDocx(p4.essayAnswerGuide),
          'Điểm': p4.points,
        });
      });
    });

    const wsAnswers = XLSX.utils.json_to_sheet(answersData);
    XLSX.utils.book_append_sheet(wb, wsAnswers, 'Bảng đáp án');

    const fileName = `Thong_Ke_De_${metadata.subject}_${metadata.grade}_7991.xlsx`;
    this.saveWorkbook(wb, fileName);
  }

  static exportAnswerKeysToExcel(examPack: ExamPackage): void {
    this.exportExamPackageToExcel(examPack);
  }

  /**
   * Xuất Ngân hàng câu hỏi ra file Excel
   */
  static exportQuestionBankToExcel(questions: QuestionBankItem[]): void {
    const wb = XLSX.utils.book_new();

    const qbData = questions.map((q, idx) => ({
      STT: idx + 1,
      ID: q.id,
      'Môn học': q.subject,
      'Khối lớp': q.grade,
      Chương: q.chapter,
      'Bộ sách': q.curriculum,
      'Dạng câu hỏi': q.partType,
      'Mức độ': q.cognitiveLevel,
      'Nội dung câu hỏi': cleanLatexForDocx(q.content),
      'Đáp án':
        q.partType === 'PART1'
          ? q.correctOption
          : q.partType === 'PART2'
          ? q.trueFalseStatements?.map((s) => `${s.key}:${s.isCorrect ? 'Đ' : 'S'}`).join('; ')
          : q.partType === 'PART3'
          ? cleanLatexForDocx(q.shortAnswer || '')
          : cleanLatexForDocx(q.essayAnswerGuide || ''),
      'Lời giải chi tiết': cleanLatexForDocx(q.explanation || ''),
      'Ngày tạo': q.createdDate,
    }));

    const wsQB = XLSX.utils.json_to_sheet(qbData);
    XLSX.utils.book_append_sheet(wb, wsQB, 'Ngân hàng câu hỏi');

    this.saveWorkbook(wb, `Ngan_Hang_Cau_Hoi_AI_Test_${Date.now()}.xlsx`);
  }

  /**
   * Xuất danh sách học sinh theo Lớp ra file Excel (.xlsx)
   */
  static exportStudentListToExcel(students: any[], className: string): void {
    if (!students || students.length === 0) {
      throw new Error('Danh sách học sinh trống, không có dữ liệu để xuất Excel.');
    }

    const data = students.map((s, idx) => ({
      'STT': idx + 1,
      'Số Báo Danh (SBD)': s.sbd || '',
      'Họ và Tên': s.name || '',
      'Giới tính': s.gender || 'Nam',
      'Ngày sinh': s.dob || '',
      'Lớp': s.className || className || '',
      'Khối': s.grade || '',
      'Trường': s.school || '',
      'Ghi Chú': s.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Thiết lập độ rộng cột chuẩn đẹp
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 18 }, // SBD
      { wch: 28 }, // Họ và Tên
      { wch: 12 }, // Giới tính
      { wch: 14 }, // Ngày sinh
      { wch: 12 }, // Lớp
      { wch: 12 }, // Khối
      { wch: 22 }, // Trường
      { wch: 25 }, // Ghi Chú
    ];

    // Tên Sheet trong Excel giới hạn tối đa 31 ký tự và cấm các ký tự: \ / ? * : [ ]
    const rawName = String(className || 'HS').replace(/[\/\\?*:[\]]/g, '_').trim();
    const safeSheetName = `Lop_${rawName}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    
    const cleanFileName = String(className || 'Chung')
      .replace(/[\/\\?*:[\]]/g, '-')
      .replace(/\s+/g, '_');
    const fileName = `Danh_Sach_Hoc_Sinh_Lop_${cleanFileName}.xlsx`;
    this.saveWorkbook(wb, fileName);
  }

  /**
   * Xuất kết quả bài thi của học sinh ra file Excel (.xlsx)
   * Đảm bảo xuất đúng theo thứ tự danh sách học sinh đã nhập vào (orderIndex/SBD/Tên)
   * Kèm cột Ghi Chú: hiện "Chưa làm" đối với các thí sinh chưa nộp bài.
   */
  static exportStudentResultsToExcel(
    items: {
      sbd?: string;
      studentName: string;
      studentClass: string;
      studentSchool?: string;
      examCode: string;
      score?: number | null;
      correctCount?: number | null;
      totalQuestions?: number | null;
      startTime?: string | null;
      submitTime?: string | null;
      durationMinutes?: number | null;
      tabSwitches?: number | null;
      status: 'submitted' | 'not_taken';
      notes?: string;
    }[],
    options: {
      examCode?: string;
      className?: string;
    } = {}
  ): void {
    if (!items || items.length === 0) {
      throw new Error('Không có dữ liệu kết quả học sinh để xuất Excel.');
    }

    const wb = XLSX.utils.book_new();

    const formatRow = (item: any, idx: number) => ({
      STT: idx + 1,
      'Số Báo Danh (SBD)': item.sbd || '',
      'Họ và Tên': item.studentName || '',
      Lớp: item.studentClass || '',
      Trường: item.studentSchool || '',
      'Mã Đề': item.examCode || options.examCode || '',
      'Điểm Số':
        item.status === 'submitted' && typeof item.score === 'number'
          ? Number(item.score.toFixed(2))
          : '',
      'Số Câu Đúng':
        item.status === 'submitted' && typeof item.correctCount === 'number'
          ? `${item.correctCount}/${item.totalQuestions || 0}`
          : '',
      'Thời Gian Làm (Phút)':
        item.status === 'submitted' && item.durationMinutes ? item.durationMinutes : '',
      'Thời Gian Nộp':
        item.status === 'submitted' && item.submitTime
          ? new Date(item.submitTime).toLocaleString('vi-VN')
          : '',
      'Cảnh Báo Chuyển Tab':
        item.status === 'submitted' ? item.tabSwitches || 0 : '',
      'Ghi Chú':
        item.status === 'not_taken'
          ? 'Chưa làm'
          : item.notes || 'Đã nộp bài',
    });

    const colsWidth = [
      { wch: 6 },  // STT
      { wch: 18 }, // Số Báo Danh (SBD)
      { wch: 28 }, // Họ và Tên
      { wch: 12 }, // Lớp
      { wch: 20 }, // Trường
      { wch: 14 }, // Mã Đề
      { wch: 10 }, // Điểm Số
      { wch: 14 }, // Số Câu Đúng
      { wch: 18 }, // Thời Gian Làm (Phút)
      { wch: 20 }, // Thời Gian Nộp
      { wch: 18 }, // Cảnh Báo Chuyển Tab
      { wch: 18 }, // Ghi Chú
    ];

    // 1. Sheet Tổng hợp toàn bộ
    const allData = items.map(formatRow);
    const wsAll = XLSX.utils.json_to_sheet(allData);
    wsAll['!cols'] = colsWidth;
    XLSX.utils.book_append_sheet(wb, wsAll, 'KetQua_TongHop');

    // 2. Nếu có nhiều lớp, tạo thêm từng Sheet cho từng lớp riêng biệt
    const classGroups: Record<string, typeof items> = {};
    items.forEach((it) => {
      const cName = it.studentClass || 'Khac';
      if (!classGroups[cName]) classGroups[cName] = [];
      classGroups[cName].push(it);
    });

    const classKeys = Object.keys(classGroups);
    if (classKeys.length > 1) {
      classKeys.forEach((cls) => {
        const clsData = classGroups[cls].map(formatRow);
        const wsCls = XLSX.utils.json_to_sheet(clsData);
        wsCls['!cols'] = colsWidth;
        const rawSheetName = String(cls).replace(/[\/\\?*:[\]]/g, '_').trim();
        const safeSheetName = `Lop_${rawSheetName}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, wsCls, safeSheetName);
      });
    }

    const cleanExam = String(options.examCode || 'TatCa')
      .replace(/[\/\\?*:[\]]/g, '-')
      .replace(/\s+/g, '_');
    const cleanClass = String(options.className || 'TatCaLop')
      .replace(/[\/\\?*:[\]]/g, '-')
      .replace(/\s+/g, '_');

    const fileName = `Ket_Qua_Thi_${cleanExam}_${cleanClass}.xlsx`;
    this.saveWorkbook(wb, fileName);
  }

  static saveWorkbook(wb: XLSX.WorkBook, fileName: string): void {
    try {
      // 1. Phương pháp Blob chuẩn cho mọi trình duyệt và iFrame sandbox
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 2000);
    } catch (e) {
      console.warn('Lỗi khi tải bằng Blob, chuyển sang XLSX.writeFile:', e);
      try {
        XLSX.writeFile(wb, fileName);
      } catch (e2) {
        console.error('Lỗi khi ghi file Excel:', e2);
        throw e2;
      }
    }
  }
}
