import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize only if valid URL is provided to prevent module crash
export const supabase = (supabaseUrl && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseKey)
  : (null as any);
