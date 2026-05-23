import { FolderKanban } from "lucide-react";
import ResetPasswordFormClient from "./reset-password-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ResetPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error } = await searchParams;

  // Verificar que el usuario tenga una sesión activa (establecida por el callback de autenticación)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=session-expired");
  }

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
              Establecer Nueva Contraseña
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ingresa una nueva contraseña segura para tu cuenta
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            {error === "password-mismatch"
              ? "Las contraseñas ingresadas no coinciden."
              : "Error al actualizar la contraseña. Inténtalo de nuevo."}
          </div>
        )}

        {/* Reset Password Form */}
        <ResetPasswordFormClient />
      </div>
    </div>
  );
}
