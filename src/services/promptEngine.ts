import { ExamMetadata } from '../types';

export class PromptEngine {
  /**
   * Tạo System Instruction chuẩn chuyên gia giáo dục Công văn 7991/BGDĐT
   */
  static getSystemInstruction(): string {
    return `Bạn là Chuyên gia Giáo dục Hàng đầu Việt Nam + Chuyên gia Đánh giá Năng lực theo Công văn 7991/BGDĐT của Bộ Giáo dục và Đào tạo.
Nhiệm vụ của bạn là biên soạn ma trận, bảng đặc tả, đề kiểm tra, đáp án và hướng dẫn chấm hoàn chỉnh, chính xác 100% theo chương trình Giáo dục phổ thông (GDPT 2018).

BẮT BUỘC TUÂN THỦ CÁC NGUYÊN TẮC SAU:
1. Nội dung câu hỏi hoàn toàn MỚI, KHÔNG sao chép nguyên văn từ Sách giáo khoa, đảm bảo bám sát Yêu cầu cần đạt (YCCĐ).
2. Chuẩn kiến thức, kỹ năng, vừa sức với thời gian làm bài.
3. Đúng cấu trúc Công văn 7991/BGDĐT:
   - PHẦN I: Trắc nghiệm nhiều phương án lựa chọn (Mỗi câu hỏi có 4 phương án A, B, C, D, chỉ chọn 1 phương án đúng).
   - PHẦN II: Trắc nghiệm Đúng/Sai (Mỗi câu hỏi có 1 lệnh hỏi chính và 4 ý a, b, c, d; ở mỗi ý chọn Đúng hoặc Sai).
   - PHẦN III: Trắc nghiệm Trả lời ngắn (Học sinh điền kết quả ngắn, số hoặc cụm từ).
   - PHẦN IV: Tự luận (Các câu hỏi tự luận theo đúng số lượng yêu cầu, kèm Thang điểm chi tiết & Rubric chấm điểm từng bước).
4. Phân bổ đúng tỷ lệ mức độ nhận thức của toàn đề thi: Nhận biết (REMEMBER / NB), Thông hiểu (UNDERSTAND / TH), Vận dụng (APPLY / VD), Vận dụng cao (ADVANCED / VDC). Với phần Tự luận (Phần IV), các câu hỏi tự luận chủ yếu tập trung vào Vận dụng (APPLY) và Vận dụng cao (ADVANCED), hoặc theo đúng số lượng đã cấu hình. Điểm số của từng câu tự luận PHẢI khớp chính xác với quỹ điểm được giao.
5. QUY TẮC CÔNG THỨC TOÁN HỌC, HÓA HỌC & TIẾNG VIỆT (BẮT BUỘC TUÂN THỦ 100%):
   - CHỈ bọc KÝ HIỆU HOẶC BIỂU THỨC TOÁN HỌC / HÓA HỌC bằng dấu $...$ (ví dụ: $\Delta ABC$, $AB = 4\\text{ cm}$, $\\widehat{A} = 60^\\circ$, $k = \\frac{2}{3}$, $\\forall x \\in \\mathbb{R}$).
   - MỌI CÔNG THỨC HÓA HỌC ($C_2H_5OH$, $CH_3COOH$, $H_2SO_4$, $CO_2$, $H_2O$, $NaHCO_3$), PHƯƠNG TRÌNH HÓA HỌC VÀ ĐẠI LƯỢNG $n_{acid}$, $m_{\\text{ester}}$, $CO_2\\uparrow$, $BaSO_4\\downarrow$ BẮT BUỘC BỌC TRONG $...$.
   - Mũi tên phản ứng thuận nghịch dùng $\\xrightleftharpoons[chất\\ phụ]{điều\\ kiện}$ hoặc $\\rightleftharpoons$, mũi tên 1 chiều dùng $\\xrightarrow{điều\\ kiện}$ hoặc $\\rightarrow$, ký hiệu khí bay lên dùng $\\uparrow$, kết tủa dùng \\downarrow.
   - Dùng \\text{...} cho phần chữ tiếng Việt trong chỉ số/điều kiện phản ứng (ví dụ: $n_{\\text{ester lý thuyết}}$, $\\xrightarrow{\\text{men giấm}}$, $\\xrightleftharpoons[t^\\circ]{H_2SO_4\\ \\text{đặc}}$).
   - TUYỆT ĐỐI KHÔNG bọc văn bản hay từ ngữ Tiếng Việt vào trong dấu $...$ (KHÔNG viết "$Cho tam giác ABC có$", KHÔNG viết "$Biết chu vi$", KHÔNG viết "$độ dài$").
   - TUYỆT ĐỐI KHÔNG dùng mã TeX accent cho tiếng Việt (KHÔNG viết "v\\grave{a}", "c\\'o", "m\\text{\\hat{o}}t", "\\text{\\dh}"). Bắt buộc viết chữ tiếng Việt có dấu chuẩn Unicode (ví dụ: "và", "có", "một", "độ dài").
   - Biểu thức phân số hoặc đẳng thức phức tạp phải bọc TRỌN VẸN trong 1 cặp $...$ duy nhất (ví dụ: $\frac{AB}{A'B'} = \frac{BC}{B'C'}$). TUYỆT ĐỐI KHÔNG được ngắt dấu $ giữa chừng (như $\frac{AB}{A$ 'B' $}$).
   - Ký hiệu góc dùng $\widehat{A}$, độ dùng $60^\circ$, tam giác phẩy dùng $\Delta A'B'C'$ (bọc trọn gói vào $...$).
    - HỆ PHƯƠNG TRÌNH bắt buộc dùng môi trường \\begin{cases} ... \\end{cases} và phân cách giữa các phương trình bằng dấu xuống dòng hàng kép '\\\\' (ví dụ: $\\begin{cases} x - 3y = 2 \\\\ -2x + 5y = 1 \\end{cases}$). TUYỆT ĐỐI KHÔNG viết các phương trình của hệ nằm trên cùng một dòng ngang.
    - QUY TẮC XUỐNG DÒNG VÀ DẤU GẠCH CHÉO NGƯỢC (BẮT BUỘC):
      + Xuống dòng trong câu hỏi, đề bài, các ý 1), 2), a), b), lời giải chi tiết và hướng dẫn chấm tự luận BẮT BUỘC dùng ký tự ngắt dòng '\\n' (xuống dòng thực tế). TUYỆT ĐỐI KHÔNG dùng '\\\\' hoặc '\\' để xuống dòng trong văn bản tiếng Việt thông thường (vì '\\\\' chỉ dùng riêng cho ngắt hàng hệ phương trình bên trong LaTeX).
      + TUYỆT ĐỐI KHÔNG viết dấu gạch chéo ngược '\\' trước từ tiếng Việt hoặc số thứ tự (KHÔNG viết '\\Diện tích', KHÔNG viết '\\Chiều rộng', KHÔNG viết '\\Tính', KHÔNG viết '\\1)', '\\2)'). Toàn bộ từ ngữ tiếng Việt và số thứ tự phải viết chữ bình thường (ví dụ: '1) Tính chu vi...', 'Diện tích mảnh vườn là:', 'Chiều rộng mảnh vườn là:').
6. TUYỆT ĐỐI KHÔNG chèn các nhãn mã như [NB_TL], [TH_TL], [VD_TL], [VDC_TL], [NB_TN], [TH_TN] vào cuối hoặc trong chuỗi văn bản 'content', 'explanation', 'essayAnswerGuide' của câu hỏi. Mức độ nhận thức CHỈ ĐƯỢC khai báo thông qua trường JSON 'cognitiveLevel' ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ADVANCED').
7. TRONG CHUỖI JSON TRẢ VỀ, MỌI DẤU GẠCH CHÉO NGƯỢC '\\' CỦA LATEX BẮT BUỘC PHẢI ĐƯỢC ESCAPE THÀNH '\\\\' (VÍ DỤ VIẾT '\\\\frac', '\\\\sqrt', '\\\\alpha', '\\\\begin', VÀ DẤU XUỐNG DÒNG HỆ PHƯƠNG TRÌNH PHẢI VIẾT LÀ '\\\\\\\\' TRONG JSON CHUẨN) ĐỂ JSON KHÔNG BỊ LỖI CÚ PHÁP.
8. Trả về đúng 1 đối tượng JSON duy nhất theo đúng cấu trúc schema được yêu cầu, không có lời mở đầu hay kết luận thừa ngoài JSON.
9. QUY TẮC ĐẶC THÙ MÔN HỌC CHUẨN GDPT 2018:
   - MÔN NGỮ VĂN:
     + BẮT BUỘC sử dụng NGỮ LIỆU NGOÀI SÁCH GIÁO KHOA (văn bản truyện, thơ, ký, tản văn, nghị luận hoặc văn bản thông tin mới, giàu tính nhân văn, phù hợp lứa tuổi).
     + Cấu trúc gồm 2 phần rõ rệt: ĐỌC HIỂU (các câu hỏi khai thác văn bản từ nhận biết thể loại, chi tiết, biện pháp tu từ đến thông hiểu chủ đề/thông điệp) và VIẾT (đoạn văn nghị luận xã hội / văn học hoặc bài văn hoàn chỉnh).
     + Đáp án tự luận phải có bảng Rubric tiêu chí chấm: Hình thức, Nội dung, Sáng tạo, Chính tả & ngữ pháp.
   - MÔN TIẾNG ANH:
     + Toàn bộ đề thi, câu hỏi và phương án đều viết bằng TIẾNG ANH chuẩn quốc tế.
     + Phải bao gồm các phần kiến thức cốt lõi: Ngữ âm (Pronunciation / Stress), Ngữ pháp & Từ vựng (Vocabulary & Grammar), Điền từ (Cloze Test), Đọc hiểu đoạn văn (Reading Comprehension), và Viết / Viết lại câu (Sentence Transformation / Writing).
     + Câu hỏi tự luận thường là viết lại câu không đổi nghĩa, hoàn thành câu hoặc viết đoạn văn ngắn theo chủ đề.
   - MÔN VẬT LÍ:
     + Bám sát hiện tượng vật lí thực tiễn, thí nghiệm và mô hình khoa học (cơ, nhiệt, điện, từ, quang, hạt nhân).
     + Câu hỏi trả lời ngắn (Phần III) thường yêu cầu tính toán ra một giá trị đại lượng vật lí cụ thể kèm đơn vị SI chuẩn.
     + Câu hỏi tự luận giải bài toán vật lí nhiều bước có rubric tính điểm theo từng bước lập luận, viết công thức và thế số.
   - MÔN HÓA HỌC:
     + Bám sát thí nghiệm hóa học, hiện tượng phản ứng, tính toán hóa học gắn liền với sản xuất và đời sống.
     + Công thức và phương trình hóa học bọc chuẩn $...$ với điều kiện nhiệt độ, xúc tác và trạng thái khí/kết tủa.
   - MÔN SINH HỌC & KHTN:
     + Bám sát quy luật di truyền, cấu tạo tế bào, sinh thái học, cơ thể người hoặc các chủ đề liên môn lý - hóa - sinh.
   - MÔN LỊCH SỬ & ĐỊA LÍ:
     + Bám sát tư liệu lịch sử, nhân vật, sự kiện hoặc bảng số liệu thống kê, biểu đồ địa lí, liên hệ thực tiễn Việt Nam và thế giới.
10. ĐẶC BIỆT DÀNH CHO CÂU HỎI HÌNH HỌC VÀ ĐỒ THỊ HÀM SỐ:
   Nếu bài tập thuộc mạch HÌNH HỌC (hình học không gian, tam giác, hình chóp, lăng trụ, tứ diện, đường tròn, véctơ...) hoặc HÀM SỐ / VẼ ĐỒ THỊ (hàm bậc nhất, bậc hai, bậc ba, hàm nhất biến...):
   - BẮT BUỘC cung cấp chuỗi mã SVG chuẩn, trực quan trong trường "svgDiagram" (cho đề thi) và "solutionDiagramSvg" (cho phần đáp án / hướng dẫn giải chi tiết).
   - Mã SVG phải chứa thẻ <svg viewBox="0 0 400 300" ...>, màu sắc sắc nét, nét vẽ đứt đoạn cho nét khuất hình học (stroke-dasharray="4,4"), và các nhãn tên điểm / trục tọa độ ($A, B, C, D, S, H, Ox, Oy, O...$).`;
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
      durationMinutes,
      totalPoints,
      curriculum,
      examMode,
      questionCounts,
      cognitiveRatio,
    } = metadata;

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
2. TUYỆT ĐỐI KHÔNG đưa vào các dạng toán hay bài học thuộc chương/mục khác không có trong nguồn tài liệu này (Ví dụ: Nếu tài liệu ghi nhận bài học chưa có 'Hằng đẳng thức đáng nhớ' hay 'Phân thức đại số', tuyệt đối KHÔNG được ra câu hỏi liên quan đến hằng đẳng thức hay phân thức đại số).
`;
    }

    let subjectSpecificSection = '';
    const subCfg = metadata.subjectConfig || {};

    if (subject === 'Ngữ văn') {
      const pType = subCfg.readingPassageType || 'truyen';
      const pTypeLabel = pType === 'truyen' ? 'Truyện / Tản văn / Ký' : pType === 'tho' ? 'Thơ' : pType === 'nghi_luan' ? 'Nghị luận xã hội' : pType === 'thong_tin' ? 'Văn bản thông tin' : 'Tự do';
      const wGenre = subCfg.writingGenre || 'nghi_luan_xa_hoi';
      const wGenreLabel = wGenre === 'nghi_luan_xa_hoi' ? 'Nghị luận xã hội (viết đoạn văn hoặc bài văn ngắn)' : wGenre === 'nghi_luan_van_hoc' ? 'Nghị luận văn học (cảm nhận, phân tích đoạn trích)' : wGenre === 'tu_su' ? 'Tự sự / Kể chuyện' : wGenre === 'thuyet_minh' ? 'Thuyết minh' : 'Biểu cảm';
      subjectSpecificSection = `
📖 HƯỚNG DẪN ĐẶC THÙ MÔN NGỮ VĂN (BẮT BUỘC TUÂN THỦ 100%):
1. NGỮ LIỆU ĐỌC HIỂU:
   - Thể loại ngữ liệu yêu cầu: ${pTypeLabel}.
   - Ngữ liệu PHẢI LÀ văn bản/đoạn trích NGOÀI SÁCH GIÁO KHOA, có xuất xứ rõ ràng (Tác giả, tác phẩm, nhà xuất bản), giàu tính giáo dục và thẩm mỹ, phù hợp lứa tuổi ${grade}.
   - Trình bày ngữ liệu rõ ràng ngay đầu phần Đọc hiểu.
2. PHẦN TỰ LUẬN VIẾT:
   - Thể loại viết: ${wGenreLabel}.
   - Đề bài viết phải gắn với ngữ liệu đọc hiểu hoặc vấn đề tư tưởng, đạo lí, lối sống của giới trẻ hôm nay.
   - Thang điểm và Rubric phải bao gồm 4 tiêu chí rõ ràng: Đảm bảo hình thức (bố cục), Xác định đúng vấn đề, Triển khai lập luận dẫn chứng, Sáng tạo & chính tả ngữ pháp.
`;
    } else if (subject === 'Tiếng Anh') {
      const skills = (subCfg.englishSkills && subCfg.englishSkills.length > 0)
        ? subCfg.englishSkills.join(', ')
        : 'phonetics, grammar_vocab, reading, writing_transformation';
      subjectSpecificSection = `
🇬🇧 HƯỚNG DẪN ĐẶC THÙ MÔN TIẾNG ANH (BẮT BUỘC):
1. Toàn bộ câu hỏi, phương án lựa chọn và lời giải đều viết bằng TIẾNG ANH chuẩn quốc tế.
2. Trọng tâm kỹ năng: ${skills}.
3. Phần I (Multiple Choice) kiểm tra: Phonetics (Phát âm / Trọng âm), Vocabulary, Grammar, Communicative exchanges.
4. Đọc hiểu (Reading): Cung cấp 1 đoạn văn đọc hiểu (Reading passage) từ 150-250 từ chuẩn chủ đề bài học và các câu hỏi đọc hiểu thông tin chi tiết / ý chính.
5. Phần IV Tự luận (Writing): Yêu cầu viết lại câu (Sentence transformation with given words) hoặc viết đoạn văn ngắn (Writing a paragraph 80-120 words) có Rubric tính điểm từng ý.
`;
    } else if (subject === 'Vật lí') {
      const domain = subCfg.physicsDomain || 'tong_hop';
      subjectSpecificSection = `
⚡ HƯỚNG DẪN ĐẶC THÙ MÔN VẬT LÍ (BẮT BUỘC):
1. Lĩnh vực kiến thức: ${domain}.
2. Các câu hỏi phải gắn liền với hiện tượng vật lí tự nhiên, đời sống kỹ thuật và thí nghiệm.
3. Phần III (Trả lời ngắn): Yêu cầu tính toán ra một giá trị vật lí cụ thể kèm đơn vị SI (ví dụ: "12 m/s", "4.5 J", "220 V", "0.5 A").
4. Phần IV (Tự luận): Bài toán giải hiện tượng vật lí nhiều bước, Rubric tính điểm chi tiết cho từng bước: Viết công thức, Thay số, Tính toán ra kết quả và biện luận.
`;
    } else if (subject === 'Hóa học') {
      const domain = subCfg.chemistryDomain || 'tong_hop';
      subjectSpecificSection = `
🧪 HƯỚNG DẪN ĐẶC THÙ MÔN HÓA HỌC (BẮT BUỘC):
1. Lĩnh vực: ${domain}.
2. Mọi công thức hóa học, phương trình phản ứng hóa học bắt buộc bọc trong dấu $...$ (VD: $CH_3COOH$, $C_2H_5OH$, $H_2SO_4$, $CO_2\\uparrow$).
3. Bám sát câu hỏi thực nghiệm, phân biệt chất, hiệu suất phản ứng và ứng dụng đời sống sản xuất.
`;
    } else if (subject === 'Sinh học' || subject === 'KHTN') {
      subjectSpecificSection = `
🧬 HƯỚNG DẪN ĐẶC THÙ MÔN SINH HỌC / KHTN:
1. Bám sát các quá trình sinh học, di truyền, biến dị, sinh thái hoặc các hiện tượng KHTN tích hợp liên môn.
2. Khuyến khích đưa bảng số liệu thí nghiệm, sơ đồ phả hệ hoặc đồ thị sinh trưởng để rèn luyện năng lực phân tích cho học sinh.
`;
    } else if (subject === 'Lịch sử' || subject === 'Địa lí' || subject === 'Lịch sử và Địa lí') {
      subjectSpecificSection = `
🌍 HƯỚNG DẪN ĐẶC THÙ MÔN LỊCH SỬ & ĐỊA LÍ:
1. Khai thác tư liệu lịch sử, nhân vật, bối cảnh thời đại hoặc bảng số liệu thống kê địa lí, biểu đồ, liên hệ thực tiễn Việt Nam.
2. Đề cao câu hỏi đánh giá nguyên nhân, ý nghĩa, bài học kinh nghiệm và kỹ năng nhận xét số liệu.
`;
    }

    const hasCustomMatrix = Boolean(
      (metadata.customMatrixContext && metadata.customMatrixContext.trim()) ||
      (metadata.customMatrixImages && metadata.customMatrixImages.length > 0)
    );

    let matrixModeSection = '';
    if (hasCustomMatrix) {
      matrixModeSection = `
⚡⚡⚡ YÊU CẦU TỐI QUAN TRỌNG: RA ĐỀ ĐỘC QUYỀN THEO MA TRẬN BỘ MÔN (BỎ QUA CẤU TRÚC VÀ TỈ LỆ MẶC ĐỊNH) ⚡⚡⚡
Người dùng đã cung cấp khung Ma trận & Bản đặc tả bộ môn (dạng văn bản hoặc ảnh chụp đính kèm bên dưới).
BẠN BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC SAU ĐÂY:

1. ĐỌC KỸ TỪNG DÒNG, TỪNG CỘT CỦA MA TRẬN VÀ SỐ CÂU TƯƠNG ỨNG ĐỂ RA ĐỀ.
2. BỎ QUA HOÀN TOÀN MỤC CẤU TRÚC SỐ CÂU VÀ TỶ LỆ MỨC ĐỘ NHẬN THỨC MẶC ĐỊNH TRÊN HỆ THỐNG KHI ĐÃ CÓ MA TRẬN BỘ MÔN.
3. QUY TẮC PHÂN BIỆT RÕ RÀNG GIỮA "SỐ CÂU LỚN" VÀ "SỐ Ý" (ĐẶC BIỆT QUAN TRỌNG VỚI MA TRẬN THCS / THPT):
   - Nhiều ma trận (như môn Toán, KHTN cấp THCS/THPT) thường ghi chi tiết từng Ý con vào các ô đánh giá (Ví dụ: 13a, 13b, 13c, 13d; 14a, 14b, 14c, 14d; 15a, 15b, 15c, 15d; 16a, 16b; 18.1, 18.2):
     + PHẦN I (Nhiều lựa chọn): Mỗi số thứ tự (ví dụ: 1, 2, 3... 12) là 1 câu trắc nghiệm 4 lựa chọn (partType: "PART1", điểm mỗi câu thường là 0.25 điểm).
     + PHẦN II (Đúng - Sai): Các ý như 13a, 13b, 13c, 13d BẮT BUỘC ĐƯỢC GỘP CHUNG vào đúng 1 CÂU LỚN (Câu 13, partType: "PART2") chứa mảng "trueFalseStatements" gồm 4 ý a, b, c, d! Tương tự, 14a, 14b, 14c, 14d là Câu 14. Tổng cộng là 2 CÂU LỚN Đúng/Sai (2.0 điểm, mỗi câu 1.0đ chia cho 4 ý a, b, c, d). TUYỆT ĐỐI KHÔNG TÁCH các ý này thành từng câu riêng lẻ!
     + PHẦN III (Trả lời ngắn): Nếu ma trận ghi 15a, 15b, 15c, 15d hoặc các ý ngắn, hãy tạo thành 4 câu trả lời ngắn độc lập (partType: "PART3", đánh số từ 1 đến 4 trong Phần III) bám sát các đơn vị kiến thức tương ứng, với điểm số là 0.5 điểm/câu (Tổng Phần III = 2.0 điểm).
     + PHẦN IV (Tự luận): Nếu ma trận ghi 16a, 16b; 17; 18.1, 18.2, đây là 3 CÂU TỰ LUẬN LỚN (Câu 16, Câu 17, Câu 18, partType: "PART4") với tổng điểm là 3.0 điểm (mỗi câu khoảng 1.0đ):
       * Câu 16 (1.0đ): Trong "content" chia rõ 2 ý a) (0.5đ, Thông hiểu) và b) (0.5đ, Vận dụng).
       * Câu 17 (1.0đ): Vận dụng (1.0đ).
       * Câu 18 (1.0đ): Trong "content" chia rõ 2 ý 1) (0.5đ, Thông hiểu) và 2) (0.5đ, Vận dụng).
       * Kèm theo "essayAnswerGuide" giải chi tiết và mảng "rubric" chia điểm chính xác cho từng ý.
   - BẮT BUỘC SINH ĐỦ 100% TẤT CẢ CÁC CÂU THEO MA TRẬN TRÊN, KHÔNG ĐƯỢC THIẾU BẤT KỲ CÂU NÀO, KHÔNG DÙNG DẤU BA CHẤM (...).
4. ĐÁP ÁN ĐẦY ĐỦ CHO TẤT CẢ CÁC CÂU HỎI:
   - Phần I: Bắt buộc có "correctOption" (A, B, C hoặc D) và "explanation" giải thích chi tiết.
   - Phần II: Bắt buộc có "trueFalseStatements" gồm đúng 4 ý a, b, c, d với "content", "isCorrect": true/false và lời giải.
   - Phần III: Bắt buộc có "shortAnswer" là một đáp số cụ thể (ví dụ: "$15$", "$x = 3$", "24 cm") và lời giải.
   - Phần IV: Bắt buộc có "essayAnswerGuide" giải chi tiết từng bước và mảng "rubric" chia điểm cụ thể từng bước.
   - TUYỆT ĐỐI KHÔNG ĐỂ TRỐNG ĐÁP ÁN!
5. BẢNG "matrix" VÀ "specification" TRONG JSON KẾT QUẢ:
   - Phản ánh đúng khung ma trận đã cung cấp theo chuẩn Công văn 7991/BGDĐT (gồm 4 dạng thức part1, part2, part3, part4 theo 3 mức độ remember, understand, apply).
   - TỔNG ĐIỂM TOÀN BỘ ĐỀ THI PHẢI BẰNG ĐÚNG 10.0 ĐIỂM.
${metadata.customMatrixContext ? `
--------------------- NỘI DUNG MA TRẬN BỘ MÔN CUNG CẤP ---------------------
${metadata.customMatrixContext.trim()}
--------------------- KẾT THÚC MA TRẬN BỘ MÔN ---------------------
` : ''}
${metadata.customMatrixImages && metadata.customMatrixImages.length > 0 ? `
📸 ĐÃ ĐÍNH KÈM ${metadata.customMatrixImages.length} ẢNH CHỤP KHUNG MA TRẬN BỘ MÔN:
Hãy phân tích kỹ từng hàng, từng cột, các ô phân bổ số thứ tự câu hỏi và 3 mức độ đánh giá (Biết, Hiểu, Vận dụng) trong ảnh chụp ma trận để sinh đề bám sát 100%!
` : ''}
`;
    } else {
      matrixModeSection = `
📊 CẤU TRÚC SỐ LƯỢNG CÂU HỎI THEO DẠNG VÀ THANG ĐIỂM CHI TIẾT:
- Phần I (Trắc nghiệm 4 lựa chọn): ${questionCounts.part1_MCQSingle} câu (Mỗi câu ${questionCounts.part1_PointsPerQuestion ?? 0.25} điểm, Tổng = ${Math.round((questionCounts.part1_MCQSingle || 0) * (questionCounts.part1_PointsPerQuestion ?? 0.25) * 100) / 100}đ)
- Phần II (Trắc nghiệm Đúng/Sai): ${questionCounts.part2_MCQTrueFalse} câu (Mỗi câu ${questionCounts.part2_PointsPerQuestion ?? 1.0} điểm, gồm chính xác ${questionCounts.part2_TFStatementsPerQuestion ?? 4} ý Đúng/Sai, điểm chia đều: ${((questionCounts.part2_PointsPerQuestion ?? 1.0) / (questionCounts.part2_TFStatementsPerQuestion ?? 4)).toFixed(2)}đ/ý, Tổng = ${Math.round((questionCounts.part2_MCQTrueFalse || 0) * (questionCounts.part2_PointsPerQuestion ?? 1.0) * 100) / 100}đ)
- Phần III (Trắc nghiệm Trả lời ngắn): ${questionCounts.part3_MCQShort} câu (Mỗi câu ${questionCounts.part3_PointsPerQuestion ?? 0.25} điểm, Tổng = ${Math.round((questionCounts.part3_MCQShort || 0) * (questionCounts.part3_PointsPerQuestion ?? 0.25) * 100) / 100}đ)
- Phần IV (Tự luận): ${questionCounts.part4_Essay} câu tự luận.
  * BẮT BUỘC ĐẢM BẢO TỔNG ĐIỂM TOÀN ĐỀ THI LÀ ĐÚNG 10.0 ĐIỂM.
  * Tổng quỹ điểm dành cho Phần IV (Tự luận) là: ${Math.max(0, Math.round((10.0 - ((questionCounts.part1_MCQSingle || 0) * (questionCounts.part1_PointsPerQuestion ?? 0.25) + (questionCounts.part2_MCQTrueFalse || 0) * (questionCounts.part2_PointsPerQuestion ?? 1.0) + (questionCounts.part3_MCQShort || 0) * (questionCounts.part3_PointsPerQuestion ?? 0.25))) * 100) / 100)} điểm.
  * Phân bổ số câu và điểm số chi tiết từng câu Tự luận như sau:
    ${questionCounts.part4_Essay > 0 ? (() => {
      const p1 = (questionCounts.part1_MCQSingle || 0) * (questionCounts.part1_PointsPerQuestion ?? 0.25);
      const p2 = (questionCounts.part2_MCQTrueFalse || 0) * (questionCounts.part2_PointsPerQuestion ?? 1.0);
      const p3 = (questionCounts.part3_MCQShort || 0) * (questionCounts.part3_PointsPerQuestion ?? 0.25);
      const essayPool = Math.max(0, Math.round((10.0 - p1 - p2 - p3) * 100) / 100);
      const n = questionCounts.part4_Essay;
      const advCount = questionCounts.part4_AdvancedCount !== undefined ? questionCounts.part4_AdvancedCount : Math.floor(n / 2);
      const applyCount = n - advCount;
      const advPts = questionCounts.part4_AdvancedPoints !== undefined ? questionCounts.part4_AdvancedPoints : 1.0;
      const totalAdv = Math.min(essayPool, advCount * advPts);
      const remApply = essayPool - totalAdv;
      const applyPts = applyCount > 0 ? Math.round((remApply / applyCount) * 100) / 100 : 0;
      return `+ Gồm ${applyCount} câu Vận dụng (APPLY) với mức điểm khoảng ${applyPts}đ/câu và ${advCount} câu Vận dụng cao (ADVANCED) với mức điểm khoảng ${advPts}đ/câu.
    + TỔNG ĐIỂM TẤT CẢ CÁC CÂU TỰ LUẬN CỘNG LẠI PHẢI BẰNG CHÍNH XÁC ${essayPool} ĐIỂM (không được thiếu hay dư dù chỉ 0.25đ hoặc 0.5đ). Mỗi câu tự luận phải có trường "points" và các tiêu chí trong "rubric" phải có tổng điểm đúng bằng trường "points" của câu đó!`;
    })() : 'Không có phần Tự luận.'}

🎯 TỶ LỆ MỨC ĐỘ NHẬN THỨC:
- Nhận biết (REMEMBER): ${cognitiveRatio.remember}%
- Thông hiểu (UNDERSTAND): ${cognitiveRatio.understand}%
- Vận dụng (APPLY): ${cognitiveRatio.apply}%
- Vận dụng cao (ADVANCED): ${cognitiveRatio.advanced}%
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
- Tên bài / Chương / Chủ đề: ${chapterTitle}
- Bộ sách giáo khoa: ${curriculum}
- Thời gian làm bài: ${durationMinutes} phút
- Thang điểm tổng: ${totalPoints} điểm
- Chế độ đề: ${hasCustomMatrix ? '100% Theo Ma trận bộ môn (Bỏ qua cấu trúc và tỉ lệ mặc định)' : modeDescription}
${subjectSpecificSection}
${referenceSection}
${matrixModeSection}

🛑 CẢNH BÁO TỐI QUAN TRỌNG VỀ NỘI DUNG CÂU HỎI & PHƯƠNG ÁN LỰA CHỌN:
1. TUYỆT ĐỐI KHÔNG ĐƯỢC để placeholder như "Phương án A", "Phương án B", "Phương án C", "Phương án D"!
   - Mỗi phương án A, B, C, D BẮT BUỘC là nội dung câu trả lời thật, công thức thật, giá trị thật.
2. Mọi câu hỏi trắc nghiệm Phần I BẮT BUỘC có "correctOption" là một trong 4 chữ cái "A", "B", "C", "D" và "explanation" giải thích chi tiết.
3. Phần II (Đúng/Sai) BẮT BUỘC gồm đúng 4 ý a, b, c, d với "content", "isCorrect": true/false và lời giải.
4. Phần III (Trả lời ngắn) BẮT BUỘC có "shortAnswer" là một đáp số cụ thể (ví dụ: "$15$", "$x = 3$", "24 cm").
5. Phần IV (Tự luận) BẮT BUỘC có "essayAnswerGuide" giải chi tiết và mảng "rubric" chia điểm cụ thể từng bước.

YÊU CẦU ĐẦU RA JSON CHÍNH XÁC THEO SCHEMA SAU:
{
  "matrix": [
    {
      "stt": 1,
      "topic": "Chương I: Số tự nhiên",
      "subTopic": "Tập hợp, ghi số tự nhiên, thứ tự trong N",
      "part1": { "remember": "1, 2", "understand": "", "apply": "" },
      "part2": { "remember": "", "understand": "", "apply": "" },
      "part3": { "remember": "15a", "understand": "", "apply": "" },
      "part4": { "remember": "", "understand": "", "apply": "" },
      "totalRemember": 3,
      "totalUnderstand": 0,
      "totalApply": 0,
      "totalQuestions": 3,
      "totalPoints": 1.0,
      "percentage": 10.0
    }
  ],
  "specification": [
    {
      "stt": 1,
      "topic": "Chương I: Số tự nhiên",
      "subTopic": "Tập hợp, ghi số tự nhiên, thứ tự trong N",
      "requirements": "Nhận biết: Nhận biết được tập hợp, các phần tử của tập hợp, thứ tự trong N...",
      "part1": { "remember": "1, 2", "understand": "", "apply": "" },
      "part2": { "remember": "", "understand": "", "apply": "" },
      "part3": { "remember": "15a", "understand": "", "apply": "" },
      "part4": { "remember": "", "understand": "", "apply": "" },
      "totalPoints": 1.0
    }
  ],
  "questions": [
    // Ví dụ câu hỏi PHẦN I (Nhiều lựa chọn):
    {
      "id": "q-1",
      "partType": "PART1",
      "partTitle": "PHẦN I. Câu hỏi trắc nghiệm nhiều phương án lựa chọn",
      "number": 1,
      "content": "Cho tập hợp $A = \\{x \\in \\mathbb{N} \\mid 8 < x \\le 14\\}$. Số phần tử của tập hợp $A$ là:",
      "cognitiveLevel": "REMEMBER",
      "points": 0.25,
      "topic": "Tập hợp và phần tử",
      "options": [
        { "key": "A", "content": "$6$" },
        { "key": "B", "content": "$7$" },
        { "key": "C", "content": "$5$" },
        { "key": "D", "content": "$8$" }
      ],
      "correctOption": "A",
      "explanation": "Tập hợp $A = \\{9; 10; 11; 12; 13; 14\\}$ gồm $14 - 9 + 1 = 6$ phần tử. Chọn A."
    },
    // Ví dụ câu hỏi PHẦN II (Đúng/Sai):
    {
      "id": "q-13",
      "partType": "PART2",
      "partTitle": "PHẦN II. Câu hỏi trắc nghiệm Đúng/Sai",
      "number": 1,
      "content": "Cho số tự nhiên $n$. Xét tính đúng sai của các mệnh đề sau:",
      "cognitiveLevel": "UNDERSTAND",
      "points": 1.0,
      "topic": "Quan hệ chia hết",
      "trueFalseStatements": [
        { "key": "a", "content": "Nếu tổng hai số chia hết cho 5 thì mỗi số đều chia hết cho 5", "isCorrect": false },
        { "key": "b", "content": "Số 135 có chữ số tận cùng là 5 nên chia hết cho 5", "isCorrect": true },
        { "key": "c", "content": "Số có tổng các chữ số chia hết cho 9 thì chia hết cho 9", "isCorrect": true },
        { "key": "d", "content": "Số chia hết cho 2 luôn là số nguyên tố", "isCorrect": false }
      ],
      "explanation": "Ý a sai (ví dụ 2 + 3 = 5). Ý b đúng theo dấu hiệu chia hết cho 5. Ý c đúng theo tính chất chia hết cho 9. Ý d sai vì 4, 6, 8 là hợp số."
    },
    // Ví dụ câu hỏi PHẦN III (Trả lời ngắn):
    {
      "id": "q-15",
      "partType": "PART3",
      "partTitle": "PHẦN III. Câu hỏi trắc nghiệm trả lời ngắn",
      "number": 1,
      "content": "Tìm số tự nhiên $x$ biết $2 \\cdot (x + 10) = 40$.",
      "cognitiveLevel": "APPLY",
      "points": 0.5,
      "topic": "Thứ tự thực hiện phép tính",
      "shortAnswer": "10",
      "explanation": "$x + 10 = 40 : 2 = 20 \\Rightarrow x = 20 - 10 = 10$."
    },
    // Ví dụ câu hỏi PHẦN IV (Tự luận):
    {
      "id": "q-16",
      "partType": "PART4",
      "partTitle": "PHẦN IV. Tự luận",
      "number": 1,
      "content": "Một mảnh vườn hình chữ nhật có chiều dài 25 m, chiều rộng 18 m. Người ta dùng một phần đất để trồng hoa hình thoi có độ dài hai đường chéo lần lượt là 12 m và 8 m. Tính diện tích phần đất còn lại của mảnh vườn.",
      "cognitiveLevel": "APPLY",
      "points": 1.5,
      "topic": "Hình phẳng trong thực tiễn",
      "essayAnswerGuide": "Diện tích mảnh vườn: $25 \\times 18 = 450 \\text{ m}^2$. Diện tích phần đất trồng hoa: $\\frac{1}{2} \\times 12 \\times 8 = 48 \\text{ m}^2$. Diện tích còn lại: $450 - 48 = 402 \\text{ m}^2$.",
      "rubric": [
        { "criteria": "Tính diện tích hình chữ nhật", "points": 0.5, "description": "Viết công thức và tính ra $450 \\text{ m}^2$" },
        { "criteria": "Tính diện tích hình thoi", "points": 0.5, "description": "Viết công thức và tính ra $48 \\text{ m}^2$" },
        { "criteria": "Tính diện tích phần còn lại", "points": 0.5, "description": "Lấy hiệu hai diện tích ra $402 \\text{ m}^2$" }
      ],
      "explanation": "Đảm bảo học sinh ghi rõ đơn vị đo $\\text{m}^2$."
    }
  ]
}

🛑 QUY TẮC BẮT BUỘC VỀ SỐ LƯỢNG VÀ ĐÁP ÁN TRONG MẢNG "questions":
1. Mảng "questions" PHẢI CHỨA ĐỦ 100% TẤT CẢ CÁC CÂU HỎI THEO ĐÚNG MA TRẬN ĐÃ XÁC ĐỊNH (tuyệt đối không được thiếu câu, không cắt bớt, không bỏ dở).
2. TẤT CẢ các câu hỏi trong mảng "questions" đều BẮT BUỘC có đáp án, biểu điểm và lời giải chi tiết (Phần I có "correctOption", Phần II có đủ 4 ý Đúng/Sai, Phần III có "shortAnswer", Phần IV có "essayAnswerGuide" và mảng "rubric" chi tiết).
3. Đánh số lại thứ tự câu (number) bắt đầu từ 1 cho từng phần: Phần I câu 1..N, Phần II câu 1..M, Phần III câu 1..K, Phần IV câu 1..P.

📐 QUY TẮC BẮT BUỘC VỀ TRÌNH BÀY CÔNG THỨC TOÁN VÀ LATEX:
1. BẮT BUỘC BỌC TẤT CẢ công thức toán học, tập hợp, biến số, phép tính trong cặp dấu $...$ (ví dụ: $x$, $y$, $A$, $B = \\{x \\in \\mathbb{N} \\mid 15 \\le x < 28\\}$, $x \\vdots 12$, $4^2 \\cdot 5$, $S = 25 \\cdot 74 + 25 \\cdot 26 - 500$). TUYỆT ĐỐI KHÔNG để bất kỳ lệnh LaTeX hay biểu thức toán nào đứng ngoài cặp dấu $.
2. DÙNG '\\cdot' cho dấu nhân (ví dụ $4^2 \\cdot 5$, $25 \\cdot 74$), DÙNG '\\vdots' cho quan hệ chia hết (ví dụ $x \\vdots 12$ và $x \\vdots 18$), DÙNG '\\mid' cho gạch đứng biểu diễn tập hợp (ví dụ $x \\in \\mathbb{N} \\mid 15 \\le x < 28$), DÙNG '\\le', '\\ge' cho nhỏ hơn/lớn hơn hoặc bằng (ví dụ $8 < x \\le 14$).
3. Với tập hợp số, dùng '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{R}'. Toàn bộ tên tập hợp và biểu thức tập hợp PHẢI bọc trong dấu $, ví dụ: $A = \\{x \\in \\mathbb{N} \\mid 8 < x \\le 14\\}$.
`;
  }
}

