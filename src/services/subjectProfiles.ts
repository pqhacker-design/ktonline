import { SubjectType, ExamMode, QuestionCounts } from '../types';

export interface SubjectFeatureBadge {
  label: string;
  desc: string;
  highlight?: boolean;
}

export interface SubjectProfile {
  id: SubjectType;
  name: string;
  category: 'HUMANITIES' | 'STEM' | 'LANGUAGE' | 'SOCIAL' | 'APPLIED';
  shortDesc: string;
  defaultDuration: number;
  defaultExamMode: ExamMode;
  recommendedQuestionCounts: QuestionCounts;
  features: SubjectFeatureBadge[];
  sampleTopicsByGrade: Record<string, string[]>;
  sampleChaptersByGrade: Record<string, string>;
  genreOptions?: { id: string; label: string }[];
  focusAreaOptions?: { id: string; label: string }[];
  promptRules: string;
}

export const SUBJECT_PROFILES: Record<string, SubjectProfile> = {
  'Ngữ văn': {
    id: 'Ngữ văn',
    name: 'Ngữ văn',
    category: 'HUMANITIES',
    shortDesc: 'Đổi mới đánh giá năng lực Đọc hiểu văn bản ngoài SGK & Viết đoạn văn, bài văn nghị luận kèm Rubric 5 tiêu chí của Bộ GD&ĐT.',
    defaultDuration: 90,
    defaultExamMode: 'MCQ_ESSAY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 8,
      part1_PointsPerQuestion: 0.25, // 2.0 điểm
      part2_MCQTrueFalse: 2,
      part2_PointsPerQuestion: 1.0, // 2.0 điểm
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 0,
      part3_PointsPerQuestion: 0.25,
      part4_Essay: 2, // 6.0 điểm: 1 câu viết đoạn 200 chữ (2.0đ) + 1 câu viết bài 600 chữ (4.0đ)
      part4_ApplyCount: 1,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 4.0,
    },
    features: [
      { label: 'Ngữ liệu ngoài SGK', desc: 'Văn bản đọc hiểu mới, giàu tính nhân văn, ghi rõ tác giả & xuất xứ', highlight: true },
      { label: '4 mức độ Đọc hiểu', desc: 'Từ nhận diện chi tiết, biện pháp tu từ đến thông điệp và liên hệ' },
      { label: 'Viết đoạn văn (200 chữ)', desc: 'Nghị luận xã hội rút ra từ ngữ liệu đọc hiểu', highlight: true },
      { label: 'Viết bài văn (600 chữ)', desc: 'Phân tích nghệ thuật & nội dung hoặc bàn luận hiện tượng đời sống', highlight: true },
      { label: 'Rubric 5 tiêu chí BGDĐT', desc: 'Hình thức, vấn đề, luận điểm/dẫn chứng, chính tả/ngữ pháp, sáng tạo' },
      { label: 'Chống công thức Toán', desc: 'Tuyệt đối không chèn ký hiệu LaTeX $ vào câu hỏi môn Văn' },
    ],
    genreOptions: [
      { id: 'truyen', label: 'Truyện ngắn / Trích đoạn tiểu thuyết / Truyện đồng thoại' },
      { id: 'tho', label: 'Thơ (Thơ tự do, 5 chữ, 7 chữ, lục bát...)' },
      { id: 'nghi_luan', label: 'Văn bản nghị luận xã hội / tư tưởng đạo lý' },
      { id: 'thong_tin', label: 'Văn bản thông tin / Văn bản thuyết minh nhật dụng' },
      { id: 'ky', label: 'Ký / Tản văn / Tùy bút' },
    ],
    sampleChaptersByGrade: {
      'Khối 6': 'Chủ đề: Lắng nghe lịch sử nước mình / Bài học đường đời đầu tiên',
      'Khối 7': 'Chủ đề: Bầu trời tuổi thơ / Khúc nhạc tâm hồn',
      'Khối 8': 'Chủ đề: Sắc điệu thi ca / Những gương mặt thân yêu',
      'Khối 9': 'Chủ đề: Vẻ đẹp của thơ ca cổ điển và hiện đại',
      'Khối 10': 'Chủ đề: Sức sống của thần thoại và sử thi / Bản hòa âm ngôn từ',
      'Khối 11': 'Chủ đề: Khát vọng tự do và tình yêu trong thơ ca hiện đại',
      'Khối 12': 'Chủ đề: Khát vọng cống hiến và số phận con người trong văn xuôi',
    },
    sampleTopicsByGrade: {
      'Khối 6': [
        'Văn bản đọc hiểu: Đoạn trích truyện ngoài SGK về tình mẫu tử, lòng nhân ái',
        'Tiếng Việt: Biện pháp tu từ so sánh, nhân hóa, ẩn dụ',
        'Viết đoạn văn: Cảm nghĩ về tình cảm gia đình hoặc một phẩm chất đạo đức (khoảng 150-200 chữ)',
        'Viết bài văn: Kể lại một trải nghiệm đáng nhớ của bản thân',
      ],
      'Khối 7': [
        'Văn bản đọc hiểu: Bài thơ trữ tình thể 5 chữ hoặc 7 chữ ngoài SGK',
        'Tiếng Việt: Mở rộng thành phần chính của câu, từ Hán Việt',
        'Viết đoạn văn: Bày tỏ suy nghĩ về thông điệp yêu thiên nhiên / quê hương (khoảng 200 chữ)',
        'Viết bài văn: Phân tích đặc sắc nội dung và nghệ thuật của bài thơ',
      ],
      'Khối 8': [
        'Văn bản đọc hiểu: Văn bản nghị luận đời sống ngoài SGK về lòng biết ơn',
        'Tiếng Việt: Đoạn văn diễn dịch, quy nạp, song song',
        'Viết đoạn văn: Bàn về trách nhiệm của học sinh đối với cộng đồng (khoảng 200 chữ)',
        'Viết bài văn: Nghị luận về một vấn đề đời sống xã hội',
      ],
      'Khối 9': [
        'Văn bản đọc hiểu: Đoạn trích truyện ngắn hiện đại ngoài SGK',
        'Tiếng Việt: Khởi ngữ, các thành phần biệt lập, liên kết câu',
        'Viết đoạn văn: Nghị luận về ý chí vượt khó của thế hệ trẻ (khoảng 200 chữ)',
        'Viết bài văn: Nghị luận văn học về một đoạn trích hoặc nhân vật',
      ],
      'Khối 10': [
        'Văn bản đọc hiểu: Ngữ liệu ngoài SGK thể loại sử thi hoặc truyện thơ dân gian',
        'Tiếng Việt: Lỗi dùng từ, lỗi trật tự từ và biện pháp khắc phục',
        'Viết đoạn văn: Bàn về lối sống có lý tưởng của thanh niên (khoảng 200 chữ)',
        'Viết bài văn: Phân tích, đánh giá chủ đề và hình thức nghệ thuật của tác phẩm truyện',
      ],
      'Khối 11': [
        'Văn bản đọc hiểu: Bài thơ mới lãng mạn hoặc hiện thực ngoài SGK',
        'Tiếng Việt: Biện pháp tu từ lặp cấu trúc, đối ngữ',
        'Viết đoạn văn: Bàn về ý nghĩa của sự thấu cảm trong cuộc sống hiện đại (khoảng 200 chữ)',
        'Viết bài văn: Phân tích giá trị tư tưởng và phong cách nghệ thuật của tác giả',
      ],
      'Khối 12': [
        'Văn bản đọc hiểu: Ngữ liệu nhật dụng / văn bản thông tin hoặc tản văn đương đại',
        'Tiếng Việt: Giữ gìn sự trong sáng của tiếng Việt, phong cách ngôn ngữ báo chí',
        'Viết đoạn văn: Nghị luận xã hội về tinh thần tự học trong kỷ nguyên số (khoảng 200 chữ)',
        'Viết bài văn: Nghị luận văn học so sánh hai hình tượng hoặc phân tích chiều sâu triết lý tác phẩm',
      ],
    },
    promptRules: `
================================================================================
📜 HƯỚNG DẪN ĐẶC THÙ BẮT BUỘC CHO MÔN NGỮ VĂN (CT GDPT 2018 & CÔNG VĂN 7991):
================================================================================
1. NGUYÊN TẮC NGỮ LIỆU ĐỌC HIỂU (READING PASSAGE):
   - Ngữ liệu BẮT BUỘC là văn bản MỚI NGOÀI SÁCH GIÁO KHOA, không dùng các bài đọc đã có sẵn trong SGK hiện hành.
   - Thể loại phong phú: Truyện ngắn, đoạn trích tiểu thuyết, thơ trữ tình, ký, tản văn, văn bản nghị luận xã hội hoặc văn bản thông tin.
   - BẮT BUỘC TRÍCH DẪN NGUỒN CHUẨN XÁC: Ghi rõ "(Trích [Tên tác phẩm], [Tên tác giả], NXB [Tên NXB], [Năm xuất bản] hoặc [Nguồn báo chí/tạp chí uy tín])" ngay dưới văn bản đọc hiểu.
   - Ngữ liệu phải có dung lượng phù hợp: 250 - 450 chữ (văn xuôi) hoặc 12 - 24 dòng (thơ), ngôn từ trong sáng, giàu tính nhân văn, hướng thiện.
   - ĐẶT NGỮ LIỆU ĐỌC HIỂU ở phần mở đầu của đề, hoặc trong trường "content" của câu hỏi đầu tiên kèm lời dẫn rõ ràng: "Đọc ngữ liệu sau và trả lời các câu hỏi từ câu... đến câu...:".

2. CẤU TRÚC ĐỀ THI NGỮ VĂN ĐẶC THÙ (CHUẨN 10.0 ĐIỂM):
   - PHẦN I (ĐỌC HIỂU - 4.0 ĐIỂM): Gồm các câu hỏi trắc nghiệm (Phần I & Phần II) hoặc câu hỏi tự luận ngắn:
     + Nhận biết (REMEMBER): Xác định thể thơ, ngôi kể, phương thức biểu đạt chính, chi tiết/hình ảnh trực tiếp trong văn bản, biện pháp tu từ được sử dụng.
     + Thông hiểu (UNDERSTAND): Hiểu ý nghĩa của hình ảnh/từ ngữ, tác dụng của biện pháp tu từ trong việc bộc lộ cảm xúc, nội dung chính của đoạn thơ/truyện, thái độ và tình cảm của tác giả.
     + Vận dụng (APPLY): Bài học cuộc sống sâu sắc nhất rút ra từ ngữ liệu, thông điệp tích cực, cách ứng xử trong hoàn cảnh cụ thể.
   - PHẦN II (LÀM VĂN / VIẾT - 6.0 ĐIỂM - NẰM Ở PHẦN IV TỰ LUẬN):
     + Câu 1 (Viết đoạn văn khoảng 200 chữ - 2.0 điểm): Viết đoạn văn nghị luận xã hội bàn về một vấn đề tư tưởng đạo lý, kỹ năng sống hoặc lối ứng xử gợi ra trực tiếp từ ngữ liệu đọc hiểu.
     + Câu 2 (Viết bài văn khoảng 600 chữ - 4.0 điểm): Viết bài văn hoàn chỉnh phân tích, đánh giá nét đặc sắc về nội dung và nghệ thuật của ngữ liệu đọc hiểu; HOẶC bàn luận sâu sắc về một hiện tượng xã hội thời sự.

3. HƯỚNG DẪN CHẤM & RUBRIC ĐẶC THÙ MÔN NGỮ VĂN (5 TIÊU CHÍ BỘ GD&ĐT):
   Trong trường "rubric" và "essayAnswerGuide" của từng câu tự luận làm văn, BẮT BUỘC chấm theo 5 tiêu chí:
   a. Đảm bảo cấu trúc đoạn văn / bài văn (0.25đ): Đoạn văn có mở đoạn, thân đoạn, kết đoạn (không ngắt dòng); Bài văn đủ 3 phần Mở bài, Thân bài, Kết bài.
   b. Xác định đúng vấn đề cần nghị luận (0.5đ): Nêu trúng vấn đề trọng tâm, không lạc đề hay lan man.
   c. Triển khai vấn đề nghị luận (Điểm chính 1.0đ - 2.5đ):
      - Luận điểm rõ ràng, lập luận chặt chẽ, thuyết phục.
      - Dẫn chứng thực tế, sinh động, giàu sức thuyết phục.
      - Có phản đề hoặc mở rộng vấn đề hợp lý.
   d. Chính tả, ngữ pháp (0.25đ): Đảm bảo chuẩn chính tả, dùng từ đúng nghĩa, viết câu đúng ngữ pháp tiếng Việt.
   e. Sáng tạo (0.5đ): Có suy nghĩ sâu sắc, thể hiện chính kiến riêng tích cực, diễn đạt mới mẻ, giàu hình ảnh và cảm xúc.

4. TUYỆT ĐỐI CHỐNG LỖI HIỂN THỊ TRONG MÔN NGỮ VĂN:
   - TUYỆT ĐỐI KHÔNG dùng dấu $ hoặc công thức LaTeX cho môn Ngữ văn. Toàn bộ chữ viết dùng tiếng Việt có dấu chuẩn Unicode.
   - KHÔNG ép học sinh trả lời theo một khuôn mẫu cảm thụ cứng nhắc, các câu hỏi vận dụng cần có độ mở để học sinh tự do bày tỏ quan điểm.
`,
  },

  'Tiếng Anh': {
    id: 'Tiếng Anh',
    name: 'Tiếng Anh',
    category: 'LANGUAGE',
    shortDesc: 'Đề thi 100% bằng tiếng Anh chuẩn CEFR (A2-B1-B2), đa dạng dạng bài: Ngữ âm, Ngữ pháp, Giao tiếp, Điền từ, Đọc hiểu, Biến đổi câu.',
    defaultDuration: 50,
    defaultExamMode: 'MCQ_ONLY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 24, // 6.0 điểm
      part1_PointsPerQuestion: 0.25,
      part2_MCQTrueFalse: 2, // 2.0 điểm (mỗi câu 4 ý True/False đọc hiểu)
      part2_PointsPerQuestion: 1.0,
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 4, // 1.0 điểm (Sentence transformation / word formation)
      part3_PointsPerQuestion: 0.25,
      part4_Essay: 1, // 1.0 điểm (Viết đoạn văn ngắn bằng tiếng Anh 100-120 từ)
      part4_ApplyCount: 0,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 1.0,
    },
    features: [
      { label: '100% Tiếng Anh', desc: 'Toàn bộ câu hỏi, phương án A/B/C/D và bài đọc chuẩn ngữ pháp tiếng Anh', highlight: true },
      { label: 'Phonetics & Stress', desc: 'Phát âm đuôi -s/es, -ed, nguyên âm, phụ âm và trọng âm 2-3 âm tiết', highlight: true },
      { label: 'Lexico-Grammar', desc: 'Từ vựng, thì, câu bị động, điều kiện, mệnh đề quan hệ, collocations, phrasal verbs' },
      { label: 'Guided Cloze Test', desc: 'Bài đọc điền từ vào chỗ trống trong đoạn văn 150-200 từ' },
      { label: 'Reading Comprehension', desc: 'Đoạn văn đọc hiểu 200-350 từ bám sát chủ đề với 5-7 câu hỏi năng lực', highlight: true },
      { label: 'Sentence Rewrite', desc: 'Viết lại câu giữ nguyên nghĩa, nối câu, tìm lỗi sai' },
      { label: 'Giải thích song ngữ', desc: 'Phần explanation có dịch nghĩa và giải thích ngữ pháp chi tiết' },
    ],
    focusAreaOptions: [
      { id: 'phonetics', label: 'Ngữ âm & Trọng âm (Pronunciation & Stress)' },
      { id: 'grammar_vocab', label: 'Từ vựng & Ngữ pháp (Grammar & Vocabulary in context)' },
      { id: 'communication', label: 'Giao tiếp hàng ngày (Everyday Communication)' },
      { id: 'reading_cloze', label: 'Đọc điền từ (Guided Cloze Test)' },
      { id: 'reading_comprehension', label: 'Đọc hiểu đoạn văn (Reading Comprehension Passages)' },
      { id: 'sentence_rewrite', label: 'Viết & Chuyển đổi câu (Sentence Transformation & Combining)' },
      { id: 'error_identification', label: 'Tìm lỗi sai trong câu (Error Identification)' },
    ],
    sampleChaptersByGrade: {
      'Khối 6': 'Unit 1-3: My New School, My Home, My Friends',
      'Khối 7': 'Unit 1-3: Hobbies, Healthy Living, Community Service',
      'Khối 8': 'Unit 1-3: Leisure Time, Life in the Countryside, Teenagers',
      'Khối 9': 'Unit 1-3: Local Environment, City Life, Teen Stress and Pressure',
      'Khối 10': 'Unit 1-3: Family Life, Humans and the Environment, Music',
      'Khối 11': 'Unit 1-3: A Long and Healthy Life, The Generation Gap, Cities of the Future',
      'Khối 12': 'Unit 1-3: Life Stories, A Multicultural World, Green Living',
    },
    sampleTopicsByGrade: {
      'Khối 6': [
        'Phonetics: Pronunciation of sounds /s/, /z/, /ɪz/ and vowels /ɑː/, /ʌ/',
        'Grammar: Present simple, Present continuous, Possessive case',
        'Vocabulary: School things, rooms and furniture, personality adjectives',
        'Reading: Short passage (100-120 words) about a school day with comprehension questions',
        'Writing: Rearrange words to form complete sentences',
      ],
      'Khối 7': [
        'Phonetics: Pronunciation of /f/, /v/, /t/, /d/, /ɪd/ for regular past tense',
        'Grammar: Past simple, Simple sentences with coordinating conjunctions (and, but, so)',
        'Vocabulary: Hobbies, health problems, community volunteer activities',
        'Reading: Cloze test and Reading passage about volunteering and healthy eating',
        'Writing: Sentence transformation with "used to" or conjunctions',
      ],
      'Khối 8': [
        'Phonetics: Clusters /bl/, /cl/, /br/, /cr/ and stress in words ending in -ion, -ian',
        'Grammar: Comparative adverbs, Verbs of liking followed by gerund/to-infinitive',
        'Vocabulary: Leisure activities, rural lifestyle, teen forum',
        'Reading: Reading comprehension passage (180-220 words) about life in a modern village',
        'Writing: Write sentences using cues or rewrite with equivalent meaning',
      ],
      'Khối 9': [
        'Phonetics: Stress on 2-syllable and 3-syllable nouns, adjectives and verbs',
        'Grammar: Complex sentences (adverb clauses of purpose, concession, reason), Phrasal verbs',
        'Vocabulary: Traditional crafts, metropolitan problems, stress management',
        'Reading: Cloze test + Reading passage about urban challenges and traditional crafts',
        'Writing: Sentence rewrite using "suggest", "although", "in spite of", "so that"',
      ],
      'Khối 10': [
        'Phonetics: Pronunciation of consonant blends /pr/, /br/, /tr/, /dr/ and stress in 2-syllable words',
        'Grammar: Present perfect vs Past simple, Passive voice, Compound sentences',
        'Vocabulary: Family routines, carbon footprint, musical genres',
        'Reading: 2 reading passages (250-300 words) on eco-friendly lifestyle and music',
        'Writing: Sentence combination and paragraph writing (100 words) about family values',
      ],
      'Khối 11': [
        'Phonetics: Strong and weak forms of auxiliary verbs, Intonation in tag questions',
        'Grammar: Modal verbs in past (must have, should have), Linking verbs, Stative verbs in continuous',
        'Vocabulary: Longevity, generation gap, smart city technologies',
        'Reading: Academic cloze test + Reading text on artificial intelligence and future cities',
        'Writing: Rewrite sentences using cleft sentences "It is/was... that..." or participle clauses',
      ],
      'Khối 12': [
        'Phonetics: Elision of vowels and consonants, Sentence stress in connected speech',
        'Grammar: Inversion with negative adverbials, Subjunctive mood, Mixed conditionals',
        'Vocabulary: Inspirational figures, cultural diversity, sustainability',
        'Reading: 2 reading passages with advanced question types (Main idea, Inference, Vocabulary in context)',
        'Writing: Error identification and sentence transformation with advanced grammar',
      ],
    },
    promptRules: `
================================================================================
🇬🇧 HƯỚNG DẪN ĐẶC THÙ BẮT BUỘC CHO MÔN TIẾNG ANH (ENGLISH LANGUAGE - CV 7991):
================================================================================
1. NGUYÊN TẮC NGÔN NGỮ (LANGUAGE INTEGRITY):
   - TOÀN BỘ tiêu đề câu hỏi, lệnh hỏi, đoạn văn bản, 4 phương án lựa chọn A/B/C/D BẮT BUỘC 100% BẰNG TIẾNG ANH CHUẨN MỰC, TỰ NHIÊN, KHÔNG LỖI NGỮ PHÁP.
   - Độ khó bám sát Khung Năng Lực Ngoại Ngữ 6 Bậc Việt Nam / CEFR:
     + Khối 6-7: Bậc 1 - 2 (A1 - A2)
     + Khối 8-9: Bậc 2 - 3 (A2 - B1)
     + Khối 10-12: Bậc 3 - 4 (B1 - B2).

2. CÁC DẠNG CÂU HỎI ĐẶC THÙ MÔN TIẾNG ANH BẮT BUỘC CÓ TRONG ĐỀ:
   - Dạng 1: PHONETICS (Phát âm & Trọng âm):
     + "Mark the letter A, B, C, or D on your answer sheet to indicate the word whose underlined part differs from the other three in pronunciation in each of the following questions."
       (Gợi ý: Dùng dấu gạch dưới hoặc in hoa phần phát âm kiểm tra, ví dụ: "A. play<u>ed</u>  B. clean<u>ed</u>  C. want<u>ed</u>  D. stay<u>ed</u>").
     + "Mark the letter A, B, C, or D on your answer sheet to indicate the word that differs from the other three in the position of primary stress in each of the following questions."
   - Dạng 2: LEXICO-GRAMMAR (Từ vựng, Ngữ pháp & Cụm từ):
     + Các câu hỏi trắc nghiệm kiểm tra thì động từ, câu bị động, câu điều kiện, mệnh đề quan hệ, giới từ, mạo từ, collocations, phrasal verbs, word form.
   - Dạng 3: EVERYDAY COMMUNICATION (Tình huống giao tiếp):
     + Đối thoại giao tiếp thực tế (chúc mừng, xin lỗi, đề nghị giúp đỡ, bày tỏ quan điểm).
   - Dạng 4: SYNONYMS & ANTONYMS:
     + "Mark the letter A, B, C, or D to indicate the word(s) CLOSEST in meaning to the underlined word(s)..."
     + "Mark the letter A, B, C, or D to indicate the word(s) OPPOSITE in meaning to the underlined word(s)..."
   - Dạng 5: GUIDED CLOZE TEST (Bài đọc điền từ vào đoạn văn):
     + Một đoạn văn hoàn chỉnh (150-200 từ) có đánh số chỗ trống (1), (2), (3)... kèm 4 phương án lựa chọn cho từng chỗ trống.
   - Dạng 6: READING COMPREHENSION (Bài đọc hiểu đoạn văn):
     + Đoạn văn đọc hiểu độc lập (200-350 từ) về chủ đề khoa học, môi trường, đời sống, văn hóa.
     + Câu hỏi đọc hiểu bao gồm:
       * Main idea / Best title
       * Factual / Detail question ("According to the passage,...")
       * Vocabulary in context ("The word '...' in paragraph 2 is closest in meaning to...")
       * Reference pronoun ("The word 'they' in paragraph 3 refers to...")
       * Inference question ("Which of the following can be inferred from the passage?")
   - Dạng 7: SENTENCE TRANSFORMATION & WRITING (Phần III & IV):
     + Viết lại câu giữ nguyên nghĩa bắt đầu bằng từ gợi ý (Rewrite the sentences without changing their meanings).
     + Nối hai câu đơn thành một câu ghép/phức hợp.
     + Viết đoạn văn ngắn 100-120 từ theo chủ đề bài học.

3. HƯỚNG DẪN GIẢI & GIẢI THÍCH (EXPLANATION):
   - Trong trường "explanation", BẮT BUỘC cung cấp:
     + Bản dịch nghĩa tiếng Việt của câu hỏi/đoạn văn.
     + Phân tích ngữ pháp hoặc giải nghĩa từ vựng cụ thể để học sinh hiểu rõ TẠI SAO chọn phương án đó.
     + Cấu trúc ngữ pháp trọng tâm liên quan (Ví dụ: "Cấu trúc: S + would rather + V-inf...").
`,
  },

  'Toán': {
    id: 'Toán',
    name: 'Toán học',
    category: 'STEM',
    shortDesc: 'Chuẩn hóa công thức Toán học KaTeX, hệ phương trình, hình học không gian, đồ thị hàm số và mã vẽ SVG trực quan.',
    defaultDuration: 90,
    defaultExamMode: 'MCQ_ESSAY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 12,
      part1_PointsPerQuestion: 0.25, // 3.0đ
      part2_MCQTrueFalse: 4,
      part2_PointsPerQuestion: 1.0, // 4.0đ
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 6,
      part3_PointsPerQuestion: 0.25, // 1.5đ
      part4_Essay: 2,
      part4_ApplyCount: 1,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 1.0, // 1.5đ
    },
    features: [
      { label: 'Chuẩn KaTeX 100%', desc: 'Công thức toán học bọc trong $...$, phân số \\frac, căn thức \\sqrt, chia hết \\vdots', highlight: true },
      { label: 'Hệ phương trình chuẩn', desc: 'Dùng \\begin{cases}...\\end{cases} xuống dòng đúng chuẩn' },
      { label: 'Hình vẽ SVG trực quan', desc: 'Tự động sinh mã SVG cho hình học không gian, tam giác, đồ thị hàm số', highlight: true },
      { label: '4 mức độ nhận thức', desc: 'Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao cân đối theo ma trận' },
    ],
    sampleChaptersByGrade: {
      'Khối 6': 'Chương I: Tập hợp các số tự nhiên',
      'Khối 7': 'Chương I: Số hữu tỉ / Hình học: Góc và đường thẳng song song',
      'Khối 8': 'Chương I: Đa thức / Hình học: Tứ giác',
      'Khối 9': 'Chương I: Phương trình và hệ hai phương trình bậc nhất hai ẩn',
      'Khối 10': 'Chương I: Mệnh đề và tập hợp / Bất phương trình bậc nhất hai ẩn',
      'Khối 11': 'Chương I: Hàm số lượng giác và phương trình lượng giác',
      'Khối 12': 'Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
    },
    sampleTopicsByGrade: {
      'Khối 6': ['Bài 1: Tập hợp các số tự nhiên', 'Bài 2: Các phép tính trong tập hợp số tự nhiên', 'Bài 3: Lũy thừa với số mũ tự nhiên'],
      'Khối 7': ['Bài 1: Tập hợp các số hữu tỉ', 'Bài 2: Cộng, trừ, nhân, chia số hữu tỉ', 'Bài 3: Lũy thừa của một số hữu tỉ'],
      'Khối 8': ['Bài 1: Đơn thức và đa thức nhiều biến', 'Bài 2: Các phép tính với đa thức nhiều biến', 'Bài 3: Hằng đẳng thức đáng nhớ'],
      'Khối 9': ['Bài 1: Khái niệm phương trình bậc nhất hai ẩn', 'Bài 2: Giải hệ hai phương trình bậc nhất hai ẩn', 'Bài 3: Giải bài toán bằng cách lập hệ phương trình'],
      'Khối 10': ['Bài 1: Mệnh đề toán học', 'Bài 2: Tập hợp và các phép toán trên tập hợp', 'Bài 3: Bất phương trình bậc nhất hai ẩn'],
      'Khối 11': ['Bài 1: Giá trị lượng giác của góc lượng giác', 'Bài 2: Công thức lượng giác', 'Bài 3: Hàm số lượng giác và đồ thị'],
      'Khối 12': ['Bài 1: Tính đơn điệu và cực trị của hàm số', 'Bài 2: Giá trị lớn nhất và nhỏ nhất của hàm số', 'Bài 3: Đường tiệm cận của đồ thị hàm số'],
    },
    promptRules: `
================================================================================
📐 HƯỚNG DẪN ĐẶC THÙ CHO MÔN TOÁN HỌC:
================================================================================
- Bọc toàn bộ biểu thức toán học, biến số, tập hợp trong dấu $...$.
- Dùng '\\frac{a}{b}', '\\sqrt{x}', '\\cdot', '\\vdots', '\\begin{cases}...\\end{cases}'.
- Nếu là bài toán hình học hoặc đồ thị, BẮT BUỘC tạo chuỗi mã SVG chuẩn trong 'svgDiagram' và 'solutionDiagramSvg'.
`,
  },

  'KHTN': {
    id: 'KHTN',
    name: 'KHTN (Vật lí, Hóa học, Sinh học)',
    category: 'STEM',
    shortDesc: 'Khoa học tự nhiên THCS tích hợp Vật lí - Hóa học - Sinh học, danh pháp IUPAC mới, chuẩn đơn vị SI.',
    defaultDuration: 60,
    defaultExamMode: 'MCQ_ESSAY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 16,
      part1_PointsPerQuestion: 0.25, // 4.0đ
      part2_MCQTrueFalse: 3,
      part2_PointsPerQuestion: 1.0, // 3.0đ
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 4,
      part3_PointsPerQuestion: 0.25, // 1.0đ
      part4_Essay: 2,
      part4_ApplyCount: 1,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 1.0, // 2.0đ
    },
    features: [
      { label: 'Danh pháp IUPAC mới', desc: 'Dùng tên quốc tế: oxygen, hydrogen, ethanoic acid, sodium chloride...', highlight: true },
      { label: 'Đơn vị chuẩn SI', desc: 'm/s, m/s², N, J, W, Pa, mol, g/mol...' },
      { label: 'Phương trình hóa học', desc: 'Bọc trong $...$, mũi tên phản ứng, điều kiện nhiệt độ/xúc tác' },
      { label: 'Thực nghiệm & Ứng dụng', desc: 'Gắn liền hiện tượng thực tế đời sống và bảo vệ môi trường' },
    ],
    sampleChaptersByGrade: {
      'Khối 6': 'Chủ đề: Chất và sự biến đổi của chất / Năng lượng và sự biến đổi',
      'Khối 7': 'Chủ đề: Nguyên tử - Nguyên tố hóa học / Tốc độ chuyển động',
      'Khối 8': 'Chủ đề: Phản ứng hóa học và mol / Lực và áp suất',
      'Khối 9': 'Chủ đề: Kim loại và phi kim / Năng lượng và biến đổi khí hậu',
    },
    sampleTopicsByGrade: {
      'Khối 6': ['Bài 1: Sự đa dạng của chất', 'Bài 2: Các thể của chất và sự chuyển thể', 'Bài 3: Oxygen và không khí'],
      'Khối 7': ['Bài 1: Mô hình nguyên tử Rutherford - Bohr', 'Bài 2: Nguyên tố hóa học', 'Bài 3: Bảng tuần hoàn các nguyên tố hóa học'],
      'Khối 8': ['Bài 1: Biến đổi vật lí và biến đổi hóa học', 'Bài 2: Phản ứng hóa học', 'Bài 3: Định luật bảo toàn khối lượng và phương trình hóa học'],
      'Khối 9': ['Bài 1: Tính chất hóa học của kim loại', 'Bài 2: Dãy hoạt động hóa học của kim loại', 'Bài 3: Tách kim loại và sử dụng hợp kim'],
    },
    promptRules: `
================================================================================
🔬 HƯỚNG DẪN ĐẶC THÙ CHO MÔN KHTN / VẬT LÍ / HÓA HỌC / SINH HỌC:
================================================================================
- BẮT BUỘC sử dụng danh pháp hóa học quốc tế IUPAC mới: Ví dụ methanol, ethanol, acetic acid thay vì tên cũ.
- Các công thức hóa học, phương trình phản ứng phải bọc trong $...$.
- Đại lượng vật lí phải có đơn vị chuẩn SI.
- Bài tập sinh học phải bám sát quy luật di truyền, cấu tạo tế bào, ADN/ARN, sinh thái học.
`,
  },

  'Lịch sử và Địa lí': {
    id: 'Lịch sử và Địa lí',
    name: 'Lịch sử và Địa lí',
    category: 'SOCIAL',
    shortDesc: 'Chính xác mốc thời gian, nhân vật, ý nghĩa lịch sử; phân tích bảng số liệu, biểu đồ, bản đồ địa lí.',
    defaultDuration: 45,
    defaultExamMode: 'MCQ_ESSAY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 16,
      part1_PointsPerQuestion: 0.25, // 4.0đ
      part2_MCQTrueFalse: 3,
      part2_PointsPerQuestion: 1.0, // 3.0đ
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 4,
      part3_PointsPerQuestion: 0.25, // 1.0đ
      part4_Essay: 2,
      part4_ApplyCount: 1,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 1.0, // 2.0đ
    },
    features: [
      { label: 'Mốc thời gian chuẩn xác', desc: 'Chính xác sự kiện, niên đại, nhân vật lịch sử và ý nghĩa thời đại', highlight: true },
      { label: 'Bảng số liệu Địa lí', desc: 'Phân tích bảng thống kê khí hậu, dân số, GDP, cơ cấu kinh tế' },
      { label: 'Biểu đồ trực quan', desc: 'Rèn luyện kỹ năng nhận xét, giải thích biểu đồ cột, tròn, đường' },
      { label: 'Bài học thực tiễn', desc: 'Liên hệ trách nhiệm công dân và giữ gìn chủ quyền biển đảo' },
    ],
    sampleChaptersByGrade: {
      'Khối 6': 'Lịch sử: Xã hội nguyên thủy đến cổ đại / Địa lí: Bản đồ và Trái Đất',
      'Khối 7': 'Lịch sử: Châu Âu thời trung đại / Địa lí: Các châu lục trên thế giới',
      'Khối 8': 'Lịch sử: Cách mạng tư sản / Địa lí: Địa hình và khoáng sản Việt Nam',
      'Khối 9': 'Lịch sử: Thế giới từ 1918 đến 1945 / Địa lí: Địa lí các vùng kinh tế Việt Nam',
    },
    sampleTopicsByGrade: {
      'Khối 6': ['Lịch sử: Nguồn gốc loài người', 'Lịch sử: Các quốc gia cổ đại phương Đông', 'Địa lí: Hệ thống kinh, vĩ tuyến và tọa độ địa lí'],
      'Khối 7': ['Lịch sử: Sự hình thành chế độ phong kiến Tây Âu', 'Lịch sử: Các cuộc phát kiến địa lí', 'Địa lí: Vị trí địa lí và đặc điểm tự nhiên châu Âu'],
      'Khối 8': ['Lịch sử: Cách mạng tư sản Anh và chiến tranh giành độc lập Bắc Mỹ', 'Địa lí: Đặc điểm địa hình Việt Nam', 'Địa lí: Khí hậu và thủy văn Việt Nam'],
      'Khối 9': ['Lịch sử: Chiến tranh thế giới thứ hai (1939 - 1945)', 'Địa lí: Vùng Trung du và miền núi Bắc Bộ', 'Địa lí: Vùng Đồng bằng sông Hồng'],
    },
    promptRules: `
================================================================================
🌍 HƯỚNG DẪN ĐẶC THÙ CHO MÔN LỊCH SỬ & ĐỊA LÍ:
================================================================================
- Tính chính xác tuyệt đối về niên đại, mốc sự kiện lịch sử, tên nhân vật và ý nghĩa lịch sử.
- Câu hỏi Địa lí phải khai thác kỹ năng đọc bản đồ, biểu đồ, nhận xét và giải thích bảng số liệu thống kê.
- Tránh câu hỏi nhớ thuộc lòng máy móc; tăng cường câu hỏi thông hiểu nguyên nhân, tác động và bài học kinh nghiệm.
`,
  },
};

/**
 * Trả về cấu hình đặc thù cho môn học bất kỳ (với fallback)
 */
export function getSubjectProfile(subject: SubjectType | string): SubjectProfile {
  if (SUBJECT_PROFILES[subject]) {
    return SUBJECT_PROFILES[subject];
  }

  // Fallback profile cho các môn khác
  return {
    id: subject as SubjectType,
    name: subject,
    category: 'APPLIED',
    shortDesc: `Chương trình GDPT 2018 theo Công văn 7991 cho môn ${subject}.`,
    defaultDuration: 45,
    defaultExamMode: 'MCQ_ESSAY',
    recommendedQuestionCounts: {
      part1_MCQSingle: 12,
      part1_PointsPerQuestion: 0.25,
      part2_MCQTrueFalse: 3,
      part2_PointsPerQuestion: 1.0,
      part2_TFStatementsPerQuestion: 4,
      part3_MCQShort: 4,
      part3_PointsPerQuestion: 0.25,
      part4_Essay: 2,
      part4_ApplyCount: 1,
      part4_AdvancedCount: 1,
      part4_AdvancedPoints: 1.0,
    },
    features: [
      { label: 'Bám sát YCCĐ', desc: 'Bám sát Yêu cầu cần đạt chuẩn SGK GDPT 2018' },
      { label: '4 mức độ nhận thức', desc: 'Nhận biết, Thông hiểu, Vận dụng và Vận dụng cao' },
      { label: 'Thực tiễn đời sống', desc: 'Liên hệ ứng dụng thực tế và tình huống giải quyết vấn đề' },
    ],
    sampleChaptersByGrade: {},
    sampleTopicsByGrade: {},
    promptRules: `
Bám sát chuẩn kiến thức, kỹ năng môn ${subject} theo chương trình GDPT 2018 và hướng dẫn Công văn 7991/BGDĐT.
`,
  };
}
