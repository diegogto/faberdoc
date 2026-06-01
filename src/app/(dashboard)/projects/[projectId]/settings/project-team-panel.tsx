"use client";

import { useState, useTransition } from "react";
import { assignProjectMemberAction, removeProjectMemberAction } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, ShieldCheck, Loader2, Users } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectRole = "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER";

interface ProjectMemberRow {
  user_id: string;
  role: ProjectRole;
  full_name: string;
  email: string | null;
}

interface OrgMemberRow {
  id: string;
  full_name: string;
  email: string | null;
}

interface ProjectTeamPanelProps {
  projectId: string;
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  isProjectCoordinator: boolean;
  members: ProjectMemberRow[];
  orgMembers: OrgMemberRow[];
}

// ─── Role display helpers ────────────────────────────────────────────────────

const ROLE_LABELS: Record<ProjectRole, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordinador",
  REVIEWER: "Revisor",
  OWNER_APPROVER: "Aprobador",
  VIEWER: "Observador",
};

const ROLE_BADGE_CLASSES: Record<ProjectRole, string> = {
  ADMIN:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30",
  COORDINATOR:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
  REVIEWER:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  OWNER_APPROVER:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30",
  VIEWER:
    "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800",
};

const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  ADMIN: "Control total del proyecto y su equipo",
  COORDINATOR: "Sube archivos y gestiona el estado de documentos",
  REVIEWER: "Revisa, aprueba o comenta documentos",
  OWNER_APPROVER: "Aprueba documentos como representante del cliente",
  VIEWER: "Solo puede ver y descargar",
};

const ALL_ROLES: ProjectRole[] = ["ADMIN", "COORDINATOR", "REVIEWER", "OWNER_APPROVER", "VIEWER"];

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectTeamPanel({
  projectId,
  currentUserId,
  isCurrentUserAdmin,
  isProjectCoordinator,
  members: initialMembers,
  orgMembers,
}: ProjectTeamPanelProps) {
  const [members, setMembers] = useState<ProjectMemberRow[]>(initialMembers);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("REVIEWER");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasEditRights = isCurrentUserAdmin || isProjectCoordinator;

  // Users from org not yet in the project
  const memberIds = new Set(members.map((m) => m.user_id));
  const availableToAdd = orgMembers.filter((u) => !memberIds.has(u.id));

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAddMember = () => {
    if (!selectedUserId) return;
    clearMessages();

    startTransition(async () => {
      const res = await assignProjectMemberAction(projectId, selectedUserId, selectedRole);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      // Optimistically update local state
      const addedUser = orgMembers.find((u) => u.id === selectedUserId);
      if (addedUser) {
        setMembers((prev) => [
          ...prev,
          { user_id: addedUser.id, role: selectedRole, full_name: addedUser.full_name, email: addedUser.email },
        ]);
      }
      setSuccessMsg(`${addedUser?.full_name ?? "Usuario"} agregado al proyecto.`);
      setSelectedUserId("");
    });
  };

  const handleRoleChange = (userId: string, newRole: ProjectRole) => {
    clearMessages();
    startTransition(async () => {
      const res = await assignProjectMemberAction(projectId, userId, newRole);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)));
    });
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    clearMessages();
    startTransition(async () => {
      const res = await removeProjectMemberAction(projectId, userId);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setSuccessMsg(`${userName} fue removido del proyecto.`);
    });
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

      {/* Add new member section (at the TOP, only if hasEditRights) */}
      {hasEditRights && availableToAdd.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Agregar miembro de tu organización al proyecto
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* User selector */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isPending}
              className="flex-1 h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-sm px-3 text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
            >
              <option value="">Seleccionar colaborador...</option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id} className="text-zinc-900">
                  {u.full_name} {u.email ? `(${u.email})` : ""}
                </option>
              ))}
            </select>

            {/* Role selector */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              disabled={isPending}
              className="w-full sm:w-44 h-9 rounded-md border border-input bg-white dark:bg-zinc-950 text-sm px-3 text-zinc-700 dark:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r} className="text-zinc-900">
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            {/* Add button */}
            <Button
              type="button"
              size="sm"
              onClick={handleAddMember}
              disabled={isPending || !selectedUserId}
              className="h-9 gap-1.5 shrink-0 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Agregar
            </Button>
          </div>
        </div>
      )}

      {/* No org members to add */}
      {hasEditRights && availableToAdd.length === 0 && members.length > 0 && (
        <p className="text-xs text-zinc-400 italic text-center py-2 bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-border rounded-lg">
          Todos los miembros de tu organización ya forman parte de este proyecto.
        </p>
      )}

      {/* Current members list */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pl-1 mb-2">
          Miembros del Equipo ({members.length})
        </p>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 gap-2">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">Este proyecto no tiene miembros asignados aún.</p>
          </div>
        ) : (
          members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            return (
              <div
                key={member.user_id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 transition-colors"
              >
                {/* Avatar placeholder */}
                <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                    {member.full_name?.charAt(0) ?? "?"}
                  </span>
                </div>

                {/* Name & email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {member.full_name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-zinc-400 font-normal">(tú)</span>
                    )}
                  </p>
                  {member.email && (
                    <p className="text-xs text-zinc-400 truncate">{member.email}</p>
                  )}
                </div>

                {/* Role selector (edit rights required) */}
                {hasEditRights && !isSelf ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.user_id, e.target.value as ProjectRole)}
                    disabled={isPending}
                    className="text-xs h-7 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 px-2 pr-6 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r} className="text-zinc-900">
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${ROLE_BADGE_CLASSES[member.role]}`}
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}

                {/* Remove button (edit rights required, not self) */}
                {hasEditRights && !isSelf && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    onClick={() => handleRemoveMember(member.user_id, member.full_name)}
                    disabled={isPending}
                    title={`Remover a ${member.full_name}`}
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
