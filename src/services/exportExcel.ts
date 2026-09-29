import * as XLSX from 'xlsx';
import { ExamPackage, QuestionBankItem, getSpecRowQuestionDetails } from '../types';
import { cleanLatexForDocx } from './exportDocx';
import { getCompetencyFullName } from '../utils/competencies';

export class ExportExcel {
  /**
   * Xuất gói đề thi (Ma trận, Đặc tả, Bảng Đáp án) ra Workbook Excel (.xlsx)
   */
  static exportExamPackageToExcel(examPack: ExamPackage): void {
    const wb = XLSX.utils.book_new();
    const { metadata, matrix, specification, answerKeys } = examPack;

    // --- SHEET 1: 1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ ---
    const getBiết = (part: any): number => (part && part.remember ? Number(part.remember) : 0);
    const getHiểu = (part: any): number => (part && part.understand ? Number(part.understand) : 0);
    const getVậnDụng = (part: any): number =>
      (part && part.apply ? Number(part.apply) : 0) + (part && part.advanced ? Number(part.advanced) : 0);

    const matrixData = matrix.map((row) => {
      const p1Biết = getBiết(row.part1);
      const p1Hiểu = getHiểu(row.part1);
      const p1VậnDụng = getVậnDụng(row.part1);

      const p2Biết = getBiết(row.part2);
      const p2Hiểu = getHiểu(row.part2);
      const p2VậnDụng = getVậnDụng(row.part2);

      const p3Biết = getBiết(row.part3);
      const p3Hiểu = getHiểu(row.part3);
      const p3VậnDụng = getVậnDụng(row.part3);

      const p4Biết = getBiết(row.part4);
      const p4Hiểu = getHiểu(row.part4);
      const p4VậnDụng = getVậnDụng(row.part4);

      const rowBiết = p1Biết + p2Biết + p3Biết + p4Biết;
      const rowHiểu = p1Hiểu + p2Hiểu + p3Hiểu + p4Hiểu;
      const rowVậnDụng = p1VậnDụng + p2VậnDụng + p3VậnDụng + p4VậnDụng;

      return {
        TT: row.stt,
        'Chủ đề/Chương': cleanLatexForDocx(row.topic),
        'Nội dung/đơn vị kiến thức': cleanLatexForDocx(row.subTopic),
        'Nhiều lựa chọn (Biết)': row.cellTexts?.p1_rem || (p1Biết > 0 ? p1Biết : ''),
        'Nhiều lựa chọn (Hiểu)': row.cellTexts?.p1_und || (p1Hiểu > 0 ? p1Hiểu : ''),
        'Nhiều lựa chọn (Vận dụng)': row.cellTexts?.p1_app || (p1VậnDụng > 0 ? p1VậnDụng : ''),
        '“Đúng – Sai”² (Biết)': row.cellTexts?.p2_rem || (p2Biết > 0 ? p2Biết : ''),
        '“Đúng – Sai”² (Hiểu)': row.cellTexts?.p2_und || (p2Hiểu > 0 ? p2Hiểu : ''),
        '“Đúng – Sai”² (Vận dụng)': row.cellTexts?.p2_app || (p2VậnDụng > 0 ? p2VậnDụng : ''),
        'Trả lời ngắn³ (Biết)': row.cellTexts?.p3_rem || (p3Biết > 0 ? p3Biết : ''),
        'Trả lời ngắn³ (Hiểu)': row.cellTexts?.p3_und || (p3Hiểu > 0 ? p3Hiểu : ''),
        'Trả lời ngắn³ (Vận dụng)': row.cellTexts?.p3_app || (p3VậnDụng > 0 ? p3VậnDụng : ''),
        'Tự luận (Biết)': row.cellTexts?.p4_rem || (p4Biết > 0 ? p4Biết : ''),
        'Tự luận (Hiểu)': row.cellTexts?.p4_und || (p4Hiểu > 0 ? p4Hiểu : ''),
        'Tự luận (Vận dụng)': row.cellTexts?.p4_app || (p4VậnDụng > 0 ? p4VậnDụng : ''),
        'Tổng (Biết)': rowBiết > 0 ? rowBiết : '',
        'Tổng (Hiểu)': rowHiểu > 0 ? rowHiểu : '',
        'Tổng (Vận dụng)': rowVậnDụng > 0 ? rowVậnDụng : '',
        'Tỉ lệ % điểm': row.percentage ? `${row.percentage}%` : '',
      };
    });

    // Summary footer rows for Excel Sheet 1
    const totalP1 = matrix.reduce((acc, r) => acc + getBiết(r.part1) + getHiểu(r.part1) + getVậnDụng(r.part1), 0);
    const totalP2 = matrix.reduce((acc, r) => acc + getBiết(r.part2) + getHiểu(r.part2) + getVậnDụng(r.part2), 0);
    const totalP3 = matrix.reduce((acc, r) => acc + getBiết(r.part3) + getHiểu(r.part3) + getVậnDụng(r.part3), 0);
    const totalP4 = matrix.reduce((acc, r) => acc + getBiết(r.part4) + getHiểu(r.part4) + getVậnDụng(r.part4), 0);

    const totalBiếtAll = matrix.reduce((acc, r) => acc + getBiết(r.part1) + getBiết(r.part2) + getBiết(r.part3) + getBiết(r.part4), 0);
    const totalHiểuAll = matrix.reduce((acc, r) => acc + getHiểu(r.part1) + getHiểu(r.part2) + getHiểu(r.part3) + getHiểu(r.part4), 0);
    const totalVậnDụngAll = matrix.reduce((acc, r) => acc + getVậnDụng(r.part1) + getVậnDụng(r.part2) + getVậnDụng(r.part3) + getVậnDụng(r.part4), 0);

    matrixData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tổng số câu',
      'Nội dung/đơn vị kiến thức': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': (totalP1 > 0 ? totalP1 : 12) as any,
      '“Đúng – Sai”² (Biết)': '' as any,
      '“Đúng – Sai”² (Hiểu)': '' as any,
      '“Đúng – Sai”² (Vận dụng)': (totalP2 > 0 ? totalP2 : 2) as any,
      'Trả lời ngắn³ (Biết)': '' as any,
      'Trả lời ngắn³ (Hiểu)': '' as any,
      'Trả lời ngắn³ (Vận dụng)': (totalP3 > 0 ? totalP3 : 4) as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': (totalP4 > 0 ? totalP4 : 2) as any,
      'Tổng (Biết)': (totalBiếtAll > 0 ? totalBiếtAll : 9) as any,
      'Tổng (Hiểu)': (totalHiểuAll > 0 ? totalHiểuAll : 6) as any,
      'Tổng (Vận dụng)': (totalVậnDụngAll > 0 ? totalVậnDụngAll : 5) as any,
      'Tỉ lệ % điểm': '' as any,
    });

    matrixData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tổng số điểm',
      'Nội dung/đơn vị kiến thức': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': '3,0⁵' as any,
      '“Đúng – Sai”² (Biết)': '' as any,
      '“Đúng – Sai”² (Hiểu)': '' as any,
      '“Đúng – Sai”² (Vận dụng)': '2,0' as any,
      'Trả lời ngắn³ (Biết)': '' as any,
      'Trả lời ngắn³ (Hiểu)': '' as any,
      'Trả lời ngắn³ (Vận dụng)': '2,0' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '3,0' as any,
      'Tổng (Biết)': '4,0' as any,
      'Tổng (Hiểu)': '3,0' as any,
      'Tổng (Vận dụng)': '3,0' as any,
      'Tỉ lệ % điểm': '10,0' as any,
    });

    matrixData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tỉ lệ %',
      'Nội dung/đơn vị kiến thức': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': '30' as any,
      '“Đúng – Sai”² (Biết)': '' as any,
      '“Đúng – Sai”² (Hiểu)': '' as any,
      '“Đúng – Sai”² (Vận dụng)': '20' as any,
      'Trả lời ngắn³ (Biết)': '' as any,
      'Trả lời ngắn³ (Hiểu)': '' as any,
      'Trả lời ngắn³ (Vận dụng)': '20' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '30' as any,
      'Tổng (Biết)': '40' as any,
      'Tổng (Hiểu)': '30' as any,
      'Tổng (Vận dụng)': '30' as any,
      'Tỉ lệ % điểm': '100%' as any,
    });

    // Footnotes row
    matrixData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'GHI CHÚ CHÂN TRANG MA TRẬN:',
      'Nội dung/đơn vị kiến thức': '² Mỗi câu hỏi bao gồm 4 ý nhỏ, mỗi ý học sinh phải chọn đúng hoặc sai.',
      'Nhiều lựa chọn (Biết)': '³ Đối với môn học không sử dụng dạng này thì chuyển toàn bộ số điểm cho dạng “Đúng – Sai”.' as any,
      'Nhiều lựa chọn (Hiểu)': '⁴ Có ở trong một số ô của ma trận, thể hiện số câu hỏi hoặc câu hỏi số bao nhiêu.' as any,
      'Nhiều lựa chọn (Vận dụng)': '⁵ Lựa chọn sao cho được khoảng 3,0 điểm, tương ứng với tỉ lệ khoảng 30%; tương tự như thế đối với các dạng khác.' as any,
      '“Đúng – Sai”² (Biết)': '' as any,
      '“Đúng – Sai”² (Hiểu)': '' as any,
      '“Đúng – Sai”² (Vận dụng)': '' as any,
      'Trả lời ngắn³ (Biết)': '' as any,
      'Trả lời ngắn³ (Hiểu)': '' as any,
      'Trả lời ngắn³ (Vận dụng)': '' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '' as any,
      'Tổng (Biết)': '' as any,
      'Tổng (Hiểu)': '' as any,
      'Tổng (Vận dụng)': '' as any,
      'Tỉ lệ % điểm': '' as any,
    });

    const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, '1. Ma trận đề');

    // --- SHEET 2: 2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ ---
    const specData = specification.map((row) => {
      const p1Biết = getBiết(row.part1);
      const p1Hiểu = getHiểu(row.part1);
      const p1VậnDụng = getVậnDụng(row.part1);

      const p2Biết = getBiết(row.part2);
      const p2Hiểu = getHiểu(row.part2);
      const p2VậnDụng = getVậnDụng(row.part2);

      const p3Biết = getBiết(row.part3);
      const p3Hiểu = getHiểu(row.part3);
      const p3VậnDụng = getVậnDụng(row.part3);

      const p4Biết = getBiết(row.part4);
      const p4Hiểu = getHiểu(row.part4);
      const p4VậnDụng = getVậnDụng(row.part4);

      return {
        TT: row.stt,
        'Chủ đề/Chương': cleanLatexForDocx(row.topic),
        'Nội dung/đơn vị kiến thức': cleanLatexForDocx(row.subTopic),
        'Yêu cầu cần đạt': cleanLatexForDocx(row.requirements),
        'Nhiều lựa chọn (Biết)': row.cellTexts?.p1_rem || (p1Biết > 0 ? `${p1Biết === 1 ? '1 câu' : `${p1Biết} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Nhiều lựa chọn (Hiểu)': row.cellTexts?.p1_und || (p1Hiểu > 0 ? `${p1Hiểu === 1 ? '1 câu' : `${p1Hiểu} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Nhiều lựa chọn (Vận dụng)': row.cellTexts?.p1_app || (p1VậnDụng > 0 ? `${p1VậnDụng === 1 ? '1 câu' : `${p1VậnDụng} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        '“Đúng – Sai” (Biết)': row.cellTexts?.p2_rem || (p2Biết > 0 ? `${p2Biết === 1 ? '1 câu' : `${p2Biết} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        '“Đúng – Sai” (Hiểu)': row.cellTexts?.p2_und || (p2Hiểu > 0 ? `${p2Hiểu === 1 ? '1 câu' : `${p2Hiểu} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        '“Đúng – Sai” (Vận dụng)': row.cellTexts?.p2_app || (p2VậnDụng > 0 ? `${p2VậnDụng === 1 ? '1 câu' : `${p2VậnDụng} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Trả lời ngắn (Biết)': row.cellTexts?.p3_rem || (p3Biết > 0 ? `${p3Biết === 1 ? '1 câu' : `${p3Biết} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Trả lời ngắn (Hiểu)': row.cellTexts?.p3_und || (p3Hiểu > 0 ? `${p3Hiểu === 1 ? '1 câu' : `${p3Hiểu} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Trả lời ngắn (Vận dụng)': row.cellTexts?.p3_app || (p3VậnDụng > 0 ? `${p3VậnDụng === 1 ? '1 câu' : `${p3VậnDụng} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Tự luận (Biết)': row.cellTexts?.p4_rem || (p4Biết > 0 ? `${p4Biết === 1 ? '1 câu' : `${p4Biết} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Tự luận (Hiểu)': row.cellTexts?.p4_und || (p4Hiểu > 0 ? `${p4Hiểu === 1 ? '1 câu' : `${p4Hiểu} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
        'Tự luận (Vận dụng)': row.cellTexts?.p4_app || (p4VậnDụng > 0 ? `${p4VậnDụng === 1 ? '1 câu' : `${p4VậnDụng} câu`}\n(${getCompetencyFullName(row.competency, metadata.subject)})` : ''),
      };
    });

    specData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tổng số câu',
      'Nội dung/đơn vị kiến thức': '',
      'Yêu cầu cần đạt': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': (totalP1 > 0 ? totalP1 : 12) as any,
      '“Đúng – Sai” (Biết)': '' as any,
      '“Đúng – Sai” (Hiểu)': '' as any,
      '“Đúng – Sai” (Vận dụng)': (totalP2 > 0 ? totalP2 : 2) as any,
      'Trả lời ngắn (Biết)': '' as any,
      'Trả lời ngắn (Hiểu)': '' as any,
      'Trả lời ngắn (Vận dụng)': (totalP3 > 0 ? totalP3 : 4) as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': (totalP4 > 0 ? totalP4 : 2) as any,
    });

    specData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tổng số điểm',
      'Nội dung/đơn vị kiến thức': '',
      'Yêu cầu cần đạt': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': '3,0' as any,
      '“Đúng – Sai” (Biết)': '' as any,
      '“Đúng – Sai” (Hiểu)': '' as any,
      '“Đúng – Sai” (Vận dụng)': '2,0' as any,
      'Trả lời ngắn (Biết)': '' as any,
      'Trả lời ngắn (Hiểu)': '' as any,
      'Trả lời ngắn (Vận dụng)': '2,0' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '3,0' as any,
    });

    specData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'Tỉ lệ %',
      'Nội dung/đơn vị kiến thức': '',
      'Yêu cầu cần đạt': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': '30' as any,
      '“Đúng – Sai” (Biết)': '' as any,
      '“Đúng – Sai” (Hiểu)': '' as any,
      '“Đúng – Sai” (Vận dụng)': '20' as any,
      'Trả lời ngắn (Biết)': '' as any,
      'Trả lời ngắn (Hiểu)': '' as any,
      'Trả lời ngắn (Vận dụng)': '20' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '30' as any,
    });

    specData.push({
      TT: '' as any,
      'Chủ đề/Chương': 'GHI CHÚ CHÂN TRANG ĐẶC TẢ:',
      'Nội dung/đơn vị kiến thức': '⁶ Có ở trong một số ô của bản đặc tả, ghi tắt tên của năng lực (đã được quy định trong chương trình môn học/hoạt động giáo dục).',
      'Yêu cầu cần đạt': '',
      'Nhiều lựa chọn (Biết)': '' as any,
      'Nhiều lựa chọn (Hiểu)': '' as any,
      'Nhiều lựa chọn (Vận dụng)': '' as any,
      '“Đúng – Sai” (Biết)': '' as any,
      '“Đúng – Sai” (Hiểu)': '' as any,
      '“Đúng – Sai” (Vận dụng)': '' as any,
      'Trả lời ngắn (Biết)': '' as any,
      'Trả lời ngắn (Hiểu)': '' as any,
      'Trả lời ngắn (Vận dụng)': '' as any,
      'Tự luận (Biết)': '' as any,
      'Tự luận (Hiểu)': '' as any,
      'Tự luận (Vận dụng)': '' as any,
    });

    const wsSpec = XLSX.utils.json_to_sheet(specData);
    XLSX.utils.book_append_sheet(wb, wsSpec, '2. Bản đặc tả');

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
