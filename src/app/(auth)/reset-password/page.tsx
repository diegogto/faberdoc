import { FolderKanban } from "lucide-react";
import { resetPasswordAction } from "../login/actions";
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
            Error al actualizar la contraseña. Inténtalo de nuevo.
          </div>
        )}

        {/* Reset Password Form */}
        <form className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Nueva Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
            />
          </div>

          <button
            formAction={resetPasswordAction}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 cursor-pointer"
          >
            Actualizar Contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
