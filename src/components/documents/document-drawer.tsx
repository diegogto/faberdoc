"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RevisionTimeline } from "./revision-timeline";
import {
  createNextRevisionAction,
  uploadRevisionFileAction,
  updateRevisionStatusAction,
  addCommentToRevisionAction,
  getSignedUploadUrlAction,
  registerUploadedFileAction,
} from "@/app/(dashboard)/projects/[projectId]/mdl/revision-actions";
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
} from "lucide-react";
import type { DocumentDetail, RevisionStatus } from "@/lib/types";

interface DocumentDrawerProps {
  documentDetail: DocumentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onRefresh?: () => void;
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
  onRefresh,
}: DocumentDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resize states
  const [width, setWidth] = useState(550);
  const [isResizing, setIsResizing] = useState(false);

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
          file.size
        );

        if (registerRes.error) {
          setErrorMsg(registerRes.error);
        } else {
          if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleAddComment = () => {
    if (!latestRevision || !commentText.trim()) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await addCommentToRevisionAction(projectId, latestRevision.id, commentText);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setCommentText("");
        onRefresh?.();
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

            <Separator />

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
                    {documentDetail.issuance && (
                      <>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 w-36 shrink-0 font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            Fecha Planificada
                          </span>
                          <span className="text-zinc-900 dark:text-zinc-100" suppressHydrationWarning>
                            {formatDate(
                              documentDetail.issuance.current_planned_date
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 w-36 shrink-0 font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            Fecha Emisión Real
                          </span>
                          <span className="text-zinc-900 dark:text-zinc-100" suppressHydrationWarning>
                            {formatDate(
                              documentDetail.issuance.actual_issuance_date
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </section>

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
                    {/* Upload File button: Visible when latest revision doesn't have files, or is DRAFT/COMMENTED */}
                    {latestRevision && (latestStatus === "DRAFT" || latestStatus === "COMMENTED") && (
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5 font-medium shadow-xs"
                        onClick={handleUploadClick}
                        disabled={isPending}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {hasFiles ? "Reemplazar Archivo" : "Subir Archivo"}
                      </Button>
                    )}

                    {/* Send to review button: Visible when latest is DRAFT and has files */}
                    {latestStatus === "DRAFT" && hasFiles && (
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

                    {/* Review actions: Visible when latest is IN_REVIEW */}
                    {latestStatus === "IN_REVIEW" && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/20 dark:hover:bg-green-950/40 dark:text-green-400 dark:border-green-900/30"
                          onClick={() => handleStatusChange("APPROVED")}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-medium border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-50 dark:border-orange-900/30 dark:text-orange-400 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
                          onClick={() => handleStatusChange("COMMENTED", "MINOR")}
                          disabled={isPending}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Comentarios Menores
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-medium border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:bg-red-950/10 dark:hover:bg-red-950/20"
                          onClick={() => handleStatusChange("COMMENTED", "MAJOR")}
                          disabled={isPending}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Comentarios Mayores
                        </Button>
                      </>
                    )}

                    {/* Create new revision button: Visible when latest is APPROVED or ISSUED */}
                    {(latestStatus === "APPROVED" || latestStatus === "ISSUED") && (
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
                  </div>
                </section>

                <Separator />

                {/* Add Comment Section: Visible if there is a revision */}
                {latestRevision && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Agregar Comentario Técnico
                    </h3>
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Escribe un comentario o aclaración técnica..."
                        rows={2}
                        disabled={isPending}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gap-1.5 font-medium text-xs h-8"
                          onClick={handleAddComment}
                          disabled={isPending || !commentText.trim()}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Comentar
                        </Button>
                      </div>
                    </div>
                  </section>
                )}

                <Separator />

                {/* Revision History Section */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
                    Historial de Revisiones
                  </h3>
                  <RevisionTimeline
                    revisions={documentDetail.revisions}
                    projectId={projectId}
                    onRefresh={onRefresh}
                  />
                </section>
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
