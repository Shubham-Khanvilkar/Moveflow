import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(configService: ConfigService): boolean {
  const url = configService.get<string>('SUPABASE_URL');
  const serviceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(url && serviceRoleKey);
}

/**
 * Returns the Supabase admin client, or null when Supabase env vars are absent.
 * When null, the auth service falls back to local bcrypt + JWT authentication.
 */
export function getSupabaseClientOptional(configService: ConfigService): SupabaseClient | null {
  if (!isSupabaseConfigured(configService)) return null;
  return getSupabaseClient(configService);
}

export function getSupabaseClient(configService: ConfigService): SupabaseClient {
  if (!supabaseInstance) {
    const url = configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    supabaseInstance = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseInstance;
}

export function getSupabaseAnonClient(configService: ConfigService): SupabaseClient {
  const url = configService.get<string>('SUPABASE_URL');
  const anonKey = configService.get<string>('SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  return createClient(url, anonKey);
}
