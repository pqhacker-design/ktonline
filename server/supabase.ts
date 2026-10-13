import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export interface ServerSupabaseConfig {
  url: string;
  anonKey: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'supabase-config.json');

let serverSupabaseClient: SupabaseClient | null = null;
let currentConfigString = '';

export function getServerSupabaseConfig(): ServerSupabaseConfig {
  let url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  let anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        url = parsed.url.trim();
        anonKey = parsed.anonKey.trim();
      }
    }
  } catch {}

  return { url, anonKey };
}

export function saveServerSupabaseConfig(config: ServerSupabaseConfig): void {
  try {
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    process.env.SUPABASE_URL = config.url;
    process.env.SUPABASE_ANON_KEY = config.anonKey;
    serverSupabaseClient = null;
    currentConfigString = '';
  } catch (err) {
    console.error('Lỗi lưu cấu hình Supabase phía server:', err);
  }
}

export function getServerSupabaseClient(): SupabaseClient | null {
  const config = getServerSupabaseConfig();
  if (!config.url || !config.anonKey || !config.url.startsWith('http')) {
    return null;
  }

  const keyString = `${config.url}_${config.anonKey}`;
  if (serverSupabaseClient && currentConfigString === keyString) {
    return serverSupabaseClient;
  }

  try {
    serverSupabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    currentConfigString = keyString;
    return serverSupabaseClient;
  } catch (err) {
    console.error('Lỗi khởi tạo Supabase Client phía server:', err);
    return null;
  }
}
