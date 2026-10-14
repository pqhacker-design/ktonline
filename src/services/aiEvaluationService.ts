import { callGeminiApi } from './geminiClient';
import * as XLSX from 'xlsx';
import { ExportExcel } from './exportExcel';

export type EvaluationTone = 'pedagogical' | 'concise' | 'in_depth';

export interface StudentEvaluationData {
  id: string; // unique key (sbd or student id or result id)
  studentName: string;
  studentClass: string;
  sbd?: string;
  examCode: string;
  subject: string;
  grade?: string;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  durationMinutes?: number;
  tabSwitches?: number;
  classification: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Chưa làm bài';
  strengths: string[];
  weaknesses: string[];
  comment: string; // Nhận xét của AI
  advice: string; // Lời khuyên của AI cho từng HS
  generatedAt: string;
  isCustomEdited?: boolean;
}

export interface StudentResultForEvaluation {
  id: string;
  sbd: string;
  studentName: string;
  studentClass: string;
  examCode: string;
  status: 'submitted' | 'not_taken';
  score?: number;
  correctCount?: number;
  incorrectCount?: number;
  totalQuestions?: number;
  durationMinutes?: number;
  tabSwitches?: number;
  detailedGrading?: any[];
  activityLogs?: any[];
}

export interface ClassSubjectExamSummary {
  subject: string;
  className: string;
  examCode: string;
  examTitle?: string;
  grade?: string;
  duration?: number;
}

export class AiEvaluationService {
  private static getStorageKey(className: string, subject: string, examCode: string): string {
    const c = (className || 'all').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const s = (subject || 'all').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const e = (examCode || 'all').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return `aitest_ai_evaluations_${c}_${s}_${e}`;
  }

  public static loadSavedEvaluations(
    className: string,
    subject: string,
    examCode: string
  ): Record<string, StudentEvaluationData> {
    try {
      const key = this.getStorageKey(className, subject, examCode);
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Lỗi khi đọc đánh giá đã lưu:', e);
    }
    return {};
  }

  public static saveEvaluations(
    className: string,
    subject: string,
    examCode: string,
    evaluations: Record<string, StudentEvaluationData>
  ): void {
    try {
      const key = this.getStorageKey(className, subject, examCode);
      localStorage.setItem(key, JSON.stringify(evaluations));
    } catch (e) {
      console.warn('Lỗi khi lưu đánh giá:', e);
    }
  }

  /**
   * Phân loại học lực theo điểm số thang điểm 10
   */
  public static getClassification(score?: number, status: string = 'submitted'): StudentEvaluationData['classification'] {
    if (status === 'not_taken' || score === undefined || score === null) {
      return 'Chưa làm bài';
    }
    if (score >= 9.0) return 'Xuất sắc';
    if (score >= 8.0) return 'Giỏi';
    if (score >= 6.5) return 'Khá';
    if (score >= 5.0) return 'Trung bình';
    return 'Yếu';
  }

  /**
   * Sinh nhận xét và lời khuyên chuẩn sư phạm theo quy tắc tức thời (Dùng làm nền tảng hoặc dự phòng offline)
   */
  public static generateRuleBasedEvaluation(
    student: StudentResultForEvaluation,
    summary: ClassSubjectExamSummary,
    tone: EvaluationTone = 'pedagogical'
  ): StudentEvaluationData {
    const classification = this.getClassification(student.score, student.status);
    const subject = summary.subject || 'Môn học';
    const score = student.score ?? 0;
    const dur = student.durationMinutes ?? 0;
    const tabSwitches = student.tabSwitches ?? 0;
    const correct = student.correctCount ?? 0;
    const total = student.totalQuestions ?? 0;

    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let comment = '';
    let advice = '';

    if (student.status === 'not_taken') {
      strengths = [];
      weaknesses = ['Chưa tham gia đợt kiểm tra trực tuyến'];
      comment = `Học sinh chưa hoàn thành bài kiểm tra môn ${subject}. Cần xác nhận lại lý do vắng mặt.`;
      advice = `Đề nghị em chủ động liên hệ giáo viên bộ môn để đăng ký làm bài bổ sung hoặc ôn tập lại kiến thức kịp thời.`;
    } else if (classification === 'Xuất sắc') {
      strengths = [
        `Nắm rất vững toàn diện kiến thức môn ${subject}`,
        `Kỹ năng giải bài vận dụng và vận dụng cao tốt, tư duy chuẩn xác`,
        `Tốc độ làm bài hợp lý (${dur} phút), làm chủ kiến thức`,
      ];
      weaknesses = ['Cần duy trì sự ổn định ở các đề thi có tính thực tiễn cao'];
      if (tone === 'concise') {
        comment = `Kết quả xuất sắc (${score.toFixed(1)}đ, đúng ${correct}/${total} câu). Nắm vững toàn bộ kiến thức môn ${subject}.`;
        advice = `Tiếp tục phát huy phong độ, thử sức với các bài toán mở rộng và chuyên đề chuyên sâu.`;
      } else if (tone === 'in_depth') {
        comment = `Học sinh đạt thành tích xuất sắc (${score.toFixed(1)}/10đ). Khả năng tiếp thu và vận dụng kiến thức môn ${subject} rất vượt trội, hoàn thành chính xác hầu hết các dạng bài từ nhận biết, thông hiểu đến vận dụng phân hóa. Thái độ làm bài tập trung, nghiêm túc.`;
        advice = `Khuyến khích em tham gia đội tuyển học sinh giỏi hoặc tìm hiểu các bài toán thực tế nâng cao. Chú ý giữ vững tâm lý và rèn luyện kỹ năng giải nhanh để tối ưu hóa thời gian hơn nữa.`;
      } else {
        comment = `Em đã có một bài làm xuất sắc (${score.toFixed(1)}đ)! Kiến thức môn ${subject} rất vững vàng, tư duy logic nhanh nhạy và làm bài rất cẩn thận.`;
        advice = `Chúc mừng em! Hãy tiếp tục duy trì niềm say mê học tập, rèn luyện thêm các chuyên đề nâng cao và hỗ trợ các bạn trong lớp cùng tiến bộ.`;
      }
    } else if (classification === 'Giỏi') {
      strengths = [
        `Nắm chắc các kiến thức cốt lõi và phương pháp giải cơ bản`,
        `Hoàn thành tốt các câu hỏi trắc nghiệm nhiều lựa chọn`,
        `Thời gian làm bài phù hợp (${dur} phút)`,
      ];
      weaknesses = [
        `Còn nhầm lẫn ở một vài chi tiết nhỏ hoặc câu hỏi phân hóa`,
        `Cần tăng cường rèn luyện câu hỏi đúng/sai hoặc trả lời ngắn`,
      ];
      if (tone === 'concise') {
        comment = `Kết quả tốt (${score.toFixed(1)}đ, đúng ${correct}/${total} câu). Nắm vững kiến thức trọng tâm môn ${subject}.`;
        advice = `Rà soát kỹ các câu sai ở mức độ vận dụng để đạt mức điểm xuất sắc trong bài tới.`;
      } else if (tone === 'in_depth') {
        comment = `Học sinh nắm chắc lý thuyết và kỹ năng giải toán cơ bản đến khá (${score.toFixed(1)}/10đ). Các câu hỏi nhận biết và thông hiểu giải quyết nhanh gọn. Một vài câu hỏi dạng vận dụng cao còn mất điểm do chưa đọc kỹ yêu cầu hoặc xử lý biến đổi chưa tối ưu.`;
        advice = `Cần luyện thêm kỹ năng đọc hiểu dữ kiện đề bài, tập trung ôn các câu hỏi phân loại và kiểm tra lại bài làm 5-10 phút trước khi nộp.`;
      } else {
        comment = `Bài làm rất tốt (${score.toFixed(1)}đ)! Em đã hiểu sâu bài học môn ${subject} và giải quyết tốt các dạng bài trọng tâm của chương trình.`;
        advice = `Em chỉ cần cẩn thận hơn một chút ở những câu hỏi bẫy hoặc vận dụng cao là sẽ chạm mốc điểm tối đa. Cố gắng phát huy nhé!`;
      }
    } else if (classification === 'Khá') {
      strengths = [
        `Hiểu và nắm được các khái niệm cơ bản môn ${subject}`,
        `Có ý thức cố gắng hoàn thành bài kiểm tra`,
      ];
      weaknesses = [
        `Kiến thức ở phần vận dụng chưa thực sự chắc chắn`,
        `Dễ mất điểm ở các câu hỏi lý thuyết mở rộng hoặc câu hỏi đúng/sai`,
      ];
      if (tone === 'concise') {
        comment = `Đạt kết quả khá (${score.toFixed(1)}đ, đúng ${correct}/${total} câu). Nắm được kiến thức cơ bản.`;
        advice = `Tăng cường luyện tập các bài tập vận dụng và củng cố lại lý thuyết để nâng cao điểm số.`;
      } else if (tone === 'in_depth') {
        comment = `Học sinh đạt mức Khá (${score.toFixed(1)}/10đ). Nắm được các kiến thức chuẩn cơ bản nhưng kỹ năng vận dụng còn lúng túng. Tỷ lệ đúng ở phần câu hỏi thông hiểu tốt, nhưng ở các phần câu hỏi tổng hợp còn có sai sót do chưa nắm vững bản chất.`;
        advice = `Khuyên học sinh lập sơ đồ tư duy hệ thống lại công thức, làm lại các bài tập sai trong bài kiểm tra này và chủ động trao đổi với giáo viên các phần chưa rõ.`;
      } else {
        comment = `Em đã có nhiều nỗ lực và đạt kết quả khá (${score.toFixed(1)}đ). Em nắm được các nội dung trọng tâm của môn học.`;
        advice = `Để bứt phá lên mức Giỏi, em nên dành thêm thời gian tự học, rèn thói quen ghi chú những lỗi sai thường gặp và làm thêm các dạng bài tập đa dạng hơn.`;
      }
    } else if (classification === 'Trung bình') {
      strengths = [
        `Hoàn thành bài kiểm tra đúng thời gian quy định`,
        `Nắm được một số khái niệm nhận biết đơn giản`,
      ];
      weaknesses = [
        `Kiến thức nền tảng môn ${subject} còn bị hổng nhiều chỗ`,
        `Kỹ năng tính toán và suy luận còn chậm, dễ bị nhầm lẫn công thức`,
      ];
      if (tone === 'concise') {
        comment = `Kết quả trung bình (${score.toFixed(1)}đ, đúng ${correct}/${total} câu). Cần củng cố lại kiến thức nền tảng.`;
        advice = `Cần chăm chú nghe giảng trên lớp và làm bài tập về nhà đầy đủ hơn.`;
      } else if (tone === 'in_depth') {
        comment = `Học sinh chỉ mới đạt mức trung bình (${score.toFixed(1)}/10đ). Tỷ lệ sai sót khá cao ngay cả ở phần câu hỏi thông hiểu. Khả năng ghi nhớ và áp dụng định lý, công thức môn ${subject} còn yếu.`;
        advice = `Cần có kế hoạch ôn tập lại toàn bộ kiến thức chương đã học. Giáo viên đề nghị học sinh làm lại các bài tập cơ bản trong SGK và nhờ các bạn khá giỏi hỗ trợ kèm cặp thêm.`;
      } else {
        comment = `Bài làm của em đạt mức trung bình (${score.toFixed(1)}đ). Em có cố gắng nhưng chưa thực sự nắm chắc bài học môn ${subject}.`;
        advice = `Đừng nản lòng nhé! Em hãy bắt đầu củng cố lại từ những bài tập cơ bản nhất, tập trung nghe giảng trên lớp và mạnh dạn hỏi thầy cô khi chưa hiểu bài. Chắc chắn em sẽ tiến bộ hơn!`;
      }
    } else {
      // Yếu
      strengths = [`Đã tham gia làm bài kiểm tra`];
      weaknesses = [
        `Lỗ hổng kiến thức môn ${subject} khá lớn`,
        `Chưa nắm được các công thức và quy tắc cơ bản`,
        `Cần cải thiện thái độ và phương pháp học tập`,
      ];
      if (tone === 'concise') {
        comment = `Kết quả chưa đạt (${score.toFixed(1)}đ, đúng ${correct}/${total} câu). Hổng nhiều kiến thức môn ${subject}.`;
        advice = `Cần tham gia các buổi phụ đạo và ôn tập lại toàn bộ kiến thức căn bản từ đầu.`;
      } else if (tone === 'in_depth') {
        comment = `Kết quả kiểm tra ở mức Yếu (${score.toFixed(1)}/10đ). Học sinh chưa đáp ứng yêu cầu cần đạt của chuẩn chương trình môn học. Số câu trả lời đúng rất thấp, cho thấy học sinh gặp khó khăn trong việc tiếp thu bài giảng.`;
        advice = `Đề nghị giáo viên bộ môn và phụ huynh phối hợp chặt chẽ. Học sinh cần học phụ đạo tăng cường, học lại lý thuyết cốt lõi và hoàn thành các bài tập bổ trợ có hướng dẫn chi tiết.`;
      } else {
        comment = `Kết quả kiểm tra lần này của em chưa được như kỳ vọng (${score.toFixed(1)}đ). Em còn gặp nhiều khó khăn ở môn ${subject}.`;
        advice = `Thầy cô luôn sẵn sàng giúp đỡ em. Hãy lên lịch ôn tập lại từ những kiến thức căn bản nhất, chia nhỏ bài học mỗi ngày và kiên trì rèn luyện, em sẽ vượt qua khó khăn này!`;
      }
    }

    if (tabSwitches >= 3) {
      weaknesses.push(`Có ${tabSwitches} lần chuyển tab trong khi làm bài trực tuyến`);
      comment += ` Lưu ý: Hệ thống ghi nhận em có ${tabSwitches} lần rời khỏi màn hình thi, cần tập trung và nghiêm túc hơn.`;
      advice += ` Khi thi trực tuyến, hãy tắt hết các ứng dụng khác để bài làm được công nhận trung thực nhất.`;
    }

    return {
      id: student.sbd || student.id,
      studentName: student.studentName,
      studentClass: student.studentClass,
      sbd: student.sbd,
      examCode: summary.examCode || student.examCode,
      subject: summary.subject,
      grade: summary.grade,
      score: student.score,
      correctCount: student.correctCount,
      totalQuestions: student.totalQuestions,
      durationMinutes: student.durationMinutes,
      tabSwitches: student.tabSwitches,
      classification,
      strengths,
      weaknesses,
      comment,
      advice,
      generatedAt: new Date().toISOString(),
      isCustomEdited: false,
    };
  }

  /**
   * Gọi AI Gemini 3.8 Flash để đánh giá cá nhân một học sinh dựa trên toàn bộ dữ liệu kết quả bài thi
   */
  public static async generateAiEvaluationForStudent(
    student: StudentResultForEvaluation,
    summary: ClassSubjectExamSummary,
    tone: EvaluationTone = 'pedagogical',
    customApiKey?: string
  ): Promise<StudentEvaluationData> {
    const fallback = this.generateRuleBasedEvaluation(student, summary, tone);
    if (student.status === 'not_taken') {
      return fallback;
    }

    const wrongQuestionsSummary = (student.detailedGrading || [])
      .filter((g) => !g.isCorrect)
      .slice(0, 8)
      .map((g, idx) => `Câu ${g.questionNumber || idx + 1} (${g.partType || 'TN'}): ${g.content ? g.content.slice(0, 100) : ''}`)
      .join('\n');

    const toneDescription =
      tone === 'concise'
        ? 'Phong cách: Súc tích, cô đọng, ngắn gọn (2-3 câu mỗi mục), phù hợp nhập vào sổ liên lạc điện tử / Zalo gửi phụ huynh.'
        : tone === 'in_depth'
        ? 'Phong cách: Phân tích học thuật chuyên sâu, nêu rõ dạng toán, lỗ hổng kiến thức, kỹ năng giải quyết vấn đề và chiến lược bứt phá.'
        : 'Phong cách: Sư phạm nhân văn, khích lệ động viên, phân tích rõ ưu điểm, chỉ ra điểm cần khắc phục và định hướng phương pháp học tập.';

    const prompt = `Bạn là một chuyên gia giáo dục và giáo viên bộ môn ${summary.subject || 'Toán học'} giàu kinh nghiệm tại Việt Nam theo Chương trình GDPT 2018 (Thông tư 22/BGDĐT).
Hãy phân tích kết quả bài kiểm tra trực tuyến của học sinh và đưa ra ĐÁNH GIÁ KẾT QUẢ, NHẬN XÉT CHI TIẾT và LỜI KHUYÊN CHO TỪNG HỌC SINH.

THÔNG TIN BÀI KIỂM TRA:
- Môn học: ${summary.subject}
- Khối lớp: ${summary.grade || 'THCS/THPT'}
- Tên đề thi: ${summary.examTitle || 'Kiểm tra đánh giá'}
- Mã đề: ${summary.examCode}

KẾT QUẢ CỦA HỌC SINH:
- Họ và tên: ${student.studentName}
- Lớp: ${student.studentClass}
- Số báo danh (SBD): ${student.sbd || 'Không có'}
- Điểm số: ${student.score?.toFixed(2)} / 10.0
- Số câu làm đúng: ${student.correctCount} / ${student.totalQuestions}
- Thời gian hoàn thành: ${student.durationMinutes} phút
- Số lần chuyển tab (cảnh báo tập trung): ${student.tabSwitches || 0} lần
${wrongQuestionsSummary ? `- Các câu hỏi sai tiêu biểu:\n${wrongQuestionsSummary}` : '- Học sinh làm đúng tất cả các câu.'}

YÊU CẦU:
${toneDescription}
Hãy xuất kết quả ở định dạng JSON duy nhất, không dùng markdown code block, theo cấu trúc:
{
  "classification": "Xuất sắc | Giỏi | Khá | Trung bình | Yếu",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm cần khắc phục 1", "Điểm cần khắc phục 2"],
  "comment": "Nhận xét tổng quát và cụ thể về năng lực, mức độ nắm kiến thức và thái độ làm bài của học sinh...",
  "advice": "Lời khuyên chân thành, cụ thể về phương pháp học tập, dạng bài cần rèn luyện thêm và lộ trình cải thiện điểm số..."
}`;

    try {
      const rawText = await callGeminiApi({
        prompt,
        systemInstruction:
          'Bạn là trợ lý AI sư phạm cao cấp của hệ thống AI Test Generator Pro. Luôn phản hồi JSON hợp lệ, tôn trọng chuẩn giáo dục Việt Nam, mang tính xây dựng và chuẩn xác.',
        responseMimeType: 'application/json',
        model: 'gemini-3.8-flash',
        customApiKey,
      });

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        id: student.sbd || student.id,
        studentName: student.studentName,
        studentClass: student.studentClass,
        sbd: student.sbd,
        examCode: summary.examCode || student.examCode,
        subject: summary.subject,
        grade: summary.grade,
        score: student.score,
        correctCount: student.correctCount,
        totalQuestions: student.totalQuestions,
        durationMinutes: student.durationMinutes,
        tabSwitches: student.tabSwitches,
        classification: parsed.classification || fallback.classification,
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : fallback.strengths,
        weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : fallback.weaknesses,
        comment: parsed.comment || fallback.comment,
        advice: parsed.advice || fallback.advice,
        generatedAt: new Date().toISOString(),
        isCustomEdited: false,
      };
    } catch (err) {
      console.warn('Lỗi khi gọi AI cá nhân, dùng phân tích chuẩn sư phạm:', err);
      return fallback;
    }
  }

  /**
   * Đánh giá hàng loạt (Batch) cho cả lớp theo môn học
   */
  public static async generateAiEvaluationsForClass(
    students: StudentResultForEvaluation[],
    summary: ClassSubjectExamSummary,
    tone: EvaluationTone = 'pedagogical',
    customApiKey?: string,
    onProgress?: (completed: number, total: number, currentStudentName: string) => void
  ): Promise<Record<string, StudentEvaluationData>> {
    const results: Record<string, StudentEvaluationData> = {};
    const total = students.length;

    // Phân loại: học sinh chưa làm bài sinh tức thời không cần gọi AI
    const submittedStudents = students.filter((s) => s.status === 'submitted');
    const notTakenStudents = students.filter((s) => s.status === 'not_taken');

    // Xử lý các học sinh chưa làm bài trước
    notTakenStudents.forEach((st) => {
      const key = st.sbd || st.id;
      results[key] = this.generateRuleBasedEvaluation(st, summary, tone);
    });

    if (submittedStudents.length === 0) {
      return results;
    }

    // Nếu số lượng học sinh nộp bài lớn, chia nhóm theo batch (ví dụ 6 học sinh / lượt) để gọi AI nhanh và đồng bộ
    const BATCH_SIZE = 5;
    let completedCount = notTakenStudents.length;

    for (let i = 0; i < submittedStudents.length; i += BATCH_SIZE) {
      const batch = submittedStudents.slice(i, i + BATCH_SIZE);

      const batchStudentData = batch.map((st, bIdx) => ({
        index: i + bIdx + 1,
        id: st.sbd || st.id,
        name: st.studentName,
        sbd: st.sbd || '',
        score: st.score,
        correct: `${st.correctCount}/${st.totalQuestions}`,
        duration: `${st.durationMinutes} phút`,
        tabSwitches: st.tabSwitches || 0,
      }));

      const toneDescription =
        tone === 'concise'
          ? 'Phong cách: Súc tích, cô đọng, phù hợp gửi sổ liên lạc / Zalo phụ huynh.'
          : tone === 'in_depth'
          ? 'Phong cách: Phân tích học thuật chi tiết, chiến lược cải thiện chuyên sâu.'
          : 'Phong cách: Sư phạm nhân văn, khích lệ động viên, nêu rõ điểm mạnh, điểm yếu và phương hướng.';

      const prompt = `Bạn là chuyên gia giáo dục và giáo viên bộ môn ${summary.subject || 'Toán học'} tại Việt Nam.
Hãy phân tích kết quả bài kiểm tra của các học sinh thuộc Lớp ${summary.className} cho môn ${summary.subject} (Mã đề: ${summary.examCode}).
Đưa ra NHẬN XÉT CHI TIẾT (comment) và LỜI KHUYÊN HỌC TẬP (advice) cho TỪNG HỌC SINH trong danh sách sau.

${toneDescription}

DANH SÁCH HỌC SINH:
${JSON.stringify(batchStudentData, null, 2)}

YÊU CẦU ĐẦU RA:
Trả về duy nhất một mảng JSON (không có markdown code block), mỗi phần tử ứng với một học sinh:
[
  {
    "id": "mã id hoặc sbd tương ứng",
    "classification": "Xuất sắc | Giỏi | Khá | Trung bình | Yếu",
    "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
    "weaknesses": ["điểm yếu 1"],
    "comment": "Nhận xét cụ thể về năng lực học tập và bài làm...",
    "advice": "Lời khuyên thiết thực và lộ trình cải thiện cho học sinh..."
  }
]`;

      try {
        if (onProgress) {
          onProgress(completedCount, total, batch.map((b) => b.studentName).join(', '));
        }

        const rawText = await callGeminiApi({
          prompt,
          systemInstruction:
            'Bạn là chuyên gia sư phạm hàng đầu hỗ trợ giáo viên đánh giá học sinh chuẩn Thông tư 22/BGDĐT. Trả về định dạng JSON thuần túy.',
          responseMimeType: 'application/json',
          model: 'gemini-3.8-flash',
          customApiKey,
        });

        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedArray: any[] = JSON.parse(cleanJson);

        batch.forEach((st) => {
          const key = st.sbd || st.id;
          const found = Array.isArray(parsedArray)
            ? parsedArray.find((item) => String(item.id) === String(key) || item.name === st.studentName)
            : null;

          if (found) {
            results[key] = {
              id: key,
              studentName: st.studentName,
              studentClass: st.studentClass,
              sbd: st.sbd,
              examCode: summary.examCode || st.examCode,
              subject: summary.subject,
              grade: summary.grade,
              score: st.score,
              correctCount: st.correctCount,
              totalQuestions: st.totalQuestions,
              durationMinutes: st.durationMinutes,
              tabSwitches: st.tabSwitches,
              classification: found.classification || this.getClassification(st.score),
              strengths: Array.isArray(found.strengths) ? found.strengths : ['Nắm được kiến thức cơ bản'],
              weaknesses: Array.isArray(found.weaknesses) ? found.weaknesses : ['Cần rèn luyện thêm bài tập'],
              comment: found.comment || `Học sinh đạt ${st.score?.toFixed(1)}đ môn ${summary.subject}.`,
              advice: found.advice || `Em hãy tiếp tục cố gắng trong các bài kiểm tra tiếp theo.`,
              generatedAt: new Date().toISOString(),
              isCustomEdited: false,
            };
          } else {
            results[key] = this.generateRuleBasedEvaluation(st, summary, tone);
          }
          completedCount++;
        });
      } catch (err) {
        console.warn('Lỗi khi gọi AI theo nhóm, chuyển sang cơ chế đánh giá chuẩn sư phạm:', err);
        batch.forEach((st) => {
          const key = st.sbd || st.id;
          results[key] = this.generateRuleBasedEvaluation(st, summary, tone);
          completedCount++;
        });
      }

      if (onProgress) {
        onProgress(completedCount, total, 'Hoàn thành lượt đánh giá');
      }
    }

    return results;
  }

  /**
   * Xuất danh sách đánh giá học sinh theo môn và lớp ra Excel
   */
  public static exportClassEvaluationToExcel(
    evaluations: StudentEvaluationData[],
    summary: ClassSubjectExamSummary
  ): void {
    const wb = XLSX.utils.book_new();

    const data = evaluations.map((item, idx) => ({
      STT: idx + 1,
      'Số Báo Danh': item.sbd || '---',
      'Họ và Tên': item.studentName,
      Lớp: item.studentClass,
      'Môn Học': item.subject || summary.subject,
      'Mã Đề': item.examCode || summary.examCode,
      'Điểm Số': typeof item.score === 'number' ? Number(item.score.toFixed(2)) : '',
      'Xếp Loại': item.classification,
      'Số Câu Đúng': typeof item.correctCount === 'number' ? `${item.correctCount}/${item.totalQuestions || 0}` : '',
      'Thời Gian Làm (Phút)': item.durationMinutes ?? '',
      'Cảnh Báo Chuyển Tab': item.tabSwitches ?? 0,
      'Điểm Mạnh': (item.strengths || []).join('; '),
      'Điểm Cần Khắc Phục': (item.weaknesses || []).join('; '),
      'Nhận Xét Của AI': item.comment,
      'Lời Khuyên Của AI': item.advice,
      'Thời Gian Đánh Giá': item.generatedAt ? new Date(item.generatedAt).toLocaleString('vi-VN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 6 }, // STT
      { wch: 14 }, // SBD
      { wch: 25 }, // Họ Tên
      { wch: 10 }, // Lớp
      { wch: 14 }, // Môn
      { wch: 12 }, // Mã Đề
      { wch: 10 }, // Điểm
      { wch: 14 }, // Xếp loại
      { wch: 14 }, // Số câu đúng
      { wch: 16 }, // Thời gian làm
      { wch: 16 }, // Chuyển tab
      { wch: 30 }, // Điểm mạnh
      { wch: 30 }, // Điểm yếu
      { wch: 45 }, // Nhận xét
      { wch: 45 }, // Lời khuyên
      { wch: 20 }, // Thời gian
    ];

    const safeClass = String(summary.className || 'Lop').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeSub = String(summary.subject || 'Mon').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sheetName = `DanhGia_${safeClass}_${safeSub}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `Danh_Gia_Ket_Qua_${safeSub}_Lop_${safeClass}.xlsx`;
    ExportExcel.saveWorkbook(wb, fileName);
  }
}
