import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

export interface AppUser {
  id?: string;
  username: string;
  email?: string;
  password?: string;
  displayName?: string;
  role: 'admin' | 'user';
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

const USERS_COLLECTION = 'users';
const LOCAL_USERS_CACHE_KEY = 'aitest_system_users_cache';

// In-memory & LocalStorage user cache for resilient offline-first support
let _cachedUsers: AppUser[] = [];
try {
  const saved = localStorage.getItem(LOCAL_USERS_CACHE_KEY);
  if (saved) {
    _cachedUsers = JSON.parse(saved);
  }
} catch (e) {}

const updateLocalUsersCache = (newList: AppUser[]) => {
  _cachedUsers = newList;
  try {
    localStorage.setItem(LOCAL_USERS_CACHE_KEY, JSON.stringify(newList));
  } catch (e) {}
};

const fetchWithTimeout = <T>(promise: Promise<T>, ms = 1500): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<T | null>((resolve) => setTimeout(() => resolve(null), ms))
  ]).catch(() => null);
};

export const userService = {
  /**
   * Ensure default admin account exists and has a valid password in Firestore
   */
  async ensureDefaultAdmin(): Promise<AppUser> {
    const defaultAdmin: AppUser = {
      id: 'admin',
      username: 'pqhacker@gamil.com',
      email: 'pqhacker@gamil.com',
      password: 'Hungdiemly300506',
      displayName: 'Quản trị viên Hệ thống',
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
    };

    const adminDocRef = doc(db, USERS_COLLECTION, 'admin');
    
    try {
      const adminSnap = await fetchWithTimeout(getDoc(adminDocRef), 1500);

      if (adminSnap && adminSnap.exists()) {
        const data = adminSnap.data() as AppUser;
        const updatedFields: Partial<AppUser> = {};

        if (!data.password || data.password === 'admin' || data.password === '300506') {
          updatedFields.password = 'Hungdiemly300506';
        }
        if (!data.username || data.username === 'admin') {
          updatedFields.username = 'pqhacker@gamil.com';
        }
        if (!data.email || data.email === 'admin@system.local') {
          updatedFields.email = 'pqhacker@gamil.com';
        }
        if (data.role !== 'admin') updatedFields.role = 'admin';
        if (data.active !== true) updatedFields.active = true;

        if (Object.keys(updatedFields).length > 0) {
          setDoc(adminDocRef, updatedFields, { merge: true }).catch(() => {});
        }

        return {
          ...data,
          ...updatedFields,
          id: 'admin',
          username: updatedFields.username || data.username || 'pqhacker@gamil.com',
          email: updatedFields.email || data.email || 'pqhacker@gamil.com',
          password: updatedFields.password || data.password || 'Hungdiemly300506',
        };
      } else {
        setDoc(adminDocRef, defaultAdmin, { merge: true }).catch(() => {});
      }
    } catch (err) {
      // Silent catch
    }

    return defaultAdmin;
  },

  /**
   * Authenticate user with username/email & password (Instant response & resilient fallback)
   */
  async authenticateUser(usernameInput: string, passwordInput: string): Promise<AppUser> {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu.');
    }

    const isAdminLogin = 
      cleanUsername === 'pqhacker@gamil.com' || 
      cleanUsername === 'pqhacker@gmail.com' || 
      cleanUsername === 'pqhacker@gmai.com' ||
      cleanUsername === 'admin';

    // Instant local check for hardcoded admin login
    if (isAdminLogin && (cleanPassword === 'Hungdiemly300506' || cleanPassword === '300506')) {
      const defaultAdmin: AppUser = {
        id: 'admin',
        username: 'pqhacker@gamil.com',
        email: 'pqhacker@gamil.com',
        password: 'Hungdiemly300506',
        displayName: 'Quản trị viên Hệ thống',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString(),
      };
      // Non-blocking sync to server & Firestore
      this.ensureDefaultAdmin().catch(() => {});
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      }).catch(() => {});
      return defaultAdmin;
    }

    const formattedId = cleanUsername.replace(/[^a-zA-Z0-9]/g, '_');
    let matchedUser: AppUser | null = null;
    let matchedId = '';

    // Step 0: Check in-memory & LocalStorage user cache FIRST (Instant 0ms, zero network delay!)
    const cachedMatch = _cachedUsers.find((u) => {
      const uName = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uId = (u.id || '').toLowerCase();
      return uName === cleanUsername || uEmail === cleanUsername || uId === formattedId;
    });

    if (cachedMatch) {
      matchedUser = cachedMatch;
      matchedId = cachedMatch.id || formattedId;
      // If password in cache matches, return immediately!
      if (matchedUser.password === cleanPassword) {
        if (matchedUser.active === false) {
          throw new Error('Tài khoản này đã bị khóa hoặc chưa được kích hoạt bởi Admin.');
        }
        return matchedUser;
      }
    }

    // Step 1: Call Backend REST API (Ultra fast ~10ms, checks data/users.json)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        matchedUser = data.user as AppUser;
        matchedId = data.user.id || formattedId;
        updateLocalUsersCache([matchedUser, ..._cachedUsers.filter((u) => u.id !== matchedId)]);
        return matchedUser;
      } else if (data.error && data.error.includes('khóa')) {
        throw new Error(data.error);
      }
    } catch (apiErr: any) {
      if (apiErr?.message && apiErr.message.includes('khóa')) {
        throw apiErr;
      }
      // If server returned non-lock error, continue to Firestore fallback
    }

    // Step 2: Firestore fallback if server unreachable or offline
    if (!matchedUser) {
      const userDocRef = doc(db, USERS_COLLECTION, formattedId);
      try {
        const userDocSnap = await fetchWithTimeout(getDoc(userDocRef), 800);
        if (userDocSnap && userDocSnap.exists()) {
          matchedUser = userDocSnap.data() as AppUser;
          matchedId = userDocSnap.id;
        }
      } catch (e) {}

      if (!matchedUser) {
        try {
          const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
          const qSnapUsername = await fetchWithTimeout(getDocs(qUsername), 800);

          if (qSnapUsername && !qSnapUsername.empty) {
            matchedUser = qSnapUsername.docs[0].data() as AppUser;
            matchedId = qSnapUsername.docs[0].id;
          } else {
            const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', cleanUsername));
            const qSnapEmail = await fetchWithTimeout(getDocs(qEmail), 800);

            if (qSnapEmail && !qSnapEmail.empty) {
              matchedUser = qSnapEmail.docs[0].data() as AppUser;
              matchedId = qSnapEmail.docs[0].id;
            }
          }
        } catch (e) {}
      }
    }

    // Fallback if logging in as admin
    if (isAdminLogin) {
      if (!matchedUser) {
        matchedUser = {
          username: 'pqhacker@gamil.com',
          email: 'pqhacker@gamil.com',
          password: 'Hungdiemly300506',
          displayName: 'Quản trị viên Hệ thống',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString()
        };
        matchedId = 'admin';
      } else if (!matchedUser.password) {
        matchedUser.password = 'Hungdiemly300506';
      }
    }

    if (!matchedUser) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    const effectivePassword = matchedUser.password || (isAdminLogin ? 'Hungdiemly300506' : '');

    if (effectivePassword !== cleanPassword) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    if (matchedUser.active === false) {
      throw new Error('Tài khoản này đã bị khóa hoặc chưa được kích hoạt bởi Admin.');
    }

    const finalUser: AppUser = {
      ...matchedUser,
      id: matchedId || matchedUser.id || formattedId,
      username: matchedUser.username || matchedUser.email || cleanUsername,
      email: matchedUser.email || matchedUser.username || cleanUsername,
    };

    // Update local cache so next actions/reloads are instant
    updateLocalUsersCache([finalUser, ..._cachedUsers.filter((u) => u.id !== finalUser.id)]);

    return finalUser;
  },

  /**
   * Fetch single user profile by doc ID with robust cache fallback
   */
  async getUserById(docId: string): Promise<AppUser | null> {
    if (docId === 'admin') {
      return {
        id: 'admin',
        username: 'pqhacker@gamil.com',
        email: 'pqhacker@gamil.com',
        password: 'Hungdiemly300506',
        displayName: 'Quản trị viên Hệ thống',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString()
      };
    }

    const cached = _cachedUsers.find((u) => u.id === docId || u.username === docId);

    try {
      const userDocRef = doc(db, USERS_COLLECTION, docId);
      const snap = await fetchWithTimeout(getDoc(userDocRef), 1000);
      if (snap && snap.exists()) {
        const data = snap.data() as AppUser;
        const freshUser: AppUser = {
          ...data,
          id: snap.id,
          username: data.username || data.email || snap.id,
          email: data.email || data.username || snap.id,
        };
        updateLocalUsersCache([freshUser, ..._cachedUsers.filter((u) => u.id !== docId)]);
        return freshUser;
      }
    } catch (err) {
      // Silent catch
    }

    if (cached) return cached;
    return null;
  },

  /**
   * Change user password
   */
  async changePassword(docId: string, oldPassword: string, newPassword: string): Promise<void> {
    const cleanOld = (oldPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    if (!cleanOld) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại.');
    }
    if (!cleanNew || cleanNew.length < 4) {
      throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
    }

    const userDocRef = doc(db, USERS_COLLECTION, docId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      throw new Error('Không tìm thấy thông tin tài khoản.');
    }

    const data = snap.data() as AppUser;
    const currentPass = data.password || (data.username === 'admin' ? 'admin123' : '');

    if (currentPass !== cleanOld) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    if (currentPass === cleanNew) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }

    try {
      const writePromise = updateDoc(userDocRef, {
        password: cleanNew,
        updatedAt: new Date().toISOString(),
      });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    } catch (e) {
      console.warn('Lỗi ghi Firestore password (tiếp tục chạy ngầm):', e);
    }
  },

  /**
   * Listen to real-time users collection updates for Admin (with local cache fallback)
   */
  subscribeUsers(callback: (users: AppUser[]) => void) {
    // Deliver cache immediately for instant UI render
    if (_cachedUsers.length > 0) {
      callback([..._cachedUsers]);
    }

    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: AppUser[] = snapshot.docs.map((d) => {
          const data = d.data() as AppUser;
          return {
            id: d.id,
            ...data,
            username: data.username || data.email || d.id,
            email: data.email || data.username || d.id,
          };
        });
        // Sort by createdAt descending
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        updateLocalUsersCache(list);
        callback(list);
      },
      (error) => {
        console.warn('Lỗi lắng nghe users từ Firestore (đang dùng cache nội bộ):', error?.message || error);
        if (_cachedUsers.length > 0) {
          callback([..._cachedUsers]);
        }
      }
    );
  },

  /**
   * Admin adds a new user with username and password (resilient & offline-first)
   */
  async addUser(newUser: { 
    username: string; 
    password: string; 
    displayName?: string; 
    role: 'admin' | 'user'; 
    active: boolean 
  }): Promise<void> {
    const cleanUsername = newUser.username.toLowerCase().trim();
    if (!cleanUsername) throw new Error('Tên đăng nhập không được để trống');
    if (!newUser.password || newUser.password.trim().length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự');
    }

    const docId = cleanUsername.replace(/[^a-zA-Z0-9]/g, '_');

    // 1. Instant check against cached users (Instant & zero-latency)
    const duplicateInCache = _cachedUsers.find(
      (u) => (u.username || '').toLowerCase() === cleanUsername || (u.id || '').toLowerCase() === docId
    );
    if (duplicateInCache) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
    }

    const appUserData: AppUser = {
      id: docId,
      username: cleanUsername,
      email: cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@system.local`,
      password: newUser.password.trim(),
      displayName: newUser.displayName || cleanUsername,
      role: newUser.role,
      active: newUser.active,
      createdAt: new Date().toISOString(),
    };

    // 2. Immediately update local cache so login and UI are instantaneous
    updateLocalUsersCache([appUserData, ..._cachedUsers.filter((u) => u.id !== docId)]);

    // 3. Register to backend server (/api/auth/register)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: newUser.password.trim(),
          displayName: newUser.displayName || cleanUsername,
          role: newUser.role,
        })
      });
      const data = await res.json();
      if (!res.ok && data.error) {
        // Rollback local cache if server says duplicate
        updateLocalUsersCache(_cachedUsers.filter((u) => u.id !== docId));
        throw new Error(data.error);
      }
    } catch (apiErr: any) {
      if (apiErr?.message && apiErr.message.includes('đã tồn tại')) {
        throw apiErr;
      }
      // If server is not responding (e.g. offline dev), continue with local cache & firestore
    }

    // 4. Fire-and-forget sync to Firestore in background (non-blocking, never blocks user UI)
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    setDoc(userDocRef, appUserData, { merge: true }).catch((err) => {
      console.warn('Ghi nhận Firestore user chạy ngầm:', err?.message || err);
    });
  },

  /**
   * Admin updates user username, role, active status, display name, or password
   */
  async updateUser(
    docId: string, 
    updates: Partial<Pick<AppUser, 'username' | 'role' | 'active' | 'displayName' | 'password'>>
  ): Promise<void> {
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.username && updates.username.trim()) {
      const cleanUsername = updates.username.toLowerCase().trim();
      
      // 1. Check local cache first
      const conflictCache = _cachedUsers.find((u) => u.id !== docId && (u.username || '').toLowerCase() === cleanUsername);
      if (conflictCache) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
      }

      // 2. Check remote Firestore safely
      try {
        const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
        const qSnap = await fetchWithTimeout(getDocs(qUsername), 1200);
        if (qSnap && !qSnap.empty) {
          const conflict = qSnap.docs.find((d) => d.id !== docId);
          if (conflict) {
            throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
          }
        }
      } catch (err: any) {
        if (err?.message && err.message.includes('đã tồn tại')) {
          throw err;
        }
        console.warn('Bỏ qua lỗi mạng khi kiểm tra trùng tên:', err?.message || err);
      }

      payload.username = cleanUsername;
      payload.email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@system.local`;
    }

    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.active !== undefined) payload.active = updates.active;
    if (updates.displayName !== undefined) payload.displayName = updates.displayName.trim();
    if (updates.password && updates.password.trim().length >= 4) {
      payload.password = updates.password.trim();
    }

    // Update cache
    updateLocalUsersCache(_cachedUsers.map((u) => u.id === docId ? { ...u, ...payload } : u));

    try {
      const writePromise = setDoc(userDocRef, payload, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    } catch (err: any) {
      console.warn('Lỗi ghi Firestore (sẽ đồng bộ lại khi có kết nối):', err?.message || err);
      if (err?.code === 'permission-denied') {
        throw new Error('Bạn không có quyền thực hiện thao tác này.');
      }
    }
  },

  /**
   * User or Admin updates their own profile (Username, Display Name, Password)
   */
  async updateUserProfile(
    docId: string,
    updates: { username?: string; displayName?: string; password?: string }
  ): Promise<AppUser> {
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    let currentData: AppUser = {
      id: docId,
      username: docId,
      email: `${docId}@system.local`,
      role: docId === 'admin' ? 'admin' : 'user',
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const snap = await fetchWithTimeout(getDoc(userDocRef), 1500);
      if (snap && snap.exists()) {
        currentData = { ...currentData, ...(snap.data() as AppUser), id: snap.id };
      }
    } catch (e) {}

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.username && updates.username.trim()) {
      const cleanUsername = updates.username.toLowerCase().trim();
      if (cleanUsername !== (currentData.username || '').toLowerCase()) {
        // Check cache first
        const conflictCache = _cachedUsers.find((u) => u.id !== docId && (u.username || '').toLowerCase() === cleanUsername);
        if (conflictCache) {
          throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`);
        }

        try {
          const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
          const qSnap = await fetchWithTimeout(getDocs(qUsername), 1200);
          if (qSnap && !qSnap.empty) {
            const conflict = qSnap.docs.find((d) => d.id !== docId);
            if (conflict) {
              throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`);
            }
          }
        } catch (err: any) {
          if (err?.message && err.message.includes('đã được sử dụng')) {
            throw err;
          }
          console.warn('Bỏ qua lỗi mạng khi kiểm tra tên:', err?.message || err);
        }

        payload.username = cleanUsername;
        payload.email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@system.local`;
      }
    }

    if (updates.displayName !== undefined) {
      payload.displayName = updates.displayName.trim();
    }

    if (updates.password && updates.password.trim()) {
      if (updates.password.trim().length < 4) {
        throw new Error('Mật khẩu mới phải có ít nhất 4 ký tự.');
      }
      payload.password = updates.password.trim();
    }

    // Update cache
    updateLocalUsersCache(_cachedUsers.map((u) => u.id === docId ? { ...u, ...payload } : u));

    try {
      const writePromise = setDoc(userDocRef, payload, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 800))
      ]);
    } catch (err: any) {
      console.warn('Lỗi ghi Firestore profile:', err?.message || err);
    }

    return {
      ...currentData,
      ...payload,
      id: docId,
      username: payload.username || currentData.username || docId,
      email: payload.email || currentData.email || `${docId}@system.local`,
      displayName: payload.displayName !== undefined ? payload.displayName : currentData.displayName,
      password: payload.password || currentData.password,
    };
  },

  /**
   * Admin deletes a user account
   */
  async deleteUser(docId: string): Promise<void> {
    updateLocalUsersCache(_cachedUsers.filter((u) => u.id !== docId && u.username !== docId));
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    try {
      await deleteDoc(userDocRef);
    } catch (err: any) {
      console.warn('Lỗi xóa Firestore user:', err?.message || err);
    }
  },

  /**
   * Reset user database: Delete all users except default admin account
   */
  async resetAllUsersExceptAdmin(): Promise<void> {
    const colRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(colRef);

    const docsToDelete = snap.docs.filter((d) => {
      const data = d.data() as AppUser;
      return d.id !== 'admin' && data.username !== 'pqhacker@gamil.com' && data.username !== 'pqhacker@gmail.com' && data.username !== 'admin';
    });

    const BATCH_SIZE = 450;
    for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
      const chunk = docsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const adminDocRef = doc(db, USERS_COLLECTION, 'admin');
    await setDoc(adminDocRef, {
      username: 'pqhacker@gamil.com',
      email: 'pqhacker@gamil.com',
      password: 'Hungdiemly300506',
      displayName: 'Quản trị viên Hệ thống',
      role: 'admin',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Complete Wipe / Reset of Cloud Firestore Database and system collections
   */
  async wipeEntireFirestoreDatabase(
    options: {
      wipeUsersExceptAdmin?: boolean;
      wipeAllUserData?: boolean;
      wipePublishedExams?: boolean;
      wipeStudentResults?: boolean;
      wipeClassesAndStudents?: boolean;
      resetAdminPasswordToDefault?: boolean;
      clearBrowserCache?: boolean;
    },
    onProgress?: (message: string, percent: number) => void
  ): Promise<{ deletedCount: number; errors: string[] }> {
    let deletedCount = 0;
    const errors: string[] = [];

    const collectionsToClean: { name: string; label: string; enabled: boolean }[] = [
      { name: 'user_data', label: 'Dữ liệu cá nhân giáo viên (user_data)', enabled: options.wipeAllUserData !== false },
      { name: 'published_exams', label: 'Đề thi trực tuyến (published_exams)', enabled: options.wipePublishedExams !== false },
      { name: 'student_results', label: 'Kết quả làm bài thi (student_results)', enabled: options.wipeStudentResults !== false },
      { name: 'system_classes', label: 'Danh sách lớp học (system_classes)', enabled: options.wipeClassesAndStudents !== false },
      { name: 'system_students', label: 'Danh sách học sinh (system_students)', enabled: options.wipeClassesAndStudents !== false },
    ];

    const totalSteps = collectionsToClean.filter(c => c.enabled).length + (options.wipeUsersExceptAdmin !== false ? 1 : 0) + 1;
    let currentStep = 0;

    // Helper to delete document refs using Firestore WriteBatch (tối đa 450 docs/lô, xóa hàng loạt siêu tốc)
    const deleteBatchInChunks = async (docs: { ref: any }[], label: string) => {
      const BATCH_SIZE = 450;
      const totalDocs = docs.length;
      if (totalDocs === 0) return 0;

      let count = 0;
      for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        count += chunk.length;
        
        if (onProgress) {
          const subPct = Math.min(90, Math.round(((currentStep - 1 + (i + chunk.length) / totalDocs) / totalSteps) * 90));
          onProgress(`Đang xóa ${label} (${Math.min(i + chunk.length, totalDocs)}/${totalDocs})...`, subPct);
        }
      }
      return count;
    };

    // 1. Clean general collections
    for (const col of collectionsToClean) {
      if (!col.enabled) continue;
      currentStep++;
      if (onProgress) {
        onProgress(`Đang nạp danh sách: ${col.label}...`, Math.round(((currentStep - 1) / totalSteps) * 90));
      }

      try {
        const colRef = collection(db, col.name);
        const snapshot = await getDocs(colRef);
        const count = await deleteBatchInChunks(snapshot.docs, col.label);
        deletedCount += count;
      } catch (err: any) {
        errors.push(`Lỗi truy cập ${col.name}: ${err.message}`);
      }
    }

    // 2. Clean users collection
    if (options.wipeUsersExceptAdmin !== false) {
      currentStep++;
      if (onProgress) {
        onProgress('Đang nạp danh sách tài khoản người dùng...', Math.round(((currentStep - 1) / totalSteps) * 90));
      }

      try {
        const colRef = collection(db, USERS_COLLECTION);
        const snapshot = await getDocs(colRef);
        const usersToDelete = snapshot.docs.filter((docItem) => {
          const data = docItem.data() as AppUser;
          return docItem.id !== 'admin' && data.username !== 'pqhacker@gamil.com' && data.username !== 'pqhacker@gmail.com' && data.username !== 'admin';
        });

        const count = await deleteBatchInChunks(usersToDelete, 'Tài khoản người dùng');
        deletedCount += count;
      } catch (err: any) {
        errors.push(`Lỗi xóa collection users: ${err.message}`);
      }
    }

    // 3. Reset Admin Account if requested
    if (options.resetAdminPasswordToDefault !== false) {
      try {
        const adminDocRef = doc(db, USERS_COLLECTION, 'admin');
        await setDoc(adminDocRef, {
          username: 'pqhacker@gamil.com',
          email: 'pqhacker@gamil.com',
          password: 'Hungdiemly300506',
          displayName: 'Quản trị viên Hệ thống',
          role: 'admin',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err: any) {
        errors.push(`Lỗi đặt lại tài khoản Admin: ${err.message}`);
      }
    }

    // 4. Clear LocalStorage cache if requested
    if (options.clearBrowserCache !== false) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('aitest_') && !key.includes('current_user') && !key.includes('auth_session')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (err: any) {
        console.warn('Lỗi dọn LocalStorage:', err);
      }
    }

    if (onProgress) {
      onProgress('Hoàn tất quá trình xóa sạch Database!', 100);
    }

    return { deletedCount, errors };
  }
};

