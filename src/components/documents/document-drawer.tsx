"use client";

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
  Upload,
  CheckCircle2,
  Send,
  Calendar,
  Hash,
  Layers,
  MapPin,
  FileCode2,
} from "lucide-react";
import type { DocumentDetail, RevisionStatus } from "@/lib/types";

interface DocumentDrawerProps {
  documentDetail: DocumentDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

const PROPERTY_ICONS: Record<string, React.ReactNode> = {
  specialty: <Layers className="h-3.5 w-3.5" />,
  area: <MapPin className="h-3.5 w-3.5" />,
  discipline_code: <FileCode2 className="h-3.5 w-3.5" />,
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
}: DocumentDrawerProps) {
  const latestRevision = documentDetail?.revisions[0];
  const latestStatus: RevisionStatus = latestRevision?.status ?? "DRAFT";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[var(--drawer-width)] sm:max-w-[var(--drawer-width)] p-0 flex flex-col"
      >
        {documentDetail ? (
          <>
            {/* Header */}
            <SheetHeader className="px-6 pt-6 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground tracking-wide">
                    {documentDetail.document.document_code}
                  </p>
                  <SheetTitle className="text-lg font-semibold leading-tight">
                    {documentDetail.document.title}
                  </SheetTitle>
                </div>
                <StatusBadge status={latestStatus} />
              </div>
            </SheetHeader>

            <Separator />

            <ScrollArea className="flex-1 notion-scroll">
              <div className="px-6 py-5 space-y-6">
                {/* Properties Section */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
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
                          <span className="flex items-center gap-1.5 text-muted-foreground w-36 shrink-0">
                            {PROPERTY_ICONS[key] ?? (
                              <Hash className="h-3.5 w-3.5" />
                            )}
                            {PROPERTY_LABELS[key] ?? key}
                          </span>
                          <span className="text-foreground">{String(value)}</span>
                        </div>
                      ))}

                    {/* Issuance dates */}
                    {documentDetail.issuance && (
                      <>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground w-36 shrink-0">
                            <Calendar className="h-3.5 w-3.5" />
                            Fecha Planificada
                          </span>
                          <span className="text-foreground">
                            {formatDate(
                              documentDetail.issuance.current_planned_date
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground w-36 shrink-0">
                            <Calendar className="h-3.5 w-3.5" />
                            Fecha Emisión Real
                          </span>
                          <span className="text-foreground">
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
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Acciones
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Subir Revisión
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      Emitir
                    </Button>
                  </div>
                </section>

                <Separator />

                {/* Revision History Section */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Historial de Revisiones
                  </h3>
                  <RevisionTimeline revisions={documentDetail.revisions} />
                </section>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Selecciona un documento para ver sus detalles
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
