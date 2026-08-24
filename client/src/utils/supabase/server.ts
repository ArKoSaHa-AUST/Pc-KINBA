import { createServerClient } from "@supabase/ssr";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SUPABASE_URL : "") ||
  "https://jkooxrfapqvwmoygswjv.supabase.co";

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : "") ||
  "sb_publishable_WYWNQjk1XWmjAol57TY98A_9MGQNB7C";

export const createClient = (cookieStore?: {
  getAll: () => Array<{ name: string; value: string }>;
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
}) => {
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() || [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set?.(name, value, options)
            );
          } catch {
            // Server Component ignore
          }
        },
      },
    }
  );
};
