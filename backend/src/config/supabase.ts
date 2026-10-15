import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let supabaseAnonClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('placeholder-project') &&
    env.SUPABASE_ANON_KEY &&
    !env.SUPABASE_ANON_KEY.includes('placeholder-anon-key')
  );
}

export function getSupabaseAnonClient(): SupabaseClient | null {
  if (supabaseAnonClient) return supabaseAnonClient;
  if (!isSupabaseConfigured()) return null;

  try {
    supabaseAnonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    return supabaseAnonClient;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Supabase anon client');
    return null;
  }
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;
  if (!isSupabaseConfigured() || !env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')) {
    return null;
  }

  try {
    supabaseAdminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    logger.info('Supabase admin client initialized.');
    return supabaseAdminClient;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Supabase admin client');
    return null;
  }
}
