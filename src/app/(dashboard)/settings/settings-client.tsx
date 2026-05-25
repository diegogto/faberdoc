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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  
  // Sincronizar estado local con query params
  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

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

  // Configuración de Organización (Admins)
  const [orgUpdatePending, startOrgUpdateTransition] = useTransition();
  const [orgUpdateMessage, setOrgUpdateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  // Remover usuario
  const handleRemoveUser = (userId: string, userName: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar a ${userName} de la organización? Se le retirará de todos los proyectos.`
      )
    ) {
      return;
    }
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
          {/* Detalle Organización */}
          <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  {organization.name}
                </h3>
              </div>
            </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna de Miembros (Toma 2 slots) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-bold text-lg text-foreground">
                    Miembros de la Organización
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Colaboradores que tienen acceso a los proyectos de la organización.
                  </p>
                </div>

                <div className="divide-y divide-border">
                  {orgUsers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-6 gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                            {getUserInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {member.full_name}
                            </span>
                            {member.id === currentUser.id && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                Tú
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground block">
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={member.is_admin ? "default" : "secondary"}
                        >
                          {member.is_admin ? "Administrador" : "Colaborador"}
                        </Badge>

                        {/* Acciones de Admin */}
                        {currentUser.is_admin && member.id !== currentUser.id && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-semibold cursor-pointer"
                              onClick={() =>
                                handleChangeRole(member.id, member.is_admin)
                              }
                              disabled={orgPending}
                            >
                              <Shield className="h-3.5 w-3.5 mr-1" />
                              {member.is_admin ? "Quitar Admin" : "Hacer Admin"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() =>
                                handleRemoveUser(member.id, member.full_name)
                              }
                              disabled={orgPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna de Admin: Invitaciones e Ingresos */}
            <div className="lg:col-span-1 space-y-6">
              {/* Configuración de la Organización (Solo Admins) */}
              {currentUser.is_admin && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Configuración de la Organización
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Actualiza el nombre y el logotipo de tu organización.
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

                  <form onSubmit={handleUpdateOrganization} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="org_name" className="text-xs font-medium">
                        Nombre de la Organización
                      </label>
                      <Input
                        id="org_name"
                        name="name"
                        required
                        defaultValue={organization.name}
                        placeholder="Ej. Mi Empresa S.A."
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="org_logo_url" className="text-xs font-medium">
                        URL del Logotipo (HTTPS)
                      </label>
                      <Input
                        id="org_logo_url"
                        name="logo_url"
                        type="url"
                        defaultValue={organization.logo_url || ""}
                        placeholder="https://ejemplo.com/logo.png"
                      />
                      {organization.logo_url && (
                        <div className="mt-2 flex items-center gap-2">
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
                      className="w-full text-xs font-semibold"
                      disabled={orgUpdatePending}
                    >
                      {orgUpdatePending && (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      )}
                      Guardar Cambios
                    </Button>
                  </form>
                </div>
              )}

              {/* Formulario Invitar Usuario */}
              {currentUser.is_admin && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Invitar Nuevo Miembro
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Envía una invitación por correo a tu dominio.
                    </p>
                  </div>

                  <form onSubmit={handleInviteUser} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="invite_email" className="text-xs font-medium">
                        Email del colaborador
                      </label>
                      <Input
                        id="invite_email"
                        type="email"
                        required
                        placeholder="ejemplo@empresa.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 p-2 bg-accent/20 rounded-lg border border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">
                          Otorgar rol de Administrador
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Podrá invitar y gestionar miembros
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={inviteIsAdmin}
                        onChange={(e) => setInviteIsAdmin(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full text-xs font-semibold"
                      disabled={orgPending || !inviteEmail}
                    >
                      {orgPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-3.5 w-3.5" />
                      )}
                      Enviar Invitación
                    </Button>
                  </form>
                </div>
              )}

              {/* Solicitudes de Acceso (Solo Admins) */}
              {currentUser.is_admin && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Solicitudes de Acceso
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Usuarios con tu dominio que desean entrar.
                    </p>
                  </div>

                  {joinRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg bg-accent/10">
                      No hay solicitudes pendientes.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 border border-border rounded-lg bg-accent/10 flex flex-col gap-2"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground">
                              {req.users?.full_name ?? "Usuario"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {req.users?.email ?? ""}
                            </span>
                          </div>
                          <div className="flex gap-1.5 justify-end">
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
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Invitaciones Pendientes
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invitaciones enviadas que aún no han sido aceptadas.
                    </p>
                  </div>

                  {invitations.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg bg-accent/10">
                      No hay invitaciones pendientes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {invitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/5 gap-2"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {invite.email}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {invite.is_admin ? "Admin" : "Colaborador"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
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
  );
}
