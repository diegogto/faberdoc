import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crea un cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Debe llamarse en cada request — NO es singleton.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component — se puede ignorar
            // porque el proxy.ts se encarga de escribir las cookies.
          }
        },
      },
    }
  );
}

/**
 * Obtiene el origen (protocolo + host) real de la solicitud,
 * considerando proxies inversos (x-forwarded-host / x-forwarded-proto).
 */
export async function getRequestOrigin() {
  const cookieStore = await cookies(); // Asegura contexto de request
  const headersList = await import("next/headers").then(m => m.headers());
  
  // En desarrollo (npm run dev), forzamos a usar el host solicitado localmente
  if (process.env.NODE_ENV === "development") {
    const host = headersList.get("host") || "localhost:3000";
    return `http://${host}`;
  }

  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }

  const origin = headersList.get("origin");
  if (origin && origin !== "null") {
    return origin;
  }

  const host = headersList.get("host");
  if (host) {
    const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }

  return "";
}

