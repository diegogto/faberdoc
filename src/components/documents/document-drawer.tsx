"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { getProjectFlowsAction } from "@/app/(dashboard)/projects/[projectId]/mdl/actions";
import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RevisionTimeline } from "./revision-timeline";
import {
  createNextRevisionAction,
  uploadRevisionFileAction,
  updateRevisionStatusAction,
  addIssueToRevisionAction,
  getSignedUploadUrlAction,
  registerUploadedFileAction,
} from "@/app/(dashboard)/projects/[projectId]/mdl/revision-actions";
import {
  addCommentAction,
  getCommentsAction,
} from "@/app/(dashboard)/projects/[projectId]/comment-actions";
import {
  Upload,
  CheckCircle,
  FileCode,
  Calendar,
  Hash,
  Layers,
  MapPin,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  Clock,
  RefreshCw,
  Archive,
  Trash2,
  CornerDownRight,
} from "lucide-react";
import type { DocumentDetail, RevisionStatus, SystemComment } from "@/lib/types";

type ProjectRole = "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER" | "UPLOADER";

interface DocumentDrawerProps {
  documentDetail: DocumentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  /** The current user's role in this project — controls which action buttons are visible */
  userRole?: ProjectRole;
  currentUserId?: string;
  onRefresh?: () => void;
  isProjectArchived?: boolean;
  canAccessArchivedIntermediate?: boolean;
}

const PROPERTY_ICONS: Record<string, React.ReactNode> = {
  specialty: <Layers className="h-3.5 w-3.5" />,
  area: <MapPin className="h-3.5 w-3.5" />,
  discipline_code: <FileCode className="h-3.5 w-3.5" />,
};

const PROPERTY_LABELS: Record<string, string> = {
  specialty: "Especialidad",
  area: "Área",
  discipline_code: "Código Disciplina",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DocumentDrawer({
  documentDetail,
  isOpen,
  onClose,
  projectId,
  userRole = "VIEWER",
  currentUserId,
  onRefresh,
  isProjectArchived = false,
  canAccessArchivedIntermediate = false,
}: DocumentDrawerProps) {
  // Role-based capability flags
  const canUpload = userRole === "ADMIN" || userRole === "COORDINATOR" || userRole === "UPLOADER";
  const canReview = userRole === "ADMIN" || userRole === "REVIEWER" || userRole === "OWNER_APPROVER";
  const canCreateRevision = userRole === "ADMIN" || userRole === "COORDINATOR" || userRole === "UPLOADER";
  const canDeleteDocument = (userRole === "ADMIN" || userRole === "COORDINATOR") && !isProjectArchived;

  const handleDeleteDocument = () => {
    if (!documentDetail) return;
    startTransition(async () => {
      const { deleteDocumentAction } = await import("@/app/(dashboard)/projects/[projectId]/mdl/actions");
      const res = await deleteDocumentAction(projectId, documentDetail.document.id);
      if (res.error) {
        alert(res.error);
      } else {
        onClose();
        onRefresh?.();
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resize y Pestañas
  const [width, setWidth] = useState(550);
  const [isResizing, setIsResizing] = useState(false);
  const [flows, setFlows] = useState<any[]>([]);
  const [pendingUploadAction, setPendingUploadAction] = useState<"resolved" | "rereview" | null>(null);
  
  const [activeTab, setActiveTab] = useState<"history" | "conversations">("history");
  const [systemComments, setSystemComments] = useState<SystemComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!documentDetail) return;
    const res = await getCommentsAction(projectId, {
      targetType: "document",
      targetId: documentDetail.document.id,
    });
    if (res.success && res.comments) {
      const mapped = (res.comments || []).map((c: any) => ({
        id: c.id,
        parent_id: c.parent_id,
        author_id: c.author_id,
        content: c.content,
        created_at: c.created_at,
        project_id: c.project_id || null,
        document_id: c.document_id || null,
        transmittal_id: c.transmittal_id || null,
        author: Array.isArray(c.author)
          ? c.author[0]
            ? {
                full_name: c.author[0].full_name,
                avatar_url: c.author[0].avatar_url,
              }
            : undefined
          : c.author
          ? {
              full_name: c.author.full_name,
              avatar_url: c.author.avatar_url,
            }
          : undefined,
      })) as SystemComment[];
      setSystemComments(mapped);
    }
  };

  useEffect(() => {
    if (isOpen && documentDetail) {
      fetchComments();
      setActiveTab("history");
    }
  }, [isOpen, documentDetail]);

  // Cargar flujos de revisión del proyecto al abrir el drawer
  useEffect(() => {
    if (!isOpen || !projectId) return;
    const fetchProjectFlows = async () => {
      const res = await getProjectFlowsAction(projectId);
      if (res.success && res.flows) {
        setFlows(res.flows);
      } else {
        console.error("Error loading project flows:", res.error);
      }
    };
    fetchProjectFlows();
  }, [isOpen, projectId]);


  // Load width on mount (prevents Next.js SSR hydration mismatch)
  useEffect(() => {
    const savedWidth = localStorage.getItem("document-drawer-width");
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed > 350 && parsed < window.innerWidth * 0.85) {
        setWidth(parsed);
      }
    }
  }, []);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 350 && newWidth < window.innerWidth * 0.85) {
        setWidth(newWidth);
        localStorage.setItem("document-drawer-width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const latestRevision = documentDetail?.revisions[0];
  const latestStatus: RevisionStatus = latestRevision?.status ?? "DRAFT";
  const hasFiles = latestRevision ? latestRevision.files.length > 0 : false;

  // Evaluar conectividad de botones basada en el diagrama del flujo activo
  const activeFlow = latestRevision?.current_flow_id
    ? flows.find((f) => f.id === latestRevision.current_flow_id)
    : null;

  // A. Para revisores
  const myActiveNode = latestRevision?.active_nodes?.find(
    (n: any) => n.type === "reviewer" && n.status === "PENDING" && n.data?.userId === currentUserId
  );
  
  // Si soy admin/coordinador y no hay nodo específico mío, puedo actuar sobre cualquier reviewer pendiente
  const activeNodeToActOn = myActiveNode || (
    (userRole === "ADMIN" || userRole === "COORDINATOR")
      ? latestRevision?.active_nodes?.find((n: any) => n.type === "reviewer" && n.status === "PENDING")
      : null
  );

  const hasApprovedEdge = activeFlow && activeNodeToActOn
    ? activeFlow.edges?.some((e: any) => e.source === activeNodeToActOn.nodeId && e.sourceHandle === "approved")
    : true; // Default a true si no hay flujo (comportamiento estándar)

  const hasMinorEdge = activeFlow && activeNodeToActOn
    ? activeFlow.edges?.some((e: any) => e.source === activeNodeToActOn.nodeId && e.sourceHandle === "minor")
    : true;

  const hasMajorEdge = activeFlow && activeNodeToActOn
    ? activeFlow.edges?.some((e: any) => e.source === activeNodeToActOn.nodeId && e.sourceHandle === "major")
    : true;

  // B. Para el ejecutor (cuando el documento está en COMMENTED)
  const activeExecutorNode = latestRevision?.active_nodes?.find(
    (n: any) => n.type === "executor" && n.status === "PENDING"
  );

  const hasResolvedEdge = activeFlow && activeExecutorNode
    ? activeFlow.edges?.some((e: any) => e.source === activeExecutorNode.nodeId && e.sourceHandle === "resolved")
    : true;

  const hasRereviewEdge = activeFlow && activeExecutorNode
    ? activeFlow.edges?.some((e: any) => e.source === activeExecutorNode.nodeId && e.sourceHandle === "rereview")
    : true;

  const handleCreateNextRevision = () => {
    if (!documentDetail) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createNextRevisionAction(projectId, documentDetail.document.id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onRefresh?.();
      }
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !latestRevision || !documentDetail) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        // 1. Obtener la URL firmada de subida y el s3Key único
        const signedRes = await getSignedUploadUrlAction(
          projectId,
          documentDetail.document.id,
          latestRevision.id,
          file.name,
          file.type
        );

        if (signedRes.error || !signedRes.signedUrl || !signedRes.s3Key) {
          setErrorMsg(signedRes.error || "No se pudo obtener la URL de subida firmada.");
          return;
        }

        // 2. Subir directamente el archivo usando fetch a la URL firmada
        const uploadResponse = await fetch(signedRes.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          setErrorMsg("Error al subir el archivo a almacenamiento.");
          return;
        }

        // 3. Registrar el archivo en la base de datos
        const registerRes = await registerUploadedFileAction(
          projectId,
          documentDetail.document.id,
          latestRevision.id,
          signedRes.s3Key,
          file.name,
          file.size,
          pendingUploadAction || undefined
        );

        if (registerRes.error) {
          setErrorMsg(registerRes.error);
        } else {
          if (fileInputRef.current) fileInputRef.current.value = "";
          setPendingUploadAction(null); // Reset del action
          onRefresh?.();
        }
      } catch (err) {
        console.error("Error durante el flujo de subida directa:", err);
        setErrorMsg("Ocurrió un error inesperado al subir el archivo.");
      }
    });
  };

  const handleStatusChange = (status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "COMMENTED", commentLevel?: "MINOR" | "MAJOR" | null) => {
    if (!latestRevision) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateRevisionStatusAction(projectId, latestRevision.id, status, commentLevel);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onRefresh?.();
      }
    });
  };

  const handleAddIssue = () => {
    if (!latestRevision || !commentText.trim()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await addIssueToRevisionAction(projectId, latestRevision.id, commentText);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setCommentText("");
        onRefresh?.();
      }
    });
  };

  const handleAddSystemComment = async (parentId?: string | null) => {
    if (!documentDetail || !newCommentText.trim()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await addCommentAction(projectId, {
        targetType: "document",
        targetId: documentDetail.document.id,
        content: newCommentText,
        parentId: parentId || null,
      });
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setNewCommentText("");
        setReplyToId(null);
        fetchComments();
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:w-[var(--drawer-width)] sm:max-w-[var(--drawer-width)] p-0 flex flex-col h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800",
          isResizing && "transition-none"
        )}
        style={{
          "--drawer-width": `${width}px`,
          width: `${width}px`,
          maxWidth: `${width}px`,
        } as React.CSSProperties}
      >
        {/* Resize handle on left edge */}
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 bottom-0 left-0 w-2 cursor-col-resize select-none z-50 hover:bg-primary/20 transition-colors duration-150",
            isResizing ? "bg-primary/40 w-2" : "bg-transparent"
          )}
        />
        {documentDetail ? (
          <>
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tracking-wide">
                    {documentDetail.document.document_code}
                  </p>
                  <SheetTitle className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-50 font-sans">
                    {documentDetail.document.title}
                  </SheetTitle>
                </div>
                <StatusBadge status={latestStatus} />
              </div>
            </SheetHeader>

            {/* Tabs */}
            <div className="px-6 border-b border-zinc-200 dark:border-zinc-800 flex gap-4 bg-zinc-50/50 dark:bg-zinc-900/10 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer outline-hidden",
                  activeTab === "history"
                    ? "border-[#2e3e56] dark:border-[#3e689a] text-[#2e3e56] dark:text-[#a0b3cf]"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
                )}
              >
                Historial e Incidencias
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("conversations")}
                className={cn(
                  "py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer outline-hidden",
                  activeTab === "conversations"
                    ? "border-[#2e3e56] dark:border-[#3e689a] text-[#2e3e56] dark:text-[#a0b3cf]"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
                )}
              >
                Conversaciones
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
                {errorMsg}
              </div>
            )}

            <ScrollArea className="flex-1 notion-scroll">
              <div className="px-6 py-5 space-y-6">
                {/* Properties Section */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                    Propiedades
                  </h3>
                  <div className="space-y-2">
                    {documentDetail.document.custom_properties &&
                      Object.entries(
                        documentDetail.document.custom_properties
                      ).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 w-36 shrink-0 font-medium">
                            {PROPERTY_ICONS[key] ?? (
                              <Hash className="h-3.5 w-3.5" />
                            )}
                            {PROPERTY_LABELS[key] ?? key}
                          </span>
                          <span className="text-zinc-900 dark:text-zinc-100">{String(value)}</span>
                        </div>
                      ))}

                    {/* Issuance dates */}
                    {documentDetail.issuance && (() => {
                      const iss = documentDetail.issuance;
                      const planned = iss.current_planned_date ? new Date(iss.current_planned_date) : null;
                      const actual = iss.actual_issuance_date ? new Date(iss.actual_issuance_date) : null;
                      const today = new Date();
                      const isOverdue = planned && !actual && planned < today;
                      const wasDelayed = (iss.iteration_count ?? 0) > 0;

                      return (
                        <>
                          {/* Baseline date */}
                          {iss.original_planned_date && iss.original_planned_date !== iss.current_planned_date && (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 w-36 shrink-0 font-medium line-through">
                                <Calendar className="h-3.5 w-3.5" />
                                Fecha Base
                              </span>
                              <span className="text-zinc-400 dark:text-zinc-500 line-through" suppressHydrationWarning>
                                {formatDate(iss.original_planned_date)}
                              </span>
                            </div>
                          )}
                          {/* Current planned date */}
                          <div className="flex items-center gap-3 text-sm">
                            <span className={`flex items-center gap-1.5 w-36 shrink-0 font-medium ${
                              isOverdue
                                ? "text-red-500 dark:text-red-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}>
                              <Calendar className="h-3.5 w-3.5" />
                              Fecha Planificada
                            </span>
                            <span className={`flex items-center gap-1.5 ${
                              isOverdue
                                ? "text-red-600 dark:text-red-400 font-semibold"
                                : "text-zinc-900 dark:text-zinc-100"
                            }`} suppressHydrationWarning>
                              {formatDate(iss.current_planned_date)}
                              {isOverdue && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 px-1.5 py-0.5 rounded-full">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Atrasado
                                </span>
                              )}
                            </span>
                          </div>
                          {/* Actual date */}
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 w-36 shrink-0 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Fecha Emisión Real
                            </span>
                            <span className="text-zinc-900 dark:text-zinc-100" suppressHydrationWarning>
                              {formatDate(iss.actual_issuance_date)}
                            </span>
                          </div>
                          {/* Iteration count */}
                          {wasDelayed && (
                            <div className="flex items-center gap-3 text-sm">
                              <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 w-36 shrink-0 font-medium">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Reprogramaciones
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-1.5 py-0.5 rounded-full">
                                <Clock className="h-2.5 w-2.5" />
                                {iss.iteration_count}x reprogramado
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </section>

                {isProjectArchived && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md flex items-start gap-2 text-amber-800 dark:text-amber-300">
                    <Archive className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      <strong>Proyecto Archivado</strong>: Este proyecto se encuentra en modo de solo lectura. No se permite realizar modificaciones sobre los documentos o comentarios.
                    </p>
                  </div>
                )}

                {activeTab === "history" ? (
                  <>
                    <Separator />

                    {/* Actions Section */}
                    <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                    Acciones de Control
                  </h3>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg"
                    disabled={isPending}
                  />

                  <div className="flex flex-wrap gap-2">
                    {/* Upload File / Resuelto / Re-revisar: only for uploaders/executors */}
                    {canUpload && latestRevision && (
                      <>
                        {/* Draft mode: simple upload */}
                        {latestStatus === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1.5 font-medium shadow-xs"
                            onClick={() => {
                              setPendingUploadAction(null);
                              handleUploadClick();
                            }}
                            disabled={isPending}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {hasFiles ? "Reemplazar Archivo" : "Subir Archivo"}
                          </Button>
                        )}

                        {/* Commented mode: we check active executor node to enable/disable buttons */}
                        {latestStatus === "COMMENTED" && (
                          <>
                            {/* If there's an active executor node, show action buttons */}
                            {activeExecutorNode ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-1.5 font-medium bg-[#2e3e56] hover:bg-[#3e689a] text-white shadow-xs"
                                  onClick={() => {
                                    setPendingUploadAction("resolved");
                                    handleUploadClick();
                                  }}
                                  disabled={isPending || !hasResolvedEdge}
                                  title={!hasResolvedEdge ? "El flujo del diagrama no tiene salida de 'Resuelto' para este ejecutor." : ""}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Subir y Marcar como Resuelto
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1.5 font-medium text-zinc-700 dark:text-zinc-200"
                                  onClick={() => {
                                    setPendingUploadAction("rereview");
                                    handleUploadClick();
                                  }}
                                  disabled={isPending || !hasRereviewEdge}
                                  title={!hasRereviewEdge ? "El flujo del diagrama no tiene salida de 'Re-revisar' para este ejecutor." : ""}
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  Subir y Enviar a Re-revisión
                                </Button>
                              </>
                            ) : (
                              // Fallback standard button if no active flow node is tracked
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1.5 font-medium shadow-xs"
                                onClick={() => {
                                  setPendingUploadAction(null);
                                  handleUploadClick();
                                }}
                                disabled={isPending}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Reemplazar Archivo
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Send to review: only ADMIN or COORDINATOR, when DRAFT and has files */}
                    {canUpload && latestStatus === "DRAFT" && hasFiles && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 font-medium text-zinc-700 dark:text-zinc-200"
                        onClick={() => handleStatusChange("IN_REVIEW")}
                        disabled={isPending}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Enviar a Revisión
                      </Button>
                    )}

                    {/* Review actions: only REVIEWER, OWNER_APPROVER, or ADMIN */}
                    {canReview && latestStatus === "IN_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/20 dark:hover:bg-green-950/40 dark:text-green-400 dark:border-green-900/30"
                          onClick={() => handleStatusChange("APPROVED")}
                          disabled={isPending || !hasApprovedEdge}
                          title={!hasApprovedEdge ? "El flujo del diagrama no tiene salida de 'Aprobado' para este revisor." : ""}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-medium border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
                          onClick={() => handleStatusChange("COMMENTED", "MINOR")}
                          disabled={isPending || !hasMinorEdge}
                          title={!hasMinorEdge ? "El flujo del diagrama no tiene salida de 'Com. Menores' para este revisor." : ""}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Comentarios Menores
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-medium border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                          onClick={() => handleStatusChange("COMMENTED", "MAJOR")}
                          disabled={isPending || !hasMajorEdge}
                          title={!hasMajorEdge ? "El flujo del diagrama no tiene salida de 'Com. Mayores' para este revisor." : ""}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Comentarios Mayores
                        </Button>
                      </>
                    )}

                    {/* Create new revision: only ADMIN or COORDINATOR */}
                    {canCreateRevision && (latestStatus === "APPROVED" || latestStatus === "ISSUED") && (
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 font-medium shadow-xs"
                        onClick={handleCreateNextRevision}
                        disabled={isPending}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Crear Nueva Versión
                      </Button>
                    )}

                    {canDeleteDocument && documentDetail && (
                      <Dialog>
                        <DialogTrigger render={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar Documento
                          </Button>
                        } />
                        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600 font-sans font-bold text-sm">
                              ¿Eliminar documento?
                            </DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                              El documento "{documentDetail.document.document_code}" se moverá a la Papelera de reciclaje. Se ocultará inmediatamente del Maestro de Documentos de todos los usuarios y podrá ser recuperado desde la papelera por un período de 30 días.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="mt-4 gap-2 sm:gap-0">
                            <DialogTrigger render={
                              <Button variant="ghost" disabled={isPending} className="cursor-pointer">Cancelar</Button>
                            } />
                            <Button
                              variant="destructive"
                              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                              onClick={handleDeleteDocument}
                              disabled={isPending}
                            >
                              {isPending ? "Eliminando..." : "Confirmar y Enviar a Papelera"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Read-only notice for VIEWERs */}
                    {userRole === "VIEWER" && (
                      <p className="text-xs text-zinc-400 italic">
                        Solo tienes permisos de lectura en este proyecto.
                      </p>
                    )}
                  </div>
                </section>

                <Separator />

                    {/* Add Comment Section: Visible if there is a revision */}
                    {latestRevision && !isProjectArchived && (
                      <section className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Registrar Incidencia de Revisión
                        </h3>
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Escribe una observación o incidencia técnica que requiera corrección..."
                            rows={2}
                            disabled={isPending}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              className="gap-1.5 font-medium text-xs h-8 cursor-pointer bg-[#2e3e56] hover:bg-[#3e689a] text-white"
                              onClick={handleAddIssue}
                              disabled={isPending || !commentText.trim()}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Registrar Incidencia
                            </Button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Timeline */}
                    <section>
                      <RevisionTimeline
                        revisions={documentDetail.revisions}
                        projectId={projectId}
                        onRefresh={onRefresh}
                        isProjectArchived={isProjectArchived}
                        canAccessArchivedIntermediate={canAccessArchivedIntermediate}
                      />
                    </section>
                  </>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Chat / Conversations Tab */}
                    <section className="space-y-3">
                      {/* Comments list */}
                      <div className="space-y-3">
                        {systemComments.length === 0 ? (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-4 text-center">
                            No hay conversaciones iniciadas sobre este documento. Usa el formulario de abajo para enviar un mensaje al equipo.
                          </p>
                        ) : (
                          (() => {
                            const roots = systemComments.filter(c => !c.parent_id);
                            const replies = systemComments.reduce<Record<string, SystemComment[]>>((acc, c) => {
                              if (c.parent_id) {
                                if (!acc[c.parent_id]) acc[c.parent_id] = [];
                                acc[c.parent_id].push(c);
                              }
                              return acc;
                            }, {});

                            return roots.map((comment) => (
                              <div key={comment.id} className="space-y-2">
                                {/* Root Comment */}
                                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3 space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                      {comment.author?.full_name ?? "Usuario"}
                                    </span>
                                    <span suppressHydrationWarning>
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-normal">
                                    {comment.content}
                                  </p>
                                  {!isProjectArchived && (
                                    <div className="flex justify-end pt-1">
                                      <button
                                        onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                                        className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                                      >
                                        Responder
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Replies */}
                                {replies[comment.id]?.map((reply) => (
                                  <div key={reply.id} className="flex gap-2 pl-6">
                                    <CornerDownRight className="h-4 w-4 text-zinc-300 shrink-0 mt-2" />
                                    <div className="flex-1 rounded-lg border border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 p-2.5 space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                        <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                                          {reply.author?.full_name ?? "Usuario"}
                                        </span>
                                        <span suppressHydrationWarning>
                                          {formatDate(reply.created_at)}
                                        </span>
                                      </div>
                                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-normal">
                                        {reply.content}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                {/* Cascading Reply Input */}
                                {replyToId === comment.id && (
                                  <div className="pl-6 flex gap-2">
                                    <CornerDownRight className="h-4 w-4 text-zinc-300 shrink-0 mt-2" />
                                    <div className="flex-1 flex gap-2 items-center">
                                      <input
                                        type="text"
                                        placeholder="Escribe una respuesta..."
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        className="flex-1 text-xs px-3 py-1.5 rounded-md border border-input bg-transparent shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs cursor-pointer"
                                        onClick={() => handleAddSystemComment(comment.id)}
                                        disabled={isPending || !newCommentText.trim()}
                                      >
                                        Enviar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ));
                          })()
                        )}
                      </div>

                      {/* Main system comment input */}
                      {!isProjectArchived && !replyToId && (
                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Iniciar Conversación
                          </h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Escribe un mensaje para el equipo..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              className="flex-1 text-xs px-3 py-2 rounded-md border border-input bg-transparent shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950"
                            />
                            <Button
                              size="sm"
                              className="h-9 cursor-pointer"
                              onClick={() => handleAddSystemComment(null)}
                              disabled={isPending || !newCommentText.trim()}
                            >
                              Enviar
                            </Button>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">
              Selecciona un documento para ver sus detalles
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
