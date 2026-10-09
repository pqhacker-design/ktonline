import { AppSettings, ExamPackage, QuestionBankItem } from '../types';
import { UserDataSync } from './userDataSync';

const STORAGE_KEYS = {
  SETTINGS: 'aitest_settings_v1',
  EXAM_HISTORY: 'aitest_exam_history_v1',
  QUESTION_BANK: 'aitest_question_bank_v1',
};

export const defaultSettings: AppSettings = {
  defaultSchoolName: 'Trường THCS Bình San',
  defaultDepartmentName: 'Sở Giáo dục và Đào tạo',
  defaultTeacherName: 'Giáo viên',
  selectedModel: 'gemini-2.5-flash',
  theme: 'light',
  saveExamHistory: true,
  autoSaveToBank: true,
};

export type StorageChangeListener = () => void;

export class StorageEngine {
  private static currentUserId: string | null = null;
  private static listeners: Set<StorageChangeListener> = new Set();

  static subscribe(listener: StorageChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Lỗi listener StorageEngine:', err);
      }
    });
  }

  static setCurrentUserId(userId: string | null) {
    if (this.currentUserId !== userId) {
      this.currentUserId = userId;
      UserDataSync.setActiveUserId(userId);
      this.notifyListeners();
    }
  }

  static getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private static migrated = false;
  private static ensureMigration(): void {
    if (this.migrated) return;
    this.migrated = true;
    try {
      // 1. Migrate exam history from user-scoped keys into shared key
      const sharedHistoryRaw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
      let sharedHistory: ExamPackage[] = [];
      if (sharedHistoryRaw) {
        try { sharedHistory = JSON.parse(sharedHistoryRaw) || []; } catch {}
      }
      const historyMap = new Map<string, ExamPackage>();
      sharedHistory.forEach((p) => p && p.id && historyMap.set(p.id, p));

      // Scan all localStorage keys for other user history
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('aitest_exam_history_v1_') && k !== STORAGE_KEYS.EXAM_HISTORY) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list: ExamPackage[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((p) => {
                  if (p && p.id && !p.id.includes('sample') && !historyMap.has(p.id)) {
                    historyMap.set(p.id, p);
                  }
                });
              }
            }
          } catch {}
        }
      }
      if (historyMap.size > sharedHistory.length) {
        localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(Array.from(historyMap.values())));
      }

      // 2. Migrate question bank
      const sharedBankRaw = localStorage.getItem(STORAGE_KEYS.QUESTION_BANK);
      let sharedBank: QuestionBankItem[] = [];
      if (sharedBankRaw) {
        try { sharedBank = JSON.parse(sharedBankRaw) || []; } catch {}
      }
      const bankMap = new Map<string, QuestionBankItem>();
      sharedBank.forEach((q) => q && q.id && bankMap.set(q.id, q));

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('aitest_question_bank_v1_') && k !== STORAGE_KEYS.QUESTION_BANK) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list: QuestionBankItem[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((q) => {
                  if (q && q.id && !q.id.includes('sample') && !bankMap.has(q.id)) {
                    bankMap.set(q.id, q);
                  }
                });
              }
            }
          } catch {}
        }
      }
      if (bankMap.size > sharedBank.length) {
        localStorage.setItem(STORAGE_KEYS.QUESTION_BANK, JSON.stringify(Array.from(bankMap.values())));
      }
    } catch (err) {
      console.warn('Lỗi di chuyển dữ liệu shared workspace:', err);
    }
  }

  private static getKey(baseKey: string): string {
    this.ensureMigration();
    return baseKey; // Dùng chung hệ thống cho tất cả tài khoản
  }

  // Settings
  static getSettings(): AppSettings {
    try {
      const key = this.getKey(STORAGE_KEYS.SETTINGS);
      const data = localStorage.getItem(key);
      if (!data) return defaultSettings;
      const parsed = JSON.parse(data);
      if (parsed.defaultSchoolName === 'Trường THPT Nguyễn Trãi' || parsed.defaultSchoolName === 'THPT Nguyễn Trãi') {
        parsed.defaultSchoolName = 'Trường THCS Bình San';
      }
      const result = { ...defaultSettings, ...parsed };
      const validModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
      if (!result.selectedModel || !validModels.includes(result.selectedModel)) {
        result.selectedModel = 'gemini-2.5-flash';
      }
      return result;
    } catch (e) {
      console.error('Lỗi đọc settings:', e);
      return defaultSettings;
    }
  }

  static saveSettings(settings: AppSettings): void {
    try {
      const key = this.getKey(STORAGE_KEYS.SETTINGS);
      localStorage.setItem(key, JSON.stringify(settings));

      UserDataSync.saveUserData('shared_workspace', { settings });
      if (this.currentUserId) {
        UserDataSync.saveUserData(this.currentUserId, { settings });
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Lỗi lưu settings:', e);
    }
  }

  // Exam History
  static getExamHistory(): ExamPackage[] {
    try {
      const key = this.getKey(STORAGE_KEYS.EXAM_HISTORY);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // Filter out legacy sample packages
          const clean = parsed.filter(
            (p) => p && p.id && !p.id.includes('sample') && p.id !== 'pkg_sample_7791'
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(clean));
          }
          return clean;
        }
      }
      return [];
    } catch (e) {
      console.error('Lỗi đọc lịch sử đề thi:', e);
      return [];
    }
  }

  static saveExamPackage(examPackage: ExamPackage): void {
    try {
      const history = this.getExamHistory();
      const updated = [examPackage, ...history.filter((e) => e.id !== examPackage.id)];
      const key = this.getKey(STORAGE_KEYS.EXAM_HISTORY);
      localStorage.setItem(key, JSON.stringify(updated));

      UserDataSync.saveUserData('shared_workspace', { examHistory: updated });
      if (this.currentUserId) {
        UserDataSync.saveUserData(this.currentUserId, { examHistory: updated });
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Lỗi lưu gói đề thi:', e);
    }
  }

  static deleteExamPackage(id: string): void {
    try {
      const history = this.getExamHistory();
      const updated = history.filter((e) => e.id !== id);
      const key = this.getKey(STORAGE_KEYS.EXAM_HISTORY);
      localStorage.setItem(key, JSON.stringify(updated));

      UserDataSync.saveUserData('shared_workspace', { examHistory: updated });
      if (this.currentUserId) {
        UserDataSync.saveUserData(this.currentUserId, { examHistory: updated });
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Lỗi xóa gói đề thi:', e);
    }
  }

  static removeOnlineExamCode(onlineCode: string): void {
    try {
      const cleanCode = (onlineCode || '').trim().toUpperCase();
      if (!cleanCode) return;
      const history = this.getExamHistory();
      let changed = false;
      const updated = history.map((pkg) => {
        if (pkg.metadata?.onlineExamCode && pkg.metadata.onlineExamCode.trim().toUpperCase() === cleanCode) {
          changed = true;
          const newMeta = { ...pkg.metadata };
          delete newMeta.onlineExamCode;
          return {
            ...pkg,
            metadata: newMeta,
          };
        }
        return pkg;
      });

      if (changed) {
        const key = this.getKey(STORAGE_KEYS.EXAM_HISTORY);
        localStorage.setItem(key, JSON.stringify(updated));
        UserDataSync.saveUserData('shared_workspace', { examHistory: updated });
        if (this.currentUserId) {
          UserDataSync.saveUserData(this.currentUserId, { examHistory: updated });
        }
        this.notifyListeners();
      }
    } catch (e) {
      console.error('Lỗi gỡ mã đề online khỏi lịch sử:', e);
    }
  }

  // Question Bank
  static getQuestionBank(): QuestionBankItem[] {
    try {
      const key = this.getKey(STORAGE_KEYS.QUESTION_BANK);
      const data = localStorage.getItem(key);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // Filter out legacy sample questions
          const clean = parsed.filter(
            (q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem(key, JSON.stringify(clean));
          }
          return clean;
        }
      }
      return [];
    } catch (e) {
      console.error('Lỗi đọc ngân hàng câu hỏi:', e);
      return [];
    }
  }

  static saveQuestionBank(questions: QuestionBankItem[]): void {
    try {
      const clean = (questions || []).filter(
        (q) => q && q.id && !q.id.includes('sample') && !q.id.includes('qb-sample')
      );
      const key = this.getKey(STORAGE_KEYS.QUESTION_BANK);
      localStorage.setItem(key, JSON.stringify(clean));

      UserDataSync.saveUserData('shared_workspace', { questionBank: clean });
      if (this.currentUserId) {
        UserDataSync.saveUserData(this.currentUserId, { questionBank: clean });
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Lỗi lưu ngân hàng câu hỏi:', e);
    }
  }

  static saveToQuestionBank(questions: QuestionBankItem[]): void {
    try {
      const bank = this.getQuestionBank();
      const existingIds = new Set(bank.map((q) => q.id));
      const newItems = (questions || []).filter(
        (q) => q && q.id && !existingIds.has(q.id) && !q.id.includes('sample') && !q.id.includes('qb-sample')
      );
      const updated = [...newItems, ...bank];
      this.saveQuestionBank(updated);
    } catch (e) {
      console.error('Lỗi lưu câu hỏi vào ngân hàng:', e);
    }
  }

  static deleteFromQuestionBank(id: string): void {
    try {
      const bank = this.getQuestionBank();
      const updated = bank.filter((q) => q.id !== id);
      this.saveQuestionBank(updated);
    } catch (e) {
      console.error('Lỗi xóa câu hỏi:', e);
    }
  }

  static deleteMultipleFromQuestionBank(idsToDelete: string[]): void {
    try {
      const set = new Set(idsToDelete);
      const bank = this.getQuestionBank();
      const updated = bank.filter((q) => !set.has(q.id));
      this.saveQuestionBank(updated);
    } catch (e) {
      console.error('Lỗi xóa nhiều câu hỏi:', e);
    }
  }

  static clearAllQuestionBank(): void {
    try {
      this.saveQuestionBank([]);
    } catch (e) {
      console.error('Lỗi xóa toàn bộ ngân hàng câu hỏi:', e);
    }
  }

  static clearAllData(): void {
    try {
      const keyHistory = this.getKey(STORAGE_KEYS.EXAM_HISTORY);
      const keyBank = this.getKey(STORAGE_KEYS.QUESTION_BANK);
      localStorage.setItem(keyHistory, JSON.stringify([]));
      localStorage.setItem(keyBank, JSON.stringify([]));

      if (this.currentUserId) {
        UserDataSync.saveUserData(this.currentUserId, {
          examHistory: [],
          questionBank: [],
        });
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Lỗi xóa dữ liệu storage:', e);
    }
  }
}

export const sampleQuestionBank: QuestionBankItem[] = [];

export const sampleExamPackage: ExamPackage | null = null;
