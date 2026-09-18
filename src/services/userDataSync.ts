import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { AppSettings, ExamPackage, QuestionBankItem } from '../types';
import { defaultSettings } from './storageEngine';

export interface UserDataPayload {
  settings: AppSettings;
  examHistory: ExamPackage[];
  questionBank: QuestionBankItem[];
  classes?: any[];
  students?: any[];
  onlineExams?: any[];
  deletedExamCodes?: string[];
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

    const docRef = doc(db, USER_DATA_COLLECTION, userId);

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const remoteData = docSnap.data() as UserDataPayload;
        const settings = { ...defaultSettings, ...(remoteData.settings || {}) };

        // Merge with local storage
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

        const rawOnlineExams = Array.isArray(remoteData.onlineExams) && remoteData.onlineExams.length > 0 ? remoteData.onlineExams : local.onlineExams || [];
        const onlineExams = rawOnlineExams
          .filter((oe: any) => oe && (!oe.createdBy || oe.createdBy === userId))
          .filter((oe: any) => !oe.code || !deletedSet.has(oe.code.trim().toUpperCase()))
          .map((oe: any) => ({ ...oe, createdBy: oe.createdBy || userId }));

        // Recover any exam packages from onlineExams into examHistory if missing and not deleted
        onlineExams.forEach((oe: any) => {
          const codeUpper = (oe.code || '').trim().toUpperCase();
          if (!deletedSet.has(codeUpper) && oe.examPackage && oe.examPackage.id && !historyMap.has(oe.examPackage.id)) {
            const pkg = {
              ...oe.examPackage,
              metadata: {
                ...oe.examPackage.metadata,
                onlineExamCode: oe.code || oe.examPackage.metadata?.onlineExamCode,
              },
            };
            historyMap.set(pkg.id, pkg);
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

        const classes = Array.isArray(remoteData.classes) && remoteData.classes.length > 0 ? remoteData.classes : local.classes || [];
        const students = Array.isArray(remoteData.students) && remoteData.students.length > 0 ? remoteData.students : local.students || [];

        const mergedPayload: UserDataPayload = {
          settings,
          examHistory,
          questionBank,
          classes,
          students,
          onlineExams,
          deletedExamCodes: mergedDeletedExamCodes,
          updatedAt: remoteData.updatedAt,
        };

        // Cache locally for this user
        this.saveLocalUserData(userId, mergedPayload);

        return mergedPayload;
      }
    } catch (err) {
      console.warn(`Lỗi đọc Firestore user_data cho ${userId}:`, err);
    }

    // Fallback if doc does not exist yet or offline:
    // Check local storage for this user
    const local = this.getLocalUserData(userId);

    // Initial default payload for new user account
    const initialPayload: UserDataPayload = {
      settings: local.settings || defaultSettings,
      examHistory: (local.examHistory || []).filter((p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791'),
      questionBank: (local.questionBank || []).filter((q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')),
      classes: local.classes || [],
      students: local.students || [],
      onlineExams: (local.onlineExams || [])
        .filter((oe: any) => oe && (!oe.createdBy || oe.createdBy === userId))
        .map((oe: any) => ({ ...oe, createdBy: oe.createdBy || userId })),
      updatedAt: new Date().toISOString(),
    };

    // Save initial document to Firestore
    try {
      const cleanInitial = sanitizeForFirestore(initialPayload);
      await setDoc(docRef, cleanInitial, { merge: true });
      this.saveLocalUserData(userId, initialPayload);
    } catch (err) {
      console.warn(`Lỗi khởi tạo document Firestore cho ${userId}:`, err);
    }

    return initialPayload;
  }

  /**
   * Save user data payload to Firestore and LocalStorage
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

    // 2. Prepare Firestore payload (strip heavy nested structures from onlineExams to prevent 1MB Firestore limit)
    const firestorePayload: any = { ...sanitizedUpdates, updatedAt: new Date().toISOString() };
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

    // 3. Sync to Firestore with strict undefined stripping
    try {
      const docRef = doc(db, USER_DATA_COLLECTION, userId);
      const cleanPayload = sanitizeForFirestore(firestorePayload);
      await setDoc(docRef, cleanPayload, { merge: true });

      // Đồng bộ trực tiếp từng mã đề vào collection published_exams để học sinh tìm thấy ngay lập tức
      if (Array.isArray(sanitizedUpdates.onlineExams)) {
        for (const oe of sanitizedUpdates.onlineExams) {
          if (oe && oe.code) {
            const codeUpper = oe.code.trim().toUpperCase();
            const examDocRef = doc(db, 'published_exams', codeUpper);
            const cleanExam = sanitizeForFirestore({
              ...oe,
              code: codeUpper,
              createdBy: oe.createdBy || userId,
              updatedAt: new Date().toISOString(),
            });
            setDoc(examDocRef, cleanExam, { merge: true }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error(`Lỗi đồng bộ Firestore user_data cho ${userId}:`, err);
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

          const payload: UserDataPayload = {
            settings,
            examHistory,
            questionBank,
            classes: remoteData.classes || local.classes || [],
            students: remoteData.students || local.students || [],
            onlineExams,
            deletedExamCodes: mergedDeletedExamCodes,
            updatedAt: remoteData.updatedAt,
          };

          // Update local cache
          this.saveLocalUserData(userId, payload);
          onDataChanged(payload);
        }
      },
      (error) => {
        console.warn(`Lỗi lắng nghe dữ liệu Firestore cho ${userId}:`, error);
      }
    );
  }
}
