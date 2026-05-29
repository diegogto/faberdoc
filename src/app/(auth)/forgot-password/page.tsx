import { FolderKanban } from "lucide-react";
import ForgotPasswordFormClient from "./forgot-password-client";
import Link from "next/link";

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, success } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Recuperar Contraseña
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa tu correo para recibir un enlace de restauración
            </p>
          </div>
        </div>

        {/* Success/Error notifications */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            Error al solicitar la recuperación. Verifica tu correo.
          </div>
        )}

        {success === "sent" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
            Se ha enviado un enlace de recuperación a tu correo electrónico.
          </div>
        )}

        {/* Forgot Password Form */}
        {success !== "sent" && (
          <ForgotPasswordFormClient />
        )}

        {/* Back to Login link */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Recordaste tu contraseña?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline transition-all"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
