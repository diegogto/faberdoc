import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Al verificar con éxito el OTP (recovery), el usuario inicia sesión.
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth Confirm Verify OTP Error:", error.message);
    }
  }

  // Redirigir a login con un código de error si falla
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}

