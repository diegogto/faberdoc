"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  User as UserIcon,
  Building,
  Key,
  Trash2,
  UserPlus,
  Shield,
  Check,
  X,
  Loader2,
  Mail,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateProfileAction,
  updatePasswordAction,
  changeUserRoleAction,
  removeUserFromOrgAction,
  inviteUserAction,
  handleJoinRequestAction,
  updateOrganizationAction,
} from "./actions";

interface SettingsClientProps {
  currentUser: {
    id: string;
    organization_id: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    is_admin: boolean;
  };
  organization: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
  orgUsers: Array<{
    id: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    is_admin: boolean;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    status: string;
  }>;
  joinRequests: Array<{
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    users: {
      full_name: string;
      email: string;
    } | null;
  }>;
}

export function SettingsClient({
  currentUser,
  organization,
  orgUsers,
  invitations,
  joinRequests,
}: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTabParam = searchParams.get("tab") === "org" ? "org" : "profile";

  const [activeTab, setActiveTab] = useState<"profile" | "org">(activeTabParam);
  const [showInviteForm, setShowInviteForm] = useState(false);
  // Confirmation dialog for removing org members
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<{ userId: string; userName: string } | null>(null);
  
  // Sincronizar estado local con query params
  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

  const [globalNotification, setGlobalNotification] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const message = searchParams.get("message");

    if (success === "request_approved") {
      setGlobalNotification({ type: "success", text: "Solicitud de acceso aprobada correctamente." });
      setActiveTab("org");
    } else if (success === "request_rejected") {
      setGlobalNotification({ type: "success", text: "Solicitud de acceso rechazada." });
      setActiveTab("org");
    } else if (error === "unauthorized_admin") {
      setGlobalNotification({ type: "error", text: "No autorizado. Debes ser administrador de la organización." });
    } else if (error === "request_not_found") {
      setGlobalNotification({ type: "error", text: "La solicitud de acceso no fue encontrada." });
    } else if (error === "update_failed") {
      setGlobalNotification({ type: "error", text: "No se pudo actualizar el perfil del usuario. Inténtalo de nuevo." });
    } else if (message === "request_already_processed") {
      const statusStr = searchParams.get("status") === "APPROVED" ? "aprobada" : "rechazada";
      setGlobalNotification({ type: "info", text: `Esta solicitud ya fue procesada anteriormente y se encuentra ${statusStr}.` });
      setActiveTab("org");
    }

    if (success || error || message) {
      const params = new URLSearchParams(window.location.search);
      params.delete("success");
      params.delete("error");
      params.delete("message");
      params.delete("status");
      params.delete("detail");
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab: "profile" | "org") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/settings?${params.toString()}`);
  };

  // Transiciones y notificaciones para Perfil
  const [profilePending, startProfileTransition] = useTransition();
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdateProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMessage(null);
    const formData = new FormData(e.currentTarget);

    startProfileTransition(async () => {
      const res = await updateProfileAction(formData);
      if (res.success) {
        setProfileMessage({
          type: "success",
          text: "Perfil actualizado exitosamente.",
        });
        router.refresh();
      } else {
        setProfileMessage({
          type: "error",
          text: res.error || "Ocurrió un error al actualizar el perfil.",
        });
      }
    });
  };

  // Contraseña
  const [passwordPending, startPasswordTransition] = useTransition();
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleUpdatePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm_password") as string;

    if (password !== confirm) {
      setPasswordMessage({
        type: "error",
        text: "Las contraseñas no coinciden.",
      });
      return;
    }

    startPasswordTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res.success) {
        setPasswordMessage({
          type: "success",
          text: "Contraseña actualizada exitosamente.",
        });
        e.currentTarget.reset();
      } else {
        setPasswordMessage({
          type: "error",
          text: res.error || "Error al actualizar la contraseña.",
        });
      }
    });
  };

  // Gestión de Organización (Admins)
  const [orgPending, startOrgTransition] = useTransition();
  const [orgMessage, setOrgMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Configuración de Organización (Admins) — inputs controlados
  const [orgName, setOrgName] = useState(organization.name);
  const [orgLogoUrl, setOrgLogoUrl] = useState(organization.logo_url || "");
  const [orgUpdatePending, startOrgUpdateTransition] = useTransition();
  const [orgUpdateMessage, setOrgUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Sincronizar estado controlado cuando el prop cambia tras router.refresh()
  useEffect(() => {
    setOrgName(organization.name);
    setOrgLogoUrl(organization.logo_url || "");
  }, [organization.name, organization.logo_url]);

  const handleUpdateOrganization = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOrgUpdateMessage(null);
    const formData = new FormData(e.currentTarget);

    startOrgUpdateTransition(async () => {
      const res = await updateOrganizationAction(formData);
      if (res.success) {
        setOrgUpdateMessage({
          type: "success",
          text: "Configuración de la organización actualizada.",
        });
        router.refresh();
      } else {
        setOrgUpdateMessage({
          type: "error",
          text: res.error || "Error al actualizar la organización.",
        });
      }
    });
  };

  // Invitación
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setOrgMessage(null);

    startOrgTransition(async () => {
      const res = await inviteUserAction(inviteEmail, inviteIsAdmin);
      if (res.success) {
        setOrgMessage({
          type: "success",
          text: `Invitación enviada con éxito a ${inviteEmail}.`,
        });
        setInviteEmail("");
        setInviteIsAdmin(false);
        router.refresh();
      } else {
        setOrgMessage({
          type: "error",
          text: res.error || "Ocurrió un error al enviar la invitación.",
        });
      }
    });
  };

  // Cambiar rol de usuario
  const handleChangeRole = (userId: string, currentIsAdmin: boolean) => {
    setOrgMessage(null);
    startOrgTransition(async () => {
      const res = await changeUserRoleAction(userId, !currentIsAdmin);
      if (res.success) {
        setOrgMessage({
          type: "success",
          text: "Rol actualizado exitosamente.",
        });
        router.refresh();
      } else {
        setOrgMessage({
          type: "error",
          text: res.error || "Ocurrió un error al actualizar el rol.",
        });
      }
    });
  };

  // Remover usuario — solicita confirmación via Dialog
  const requestRemoveUser = (userId: string, userName: string) => {
    setRemoveConfirmTarget({ userId, userName });
  };

  const confirmRemoveUser = () => {
    if (!removeConfirmTarget) return;
    const { userId, userName } = removeConfirmTarget;
    setRemoveConfirmTarget(null);
    setOrgMessage(null);
    startOrgTransition(async () => {
      const res = await removeUserFromOrgAction(userId);
      if (res.success) {
        setOrgMessage({
          type: "success",
          text: `${userName} ha sido removido de la organización.`,
        });
        router.refresh();
      } else {
        setOrgMessage({
          type: "error",
          text: res.error || "Ocurrió un error al remover al usuario.",
        });
      }
    });
  };

  // Aceptar/Rechazar solicitudes de acceso
  const handleRequest = (requestId: string, approve: boolean, userName: string) => {
    setOrgMessage(null);
    startOrgTransition(async () => {
      const res = await handleJoinRequestAction(requestId, approve);
      if (res.success) {
        setOrgMessage({
          type: "success",
          text: `Solicitud de ${userName} ${
            approve ? "aprobada" : "rechazada"
          } exitosamente.`,
        });
        router.refresh();
      } else {
        setOrgMessage({
          type: "error",
          text: res.error || "Ocurrió un error al procesar la solicitud.",
        });
      }
    });
  };

  const getUserInitials = (fullName: string): string => {
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra tu perfil personal y la configuración de tu organización.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => handleTabChange("profile")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserIcon className="h-4 w-4" />
          Mi Perfil
        </button>
        <button
          onClick={() => handleTabChange("org")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "org"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          Mi Organización
        </button>
      </div>

      {/* Global query param notification banner */}
      {globalNotification && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
          globalNotification.type === "success"
            ? "bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30"
            : globalNotification.type === "error"
            ? "bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30"
            : "bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30"
        }`}>
          <div className="flex-1">
            <span className="font-semibold">
              {globalNotification.type === "success" ? "Operación exitosa: " : globalNotification.type === "error" ? "Error: " : "Información: "}
            </span>
            {globalNotification.text}
          </div>
          <button
            onClick={() => setGlobalNotification(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TABS CONTENT */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Información de Cuenta */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {getUserInitials(currentUser.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                {currentUser.full_name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{currentUser.email}</p>
              <div className="flex justify-center gap-1.5 mt-3">
                <Badge variant={currentUser.is_admin ? "default" : "secondary"}>
                  {currentUser.is_admin ? "Administrador" : "Colaborador"}
                </Badge>
                <Badge variant="outline">{organization.name}</Badge>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formularios de Edición */}
          <div className="lg:col-span-2 space-y-8">
            {/* Formulario Perfil */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Datos Personales</h3>
                <p className="text-xs text-muted-foreground">
                  Modifica tu nombre completo de visualización.
                </p>
              </div>

              {profileMessage && (
                <div
                  className={`rounded-lg border p-3 text-sm text-center font-medium ${
                    profileMessage.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="full_name" className="text-sm font-medium">
                    Nombre completo
                  </label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    defaultValue={currentUser.full_name}
                    key={currentUser.full_name}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profilePending}>
                    {profilePending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            </div>

            {/* Formulario Contraseña */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Contraseña</h3>
                <p className="text-xs text-muted-foreground">
                  Actualiza tu contraseña para mantener tu cuenta segura.
                </p>
              </div>

              {passwordMessage && (
                <div
                  className={`rounded-lg border p-3 text-sm text-center font-medium ${
                    passwordMessage.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {passwordMessage.text}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Nueva contraseña
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="confirm_password"
                      className="text-sm font-medium"
                    >
                      Confirmar nueva contraseña
                    </label>
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordPending}>
                    {passwordPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cambiar Contraseña
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "org" && (
        <div className="space-y-8">
          {/* Section 1: Información General de la Organización */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 font-sans">
                <Building className="h-5 w-5 text-primary shrink-0" />
                Información General de la Organización
              </h3>
              <p className="text-xs text-muted-foreground">
                Datos principales y logotipo identificador de la organización.
              </p>
            </div>

            {orgUpdateMessage && (
              <div
                className={`rounded-lg border p-3 text-sm text-center font-medium ${
                  orgUpdateMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {orgUpdateMessage.text}
              </div>
            )}

            {currentUser.is_admin ? (
              <form onSubmit={handleUpdateOrganization} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="org_name" className="text-xs font-semibold text-muted-foreground">
                      Nombre de la Organización
                    </label>
                    <Input
                      id="org_name"
                      name="name"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ej. Mi Empresa S.A."
                      className="bg-white dark:bg-zinc-950 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="org_logo_url" className="text-xs font-semibold text-muted-foreground">
                      URL del Logotipo (HTTPS)
                    </label>
                    <Input
                      id="org_logo_url"
                      name="logo_url"
                      type="url"
                      value={orgLogoUrl}
                      onChange={(e) => setOrgLogoUrl(e.target.value)}
                      placeholder="https://ejemplo.com/logo.png"
                      className="bg-white dark:bg-zinc-950 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div>
                    {organization.logo_url && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">Vista previa:</span>
                        <img
                          src={organization.logo_url}
                          alt="Logo org"
                          className="h-8 max-w-[120px] object-contain border rounded p-1 bg-white"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={orgUpdatePending}
                    className="text-xs px-6 cursor-pointer"
                  >
                    {orgUpdatePending && (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Nombre</span>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{organization.name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Logotipo</span>
                  <div className="mt-1">
                    {organization.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="h-8 max-w-[150px] object-contain border rounded p-1 bg-white"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin logotipo cargado</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {orgMessage && (
            <div
              className={`rounded-lg border p-3 text-sm text-center font-medium ${
                orgMessage.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {orgMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Columna de Miembros (Toma 2 slots) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Miembros de la Organización
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Colaboradores que tienen acceso a los proyectos de la organización.
                    </p>
                  </div>
                  
                  {/* Collapsible Invitar Form Button */}
                  {currentUser.is_admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      className="text-xs gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {showInviteForm ? "Ocultar Formulario" : "Invitar Miembro"}
                    </Button>
                  )}
                </div>

                {/* Collapsible Invite Form Box */}
                {currentUser.is_admin && showInviteForm && (
                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-border space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invitar Nuevo Miembro</h4>
                    <form onSubmit={handleInviteUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label htmlFor="invite_email" className="text-xs font-semibold text-muted-foreground">
                          Email corporativo
                        </label>
                        <Input
                          id="invite_email"
                          type="email"
                          required
                          placeholder="colaborador@empresa.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="bg-white dark:bg-zinc-950 text-xs h-9"
                        />
                      </div>

                      <div className="flex items-center gap-3 h-9">
                        <div className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-zinc-950 rounded-lg border border-border flex-1 h-full">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-foreground">
                              Rol Administrador
                            </span>
                            <span className="text-[8px] text-muted-foreground">
                              Gestión de miembros y org
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={inviteIsAdmin}
                            onChange={(e) => setInviteIsAdmin(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="h-full text-xs font-semibold cursor-pointer px-4 shrink-0"
                          disabled={orgPending || !inviteEmail}
                        >
                          {orgPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Enviar"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Modern Table Layout for Members */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border text-muted-foreground font-semibold">
                        <th className="p-4">Colaborador</th>
                        <th className="p-4 w-32">Rol</th>
                        <th className="p-4 w-40 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orgUsers.map((member) => (
                        <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-lg shrink-0">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold rounded-lg">
                                  {getUserInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-sm">
                                    {member.full_name}
                                  </span>
                                  {member.id === currentUser.id && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200">
                                      Tú
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground block truncate">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={member.is_admin ? "default" : "secondary"}
                              className="text-[10px] font-semibold"
                            >
                              {member.is_admin ? "Administrador" : "Colaborador"}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            {/* Acciones de Admin */}
                            {currentUser.is_admin && member.id !== currentUser.id ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] font-medium cursor-pointer px-2"
                                  onClick={() =>
                                    handleChangeRole(member.id, member.is_admin)
                                  }
                                  disabled={orgPending}
                                  title={member.is_admin ? "Quitar rol administrador" : "Otorgar rol administrador"}
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  {member.is_admin ? "Hacer Colaborador" : "Hacer Admin"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                  onClick={() =>
                                    requestRemoveUser(member.id, member.full_name)
                                  }
                                  disabled={orgPending}
                                  title={`Remover a ${member.full_name} de la organización`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-zinc-400 text-[10px] italic">Sin acciones</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Columna de Admin: Invitaciones e Ingresos */}
            <div className="lg:col-span-1 space-y-6">
              {/* Solicitudes de Acceso (Solo Admins) */}
              {currentUser.is_admin && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2 font-sans">
                      <UserCheck className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
                      Solicitudes de Acceso
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Usuarios de tu mismo dominio que desean ingresar.
                    </p>
                  </div>

                  {joinRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/10">
                      No hay solicitudes pendientes.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 border border-border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col gap-2"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-foreground truncate">
                              {req.users?.full_name ?? "Usuario"}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {req.users?.email ?? ""}
                            </span>
                          </div>
                          <div className="flex gap-1.5 justify-end pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                              onClick={() =>
                                handleRequest(
                                  req.id,
                                  false,
                                  req.users?.full_name ?? "Usuario"
                                )
                              }
                              disabled={orgPending}
                            >
                              <X className="h-3 w-3 mr-1" /> Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-[10px] px-2 cursor-pointer"
                              onClick={() =>
                                handleRequest(
                                  req.id,
                                  true,
                                  req.users?.full_name ?? "Usuario"
                                )
                              }
                              disabled={orgPending}
                            >
                              <Check className="h-3 w-3 mr-1" /> Aprobar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Invitaciones Pendientes (Solo Admins) */}
              {currentUser.is_admin && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2 font-sans">
                      <Mail className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
                      Invitaciones Pendientes
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Correos con invitaciones enviadas y pendientes.
                    </p>
                  </div>

                  {invitations.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg bg-zinc-50/50 dark:bg-zinc-900/10">
                      No hay invitaciones pendientes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {invitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-zinc-50/30 dark:bg-zinc-900/5 gap-2"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {invite.email}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {invite.is_admin ? "Administrador" : "Colaborador"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-white dark:bg-zinc-950 shrink-0">
                            Pendiente
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ─── Confirm remove org member ───────────────────────────────────────── */}
      <Dialog open={!!removeConfirmTarget} onOpenChange={(open) => { if (!open) setRemoveConfirmTarget(null); }}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Remover miembro de la organización
            </DialogTitle>
            <DialogDescription className="pt-1">
              ¿Estás seguro de que deseas eliminar a{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {removeConfirmTarget?.userName}
              </span>{" "}
              de la organización? Se le retirará de todos los proyectos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setRemoveConfirmTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={confirmRemoveUser}
              disabled={orgPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
