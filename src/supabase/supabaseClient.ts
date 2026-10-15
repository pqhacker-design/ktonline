import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'aitest_supabase_config_v1';

let cachedClient: SupabaseClient | null = null;
let currentConfigString = '';

/**
 * Retrieve current Supabase configuration from environment or local storage
 */
export function getSupabaseConfig(): SupabaseConfig {
  let envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  let envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey) {
          return {
            url: parsed.url.trim(),
            anonKey: parsed.anonKey.trim(),
          };
        }
      }
    } catch {}
  }

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

/**
 * Save new Supabase configuration and refresh client instance
 */
export function setSupabaseConfig(config: SupabaseConfig | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (config && config.url && config.anonKey) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
  cachedClient = null;
  currentConfigString = '';

  // Broadcast event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-changed'));
  }
}

/**
 * Tự động đồng bộ cấu hình Supabase hai chiều giữa Server API và trình duyệt
 * 1. Nếu trình duyệt hiện tại (ví dụ Google Chrome) đã có cấu hình nhưng máy chủ chưa có,
 *    tự động gửi lên máy chủ lưu vào data/supabase-config.json.
 * 2. Khi mở bằng bất kỳ trình duyệt nào khác (Edge, Firefox, Safari, tab ẩn danh, máy khác),
 *    trình duyệt đó tự động lấy cấu hình từ máy chủ về và kết nối chung Supabase database!
 */
export async function syncSupabaseConfigFromServer(): Promise<boolean> {
  try {
    const current = getSupabaseConfig();
    const hasLocalConfig = Boolean(current.url && current.anonKey && current.url.startsWith('http'));

    const res = await fetch('/api/supabase/config');
    if (!res.ok) return false;
    const data = await res.json();

    if (data && data.success) {
      if (data.isConfigured && data.url && data.anonKey) {
        // Máy chủ đã có cấu hình -> Cập nhật xuống trình duyệt nếu khác
        if (current.url !== data.url || current.anonKey !== data.anonKey) {
          setSupabaseConfig({ url: data.url, anonKey: data.anonKey });
          return true;
        }
        return true;
      } else if (hasLocalConfig) {
        // Trình duyệt có cấu hình nhưng máy chủ chưa lưu -> Đẩy cấu hình lên máy chủ
        await fetch('/api/supabase/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: current.url, anonKey: current.anonKey }),
        }).catch(() => {});
        return true;
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync] Lỗi đồng bộ cấu hình:', err);
  }
  return false;
}

// Tự động kích hoạt đồng bộ khi nạp module trên client
if (typeof window !== 'undefined') {
  syncSupabaseConfigFromServer().catch(() => {});
}

/**
 * Check if valid Supabase configuration is present
 */
export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('http'));
}

/**
 * Get active Supabase client instance or null if not configured
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.url.startsWith('http')) {
    return null;
  }

  const keyString = `${config.url}_${config.anonKey}`;
  if (cachedClient && currentConfigString === keyString) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentConfigString = keyString;
    return cachedClient;
  } catch (err) {
    console.warn('[Supabase] Lỗi khởi tạo Supabase Client:', err);
    return null;
  }
}

/**
 * Test connectivity and check if required tables exist in Supabase
 */
export async function testSupabaseConnection(overrideConfig?: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
  missingTables?: string[];
}> {
  const config = overrideConfig || getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Vui lòng nhập đầy đủ Supabase Project URL và Anon API Key.',
    };
  }

  try {
    const client = createClient(config.url, config.anonKey);
    const requiredTables = ['users', 'system_classes', 'system_students', 'published_exams', 'student_results', 'user_data'];
    const tablesFound: string[] = [];
    const missingTables: string[] = [];

    for (const table of requiredTables) {
      try {
        const { error } = await client.from(table).select('count', { count: 'exact', head: true });
        if (!error) {
          tablesFound.push(table);
        } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
          missingTables.push(table);
        } else {
          // Table exists but maybe empty or has other status
          tablesFound.push(table);
        }
      } catch {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Đã kết nối tới Supabase, nhưng chưa tìm thấy các bảng: ${missingTables.join(', ')}. Hãy chạy kịch bản SQL trong tab SQL Editor của Supabase để tạo bảng.`,
        tablesFound,
        missingTables,
      };
    }

    return {
      success: true,
      message: 'Kết nối tới Supabase thành công! Tất cả 6 bảng dữ liệu đã sẵn sàng hoạt động.',
      tablesFound,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Lỗi kết nối Supabase: ' + (err.message || String(err)),
    };
  }
}
