import { getSupabaseClient, isSupabaseConfigured } from '../supabase/supabaseClient';
import { AppUser } from './userService';

export interface SupabaseMigrationProgress {
  stage: string;
  percent: number;
  details?: string;
}

export class SupabaseService {
  /**
   * Check if Supabase is active
   */
  static isEnabled(): boolean {
    return isSupabaseConfigured();
  }

  // ==========================================
  // 1. NGƯỜI DÙNG (users)
  // ==========================================

  static async getUsers(): Promise<AppUser[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        displayName: row.display_name,
        role: row.role as 'admin' | 'user',
        active: row.active,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Lỗi lấy danh sách người dùng:', err);
      return [];
    }
  }

  static async getUser(usernameOrEmail: string): Promise<AppUser | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const clean = usernameOrEmail.trim().toLowerCase();
      const { data, error } = await client
        .from('users')
        .select('*')
        .or(`username.eq.${clean},email.eq.${clean}`)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.display_name,
        role: data.role as 'admin' | 'user',
        active: data.active,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  }

  static async saveUser(user: AppUser): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('users').upsert(
        {
          id: user.id,
          username: user.username.trim().toLowerCase(),
          email: user.email ? user.email.trim().toLowerCase() : null,
          password: user.password,
          display_name: user.displayName || user.username,
          role: user.role || 'user',
          active: user.active !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu người dùng:', err);
      return false;
    }
  }

  static async deleteUser(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('users').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // 2. LỚP HỌC (system_classes)
  // ==========================================

  static async getClasses(userId?: string): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client
        .from('system_classes')
        .select('*')
        .order('name', { ascending: true });

      if (userId && userId !== 'admin' && userId !== 'ALL') {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        schoolYear: row.school_year,
        teacherName: row.teacher_name,
        notes: row.notes,
        studentCount: row.student_count,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Lỗi lấy danh sách lớp học:', err);
      return [];
    }
  }

  static async saveClass(cls: any): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('system_classes').upsert(
        {
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          school_year: cls.schoolYear,
          teacher_name: cls.teacherName,
          notes: cls.notes,
          student_count: cls.studentCount || 0,
          created_by: cls.createdBy || 'guest',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu lớp học:', err);
      return false;
    }
  }

  static async deleteClass(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      await client.from('system_classes').delete().eq('id', id);
      // Xóa kèm học sinh thuộc lớp này
      await client.from('system_students').delete().eq('class_id', id);
      return true;
    } catch {
      return false;
    }
  }

  static async wipeAllClassesAndStudents(userId?: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      if (userId && userId !== 'admin') {
        await client.from('system_classes').delete().eq('created_by', userId);
        await client.from('system_students').delete().eq('created_by', userId);
      } else {
        await client.from('system_classes').delete().neq('id', '___dummy___');
        await client.from('system_students').delete().neq('id', '___dummy___');
      }
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // 3. HỌC SINH (system_students)
  // ==========================================

  static async getStudents(classId?: string, userId?: string): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('system_students').select('*').order('name', { ascending: true });
      if (classId) {
        query = query.eq('class_id', classId);
      }
      if (userId && userId !== 'admin' && userId !== 'ALL') {
        query = query.eq('created_by', userId);
      }
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        classId: row.class_id,
        className: row.class_name,
        sbd: row.sbd,
        name: row.name,
        gender: row.gender,
        dob: row.dob,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Lỗi lấy danh sách học sinh:', err);
      return [];
    }
  }

  static async saveStudents(students: any[]): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || students.length === 0) return false;

    try {
      const rows = students.map((s) => ({
        id: s.id,
        class_id: s.classId,
        class_name: s.className,
        sbd: s.sbd ? s.sbd.trim().toUpperCase() : '',
        name: s.name,
        gender: s.gender,
        dob: s.dob,
        notes: s.notes,
        created_by: s.createdBy || 'guest',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from('system_students').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu học sinh:', err);
      return false;
    }
  }

  static async deleteStudent(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('system_students').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Tra cứu học sinh theo SBD phục vụ học sinh vào phòng thi
   * Ưu tiên tìm trong học sinh do giáo viên ra đề quản lý, nếu không tìm thấy sẽ quét toàn hệ thống
   */
  static async findStudentBySbd(sbd: string, teacherId?: string): Promise<any | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const cleanSbd = (sbd || '').trim().toUpperCase();
      if (!cleanSbd) return null;

      // 1. Ưu tiên tìm trong danh sách của giáo viên tạo đề
      if (teacherId && teacherId !== 'guest') {
        const { data: teacherStudent } = await client
          .from('system_students')
          .select('*')
          .eq('created_by', teacherId)
          .ilike('sbd', cleanSbd)
          .maybeSingle();

        if (teacherStudent) {
          return {
            id: teacherStudent.id,
            sbd: teacherStudent.sbd,
            name: teacherStudent.name,
            className: teacherStudent.class_name,
            createdBy: teacherStudent.created_by,
          };
        }
      }

      // 2. Tìm chung trong toàn bộ bảng học sinh
      const { data: anyStudent } = await client
        .from('system_students')
        .select('*')
        .ilike('sbd', cleanSbd)
        .limit(1)
        .maybeSingle();

      if (anyStudent) {
        return {
          id: anyStudent.id,
          sbd: anyStudent.sbd,
          name: anyStudent.name,
          className: anyStudent.class_name,
          createdBy: anyStudent.created_by,
        };
      }

      return null;
    } catch (err) {
      console.warn('[Supabase] Lỗi tra cứu SBD học sinh:', err);
      return null;
    }
  }

  // ==========================================
  // 4. ĐỀ THI TRỰC TUYẾN (published_exams)
  // ==========================================

  static async getExams(userId?: string): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client
        .from('published_exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId && userId !== 'admin' && userId !== 'ALL') {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title,
        subject: row.subject,
        grade: row.grade,
        duration: row.duration,
        totalPoints: Number(row.total_points) || 10,
        topic: row.topic,
        packageId: row.package_id,
        status: row.status,
        allowExplanations: row.allow_explanations,
        allowedClasses: row.allowed_classes || [],
        scheduledStartTime: row.scheduled_start_time,
        startTimeType: row.start_time_type,
        antiCheat: row.anti_cheat,
        examPackage: row.exam_package,
        submissionCount: row.submission_count || 0,
        activeSessionCount: row.active_session_count || 0,
        createdBy: row.created_by,
        createdAt: row.created_at,
        createdDate: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Lỗi lấy danh sách đề thi:', err);
      return [];
    }
  }

  static async getExamByCode(code: string): Promise<any | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const clean = code.trim().toUpperCase();
      const { data, error } = await client
        .from('published_exams')
        .select('*')
        .eq('code', clean)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        code: data.code,
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        duration: data.duration,
        totalPoints: Number(data.total_points) || 10,
        topic: data.topic,
        packageId: data.package_id,
        status: data.status,
        allowExplanations: data.allow_explanations,
        allowedClasses: data.allowed_classes || [],
        scheduledStartTime: data.scheduled_start_time,
        startTimeType: data.start_time_type,
        antiCheat: data.anti_cheat,
        examPackage: data.exam_package,
        submissionCount: data.submission_count || 0,
        activeSessionCount: data.active_session_count || 0,
        createdBy: data.created_by,
        createdAt: data.created_at,
        createdDate: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  static async saveExam(exam: any): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const codeUpper = (exam.code || '').trim().toUpperCase();
      const { error } = await client.from('published_exams').upsert(
        {
          id: exam.id || 'exam_' + codeUpper,
          code: codeUpper,
          title: exam.title || 'Đề kiểm tra',
          subject: exam.subject || 'Toán',
          grade: exam.grade || 'Khối 10',
          duration: Number(exam.duration) || 45,
          total_points: Number(exam.totalPoints) || 10.0,
          topic: exam.topic || '',
          package_id: exam.packageId || exam.examPackageId || exam.id,
          status: exam.status || 'active',
          allow_explanations: exam.allowExplanations !== false,
          allowed_classes: Array.isArray(exam.allowedClasses) ? exam.allowedClasses : [],
          scheduled_start_time: exam.scheduledStartTime || null,
          start_time_type: exam.startTimeType || 'immediate',
          anti_cheat: exam.antiCheat || {},
          exam_package: exam.examPackage || {},
          submission_count: Number(exam.submissionCount) || 0,
          active_session_count: Number(exam.activeSessionCount) || 0,
          created_by: exam.createdBy || 'admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'code' }
      );

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu đề thi:', err);
      return false;
    }
  }

  static async deleteExam(code: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const clean = code.trim().toUpperCase();
      await client.from('published_exams').delete().eq('code', clean);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // 5. KẾT QUẢ HỌC SINH (student_results)
  // ==========================================

  static async getStudentResults(examCode: string = 'ALL'): Promise<any[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('student_results').select('*').order('created_at', { ascending: false });
      if (examCode && examCode !== 'ALL') {
        query = query.eq('exam_code', examCode.trim().toUpperCase());
      }
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        examCode: row.exam_code,
        examTitle: row.exam_title,
        studentName: row.student_name,
        studentClass: row.student_class,
        sbd: row.sbd,
        studentSbd: row.sbd,
        studentId: row.sbd,
        score: Number(row.score) || 0,
        totalPoints: Number(row.total_points) || 10,
        correctCount: Number(row.correct_count) || 0,
        incorrectCount: Number(row.incorrect_count) || 0,
        totalQuestions: Number(row.total_questions) || 0,
        startTime: row.start_time,
        submitTime: row.submit_time,
        answers: row.answers || {},
        detailedGrading: row.detailed_grading || [],
        tabSwitches: Number(row.tab_switches) || 0,
        activityLogs: row.activity_logs || [],
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('[Supabase] Lỗi lấy kết quả học sinh:', err);
      return [];
    }
  }

  static async saveStudentResult(result: any): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('student_results').upsert(
        {
          id: result.id,
          exam_code: (result.examCode || '').trim().toUpperCase(),
          exam_title: result.examTitle || '',
          student_name: result.studentName || '',
          student_class: result.studentClass || '',
          sbd: result.sbd || result.studentSbd || result.studentId || '',
          score: Number(result.score) || 0,
          total_points: Number(result.totalPoints) || 10.0,
          correct_count: Number(result.correctCount) || 0,
          incorrect_count: Number(result.incorrectCount) || 0,
          total_questions: Number(result.totalQuestions) || 0,
          start_time: result.startTime || new Date().toISOString(),
          submit_time: result.submitTime || new Date().toISOString(),
          answers: result.answers || {},
          detailed_grading: result.detailedGrading || [],
          tab_switches: Number(result.tabSwitches) || 0,
          activity_logs: result.activityLogs || [],
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu kết quả làm bài:', err);
      return false;
    }
  }

  static async deleteStudentResult(sessionId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('student_results').delete().eq('id', sessionId);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // 6. DỮ LIỆU ĐỒNG BỘ (user_data)
  // ==========================================

  static async loadUserData(userId: string): Promise<any | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        settings: data.settings || {},
        examHistory: data.exam_history || [],
        questionBank: data.question_bank || [],
        classes: data.classes || [],
        students: data.students || [],
        onlineExams: data.online_exams || [],
        deletedExamCodes: data.deleted_exam_codes || [],
        deletedStudentSbds: data.deleted_student_sbds || [],
        classesWipedAt: data.classes_wiped_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  static async saveUserData(userId: string, payload: any): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('user_data').upsert(
        {
          user_id: userId,
          settings: payload.settings || {},
          exam_history: payload.examHistory || [],
          question_bank: payload.questionBank || [],
          classes: payload.classes || [],
          students: payload.students || [],
          online_exams: payload.onlineExams || [],
          deleted_exam_codes: payload.deletedExamCodes || [],
          deleted_student_sbds: payload.deletedStudentSbds || [],
          classes_wiped_at: payload.classesWipedAt || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase] Lỗi lưu user_data:', err);
      return false;
    }
  }

  // ==========================================
  // 7. TOÀN DIỆN DI CHUYỂN DỮ LIỆU SANG SUPABASE
  // ==========================================

  static async migrateAllDataToSupabase(
    sourceData: {
      users?: AppUser[];
      classes?: any[];
      students?: any[];
      exams?: any[];
      results?: any[];
      userDataPayloads?: Record<string, any>;
    },
    onProgress?: (progress: SupabaseMigrationProgress) => void
  ): Promise<{ success: boolean; message: string; summary: Record<string, number> }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase chưa được cấu hình. Vui lòng nhập Project URL và API Key trước.');
    }

    const summary = {
      users: 0,
      classes: 0,
      students: 0,
      exams: 0,
      results: 0,
      userData: 0,
    };

    try {
      // 1. Chuyển người dùng
      onProgress?.({ stage: 'Đang chuyển danh sách người dùng...', percent: 15 });
      if (sourceData.users && sourceData.users.length > 0) {
        for (const u of sourceData.users) {
          const ok = await this.saveUser(u);
          if (ok) summary.users++;
        }
      }

      // 2. Chuyển Lớp học
      onProgress?.({ stage: 'Đang chuyển danh sách lớp học...', percent: 35 });
      if (sourceData.classes && sourceData.classes.length > 0) {
        for (const c of sourceData.classes) {
          const ok = await this.saveClass(c);
          if (ok) summary.classes++;
        }
      }

      // 3. Chuyển Học sinh
      onProgress?.({ stage: 'Đang chuyển danh sách học sinh...', percent: 55 });
      if (sourceData.students && sourceData.students.length > 0) {
        const ok = await this.saveStudents(sourceData.students);
        if (ok) summary.students = sourceData.students.length;
      }

      // 4. Chuyển Đề thi
      onProgress?.({ stage: 'Đang chuyển đề thi và ngân hàng câu hỏi...', percent: 75 });
      if (sourceData.exams && sourceData.exams.length > 0) {
        for (const e of sourceData.exams) {
          const ok = await this.saveExam(e);
          if (ok) summary.exams++;
        }
      }

      // 5. Chuyển Kết quả làm bài
      onProgress?.({ stage: 'Đang chuyển kết quả làm bài của học sinh...', percent: 90 });
      if (sourceData.results && sourceData.results.length > 0) {
        for (const r of sourceData.results) {
          const ok = await this.saveStudentResult(r);
          if (ok) summary.results++;
        }
      }

      // 6. Chuyển workspace payloads
      onProgress?.({ stage: 'Đang đồng bộ không gian làm việc...', percent: 98 });
      if (sourceData.userDataPayloads) {
        for (const [userId, payload] of Object.entries(sourceData.userDataPayloads)) {
          const ok = await this.saveUserData(userId, payload);
          if (ok) summary.userData++;
        }
      }

      onProgress?.({ stage: 'Hoàn tất chuyển đổi dữ liệu!', percent: 100 });
      return {
        success: true,
        message: `Chuyển dữ liệu sang Supabase thành công! Đã chuyển ${summary.users} tài khoản, ${summary.classes} lớp học, ${summary.students} học sinh, ${summary.exams} đề thi, ${summary.results} kết quả.`,
        summary,
      };
    } catch (err: any) {
      console.error('[Supabase Migration] Lỗi:', err);
      throw new Error(`Quá trình chuyển dữ liệu thất bại: ${err.message || String(err)}`);
    }
  }
}
