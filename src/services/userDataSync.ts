import { doc, getDoc, setDoc, onSnapshot, disableNetwork, enableNetwork, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { AppSettings, ExamPackage, QuestionBankItem } from '../types';
import { defaultSettings } from './storageEngine';
import { SupabaseService } from './supabaseService';

export interface UserDataPayload {
  settings: AppSettings;
  examHistory: ExamPackage[];
  questionBank: QuestionBankItem[];
  classes?: any[];
  students?: any[];
  onlineExams?: any[];
  deletedExamCodes?: string[];
  deletedExamPackageIds?: string[];
  deletedStudentSbds?: string[];
  classesWipedAt?: string;
  updatedAt?: string;
}

const USER_DATA_COLLECTION = 'user_data';

function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}

export class UserDataSync {
  private static activeUserId: string | null = null;

  static setActiveUserId(userId: string | null) {
    this.activeUserId = userId;
  }

  static getActiveUserId(): string | null {
    return this.activeUserId;
  }

  public static recoverPackageFromPublishedExam(pe: any, userId: string, codeUpper: string): ExamPackage {
    const pkgId = pe.examPackage?.id || pe.packageId || pe.examPackageId || ('pkg_' + codeUpper);
    if (pe.examPackage && pe.examPackage.exams && pe.examPackage.exams.length > 0) {
      return {
        ...pe.examPackage,
        id: pkgId,
        createdAt: pe.examPackage.createdAt || pe.createdDate || pe.createdAt || new Date().toISOString(),
        createdBy: pe.createdBy || pe.examPackage.createdBy || userId,
        metadata: {
          ...pe.examPackage.metadata,
          onlineExamCode: codeUpper,
          examTitle: pe.examPackage.metadata?.examTitle || pe.title || 'Đề kiểm tra',
          subject: pe.examPackage.metadata?.subject || pe.subject || 'Toán',
          grade: pe.examPackage.metadata?.grade || pe.grade || 'Khối 10',
          chapterTitle: pe.examPackage.metadata?.chapterTitle || pe.topic || '',
          durationMinutes: Number(pe.examPackage.metadata?.durationMinutes || pe.duration) || 45,
          totalPoints: Number(pe.examPackage.metadata?.totalPoints || pe.totalPoints) || 10.0,
        },
      };
    }

    return {
      id: pkgId,
      createdAt: pe.createdDate || pe.createdAt || new Date().toISOString(),
      createdBy: pe.createdBy || userId,
      metadata: {
        schoolName: 'Trường THCS Bình San',
        departmentName: 'Sở Giáo dục và Đào tạo',
        className: 'Khối ' + (pe.grade || '10'),
        semester: 'Học kỳ I',
        schoolYear: '2026 - 2027',
        examTitle: pe.title || 'Đề kiểm tra',
        subject: (pe.subject || 'Toán') as any,
        grade: pe.grade || 'Khối 10',
        chapterTitle: pe.topic || '',
        durationMinutes: Number(pe.duration) || 45,
        totalPoints: Number(pe.totalPoints) || 10.0,
        onlineExamCode: codeUpper,
        curriculum: 'Kết nối tri thức với cuộc sống',
        examMode: 'MCQ_ESSAY',
        codeCount: 1,
        questionCounts: {
          part1_MCQSingle: 12,
          part2_MCQTrueFalse: 2,
          part3_MCQShort: 4,
          part4_Essay: 2,
        },
        cognitiveRatio: {
          remember: 40,
          understand: 30,
          apply: 20,
          advanced: 10,
        },
      },
      exams: [
        {
          code: codeUpper || '101',
          questions: pe.examPackage?.exams?.[0]?.questions || pe.questions || [],
        },
      ],
      matrix: pe.examPackage?.matrix || [],
      specification: pe.examPackage?.specification || [],
      answerKeys: pe.examPackage?.answerKeys || [],
    };
  }

  /**
   * Keys for user-scoped LocalStorage
   */
  static getStorageKeys(userId: string) {
    const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
    return {
      SETTINGS: `aitest_settings_v1_${cleanId}`,
      EXAM_HISTORY: `aitest_exam_history_v1_${cleanId}`,
      QUESTION_BANK: `aitest_question_bank_v1_${cleanId}`,
      CLASSES: `aitest_online_classes_store_${cleanId}`,
      STUDENTS: `aitest_online_students_store_${cleanId}`,
      ONLINE_EXAMS: `aitest_online_exams_store_${cleanId}`,
    };
  }

  /**
   * Read user data from LocalStorage cache
   */
  static getLocalUserData(userId: string): UserDataPayload {
    const keys = this.getStorageKeys(userId);
    const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
    let settings = defaultSettings;
    let examHistory: ExamPackage[] = [];
    let questionBank: QuestionBankItem[] = [];
    let classes: any[] = [];
    let students: any[] = [];
    let onlineExams: any[] = [];
    let deletedExamCodes: string[] = [];

    try {
      const rawSettings = localStorage.getItem(keys.SETTINGS) || localStorage.getItem(`aitest_settings_${cleanId}`);
      if (rawSettings) settings = { ...defaultSettings, ...JSON.parse(rawSettings) };

      const rawHistory = localStorage.getItem(keys.EXAM_HISTORY) || localStorage.getItem(`aitest_exam_history_${cleanId}`);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          examHistory = parsed.filter((p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791');
        }
      }

      const rawBank = localStorage.getItem(keys.QUESTION_BANK) || localStorage.getItem(`aitest_question_bank_${cleanId}`);
      if (rawBank) {
        const parsed = JSON.parse(rawBank);
        if (Array.isArray(parsed)) {
          questionBank = parsed.filter((q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample'));
        }
      }

      const rawClasses = localStorage.getItem(keys.CLASSES);
      if (rawClasses) classes = JSON.parse(rawClasses);

      const rawStudents = localStorage.getItem(keys.STUDENTS);
      if (rawStudents) students = JSON.parse(rawStudents);

      const rawOnlineExams = localStorage.getItem(keys.ONLINE_EXAMS);
      if (rawOnlineExams) onlineExams = JSON.parse(rawOnlineExams);

      const rawDeletedCodes = localStorage.getItem(`aitest_deleted_exam_codes_${cleanId}`);
      if (rawDeletedCodes) deletedExamCodes = JSON.parse(rawDeletedCodes);
    } catch (err) {
      console.warn(`Lỗi đọc LocalStorage cho user ${userId}:`, err);
    }

    return { settings, examHistory, questionBank, classes, students, onlineExams, deletedExamCodes };
  }

  /**
   * Save user data to LocalStorage cache
   */
  static saveLocalUserData(userId: string, data: Partial<UserDataPayload>): void {
    const keys = this.getStorageKeys(userId);
    const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
    try {
      if (data.settings) {
        localStorage.setItem(keys.SETTINGS, JSON.stringify(data.settings));
      }
      if (data.examHistory) {
        const cleanHistory = data.examHistory.filter(
          (p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791'
        );
        localStorage.setItem(keys.EXAM_HISTORY, JSON.stringify(cleanHistory));
      }
      if (data.questionBank) {
        const cleanBank = data.questionBank.filter(
          (q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')
        );
        localStorage.setItem(keys.QUESTION_BANK, JSON.stringify(cleanBank));
      }
      if (data.classes) {
        localStorage.setItem(keys.CLASSES, JSON.stringify(data.classes));
      }
      if (data.students) {
        localStorage.setItem(keys.STUDENTS, JSON.stringify(data.students));
      }
      if (data.onlineExams) {
        localStorage.setItem(keys.ONLINE_EXAMS, JSON.stringify(data.onlineExams));
      }
      if (data.deletedExamCodes) {
        localStorage.setItem(`aitest_deleted_exam_codes_${cleanId}`, JSON.stringify(data.deletedExamCodes));
      }
    } catch (err) {
      console.error(`Lỗi ghi LocalStorage cho user ${userId}:`, err);
    }
  }

  /**
   * Load user data from Firestore with LocalStorage cache fallback
   */
  static async loadUserData(userId: string): Promise<UserDataPayload> {
    if (!userId) {
      return { settings: defaultSettings, examHistory: [], questionBank: [], classes: [], students: [], onlineExams: [] };
    }

    // 0. Đọc từ Supabase nếu được cấu hình
    if (SupabaseService.isEnabled()) {
      try {
        let spData = await SupabaseService.loadUserData(userId);

        // Lấy danh sách ID / Mã đề đã bị xóa để lọc triệt để
        const local = this.getLocalUserData(userId);
        const deletedSet = new Set<string>();
        (local.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
        (spData?.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
        (local.deletedExamPackageIds || []).forEach((id) => {
          if (id) {
            deletedSet.add(id);
            deletedSet.add(id.trim().toUpperCase());
            deletedSet.add('PKG:' + id);
            deletedSet.add('PKG:' + id.trim().toUpperCase());
          }
        });
        (spData?.deletedExamPackageIds || []).forEach((id) => {
          if (id) {
            deletedSet.add(id);
            deletedSet.add(id.trim().toUpperCase());
            deletedSet.add('PKG:' + id);
            deletedSet.add('PKG:' + id.trim().toUpperCase());
          }
        });

        // Kiểm tra thêm các đề thi do chính user này phát hành trên Supabase published_exams
        // Chú ý: TUYỆT ĐỐI không lấy đề của user khác cho admin trên Dashboard! Mỗi user chỉ quản lý đề của chính mình.
        let recoveredPackages: ExamPackage[] = [];
        try {
          const pubExams = await SupabaseService.getExams(userId);
          if (pubExams && pubExams.length > 0) {
            pubExams.forEach((pe) => {
              if (pe.examPackage && pe.examPackage.id) {
                const pkgId = pe.examPackage.id;
                const onlineCode = (pe.code || pe.examPackage.metadata?.onlineExamCode || '').trim().toUpperCase();
                // Không phục hồi nếu đề này đã bị xóa!
                if (!deletedSet.has(pkgId) && !deletedSet.has(pkgId.toUpperCase()) && !deletedSet.has('PKG:' + pkgId) && (!onlineCode || !deletedSet.has(onlineCode))) {
                  recoveredPackages.push(pe.examPackage);
                }
              }
            });
          }
        } catch {}

        const historyMap = new Map<string, ExamPackage>();
        (spData?.examHistory || []).forEach((p: ExamPackage) => {
          if (p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791') {
            const onlineCode = (p.metadata?.onlineExamCode || '').trim().toUpperCase();
            if (!deletedSet.has(p.id) && !deletedSet.has(p.id.toUpperCase()) && !deletedSet.has('PKG:' + p.id) && (!onlineCode || !deletedSet.has(onlineCode))) {
              historyMap.set(p.id, p);
            }
          }
        });
        recoveredPackages.forEach((p) => p && p.id && !historyMap.has(p.id) && historyMap.set(p.id, p));
        (local.examHistory || []).forEach((p: ExamPackage) => {
          if (p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791') {
            const onlineCode = (p.metadata?.onlineExamCode || '').trim().toUpperCase();
            if (!deletedSet.has(p.id) && !deletedSet.has(p.id.toUpperCase()) && !deletedSet.has('PKG:' + p.id) && (!onlineCode || !deletedSet.has(onlineCode))) {
              if (!historyMap.has(p.id)) {
                historyMap.set(p.id, p);
              }
            }
          }
        });

        const mergedHistory = Array.from(historyMap.values());

        const merged: UserDataPayload = {
          settings: { ...defaultSettings, ...(spData?.settings || local.settings || {}) },
          examHistory: mergedHistory,
          questionBank: (spData?.questionBank && spData.questionBank.length > 0) ? spData.questionBank : (local.questionBank || []),
          classes: (spData?.classes && spData.classes.length > 0) ? spData.classes : (local.classes || []),
          students: (spData?.students && spData.students.length > 0) ? spData.students : (local.students || []),
          onlineExams: (spData?.onlineExams && spData.onlineExams.length > 0) ? spData.onlineExams : (local.onlineExams || []),
          deletedExamCodes: spData?.deletedExamCodes || local.deletedExamCodes || [],
          deletedExamPackageIds: Array.from(deletedSet).filter((s) => s.startsWith('pkg_')),
          deletedStudentSbds: spData?.deletedStudentSbds || local.deletedStudentSbds || [],
          classesWipedAt: spData?.classesWipedAt || local.classesWipedAt,
          updatedAt: spData?.updatedAt || new Date().toISOString(),
        };

        this.saveLocalUserData(userId, merged);
        // Tự động sao lưu dữ liệu lên Supabase nếu có đề mới từ local
        if (mergedHistory.length > (spData?.examHistory?.length || 0)) {
          SupabaseService.saveUserData(userId, { examHistory: mergedHistory }).catch(() => {});
        }
        return merged;
      } catch (sbErr) {
        console.warn('Lỗi đọc user_data từ Supabase:', sbErr);
      }
    }

    const docRef = doc(db, USER_DATA_COLLECTION, userId);

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const remoteData = docSnap.data() as UserDataPayload;
        const settings = { ...defaultSettings, ...(remoteData.settings || {}) };

        // Merge with local storage
        const local = this.getLocalUserData(userId);

        // Compute deleted exam codes & package ids set
        const deletedSet = new Set<string>();
        (local.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
        (remoteData.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
        (local.deletedExamPackageIds || []).forEach((id) => {
          if (id) {
            deletedSet.add(id);
            deletedSet.add(id.trim().toUpperCase());
            deletedSet.add('PKG:' + id);
            deletedSet.add('PKG:' + id.trim().toUpperCase());
          }
        });
        (remoteData.deletedExamPackageIds || []).forEach((id) => {
          if (id) {
            deletedSet.add(id);
            deletedSet.add(id.trim().toUpperCase());
            deletedSet.add('PKG:' + id);
            deletedSet.add('PKG:' + id.trim().toUpperCase());
          }
        });
        const mergedDeletedExamCodes = Array.from(deletedSet);

        const remoteHistory = Array.isArray(remoteData.examHistory) ? remoteData.examHistory : [];
        const localHistory = local.examHistory || [];
        const historyMap = new Map<string, ExamPackage>();
        [...localHistory, ...remoteHistory].forEach((item) => {
          if (item && item.id && !item.id.includes('sample') && item.id !== 'pkg_sample_7791') {
            const onlineCode = (item.metadata?.onlineExamCode || '').trim().toUpperCase();
            if (!deletedSet.has(item.id) && !deletedSet.has(item.id.toUpperCase()) && !deletedSet.has('PKG:' + item.id) && (!onlineCode || !deletedSet.has(onlineCode))) {
              historyMap.set(item.id, item);
            }
          }
        });

        const rawOnlineExams = Array.isArray(remoteData.onlineExams) && remoteData.onlineExams.length > 0 ? remoteData.onlineExams : local.onlineExams || [];
        const onlineExams = rawOnlineExams
          .filter((oe: any) => {
            if (!oe) return false;
            const codeUpper = (oe.code || '').trim().toUpperCase();
            const pkgId = oe.packageId || oe.examPackageId || oe.examPackage?.id;
            if (codeUpper && deletedSet.has(codeUpper)) return false;
            if (pkgId && (deletedSet.has(pkgId) || deletedSet.has('PKG:' + pkgId))) return false;
            return true;
          });

        // Phục hồi các gói đề thi từ onlineExams trong user_data nếu có
        onlineExams.forEach((oe: any) => {
          const codeUpper = (oe.code || '').trim().toUpperCase();
          const pkgId = oe.packageId || oe.examPackageId || oe.examPackage?.id || ('pkg_' + codeUpper);
          if (
            (!codeUpper || !deletedSet.has(codeUpper)) &&
            (!pkgId || (!deletedSet.has(pkgId) && !deletedSet.has('PKG:' + pkgId))) &&
            !historyMap.has(pkgId)
          ) {
            const pkg = UserDataSync.recoverPackageFromPublishedExam(oe, userId, codeUpper);
            historyMap.set(pkgId, pkg);
          }
        });

        // Quét trực tiếp collection 'published_exams' từ Firestore để phục hồi toàn bộ đề thi của user
        try {
          const pubColRef = collection(db, 'published_exams');
          const pubSnap = await getDocs(pubColRef);
          pubSnap.forEach((d) => {
            const pe = d.data() as any;
            if (pe && pe.code) {
              const codeUpper = pe.code.trim().toUpperCase();
              if (deletedSet.has(codeUpper)) return;
              const isOwner =
                Boolean(userId && userId !== 'guest' && userId !== 'anonymous' && pe.createdBy === userId) ||
                (userId === 'admin') ||
                (userId === 'guest' && (!pe.createdBy || pe.createdBy === 'guest'));

              if (isOwner) {
                const pkgId = pe.examPackage?.id || pe.packageId || pe.examPackageId || ('pkg_' + codeUpper);
                if (!deletedSet.has(pkgId) && !deletedSet.has(pkgId.toUpperCase()) && !deletedSet.has('PKG:' + pkgId)) {
                  if (!historyMap.has(pkgId)) {
                    const pkg = UserDataSync.recoverPackageFromPublishedExam(pe, userId, codeUpper);
                    historyMap.set(pkgId, pkg);
                  }
                }
              }
            }
          });
        } catch (pubErr) {
          console.warn('Lỗi đọc published_exams từ Firestore khi phục hồi examHistory:', pubErr);
        }

        // Quét thêm kho đề local storage của user
        try {
          const cleanId = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
          const localKeys = [
            `aitest_online_exams_store_${cleanId}`,
            'aitest_online_exams_store_shared'
          ];
          localKeys.forEach((lk) => {
            const raw = localStorage.getItem(lk);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((oe: any) => {
                  if (!oe || !oe.code) return;
                  const codeUpper = oe.code.trim().toUpperCase();
                  if (deletedSet.has(codeUpper)) return;
                  const pkgId = oe.packageId || oe.examPackageId || oe.examPackage?.id || ('pkg_' + codeUpper);
                  if (!deletedSet.has(pkgId) && !deletedSet.has(pkgId.toUpperCase()) && !deletedSet.has('PKG:' + pkgId)) {
                    if (!historyMap.has(pkgId)) {
                      const pkg = UserDataSync.recoverPackageFromPublishedExam(oe, userId, codeUpper);
                      historyMap.set(pkgId, pkg);
                    }
                  }
                });
              }
            }
          });
        } catch {}

        const examHistory = Array.from(historyMap.values());

        const remoteBank = Array.isArray(remoteData.questionBank) ? remoteData.questionBank : [];
        const localBank = local.questionBank || [];
        const bankMap = new Map<string, QuestionBankItem>();
        [...localBank, ...remoteBank].forEach((q) => {
          if (q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')) {
            bankMap.set(q.id, q);
          }
        });
        const questionBank = Array.from(bankMap.values());

        // Deleted Student SBDs
        const deletedStudentSbdsSet = new Set<string>();
        (local.deletedStudentSbds || []).forEach((s) => s && deletedStudentSbdsSet.add(s.trim().toUpperCase()));
        (remoteData.deletedStudentSbds || []).forEach((s) => s && deletedStudentSbdsSet.add(s.trim().toUpperCase()));
        const mergedDeletedStudentSbds = Array.from(deletedStudentSbdsSet);

        // Check if classes/students were wiped
        const isWiped = !!remoteData.classesWipedAt || !!local.classesWipedAt;
        const classes = isWiped && (!remoteData.classes || remoteData.classes.length === 0)
          ? []
          : (Array.isArray(remoteData.classes) ? remoteData.classes : local.classes || []);

        const rawStudents = isWiped && (!remoteData.students || remoteData.students.length === 0)
          ? []
          : (Array.isArray(remoteData.students) ? remoteData.students : local.students || []);

        const students = rawStudents.filter((s: any) => !s.sbd || !deletedStudentSbdsSet.has(s.sbd.trim().toUpperCase()));

        const mergedPayload: UserDataPayload = {
          settings,
          examHistory,
          questionBank,
          classes,
          students,
          onlineExams,
          deletedExamCodes: mergedDeletedExamCodes,
          deletedStudentSbds: mergedDeletedStudentSbds,
          classesWipedAt: remoteData.classesWipedAt || local.classesWipedAt,
          updatedAt: remoteData.updatedAt,
        };

        // Cache locally for this user
        this.saveLocalUserData(userId, mergedPayload);

        return mergedPayload;
      }
    } catch (err: any) {
      if (this.checkAndMarkQuotaError(err)) {
        console.warn(`[UserDataSync] Firestore Quota exceeded khi đọc user_data cho ${userId}.`);
      } else {
        console.warn(`Lỗi đọc Firestore user_data cho ${userId}:`, err);
      }
    }

    // Fallback if doc does not exist yet or offline:
    // Check local storage for this user
    const local = this.getLocalUserData(userId);

    // Phục hồi từ local online exams nếu có
    const cleanUid = userId ? userId.replace(/[^a-zA-Z0-9_]/g, '_') : 'guest';
    const localExamsRaw = localStorage.getItem(`aitest_online_exams_store_${cleanUid}`) ||
      localStorage.getItem('aitest_online_exams_store_shared');
    const recoveredHistory = [...(local.examHistory || []).filter((p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791')];
    if (localExamsRaw) {
      try {
        const list = JSON.parse(localExamsRaw);
        if (Array.isArray(list)) {
          const map = new Map<string, ExamPackage>();
          recoveredHistory.forEach((p) => p && p.id && map.set(p.id, p));
          list.forEach((oe: any) => {
            if (!oe || !oe.code) return;
            const codeUpper = oe.code.trim().toUpperCase();
            const pkgId = oe.packageId || oe.examPackageId || oe.examPackage?.id || ('pkg_' + codeUpper);
            if (!map.has(pkgId)) {
              const pkg = UserDataSync.recoverPackageFromPublishedExam(oe, userId, codeUpper);
              map.set(pkgId, pkg);
            }
          });
          recoveredHistory.length = 0;
          recoveredHistory.push(...Array.from(map.values()));
        }
      } catch {}
    }

    // Initial default payload for new user account
    const initialPayload: UserDataPayload = {
      settings: local.settings || defaultSettings,
      examHistory: recoveredHistory,
      questionBank: (local.questionBank || []).filter((q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')),
      classes: local.classes || [],
      students: local.students || [],
      onlineExams: (local.onlineExams || [])
        .filter((oe: any) => oe && (!oe.createdBy || oe.createdBy === userId))
        .map((oe: any) => ({ ...oe, createdBy: oe.createdBy || userId })),
      updatedAt: new Date().toISOString(),
    };

    // Save only to local storage without writing to Firestore on read initialization
    this.saveLocalUserData(userId, initialPayload);

    return initialPayload;
  }

  private static isQuotaExceeded = false;
  private static lastQuotaErrorLogged = 0;
  private static saveTimers = new Map<string, any>();
  private static pendingUpdates = new Map<string, Partial<UserDataPayload>>();

  public static getIsQuotaExceeded(): boolean {
    if (this.isQuotaExceeded) return true;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('firestore_quota_exceeded_timestamp');
        if (raw) {
          const ts = Number(raw);
          // Spark free plan resets daily (UTC midnight). Suppress writes for 6h to avoid backoff loops.
          if (Date.now() - ts < 6 * 60 * 60 * 1000) {
            this.isQuotaExceeded = true;
            try {
              disableNetwork(db).catch(() => {});
            } catch {}
            return true;
          } else {
            localStorage.removeItem('firestore_quota_exceeded_timestamp');
          }
        }
      }
    } catch {}
    return this.isQuotaExceeded;
  }

  public static setIsQuotaExceeded(val: boolean): void {
    this.isQuotaExceeded = val;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (val) {
          localStorage.setItem('firestore_quota_exceeded_timestamp', Date.now().toString());
        } else {
          localStorage.removeItem('firestore_quota_exceeded_timestamp');
        }
      }
    } catch {}

    if (val) {
      // Disconnect Firestore network so SDK halts backoff retry loop and stops flooding errors
      try {
        disableNetwork(db).catch(() => {});
      } catch {}
    } else {
      try {
        enableNetwork(db).catch(() => {});
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: val } }));
    }
  }

  public static clearQuotaExceeded(): void {
    this.setIsQuotaExceeded(false);
  }

  public static checkAndMarkQuotaError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err || '');
    const code = String(err?.code || '');
    const isQuota =
      code === 'resource-exhausted' ||
      code.includes('resource-exhausted') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('resource-exhausted') ||
      msg.includes('Free daily write units') ||
      msg.includes('Free daily read units') ||
      msg.includes('Using maximum backoff delay') ||
      msg.includes('quota metric') ||
      msg.includes('cannot exceed free quota limits');

    if (isQuota) {
      this.setIsQuotaExceeded(true);
    }
    return isQuota;
  }

  /**
   * Save user data payload to Firestore (debounced) and LocalStorage (immediate)
   */
  static async saveUserData(userId: string, updates: Partial<UserDataPayload>): Promise<void> {
    if (!userId) return;

    // Filter out any demo data from updates
    const sanitizedUpdates: Partial<UserDataPayload> = { ...updates };
    if (sanitizedUpdates.examHistory) {
      sanitizedUpdates.examHistory = sanitizedUpdates.examHistory.filter(
        (p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791'
      );
    }
    if (sanitizedUpdates.questionBank) {
      sanitizedUpdates.questionBank = sanitizedUpdates.questionBank.filter(
        (q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')
      );
    }

    // 1. Update Local Storage cache immediately
    this.saveLocalUserData(userId, sanitizedUpdates);

    // 1b. Sync to Supabase if configured
    if (SupabaseService.isEnabled()) {
      SupabaseService.saveUserData(userId, sanitizedUpdates).catch(() => {});
    }

    // If quota was already exceeded, avoid spamming Firestore with failing writes
    if (this.getIsQuotaExceeded()) {
      const now = Date.now();
      // Only log once every 5 minutes to avoid console flood
      if (now - this.lastQuotaErrorLogged > 300000) {
        this.lastQuotaErrorLogged = now;
        console.warn(`[UserDataSync] Firestore đang trong trạng thái Quota limit exceeded. Dữ liệu tiếp tục được lưu cục bộ (LocalStorage).`);
      }
      return;
    }

    // 2. Debounce Firestore writes to prevent rapid consumption of daily write quota
    const existing = this.pendingUpdates.get(userId) || {};
    this.pendingUpdates.set(userId, { ...existing, ...sanitizedUpdates });

    if (this.saveTimers.has(userId)) {
      clearTimeout(this.saveTimers.get(userId));
    }

    this.saveTimers.set(
      userId,
      setTimeout(async () => {
        this.saveTimers.delete(userId);
        const updatesToFlush = this.pendingUpdates.get(userId);
        this.pendingUpdates.delete(userId);
        if (!updatesToFlush) return;

        await this.flushUserDataToFirestore(userId, updatesToFlush);
      }, 1000)
    );
  }

  /**
   * Internal worker to write payload to Firestore doc
   */
  private static async flushUserDataToFirestore(userId: string, updates: Partial<UserDataPayload>): Promise<void> {
    if (this.getIsQuotaExceeded()) {
      return;
    }
    const firestorePayload: any = { ...updates, updatedAt: new Date().toISOString() };
    if (Array.isArray(firestorePayload.onlineExams)) {
      firestorePayload.onlineExams = firestorePayload.onlineExams.map((oe: any) => {
        const item: any = {
          id: oe.id || 'exam_' + (oe.code || Date.now()),
          code: oe.code || '',
          title: oe.title || 'Đề kiểm tra',
          subject: oe.subject || 'Toán',
          grade: oe.grade || 'Khối 10',
          duration: Number(oe.duration) || 45,
          totalPoints: Number(oe.totalPoints) || 10.0,
          topic: oe.topic || '',
          createdDate: oe.createdDate || oe.createdAt || oe.updatedAt || new Date().toISOString(),
          status: oe.status || 'active',
          allowedClasses: Array.isArray(oe.allowedClasses) ? oe.allowedClasses : [],
          questionCount: oe.questionCount || oe.examPackage?.exams?.[0]?.questions?.length || 0,
          submissionCount: oe.submissionCount || 0,
          activeSessionCount: oe.activeSessionCount || 0,
          createdBy: oe.createdBy || userId,
        };
        if (oe.scheduledStartTime) item.scheduledStartTime = oe.scheduledStartTime;
        if (oe.startTimeType) item.startTimeType = oe.startTimeType;
        const pkgId = oe.packageId || oe.examPackageId || oe.examPackage?.id;
        if (pkgId) {
          item.packageId = pkgId;
          item.examPackageId = pkgId;
        }
        return item;
      });
    }

    try {
      const docRef = doc(db, USER_DATA_COLLECTION, userId);
      const cleanPayload = sanitizeForFirestore(firestorePayload);
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (err: any) {
      if (this.checkAndMarkQuotaError(err)) {
        this.lastQuotaErrorLogged = Date.now();
        console.warn(
          `[UserDataSync] Firestore Quota limit exceeded cho dự án. Chuyển sang chế độ lưu trữ cục bộ LocalStorage.`
        );
      } else {
        console.error(`Lỗi đồng bộ Firestore user_data cho ${userId}:`, err);
      }
    }
  }

  /**
   * Realtime subscription for cross-device synchronization
   */
  static subscribeUserData(userId: string, onDataChanged: (data: UserDataPayload) => void) {
    if (!userId) return () => {};

    const docRef = doc(db, USER_DATA_COLLECTION, userId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data() as UserDataPayload;
          const settings = { ...defaultSettings, ...(remoteData.settings || {}) };

          const local = this.getLocalUserData(userId);

          // Compute deleted exam codes set
          const deletedSet = new Set<string>();
          (local.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
          (remoteData.deletedExamCodes || []).forEach((c) => c && deletedSet.add(c.trim().toUpperCase()));
          const mergedDeletedExamCodes = Array.from(deletedSet);

          const remoteHistory = Array.isArray(remoteData.examHistory) ? remoteData.examHistory : [];
          const localHistory = local.examHistory || [];
          const historyMap = new Map<string, ExamPackage>();
          [...localHistory, ...remoteHistory].forEach((item) => {
            if (item && item.id && !item.id.includes('sample') && item.id !== 'pkg_sample_7791') {
              const cleanPkg = { ...item };
              if (cleanPkg.metadata?.onlineExamCode && deletedSet.has(cleanPkg.metadata.onlineExamCode.trim().toUpperCase())) {
                const meta = { ...cleanPkg.metadata };
                delete meta.onlineExamCode;
                cleanPkg.metadata = meta;
              }
              historyMap.set(cleanPkg.id, cleanPkg);
            }
          });
          const examHistory = Array.from(historyMap.values());

          const remoteBank = Array.isArray(remoteData.questionBank) ? remoteData.questionBank : [];
          const localBank = local.questionBank || [];
          const bankMap = new Map<string, QuestionBankItem>();
          [...localBank, ...remoteBank].forEach((q) => {
            if (q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')) {
              bankMap.set(q.id, q);
            }
          });
          const questionBank = Array.from(bankMap.values());

          const rawOnlineExams = remoteData.onlineExams || local.onlineExams || [];
          const onlineExams = rawOnlineExams.filter((oe: any) => !oe.code || !deletedSet.has(oe.code.trim().toUpperCase()));

          // Deleted Student SBDs
          const deletedStudentSbdsSet = new Set<string>();
          (local.deletedStudentSbds || []).forEach((s) => s && deletedStudentSbdsSet.add(s.trim().toUpperCase()));
          (remoteData.deletedStudentSbds || []).forEach((s) => s && deletedStudentSbdsSet.add(s.trim().toUpperCase()));
          const mergedDeletedStudentSbds = Array.from(deletedStudentSbdsSet);

          const isWiped = !!remoteData.classesWipedAt;
          const classes = isWiped && (!remoteData.classes || remoteData.classes.length === 0)
            ? []
            : (Array.isArray(remoteData.classes) ? remoteData.classes : local.classes || []);

          const rawStudents = isWiped && (!remoteData.students || remoteData.students.length === 0)
            ? []
            : (Array.isArray(remoteData.students) ? remoteData.students : local.students || []);

          const students = rawStudents.filter((s: any) => !s.sbd || !deletedStudentSbdsSet.has(s.sbd.trim().toUpperCase()));

          // If wiped, also clean up shared localStorage keys on this browser immediately
          if (isWiped && classes.length === 0 && students.length === 0 && typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem('aitest_online_classes_store_shared', JSON.stringify([]));
              localStorage.setItem('aitest_online_students_store_shared', JSON.stringify([]));
              localStorage.setItem('aitest_classes_wiped_at', remoteData.classesWipedAt || new Date().toISOString());
            } catch {}
          }

          const payload: UserDataPayload = {
            settings,
            examHistory,
            questionBank,
            classes,
            students,
            onlineExams,
            deletedExamCodes: mergedDeletedExamCodes,
            deletedStudentSbds: mergedDeletedStudentSbds,
            classesWipedAt: remoteData.classesWipedAt || local.classesWipedAt,
            updatedAt: remoteData.updatedAt,
          };

          // Update local cache
          this.saveLocalUserData(userId, payload);
          onDataChanged(payload);
        }
      },
      (error) => {
        if (this.checkAndMarkQuotaError(error)) {
          console.warn(`[UserDataSync] Firestore Quota exceeded khi lắng nghe ${userId}.`);
        } else {
          console.warn(`Lỗi lắng nghe dữ liệu Firestore cho ${userId}:`, error);
        }
      }
    );
  }

  /**
   * Xóa vĩnh viễn gói đề thi khỏi tài khoản và đồng bộ ngay lập tức lên Supabase, LocalStorage và Firestore
   * Đảm bảo đề thi không bao giờ xuất hiện lại sau khi đăng xuất/đăng nhập lại!
   */
  static async deleteExamPackage(userId: string, packageId: string): Promise<void> {
    if (!userId || !packageId) return;

    // 1. Cập nhật danh sách ID gói đề thi đã bị xóa
    const local = this.getLocalUserData(userId);
    const deletedPkgSet = new Set<string>(local.deletedExamPackageIds || []);
    deletedPkgSet.add(packageId);
    deletedPkgSet.add('PKG:' + packageId);
    const updatedDeletedPackageIds = Array.from(deletedPkgSet).filter((s) => s.startsWith('pkg_'));

    // 2. Lấy mã đề thi trực tuyến (nếu có) để xóa sạch liên kết
    const targetPkg = (local.examHistory || []).find((p) => p.id === packageId);
    const onlineExamCode = (targetPkg?.metadata?.onlineExamCode || '').trim().toUpperCase();

    const deletedCodeSet = new Set<string>(local.deletedExamCodes || []);
    deletedCodeSet.add(packageId);
    deletedCodeSet.add('PKG:' + packageId);
    if (onlineExamCode) {
      deletedCodeSet.add(onlineExamCode);
    }
    const updatedDeletedCodes = Array.from(deletedCodeSet);

    // 3. Xóa gói đề khỏi examHistory của user
    const updatedHistory = (local.examHistory || []).filter((p) => p.id !== packageId);

    // 4. Xóa khỏi onlineExams nếu có
    const updatedOnlineExams = (local.onlineExams || []).filter((oe: any) => {
      const pId = oe.packageId || oe.examPackageId || oe.examPackage?.id;
      const code = (oe.code || '').trim().toUpperCase();
      if (pId === packageId) return false;
      if (onlineExamCode && code === onlineExamCode) return false;
      return true;
    });

    const updates: Partial<UserDataPayload> = {
      examHistory: updatedHistory,
      onlineExams: updatedOnlineExams,
      deletedExamCodes: updatedDeletedCodes,
      deletedExamPackageIds: updatedDeletedPackageIds,
    };

    // 5. Lưu cục bộ ngay tức thì
    this.saveLocalUserData(userId, updates);

    // 6. Xóa vĩnh viễn trên Supabase
    if (SupabaseService.isEnabled()) {
      SupabaseService.saveUserData(userId, updates).catch(() => {});
      SupabaseService.deleteExamByPackageId(packageId, userId).catch(() => {});
      if (onlineExamCode) {
        SupabaseService.deleteExam(onlineExamCode).catch(() => {});
      }
    }

    // 7. Đồng bộ lên Firestore
    this.saveUserData(userId, updates).catch(() => {});
  }
}

// Proactively disconnect network on load if quota was marked exceeded
if (typeof window !== 'undefined') {
  try {
    if (UserDataSync.getIsQuotaExceeded()) {
      disableNetwork(db).catch(() => {});
    }
  } catch {}
}
