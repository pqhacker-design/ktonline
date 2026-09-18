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

    // 1. Check doc ID directly (e.g. 'admin' or formatted doc ID)
    const formattedId = cleanUsername.replace(/[^a-zA-Z0-9]/g, '_');
    const userDocRef = doc(db, USERS_COLLECTION, formattedId);
    let matchedUser: AppUser | null = null;
    let matchedId = '';

    try {
      const userDocSnap = await fetchWithTimeout(getDoc(userDocRef), 1500);
      if (userDocSnap && userDocSnap.exists()) {
        matchedUser = userDocSnap.data() as AppUser;
        matchedId = userDocSnap.id;
      }
    } catch (e) {
      // Silent catch
    }

    if (!matchedUser) {
      // 2. Query by username or email field
      try {
        const qUsername = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
        const qSnapUsername = await fetchWithTimeout(getDocs(qUsername), 1500);

        if (qSnapUsername && !qSnapUsername.empty) {
          matchedUser = qSnapUsername.docs[0].data() as AppUser;
          matchedId = qSnapUsername.docs[0].id;
        } else {
          const qEmail = query(collection(db, USERS_COLLECTION), where('email', '==', cleanUsername));
          const qSnapEmail = await fetchWithTimeout(getDocs(qEmail), 1500);

          if (qSnapEmail && !qSnapEmail.empty) {
            matchedUser = qSnapEmail.docs[0].data() as AppUser;
            matchedId = qSnapEmail.docs[0].id;
          }
        }
      } catch (e) {
        // Silent catch
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
      const userDocRef = doc(db, USERS_COLLECTION, docId);
      const snap = await fetchWithTimeout(getDoc(userDocRef), 1500);
      if (snap && snap.exists()) {
        const data = snap.data() as AppUser;
        return {
          ...data,
          id: snap.id,
          username: data.username || data.email || snap.id,
          email: data.email || data.username || snap.id,
        };
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

    await updateDoc(userDocRef, {
      password: cleanNew,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Listen to real-time users collection updates for Admin
   */
  subscribeUsers(callback: (users: AppUser[]) => void) {
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
        callback(list);
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );
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

    // Query if already exists
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống!`);
    }

    const appUserData: AppUser = {
      username: cleanUsername,
      email: cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@system.local`,
      password: newUser.password.trim(),
      displayName: newUser.displayName || cleanUsername,
      role: newUser.role,
      active: newUser.active,
      createdAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, appUserData);
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

    await setDoc(userDocRef, payload, { merge: true });
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

    await setDoc(userDocRef, payload, { merge: true });

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
    const userDocRef = doc(db, USERS_COLLECTION, docId);
    await deleteDoc(userDocRef);
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

