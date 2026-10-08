// Frontend API Client Service for Online Exam System (Hybrid Backend + LocalStorage Fallback)

import { UserDataSync } from './userDataSync';
import { StorageEngine } from './storageEngine';
import { doc, getDoc, setDoc, getDocs, collection, query, where, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { extractGradeNumber, matchGrade, normalizeClassName, validateStudentEligibility } from '../types';
import { sortStudentsDefault, naturalCompare } from '../utils/vietnameseSort';

export interface OnlineExamItem {
  id: string;
  code: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  totalPoints: number;
  topic?: string;
  packageId?: string;
  examPackageId?: string;
  examPackage?: any;
  createdDate: string;
  status: 'active' | 'locked';
  allowedClasses?: string[];
  scheduledStartTime?: string;
  startTimeType?: 'immediate' | 'scheduled';
  questionCount: number;
  submissionCount: number;
  activeSessionCount: number;
  antiCheat: {
    disallowPrevious: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    autoSubmitOnTimeout: boolean;
    warnTabSwitch: boolean;
    tabSwitchLimit: number;
  };
  createdBy?: string;
}

export interface StudentResultItem {
  id: string;
  examCode: string;
  studentName: string;
  studentClass: string;
  studentSbd?: string;
  studentId?: string;
  studentSchool?: string;
  startTime: string;
  submitTime?: string;
  durationMinutes: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  totalQuestions: number;
  tabSwitches: number;
  activityLogs: { timestamp: string; event: string; details?: string }[];
  createdBy?: string;
  teacherId?: string;
}

export class OnlineExamService {
  public static getActiveUserId(): string {
    return StorageEngine.getCurrentUserId() || UserDataSync.getActiveUserId() || 'guest';
  }

  private static getStorageKeys() {
    const userId = this.getActiveUserId();
    const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
    return {
      EXAMS: `aitest_online_exams_store_${cleanId}`,
      SESSIONS: `aitest_online_sessions_store_${cleanId}`,
      CLASSES: `aitest_online_classes_store_${cleanId}`,
      STUDENTS: `aitest_online_students_store_${cleanId}`,
    };
  }

  private static syncToFirestore(): void {
    const userId = this.getActiveUserId();
    if (userId && userId !== 'guest') {
      UserDataSync.saveUserData(userId, {
        classes: this.getLocalClasses(),
        students: this.getLocalStudents(),
        onlineExams: this.getLocalExams(),
      });
    }
  }

  public static getDeletedExamCodes(): Set<string> {
    try {
      const userId = this.getActiveUserId();
      const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
      const raw = localStorage.getItem(`aitest_deleted_exam_codes_${cleanId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map((c: string) => String(c).trim().toUpperCase()));
        }
      }
    } catch {
      // ignore
    }
    return new Set<string>();
  }

  public static addDeletedExamCode(code: string): void {
    try {
      const cleanCode = (code || '').trim().toUpperCase();
      if (!cleanCode) return;
      const set = this.getDeletedExamCodes();
      set.add(cleanCode);
      const userId = this.getActiveUserId();
      const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
      localStorage.setItem(`aitest_deleted_exam_codes_${cleanId}`, JSON.stringify(Array.from(set)));

      if (userId && userId !== 'guest') {
        UserDataSync.saveUserData(userId, {
          deletedExamCodes: Array.from(set),
        });
      }
    } catch {
      // ignore
    }
  }

  public static removeDeletedExamCode(code: string): void {
    try {
      const cleanCode = (code || '').trim().toUpperCase();
      if (!cleanCode) return;
      const set = this.getDeletedExamCodes();
      if (set.has(cleanCode)) {
        set.delete(cleanCode);
        const userId = this.getActiveUserId();
        const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
        localStorage.setItem(`aitest_deleted_exam_codes_${cleanId}`, JSON.stringify(Array.from(set)));
        if (userId && userId !== 'guest') {
          UserDataSync.saveUserData(userId, {
            deletedExamCodes: Array.from(set),
          });
        }
      }
    } catch {
      // ignore
    }
  }

  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const userId = this.getActiveUserId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as any) || {}),
    };
    if (userId && userId !== 'guest') {
      headers['x-user-id'] = userId;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON response (e.g. 404 HTML page on Vercel static deployment)
    }

    if (res.ok && data && data.error === undefined) {
      return data as T;
    }

    if (data && data.error) {
      throw new Error(data.error);
    }

    throw new Error('SERVER_OFFLINE_OR_NON_JSON');
  }

  // --- LocalStorage Helpers ---
  private static generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public static async generateUniqueExamCode(): Promise<string> {
    const localExams = this.getLocalExams();
    const localCodes = new Set(localExams.map((e) => (e.code || '').toUpperCase()));

    for (let attempts = 0; attempts < 5; attempts++) {
      const code = this.generateRandomCode();
      if (localCodes.has(code)) {
        continue;
      }
      try {
        const fsExam = await this.getPublishedExamFromFirestore(code);
        if (fsExam) {
          continue;
        }
      } catch {
        // If firestore is slow or fails, accept code
      }
      return code;
    }
    return this.generateRandomCode();
  }

  public static getLocalExams(): any[] {
    try {
      const keys = this.getStorageKeys();
      const data = localStorage.getItem(keys.EXAMS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveLocalExams(exams: any[]): void {
    try {
      const keys = this.getStorageKeys();
      const userId = this.getActiveUserId();
      const userOnlyExams = exams
        .filter((e) => !e.createdBy || e.createdBy === userId)
        .map((e) => ({ ...e, createdBy: e.createdBy || userId }));
      localStorage.setItem(keys.EXAMS, JSON.stringify(userOnlyExams));
      this.syncToFirestore();
    } catch (e) {
      console.error('Lỗi lưu exams local:', e);
    }
  }

  private static getLocalSessions(): any[] {
    try {
      const keys = this.getStorageKeys();
      const data = localStorage.getItem(keys.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveLocalSessions(sessions: any[]): void {
    try {
      const keys = this.getStorageKeys();
      localStorage.setItem(keys.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Lỗi lưu sessions local:', e);
    }
  }

  static getLocalClasses(): any[] {
    try {
      const keys = this.getStorageKeys();
      const data = localStorage.getItem(keys.CLASSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveLocalClasses(classes: any[]): void {
    try {
      const keys = this.getStorageKeys();
      localStorage.setItem(keys.CLASSES, JSON.stringify(classes));
      this.syncToFirestore();
    } catch (e) {
      console.error('Lỗi lưu classes local:', e);
    }
  }

  static getLocalStudents(): any[] {
    try {
      const keys = this.getStorageKeys();
      const data = localStorage.getItem(keys.STUDENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveLocalStudents(students: any[]): void {
    try {
      const keys = this.getStorageKeys();
      localStorage.setItem(keys.STUDENTS, JSON.stringify(students));
      this.syncToFirestore();
    } catch (e) {
      console.error('Lỗi lưu students local:', e);
    }
  }

  private static sanitizeForFirestore<T>(data: T): T {
    if (data === undefined || data === null) {
      return null as any;
    }
    if (typeof data !== 'object') {
      return data;
    }
    try {
      return JSON.parse(
        JSON.stringify(data, (key, value) => {
          if (value === undefined) return null;
          return value;
        })
      );
    } catch {
      return data;
    }
  }

  public static sanitizeExamForFirestore(exam: any): any {
    if (!exam || typeof exam !== 'object') return exam;
    const clean: any = { ...exam };

    // 1. Extract questions list from any available location (clean.questions, examPackage, history, or localExams)
    let extractedQuestions: any[] = [];
    if (Array.isArray(clean.questions) && clean.questions.length > 0) {
      extractedQuestions = clean.questions;
    } else if (Array.isArray(clean.examPackage?.exams?.[0]?.questions) && clean.examPackage.exams[0].questions.length > 0) {
      extractedQuestions = clean.examPackage.exams[0].questions;
    } else {
      // Fallback check history or localExams
      try {
        const history = StorageEngine.getExamHistory();
        const foundPkg = history.find(
          (p) =>
            p.id === clean.packageId ||
            p.id === clean.examPackageId ||
            p.metadata?.onlineExamCode?.toUpperCase() === clean.code?.toUpperCase()
        );
        if (foundPkg?.exams?.[0]?.questions?.length) {
          extractedQuestions = foundPkg.exams[0].questions;
        } else {
          const localExams = this.getLocalExams();
          const foundLocal = localExams.find((e) => e.code?.toUpperCase() === clean.code?.toUpperCase());
          if (foundLocal?.questions?.length) {
            extractedQuestions = foundLocal.questions;
          } else if (foundLocal?.examPackage?.exams?.[0]?.questions?.length) {
            extractedQuestions = foundLocal.examPackage.exams[0].questions;
          }
        }
      } catch {}
    }

    // 2. Clean and preserve all questions properties with 100% field compatibility
    const cleanQuestions = extractedQuestions.map((q: any, idx: number) => {
      const qContent = q.content || q.text || q.questionText || '';
      const partType = q.partType || 'PART1';
      const cleanQ: any = {
        id: q.id || `q_${idx + 1}`,
        number: q.number || idx + 1,
        content: qContent,
        text: qContent,
        questionText: qContent,
        partType,
        partTitle:
          q.partTitle ||
          (partType === 'PART1'
            ? 'Phần I: Trắc nghiệm 4 lựa chọn'
            : partType === 'PART2'
            ? 'Phần II: Trắc nghiệm Đúng/Sai'
            : partType === 'PART3'
            ? 'Phần III: Trắc nghiệm trả lời ngắn'
            : 'Phần IV: Tự luận'),
        cognitiveLevel: q.cognitiveLevel || q.level || 'NB',
        level: q.level || q.cognitiveLevel || 'NB',
        points: typeof q.points === 'number' ? q.points : 0.25,
      };

      if (q.topic) cleanQ.topic = q.topic;
      if (q.subTopic) cleanQ.subTopic = q.subTopic;
      if (q.textHtml) cleanQ.textHtml = q.textHtml;
      if (q.correctOption) cleanQ.correctOption = q.correctOption;
      if (q.correctAnswer) cleanQ.correctAnswer = q.correctAnswer;
      if (q.solution || q.explanation) {
        cleanQ.solution = q.solution || q.explanation;
        cleanQ.explanation = q.explanation || q.solution;
      }
      if (q.shortAnswer) cleanQ.shortAnswer = q.shortAnswer;
      if (q.essayAnswerGuide) cleanQ.essayAnswerGuide = q.essayAnswerGuide;
      if (q.svgDiagram) cleanQ.svgDiagram = q.svgDiagram;
      if (q.solutionDiagramSvg) cleanQ.solutionDiagramSvg = q.solutionDiagramSvg;

      // Handle Options for Part 1 (Multiple Choice)
      if (Array.isArray(q.options)) {
        cleanQ.options = q.options.map((opt: any, optIdx: number) => {
          const defaultKey = ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);
          const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
          const optKey = typeof opt === 'object' ? (opt.key || opt.id || defaultKey) : defaultKey;
          return {
            key: optKey,
            id: optKey,
            content: optContent,
            text: optContent,
            isCorrect: typeof opt === 'object' ? Boolean(opt.isCorrect) : false,
          };
        });
      }

      // Handle True/False Statements for Part 2
      const rawStatements = q.trueFalseStatements || q.statements;
      if (Array.isArray(rawStatements)) {
        const cleanStatements = rawStatements.map((st: any, stIdx: number) => {
          const defaultKey = ['a', 'b', 'c', 'd'][stIdx] || String.fromCharCode(97 + stIdx);
          const stContent = typeof st === 'string' ? st : (st.content || st.text || '');
          const stKey = typeof st === 'object' ? (st.key || defaultKey) : defaultKey;
          return {
            key: stKey,
            content: stContent,
            text: stContent,
            isCorrect: typeof st === 'object' ? Boolean(st.isCorrect || st.isTrue) : false,
            isTrue: typeof st === 'object' ? Boolean(st.isCorrect || st.isTrue) : false,
          };
        });
        cleanQ.trueFalseStatements = cleanStatements;
        cleanQ.statements = cleanStatements;
      }

      if (Array.isArray(q.rubric)) cleanQ.rubric = q.rubric;

      return cleanQ;
    });

    clean.questions = cleanQuestions;
    clean.questionCount = cleanQuestions.length || clean.questionCount || 10;

    // Slim down examPackage so it contains only metadata and the clean primary exam
    if (clean.examPackage) {
      const pkgMeta = clean.examPackage.metadata || {};
      clean.examPackage = {
        id: clean.examPackage.id || clean.id || 'pkg_' + (clean.code || Date.now()),
        metadata: {
          examTitle: pkgMeta.examTitle || clean.title || 'Đề kiểm tra',
          subject: pkgMeta.subject || clean.subject || 'Toán',
          grade: pkgMeta.grade || clean.grade || 'Khối 10',
          durationMinutes: Number(pkgMeta.durationMinutes) || clean.duration || 45,
          totalPoints: Number(pkgMeta.totalPoints) || clean.totalPoints || 10.0,
          chapterTitle: pkgMeta.chapterTitle || clean.topic || '',
        },
        exams: [
          {
            code: clean.examPackage.exams?.[0]?.code || '101',
            questions: cleanQuestions,
          },
        ],
      };
    } else {
      clean.examPackage = {
        id: clean.id || 'pkg_' + (clean.code || Date.now()),
        metadata: {
          examTitle: clean.title || 'Đề kiểm tra',
          subject: clean.subject || 'Toán',
          grade: clean.grade || 'Khối 10',
          durationMinutes: clean.duration || 45,
          totalPoints: clean.totalPoints || 10.0,
          chapterTitle: clean.topic || '',
        },
        exams: [
          {
            code: '101',
            questions: cleanQuestions,
          },
        ],
      };
    }

    delete clean.docxBlob;
    delete clean.referenceImages;
    delete clean.rawImages;
    delete clean.matrix;
    delete clean.specification;
    delete clean.answerKeys;
    delete clean.rawContent;
    delete clean.originalQuestions;
    delete clean.history;

    return this.sanitizeForFirestore(clean);
  }

  public static async syncPublishedExamToFirestore(exam: any): Promise<void> {
    if (!exam || !exam.code) return;
    const codeUpper = exam.code.trim().toUpperCase();
    if (this.getDeletedExamCodes().has(codeUpper)) {
      console.log(`[OnlineExamService] Bỏ qua đồng bộ mã đề ${codeUpper} vì đã bị xóa.`);
      return;
    }
    try {
      const docRef = doc(db, 'published_exams', codeUpper);
      const userId = this.getActiveUserId();
      const cleanData = this.sanitizeExamForFirestore({
        ...exam,
        code: codeUpper,
        createdBy: userId || exam.createdBy || 'anonymous',
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, cleanData, { merge: true });
      console.log(`[OnlineExamService] Đã đồng bộ mã đề ${codeUpper} lên Firestore thành công.`);
    } catch (e: any) {
      console.error(`[OnlineExamService] Lỗi đồng bộ mã đề ${codeUpper} tới Firestore:`, e);
      throw new Error(`Không thể đồng bộ mã đề ${codeUpper} lên Cloud: ${e.message || 'Lỗi mạng hoặc quyền truy cập'}`);
    }
  }

  public static async getPublishedExamFromFirestore(code: string): Promise<any | null> {
    if (!code) return null;
    const codeUpper = code.trim().toUpperCase();
    if (this.getDeletedExamCodes().has(codeUpper)) {
      return null;
    }

    // 1. Kiểm tra trực tiếp document trong collection 'published_exams/{code}'
    try {
      const docRef = doc(db, 'published_exams', codeUpper);
      const snap = await getDoc(docRef);
      if (snap && snap.exists && snap.exists()) {
        const data = snap.data();
        if (data) return data;
      }
    } catch (e) {
      console.warn('Lỗi đọc published_exams từ Firestore:', e);
    }

    // 2. Fallback tìm kiếm trong collection 'user_data' (phòng trường hợp đề được tạo ở tài khoản giáo viên nhưng chưa sync sang published_exams)
    try {
      const colRef = collection(db, 'user_data');
      const snap = await getDocs(colRef);
      for (const d of snap.docs) {
        const uData = d.data() as any;
        if (!uData) continue;

        // Tìm trong onlineExams
        if (Array.isArray(uData.onlineExams)) {
          const matched = uData.onlineExams.find(
            (oe: any) => oe && oe.code && oe.code.trim().toUpperCase() === codeUpper
          );
          if (matched) {
            this.syncPublishedExamToFirestore(matched).catch(() => {});
            return matched;
          }
        }

        // Tìm trong examHistory
        if (Array.isArray(uData.examHistory)) {
          const matchedPkg = uData.examHistory.find(
            (p: any) => p?.metadata?.onlineExamCode?.trim().toUpperCase() === codeUpper
          );
          if (matchedPkg) {
            const qCount = matchedPkg.exams?.[0]?.questions?.length || 10;
            const recoveredExam: OnlineExamItem = {
              id: matchedPkg.id || 'exam_hist_' + codeUpper,
              code: codeUpper,
              title: matchedPkg.metadata.examTitle || 'Đề kiểm tra',
              subject: matchedPkg.metadata.subject || 'Toán',
              grade: matchedPkg.metadata.grade || 'Khối 10',
              duration: Number(matchedPkg.metadata.durationMinutes) || 45,
              totalPoints: Number(matchedPkg.metadata.totalPoints) || 10.0,
              topic: matchedPkg.metadata.chapterTitle || '',
              packageId: matchedPkg.id,
              examPackageId: matchedPkg.id,
              examPackage: matchedPkg,
              createdDate: matchedPkg.createdAt || new Date().toISOString(),
              status: 'active',
              allowedClasses: [],
              questionCount: qCount,
              submissionCount: 0,
              activeSessionCount: 0,
              antiCheat: {
                disallowPrevious: false,
                shuffleQuestions: true,
                shuffleOptions: true,
                autoSubmitOnTimeout: true,
                warnTabSwitch: true,
                tabSwitchLimit: 3,
              },
              createdBy: d.id,
            };
            this.syncPublishedExamToFirestore(recoveredExam).catch(() => {});
            return recoveredExam;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi quét user_data Firestore:', e);
    }

    return null;
  }

  public static async syncAllLocalExamsToFirestore(): Promise<{ success: boolean; totalSynced: number; codes: string[] }> {
    try {
      const localExams = this.getLocalExams();
      const history = StorageEngine.getExamHistory();
      const userId = this.getActiveUserId();
      const deletedCodes = this.getDeletedExamCodes();

      const syncedCodes = new Set<string>();
      const promises: Promise<any>[] = [];

      for (const exam of localExams) {
        if (exam && exam.code) {
          const c = exam.code.trim().toUpperCase();
          if (deletedCodes.has(c)) continue;
          syncedCodes.add(c);
          promises.push(this.syncPublishedExamToFirestore(exam));
        }
      }

      for (const pkg of history) {
        const onlineCode = pkg.metadata?.onlineExamCode;
        if (onlineCode && onlineCode.trim().length > 0) {
          const cleanCode = onlineCode.trim().toUpperCase();
          if (deletedCodes.has(cleanCode)) continue;
          const qCount = pkg.exams?.[0]?.questions?.length || 10;
          const examItem = {
            id: pkg.id || 'exam_hist_' + cleanCode,
            code: cleanCode,
            title: pkg.metadata.examTitle || 'Đề kiểm tra',
            subject: pkg.metadata.subject || 'Toán',
            grade: pkg.metadata.grade || 'Khối 10',
            duration: Number(pkg.metadata.durationMinutes) || 45,
            totalPoints: Number(pkg.metadata.totalPoints) || 10.0,
            topic: pkg.metadata.chapterTitle || '',
            packageId: pkg.id,
            examPackageId: pkg.id,
            examPackage: pkg,
            createdDate: pkg.createdAt || new Date().toISOString(),
            status: 'active',
            allowedClasses: [],
            questionCount: qCount,
            submissionCount: 0,
            activeSessionCount: 0,
            createdBy: userId,
          };
          syncedCodes.add(cleanCode);
          promises.push(this.syncPublishedExamToFirestore(examItem));
        }
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      return {
        success: successCount > 0,
        totalSynced: successCount,
        codes: Array.from(syncedCodes),
      };
    } catch (err: any) {
      console.warn('Lỗi đồng bộ tất cả đề thi tới Firestore:', err);
      return { success: false, totalSynced: 0, codes: [] };
    }
  }

  private static async syncStudentResultToFirestore(resultItem: StudentResultItem): Promise<void> {
    if (!resultItem || !resultItem.id) return;
    try {
      const docRef = doc(db, 'student_results', resultItem.id);
      const cleanData = this.sanitizeForFirestore({
        ...resultItem,
        examCode: resultItem.examCode ? resultItem.examCode.trim().toUpperCase() : '',
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.warn('Lỗi lưu student_results tới Firestore:', e);
    }
  }

  private static async getStudentResultsFromFirestore(examCode: string = 'ALL'): Promise<StudentResultItem[]> {
    try {
      const colRef = collection(db, 'student_results');
      let q = colRef as any;
      if (examCode && examCode !== 'ALL') {
        const codeUpper = examCode.trim().toUpperCase();
        q = query(colRef, where('examCode', '==', codeUpper));
      }
      const snap = await getDocs(q);
      const items: StudentResultItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as StudentResultItem;
        if (data && data.id) {
          items.push(data);
        }
      });
      return items;
    } catch (e) {
      console.warn('Lỗi đọc student_results từ Firestore:', e);
      return [];
    }
  }

  // 1. Save or Publish Exam
  static async saveExam(data: {
    code?: string;
    title?: string;
    subject?: string;
    grade?: string;
    duration?: number;
    totalPoints?: number;
    topic?: string;
    allowExplanations?: boolean;
    allowedClasses?: string[];
    scheduledStartTime?: string;
    startTimeType?: 'immediate' | 'scheduled';
    antiCheat?: {
      disallowPrevious?: boolean;
      shuffleQuestions?: boolean;
      shuffleOptions?: boolean;
      autoSubmitOnTimeout?: boolean;
      warnTabSwitch?: boolean;
      tabSwitchLimit?: number;
    };
    examPackage: any;
  }) {
    const userId = this.getActiveUserId();
    let requestedCode = (data.code || '').trim().toUpperCase();

    if (requestedCode) {
      const existingFs = await this.getPublishedExamFromFirestore(requestedCode);
      if (existingFs) {
        const isSame = existingFs.id === data.examPackage?.id || (existingFs.createdBy === userId && existingFs.id === data.examPackage?.metadata?.id);
        if (!isSame) {
          throw new Error(`Mã đề thi '${requestedCode}' đã tồn tại trên hệ thống. Mã đề thi phải là duy nhất, tuyệt đối không trùng lặp giữa các tài khoản! Vui lòng chọn mã khác.`);
        }
      }
    } else {
      requestedCode = await this.generateUniqueExamCode();
    }

    // Ensure the code is not marked as deleted
    this.removeDeletedExamCode(requestedCode);

    const payload = {
      ...data,
      code: requestedCode,
      createdBy: userId,
    };

    let savedResult: { success: boolean; code: string; exam: any } | null = null;
    try {
      savedResult = await this.request<{ success: boolean; code: string; exam: any }>('/api/exam/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (
        err.message &&
        err.message !== 'SERVER_OFFLINE_OR_NON_JSON' &&
        !err.message.includes('Unexpected') &&
        !err.message.includes('JSON') &&
        !err.message.includes('Failed to fetch')
      ) {
        throw err;
      }

      // LocalStorage Fallback
      const code = requestedCode;
      const newExam: any = {
        id: 'exam_local_' + Date.now(),
        code,
        title: data.title || 'Đề kiểm tra trực tuyến',
        subject: data.subject || 'Toán',
        grade: data.grade || 'Khối 10',
        duration: data.duration || 45,
        totalPoints: data.totalPoints || 10.0,
        topic: data.topic || data.examPackage?.metadata?.chapterTitle || '',
        packageId: data.examPackage?.id || (data.examPackage?.metadata as any)?.id,
        examPackageId: data.examPackage?.id || (data.examPackage?.metadata as any)?.id,
        createdDate: new Date().toISOString(),
        status: 'active',
        allowExplanations: data.allowExplanations !== false,
        allowedClasses: data.allowedClasses || [],
        scheduledStartTime: data.scheduledStartTime,
        startTimeType: data.startTimeType || (data.scheduledStartTime ? 'scheduled' : 'immediate'),
        createdBy: userId,
        antiCheat: data.antiCheat || {
          disallowPrevious: false,
          shuffleQuestions: true,
          shuffleOptions: true,
          autoSubmitOnTimeout: true,
          warnTabSwitch: true,
          tabSwitchLimit: 3,
        },
        examPackage: data.examPackage,
      };

      const localExams = this.getLocalExams();
      const updated = [newExam, ...localExams.filter((e) => e.code.toUpperCase() !== code)];
      this.saveLocalExams(updated);

      savedResult = { success: true, code, exam: newExam };
    }

    if (savedResult && savedResult.exam) {
      if (!savedResult.exam.packageId && data.examPackage?.id) {
        savedResult.exam.packageId = data.examPackage.id;
      }
      if (!savedResult.exam.examPackageId && data.examPackage?.id) {
        savedResult.exam.examPackageId = data.examPackage.id;
      }
      if (!savedResult.exam.topic && (data.topic || data.examPackage?.metadata?.chapterTitle)) {
        savedResult.exam.topic = data.topic || data.examPackage?.metadata?.chapterTitle;
      }
      await this.syncPublishedExamToFirestore(savedResult.exam);
      const localExams = this.getLocalExams();
      const updated = [
        savedResult.exam,
        ...localExams.filter((e) => e.code.toUpperCase() !== savedResult!.code.toUpperCase()),
      ];
      this.saveLocalExams(updated);
    }

    return savedResult;
  }

  // 2. List all exams for Teacher
  static async listExams() {
    const userId = this.getActiveUserId();
    const deletedCodes = this.getDeletedExamCodes();

    let apiExams: OnlineExamItem[] = [];
    try {
      const res = await this.request<{ success: boolean; exams: OnlineExamItem[] }>('/api/exam/list');
      if (res.success && Array.isArray(res.exams)) {
        apiExams = res.exams.filter((e) => !e.code || !deletedCodes.has(e.code.trim().toUpperCase()));
      }
    } catch {
      // ignore API failure
    }

    // 1. Lấy từ Local Storage của OnlineExamService (chỉ của user hiện tại và chưa bị xóa)
    const localExams = this.getLocalExams().filter(
      (e) => (!e.createdBy || e.createdBy === userId) && (!e.code || !deletedCodes.has(e.code.trim().toUpperCase()))
    );
    const localItems: OnlineExamItem[] = localExams.map((e) => {
      const pkg = e.examPackage || {};
      const qCount = pkg.exams?.[0]?.questions?.length || 10;
      const sessions = this.getLocalSessions().filter((s) => s.examCode.toUpperCase() === e.code.toUpperCase());
      const activeSessions = sessions.filter((s) => s.status === 'in_progress');
      const submitted = sessions.filter((s) => s.status === 'submitted');

      return {
        id: e.id || 'exam_' + e.code,
        code: e.code,
        title: e.title,
        subject: e.subject,
        grade: e.grade,
        duration: e.duration,
        totalPoints: e.totalPoints,
        topic: e.topic || e.examPackage?.metadata?.chapterTitle || '',
        packageId: e.packageId || e.examPackageId || e.examPackage?.id,
        examPackageId: e.packageId || e.examPackageId || e.examPackage?.id,
        examPackage: e.examPackage,
        createdDate: e.createdDate || e.createdAt || e.updatedAt || '',
        status: e.status || 'active',
        allowedClasses: e.allowedClasses || [],
        scheduledStartTime: e.scheduledStartTime,
        startTimeType: e.startTimeType,
        questionCount: qCount,
        submissionCount: submitted.length,
        activeSessionCount: activeSessions.length,
        antiCheat: e.antiCheat || {
          disallowPrevious: false,
          shuffleQuestions: true,
          shuffleOptions: true,
          autoSubmitOnTimeout: true,
          warnTabSwitch: true,
          tabSwitchLimit: 3,
        },
        createdBy: e.createdBy || userId,
      };
    });

    // 2. Lấy từ Lịch sử Tạo Đề (StorageEngine Exam History) của riêng user này
    const historyPackages = StorageEngine.getExamHistory();
    const historyItems: OnlineExamItem[] = [];
    historyPackages.forEach((pkg) => {
      const onlineCode = pkg.metadata?.onlineExamCode;
      if (onlineCode && onlineCode.trim().length > 0) {
        const cleanCode = onlineCode.trim().toUpperCase();
        if (deletedCodes.has(cleanCode)) return;
        const qCount = pkg.exams?.[0]?.questions?.length || 10;
        historyItems.push({
          id: pkg.id || 'exam_hist_' + cleanCode,
          code: cleanCode,
          title: pkg.metadata.examTitle || 'Đề kiểm tra',
          subject: pkg.metadata.subject || 'Toán',
          grade: pkg.metadata.grade || 'Khối 10',
          duration: Number(pkg.metadata.durationMinutes) || 45,
          totalPoints: Number(pkg.metadata.totalPoints) || 10.0,
          topic: pkg.metadata.chapterTitle || '',
          packageId: pkg.id,
          examPackageId: pkg.id,
          examPackage: pkg,
          createdDate: pkg.createdAt || new Date().toISOString(),
          status: 'active',
          allowedClasses: [],
          questionCount: qCount,
          submissionCount: 0,
          activeSessionCount: 0,
          antiCheat: {
            disallowPrevious: false,
            shuffleQuestions: true,
            shuffleOptions: true,
            autoSubmitOnTimeout: true,
            warnTabSwitch: true,
            tabSwitchLimit: 3,
          },
          createdBy: userId,
        });
      }
    });

    // Tập hợp tất cả các mã đề thuộc sở hữu của user này
    const localKnownCodes = new Set<string>();
    localItems.forEach((it) => it.code && localKnownCodes.add(it.code.toUpperCase()));
    historyItems.forEach((it) => it.code && localKnownCodes.add(it.code.toUpperCase()));

    // 3. Lấy từ Firestore collection 'published_exams' (chỉ lấy đề của chính user này và chưa bị xóa)
    let firestoreExams: (OnlineExamItem & { createdBy?: string })[] = [];
    try {
      const colRef = collection(db, 'published_exams');
      const snap = await getDocs(colRef);
      snap.forEach((d) => {
        const e = d.data() as any;
        if (e && e.code) {
          const codeUpper = e.code.trim().toUpperCase();
          if (deletedCodes.has(codeUpper)) return;
          const isOwner =
            Boolean(userId && userId !== 'guest' && userId !== 'anonymous' && e.createdBy === userId) ||
            (!e.createdBy && localKnownCodes.has(codeUpper));

          if (isOwner) {
            const pkg = e.examPackage || {};
            const qCount = pkg.exams?.[0]?.questions?.length || 10;
            firestoreExams.push({
              id: e.id || 'exam_fs_' + codeUpper,
              code: codeUpper,
              title: e.title || 'Đề kiểm tra',
              subject: e.subject || 'Môn học',
              grade: e.grade || 'Khối 10',
              duration: e.duration || 45,
              totalPoints: e.totalPoints || 10.0,
              topic: e.topic || e.examPackage?.metadata?.chapterTitle || '',
              packageId: e.packageId || e.examPackageId || e.examPackage?.id,
              examPackageId: e.packageId || e.examPackageId || e.examPackage?.id,
              examPackage: e.examPackage,
              createdDate: e.createdDate || new Date().toISOString(),
              status: e.status || 'active',
              allowedClasses: e.allowedClasses || [],
              scheduledStartTime: e.scheduledStartTime,
              startTimeType: e.startTimeType,
              questionCount: qCount,
              submissionCount: 0,
              activeSessionCount: 0,
              antiCheat: e.antiCheat || {
                disallowPrevious: false,
                shuffleQuestions: true,
                shuffleOptions: true,
                autoSubmitOnTimeout: true,
                warnTabSwitch: true,
                tabSwitchLimit: 3,
              },
              createdBy: e.createdBy || userId,
            });
          }
        }
      });
    } catch (e) {
      console.warn('Lỗi đọc published_exams từ Firestore:', e);
    }

    // 4. Hợp nhất tất cả các nguồn đề và khử trùng lặp theo Mã đề (chỉ giữ đề của user hiện tại)
    const map = new Map<string, OnlineExamItem>();
    [...apiExams, ...firestoreExams, ...localItems, ...historyItems].forEach((item: any) => {
      if (item && item.code) {
        const key = item.code.trim().toUpperCase();
        if (deletedCodes.has(key)) return;
        const isOwner =
          Boolean(userId && userId !== 'guest' && userId !== 'anonymous' && item.createdBy === userId) ||
          (!item.createdBy && localKnownCodes.has(key));

        if (isOwner) {
          const itemWithUser = { ...item, createdBy: item.createdBy || userId };
          const existing = map.get(key);
          if (!existing) {
            map.set(key, itemWithUser);
          } else {
            map.set(key, {
              ...existing,
              ...itemWithUser,
              packageId: itemWithUser.packageId || existing.packageId,
              examPackageId: itemWithUser.examPackageId || existing.examPackageId,
              topic: itemWithUser.topic || existing.topic,
              examPackage: itemWithUser.examPackage || existing.examPackage,
              submissionCount: Math.max(existing.submissionCount || 0, itemWithUser.submissionCount || 0),
            });
          }
        }
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
    );

    // Cập nhật số lượng bài nộp thực tế từ Firestore student_results và local sessions
    try {
      const submissionIdMap = new Map<string, Set<string>>();

      const firestoreResults = await this.getStudentResultsFromFirestore('ALL');
      firestoreResults.forEach((res) => {
        if (res && res.examCode && res.id) {
          const codeKey = res.examCode.trim().toUpperCase();
          if (!submissionIdMap.has(codeKey)) {
            submissionIdMap.set(codeKey, new Set<string>());
          }
          submissionIdMap.get(codeKey)!.add(res.id);
        }
      });

      const localSessions = this.getLocalSessions();
      localSessions.forEach((sess) => {
        if (sess && sess.examCode && sess.id && sess.status === 'submitted') {
          const codeKey = sess.examCode.trim().toUpperCase();
          if (!submissionIdMap.has(codeKey)) {
            submissionIdMap.set(codeKey, new Set<string>());
          }
          submissionIdMap.get(codeKey)!.add(sess.id);
        }
      });

      merged.forEach((exam) => {
        const codeKey = (exam.code || '').trim().toUpperCase();
        const submissionSet = submissionIdMap.get(codeKey);
        const count = submissionSet ? submissionSet.size : 0;
        exam.submissionCount = Math.max(exam.submissionCount || 0, count);
      });
    } catch (e) {
      console.warn('Lỗi cập nhật submissionCount trong listExams:', e);
    }

    // Tự động sao lưu đồng bộ vào localExams và Firestore
    try {
      this.saveLocalExams(merged);
      this.syncAllLocalExamsToFirestore().catch(() => {});
    } catch {
      // ignore
    }

    return { success: true, exams: merged };
  }

  // 3. Get Exam Detail
  static async getExamDetail(code: string) {
    const cleanCode = (code || '').trim().toUpperCase();

    // 1. Kiểm tra Firestore published_exams trước (cho phép truy cập đa thiết bị và chạy trên Vercel/môi trường tĩnh)
    try {
      const firestoreExam = await this.getPublishedExamFromFirestore(cleanCode);
      if (firestoreExam) {
        return { success: true, exam: firestoreExam };
      }
    } catch {
      // ignore
    }

    // 2. Kiểm tra bộ nhớ cục bộ LocalStorage
    const exams = this.getLocalExams();
    const exam = exams.find((e) => e.code.toUpperCase() === cleanCode);
    if (exam) {
      return { success: true, exam };
    }

    // 3. Kiểm tra trong Lịch sử Đề thi đã tạo
    const history = StorageEngine.getExamHistory();
    const pkg = history.find((p) => p.metadata?.onlineExamCode?.toUpperCase() === cleanCode);
    if (pkg) {
      const historyExam: OnlineExamItem = {
        id: pkg.id || 'exam_hist_' + cleanCode,
        code: cleanCode,
        title: pkg.metadata.examTitle || 'Đề kiểm tra',
        subject: pkg.metadata.subject || 'Toán',
        grade: pkg.metadata.grade || 'Khối 10',
        duration: Number(pkg.metadata.durationMinutes) || 45,
        totalPoints: Number(pkg.metadata.totalPoints) || 10.0,
        topic: pkg.metadata.chapterTitle || '',
        packageId: pkg.id,
        examPackageId: pkg.id,
        examPackage: pkg,
        createdDate: pkg.createdAt || new Date().toISOString(),
        status: 'active',
        allowedClasses: [],
        questionCount: pkg.exams?.[0]?.questions?.length || 10,
        submissionCount: 0,
        activeSessionCount: 0,
        antiCheat: {
          disallowPrevious: false,
          shuffleQuestions: true,
          shuffleOptions: true,
          autoSubmitOnTimeout: true,
          warnTabSwitch: true,
          tabSwitchLimit: 3,
        },
      };
      return { success: true, exam: historyExam };
    }

    // 4. Gọi API backend nếu đang chạy server Node
    try {
      return await this.request<{ success: boolean; exam: any }>(`/api/exam/detail/${encodeURIComponent(cleanCode)}`);
    } catch {
      // ignore
    }

    throw new Error(`Không tìm thấy đề thi với mã '${cleanCode}'. Vui lòng kiểm tra lại mã đề từ giáo viên.`);
  }

  // 4. Update Exam Status / Settings / Questions & Points
  static async updateExam(
    code: string,
    data: {
      status?: 'active' | 'locked';
      allowExplanations?: boolean;
      duration?: number;
      antiCheat?: any;
      examPackage?: any;
      totalPoints?: number;
      title?: string;
      allowedClasses?: string[];
      scheduledStartTime?: string;
      startTimeType?: 'immediate' | 'scheduled';
    }
  ) {
    const cleanCode = (code || '').trim().toUpperCase();
    let updatedExam: any = null;
    try {
      const res = await this.request<{ success: boolean; exam: any }>(`/api/exam/update/${encodeURIComponent(cleanCode)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (res.success && res.exam) {
        updatedExam = res.exam;
      }
    } catch {
      const exams = this.getLocalExams();
      const index = exams.findIndex((e) => e.code.toUpperCase() === cleanCode);
      if (index !== -1) {
        const existing = exams[index];
        const newScheduledTime = data.startTimeType === 'immediate'
          ? undefined
          : (data.scheduledStartTime !== undefined ? data.scheduledStartTime : existing.scheduledStartTime);
        updatedExam = {
          ...existing,
          ...data,
          scheduledStartTime: newScheduledTime,
          startTimeType: data.startTimeType || (newScheduledTime ? 'scheduled' : 'immediate'),
          antiCheat: data.antiCheat ? { ...existing.antiCheat, ...data.antiCheat } : existing.antiCheat,
        };
        exams[index] = updatedExam;
        this.saveLocalExams(exams);
      }
    }

    if (!updatedExam) {
      const firestoreExam = await this.getPublishedExamFromFirestore(cleanCode);
      if (firestoreExam) {
        const newScheduledTime = data.startTimeType === 'immediate'
          ? undefined
          : (data.scheduledStartTime !== undefined ? data.scheduledStartTime : firestoreExam.scheduledStartTime);
        updatedExam = {
          ...firestoreExam,
          ...data,
          scheduledStartTime: newScheduledTime,
          startTimeType: data.startTimeType || (newScheduledTime ? 'scheduled' : 'immediate'),
          antiCheat: data.antiCheat ? { ...firestoreExam.antiCheat, ...data.antiCheat } : firestoreExam.antiCheat,
        };
      }
    }

    if (updatedExam) {
      // If immediate, ensure scheduledStartTime is deleted or null in firestore
      if (data.startTimeType === 'immediate') {
        updatedExam.scheduledStartTime = null;
        updatedExam.startTimeType = 'immediate';
      }
      await this.syncPublishedExamToFirestore(updatedExam);
      const exams = this.getLocalExams();
      const index = exams.findIndex((e) => e.code.toUpperCase() === cleanCode);
      if (index !== -1) {
        exams[index] = { ...exams[index], ...updatedExam };
        this.saveLocalExams(exams);
      }
      return { success: true, exam: updatedExam };
    }

    throw new Error('Không tìm thấy đề thi để cập nhật.');
  }

  // 5. Delete Exam
  static async deleteExam(code: string) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Mã đề không hợp lệ.' };
    }

    // 1. Thêm vào danh sách mã đề đã xóa (chặn mọi hành vi sync hoặc hồi sinh)
    this.addDeletedExamCode(cleanCode);

    // 2. Gỡ liên kết onlineExamCode trong Lịch sử tạo đề của StorageEngine
    StorageEngine.removeOnlineExamCode(cleanCode);

    // 3. Xóa đề thi khỏi bộ nhớ cục bộ (local storage)
    const localExams = this.getLocalExams().filter((e) => (e.code || '').trim().toUpperCase() !== cleanCode);
    this.saveLocalExams(localExams);

    // 4. Dọn dẹp phiên thi cục bộ của đề này
    try {
      const remainingSessions = this.getLocalSessions().filter(
        (s) => (s.examCode || '').trim().toUpperCase() !== cleanCode
      );
      this.saveLocalSessions(remainingSessions);
    } catch (e) {
      console.warn('Lỗi dọn dẹp sessions cục bộ:', e);
    }

    // 5. Xóa trực tiếp document 'published_exams/{cleanCode}' trên Firestore
    try {
      const docRef = doc(db, 'published_exams', cleanCode);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Lỗi xóa published_exams từ Firestore:', e);
    }

    // Quét thêm bất kỳ document nào trong published_exams có code trùng khớp
    try {
      const q = query(collection(db, 'published_exams'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }
    } catch (e) {
      console.warn('Lỗi quét xóa published_exams theo query:', e);
    }

    // 6. Dọn dẹp kết quả học sinh nộp cho đề này trong Firestore collection 'student_results'
    try {
      const qRes = query(collection(db, 'student_results'), where('examCode', '==', cleanCode));
      const snapRes = await getDocs(qRes);
      for (const docSnap of snapRes.docs) {
        await deleteDoc(docSnap.ref);
      }
    } catch (e) {
      console.warn('Lỗi dọn dẹp student_results trên Firestore:', e);
    }

    // 7. Đồng bộ cập nhật lên Firestore 'user_data' (cập nhật examHistory và onlineExams không còn đề này)
    try {
      const userId = this.getActiveUserId();
      if (userId && userId !== 'guest') {
        const history = StorageEngine.getExamHistory();
        const set = this.getDeletedExamCodes();
        UserDataSync.saveUserData(userId, {
          onlineExams: localExams,
          examHistory: history,
          deletedExamCodes: Array.from(set),
        });
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ xóa tới Firestore user_data:', e);
    }

    // 8. Gửi yêu cầu DELETE tới server backend
    try {
      await this.request<{ success: boolean; message: string }>(
        `/api/exam/delete/${encodeURIComponent(cleanCode)}`,
        {
          method: 'DELETE',
        }
      );
    } catch {
      // ignore
    }

    return { success: true, message: 'Đã xóa đề thi thành công.' };
  }

  // 6. Get Student Exam Public Info
  static async getStudentExamInfo(code: string) {
    const cleanCode = (code || '').trim().toUpperCase();

    // 1. Kiểm tra Firestore trước
    try {
      const firestoreExam = await this.getPublishedExamFromFirestore(cleanCode);
      if (firestoreExam) {
        if (firestoreExam.status === 'locked') {
          throw new Error('Đề thi này hiện đang bị khóa bởi giáo viên.');
        }
        const questions = firestoreExam.questions || firestoreExam.examPackage?.exams?.[0]?.questions || [];
        return {
          success: true,
          info: {
            code: firestoreExam.code,
            title: firestoreExam.title,
            subject: firestoreExam.subject,
            grade: firestoreExam.grade,
            duration: firestoreExam.duration,
            totalPoints: firestoreExam.totalPoints,
            antiCheat: firestoreExam.antiCheat,
            questionCount: firestoreExam.questionCount || questions.length || 10,
            allowedClasses: firestoreExam.allowedClasses,
            scheduledStartTime: firestoreExam.scheduledStartTime,
            startTimeType: firestoreExam.startTimeType,
          },
        };
      }
    } catch (e: any) {
      if (e.message && e.message.includes('khóa')) {
        throw e;
      }
    }

    // 2. Kiểm tra bộ nhớ cục bộ hoặc fallback getExamDetail
    try {
      const examRes = await this.getExamDetail(cleanCode);
      const exam = examRes.exam;
      if (exam.status === 'locked') {
        throw new Error('Đề thi này hiện đang bị khóa bởi giáo viên.');
      }
      const questions = exam.examPackage?.exams?.[0]?.questions || [];
      return {
        success: true,
        info: {
          code: exam.code,
          title: exam.title,
          subject: exam.subject,
          grade: exam.grade,
          duration: exam.duration,
          totalPoints: exam.totalPoints,
          antiCheat: exam.antiCheat,
          questionCount: questions.length,
          allowedClasses: exam.allowedClasses,
          scheduledStartTime: exam.scheduledStartTime,
          startTimeType: exam.startTimeType,
        },
      };
    } catch {
      // ignore
    }

    // 3. Kiểm tra API backend
    try {
      const res = await this.request<{
        success: boolean;
        info: {
          code: string;
          title: string;
          subject: string;
          grade: string;
          duration: number;
          totalPoints: number;
          antiCheat: any;
          questionCount: number;
          allowedClasses?: string[];
          scheduledStartTime?: string;
          startTimeType?: 'immediate' | 'scheduled';
        };
      }>(`/api/exam/student-info/${encodeURIComponent(cleanCode)}`);
      return res;
    } catch {
      throw new Error(`Không tìm thấy đề thi với mã '${cleanCode}'. Vui lòng kiểm tra lại mã đề từ giáo viên.`);
    }
  }

  // 7. Start Student Exam Session
  static async startStudentExam(data: {
    code: string;
    studentName: string;
    studentClass: string;
    studentId?: string;
    studentSchool?: string;
  }) {
    try {
      const res = await this.request<any>('/api/exam/start', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (res && res.session) {
        const sessions = this.getLocalSessions();
        const idx = sessions.findIndex((s) => s.id === res.session.id);
        const updatedSess = {
          ...res.session,
          shuffledQuestions: res.questions || res.session.shuffledQuestions,
        };
        if (idx >= 0) {
          sessions[idx] = { ...sessions[idx], ...updatedSess };
        } else {
          sessions.push(updatedSess);
        }
        this.saveLocalSessions(sessions);
      }
      return res;
    } catch (err: any) {
      if (
        err.message &&
        err.message !== 'SERVER_OFFLINE_OR_NON_JSON' &&
        !err.message.includes('Unexpected') &&
        !err.message.includes('JSON')
      ) {
        throw err;
      }

      const examRes = await this.getExamDetail(data.code);
      const exam = examRes.exam;

      if (exam.status === 'locked') {
        throw new Error('Đề thi này hiện đang bị khóa.');
      }

      if (exam.scheduledStartTime) {
        const scheduledTime = new Date(exam.scheduledStartTime).getTime();
        const now = Date.now();
        if (scheduledTime - now > 5000) {
          const formatted = new Date(exam.scheduledStartTime).toLocaleString('vi-VN');
          throw new Error(`Chưa đến thời gian bắt đầu làm bài. Đề thi sẽ mở vào lúc: ${formatted}`);
        }
      }

      // 1. Validate Grade Compatibility (e.g. Grade 7 Exam vs Grade 9 Student)
      const examGradeNum = extractGradeNumber(exam.grade);
      const studentClassGradeNum = extractGradeNumber(data.studentClass);

      if (examGradeNum && studentClassGradeNum && examGradeNum !== studentClassGradeNum) {
        throw new Error(
          `Cảnh báo: Đề thi này dành riêng cho học sinh Khối ${examGradeNum} (${exam.grade || ''}). Học sinh thuộc Khối ${studentClassGradeNum} (Lớp ${data.studentClass}) không được phép tham gia bài thi này!`
        );
      }

      // 2. Validate allowed classes for the exam if specified
      if (exam.allowedClasses && Array.isArray(exam.allowedClasses) && exam.allowedClasses.length > 0) {
        const studentNormClass = normalizeClassName(data.studentClass);
        const isAllowed = exam.allowedClasses.some(
          (c) => normalizeClassName(c) === studentNormClass || c === data.studentClass
        );
        if (!isAllowed) {
          throw new Error(
            `Cảnh báo: Tên lớp "${data.studentClass}" không thuộc danh sách các lớp được phân công làm bài thi này (${exam.allowedClasses.join(', ')}). Vui lòng kiểm tra lại thông tin tên và lớp!`
          );
        }
      }

      // Database validation against classes & students (Firestore, API, Local)
      const classesRes = await this.getClasses(true);
      const studentsRes = await this.getStudents(undefined, true);
      const localClasses = classesRes.classes || [];
      const localStudents = studentsRes.students || [];

      const normClass = normalizeClassName(data.studentClass);
      const normName = data.studentName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

      if (localClasses.length > 0 || localStudents.length > 0) {
        const matchingClass = localClasses.find((c) => normalizeClassName(c.name) === normClass || c.id === data.studentClass);
        if (matchingClass && examGradeNum) {
          const classGradeNum = extractGradeNumber(matchingClass.grade) || extractGradeNumber(matchingClass.name);
          if (classGradeNum && classGradeNum !== examGradeNum) {
            throw new Error(
              `Cảnh báo: Lớp "${data.studentClass}" thuộc Khối ${classGradeNum}, không phù hợp với bài thi Khối ${examGradeNum} (${exam.grade || ''})!`
            );
          }
        }

        const isClassValid =
          !!matchingClass ||
          localStudents.some((s) => normalizeClassName(s.className) === normClass) ||
          (exam.allowedClasses && exam.allowedClasses.some((c) => normalizeClassName(c) === normClass));

        if (!isClassValid) {
          throw new Error(
            `Cảnh báo: Lớp "${data.studentClass}" không tồn tại trên hệ thống. Vui lòng kiểm tra lại thông tin tên và lớp!`
          );
        }
      }

      if (localStudents.length > 0) {
        const matchingNameStudents = localStudents.filter(
          (s) =>
            s.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ') === normName ||
            s.name.trim().toLowerCase() === data.studentName.trim().toLowerCase()
        );

        if (matchingNameStudents.length > 0) {
          const exactMatch = matchingNameStudents.find(
            (s) => normalizeClassName(s.className) === normClass || s.classId === data.studentClass
          );
          if (!exactMatch) {
            const actualClass = matchingNameStudents[0].className;
            throw new Error(
              `Cảnh báo: Học sinh "${data.studentName}" trên hệ thống thuộc Lớp "${actualClass}", không phải Lớp "${data.studentClass}". Vui lòng kiểm tra lại thông tin lớp!`
            );
          }
          if (examGradeNum) {
            const matchedGrade = extractGradeNumber(exactMatch.className);
            if (matchedGrade && matchedGrade !== examGradeNum) {
              throw new Error(
                `Cảnh báo: Học sinh "${exactMatch.name}" (Lớp ${exactMatch.className}) thuộc Khối ${matchedGrade}, không được phép tham gia bài thi Khối ${examGradeNum} (${exam.grade || ''})!`
              );
            }
          }
        } else {
          const studentsInClass = localStudents.filter(
            (s) => normalizeClassName(s.className) === normClass || s.classId === data.studentClass
          );
          if (studentsInClass.length > 0) {
            throw new Error(
              `Cảnh báo: Không tìm thấy học sinh "${data.studentName}" trong danh sách Lớp "${data.studentClass}" trên hệ thống. Vui lòng kiểm tra lại chính xác Họ và Tên!`
            );
          } else {
            throw new Error(
              `Cảnh báo: Học sinh "${data.studentName}" (Lớp ${data.studentClass}) không có trong danh sách học sinh của hệ thống. Vui lòng kiểm tra lại thông tin tên và lớp!`
            );
          }
        }
      }

      const sessions = this.getLocalSessions();
      const session = sessions.find(
        (s) =>
          s.examCode.toUpperCase() === data.code.toUpperCase() &&
          s.studentName.toLowerCase().trim() === data.studentName.toLowerCase().trim() &&
          s.studentClass.toLowerCase().trim() === data.studentClass.toLowerCase().trim()
      );

      if (session) {
        if (session.status === 'submitted') {
          return {
            success: true,
            isAlreadySubmitted: true,
            result: {
              score: session.score || 0,
              correctCount: session.correctCount || 0,
              incorrectCount: session.incorrectCount || 0,
              totalQuestions: session.totalQuestions || 0,
              startTime: session.startTime,
              submitTime: session.submitTime,
              allowExplanations: exam.allowExplanations,
            },
          };
        }
        return {
          success: true,
          isResume: true,
          session,
          questions: session.shuffledQuestions,
          examInfo: {
            title: exam.title,
            subject: exam.subject,
            grade: exam.grade,
            duration: exam.duration,
            totalPoints: exam.totalPoints,
            antiCheat: exam.antiCheat,
          },
        };
      }

      let questions = exam.questions || exam.examPackage?.exams?.[0]?.questions || [];
      if (!questions.length) {
        try {
          const history = StorageEngine.getExamHistory();
          const pkg = history.find(
            (p) =>
              p.metadata?.onlineExamCode?.toUpperCase() === exam.code?.toUpperCase() ||
              p.id === exam.packageId ||
              p.id === exam.examPackageId
          );
          if (pkg?.exams?.[0]?.questions?.length) {
            questions = pkg.exams[0].questions;
          }
        } catch {}
      }

      const sanitizedQuestions = questions.map((q: any, idx: number) => {
        const qContent = q.content || q.text || q.questionText || '';
        const partType = q.partType || 'PART1';
        const clean: any = {
          id: q.id || `q_${idx + 1}`,
          number: q.number || idx + 1,
          content: qContent,
          text: qContent,
          questionText: qContent,
          partType,
          partTitle:
            q.partTitle ||
            (partType === 'PART1'
              ? 'Phần I: Trắc nghiệm 4 lựa chọn'
              : partType === 'PART2'
              ? 'Phần II: Trắc nghiệm Đúng/Sai'
              : partType === 'PART3'
              ? 'Phần III: Trắc nghiệm trả lời ngắn'
              : 'Phần IV: Tự luận'),
          cognitiveLevel: q.cognitiveLevel || q.level || 'NB',
          level: q.level || q.cognitiveLevel || 'NB',
          points: typeof q.points === 'number' ? q.points : 0.25,
          topic: q.topic || '',
          svgDiagram: q.svgDiagram || '',
        };

        if (Array.isArray(q.options)) {
          clean.options = q.options.map((opt: any, optIdx: number) => {
            const defaultKey = ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);
            const optContent = typeof opt === 'string' ? opt : (opt.content || opt.text || '');
            const optKey = typeof opt === 'object' ? (opt.key || opt.id || defaultKey) : defaultKey;
            return {
              key: optKey,
              id: optKey,
              content: optContent,
              text: optContent,
            };
          });
        }

        const rawStatements = q.trueFalseStatements || q.statements;
        if (Array.isArray(rawStatements)) {
          const cleanStatements = rawStatements.map((st: any, stIdx: number) => {
            const defaultKey = ['a', 'b', 'c', 'd'][stIdx] || String.fromCharCode(97 + stIdx);
            const stContent = typeof st === 'string' ? st : (st.content || st.text || '');
            const stKey = typeof st === 'object' ? (st.key || defaultKey) : defaultKey;
            return {
              key: stKey,
              content: stContent,
              text: stContent,
            };
          });
          clean.trueFalseStatements = cleanStatements;
          clean.statements = cleanStatements;
        }

        if (exam.allowExplanations) {
          clean.explanation = q.explanation || q.solution || '';
        }

        return clean;
      });

      const newSession: any = {
        id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        examCode: exam.code,
        studentName: data.studentName,
        studentClass: data.studentClass,
        studentId: data.studentId || '',
        studentSchool: data.studentSchool || '',
        seed: String(Date.now()),
        startTime: new Date().toISOString(),
        remainingSeconds: exam.duration * 60,
        answers: {},
        shuffledQuestions: sanitizedQuestions,
        activityLogs: [{ timestamp: new Date().toISOString(), event: 'Bắt đầu làm bài thi' }],
        status: 'in_progress',
      };

      sessions.push(newSession);
      this.saveLocalSessions(sessions);

      return {
        success: true,
        session: newSession,
        questions: sanitizedQuestions,
        examInfo: {
          title: exam.title,
          subject: exam.subject,
          grade: exam.grade,
          duration: exam.duration,
          totalPoints: exam.totalPoints,
          antiCheat: exam.antiCheat,
        },
      };
    }
  }

  // 8. Save Student Progress
  static async saveProgress(sessionId: string, answers: Record<string, any>, remainingSeconds: number) {
    try {
      return await this.request<{ success: boolean }>('/api/exam/save-progress', {
        method: 'POST',
        body: JSON.stringify({ sessionId, answers, remainingSeconds }),
      });
    } catch {
      const sessions = this.getLocalSessions();
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].answers = { ...sessions[idx].answers, ...answers };
        sessions[idx].remainingSeconds = remainingSeconds;
        this.saveLocalSessions(sessions);
      }
      return { success: true };
    }
  }

  // 9. Submit Student Exam
  static async submitExam(sessionId: string, answers: Record<string, any>, remainingSeconds: number) {
    let submitRes: any = null;
    try {
      submitRes = await this.request<{
        success: boolean;
        result: {
          score: number;
          correctCount: number;
          incorrectCount: number;
          totalQuestions: number;
          startTime: string;
          submitTime: string;
          allowExplanations: boolean;
          detailedGrading: any[];
        };
      }>('/api/exam/submit', {
        method: 'POST',
        body: JSON.stringify({ sessionId, answers, remainingSeconds }),
      });
    } catch (err: any) {
      if (
        err.message &&
        err.message !== 'SERVER_OFFLINE_OR_NON_JSON' &&
        !err.message.includes('Unexpected') &&
        !err.message.includes('JSON')
      ) {
        throw err;
      }
      const sessions = this.getLocalSessions();
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx === -1) {
        throw new Error('Không tìm thấy phiên làm bài.');
      }

      const session = sessions[idx];
      const examRes = await this.getExamDetail(session.examCode);
      const exam = examRes.exam;
      const originalQuestions = exam.examPackage?.exams?.[0]?.questions || [];

      let correctCount = 0;
      const totalQuestions = originalQuestions.length;
      const finalAnswers = { ...session.answers, ...answers };
      const detailedGrading: any[] = [];

      let totalEarnedPts = 0;
      originalQuestions.forEach((q: any, i: number) => {
        const studentAns = finalAnswers[q.id];
        const pt = Number(q.points) || (exam.totalPoints > 0 && totalQuestions > 0 ? exam.totalPoints / totalQuestions : 0.25);

        if (q.partType === 'PART2') {
          const statements = Array.isArray(q.trueFalseStatements) ? q.trueFalseStatements : [];
          const statementsCount = statements.length > 0 ? statements.length : 4;
          const studentTfMap = typeof studentAns === 'object' && studentAns ? studentAns : {};
          let correctStatementsCount = 0;

          statements.forEach((st: any) => {
            if (studentTfMap[st.key] === st.isCorrect) {
              correctStatementsCount++;
            }
          });

          const earnedPts = Math.round((correctStatementsCount / statementsCount) * pt * 100) / 100;
          totalEarnedPts += earnedPts;
          const isCorrect = correctStatementsCount === statementsCount;
          if (isCorrect) correctCount++;

          detailedGrading.push({
            questionId: q.id,
            questionNumber: q.number || i + 1,
            partType: 'PART2',
            studentAnswer: studentTfMap,
            correctAnswer: statements.map((st: any) => `${st.key}: ${st.isCorrect ? 'Đúng' : 'Sai'}`).join(' | '),
            isCorrect,
            points: earnedPts,
            maxPoints: pt,
            content: q.content,
            trueFalseStatements: statements,
            explanation: q.explanation || q.solution || q.explain || '',
          });
        } else {
          const correctAns = q.correctOption || q.correctAnswer || q.shortAnswer || 'A';
          let isCorrect = false;
          let earnedPts = 0;
          if (studentAns && String(studentAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase()) {
            isCorrect = true;
            earnedPts = pt;
            correctCount++;
          }
          totalEarnedPts += earnedPts;
          detailedGrading.push({
            questionId: q.id,
            questionNumber: q.number || i + 1,
            partType: q.partType || 'PART1',
            studentAnswer: studentAns || 'Chưa trả lời',
            correctAnswer: correctAns,
            isCorrect,
            points: earnedPts,
            maxPoints: pt,
            content: q.content,
            options: q.options,
            explanation: q.explanation || q.solution || q.explain || '',
          });
        }
      });

      const score = Math.round(totalEarnedPts * 100) / 100;
      const submitTime = new Date().toISOString();

      session.answers = finalAnswers;
      session.remainingSeconds = remainingSeconds;
      session.submitTime = submitTime;
      session.status = 'submitted';
      session.score = score;
      session.correctCount = correctCount;
      session.incorrectCount = totalQuestions - correctCount;
      session.totalQuestions = totalQuestions;
      session.activityLogs.push({ timestamp: submitTime, event: 'Nộp bài thi hoàn tất' });

      sessions[idx] = session;
      this.saveLocalSessions(sessions);

      submitRes = {
        success: true,
        result: {
          score,
          correctCount,
          incorrectCount: totalQuestions - correctCount,
          totalQuestions,
          startTime: session.startTime,
          submitTime,
          allowExplanations: exam.allowExplanations,
          detailedGrading,
        },
      };
    }

    // Always sync result item to Firestore
    try {
      const sessions = this.getLocalSessions();
      let session = sessions.find((s) => s.id === sessionId);

      const resResult = submitRes?.result;
      const examCode = session?.examCode || resResult?.examCode;

      if (examCode) {
        const examDetail = await this.getExamDetail(examCode).catch(() => null);
        const exam = examDetail?.exam;
        const teacherId = exam?.createdBy || '';

        if (session) {
          session.status = 'submitted';
          if (resResult) {
            session.score = resResult.score;
            session.correctCount = resResult.correctCount;
            session.incorrectCount = resResult.incorrectCount;
            session.totalQuestions = resResult.totalQuestions;
            session.submitTime = resResult.submitTime || session.submitTime;
          }
          const sIdx = sessions.findIndex((s) => s.id === sessionId);
          if (sIdx >= 0) {
            sessions[sIdx] = session;
            this.saveLocalSessions(sessions);
          }
        }

        const studentName = session?.studentName || '';
        const studentClass = session?.studentClass || '';
        const studentId = session?.studentId || '';
        const startTime = session?.startTime || resResult?.startTime || new Date().toISOString();
        const submitTime = resResult?.submitTime || session?.submitTime || new Date().toISOString();

        const tabSwitches = (session?.activityLogs || []).filter((l: any) => l.event && l.event.includes('Chuyển tab')).length;
        const start = new Date(startTime).getTime();
        const end = new Date(submitTime).getTime();
        const durationMinutes = Math.max(1, Math.round((end - start) / 60000));

        await this.syncStudentResultToFirestore({
          id: sessionId,
          examCode: examCode.trim().toUpperCase(),
          studentName,
          studentClass,
          studentSbd: studentId,
          studentId,
          studentSchool: session?.studentSchool || '',
          startTime,
          submitTime,
          durationMinutes,
          score: resResult?.score ?? session?.score ?? 0,
          correctCount: resResult?.correctCount ?? session?.correctCount ?? 0,
          incorrectCount: resResult?.incorrectCount ?? session?.incorrectCount ?? 0,
          totalQuestions: resResult?.totalQuestions ?? session?.totalQuestions ?? 0,
          tabSwitches,
          activityLogs: session?.activityLogs || [],
          createdBy: teacherId,
          teacherId,
        });
      }
    } catch (e) {
      console.warn('Lỗi sync student result to Firestore:', e);
    }

    return submitRes;
  }

  // 10. Log Activity (Anti-cheat)
  static async logActivity(sessionId: string, event: string, details?: string) {
    try {
      return await this.request<{ success: boolean }>('/api/exam/log-activity', {
        method: 'POST',
        body: JSON.stringify({ sessionId, event, details }),
      });
    } catch {
      const sessions = this.getLocalSessions();
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].activityLogs.push({
          timestamp: new Date().toISOString(),
          event,
          details,
        });
        this.saveLocalSessions(sessions);
      }
      return { success: true };
    }
  }

  // 11. Get Teacher Results
  static async getTeacherResults(code: string = 'ALL') {
    const codeUpper = (code || 'ALL').trim().toUpperCase();
    let apiResults: StudentResultItem[] = [];
    try {
      const res = await this.request<{ success: boolean; results: StudentResultItem[] }>(
        `/api/teacher/results?code=${encodeURIComponent(codeUpper)}`
      );
      if (res.success && Array.isArray(res.results)) {
        apiResults = res.results;
      }
    } catch {
      // ignore
    }

    const sessions = this.getLocalSessions().filter((s) => s.status === 'submitted');
    const filteredLocal =
      codeUpper === 'ALL'
        ? sessions
        : sessions.filter((s) => s.examCode.toUpperCase() === codeUpper);

    const localResults: StudentResultItem[] = filteredLocal.map((s) => {
      const tabSwitches = (s.activityLogs || []).filter((l: any) => l.event && l.event.includes('Chuyển tab')).length;
      const start = new Date(s.startTime).getTime();
      const end = s.submitTime ? new Date(s.submitTime).getTime() : Date.now();
      const durationMinutes = Math.max(1, Math.round((end - start) / 60000));

      return {
        id: s.id,
        examCode: s.examCode,
        studentName: s.studentName,
        studentClass: s.studentClass,
        studentSbd: s.studentId,
        studentId: s.studentId,
        studentSchool: s.studentSchool,
        startTime: s.startTime,
        submitTime: s.submitTime || undefined,
        durationMinutes,
        score: s.score || 0,
        correctCount: s.correctCount || 0,
        incorrectCount: s.incorrectCount || 0,
        totalQuestions: s.totalQuestions || 0,
        tabSwitches,
        activityLogs: s.activityLogs || [],
      };
    });

    const firestoreResults = await this.getStudentResultsFromFirestore(codeUpper);

    const userId = this.getActiveUserId();
    const teacherExamsRes = await this.listExams();
    const examsList: any[] = Array.isArray(teacherExamsRes) ? teacherExamsRes : (teacherExamsRes?.exams || []);
    const teacherCodes = new Set(examsList.map((e: any) => (e.code || '').toUpperCase()));

    const map = new Map<string, StudentResultItem>();
    [...apiResults, ...firestoreResults, ...localResults].forEach((item) => {
      if (item && item.id) {
        if (teacherCodes.has((item.examCode || '').toUpperCase())) {
          map.set(item.id, item);
        }
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.submitTime || 0).getTime() - new Date(a.submitTime || 0).getTime()
    );

    return { success: true, results: merged };
  }

  // 12. Delete Student Result
  static async deleteResult(sessionId: string) {
    try {
      await deleteDoc(doc(db, 'student_results', sessionId));
    } catch (e) {
      console.warn('Lỗi xóa student_results trên Firestore:', e);
    }
    try {
      return await this.request<{ success: boolean; message: string }>(
        `/api/teacher/results/${encodeURIComponent(sessionId)}`,
        {
          method: 'DELETE',
        }
      );
    } catch {
      const sessions = this.getLocalSessions().filter((s) => s.id !== sessionId);
      this.saveLocalSessions(sessions);
      return { success: true, message: 'Đã xóa kết quả làm bài' };
    }
  }

  private static async syncClassToFirestore(cls: any): Promise<void> {
    if (!cls || !cls.id) return;
    try {
      const docRef = doc(db, 'system_classes', cls.id);
      const userId = cls.createdBy || this.getActiveUserId();
      await setDoc(
        docRef,
        {
          ...cls,
          createdBy: userId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Lỗi đồng bộ class tới Firestore:', e);
    }
  }

  private static async syncStudentToFirestore(student: any): Promise<void> {
    if (!student || !student.id) return;
    try {
      const docRef = doc(db, 'system_students', student.id);
      const cleanSbd = student.sbd ? student.sbd.trim().toUpperCase() : '';
      const userId = student.createdBy || this.getActiveUserId();
      await setDoc(
        docRef,
        {
          ...student,
          createdBy: userId,
          sbd: cleanSbd,
          sbdOriginal: student.sbd ? student.sbd.trim() : '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Lỗi đồng bộ student tới Firestore:', e);
    }
  }

  private static async getSystemClassesFromFirestore(ignoreUserIdFilter: boolean = false): Promise<any[]> {
    const userId = this.getActiveUserId();
    try {
      const colRef = collection(db, 'system_classes');
      let snap;
      if (userId && userId !== 'guest' && !ignoreUserIdFilter) {
        try {
          const q = query(colRef, where('createdBy', '==', userId));
          snap = await getDocs(q);
        } catch {
          snap = await getDocs(colRef);
        }
      } else {
        snap = await getDocs(colRef);
      }

      const items: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.id) {
          if (ignoreUserIdFilter || data.createdBy === userId || (!data.createdBy && userId === 'guest')) {
            items.push(data);
          }
        }
      });
      return items;
    } catch (e) {
      console.warn('Lỗi đọc system_classes từ Firestore:', e);
      return [];
    }
  }

  private static async getSystemStudentsFromFirestore(ignoreUserIdFilter: boolean = false): Promise<any[]> {
    const userId = this.getActiveUserId();
    try {
      const colRef = collection(db, 'system_students');
      let snap;
      if (userId && userId !== 'guest' && !ignoreUserIdFilter) {
        try {
          const q = query(colRef, where('createdBy', '==', userId));
          snap = await getDocs(q);
        } catch {
          snap = await getDocs(colRef);
        }
      } else {
        snap = await getDocs(colRef);
      }

      const items: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.id) {
          if (ignoreUserIdFilter || data.createdBy === userId || (!data.createdBy && userId === 'guest')) {
            items.push(data);
          }
        }
      });
      return items;
    } catch (e) {
      console.warn('Lỗi đọc system_students từ Firestore:', e);
      return [];
    }
  }

  // 13. Classes Management
  static async getClasses(ignoreUserIdFilter: boolean = false) {
    const userId = this.getActiveUserId();
    const localClasses = this.getLocalClasses();

    // Fetch API and Firestore in parallel
    const [apiResult, firestoreClasses] = await Promise.all([
      this.request<{ success: boolean; classes: any[] }>('/api/classes').catch(() => ({ success: false, classes: [] })),
      this.getSystemClassesFromFirestore(ignoreUserIdFilter).catch(() => []),
    ]);

    const apiClasses = (apiResult && apiResult.success && Array.isArray(apiResult.classes)) ? apiResult.classes : [];

    const map = new Map<string, any>();
    [...apiClasses, ...firestoreClasses, ...localClasses].forEach((cls) => {
      if (cls && cls.id) {
        if (ignoreUserIdFilter || cls.createdBy === userId || (!cls.createdBy && userId === 'guest')) {
          map.set(cls.id, cls);
        }
      }
    });

    const merged = Array.from(map.values());

    // Sắp xếp danh sách lớp ổn định theo Khối và Tên lớp (10A1, 10A2, 10B1... 11A1...)
    merged.sort((a, b) => {
      const gradeA = parseInt((a.grade || '').replace(/\D/g, '') || '0', 10);
      const gradeB = parseInt((b.grade || '').replace(/\D/g, '') || '0', 10);
      if (gradeA !== gradeB && gradeA > 0 && gradeB > 0) return gradeA - gradeB;
      return naturalCompare(a.name || '', b.name || '');
    });

    // Update local cache if merged has more info
    if (merged.length > 0 && merged.length !== localClasses.length) {
      this.saveLocalClasses(merged);
    }

    if (localClasses.length > 0 || apiClasses.length > 0) {
      const firestoreIds = new Set(firestoreClasses.map((c) => c.id));
      const unSynced = [...apiClasses, ...localClasses].filter((c) => c && c.id && !firestoreIds.has(c.id));
      if (unSynced.length > 0) {
        unSynced.forEach((cls) => {
          this.syncClassToFirestore(cls).catch(() => {});
        });
      }
    }

    return { success: true, classes: merged };
  }

  static async saveClass(data: {
    id?: string;
    name: string;
    grade: string;
    schoolYear?: string;
    teacherName?: string;
    notes?: string;
  }) {
    const userId = this.getActiveUserId();
    const id = data.id || 'cls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const savedClass = {
      ...data,
      id,
      createdBy: userId,
      createdAt: (data as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Instantly update Local Storage
    const classes = this.getLocalClasses();
    const updated = [savedClass, ...classes.filter((c) => c.id !== savedClass.id)];
    this.saveLocalClasses(updated);

    // 2. Instantly update UserDataSync
    if (userId && userId !== 'guest') {
      UserDataSync.saveUserData(userId, { classes: updated }).catch(() => {});
    }

    // 3. Sync to API backend and Firestore in parallel (non-blocking)
    Promise.allSettled([
      this.request<{ success: boolean; class: any }>('/api/classes', {
        method: 'POST',
        body: JSON.stringify(savedClass),
      }),
      this.syncClassToFirestore(savedClass),
    ]).catch((err) => {
      console.warn('Lỗi đồng bộ ngầm class lên Cloud/API:', err);
    });

    return { success: true, class: savedClass };
  }

  static async deleteClass(id: string, className?: string) {
    const localClasses = this.getLocalClasses();
    const targetClass = localClasses.find((c) => c.id === id || c.name === id || (className && c.name === className));
    const targetName = className || targetClass?.name || id;
    const normClassName = targetName.trim().toLowerCase();
    const normClassId = id.trim().toLowerCase();
    const userId = this.getActiveUserId();

    // 1. Delete class from local classes immediately
    const remainingClasses = localClasses.filter((c) => c.id !== id && c.name !== targetName);
    this.saveLocalClasses(remainingClasses);

    // 2. Delete students belonging to this class from local students immediately
    const localStudents = this.getLocalStudents();
    const remainingStudents = localStudents.filter(
      (s) =>
        s.classId !== id &&
        s.classId !== targetClass?.id &&
        (s.className || '').trim().toLowerCase() !== normClassName &&
        (s.className || '').trim().toLowerCase() !== normClassId
    );
    this.saveLocalStudents(remainingStudents);

    // 3. Instantly update UserDataSync
    if (userId && userId !== 'guest') {
      UserDataSync.saveUserData(userId, {
        classes: remainingClasses,
        students: remainingStudents,
      }).catch(() => {});
    }

    // 4. Remote cleanup: Firestore batch delete + Server API in parallel
    const remoteCleanups: Promise<any>[] = [];

    // 4a. Server API DELETE
    remoteCleanups.push(
      this.request<{ success: boolean }>(`/api/classes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {})
    );

    // 4b. Firestore delete class documents and student documents via batch
    const firestoreCleanup = async () => {
      try {
        const batch = writeBatch(db);

        // Delete class doc
        const classRef = doc(db, 'system_classes', id);
        batch.delete(classRef);
        if (targetClass?.id && targetClass.id !== id) {
          batch.delete(doc(db, 'system_classes', targetClass.id));
        }

        // Query students belonging to this class
        const colRef = collection(db, 'system_students');
        const studentDocIds = new Set<string>();

        // Query by classId
        try {
          const qId = query(colRef, where('classId', '==', id));
          const snapId = await getDocs(qId);
          snapId.forEach((d) => studentDocIds.add(d.id));
        } catch {
          // ignore
        }

        if (targetClass?.id && targetClass.id !== id) {
          try {
            const qTargetId = query(colRef, where('classId', '==', targetClass.id));
            const snapTargetId = await getDocs(qTargetId);
            snapTargetId.forEach((d) => studentDocIds.add(d.id));
          } catch {
            // ignore
          }
        }

        // Query by className
        if (targetName) {
          try {
            const qName = query(colRef, where('className', '==', targetName));
            const snapName = await getDocs(qName);
            snapName.forEach((d) => studentDocIds.add(d.id));
          } catch {
            // ignore
          }
        }

        // Add matching students to batch delete
        studentDocIds.forEach((docId) => {
          batch.delete(doc(db, 'system_students', docId));
        });

        await batch.commit();
      } catch (err) {
        console.warn('Lỗi dọn dẹp Firestore cho lớp:', err);
      }
    };

    remoteCleanups.push(firestoreCleanup());

    // Run remote cleanups concurrently in background
    Promise.allSettled(remoteCleanups).catch(() => {});

    return { success: true };
  }

  // 14. Students Management
  static async getStudents(classId?: string, ignoreUserIdFilter: boolean = false) {
    const userId = this.getActiveUserId();
    const localStudents = this.getLocalStudents();

    const queryStr = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    const [apiResult, firestoreStudents] = await Promise.all([
      this.request<{ success: boolean; students: any[] }>(`/api/students${queryStr}`).catch(() => ({ success: false, students: [] })),
      this.getSystemStudentsFromFirestore(ignoreUserIdFilter).catch(() => []),
    ]);

    const apiStudents = (apiResult && apiResult.success && Array.isArray(apiResult.students)) ? apiResult.students : [];

    const map = new Map<string, any>();
    [...apiStudents, ...firestoreStudents, ...localStudents].forEach((s) => {
      if (s && s.id) {
        if (ignoreUserIdFilter || s.createdBy === userId || (!s.createdBy && userId === 'guest')) {
          map.set(s.id, s);
        }
      }
    });

    let allStudents = Array.from(map.values());

    // Sắp xếp danh sách học sinh ổn định (thứ tự nhập ban đầu / SBD / Tên tiếng Việt)
    allStudents = sortStudentsDefault(allStudents);

    if (allStudents.length > 0 && allStudents.length !== localStudents.length && !classId) {
      this.saveLocalStudents(allStudents);
    }

    if (localStudents.length > 0 || apiStudents.length > 0) {
      const firestoreIds = new Set(firestoreStudents.map((s) => s.id));
      const unSynced = [...apiStudents, ...localStudents].filter((s) => s && s.id && !firestoreIds.has(s.id));
      if (unSynced.length > 0) {
        unSynced.forEach((st) => {
          this.syncStudentToFirestore(st).catch(() => {});
        });
      }
    }

    if (classId) {
      allStudents = allStudents.filter((s) => s.classId === classId || s.className === classId);
    }

    return { success: true, students: allStudents };
  }

  static async saveStudents(students: any | any[]) {
    const userId = this.getActiveUserId();
    const rawList = Array.isArray(students) ? students : [students];
    const list = rawList.map((s) => ({
      ...s,
      createdBy: s.createdBy || userId,
      updatedAt: new Date().toISOString(),
    }));

    // 1. Check duplicate SBDs within batch
    const batchSbdSet = new Set<string>();
    for (const st of list) {
      if (st.sbd && st.sbd.trim()) {
        const norm = st.sbd.trim().toUpperCase();
        if (batchSbdSet.has(norm)) {
          throw new Error(`SBD '${st.sbd}' bị trùng lặp ngay trong danh sách gửi lên! Mỗi học sinh phải có một SBD duy nhất.`);
        }
        batchSbdSet.add(norm);
      }
    }

    // 2. Check uniqueness across current user's students using fast local cache
    const currentUserStudents = this.getLocalStudents();
    for (const st of list) {
      if (st.sbd && st.sbd.trim()) {
        const norm = st.sbd.trim().toUpperCase();
        const conflict = currentUserStudents.find(
          (s) => s.id !== st.id && s.sbd && s.sbd.trim().toUpperCase() === norm
        );
        if (conflict) {
          throw new Error(
            `Số báo danh (SBD) '${st.sbd}' đã tồn tại trong danh sách của bạn (thuộc học sinh '${conflict.name}' - Lớp ${conflict.className}). Vui lòng chọn SBD khác!`
          );
        }
      }
    }

    const savedList = list.map((s) => ({
      ...s,
      id: s.id || 'std_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: s.createdAt || new Date().toISOString(),
    }));

    // 3. Immediately update Local Storage
    const existing = this.getLocalStudents();
    const existingMap = new Map(existing.map((s) => [s.id, s]));
    savedList.forEach((s) => existingMap.set(s.id, s));
    const updated = sortStudentsDefault(Array.from(existingMap.values()));
    this.saveLocalStudents(updated);

    // 4. Immediately update UserDataSync
    if (userId && userId !== 'guest') {
      UserDataSync.saveUserData(userId, { students: updated }).catch(() => {});
    }

    // 5. Batch sync to Firestore + API in background
    const backgroundSync = async () => {
      try {
        const batch = writeBatch(db);
        savedList.forEach((st) => {
          const docRef = doc(db, 'system_students', st.id);
          const cleanSbd = st.sbd ? st.sbd.trim().toUpperCase() : '';
          batch.set(
            docRef,
            {
              ...st,
              createdBy: st.createdBy || userId,
              sbd: cleanSbd,
              sbdOriginal: st.sbd ? st.sbd.trim() : '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        });
        await batch.commit();
      } catch (err) {
        console.warn('Lỗi batch sync student lên Firestore:', err);
      }

      try {
        await this.request<{ success: boolean; students: any[] }>('/api/students', {
          method: 'POST',
          body: JSON.stringify(savedList),
        });
      } catch {
        // ignore
      }
    };

    backgroundSync().catch(() => {});

    return { success: true, students: savedList };
  }

  static async deleteStudent(id: string) {
    const userId = this.getActiveUserId();

    // 1. Immediately update Local Storage
    const students = this.getLocalStudents().filter((s) => s.id !== id);
    this.saveLocalStudents(students);

    // 2. Immediately update UserDataSync
    if (userId && userId !== 'guest') {
      UserDataSync.saveUserData(userId, { students }).catch(() => {});
    }

    // 3. Remote delete in parallel
    Promise.allSettled([
      this.request<{ success: boolean }>(`/api/students/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {}),
      deleteDoc(doc(db, 'system_students', id)).catch(() => {}),
    ]).catch(() => {});

    return { success: true };
  }

  // 15. Lookup Student by SBD
  static async lookupStudentBySbd(sbd: string, code?: string) {
    const cleanSbd = (sbd || '').trim();
    const cleanSbdUpper = cleanSbd.toUpperCase();

    // 1. Try API
    try {
      const queryCode = code ? `&code=${encodeURIComponent(code)}` : '';
      const res = await this.request<{
        success: boolean;
        student: { id: string; sbd: string; name: string; className: string; school?: string };
      }>(`/api/exam/lookup-student?sbd=${encodeURIComponent(cleanSbd)}${queryCode}`);
      if (res.success && res.student) {
        return res;
      }
    } catch {
      // ignore API failure
    }

    // 2. Query Firestore & local students
    let targetUserId: string | undefined = undefined;
    if (code) {
      const examRes = await this.getExamDetail(code).catch(() => null);
      if (examRes && examRes.exam) {
        targetUserId = examRes.exam.createdBy;
      }
    }

    const studentsRes = await this.getStudents(undefined, true);
    const allStudents = studentsRes.students || [];

    const normSbdA = cleanSbdUpper.replace(/[^a-zA-Z0-9]/g, '');

    const matchStudent = (s: any) => {
      if (!s || !s.sbd) return false;
      const sbdVal = String(s.sbd).trim();
      const sbdValUpper = sbdVal.toUpperCase();
      const normSbdB = sbdValUpper.replace(/[^a-zA-Z0-9]/g, '');

      if (sbdValUpper === cleanSbdUpper || sbdVal === cleanSbd || (normSbdA && normSbdA === normSbdB)) {
        return true;
      }

      const clsVal = String(s.className || '').trim();
      const normCls = clsVal.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const normStSbd = sbdVal.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');

      if (normCls && normStSbd && normCls + normStSbd === normSbdA) return true;
      if (sbdVal && cleanSbdUpper.endsWith('/' + sbdVal.toUpperCase())) return true;
      if (sbdVal && cleanSbdUpper.endsWith('-' + sbdVal.toUpperCase())) return true;

      return false;
    };

    let student: any = null;
    if (targetUserId) {
      const userStudents = allStudents.filter(
        (s) => s.createdBy === targetUserId || (!s.createdBy && targetUserId === 'guest')
      );
      student = userStudents.find(matchStudent);
    }

    if (!student) {
      student = allStudents.find(matchStudent);
    }

    if (!student) {
      throw new Error(`Không tìm thấy học sinh với số báo danh '${cleanSbd}'.`);
    }

    // 3. Grade & Allowed classes check if exam code provided
    if (code) {
      try {
        const examRes = await this.getStudentExamInfo(code);
        if (examRes.success && examRes.info) {
          // Grade compatibility check
          const examGradeNum = extractGradeNumber(examRes.info.grade);
          if (examGradeNum) {
            let studentGradeNum = extractGradeNumber(student.className);
            if (!studentGradeNum && student.classId) {
              const localCls = (await this.getClasses(true)).classes?.find((c) => c.id === student.classId);
              if (localCls) studentGradeNum = extractGradeNumber(localCls.grade) || extractGradeNumber(localCls.name);
            }
            if (studentGradeNum && studentGradeNum !== examGradeNum) {
              throw new Error(
                `Cảnh báo: Đề thi này dành riêng cho học sinh Khối ${examGradeNum} (${examRes.info.grade || ''}). Học sinh ${student.name} thuộc Khối ${studentGradeNum} (Lớp ${student.className}) không được phép tham gia bài thi này!`
              );
            }
          }

          if (Array.isArray(examRes.info.allowedClasses) && examRes.info.allowedClasses.length > 0) {
            const studentNorm = normalizeClassName(student.className);
            const isAllowed = examRes.info.allowedClasses.some((c: string) => {
              const cNorm = normalizeClassName(c);
              return (
                cNorm === studentNorm ||
                c === student.classId ||
                c === student.className
              );
            });

            if (!isAllowed) {
              throw new Error(
                `Cảnh báo: Học sinh ${student.name} (Lớp ${student.className}) không thuộc danh sách lớp được phân công làm bài thi này (${examRes.info.allowedClasses.join(', ')}). Vui lòng kiểm tra lại thông tin tên và lớp!`
              );
            }
          }
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('không thuộc danh sách lớp') || err.message.includes('dành riêng cho học sinh'))) {
          throw err;
        }
      }
    }

    return {
      success: true,
      student: {
        id: student.id,
        sbd: student.sbd,
        name: student.name,
        className: student.className,
        school: student.notes || 'Trường THCS / THPT',
      },
    };
  }

  // 16. Reset Student Session (Allow Retake)
  static async resetStudentSession(data: {
    sessionId?: string;
    examCode?: string;
    sbd?: string;
    studentName?: string;
  }) {
    if (data.sessionId) {
      try {
        await deleteDoc(doc(db, 'student_results', data.sessionId));
      } catch (e) {
        console.warn('Lỗi xóa student_results trên Firestore khi reset session:', e);
      }
    } else if (data.examCode && data.sbd) {
      try {
        const codeUpper = data.examCode.trim().toUpperCase();
        const sbdUpper = data.sbd.trim().toUpperCase();
        const colRef = collection(db, 'student_results');
        const q = query(colRef, where('examCode', '==', codeUpper));
        const snap = await getDocs(q);
        snap.forEach(async (d) => {
          const res = d.data() as StudentResultItem;
          if (
            res &&
            ((res.studentSbd && res.studentSbd.trim().toUpperCase() === sbdUpper) ||
              (res.studentId && res.studentId.trim().toUpperCase() === sbdUpper))
          ) {
            await deleteDoc(d.ref);
          }
        });
      } catch (e) {
        console.warn('Lỗi xóa student_results matching SBD trên Firestore:', e);
      }
    }

    try {
      return await this.request<{ success: boolean; message: string }>('/api/exam/reset-student-session', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      let sessions = this.getLocalSessions();
      if (data.sessionId) {
        sessions = sessions.filter((s) => s.id !== data.sessionId);
      } else if (data.examCode && data.sbd) {
        sessions = sessions.filter(
          (s) =>
            !(
              s.examCode.toUpperCase() === data.examCode?.toUpperCase() &&
              s.studentId &&
              s.studentId.trim().toUpperCase() === data.sbd?.trim().toUpperCase()
            )
        );
      }
      this.saveLocalSessions(sessions);
      return { success: true, message: 'Đã xóa kết quả và cho phép học sinh làm lại bài thi.' };
    }
  }
}
