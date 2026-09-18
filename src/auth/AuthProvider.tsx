import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppUser, userService } from '../services/userService';
import { StorageEngine } from '../services/storageEngine';

export interface AuthContextType {
  firebaseUser: any | null; // Backwards compatible null
  user: AppUser | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  isUnauthorized: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithRedirect?: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: { username?: string; displayName?: string; password?: string }) => Promise<void>;
  isAdmin: boolean;
  isUser: boolean;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  role: null,
  loading: true,
  isUnauthorized: false,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => {},
  updateProfile: async () => {},
  isAdmin: false,
  isUser: false,
  refetchUser: async () => {},
});

const SESSION_KEY = 'vision_test_app_user_id';
const SESSION_USER_KEY = 'vision_test_app_user_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const cached = localStorage.getItem(SESSION_USER_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const savedUserId = localStorage.getItem(SESSION_KEY);
      const cachedUser = localStorage.getItem(SESSION_USER_KEY);
      if (cachedUser || savedUserId) return false;
    } catch (e) {}
    return false;
  });

  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);

  // Initialize and check saved session in background
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const savedUserId = localStorage.getItem(SESSION_KEY);
        if (savedUserId) {
          const appUser = await userService.getUserById(savedUserId);
          if (isMounted) {
            if (appUser && appUser.active) {
              setUser(appUser);
              localStorage.setItem(SESSION_USER_KEY, JSON.stringify(appUser));
              setIsUnauthorized(false);
            } else if (appUser && !appUser.active) {
              setUser(appUser);
              setIsUnauthorized(true);
            } else if (savedUserId === 'admin') {
              const defaultAdminUser: AppUser = {
                id: 'admin',
                username: 'pqhacker@gamil.com',
                email: 'pqhacker@gamil.com',
                displayName: 'Quản trị viên Hệ thống',
                role: 'admin',
                active: true,
                createdAt: new Date().toISOString()
              };
              setUser(defaultAdminUser);
              localStorage.setItem(SESSION_USER_KEY, JSON.stringify(defaultAdminUser));
              setIsUnauthorized(false);
            } else {
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(SESSION_USER_KEY);
              setUser(null);
            }
          }
        }
      } catch (err) {
        // Silent catch
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const activeUserId = user?.id || user?.username || null;
    StorageEngine.setCurrentUserId(activeUserId);
  }, [user]);

  const login = async (usernameInput: string, passwordInput: string) => {
    const authenticatedUser = await userService.authenticateUser(usernameInput, passwordInput);
    setUser(authenticatedUser);
    setIsUnauthorized(false);
    if (authenticatedUser.id) {
      localStorage.setItem(SESSION_KEY, authenticatedUser.id);
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(authenticatedUser));
    }
  };

  const logout = async () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
    setIsUnauthorized(false);
    setLoading(false);
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    if (!user || !user.id) throw new Error('Chưa đăng nhập tài khoản.');
    await userService.changePassword(user.id, oldPassword, newPassword);
    setUser({ ...user, password: newPassword });
  };

  const updateProfile = async (updates: { username?: string; displayName?: string; password?: string }) => {
    if (!user || !user.id) throw new Error('Chưa đăng nhập tài khoản.');
    const updatedUser = await userService.updateUserProfile(user.id, updates);
    setUser(updatedUser);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(updatedUser));
  };

  const refetchUser = async () => {
    if (user && user.id) {
      const updated = await userService.getUserById(user.id);
      if (updated) {
        setUser(updated);
        setIsUnauthorized(!updated.active);
      }
    }
  };

  const role = user?.active ? user.role : null;
  const isAdmin = role === 'admin';
  const isUser = role === 'user';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser: user ? { uid: user.id || 'admin', email: user.email, displayName: user.displayName } : null,
        user,
        role,
        loading,
        isUnauthorized,
        login,
        logout,
        changePassword,
        updateProfile,
        isAdmin,
        isUser,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

