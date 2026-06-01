"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRecipientOrganizationsAction,
  getEligibleRevisionsAction,
  createTransmittalAction,
} from "@/app/(dashboard)/projects/[projectId]/transmittals/actions";
import { Search, Loader2, Send, CheckSquare, Square } from "lucide-react";

interface CreateTransmittalDialogProps {
  projectId: string;
  versioningLogic: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTransmittalDialog({
  projectId,
  versioningLogic,
  isOpen,
  onClose,
  onSuccess,
}: CreateTransmittalDialogProps) {
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [revisions, setRevisions] = useState<
    Array<{
      documentId: string;
      documentCode: string;
      title: string;
      revisionId: string;
      versionLabel: string;
      status: string;
    }>
  >([]);
  
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<string[]>([]);
  const [recipientOrgId, setRecipientOrgId] = useState("");
  const [emissionCode, setEmissionCode] = useState("A");
  const [emissionTypes, setEmissionTypes] = useState<Array<{ name: string; code: string }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSelectedRevisionIds([]);
    setRecipientOrgId("");
    setEmissionCode(versioningLogic === "SEPARATE_EMISSION" ? "A" : "");
    setSearchTerm("");
    setIsLoading(true);

    async function loadData() {
      try {
        const [orgRes, revRes] = await Promise.all([
          getRecipientOrganizationsAction(),
          getEligibleRevisionsAction(projectId),
        ]);

        if (orgRes.error) {
          setErrorMsg(orgRes.error);
        } else if (orgRes.organizations) {
          setOrgs(orgRes.organizations);
        }

        if (revRes.error) {
          setErrorMsg(revRes.error);
        } else {
          if (revRes.eligible) {
            // Solamente mostrar las revisiones que estén en estado APPROVED
            const approvedOnly = revRes.eligible.filter((r: any) => r.status === "APPROVED");
            setRevisions(approvedOnly);
          }
          if (revRes.versioningFormatConfig?.emission_types) {
            setEmissionTypes(revRes.versioningFormatConfig.emission_types);
            if (revRes.versioningFormatConfig.emission_types.length > 0 && versioningLogic === "MIXED") {
              setEmissionCode(revRes.versioningFormatConfig.emission_types[0].code);
            }
          }
        }
      } catch (err) {
        setErrorMsg("Error al cargar los datos del transmittal.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen, projectId, versioningLogic]);

  const handleToggleSelect = (revId: string) => {
    setSelectedRevisionIds((prev) =>
      prev.includes(revId)
        ? prev.filter((id) => id !== revId)
        : [...prev, revId]
    );
  };

  const handleToggleAll = () => {
    const filtered = filteredRevisions.map((r) => r.revisionId);
    const allSelected = filtered.every((id) => selectedRevisionIds.includes(id));

    if (allSelected) {
      // Unselect all filtered
      setSelectedRevisionIds((prev) => prev.filter((id) => !filtered.includes(id)));
    } else {
      // Select all filtered
      setSelectedRevisionIds((prev) => Array.from(new Set([...prev, ...filtered])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientOrgId) {
      setErrorMsg("Selecciona una organización destinataria.");
      return;
    }
    if (selectedRevisionIds.length === 0) {
      setErrorMsg("Selecciona al menos un documento para enviar.");
      return;
    }
    if (versioningLogic === "MIXED" && !emissionCode) {
      setErrorMsg("Selecciona un tipo de emisión.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createTransmittalAction(
        projectId,
        recipientOrgId,
        selectedRevisionIds,
        emissionCode
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  const filteredRevisions = revisions.filter(
    (rev) =>
      rev.documentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rev.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-6 bg-white dark:bg-zinc-950 rounded-lg shadow-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Emitir Transmittal (Nuevo Envío)
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
            Crea un transmittal formal y emite documentos aprobados al cliente o contratista.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 mb-2 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            <p className="text-xs text-zinc-500">Cargando documentos aprobados...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* Destinatario */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recipient-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Organización Destinataria
              </label>
              <select
                id="recipient-select"
                value={recipientOrgId}
                onChange={(e) => setRecipientOrgId(e.target.value)}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
                required
              >
                <option value="">Selecciona organización...</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id} className="text-zinc-900">
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Emission Code / Purpose (SEPARATE_EMISSION or MIXED) */}
            {versioningLogic === "SEPARATE_EMISSION" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="emission-code-input" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Código de Emisión (Ej: A, B, C, AP)
                </label>
                <Input
                  id="emission-code-input"
                  value={emissionCode}
                  onChange={(e) => setEmissionCode(e.target.value)}
                  disabled={isPending}
                  className="h-8 max-w-[200px]"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Se asignará esta etiqueta de emisión a todos los documentos seleccionados.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="emission-type-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Propósito / Tipo de Emisión
                </label>
                <select
                  id="emission-type-select"
                  value={emissionCode}
                  onChange={(e) => setEmissionCode(e.target.value)}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                  required
                >
                  <option value="">Selecciona tipo de emisión...</option>
                  {emissionTypes.map((et) => (
                    <option key={et.code} value={et.code} className="text-zinc-900">
                      {et.name} ({et.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Se asociará este propósito de emisión al transmittal y se calculará la versión externa correspondiente.
                </p>
              </div>
            )}

            {/* Documents Selection Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-[200px] border border-zinc-200 dark:border-zinc-800 rounded-md">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-[240px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filtrar aprobados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isPending}
                    className="pl-7 pr-3 h-7 w-full rounded-md border border-input bg-white dark:bg-zinc-950 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={handleToggleAll}
                  disabled={isPending || filteredRevisions.length === 0}
                >
                  Seleccionar Todos
                </Button>
              </div>

              {/* Scrollable Document List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white dark:bg-zinc-950 notion-scroll">
                {filteredRevisions.length > 0 ? (
                  filteredRevisions.map((rev) => {
                    const isSelected = selectedRevisionIds.includes(rev.revisionId);
                    return (
                      <div
                        key={rev.revisionId}
                        onClick={() => !isPending && handleToggleSelect(rev.revisionId)}
                        className={`flex items-start gap-2.5 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/30 cursor-pointer border transition-colors ${
                          isSelected
                            ? "bg-zinc-50/70 border-zinc-300 dark:bg-zinc-900/20 dark:border-zinc-800"
                            : "border-transparent"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-zinc-500">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-semibold font-mono text-zinc-900 dark:text-zinc-100 truncate">
                            {rev.documentCode} (Rev {rev.versionLabel})
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {rev.title}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No hay documentos aprobados para enviar.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="h-8 text-xs px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending || selectedRevisionIds.length === 0 || !recipientOrgId}
                className="h-8 text-xs px-4 gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3" />
                    Emitir Transmittal ({selectedRevisionIds.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
