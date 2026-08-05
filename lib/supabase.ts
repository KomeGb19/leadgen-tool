import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Use in client components. Reads the public anon key only. */
export function supabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars missing — see .env.example");
  }
  browserClient = createClient(url, key);
  return browserClient;
}

/** Use in server components / route handlers only. Uses the service role key. */
export function supabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env vars missing — see .env.example");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** True once real Supabase credentials are configured — otherwise the app
 *  runs entirely on the bundled mock dataset so the UI works out of the box. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
