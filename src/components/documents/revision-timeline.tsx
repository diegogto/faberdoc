"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { FileText, MessageSquare, Download, User, Check, Lock, Link, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToIssueAction, getDownloadUrlAction } from "@/app/(dashboard)/projects/[projectId]/mdl/revision-actions";
import type { Revision, FileRecord, DocumentIssue } from "@/lib/types";

interface RevisionTimelineProps {
  revisions: (Revision & {
    files: FileRecord[];
    uploader_name: string;
    issues: DocumentIssue[];
  })[];
  projectId?: string;
  onRefresh?: () => void;
  isProjectArchived?: boolean;
  canAccessArchivedIntermediate?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RevisionTimeline({
  revisions,
  projectId,
  onRefresh,
  isProjectArchived = false,
  canAccessArchivedIntermediate = false,
}: RevisionTimelineProps) {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (s3Key: string, fileId: string) => {
    if (!projectId) return;
    try {
      const res = await getDownloadUrlAction(projectId, s3Key);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.url) {
        await navigator.clipboard.writeText(res.url);
        setCopiedId(fileId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      alert("Error al copiar el enlace de descarga.");
    }
  };

  const handleRespond = (commentId: string, closeComment: boolean) => {
    if (!projectId || !responseText.trim()) return;

    startTransition(async () => {
      const res = await respondToIssueAction(projectId, commentId, responseText, closeComment);
      if (!res.error) {
        setResponseText("");
        setActiveCommentId(null);
        onRefresh?.();
      }
    });
  };

  const handleDirectClose = (commentId: string) => {
    if (!projectId) return;

    startTransition(async () => {
      const res = await respondToIssueAction(projectId, commentId, "", true);
      if (!res.error) {
        onRefresh?.();
      }
    });
  };

  const handleDownload = async (s3Key: string, fileName: string) => {
    if (!projectId) return;
    try {
      const res = await getDownloadUrlAction(projectId, s3Key);
      if (res.error) {
        alert(res.error);
        return;
      }
      if (res.url) {
        const a = document.createElement("a");
        a.href = res.url;
        a.download = fileName;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      alert("Error al descargar el archivo.");
    }
  };

  if (revisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay revisiones registradas.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-6">
        {revisions.map((revision, index) => (
          <div key={revision.id} className="relative pl-8">
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-background ${
                index === 0
                  ? "border-primary"
                  : "border-muted-foreground/30"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                }`}
              />
            </div>

            {/* Revision content */}
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-50">
                  {revision.version_label.startsWith("Rev") ? revision.version_label : `Rev ${revision.version_label}`}
                </span>
                <StatusBadge status={revision.status} />
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {revision.uploader_name}
                </span>
                <span>•</span>
                <span suppressHydrationWarning>{formatDate(revision.created_at)}</span>
              </div>

              {/* Files */}
              {revision.files.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {revision.files.map((file) => {
                    const isIntermediate = index > 0;
                    const isDownloadRestricted = isProjectArchived && isIntermediate;

                    if (isDownloadRestricted) {
                      if (canAccessArchivedIntermediate) {
                        // Privileged user: show custom download & copy link
                        return (
                          <div
                            key={file.id}
                            className="flex w-full items-center gap-2 rounded-md border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/5 px-3 py-2 text-sm group"
                          >
                            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-505 shrink-0" />
                            <span className="truncate flex-1 text-[13px] text-zinc-800 dark:text-zinc-200 font-medium">
                              {file.file_name}
                              <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-500 font-semibold bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/20">
                                Archivado (Acceso Admin)
                              </span>
                            </span>
                            <span className="text-xs text-zinc-500 shrink-0 mr-2">
                              {formatFileSize(file.file_size_bytes)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-amber-100/50 dark:hover:bg-amber-950/20 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                                onClick={() => handleDownload(file.s3_key, file.file_name)}
                                title="Descargar plano"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-amber-100/50 dark:hover:bg-amber-950/20 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1 cursor-pointer"
                                onClick={() => handleCopyLink(file.s3_key, file.id)}
                                title="Copiar enlace único de descarga"
                              >
                                {copiedId === file.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span className="text-[10px] text-green-600 font-semibold">Copiado</span>
                                  </>
                                ) : (
                                  <>
                                    <Link className="h-3 w-3" />
                                    <span className="text-[10px]">Copiar Link</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      } else {
                        // Regular user: locked intermediate version
                        return (
                          <div
                            key={file.id}
                            className="flex w-full items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 px-3 py-2 text-sm select-none opacity-75"
                          >
                            <Lock className="h-4 w-4 text-zinc-400 shrink-0" />
                            <span className="truncate flex-1 text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
                              {file.file_name}
                              <span className="ml-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full border border-zinc-200/40 dark:border-zinc-700/40">
                                Archivado
                              </span>
                            </span>
                            <span className="text-xs text-zinc-400 shrink-0">
                              {formatFileSize(file.file_size_bytes)}
                            </span>
                          </div>
                        );
                      }
                    }

                    // Standard un-restricted document download (e.g. latest version)
                    return (
                      <button
                        key={file.id}
                        onClick={() => handleDownload(file.s3_key, file.file_name)}
                        className="flex w-full items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 hover:bg-zinc-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/50 px-3 py-2 text-sm transition-colors group text-left cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span className="truncate flex-1 text-[13px] text-zinc-800 dark:text-zinc-200 font-medium">
                          {file.file_name}
                        </span>
                        <span className="text-xs text-zinc-500 shrink-0 mr-2">
                          {formatFileSize(file.file_size_bytes)}
                        </span>
                        <Download className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Incidencias */}
              {revision.issues.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                    <MessageSquare className="h-3 w-3" />
                    {revision.issues.length} incidencia
                    {revision.issues.length !== 1 ? "s" : ""}
                  </div>
                  {revision.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400" suppressHydrationWarning>
                          {formatDate(issue.created_at)}
                        </span>
                        <StatusBadge status={issue.status} />
                      </div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                        {issue.content}
                      </p>
                      
                      {issue.response_text && (
                        <div className="border-l-2 border-primary/30 pl-3 mt-2">
                          <p className="text-xs text-zinc-400 mb-0.5">
                            Respuesta:
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {issue.response_text}
                          </p>
                        </div>
                      )}
                      
                      {/* Acciones de incidencia (si no está cerrada y se tienen permisos) */}
                      {projectId && issue.status !== "CLOSED" && (
                        <div className="pt-1.5">
                          {activeCommentId === issue.id ? (
                            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                              <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Escribe tu respuesta..."
                                rows={2}
                                disabled={isPending}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2.5"
                                  onClick={() => {
                                    setActiveCommentId(null);
                                    setResponseText("");
                                  }}
                                  disabled={isPending}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2.5 border-zinc-200"
                                  onClick={() => handleRespond(issue.id, false)}
                                  disabled={isPending || !responseText.trim()}
                                >
                                  Guardar Respuesta
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleRespond(issue.id, true)}
                                  disabled={isPending || !responseText.trim()}
                                >
                                  Responder y Cerrar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-zinc-500 hover:text-zinc-900 px-2"
                                onClick={() => {
                                    setActiveCommentId(issue.id);
                                    setResponseText(issue.response_text || "");
                                }}
                                disabled={isPending}
                              >
                                Responder
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs text-green-600 hover:text-green-700 border-green-200 bg-green-50/50 px-2"
                                onClick={() => handleDirectClose(issue.id)}
                                disabled={isPending}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Resolver
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
