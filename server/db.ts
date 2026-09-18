import fs from 'fs';
import path from 'path';

export interface ExamData {
  id: string;
  code: string; // e.g. "A7X92Q"
  title: string;
  subject: string;
  grade: string;
  duration: number; // in minutes, e.g. 45
  totalPoints: number; // e.g. 10.0
  topic?: string;
  packageId?: string;
  examPackageId?: string;
  createdDate: string; // ISO string
  status: 'active' | 'locked';
  allowExplanations: boolean; // allow students to see solutions after submit
  allowedClasses?: string[]; // Danh sách các lớp được làm bài (VD: ["10A1", "10A2"])
  scheduledStartTime?: string; // Thời gian bắt đầu làm bài (ISO string hoặc YYYY-MM-DDTHH:mm), nếu có thì đến giờ mới mở
  startTimeType?: 'immediate' | 'scheduled'; // Tự do làm lúc nào cũng được hoặc Đặt giờ bắt đầu
  createdBy?: string;
  antiCheat: {
    disallowPrevious: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    autoSubmitOnTimeout: boolean;
    warnTabSwitch: boolean;
    tabSwitchLimit: number;
  };
  examPackage: any; // Full ExamPackage object (questions, matrix, spec)
}

export interface StudentItem {
  id: string;
  classId: string;
  className: string;
  sbd: string;
  name: string;
  gender?: string;
  dob?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  grade: string;
  schoolYear: string;
  teacherName?: string;
  notes?: string;
  studentCount?: number;
  createdBy?: string;
  createdAt?: string;
}

export interface ActivityLogItem {
  timestamp: string;
  event: string; // e.g., "Bắt đầu làm bài", "Chuyển tab lần 1"
  details?: string;
}

export interface StudentSession {
  id: string;
  examCode: string;
  studentName: string;
  studentClass: string;
  studentId?: string; // Số báo danh / Mã học sinh để tránh trùng tên
  studentSchool?: string;
  seed: string;
  startTime: string; // ISO string
  submitTime?: string | null; // ISO string
  remainingSeconds: number;
  answers: Record<string, any>; // questionId -> student answer
  score?: number | null;
  correctCount?: number | null;
  incorrectCount?: number | null;
  totalQuestions?: number;
  shuffledQuestions?: any[]; // The customized paper generated for this student seed
  originalAnswersMap?: Record<string, any>; // Grading reference map for shuffled paper
  activityLogs: ActivityLogItem[];
  status: 'in_progress' | 'submitted';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Lỗi đọc file ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Lỗi ghi file ${filePath}:`, err);
  }
}

export const sampleInitialExams: ExamData[] = [];

export class ExamRepository {
  // --- EXAMS ---
  static getExams(userId?: string): ExamData[] {
    const exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    if (!userId || userId === 'guest' || userId === 'anonymous') return [];
    return exams.filter((e) => e.createdBy === userId);
  }

  static getExamByCode(code: string): ExamData | undefined {
    const exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    return exams.find((e) => e.code.toUpperCase() === code.toUpperCase());
  }

  static saveExam(exam: ExamData, userId?: string): ExamData {
    if (userId) {
      exam.createdBy = userId;
    }
    const exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    const index = exams.findIndex((e) => e.code.toUpperCase() === exam.code.toUpperCase());
    if (index >= 0) {
      exams[index] = { ...exams[index], ...exam, createdBy: exam.createdBy || exams[index].createdBy || userId };
    } else {
      exams.unshift(exam);
    }
    writeJsonFile(EXAMS_FILE, exams);
    return exam;
  }

  static updateExamStatus(code: string, status: 'active' | 'locked'): ExamData | undefined {
    const exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    const exam = exams.find((e) => e.code.toUpperCase() === code.toUpperCase());
    if (exam) {
      exam.status = status;
      writeJsonFile(EXAMS_FILE, exams);
    }
    return exam;
  }

  static deleteExam(code: string, userId?: string): boolean {
    let exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    const initialLen = exams.length;
    exams = exams.filter((e) => {
      if (e.code.toUpperCase() !== code.toUpperCase()) return true;
      if (userId && e.createdBy && e.createdBy !== userId && userId !== 'admin') return true;
      return false;
    });
    if (exams.length !== initialLen) {
      writeJsonFile(EXAMS_FILE, exams);
      return true;
    }
    return false;
  }

  // --- STUDENT SESSIONS ---
  static getSessions(): StudentSession[] {
    return readJsonFile<StudentSession[]>(SESSIONS_FILE, []);
  }

  static getSessionById(sessionId: string): StudentSession | undefined {
    const sessions = this.getSessions();
    return sessions.find((s) => s.id === sessionId);
  }

  static findStudentSession(
    examCode: string,
    studentName: string,
    studentClass: string,
    studentId?: string
  ): StudentSession | undefined {
    const sessions = this.getSessions();
    const normCode = examCode.trim().toUpperCase();
    const normName = studentName.trim().toLowerCase();
    const normClass = studentClass.trim().toLowerCase();
    const normId = (studentId || '').trim().toLowerCase();

    return sessions.find((s) => {
      if (s.examCode.toUpperCase() !== normCode) return false;

      // Match by studentId if provided
      if (normId && s.studentId && s.studentId.trim().toLowerCase() === normId) {
        return true;
      }

      // Default match by studentName + studentClass
      return (
        s.studentName.trim().toLowerCase() === normName &&
        s.studentClass.trim().toLowerCase() === normClass
      );
    });
  }

  static saveSession(session: StudentSession): StudentSession {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    writeJsonFile(SESSIONS_FILE, sessions);
    return session;
  }

  static deleteSession(sessionId: string): boolean {
    let sessions = this.getSessions();
    const initialLen = sessions.length;
    sessions = sessions.filter((s) => s.id !== sessionId);
    if (sessions.length !== initialLen) {
      writeJsonFile(SESSIONS_FILE, sessions);
      return true;
    }
    return false;
  }

  static getResultsByExamCode(examCode?: string, userId?: string): StudentSession[] {
    const sessions = this.getSessions();
    const exams = readJsonFile<ExamData[]>(EXAMS_FILE, []);
    let filteredExams = exams;
    if (userId) {
      filteredExams = exams.filter((e) => e.createdBy === userId || !e.createdBy);
    }
    const userExamCodes = new Set(filteredExams.map((e) => e.code.toUpperCase()));

    return sessions.filter((s) => {
      if (s.status !== 'submitted') return false;
      if (userId && !userExamCodes.has(s.examCode.toUpperCase())) return false;
      if (!examCode || examCode === 'ALL') return true;
      return s.examCode.toUpperCase() === examCode.toUpperCase();
    });
  }
}

export const sampleInitialClasses: ClassItem[] = [];

export const sampleInitialStudents: StudentItem[] = [];

export function extractGradeNumber(str?: string | null): string | null {
  if (!str) return null;
  const s = String(str).trim();
  const keywordMatch = s.match(/(?:khối|khoi|lớp|lop|grade|class|k)\s*(\d{1,2})/i);
  if (keywordMatch && keywordMatch[1]) {
    const n = parseInt(keywordMatch[1], 10);
    if (n >= 1 && n <= 12) return String(n);
  }
  const leadingMatch = s.match(/^(\d{1,2})/);
  if (leadingMatch && leadingMatch[1]) {
    const n = parseInt(leadingMatch[1], 10);
    if (n >= 1 && n <= 12) return String(n);
  }
  const boundaryMatch = s.match(/\b(12|11|10|[1-9])\b/);
  if (boundaryMatch && boundaryMatch[1]) {
    return boundaryMatch[1];
  }
  const anyMatch = s.match(/(12|11|10|[1-9])/);
  return anyMatch ? anyMatch[1] : null;
}

export function matchGrade(examGrade?: string | null, classGradeOrName?: string | null): boolean {
  if (!examGrade || !classGradeOrName) return true;
  const g1 = extractGradeNumber(examGrade);
  const g2 = extractGradeNumber(classGradeOrName);
  if (g1 && g2) {
    return g1 === g2;
  }
  return examGrade.trim().toLowerCase() === classGradeOrName.trim().toLowerCase();
}

export function normalizeClassName(str?: string | null): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(lớp|lop|class|khối|khoi)\s*/gi, '')
    .replace(/[^a-z0-9]/gi, '');
}

export class ClassRepository {
  static getClasses(userId?: string): ClassItem[] {
    let classes = readJsonFile<ClassItem[]>(CLASSES_FILE, []);
    if (userId) {
      classes = classes.filter((c) => c.createdBy === userId || (!c.createdBy && userId === 'guest'));
    }
    const students = this.getStudents(undefined, userId);
    return classes.map((cls) => ({
      ...cls,
      studentCount: students.filter(
        (s) => s.classId === cls.id || s.className.trim().toLowerCase() === cls.name.trim().toLowerCase()
      ).length,
    }));
  }

  static saveClass(classItem: ClassItem, userId?: string): ClassItem {
    if (userId && !classItem.createdBy) {
      classItem.createdBy = userId;
    }
    const targetUserId = classItem.createdBy || userId;
    const classes = readJsonFile<ClassItem[]>(CLASSES_FILE, []);
    const idx = classes.findIndex(
      (c) =>
        c.id === classItem.id ||
        (c.name &&
          classItem.name &&
          c.name.trim().toLowerCase() === classItem.name.trim().toLowerCase() &&
          (c.createdBy === targetUserId || (!c.createdBy && (!targetUserId || targetUserId === 'guest'))))
    );
    if (idx >= 0) {
      classes[idx] = { ...classes[idx], ...classItem };
    } else {
      classes.push(classItem);
    }
    writeJsonFile(CLASSES_FILE, classes);
    return classItem;
  }

  static deleteClass(id: string, userId?: string): boolean {
    let classes = readJsonFile<ClassItem[]>(CLASSES_FILE, []);
    const targetClass = classes.find(
      (c) =>
        (c.id === id || c.name.trim().toLowerCase() === id.trim().toLowerCase()) &&
        (!userId || c.createdBy === userId || (!c.createdBy && userId === 'guest'))
    );
    if (!targetClass) return false;

    classes = classes.filter((c) => c.id !== targetClass.id);
    writeJsonFile(CLASSES_FILE, classes);

    let students = readJsonFile<StudentItem[]>(STUDENTS_FILE, []);
    students = students.filter((s) => {
      const isMatchingClass =
        s.classId === targetClass.id ||
        (s.className || '').trim().toLowerCase() === targetClass.name.trim().toLowerCase();
      const isMatchingUser = !userId || s.createdBy === userId || (!s.createdBy && userId === 'guest');
      return !(isMatchingClass && isMatchingUser);
    });
    writeJsonFile(STUDENTS_FILE, students);

    return true;
  }

  static getStudents(classIdOrName?: string, userId?: string): StudentItem[] {
    let students = readJsonFile<StudentItem[]>(STUDENTS_FILE, []);
    if (userId) {
      students = students.filter((s) => s.createdBy === userId || (!s.createdBy && userId === 'guest'));
    }
    if (!classIdOrName || classIdOrName === 'ALL') return students;
    const norm = classIdOrName.trim().toLowerCase();
    return students.filter(
      (s) => s.classId === classIdOrName || s.className.trim().toLowerCase() === norm
    );
  }

  static saveStudents(newStudents: StudentItem[], userId?: string): StudentItem[] {
    const students = readJsonFile<StudentItem[]>(STUDENTS_FILE, []);

    // 1. Check duplicate SBDs within the incoming batch
    const batchSbdSet = new Set<string>();
    newStudents.forEach((st) => {
      if (st.sbd && st.sbd.trim()) {
        const norm = st.sbd.trim().toUpperCase();
        if (batchSbdSet.has(norm)) {
          throw new Error(`SBD '${st.sbd}' bị trùng lặp ngay trong danh sách học sinh gửi lên. Vui lòng kiểm tra lại!`);
        }
        batchSbdSet.add(norm);
      }
    });

    // 2. Validate against existing students belonging ONLY to the same user
    newStudents.forEach((st) => {
      if (userId && !st.createdBy) {
        st.createdBy = userId;
      }
      const stUser = st.createdBy || userId;
      const normStSbd = st.sbd ? st.sbd.trim().toUpperCase() : '';

      if (normStSbd) {
        const userStudents = students.filter(
          (s) => (stUser ? s.createdBy === stUser || (!s.createdBy && stUser === 'guest') : true)
        );
        const conflicting = userStudents.find(
          (s) => s.id !== st.id && s.sbd && s.sbd.trim().toUpperCase() === normStSbd
        );
        if (conflicting) {
          throw new Error(
            `Số báo danh (SBD) '${st.sbd}' đã tồn tại trong danh sách của bạn (thuộc học sinh '${conflicting.name}' - Lớp ${conflicting.className}). Vui lòng chọn SBD khác!`
          );
        }
      }

      const idx = students.findIndex((s) => s.id === st.id);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...st };
      } else {
        students.push(st);
      }
    });

    writeJsonFile(STUDENTS_FILE, students);
    return newStudents;
  }

  static deleteStudent(id: string, userId?: string): boolean {
    let students = readJsonFile<StudentItem[]>(STUDENTS_FILE, []);
    const initialLen = students.length;
    students = students.filter((s) => {
      if (s.id !== id) return true;
      if (userId && s.createdBy && s.createdBy !== userId) return true;
      return false;
    });
    if (students.length !== initialLen) {
      writeJsonFile(STUDENTS_FILE, students);
      return true;
    }
    return false;
  }

  static findStudentBySbd(sbd: string, targetUserId?: string, allowedClasses?: string[]): StudentItem | undefined {
    if (!sbd) return undefined;
    const cleanSbd = sbd.trim();
    const cleanSbdUpper = cleanSbd.toUpperCase();
    const normSbdA = cleanSbdUpper.replace(/[^a-zA-Z0-9]/g, '');

    const students = readJsonFile<StudentItem[]>(STUDENTS_FILE, []);

    const matchStudent = (s: StudentItem): boolean => {
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

    // 1. If targetUserId is provided, try finding student belonging to that creator
    if (targetUserId) {
      const userStudents = students.filter(
        (s) => s.createdBy === targetUserId || (!s.createdBy && targetUserId === 'guest')
      );
      const userFound = userStudents.find(matchStudent);
      if (userFound) return userFound;
    }

    // 2. Fall back to finding matching student across all students
    return students.find(matchStudent);
  }
}
