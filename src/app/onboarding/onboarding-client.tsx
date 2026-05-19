"use client";

import { useState, useTransition } from "react";
import { FolderKanban, LogOut, AlertTriangle, ChevronRight } from "lucide-react";
import { completeOnboardingAction, logoutAction } from "./actions";

interface OnboardingClientProps {
  userEmail: string;
  corporateDomain: string | null;
  existingOrg: { id: string; name: string } | null;
  members: string[];
}

export function OnboardingClient({
  userEmail,
  corporateDomain,
  existingOrg,
  members,
}: OnboardingClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const handleLogout = () => {
    setError(null);
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await completeOnboardingAction(null, formData);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground antialiased">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Brand Header (Totalmente consistente con Login/Register) */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Faberdoc
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configuración del Espacio
            </p>
          </div>
        </div>

        {/* Card Contenedora (Consistente con los estilos de shadcn y login) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-md text-card-foreground">
          {existingOrg ? (
            /* ================= PANTALLA A: DETECTADO DOMINIO DUPLICADO ================= */
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  ¡Tu empresa ya está en Faberdoc!
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Detectamos que tu dominio{" "}
                  <strong className="font-semibold text-foreground">
                    @{corporateDomain}
                  </strong>{" "}
                  está asociado a la organización ya registrada:
                </p>
                <div className="mt-3 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-medium text-foreground text-center">
                  {existingOrg.name}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Para unirte, solicita acceso a uno de los miembros:
                </p>
                {members.length > 0 ? (
                  <div className="divide-y divide-border rounded-lg border border-border bg-background overflow-hidden">
                    {members.map((member, index) => (
                      <div key={index} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                          {member.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-foreground font-medium">{member}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-3 text-center text-xs text-muted-foreground">
                    No se encontraron miembros activos. Contacta a soporte.
                  </div>
                )}
              </div>

              <div className="pt-1 space-y-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut || isPending}
                  className="flex w-full h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión / Volver"}
                </button>

                <div className="text-center">
                  <a
                    href="/onboarding?bypass=true"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline hover:no-underline"
                  >
                    No, necesito crear una organización separada
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* ================= PANTALLA B: CREACIÓN FORMULARIO ESTÁNDAR ================= */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Crea tu espacio de trabajo
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ingresa el nombre de tu empresa para empezar a controlar tus proyectos de ingeniería.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-foreground"
                >
                  Nombre de la Organización
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="ej: Constructora Faber S.A."
                  disabled={isPending}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all disabled:pointer-events-none disabled:opacity-50"
                />
              </div>

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={isPending || isLoggingOut}
                  className="group flex w-full h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    "Configurando..."
                  ) : (
                    <>
                      Completar Configuración
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <span>Conectado como <strong className="text-foreground font-medium">{userEmail}</strong></span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut || isPending}
                    className="text-muted-foreground hover:text-destructive underline transition-colors cursor-pointer"
                  >
                    Salir
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
