import { SpecRow } from '../types';

/**
 * Danh mục Năng lực đặc thù theo Chương trình GDPT 2018 cho từng môn học
 */
export const SUBJECT_COMPETENCIES: Record<string, string[]> = {
  Toán: [
    'Tư duy và lập luận toán học',
    'Mô hình hoá toán học',
    'Giải quyết vấn đề toán học',
    'Giao tiếp toán học',
    'Sử dụng công cụ, phương tiện toán học',
  ],
  KHTN: [
    'Nhận thức khoa học tự nhiên',
    'Tìm hiểu tự nhiên',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Vật lí': [
    'Nhận thức vật lí',
    'Tìm hiểu thế giới tự nhiên dưới góc độ vật lí',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Hóa học': [
    'Nhận thức hoá học',
    'Tìm hiểu thế giới tự nhiên dưới góc độ hoá học',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Sinh học': [
    'Nhận thức sinh học',
    'Tìm hiểu thế giới sống',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Ngữ văn': [
    'Năng lực ngôn ngữ (Đọc)',
    'Năng lực ngôn ngữ (Viết)',
    'Năng lực ngôn ngữ (Nói và nghe)',
    'Năng lực văn học',
  ],
  'Lịch sử và Địa lí': [
    'Nhận thức khoa học lịch sử và địa lí',
    'Tìm hiểu lịch sử và địa lí',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Lịch sử': [
    'Nhận thức khoa học lịch sử',
    'Tìm hiểu lịch sử',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Địa lí': [
    'Nhận thức khoa học địa lí',
    'Tìm hiểu địa lí',
    'Vận dụng kiến thức, kĩ năng đã học',
  ],
  'Tin học': [
    'Sử dụng và quản lý các phương tiện CNTT (NLa)',
    'Ứng xử phù hợp trong môi trường số (NLb)',
    'Giải quyết vấn đề với sự hỗ trợ của CNTT (NLc)',
    'Ứng dụng CNTT trong học và tự học (NLd)',
    'Hợp tác trong môi trường số (NLe)',
  ],
  'Tiếng Anh': [
    'Năng lực giao tiếp (Nghe)',
    'Năng lực giao tiếp (Nói)',
    'Năng lực giao tiếp (Đọc)',
    'Năng lực giao tiếp (Viết)',
    'Kiến thức ngôn ngữ',
  ],
  'GDCD / GDKT&PL': [
    'Điều chỉnh hành vi',
    'Phát triển bản thân',
    'Tìm hiểu và tham gia các hoạt động kinh tế - xã hội',
  ],
  'Công nghệ': [
    'Nhận thức công nghệ',
    'Giao tiếp công nghệ',
    'Sử dụng công nghệ',
    'Đánh giá công nghệ',
    'Thiết kế kĩ thuật',
  ],
};

/**
 * Chuẩn hóa và lấy Tên Đầy Đủ của năng lực đặc thù từ mã hoặc tên viết tắt
 */
export function getCompetencyFullName(raw?: string, subject: string = 'Toán'): string {
  if (!raw || raw.trim() === '' || raw === '-' || raw.includes('?')) {
    const list = SUBJECT_COMPETENCIES[subject] || SUBJECT_COMPETENCIES['Toán'];
    return list[0];
  }

  const clean = raw.trim();

  // Nếu đã là tên đầy đủ
  const subjectList = SUBJECT_COMPETENCIES[subject] || SUBJECT_COMPETENCIES['Toán'];
  const matched = subjectList.find((c) => c.toLowerCase() === clean.toLowerCase());
  if (matched) return matched;

  // Bản đồ ánh xạ mã viết tắt sang tên đầy đủ
  const codeMap: Record<string, string> = {
    // Toán
    nl_tdll: 'Tư duy và lập luận toán học',
    nl_tt: 'Tư duy và lập luận toán học',
    nl_mhh: 'Mô hình hoá toán học',
    nl_gqvđ: 'Giải quyết vấn đề toán học',
    nl_gqvd: 'Giải quyết vấn đề toán học',
    nl_gt: 'Giao tiếp toán học',
    nl_cc: 'Sử dụng công cụ, phương tiện toán học',
    nl_sdcc: 'Sử dụng công cụ, phương tiện toán học',
    'tư duy': 'Tư duy và lập luận toán học',
    'mô hình': 'Mô hình hoá toán học',
    'giải quyết vấn đề': 'Giải quyết vấn đề toán học',
    'giao tiếp': 'Giao tiếp toán học',

    // KHTN / Vật lí / Hoá học / Sinh học
    nl_nt: 'Nhận thức khoa học tự nhiên',
    nl_th: 'Tìm hiểu tự nhiên',
    nl_vd: 'Vận dụng kiến thức, kĩ năng đã học',
    'nhận thức': 'Nhận thức khoa học tự nhiên',
    'tìm hiểu': 'Tìm hiểu tự nhiên',
    'vận dụng': 'Vận dụng kiến thức, kĩ năng đã học',

    // Ngữ văn
    nl_doc: 'Năng lực ngôn ngữ (Đọc)',
    nl_viet: 'Năng lực ngôn ngữ (Viết)',
    nl_van: 'Năng lực văn học',

    // Tin học
    nla: 'Sử dụng và quản lý các phương tiện CNTT (NLa)',
    nlb: 'Ứng xử phù hợp trong môi trường số (NLb)',
    nlc: 'Giải quyết vấn đề với sự hỗ trợ của CNTT (NLc)',
    nld: 'Ứng dụng CNTT trong học và tự học (NLd)',
    nle: 'Hợp tác trong môi trường số (NLe)',
  };

  const lower = clean.toLowerCase().replace(/[\(\)⁶]/g, '').trim();
  if (codeMap[lower]) {
    return codeMap[lower];
  }

  // Nếu chuỗi chứa từ khóa
  if (lower.includes('mô hình') || lower.includes('mhh')) return 'Mô hình hoá toán học';
  if (lower.includes('giải quyết') || lower.includes('gqvđ') || lower.includes('gqvd')) return 'Giải quyết vấn đề toán học';
  if (lower.includes('giao tiếp')) return 'Giao tiếp toán học';
  if (lower.includes('công cụ') || lower.includes('phương tiện')) return 'Sử dụng công cụ, phương tiện toán học';
  if (lower.includes('tư duy') || lower.includes('lập luận') || lower.includes('tdll') || lower.includes('tt')) return 'Tư duy và lập luận toán học';

  if (lower.includes('nhận thức')) return 'Nhận thức khoa học tự nhiên';
  if (lower.includes('tìm hiểu')) return 'Tìm hiểu tự nhiên';

  return clean;
}

/**
 * Tự động đánh số câu hỏi và điền Tên Năng Lực Đặc Thù chuẩn cho từng ô trong Bản đặc tả
 */
export function autoAssignQuestionsAndCompetencies(
  specRows: SpecRow[],
  subject: string = 'Toán'
): SpecRow[] {
  let p1Counter = 1;
  let p2Counter = 1;
  let p3Counter = 1;
  let p4Counter = 1;

  const competencies = SUBJECT_COMPETENCIES[subject] || SUBJECT_COMPETENCIES['Toán'];

  return specRows.map((row) => {
    const updatedCellTexts: Record<string, string> = { ...(row.cellTexts || {}) };

    // Helper tạo label câu: "Câu 1" hoặc "Câu 1, 2" hoặc "Câu 7, 8, 9"
    const makeQuestionLabel = (start: number, count: number): string => {
      if (count === 1) return `Câu ${start}`;
      const numbers: number[] = [];
      for (let i = 0; i < count; i++) {
        numbers.push(start + i);
      }
      return `Câu ${numbers.join(', ')}`;
    };

    // 1. Phần I (Nhiều lựa chọn)
    const p1Rem = Number(row.part1?.remember || 0);
    const p1Und = Number(row.part1?.understand || 0);
    const p1App = Number(row.part1?.apply || 0) + Number(row.part1?.advanced || 0);

    if (p1Rem > 0) {
      const qLabel = makeQuestionLabel(p1Counter, p1Rem);
      p1Counter += p1Rem;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p1_rem = `${qLabel}\n(${nl})`;
    }
    if (p1Und > 0) {
      const qLabel = makeQuestionLabel(p1Counter, p1Und);
      p1Counter += p1Und;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p1_und = `${qLabel}\n(${nl})`;
    }
    if (p1App > 0) {
      const qLabel = makeQuestionLabel(p1Counter, p1App);
      p1Counter += p1App;
      const nl = competencies[2] || competencies[1] || 'Giải quyết vấn đề toán học';
      updatedCellTexts.p1_app = `${qLabel}\n(${nl})`;
    }

    // 2. Phần II (Đúng - Sai)
    const p2Rem = Number(row.part2?.remember || 0);
    const p2Und = Number(row.part2?.understand || 0);
    const p2App = Number(row.part2?.apply || 0) + Number(row.part2?.advanced || 0);

    if (p2Rem > 0) {
      const qLabel = makeQuestionLabel(p2Counter, p2Rem);
      p2Counter += p2Rem;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p2_rem = `${qLabel}\n(${nl})`;
    }
    if (p2Und > 0) {
      const qLabel = makeQuestionLabel(p2Counter, p2Und);
      p2Counter += p2Und;
      const nl = competencies[1] || competencies[0] || 'Mô hình hoá toán học';
      updatedCellTexts.p2_und = `${qLabel}\n(${nl})`;
    }
    if (p2App > 0) {
      const qLabel = makeQuestionLabel(p2Counter, p2App);
      p2Counter += p2App;
      const nl = competencies[2] || 'Giải quyết vấn đề toán học';
      updatedCellTexts.p2_app = `${qLabel}\n(${nl})`;
    }

    // 3. Phần III (Trả lời ngắn)
    const p3Rem = Number(row.part3?.remember || 0);
    const p3Und = Number(row.part3?.understand || 0);
    const p3App = Number(row.part3?.apply || 0) + Number(row.part3?.advanced || 0);

    if (p3Rem > 0) {
      const qLabel = makeQuestionLabel(p3Counter, p3Rem);
      p3Counter += p3Rem;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p3_rem = `${qLabel}\n(${nl})`;
    }
    if (p3Und > 0) {
      const qLabel = makeQuestionLabel(p3Counter, p3Und);
      p3Counter += p3Und;
      const nl = competencies[2] || competencies[0] || 'Giải quyết vấn đề toán học';
      updatedCellTexts.p3_und = `${qLabel}\n(${nl})`;
    }
    if (p3App > 0) {
      const qLabel = makeQuestionLabel(p3Counter, p3App);
      p3Counter += p3App;
      const nl = competencies[1] || competencies[2] || 'Mô hình hoá toán học';
      updatedCellTexts.p3_app = `${qLabel}\n(${nl})`;
    }

    // 4. Phần IV (Tự luận)
    const p4Rem = Number(row.part4?.remember || 0);
    const p4Und = Number(row.part4?.understand || 0);
    const p4App = Number(row.part4?.apply || 0) + Number(row.part4?.advanced || 0);

    if (p4Rem > 0) {
      const qLabel = makeQuestionLabel(p4Counter, p4Rem);
      p4Counter += p4Rem;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p4_rem = `${qLabel}\n(${nl})`;
    }
    if (p4Und > 0) {
      const qLabel = makeQuestionLabel(p4Counter, p4Und);
      p4Counter += p4Und;
      const nl = competencies[0] || 'Tư duy và lập luận toán học';
      updatedCellTexts.p4_und = `${qLabel}\n(${nl})`;
    }
    if (p4App > 0) {
      const qLabel = makeQuestionLabel(p4Counter, p4App);
      p4Counter += p4App;
      const nl = competencies[2] || 'Giải quyết vấn đề toán học';
      updatedCellTexts.p4_app = `${qLabel}\n(${nl})`;
    }

    return {
      ...row,
      cellTexts: updatedCellTexts,
      competency: getCompetencyFullName(row.competency, subject),
    };
  });
}
