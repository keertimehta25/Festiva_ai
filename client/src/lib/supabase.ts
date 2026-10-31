import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isAuthConfigured = Boolean(url && anonKey);

/**
 * Browser Supabase client, used only for sign-in and the session token.
 * The anon key is public by design; all data access goes through the API, and the
 * database has Row Level Security enabled with no policies, so this key cannot read data.
 */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
