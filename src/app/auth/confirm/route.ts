import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const redirectTo = new URL(next, request.url);

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Al verificar con éxito el OTP (recovery), el usuario inicia sesión.
      // Redirigir a la página siguiente.
      return NextResponse.redirect(redirectTo);
    } else {
      console.error("Auth Confirm Verify OTP Error:", error.message);
    }
  }

  // Redirigir a login con un código de error si falla
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth-code-error");
  return NextResponse.redirect(loginUrl);
}
