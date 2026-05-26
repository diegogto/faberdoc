import { Logo } from "@/components/ui/logo";
import RegisterFormClient from "./register-form-client";
import Link from "next/link";

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-20 w-auto" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground mt-1">
              Crea tu cuenta de control documental
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive text-center font-medium animate-shake">
            {error === "password-mismatch"
              ? "Las contraseñas ingresadas no coinciden."
              : "Error al crear la cuenta. Inténtalo de nuevo."}
          </div>
        )}

        {/* Signup Form */}
        <RegisterFormClient />

        {/* Navigation link to Login */}
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
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
