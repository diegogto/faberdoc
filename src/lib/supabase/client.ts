import { createBrowserClient } from "@supabase/ssr";

/**
 * Crea un cliente Supabase para Client Components (browser).
 * Internamente usa singleton — múltiples llamadas devuelven la misma instancia.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
