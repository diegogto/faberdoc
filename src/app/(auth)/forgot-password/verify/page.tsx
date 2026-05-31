import { Logo } from "@/components/ui/logo";
import { verifyOtpAction } from "../../login/actions";
import Link from "next/link";

interface VerifyPageProps {
  searchParams: Promise<{ email?: string; error?: string }>;
}

export default async function VerifyForgotPasswordPage({
  searchParams,
}: VerifyPageProps) {
  const { email, error } = await searchParams;
  const decodedEmail = email ? decodeURIComponent(email) : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-20 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Verificar Código
            </h1>
            <p className="text-sm text-muted-foreground mt-1 px-4">
              Hemos enviado un código a <br />
              <strong className="text-foreground">{decodedEmail || "tu correo"}</strong>
            </p>
          </div>
        </div>

        {/* Success/Error notifications */}
        {error === "invalid-code" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            El código ingresado es incorrecto o ha expirado.
          </div>
        )}

        {error === "invalid-fields" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            Por favor ingresa el código de 6 dígitos.
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
          Revisa tu bandeja de entrada. Puedes hacer clic directamente en el enlace del correo o ingresar el código de 6 dígitos a continuación.
        </div>

        {/* Verify OTP Form */}
        <form className="space-y-5">
          <input type="hidden" name="email" value={decodedEmail} />

          <div className="space-y-2">
            <label
              htmlFor="token"
              className="text-sm font-medium text-foreground flex justify-between"
            >
              <span>Código de 6 dígitos</span>
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              maxLength={6}
              pattern="[a-zA-Z0-9]{6}"
              placeholder="000000"
              className="flex h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-center text-xl font-mono tracking-[0.5em] placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all uppercase"
            />
          </div>

          <button
            formAction={verifyOtpAction}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 cursor-pointer"
          >
            Verificar código
          </button>
        </form>

        {/* Options to go back or change email */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No recibiste el correo o ingresaste uno incorrecto?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline transition-all"
          >
            Volver a intentarlo
          </Link>
        </p>
      </div>
    </div>
  );
}
