import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        // Si estamos detrás de un proxy/VPS, usar el host original
        const protocol = request.headers.get("x-forwarded-proto") ?? "https";
        return NextResponse.redirect(`${protocol}://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      console.error("Callback Exchange Error:", error.message);
    }
  }

  // Redirigir a login con un código de error si falla
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}
