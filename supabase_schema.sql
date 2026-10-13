-- ==============================================================================
-- KỊCH BẢN KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE CHO HỆ THỐNG TRẮC NGHIỆM AI TEST GENERATOR
-- Hướng dẫn: Copy toàn bộ nội dung file này và dán vào tab "SQL Editor" trên Supabase
-- Sau đó nhấn "Run" để tự động tạo bảng, thiết lập RLS và chèn tài khoản Admin.
-- ==============================================================================

-- 1. BẢNG NGƯỜI DÙNG (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG LỚP HỌC (system_classes)
CREATE TABLE IF NOT EXISTS public.system_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT,
  school_year TEXT,
  teacher_name TEXT,
  notes TEXT,
  student_count INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG HỌC SINH (system_students)
CREATE TABLE IF NOT EXISTS public.system_students (
  id TEXT PRIMARY KEY,
  class_id TEXT,
  class_name TEXT,
  sbd TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG ĐỀ THI TRỰC TUYẾN (published_exams)
CREATE TABLE IF NOT EXISTS public.published_exams (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  duration INT DEFAULT 45,
  total_points NUMERIC DEFAULT 10.0,
  topic TEXT,
  package_id TEXT,
  status TEXT DEFAULT 'active',
  allow_explanations BOOLEAN DEFAULT true,
  allowed_classes JSONB DEFAULT '[]'::jsonb,
  scheduled_start_time TEXT,
  start_time_type TEXT,
  anti_cheat JSONB DEFAULT '{"disallowPrevious": true, "shuffleQuestions": true, "shuffleOptions": true, "autoSubmitOnTimeout": true, "warnTabSwitch": true, "tabSwitchLimit": 3}'::jsonb,
  exam_package JSONB DEFAULT '{}'::jsonb,
  submission_count INT DEFAULT 0,
  active_session_count INT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG KẾT QUẢ LÀM BÀI CỦA HỌC SINH (student_results)
CREATE TABLE IF NOT EXISTS public.student_results (
  id TEXT PRIMARY KEY,
  exam_code TEXT NOT NULL,
  exam_title TEXT,
  student_name TEXT NOT NULL,
  student_class TEXT,
  sbd TEXT,
  score NUMERIC DEFAULT 0,
  total_points NUMERIC DEFAULT 10.0,
  correct_count INT DEFAULT 0,
  incorrect_count INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  start_time TEXT,
  submit_time TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  detailed_grading JSONB DEFAULT '[]'::jsonb,
  tab_switches INT DEFAULT 0,
  activity_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG KHÔNG GIAN LÀM VIỆC & DỮ LIỆU ĐỒNG BỘ (user_data)
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id TEXT PRIMARY KEY,
  settings JSONB DEFAULT '{}'::jsonb,
  exam_history JSONB DEFAULT '[]'::jsonb,
  question_bank JSONB DEFAULT '[]'::jsonb,
  classes JSONB DEFAULT '[]'::jsonb,
  students JSONB DEFAULT '[]'::jsonb,
  online_exams JSONB DEFAULT '[]'::jsonb,
  deleted_exam_codes JSONB DEFAULT '[]'::jsonb,
  deleted_student_sbds JSONB DEFAULT '[]'::jsonb,
  classes_wiped_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TẠO CHỈ MỤC TĂNG TỐC TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_students_sbd ON public.system_students(sbd);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.system_students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON public.system_students(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.system_classes(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_code ON public.published_exams(code);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.published_exams(created_by);
CREATE INDEX IF NOT EXISTS idx_results_exam_code ON public.student_results(exam_code);
CREATE INDEX IF NOT EXISTS idx_results_sbd ON public.student_results(sbd);

-- BẬT ROW LEVEL SECURITY (RLS) VÀ CHÍNH SÁCH TRUY CẬP CHO PHÉP (PERMISSIVE)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- XÓA CHÍNH SÁCH CŨ NẾU ĐÃ TỒN TẠI ĐỂ TRÁNH LỖI TRÙNG LẶP
DROP POLICY IF EXISTS "Public access users" ON public.users;
DROP POLICY IF EXISTS "Public access system_classes" ON public.system_classes;
DROP POLICY IF EXISTS "Public access system_students" ON public.system_students;
DROP POLICY IF EXISTS "Public access published_exams" ON public.published_exams;
DROP POLICY IF EXISTS "Public access student_results" ON public.student_results;
DROP POLICY IF EXISTS "Public access user_data" ON public.user_data;

-- TẠO CHÍNH SÁCH MỞ ĐỂ WEB APP KẾT NỐI QUA SUPABASE ANON KEY
CREATE POLICY "Public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access system_classes" ON public.system_classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access system_students" ON public.system_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access published_exams" ON public.published_exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access student_results" ON public.student_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access user_data" ON public.user_data FOR ALL USING (true) WITH CHECK (true);

-- CHÈN TÀI KHOẢN QUẢN TRỊ VIÊN MẶC ĐỊNH
INSERT INTO public.users (id, username, email, password, display_name, role, active)
VALUES (
  'admin',
  'pqhacker@gamil.com',
  'pqhacker@gamil.com',
  'Hungdiemly300506',
  'Quản trị viên Hệ thống',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  updated_at = NOW();

-- HOÀN TẤT THIẾT LẬP CƠ SỞ DỮ LIỆU SUPABASE
