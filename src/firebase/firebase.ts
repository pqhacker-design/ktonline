import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, disableNetwork, setLogLevel } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

// Silence Firestore internal informational and warning logs
try {
  setLogLevel('silent');
} catch {}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || (
  config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? config.firestoreDatabaseId
    : undefined
);

export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Proactively disconnect network on load if quota was exceeded in current 24-hour cycle
if (typeof window !== 'undefined') {
  try {
    const rawQuota = localStorage.getItem('firestore_quota_exceeded_timestamp');
    if (rawQuota) {
      const ts = Number(rawQuota);
      // Free Spark plan resets daily. Disconnect network for 6h to halt backoff retry loops
      if (Date.now() - ts < 6 * 60 * 60 * 1000) {
        disableNetwork(db).catch(() => {});
      } else {
        localStorage.removeItem('firestore_quota_exceeded_timestamp');
      }
    }
  } catch {}

  const isQuotaError = (arg: any): boolean => {
    if (!arg) return false;
    const s = String(arg?.message || arg?.stack || arg?.code || arg || '');
    return (
      s.includes('resource-exhausted') ||
      s.includes('Quota limit exceeded') ||
      s.includes('Free daily write units') ||
      s.includes('Free daily read units') ||
      s.includes('Using maximum backoff delay')
    );
  };

  // Intercept console.error to mute internal Firestore SDK quota backoff loop spam
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (args.some(isQuotaError)) {
      try {
        localStorage.setItem('firestore_quota_exceeded_timestamp', Date.now().toString());
        disableNetwork(db).catch(() => {});
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: true } }));
      } catch {}
      console.warn('[Firebase] Hạn ngạch ghi Firestore miễn phí hôm nay đã đạt giới hạn. Đã ngắt kết nối mạng Firestore để chuyển sang lưu cục bộ/Supabase.');
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (args.some((a) => String(a || '').includes('Using maximum backoff delay'))) {
      try {
        disableNetwork(db).catch(() => {});
      } catch {}
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      event.preventDefault();
      try {
        localStorage.setItem('firestore_quota_exceeded_timestamp', Date.now().toString());
        disableNetwork(db).catch(() => {});
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: true } }));
      } catch {}
    }
  });

  window.addEventListener('error', (event) => {
    if (isQuotaError(event.error) || isQuotaError(event.message)) {
      event.preventDefault();
      try {
        localStorage.setItem('firestore_quota_exceeded_timestamp', Date.now().toString());
        disableNetwork(db).catch(() => {});
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: { exceeded: true } }));
      } catch {}
    }
  });
}

export default app;
