import { FolderKanban } from "lucide-react";
import { loginAction } from "./actions";
import Link from "next/link";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground animate-fade-in">
              Faberdoc
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Control Documental
            </p>
          </div>
        </div>

        {/* Error/Success notifications */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            {error === "credentials" && "Credenciales inválidas. Inténtalo de nuevo."}
            {error === "session-expired" && "La sesión de restauración ha expirado o es inválida."}
            {error === "auth-code-error" && "El enlace de autenticación no es válido o ha expirado."}
            {error !== "credentials" && error !== "session-expired" && error !== "auth-code-error" && "Ha ocurrido un error. Inténtalo de nuevo."}
          </div>
        )}

        {success === "password-reset" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 text-center font-medium">
            Contraseña restablecida con éxito. Inicia sesión con tus nuevas credenciales.
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email corporativo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="correo@empresa.com"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline transition-all"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all"
            />
          </div>

          <button
            formAction={loginAction}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 cursor-pointer"
          >
            Iniciar sesión
          </button>
        </form>

        {/* Navigation link to Register */}
        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline transition-all"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
