import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { UserDataSync } from './userDataSync';
import { SupabaseService } from './supabaseService';

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

const fetchWithTimeout = <T>(promise: Promise<T>, ms = 8000): Promise<T | null> => {
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

    if (UserDataSync.getIsQuotaExceeded()) {
      return defaultAdmin;
    }

    const adminDocRef = doc(db, USERS_COLLECTION, 'admin');
    
    try {
      const adminSnap = await fetchWithTimeout(getDoc(adminDocRef), 8000);

      if (adminSnap && adminSnap.exists()) {
        const data = adminSnap.data() as AppUser;
        return {
          ...data,
          id: 'admin',
          username: data.username || 'pqhacker@gamil.com',
          email: data.email || 'pqhacker@gamil.com',
          password: data.password || 'Hungdiemly300506',
          role: 'admin',
          active: true,
        };
      }
    } catch (err: any) {
      UserDataSync.checkAndMarkQuotaError(err);
    }

    return defaultAdmin;
  },

  /**
   * Authenticate user with username/email & password
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
      // Trigger background sync to Firestore
      this.ensureDefaultAdmin().catch(() => {});
      return defaultAdmin;
    }

    let matchedUser: AppUser | null = null;
    let matchedId = '';
    let networkTimeoutOccurred = false;

    // 0. Check Supabase if active
    if (SupabaseService.isEnabled()) {
      try {
        const spUser = await SupabaseService.getUser(cleanUsername);
        if (spUser) {
          matchedUser = spUser;
          matchedId = spUser.id || cleanUsername;
        }
      } catch (err) {
        console.warn('Lỗi đọc user từ Supabase:', err);
      }
    }

    // 1. Check doc ID directly (try formatted ID first, then cleanUsername directly)
    const formattedId = cleanUsername.replace(/[^a-zA-Z0-9]/g, '_');
    const docIdsToTry = [formattedId];
    if (cleanUsername !== formattedId) {
      docIdsToTry.push(cleanUsername);
    }

    if (!matchedUser) {
      for (const dId of docIdsToTry) {
        try {
          const userDocRef = doc(db, USERS_COLLECTION, dId);
          const userDocSnap = await fetchWithTimeout(getDoc(userDocRef), 8000);
          if (userDocSnap === null) {
            networkTimeoutOccurred = true;
          } else if (userDocSnap.exists()) {
            matchedUser = userDocSnap.data() as AppUser;
            matchedId = userDocSnap.id;
            networkTimeoutOccurred = false;
            break;
          }
        } catch (e) {
          console.warn('Lỗi đọc userDoc:', e);
        }
      }
    }

    if (!matchedUser) {
      // 2. Query by username or email field
      try {
        const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
        const qSnapUsername = await fetchWithTimeout(getDocs(qUsername), 8000);

        if (qSnapUsername === null) {
          networkTimeoutOccurred = true;
        } else if (!qSnapUsername.empty) {
          matchedUser = qSnapUsername.docs[0].data() as AppUser;
          matchedId = qSnapUsername.docs[0].id;
          networkTimeoutOccurred = false;
        } else {
          const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', cleanUsername));
          const qSnapEmail = await fetchWithTimeout(getDocs(qEmail), 8000);

          if (qSnapEmail === null) {
            networkTimeoutOccurred = true;
          } else if (!qSnapEmail.empty) {
            matchedUser = qSnapEmail.docs[0].data() as AppUser;
            matchedId = qSnapEmail.docs[0].id;
            networkTimeoutOccurred = false;
          }
        }
      } catch (e) {
        console.warn('Lỗi query users:', e);
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
        networkTimeoutOccurred = false;
      } else if (!matchedUser.password) {
        matchedUser.password = 'Hungdiemly300506';
      }
    }

    if (!matchedUser) {
      if (networkTimeoutOccurred) {
        throw new Error('Kết nối tới máy chủ quá hạn (timeout). Vui lòng kiểm tra đường truyền mạng và thử đăng nhập lại.');
      }
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    const effectivePassword = matchedUser.password || (isAdminLogin ? 'Hungdiemly300506' : '');

    if (effectivePassword !== cleanPassword) {
      throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }

    if (matchedUser.active === false) {
      throw new Error('Tài khoản này đã bị khóa hoặc chưa được kích hoạt bởi Admin.');
    }

    return {
      ...matchedUser,
      id: matchedId || 'admin',
      username: matchedUser.username || matchedUser.email || cleanUsername,
      email: matchedUser.email || matchedUser.username || cleanUsername,
    };
  },

  /**
   * Fetch single user profile by doc ID
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

    try {
      const cleanId = docId.trim();
      const formattedId = cleanId.replace(/[^a-zA-Z0-9]/g, '_');
      const docIdsToTry = [cleanId];
      if (formattedId !== cleanId) docIdsToTry.push(formattedId);

      for (const dId of docIdsToTry) {
        const userDocRef = doc(db, USERS_COLLECTION, dId);
        const snap = await fetchWithTimeout(getDoc(userDocRef), 8000);
        if (snap && snap.exists()) {
          const data = snap.data() as AppUser;
          return {
            ...data,
            id: snap.id,
            username: data.username || data.email || snap.id,
            email: data.email || data.username || snap.id,
          };
        }
      }
    } catch (err) {
      // Silent catch
    }
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

    if (UserDataSync.getIsQuotaExceeded()) {
      return;
    }

    try {
      await updateDoc(userDocRef, {
        password: cleanNew,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (UserDataSync.checkAndMarkQuotaError(err)) {
        return;
      }
      throw err;
    }
  },

  LOCAL_CACHE_KEY: 'aitest_users_cache_v1',

  getLocalCachedUsers(): AppUser[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.LOCAL_CACHE_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) return list;
        }
      }
    } catch {}
    return [];
  },

  saveLocalCachedUsers(users: AppUser[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.LOCAL_CACHE_KEY, JSON.stringify(users));
      }
    } catch {}
  },

  /**
   * Listen to real-time users collection updates for Admin with multi-level resilient fallback
   */
  subscribeUsers(callback: (users: AppUser[]) => void) {
    // 0. Phục hồi ngay từ bộ nhớ cache cục bộ để giao diện không bao giờ bị trắng/trống
    const cached = this.getLocalCachedUsers();
    if (cached.length > 0) {
      callback(cached);
    }

    if (SupabaseService.isEnabled()) {
      SupabaseService.getUsers().then((list) => {
        if (list && list.length > 0) {
          this.saveLocalCachedUsers(list);
          callback(list);
        }
      }).catch(() => {});
    }

    let hasReceivedSnapshot = false;

    // Timeout dự phòng: nếu sau 4 giây onSnapshot chưa phản hồi (do nghẽn mạng/quota), chủ động gọi getDocs
    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedSnapshot) {
        this.getAllUsers().then((fallbackList) => {
          if (fallbackList && fallbackList.length > 0) {
            callback(fallbackList);
          }
        }).catch(() => {});
      }
    }, 4000);

    const colRef = collection(db, USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        hasReceivedSnapshot = true;
        clearTimeout(fallbackTimer);
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
        this.saveLocalCachedUsers(list);
        callback(list);
      },
      (error) => {
        console.error('Error in onSnapshot users, falling back to getAllUsers:', error);
        clearTimeout(fallbackTimer);
        this.getAllUsers().then((fallbackList) => {
          callback(fallbackList);
        }).catch(() => {
          const fallbackCached = this.getLocalCachedUsers();
          if (fallbackCached.length > 0) callback(fallbackCached);
        });
      }
    );
  },

  /**
   * Get all users for administration or data migration
   */
  async getAllUsers(): Promise<AppUser[]> {
    if (SupabaseService.isEnabled()) {
      try {
        const sp = await SupabaseService.getUsers();
        if (sp && sp.length > 0) {
          this.saveLocalCachedUsers(sp);
          return sp;
        }
      } catch {}
    }
    const defaultAdmin = await this.ensureDefaultAdmin();
    try {
      const colRef = collection(db, USERS_COLLECTION);
      const snapshot = await fetchWithTimeout(getDocs(colRef), 6000);
      if (snapshot && !snapshot.empty) {
        const list: AppUser[] = snapshot.docs.map((d) => {
          const data = d.data() as AppUser;
          return {
            id: d.id,
            ...data,
            username: data.username || data.email || d.id,
            email: data.email || data.username || d.id,
          };
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        this.saveLocalCachedUsers(list);
        return list;
      }
    } catch (err) {
      console.warn('Lỗi getDocs users:', err);
    }

    const localCached = this.getLocalCachedUsers();
    if (localCached.length > 0) {
      return localCached;
    }

    return [defaultAdmin];
  },

  /**
   * Admin adds a new user with username and password
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
    const userDocRef = doc(db, USERS_COLLECTION, docId);

    // Fast check if already exists with timeout protection
    try {
      const existingSnap = await fetchWithTimeout(getDoc(userDocRef), 4000);
      if (existingSnap && existingSnap.exists()) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
      }
    } catch (checkErr: any) {
      if (checkErr.message && checkErr.message.includes('đã tồn tại')) {
        throw checkErr;
      }
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

    // Save to Supabase if enabled
    if (SupabaseService.isEnabled()) {
      try {
        await SupabaseService.saveUser(appUserData);
      } catch (sbErr) {
        console.warn('Lỗi lưu user lên Supabase:', sbErr);
      }
    }

    if (UserDataSync.getIsQuotaExceeded()) {
      return;
    }

    // Dispatch write to Firestore without hanging forever if network ACK is slow
    try {
      const savePromise = setDoc(userDocRef, appUserData);
      await Promise.race([
        savePromise,
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
    } catch (saveErr: any) {
      if (UserDataSync.checkAndMarkQuotaError(saveErr)) {
        return;
      }
      throw saveErr;
    }
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
      // Check if another doc has this username
      const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
      const qSnap = await getDocs(qUsername);
      const conflict = qSnap.docs.find((d) => d.id !== docId);
      if (conflict) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
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

    if (SupabaseService.isEnabled()) {
      try {
        const existing = await SupabaseService.getUser(docId);
        if (existing) {
          await SupabaseService.saveUser({ ...existing, ...payload });
        }
      } catch (e) {
        console.warn('Lỗi cập nhật user trên Supabase:', e);
      }
    }

    if (UserDataSync.getIsQuotaExceeded()) {
      return;
    }

    try {
      await setDoc(userDocRef, payload, { merge: true });
    } catch (err: any) {
      if (UserDataSync.checkAndMarkQuotaError(err)) {
        return;
      }
      throw err;
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
        const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
        const qSnap = await getDocs(qUsername);
        const conflict = qSnap.docs.find((d) => d.id !== docId);
        if (conflict) {
          throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`);
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

    if (!UserDataSync.getIsQuotaExceeded()) {
      try {
        await setDoc(userDocRef, payload, { merge: true });
      } catch (err: any) {
        UserDataSync.checkAndMarkQuotaError(err);
      }
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
   * Admin deletes a user account with optional cascade deletion of user-associated data
   */
  async deleteUser(docId: string, cascade: boolean = false): Promise<void> {
    if (SupabaseService.isEnabled()) {
      try {
        await SupabaseService.deleteUser(docId, cascade);
      } catch (e) {
        console.warn('Lỗi xóa user trên Supabase:', e);
      }
    }

    if (UserDataSync.getIsQuotaExceeded()) {
      if (SupabaseService.isEnabled()) {
        return; // Successfully handled in Supabase
      }
      throw new Error('Hạn ngạch ghi Firestore miễn phí hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.');
    }

    try {
      if (cascade) {
        // 1. Delete user_data document for this user
        try {
          await deleteDoc(doc(db, 'user_data', docId));
        } catch (e) {
          console.warn('[Cascade] Lỗi xóa user_data trên Firestore:', e);
        }

        // 2. Query and delete published_exams created by this user & their student_results
        try {
          const qExams = query(collection(db, 'published_exams'), where('createdBy', '==', docId));
          const examSnaps = await getDocs(qExams);
          const examCodes: string[] = [];

          for (const examDoc of examSnaps.docs) {
            const data = examDoc.data();
            if (data && data.code) {
              examCodes.push(data.code.trim().toUpperCase());
            }
            await deleteDoc(doc(db, 'published_exams', examDoc.id));
          }

          // Delete all student_results corresponding to those exam codes
          for (const code of examCodes) {
            try {
              const qResults = query(collection(db, 'student_results'), where('examCode', '==', code));
              const resSnaps = await getDocs(qResults);
              for (const resDoc of resSnaps.docs) {
                await deleteDoc(doc(db, 'student_results', resDoc.id));
              }
            } catch (errRes) {
              console.warn(`[Cascade] Lỗi xóa student_results cho mã đề ${code}:`, errRes);
            }
          }
        } catch (e) {
          console.warn('[Cascade] Lỗi xóa published_exams trên Firestore:', e);
        }

        // 3. Delete system_classes and system_students created by this user
        try {
          const qClasses = query(collection(db, 'system_classes'), where('createdBy', '==', docId));
          const classSnaps = await getDocs(qClasses);
          for (const clsDoc of classSnaps.docs) {
            await deleteDoc(doc(db, 'system_classes', clsDoc.id));
          }

          const qStudents = query(collection(db, 'system_students'), where('createdBy', '==', docId));
          const studentSnaps = await getDocs(qStudents);
          for (const stDoc of studentSnaps.docs) {
            await deleteDoc(doc(db, 'system_students', stDoc.id));
          }
        } catch (e) {
          console.warn('[Cascade] Lỗi xóa system_classes/students trên Firestore:', e);
        }
      }

      // Delete user document in users collection
      const userDocRef = doc(db, USERS_COLLECTION, docId);
      await deleteDoc(userDocRef);
    } catch (err: any) {
      if (UserDataSync.checkAndMarkQuotaError(err)) {
        if (!SupabaseService.isEnabled()) {
          throw new Error('Hạn ngạch ghi Firestore miễn phí hôm nay đã đạt giới hạn. Vui lòng thử lại vào ngày mai.');
        }
      } else {
        throw err;
      }
    }
  },

  /**
   * Reset user database: Delete all users except default admin account
   */
  async resetAllUsersExceptAdmin(): Promise<void> {
    const colRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(colRef);

    for (const d of snap.docs) {
      const data = d.data() as AppUser;
      if (d.id !== 'admin' && data.username !== 'pqhacker@gamil.com' && data.username !== 'pqhacker@gmail.com' && data.username !== 'admin') {
        await deleteDoc(doc(db, USERS_COLLECTION, d.id));
      }
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

    // 1. Clean general collections
    for (const col of collectionsToClean) {
      if (!col.enabled) continue;
      currentStep++;
      if (onProgress) {
        onProgress(`Đang xóa bộ sưu tập: ${col.label}...`, Math.round((currentStep / totalSteps) * 90));
      }

      try {
        const colRef = collection(db, col.name);
        const snapshot = await getDocs(colRef);
        for (const docItem of snapshot.docs) {
          try {
            await deleteDoc(doc(db, col.name, docItem.id));
            deletedCount++;
          } catch (delErr: any) {
            errors.push(`Lỗi xóa doc ${docItem.id} trong ${col.name}: ${delErr.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Lỗi truy cập ${col.name}: ${err.message}`);
      }
    }

    // 2. Clean users collection
    if (options.wipeUsersExceptAdmin !== false) {
      currentStep++;
      if (onProgress) {
        onProgress('Đang xóa các tài khoản người dùng...', Math.round((currentStep / totalSteps) * 90));
      }

      try {
        const colRef = collection(db, USERS_COLLECTION);
        const snapshot = await getDocs(colRef);
        for (const docItem of snapshot.docs) {
          const data = docItem.data() as AppUser;
          if (docItem.id !== 'admin' && data.username !== 'pqhacker@gamil.com' && data.username !== 'pqhacker@gmail.com' && data.username !== 'admin') {
            try {
              await deleteDoc(doc(db, USERS_COLLECTION, docItem.id));
              deletedCount++;
            } catch (delErr: any) {
              errors.push(`Lỗi xóa user ${docItem.id}: ${delErr.message}`);
            }
          }
        }
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

