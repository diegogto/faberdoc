"use client";

import { useState, useTransition } from "react";
import { LogOut, AlertTriangle, ChevronRight, Check, Loader2, Hourglass } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import {
  completeOnboardingAction,
  joinExistingOrgAction,
  acceptInvitationAction,
  cancelJoinRequestAction,
} from "./actions";
import { logoutAction } from "@/app/(auth)/login/actions";

interface OnboardingClientProps {
  userEmail: string;
  corporateDomain: string | null;
  existingOrg: { id: string; name: string } | null;
  members: string[];
  pendingInvitation?: {
    id: string;
    organization_id: string;
    organization_name: string;
  } | null;
  pendingJoinRequest?: {
    id: string;
    organization_name: string;
  } | null;
}

export function OnboardingClient({
  userEmail,
  corporateDomain,
  existingOrg,
  members,
  pendingInvitation = null,
  pendingJoinRequest = null,
}: OnboardingClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const handleLogout = () => {
    setError(null);
    setSuccessMsg(null);
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await completeOnboardingAction(null, formData);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  // Solicitar ingresar a organización detectada
  const handleRequestJoin = (orgId: string) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await joinExistingOrgAction(orgId);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg("¡Solicitud enviada! Tu solicitud de acceso está en espera de aprobación por un administrador.");
        window.location.reload(); // Recargar la página para cargar la vista de solicitud pendiente
      }
    });
  };

  // Aceptar invitación recibida
  const handleAcceptInvite = (invitationId: string) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await acceptInvitationAction(invitationId);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  // Cancelar solicitud pendiente
  const handleCancelRequest = (requestId: string) => {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await cancelJoinRequestAction(requestId);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg("Solicitud cancelada correctamente.");
        window.location.reload(); // Recargar para volver a la pantalla inicial de onboarding
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground antialiased">
      <div className="w-full max-w-sm space-y-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-20 w-auto" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground mt-1">
              Configuración del Espacio
            </p>
          </div>
        </div>

        {/* Card Contenedora */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-md text-card-foreground">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive text-center">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 text-center">
              {successMsg}
            </div>
          )}

          {/* CASO 1: INVITACIÓN PENDIENTE */}
          {pendingInvitation ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Check className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Tienes una invitación pendiente
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fuiste invitado a unirte como miembro de:
                </p>
                <div className="mt-3 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-bold text-foreground text-center">
                  {pendingInvitation.organization_name}
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={() => handleAcceptInvite(pendingInvitation.id)}
                  disabled={isPending}
                  className="group flex w-full h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Aceptar Invitación y Unirse
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut || isPending}
                  className="flex w-full h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                </button>

                <div className="text-center">
                  <a
                    href="/onboarding?bypass=true"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline hover:no-underline"
                  >
                    Ignorar invitación y crear otra organización
                  </a>
                </div>
              </div>
            </div>
          ) : /* CASO 2: SOLICITUD DE ACCESO PENDIENTE */
          pendingJoinRequest ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Hourglass className="h-5 w-5 animate-pulse" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Solicitud en espera de aprobación
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tu solicitud para ingresar a la siguiente organización está pendiente de revisión por el administrador:
                </p>
                <div className="mt-3 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-semibold text-foreground text-center">
                  {pendingJoinRequest.organization_name}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Te notificaremos cuando seas aprobado. Mientras tanto, no puedes acceder al dashboard.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  onClick={() => handleCancelRequest(pendingJoinRequest.id)}
                  disabled={isPending}
                  className="flex w-full h-10 items-center justify-center gap-2 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive bg-background text-sm font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cancelar Solicitud"
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut || isPending}
                  className="flex w-full h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background text-sm font-medium text-foreground hover:bg-accent transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
                </button>
              </div>
            </div>
          ) : /* CASO 3: DUPLICADO DE DOMINIO ENCONTRADO */
          existingOrg ? (
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
                <div className="mt-3 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm font-bold text-foreground text-center">
                  {existingOrg.name}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Miembros actuales:
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
                    No se encontraron miembros activos.
                  </div>
                )}
              </div>

              <div className="pt-1 space-y-3">
                <button
                  onClick={() => handleRequestJoin(existingOrg.id)}
                  disabled={isPending}
                  className="group flex w-full h-10 items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Solicitar Acceso a la Organización
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

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
            /* CASO 4: FORMULARIO ESTÁNDAR */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Crea tu espacio de trabajo
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ingresa el nombre de tu empresa para empezar a controlar tus proyectos de ingeniería.
                </p>
              </div>

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
                    <Loader2 className="h-4 w-4 animate-spin" />
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
