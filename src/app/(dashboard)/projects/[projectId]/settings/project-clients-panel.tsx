"use client";

import { useState, useEffect, useTransition } from "react";
import {
  connectClientAction,
  removeClientConnectionAction,
  addRecipientMemberAction,
  getRecipientOrgUsersAction,
} from "./client-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  UserPlus,
  Trash2,
  Loader2,
  Link2,
  Clock,
  Globe,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClientRow {
  organization_id: string;
  name: string;
  email_domain: string | null;
  logo_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  connection_type: "CLIENT" | "SUBCONTRACTOR";
  contact_email: string | null;
  created_at: string;
}

interface ProjectClientsPanelProps {
  projectId: string;
  clients: ClientRow[];
  isCurrentUserAdmin: boolean;
  isProjectCoordinator: boolean;
  currentUserId: string;
  currentUserOrgId: string | null;
  members: any[];
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordinador",
  REVIEWER: "Revisor",
  OWNER_APPROVER: "Aprobador",
  VIEWER: "Observador",
};

const RECIPIENT_ROLES = [
  { value: "VIEWER", label: "Observador" },
  { value: "REVIEWER", label: "Revisor" },
  { value: "OWNER_APPROVER", label: "Aprobador" },
];

export function ProjectClientsPanel({
  projectId,
  clients: initialClients,
  isCurrentUserAdmin,
  isProjectCoordinator,
  currentUserId,
  currentUserOrgId,
  members,
}: ProjectClientsPanelProps) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [emailInput, setEmailInput] = useState("");
  const [connectionType, setConnectionType] = useState<"CLIENT" | "SUBCONTRACTOR">("CLIENT");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // State for available users of each connected organization (who are not yet project members)
  const [availUsers, setAvailUsers] = useState<Record<string, { id: string; full_name: string; email: string | null }[]>>({});
  // States for adding user form under each organization
  const [selectedUsersByOrg, setSelectedUsersByOrg] = useState<Record<string, string>>({});
  const [selectedRolesByOrg, setSelectedRolesByOrg] = useState<Record<string, string>>({});

  const hasEditRights = isCurrentUserAdmin || isProjectCoordinator;

  useEffect(() => {
    // Query available users for each approved connected organization
    clients.forEach((client) => {
      if (client.status === "APPROVED") {
        getRecipientOrgUsersAction(projectId, client.organization_id).then((res) => {
          if (res.users) {
            setAvailUsers((prev) => ({
              ...prev,
              [client.organization_id]: res.users ?? [],
            }));
          }
        });
      }
    });
  }, [clients, projectId]);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleConnectClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    clearMessages();

    startTransition(async () => {
      const res = await connectClientAction(projectId, emailInput, connectionType);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(res.message || "Organización receptora vinculada exitosamente.");
      setEmailInput("");
      
      // Reload page to fetch updated database state
      window.location.reload();
    });
  };

  const handleRemoveClient = (orgId: string, orgName: string) => {
    if (!confirm(`¿Estás seguro de que deseas desconectar a la organización '${orgName}' de este proyecto? Se perderá el acceso directo a los planos.`)) {
      return;
    }
    clearMessages();

    startTransition(async () => {
      const res = await removeClientConnectionAction(projectId, orgId);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setClients((prev) => prev.filter((c) => c.organization_id !== orgId));
      setSuccessMsg(`Conexión con '${orgName}' removida.`);
    });
  };

  const handleAddRecipientMember = (orgId: string) => {
    const userId = selectedUsersByOrg[orgId];
    if (!userId) return;
    const role = selectedRolesByOrg[orgId] || "VIEWER";

    clearMessages();
    startTransition(async () => {
      const res = await addRecipientMemberAction(projectId, orgId, userId, role);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg("Usuario agregado al proyecto exitosamente.");
      setSelectedUsersByOrg((prev) => ({ ...prev, [orgId]: "" }));
      
      // Reload page to fetch updated database state
      window.location.reload();
    });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  // Group clients by connection type
  const clientOrgs = clients.filter((c) => c.connection_type === "CLIENT");
  const subcontractorOrgs = clients.filter((c) => c.connection_type === "SUBCONTRACTOR");

  // Render a connection card
  const renderConnectionCard = (client: ClientRow) => {
    const isTemp = client.email_domain && client.name.endsWith("Client");
    
    // Filter project members who belong to this organization
    const orgMembers = members.filter((m) => m.organization_id === client.organization_id);
    
    // Check if the current user can add users for this organization:
    // - Is project coordinator
    // - OR Is Org Admin of this organization (isCurrentUserAdmin && currentUserOrgId === client.organization_id)
    const canAddUser = isProjectCoordinator || (isCurrentUserAdmin && currentUserOrgId === client.organization_id);
    const availableUsers = availUsers[client.organization_id] || [];

    return (
      <div
        key={client.organization_id}
        className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-4 space-y-4 hover:shadow-xs transition-shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo or initials */}
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.name}
                className="h-8 w-8 rounded-lg object-contain bg-white border border-border p-0.5 shrink-0"
              />
            ) : (
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-lg">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Info */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {client.name}
              </p>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span>@{client.email_domain || "sin-dominio"}</span>
                {client.contact_email && (
                  <>
                    <span>•</span>
                    <span>Contacto: {client.contact_email}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Status Badges & Actions */}
          <div className="flex items-center gap-2">
            {isTemp && (
              <Badge variant="outline" className="text-[10px] bg-amber-50/50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                Ficha Temporal
              </Badge>
            )}
            
            {client.status === "PENDING" ? (
              <Badge variant="outline" className="text-[10px] bg-zinc-50 text-zinc-500 dark:bg-zinc-900/30 dark:text-zinc-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pendiente Aceptación
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Vinculado
              </Badge>
            )}

            {/* Disconnect Action */}
            {hasEditRights && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0 cursor-pointer"
                onClick={() => handleRemoveClient(client.organization_id, client.name)}
                disabled={isPending}
                title={`Desconectar a ${client.name}`}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Current members in the project belonging to this organization */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Usuarios en el Proyecto ({orgMembers.length})
          </p>
          {orgMembers.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">
              No hay usuarios de esta organización asignados a este proyecto.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {orgMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between text-xs p-2 rounded-md bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {m.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">{m.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-zinc-50 dark:bg-zinc-900 font-medium shrink-0 flex items-center gap-0.5">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {ROLE_LABELS[m.role] || m.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add user to project form (for this organization) */}
        {client.status === "APPROVED" && canAddUser && availableUsers.length > 0 && (
          <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row gap-2">
            <select
              value={selectedUsersByOrg[client.organization_id] || ""}
              onChange={(e) =>
                setSelectedUsersByOrg((prev) => ({
                  ...prev,
                  [client.organization_id]: e.target.value,
                }))
              }
              disabled={isPending}
              className="flex-1 h-8 rounded-md border border-input bg-white dark:bg-zinc-950 text-xs px-2 text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
            >
              <option value="">Seleccionar colaborador de {client.name}...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="text-zinc-900">
                  {u.full_name} {u.email ? `(${u.email})` : ""}
                </option>
              ))}
            </select>

            <select
              value={selectedRolesByOrg[client.organization_id] || "VIEWER"}
              onChange={(e) =>
                setSelectedRolesByOrg((prev) => ({
                  ...prev,
                  [client.organization_id]: e.target.value,
                }))
              }
              disabled={isPending}
              className="w-full sm:w-32 h-8 rounded-md border border-input bg-white dark:bg-zinc-950 text-xs px-2 text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
            >
              {RECIPIENT_ROLES.map((r) => (
                <option key={r.value} value={r.value} className="text-zinc-900">
                  {r.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              size="sm"
              onClick={() => handleAddRecipientMember(client.organization_id)}
              disabled={isPending || !selectedUsersByOrg[client.organization_id]}
              className="h-8 text-xs gap-1 cursor-pointer shrink-0"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Agregar
            </Button>
          </div>
        )}

        {client.status === "APPROVED" && canAddUser && availableUsers.length === 0 && (
          <p className="text-[10px] text-zinc-400 italic pt-2 text-right">
            Todos los usuarios registrados en {client.name} ya están asignados a este proyecto.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Feedback messages */}
      {errorMsg && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-md border border-green-200 dark:border-green-900/30 font-medium">
          {successMsg}
        </div>
      )}

      {/* Add Connection Form (at the TOP) */}
      {hasEditRights && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10">
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Vincular organización receptora externa (Cliente o Subcontrato)
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Ingresa el correo corporativo del contacto externo. El sistema validará su dominio corporativo y le enviará una invitación segura para vincular su organización.
            </p>
          </div>

          <form onSubmit={handleConnectClient} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="ejemplo@cliente-o-subcontrato.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isPending}
              required
              className="flex-1 text-sm bg-white dark:bg-zinc-950"
            />
            
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value as "CLIENT" | "SUBCONTRACTOR")}
              disabled={isPending}
              className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-sm px-3 text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer shrink-0"
            >
              <option value="CLIENT" className="text-zinc-900">Cliente</option>
              <option value="SUBCONTRACTOR" className="text-zinc-900">Subcontrato</option>
            </select>

            <Button
              type="submit"
              disabled={isPending || !emailInput.trim()}
              className="h-9 shrink-0 cursor-pointer gap-1.5"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Enviar Invitación
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Group 1: Clientes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
          <Building className="h-4.5 w-4.5 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Clientes Receptoras</h3>
        </div>
        <div className="space-y-3">
          {clientOrgs.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-2 pl-1">
              No hay clientes externos vinculados.
            </p>
          ) : (
            clientOrgs.map(renderConnectionCard)
          )}
        </div>
      </div>

      {/* Group 2: Subcontratos */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
          <Building className="h-4.5 w-4.5 text-zinc-500" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Subcontratos Receptores</h3>
        </div>
        <div className="space-y-3">
          {subcontractorOrgs.length === 0 ? (
            <p className="text-xs text-zinc-400 italic py-2 pl-1">
              No hay subcontratistas vinculados.
            </p>
          ) : (
            subcontractorOrgs.map(renderConnectionCard)
          )}
        </div>
      </div>
    </div>
  );
}
