import { ExamMetadata, SubjectType } from '../types';
import { getSubjectProfile } from './subjectProfiles';

export class PromptEngine {
  /**
   * Tạo System Instruction chuẩn chuyên gia giáo dục Công văn 7991/BGDĐT tối ưu hóa theo môn học
   */
  static getSystemInstruction(subject?: SubjectType | string): string {
    const isLiterature = subject === 'Ngữ văn';
    const isEnglish = subject === 'Tiếng Anh';
    const profile = subject ? getSubjectProfile(subject) : null;

    let subjectSpecificCoreRules = '';

    if (isLiterature) {
      subjectSpecificCoreRules = `
🎭 QUY TẮC CỐT LÕI ĐẶC THÙ CHO MÔN NGỮ VĂN (CHƯƠNG TRÌNH GDPT 2018):
1. VĂN BẢN NGỮ LIỆU ĐỌC HIỂU:
   - BẮT BUỘC dùng văn bản MỚI NGOÀI SÁCH GIÁO KHOA (đúng tinh thần đổi mới đánh giá của Bộ GD&ĐT).
   - Thể loại: Truyện ngắn, thơ, tản văn, nghị luận xã hội hoặc văn bản thông tin nhật dụng giàu tính nhân văn.
   - BẮT BUỘC ghi rõ NGUỒN TRÍCH DẪN: (Tên tác phẩm, tác giả, nhà xuất bản, năm xuất bản hoặc nguồn báo chí).
   - Ngữ liệu được đưa vào phần mở đầu đề thi trong trường "content" của câu đầu tiên hoặc phần dẫn đề.
2. CÁC CÂU HỎI ĐỌC HIỂU:
   - Trải đều 4 mức độ nhận thức: Nhận biết (thể loại, chi tiết, phương thức biểu đạt, BPTT), Thông hiểu (ý nghĩa, tác dụng BPTT, tình cảm tác giả), Vận dụng (thông điệp, bài học cuộc sống, liên hệ).
3. PHẦN VIẾT / TỰ LUẬN:
   - Câu 1: Viết đoạn văn nghị luận xã hội khoảng 200 chữ về vấn đề tư tưởng đạo lý hoặc lối sống gợi ra từ ngữ liệu đọc hiểu.
   - Câu 2: Viết bài văn hoàn chỉnh khoảng 600 chữ phân tích chủ đề & nghệ thuật của ngữ liệu hoặc bàn luận hiện tượng đời sống.
4. BAREME RUBRIC 5 TIÊU CHÍ BỘ GD&ĐT:
   - Bắt buộc đủ 5 tiêu chí: a) Cấu trúc đoạn/bài; b) Xác định đúng vấn đề; c) Triển khai luận điểm & dẫn chứng; d) Chính tả, ngữ pháp; e) Sáng tạo.
5. TUYỆT ĐỐI KHÔNG DÙNG CÔNG THỨC TOÁN LATEX:
   - Tuyệt đối không dùng dấu $ hoặc mã TeX. Chữ viết tiếng Việt có dấu chuẩn Unicode 100%.`;
    } else if (isEnglish) {
      subjectSpecificCoreRules = `
🇬🇧 QUY TẮC CỐT LÕI ĐẶC THÙ CHO MÔN TIẾNG ANH (CEFR & CV 7991):
1. 100% TIẾNG ANH CHUẨN MỰC:
   - Toàn bộ câu hỏi, yêu cầu, đoạn văn đọc hiểu, và 4 phương án lựa chọn A, B, C, D BẮT BUỘC 100% BẰNG TIẾNG ANH TỰ NHIÊN, CHUẨN XÁC.
   - Căn chỉnh độ khó theo khối lớp: THCS (A2 - B1), THPT (B1 - B2).
2. DẠNG BÀI ĐẶC THÙ MÔN TIẾNG ANH:
   - Phonetics: Phát âm (-s/es, -ed, nguyên âm) & Trọng âm (2-3 âm tiết).
   - Lexico-Grammar: Thì động từ, câu bị động, câu điều kiện, mệnh đề quan hệ, phrasal verbs, collocations.
   - Everyday Communication: Tình huống giao tiếp hàng ngày.
   - Synonyms & Antonyms: CLOSEST and OPPOSITE in meaning.
   - Guided Cloze Test: Bài đọc điền từ vào chỗ trống trong đoạn văn 150-200 từ.
   - Reading Comprehension: Đoạn văn đọc hiểu 200-350 từ bám sát chủ đề với các câu hỏi: Main idea, Detail, Vocabulary in context, Inference, Pronoun reference.
   - Writing / Sentence Transformation: Viết lại câu không đổi nghĩa.
3. HƯỚNG DẪN GIẢI SONG NGỮ:
   - Trong trường "explanation", cung cấp dịch nghĩa tiếng Việt và phân tích ngữ pháp chi tiết để giáo viên & học sinh dễ đối chiếu.
4. TUYỆT ĐỐI KHÔNG dùng ký hiệu công thức LaTeX $.`;
    } else {
      subjectSpecificCoreRules = `
📐 QUY TẮC CÔNG THỨC TOÁN HỌC, HÓA HỌC & TIẾNG VIỆT (BẮT BUỘC TUÂN THỦ 100%):
1. CHỈ bọc KÝ HIỆU HOẶC BIỂU THỨC TOÁN HỌC / HÓA HỌC bằng dấu $...$ (ví dụ: $\\Delta ABC$, $AB = 4\\text{ cm}$, $\\widehat{A} = 60^\\circ$, $k = \\frac{2}{3}$, $\\forall x \\in \\mathbb{R}$).
2. MỌI CÔNG THỨC HÓA HỌC ($C_2H_5OH$, $CH_3COOH$, $H_2SO_4$, $CO_2$, $H_2O$, $NaHCO_3$), PHƯƠNG TRÌNH HÓA HỌC VÀ ĐẠI LƯỢNG $n_{acid}$, $m_{\\text{ester}}$, $CO_2\\uparrow$, $BaSO_4\\downarrow$ BẮT BUỘC BỌC TRONG $...$. Danh pháp hóa học tuân theo chuẩn quốc tế IUPAC mới của SGK GDPT 2018.
3. Mũi tên phản ứng thuận nghịch dùng $\\xrightleftharpoons[chất\\ phụ]{điều\\ kiện}$ hoặc $\\rightleftharpoons$, mũi tên 1 chiều dùng $\\xrightarrow{điều\\ kiện}$ hoặc $\\rightarrow$, ký hiệu khí bay lên dùng $\\uparrow$, kết tủa dùng \\downarrow.
4. Dùng \\text{...} cho phần chữ tiếng Việt trong chỉ số/điều kiện phản ứng (ví dụ: $n_{\\text{ester lý thuyết}}$, $\\xrightarrow{\\text{men giấm}}$, $\\xrightleftharpoons[t^\\circ]{H_2SO_4\\ \\text{đặc}}$).
5. TUYỆT ĐỐI KHÔNG bọc văn bản hay từ ngữ Tiếng Việt vào trong dấu $...$ (KHÔNG viết "$Cho tam giác ABC có$", KHÔNG viết "$Biết chu vi$", KHÔNG viết "$độ dài$").
6. TUYỆT ĐỐI KHÔNG dùng mã TeX accent cho tiếng Việt (KHÔNG viết "v\\grave{a}", "c\\'o", "m\\text{\\hat{o}}t"). Bắt buộc viết chữ tiếng Việt có dấu chuẩn Unicode.
7. Biểu thức phân số hoặc đẳng thức phức tạp phải bọc TRỌN VẸN trong 1 cặp $...$ duy nhất (ví dụ: $\\frac{AB}{A'B'} = \\frac{BC}{B'C'}$).
8. HỆ PHƯƠNG TRÌNH bắt buộc dùng môi trường \\begin{cases} ... \\end{cases} và phân cách giữa các phương trình bằng dấu xuống dòng hàng kép '\\\\'.
9. HÌNH HỌC VÀ ĐỒ THỊ: Nếu là bài tập hình học hoặc hàm số, BẮT BUỘC cung cấp chuỗi mã SVG chuẩn trong "svgDiagram" và "solutionDiagramSvg".`;
    }

    return `Bạn là Chuyên gia Giáo dục Hàng đầu Việt Nam + Chuyên gia Đánh giá Năng lực theo Công văn 7991/BGDĐT của Bộ Giáo dục và Đào tạo.
Nhiệm vụ của bạn là biên soạn ma trận, bảng đặc tả, đề kiểm tra, đáp án và hướng dẫn chấm hoàn chỉnh, chính xác 100% theo chương trình Giáo dục phổ thông (GDPT 2018).

BẮT BUỘC TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. Nội dung câu hỏi hoàn toàn MỚI, KHÔNG sao chép nguyên văn từ Sách giáo khoa, đảm bảo bám sát Yêu cầu cần đạt (YCCĐ).
2. Chuẩn kiến thức, kỹ năng, vừa sức với thời gian làm bài.
3. Đúng cấu trúc Công văn 7991/BGDĐT:
   - PHẦN I: Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu hỏi có 4 phương án A, B, C, D, chỉ chọn 1 phương án đúng).
   - PHẦN II: Trắc nghiệm Đúng/Sai (Mỗi câu hỏi có 1 lệnh hỏi chính và 4 ý a, b, c, d; ở mỗi ý chọn Đúng hoặc Sai).
   - PHẦN III: Trắc nghiệm Trả lời ngắn (Học sinh điền kết quả ngắn, số hoặc cụm từ).
   - PHẦN IV: Tự luận (Các câu hỏi tự luận bao gồm ĐẦY ĐỦ CẢ 4 MỨC ĐỘ NHẬN THỨC: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao kèm Thang điểm & Rubric chi tiết).
4. Phân bổ đúng tỷ lệ mức độ nhận thức: Nhận biết (REMEMBER / NB), Thông hiểu (UNDERSTAND / TH), Vận dụng (APPLY / VD), Vận dụng cao (ADVANCED / VDC). Với phần Tự luận (Phần IV), BẮT BUỘC phải bao gồm đầy đủ cả 4 mức độ nhận thức này.
${subjectSpecificCoreRules}
5. TUYỆT ĐỐI KHÔNG chèn các nhãn mã như [NB_TL], [TH_TL], [VD_TL], [VDC_TL], [NB_TN], [TH_TN] vào cuối hoặc trong chuỗi văn bản 'content', 'explanation', 'essayAnswerGuide' của câu hỏi. Mức độ nhận thức CHỈ ĐƯỢC khai báo thông qua trường JSON 'cognitiveLevel' ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ADVANCED').
6. TRONG CHUỖI JSON TRẢ VỀ, MỌI DẤU GẠCH CHÉO NGƯỢC '\\' CỦA LATEX BẮT BUỘC PHẢI ĐƯỢC ESCAPE THÀNH '\\\\' ĐỂ JSON KHÔNG BỊ LỖI CÚ PHÁP.
7. Trả về đúng 1 đối tượng JSON duy nhất theo đúng cấu trúc schema được yêu cầu, không có lời mở đầu hay kết luận thừa ngoài JSON.`;
  }

  /**
   * Tạo prompt chi tiết từ thông tin giáo viên nhập
   */
  static buildGenerationPrompt(metadata: ExamMetadata): string {
    const {
      schoolName,
      subject,
      grade,
      semester,
      schoolYear,
      examTitle,
      chapterTitle,
      topicsList,
      durationMinutes,
      totalPoints,
      curriculum,
      examMode,
      questionCounts,
      cognitiveRatio,
      subjectSpecificConfig,
    } = metadata;

    const profile = getSubjectProfile(subject);

    const cleanTopics = (topicsList || [])
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let topicsSection = '';
    if (cleanTopics.length > 0) {
      topicsSection = `
📚 DANH SÁCH CÁC BÀI HỌC / MẠCH KIẾN THỨC CỤ THỂ CẦN KIỂM TRA (${cleanTopics.length} bài/mạch nội dung):
${cleanTopics.map((t, idx) => `  Bài ${idx + 1}: ${t}`).join('\n')}

🎯 QUY TẮC BẮT BUỘC VỀ MA TRẬN, BẢNG ĐẶC TẢ VÀ CÂU HỎI THEO TỪNG BÀI:
1. XÂY DỰNG MA TRẬN ("matrix"): Phải có các dòng ma trận tương ứng trực tiếp với ${cleanTopics.length} bài/mạch nội dung trên. Mỗi bài học/mạch nội dung là ít nhất một dòng trong ma trận với trường "topic" là chính xác tên bài học tương ứng (VD: "${cleanTopics[0]}").
2. BẢNG ĐẶC TẢ ("specification"): Phải có các mục tương ứng với từng bài trong danh sách trên, nêu rõ yêu cầu cần đạt chuẩn CT GDPT 2018 cho từng bài.
3. PHÂN BỔ CÂU HỎI BAO PHỦ: Phân bổ các câu hỏi (Phần I, Phần II, Phần III, Phần IV) trải đều và hợp lý vào TẤT CẢ ${cleanTopics.length} bài trên. KHÔNG được bỏ sót bất kỳ bài nào và TUYỆT ĐỐI KHÔNG sinh câu hỏi nằm ngoài danh sách bài này.
4. MỖI CÂU HỎI trong danh sách "questions" BẮT BUỘC gán trường "topic" chính xác là một trong ${cleanTopics.length} bài trên.
`;
    }

    let modeDescription = '';
    if (examMode === 'MCQ_ESSAY') {
      modeDescription = 'Đề kết hợp Trắc nghiệm và Tự luận (Gồm các Phần I, II, III, IV tùy thuộc số lượng câu hỏi khai báo).';
    } else if (examMode === 'MCQ_ONLY') {
      modeDescription = 'Đề Trắc nghiệm 100% (Chỉ gồm Phần I, Phần II, Phần III, KHÔNG có Phần IV Tự luận).';
    } else {
      modeDescription = 'Đề Tự luận 100% (Chỉ gồm Phần IV Tự luận, KHÔNG có các phần Trắc nghiệm I, II, III).';
    }

    let referenceSection = '';
    if (metadata.referenceContext && metadata.referenceContext.trim()) {
      referenceSection += `
⚠️ GIỚI HẠN KIẾN THỨC VÀ NGUỒN TÀI LIỆU CỤ THỂ DO GIÁO VIÊN CUNG CẤP (BẮT BUỘC BÁM SÁT TUYỆT ĐỐI):
${metadata.referenceContext.trim()}

🎯 YÊU CẦU QUAN TRỌNG VỀ PHẠM VI KIẾN THỨC:
1. CHỈ sinh câu hỏi nằm hoàn toàn trong phạm vi nội dung và giới hạn kiến thức được giáo viên mô tả ở trên.
2. TUYỆT ĐỐI KHÔNG đưa vào các dạng bài thuộc chương/mục khác không có trong nguồn tài liệu này.
`;
    }

    if (metadata.referenceImages && metadata.referenceImages.length > 0) {
      referenceSection += `
📸 TÀI LIỆU HÌNH ẢNH / TRANG SÁCH GIÁO KHOA / MỤC LỤC ĐÍNH KÈM:
Đã gửi kèm ${metadata.referenceImages.length} ảnh trang sách giáo khoa / ảnh chụp bài học / mục lục. Hãy phân tích kỹ nội dung trong các bức ảnh này để trích xuất đúng phạm vi bài học và giới hạn câu hỏi chuẩn xác 100%.
`;
    }

    // Đặc thù chuyên môn theo từng môn học
    let subjectSpecificSection = `
🌟 HƯỚNG DẪN ĐẶC THÙ CHUYÊN MÔN CHO MÔN ${subject.toUpperCase()} (BẮT BUỘC TUÂN THỦ):
${profile.promptRules}
`;

    if (subject === 'Ngữ văn') {
      const genre = subjectSpecificConfig?.literatureGenre || 'truyen';
      const essayTopic = subjectSpecificConfig?.literatureEssayTopic || '';
      subjectSpecificSection += `
📖 YÊU CẦU ĐẶC BIỆT DÀNH CHO MÔN NGỮ VĂN:
- Thể loại văn bản đọc hiểu yêu cầu: ${genre === 'truyen' ? 'Truyện ngắn / Trích đoạn tiểu thuyết / Truyện đồng thoại' : genre === 'tho' ? 'Thơ trữ tình (thơ tự do, 5 chữ, 7 chữ hoặc lục bát)' : genre === 'nghi_luan' ? 'Văn bản nghị luận xã hội / tư tưởng đạo lý' : genre === 'thong_tin' ? 'Văn bản thông tin nhật dụng' : 'Tản văn / Ký'}.
- Ngữ liệu đọc hiểu: BẮT BUỘC là văn bản mới ngoài SGK, kèm trích dẫn tác giả, tác phẩm, xuất bản rõ ràng.
${essayTopic ? `- Định hướng vấn đề làm văn/nghị luận: "${essayTopic}".` : ''}
- Bắt buộc đủ các câu hỏi Đọc hiểu theo 4 cấp độ và câu Tự luận làm văn (Đoạn văn 200 chữ & Bài văn 600 chữ) kèm Rubric 5 tiêu chí của Bộ GD&ĐT.
- TUYỆT ĐỐI KHÔNG dùng ký hiệu công thức LaTeX $.
`;
    } else if (subject === 'Tiếng Anh') {
      const level = subjectSpecificConfig?.englishLevel || 'auto';
      const focusAreas = subjectSpecificConfig?.englishFocusAreas || ['phonetics', 'grammar_vocab', 'reading_cloze', 'reading_comprehension', 'sentence_rewrite'];
      subjectSpecificSection += `
🇬🇧 YÊU CẦU ĐẶC BIỆT DÀNH CHO MÔN TIẾNG ANH:
- Ngôn ngữ: 100% đề thi, câu hỏi và 4 phương án bằng TIẾNG ANH CHUẨN MỰC.
- Trình độ mục tiêu: ${level === 'auto' ? 'Phù hợp chuẩn khối lớp ' + grade : 'Khung năng lực ' + level}.
- Các mạch dạng bài trọng tâm: ${focusAreas.join(', ')}.
- Phải có bài phát âm/trọng âm (Phonetics/Stress), trắc nghiệm từ vựng ngữ pháp, bài đọc điền từ (Guided Cloze), bài đọc hiểu đoạn văn (Reading Comprehension) và viết lại câu.
- Phần giải thích (explanation) cung cấp dịch nghĩa tiếng Việt và phân tích ngữ pháp chi tiết.
- TUYỆT ĐỐI KHÔNG dùng ký hiệu công thức LaTeX $.
`;
    }

    return `
HÃY SINH MA TRẬN, BẢNG ĐẶC TẢ VÀ ĐỀ KIỂM TRA CHUẨN CÔNG VĂN 7991/BGDĐT CHO THÔNG TIN SAU:

📌 THÔNG TIN CHUNG:
- Trường: ${schoolName || 'Trường THPT'}
- Môn học: ${subject}
- Khối lớp: ${grade}
- Học kỳ: ${semester} | Năm học: ${schoolYear}
- Tên kỳ thi / Bài kiểm tra: ${examTitle}
- Tên bài / Chương / Chủ đề chung: ${chapterTitle}
${topicsSection}
- Bộ sách giáo khoa: ${curriculum}
- Thời gian làm bài: ${durationMinutes} phút
- Thang điểm tổng: ${totalPoints} điểm
- Chế độ đề: ${modeDescription}
${referenceSection}
${subjectSpecificSection}

📊 CẤU TRÚC SỐ LƯỢNG CÂU HỎI THEO DẠNG VÀ THANG ĐIỂM CHI TIẾT:
- Phần I (Trắc nghiệm 4 lựa chọn): ${questionCounts.part1_MCQSingle} câu (Mỗi câu ${questionCounts.part1_PointsPerQuestion ?? 0.25} điểm)
- Phần II (Trắc nghiệm Đúng/Sai): ${questionCounts.part2_MCQTrueFalse} câu (Mỗi câu ${questionCounts.part2_PointsPerQuestion ?? 1.0} điểm, gồm chính xác ${questionCounts.part2_TFStatementsPerQuestion ?? 4} ý Đúng/Sai, điểm chia đều: ${((questionCounts.part2_PointsPerQuestion ?? 1.0) / (questionCounts.part2_TFStatementsPerQuestion ?? 4)).toFixed(2)}đ/ý)
- Phần III (Trắc nghiệm Trả lời ngắn): ${questionCounts.part3_MCQShort} câu (Mỗi câu ${questionCounts.part3_PointsPerQuestion ?? 0.25} điểm)
- Phần IV (Tự luận): ${questionCounts.part4_Essay} câu tự luận.
  * YÊU CẦU PHẦN TỰ LUẬN BẮT BUỘC ĐẦY ĐỦ CẢ 4 MỨC ĐỘ NHẬN THỨC: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
  * LƯU Ý GÁN ĐIỂM SỐ CÂU TỰ LUẬN: Tổng quỹ điểm tự luận là ${Math.max(0, Math.round((10.0 - ((questionCounts.part1_MCQSingle || 0) * (questionCounts.part1_PointsPerQuestion ?? 0.25) + (questionCounts.part2_MCQTrueFalse || 0) * (questionCounts.part2_PointsPerQuestion ?? 1.0) + (questionCounts.part3_MCQShort || 0) * (questionCounts.part3_PointsPerQuestion ?? 0.25))) * 100) / 100)}đ. KHÔNG chia đều điểm máy móc. Hãy căn cứ độ khó và độ dài từng câu tự luận (NB, TH, VD, VDC) để gán điểm số thích hợp (ví dụ câu NB/TH 0.5đ - 1.0đ, câu VD/VDC 1.5đ - 2.5đ...) sao cho tổng điểm toàn đề đúng 10.0 điểm.

🎯 TỶ LỆ MỨC ĐỘ NHẬN THỨC:
- Nhận biết (REMEMBER): ${cognitiveRatio.remember}%
- Thông hiểu (UNDERSTAND): ${cognitiveRatio.understand}%
- Vận dụng (APPLY): ${cognitiveRatio.apply}%
- Vận dụng cao (ADVANCED): ${cognitiveRatio.advanced}%

YÊU CẦU ĐẦU RA JSON CHÍNH XÁC THEO SCHEMA SAU:
{
  "matrix": [
    {
      "stt": 1,
      "topic": "Tên mạch nội dung/chủ đề",
      "subTopic": "Tên đơn vị kiến thức",
      "part1": { "remember": 2, "understand": 1, "apply": 0, "advanced": 0 },
      "part2": { "remember": 0, "understand": 1, "apply": 0, "advanced": 0 },
      "part3": { "remember": 0, "understand": 0, "apply": 1, "advanced": 0 },
      "part4": { "remember": 0, "understand": 0, "apply": 0, "advanced": 1 },
      "totalQuestions": 5,
      "totalPoints": 3.5,
      "percentage": 35
    }
  ],
  "specification": [
    {
      "stt": 1,
      "topic": "Tên mạch nội dung/chủ đề",
      "subTopic": "Tên đơn vị kiến thức",
      "requirements": "Yêu cầu cần đạt chi tiết...",
      "part1": { "remember": 2, "understand": 1, "apply": 0, "advanced": 0 },
      "part2": { "remember": 0, "understand": 1, "apply": 0, "advanced": 0 },
      "part3": { "remember": 0, "understand": 0, "apply": 1, "advanced": 0 },
      "part4": { "remember": 0, "understand": 0, "apply": 0, "advanced": 1 },
      "totalPoints": 3.5
    }
  ],
  "questions": [
    // Với PHẦN I (Nhiều lựa chọn):
    {
      "id": "q-1",
      "partType": "PART1",
      "partTitle": "PHẦN I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn",
      "number": 1,
      "content": "Nội dung câu hỏi...",
      "cognitiveLevel": "REMEMBER",
      "points": 0.25,
      "topic": "Tên chủ đề",
      "options": [
        { "key": "A", "content": "Phương án A" },
        { "key": "B", "content": "Phương án B" },
        { "key": "C", "content": "Phương án C" },
        { "key": "D", "content": "Phương án D" }
      ],
      "correctOption": "A",
      "explanation": "Giải thích câu 1..."
    },
    // Với PHẦN II (Đúng/Sai):
    {
      "id": "q-2",
      "partType": "PART2",
      "partTitle": "PHẦN II. Câu hỏi trắc nghiệm Đúng/Sai",
      "number": 1,
      "content": "Lệnh hỏi chính cho tất cả các ý...",
      "cognitiveLevel": "UNDERSTAND",
      "points": 1.0,
      "topic": "Tên chủ đề",
      "trueFalseStatements": [
        { "key": "a", "content": "Ý a...", "isCorrect": true },
        { "key": "b", "content": "Ý b...", "isCorrect": false }
      ],
      "explanation": "Giải thích chi tiết các ý..."
    },
    // Với PHẦN III (Trả lời ngắn):
    {
      "id": "q-3",
      "partType": "PART3",
      "partTitle": "PHẦN III. Câu hỏi trắc nghiệm trả lời ngắn",
      "number": 1,
      "content": "Nội dung câu hỏi yêu cầu kết quả ngắn...",
      "cognitiveLevel": "APPLY",
      "points": 0.25,
      "topic": "Tên chủ đề",
      "shortAnswer": "Đáp án ngắn",
      "explanation": "Các bước tính ra kết quả..."
    },
    // Với PHẦN IV (Tự luận):
    {
      "id": "q-4",
      "partType": "PART4",
      "partTitle": "PHẦN IV. Tự luận",
      "number": 1,
      "content": "Nội dung bài tập tự luận...",
      "cognitiveLevel": "ADVANCED",
      "points": 1.5,
      "topic": "Tên chủ đề",
      "essayAnswerGuide": "Hướng dẫn giải chi tiết...",
      "rubric": [
        { "criteria": "Ý 1 / Bước 1", "points": 0.5, "description": "Mô tả bước giải..." },
        { "criteria": "Ý 2 / Bước 2", "points": 1.0, "description": "Mô tả bước giải..." }
      ],
      "explanation": "Lưu ý khi chấm bài..."
    }
  ]
}

Chú ý: Hãy đảm bảo số lượng câu hỏi trong danh sách "questions" khớp CHÍNH XÁC với số lượng khai báo ở trên!
`;
  }
}
