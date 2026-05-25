import { NextResponse } from "next/server";
import { createClient, getRequestOrigin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const origin = await getRequestOrigin();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Callback Exchange Error:", error.message);
    }
  }

  // Redirigir a login con un código de error si falla
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}

