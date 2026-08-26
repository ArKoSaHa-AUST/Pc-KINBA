import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : '') ||
  'https://jkooxrfapqvwmoygswjv.supabase.co';

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : '') ||
  'sb_publishable_WYWNQjk1XWmjAol57TY98A_9MGQNB7C';

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
