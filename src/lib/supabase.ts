import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qqggekqqbzpqdrlzajaj.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_EkO0jpOXLLIaKDB-jiUpEQ_--uQMLGu';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
