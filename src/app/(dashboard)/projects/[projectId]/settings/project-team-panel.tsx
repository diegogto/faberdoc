"use client";

import { useState, useTransition } from "react";
import { assignProjectMemberAction, removeProjectMemberAction } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, ShieldCheck, Loader2, Users, AlertTriangle } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectRole = "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER" | "UPLOADER";

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
  UPLOADER: "Ejecutor",
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
  UPLOADER:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30",
};

const ALL_ROLES: ProjectRole[] = ["ADMIN", "COORDINATOR", "REVIEWER", "OWNER_APPROVER", "VIEWER", "UPLOADER"];

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

  // Per-row loading state: stores the userId currently being mutated
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [isAddPending, startAddTransition] = useTransition();

  // Confirmation dialog state
  const [confirmTarget, setConfirmTarget] = useState<{ userId: string; userName: string } | null>(null);

  // State to track which member's role is being edited via double click
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const hasEditRights = isCurrentUserAdmin || isProjectCoordinator;

  // Users from org not yet in the project
  const memberIds = new Set(members.map((m) => m.user_id));
  const availableToAdd = orgMembers.filter((u) => !memberIds.has(u.id));

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // ─── Add member ────────────────────────────────────────────────────────────

  const handleAddMember = () => {
    if (!selectedUserId) return;
    clearMessages();

    startAddTransition(async () => {
      const res = await assignProjectMemberAction(projectId, selectedUserId, selectedRole);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
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

  // ─── Change role ───────────────────────────────────────────────────────────

  const handleRoleChange = (userId: string, newRole: ProjectRole) => {
    clearMessages();
    setLoadingUserId(userId);

    // Using a self-invoking async immediately to avoid needing an extra useTransition per row
    (async () => {
      const res = await assignProjectMemberAction(projectId, userId, newRole);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)));
      }
      setLoadingUserId(null);
    })();
  };

  // ─── Remove member (with confirmation) ────────────────────────────────────

  const requestRemoveMember = (userId: string, userName: string) => {
    clearMessages();
    setConfirmTarget({ userId, userName });
  };

  const confirmRemoveMember = () => {
    if (!confirmTarget) return;
    const { userId, userName } = confirmTarget;
    setConfirmTarget(null);
    setLoadingUserId(userId);

    (async () => {
      const res = await removeProjectMemberAction(projectId, userId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        setSuccessMsg(`${userName} fue removido del proyecto.`);
      }
      setLoadingUserId(null);
    })();
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

      {/* Add new member section */}
      {hasEditRights && availableToAdd.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Agregar miembro de tu organización al proyecto
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* User selector */}
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? "")} disabled={isAddPending}>
              <SelectTrigger className="flex-1 h-9 text-sm bg-white dark:bg-zinc-950">
                <SelectValue placeholder="Seleccionar colaborador...">
                  {((value: any) => {
                    const matchedUser = orgMembers.find((u) => u.id === value);
                    return matchedUser ? matchedUser.full_name : "Seleccionar colaborador...";
                  }) as any}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="font-medium">{u.full_name}</span>
                    {u.email && (
                      <span className="text-zinc-400 ml-1.5 text-xs">({u.email})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role selector */}
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as ProjectRole)}
              disabled={isAddPending}
            >
              <SelectTrigger className="w-full sm:w-44 h-9 text-sm bg-white dark:bg-zinc-950">
                <SelectValue>
                  {((value: any) => ROLE_LABELS[value as ProjectRole] || value) as any}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Add button */}
            <Button
              type="button"
              size="sm"
              onClick={handleAddMember}
              disabled={isAddPending || !selectedUserId}
              className="h-9 gap-1.5 shrink-0 cursor-pointer"
            >
              {isAddPending ? (
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
            const isRowLoading = loadingUserId === member.user_id;

            return (
              <div
                key={member.user_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40 transition-colors ${isRowLoading ? "opacity-60 pointer-events-none" : ""}`}
              >
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {isRowLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : (
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase">
                      {member.full_name?.charAt(0) ?? "?"}
                    </span>
                  )}
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

                {/* Role — editable select or read-only badge */}
                {hasEditRights && !isSelf && editingUserId === member.user_id ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => {
                      handleRoleChange(member.user_id, v as ProjectRole);
                      setEditingUserId(null);
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        setEditingUserId(null);
                      }
                    }}
                    defaultOpen
                    disabled={isRowLoading}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                      <SelectValue>
                        {((value: any) => ROLE_LABELS[value as ProjectRole] || value) as any}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${ROLE_BADGE_CLASSES[member.role]} ${
                      hasEditRights && !isSelf ? "cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-850/50 transition-colors" : ""
                    }`}
                    onDoubleClick={() => {
                      if (hasEditRights && !isSelf) {
                        setEditingUserId(member.user_id);
                      }
                    }}
                    title={hasEditRights && !isSelf ? "Doble clic para cambiar rol" : undefined}
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {ROLE_LABELS[member.role]}
                  </Badge>
                )}

                {/* Remove button */}
                {hasEditRights && !isSelf && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                    onClick={() => requestRemoveMember(member.user_id, member.full_name)}
                    disabled={isRowLoading}
                    title={`Remover a ${member.full_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── Confirmation Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Remover miembro del proyecto
            </DialogTitle>
            <DialogDescription className="pt-1">
              ¿Estás seguro de que deseas remover a{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {confirmTarget?.userName}
              </span>{" "}
              del proyecto? Esta acción revocará su acceso inmediatamente. Podrás volver a agregarlo en cualquier momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setConfirmTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="cursor-pointer gap-1.5"
              onClick={confirmRemoveMember}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sí, remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
