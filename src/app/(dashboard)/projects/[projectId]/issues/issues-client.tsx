"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { respondToIssueAction } from "@/app/(dashboard)/projects/[projectId]/mdl/revision-actions";
import {
  Search,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  CornerDownRight,
} from "lucide-react";

interface IssueViewModel {
  id: string;
  revision_id: string;
  author_id: string;
  content: string;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  response_text: string | null;
  closed_at: string | null;
  created_at: string;
  author_name: string;
  version_label: string;
  document_id: string;
  document_code: string;
  document_title: string;
}

interface IssuesClientProps {
  initialIssues: IssueViewModel[];
  projectId: string;
  userRole: string;
}

export function IssuesClient({
  initialIssues,
  projectId,
  userRole,
}: IssuesClientProps) {
  const router = useRouter();
  const [filterTab, setFilterTab] = useState<"all" | "OPEN" | "RESOLVED" | "CLOSED">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Respondiendo
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isPending, startTransition] = useTransition();

  // Permisos
  const canRespond = userRole === "ADMIN" || userRole === "COORDINATOR" || userRole === "REVIEWER" || userRole === "OWNER_APPROVER" || userRole === "ORGANIZATION_ADMIN";

  const handleRespond = (issueId: string, closeIssue: boolean) => {
    if (!responseText.trim()) return;

    startTransition(async () => {
      const res = await respondToIssueAction(projectId, issueId, responseText, closeIssue);
      if (!res.error) {
        setResponseText("");
        setActiveIssueId(null);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const handleDirectClose = (issueId: string) => {
    startTransition(async () => {
      const res = await respondToIssueAction(projectId, issueId, "", true);
      if (!res.error) {
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  // Filtrado y Búsqueda
  const filteredIssues = initialIssues.filter((issue) => {
    const matchesTab = filterTab === "all" || issue.status === filterTab;
    const matchesSearch =
      issue.document_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.document_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Pestañas de estado */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg w-full sm:w-auto">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "OPEN", label: "Pendientes" },
              { key: "RESOLVED", label: "Resueltas" },
              { key: "CLOSED", label: "Cerradas" },
            ] as const
          ).map((tab) => {
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer",
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código, título o contenido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Listado de incidencias */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
            <CheckCircle2 className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Sin incidencias</h3>
            <p className="text-xs text-zinc-500 mt-1">No hay incidencias que coincidan con la selección actual.</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            return (
              <div
                key={issue.id}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Cabecera de Incidencia */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                      {issue.document_code}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Rev {issue.version_label}
                    </span>
                    <span className="text-xs text-zinc-400">•</span>
                    <span className="text-xs text-zinc-500 font-medium truncate max-w-[200px]" title={issue.document_title}>
                      {issue.document_title}
                    </span>
                  </div>

                  {/* Estado */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border",
                      issue.status === "OPEN" &&
                        "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
                      issue.status === "RESOLVED" &&
                        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                      issue.status === "CLOSED" &&
                        "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30"
                    )}
                  >
                    {issue.status === "OPEN" && <AlertCircle className="h-2.5 w-2.5" />}
                    {issue.status === "RESOLVED" && <Clock className="h-2.5 w-2.5" />}
                    {issue.status === "CLOSED" && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {issue.status === "OPEN" && "Pendiente"}
                    {issue.status === "RESOLVED" && "Resuelta"}
                    {issue.status === "CLOSED" && "Cerrada"}
                  </span>
                </div>

                {/* Contenido */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Emitida por: <strong>{issue.author_name}</strong></span>
                    <span suppressHydrationWarning>
                      {new Date(issue.created_at).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/10 p-3 rounded-md border border-zinc-105 dark:border-zinc-900">
                    {issue.content}
                  </p>
                </div>

                {/* Respuesta */}
                {issue.response_text && (
                  <div className="pl-4 flex gap-2">
                    <CornerDownRight className="h-4 w-4 text-zinc-300 shrink-0 mt-1" />
                    <div className="flex-1 rounded-lg border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 p-3 space-y-1">
                      <div className="text-[10px] text-zinc-450 font-semibold">Respuesta:</div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-normal">
                        {issue.response_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Acciones para responder */}
                {canRespond && issue.status !== "CLOSED" && (
                  <div className="flex justify-end pt-1">
                    {activeIssueId === issue.id ? (
                      <div className="flex flex-col gap-2 w-full max-w-lg mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Escribe tu respuesta o remedio técnico..."
                          rows={2}
                          disabled={isPending}
                          className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2.5 cursor-pointer"
                            onClick={() => {
                              setActiveIssueId(null);
                              setResponseText("");
                            }}
                            disabled={isPending}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 border-zinc-200 cursor-pointer"
                            onClick={() => handleRespond(issue.id, false)}
                            disabled={isPending || !responseText.trim()}
                          >
                            Guardar Respuesta
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                            onClick={() => handleRespond(issue.id, true)}
                            disabled={isPending || !responseText.trim()}
                          >
                            Responder y Cerrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
                          onClick={() => {
                            setActiveIssueId(issue.id);
                            setResponseText(issue.response_text || "");
                          }}
                          disabled={isPending}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Responder
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-600 hover:text-green-700 border-green-200 bg-green-50/50 cursor-pointer"
                          onClick={() => handleDirectClose(issue.id)}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolver / Cerrar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Icono simple de Reloj
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
