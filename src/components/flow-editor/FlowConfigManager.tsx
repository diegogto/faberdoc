"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlowEditor, type ReviewerOption, type FlowConfig } from "./FlowEditor";
import { saveProjectFlowsAction } from "@/app/(dashboard)/projects/actions";
import { Settings, Plus, Play, Trash2, Edit3, CheckCircle, FileText, ArrowRight, Info, AlertTriangle, Lock } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlowCondition {
  field: string;
  operator: "equals" | "contains";
  value: string;
}

export interface ReviewFlow {
  id: string;
  name: string;
  isDefault?: boolean;
  conditions: FlowCondition[];
  nodes?: any[];
  edges?: any[];
}

interface CustomPropertyDef {
  key: string;
  label: string;
  type: string;
  options?: Array<{ value: string; code: string } | string>;
}

interface FlowConfigManagerProps {
  projectId: string;
  customProperties: CustomPropertyDef[];
  reviewers: ReviewerOption[];
  initialFlows?: ReviewFlow[] | null;
  /** Only ADMIN or COORDINATOR can edit flows */
  hasEditRights?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowConfigManager({
  projectId,
  customProperties,
  reviewers,
  initialFlows,
  hasEditRights = false,
}: FlowConfigManagerProps) {
  // Normalize and migrate old config if needed
  const [flows, setFlows] = useState<ReviewFlow[]>(() => {
    if (initialFlows && initialFlows.length > 0) {
      return initialFlows;
    }
    // Default fallback flow
    return [
      {
        id: "default-flow",
        name: "Flujo de Aprobación Estándar",
        isDefault: true,
        conditions: [],
        nodes: [],
        edges: [],
      },
    ];
  });

  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ReviewFlow | null>(null);
  const [originalFlows, setOriginalFlows] = useState<ReviewFlow[] | null>(null);
  const [saveTrigger, setSaveTrigger] = useState(0);
  // Orphaned reviewer warning: userIds in the diagram that are no longer project members
  const [orphanedReviewers, setOrphanedReviewers] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeFlow = flows.find((f) => f.id === activeFlowId);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleSaveAll = (updatedFlows: ReviewFlow[]) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await saveProjectFlowsAction(projectId, updatedFlows);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Todos los flujos de revisión fueron guardados exitosamente.");
        setFlows(updatedFlows);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const handleAddFlow = () => {
    const newFlow: ReviewFlow = {
      id: `flow-${Date.now()}`,
      name: `Nuevo Flujo de Revisión ${flows.length}`,
      conditions: [],
      nodes: [],
      edges: [],
    };
    const nextFlows = [...flows, newFlow];
    setFlows(nextFlows);
    handleSaveAll(nextFlows);
  };

  const handleDeleteFlow = (id: string) => {
    const flowToDelete = flows.find((f) => f.id === id);
    if (flowToDelete?.isDefault) return;

    const nextFlows = flows.filter((f) => f.id !== id);
    setFlows(nextFlows);
    handleSaveAll(nextFlows);
  };

  const handleUpdateFlowDiagramInMemory = (flowConfig: FlowConfig) => {
    if (!activeFlowId) return;
    const nextFlows = flows.map((f) =>
      f.id === activeFlowId ? { ...f, nodes: flowConfig.nodes, edges: flowConfig.edges } : f
    );
    setFlows(nextFlows);
    handleSaveAll(nextFlows);
    setIsEditorOpen(false);
    setSaveTrigger(0);
  };

  const openEditor = (flow: ReviewFlow) => {
    setOriginalFlows(JSON.parse(JSON.stringify(flows))); // backup
    setActiveFlowId(flow.id);

    // Detect reviewer nodes whose userId is no longer in the reviewers list
    const reviewerUserIds = new Set(reviewers.map((r) => r.userId));
    const flowNodes: any[] = flow.nodes || [];
    const orphans = flowNodes
      .filter((n) => n.type === "reviewer" && n.data?.userId && !reviewerUserIds.has(n.data.userId))
      .map((n) => n.data.userName || n.data.userId);
    setOrphanedReviewers(orphans);

    setIsEditorOpen(true);
    setSaveTrigger(0);
  };

  const handleCancelEditor = () => {
    if (originalFlows) {
      setFlows(originalFlows);
    }
    setSaveTrigger(0);
    setIsEditorOpen(false);
  };

  const handleSaveEditor = () => {
    setSaveTrigger((prev) => prev + 1);
  };

  // ─── Condition Rules Editing ────────────────────────────────────────────────

  const openRulesDialog = (flow: ReviewFlow) => {
    setEditingFlow(JSON.parse(JSON.stringify(flow))); // deep copy
    setIsRulesOpen(true);
  };

  const handleAddCondition = () => {
    if (!editingFlow) return;
    const defaultField = customProperties[0]?.key || "";
    const newCondition: FlowCondition = {
      field: defaultField,
      operator: "equals",
      value: "",
    };
    setEditingFlow({
      ...editingFlow,
      conditions: [...editingFlow.conditions, newCondition],
    });
  };

  const handleRemoveCondition = (index: number) => {
    if (!editingFlow) return;
    const nextConditions = editingFlow.conditions.filter((_, i) => i !== index);
    setEditingFlow({ ...editingFlow, conditions: nextConditions });
  };

  const handleConditionChange = (index: number, key: keyof FlowCondition, val: string) => {
    if (!editingFlow) return;
    const nextConditions = editingFlow.conditions.map((c, i) => {
      if (i !== index) return c;
      const updated = { ...c, [key]: val };
      // Reset value if field changes to avoid options mismatch
      if (key === "field") {
        updated.value = "";
      }
      return updated;
    });
    setEditingFlow({ ...editingFlow, conditions: nextConditions });
  };

  const handleSaveRules = () => {
    if (!editingFlow) return;
    const nextFlows = flows.map((f) => (f.id === editingFlow.id ? editingFlow : f));
    setFlows(nextFlows);
    handleSaveAll(nextFlows);
    setIsRulesOpen(false);
    setEditingFlow(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Intro info card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/10 p-4 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">¿Cómo funcionan los flujos condicionales?</p>
          <p>
            Al subir un nuevo plano/documento, Faberdoc analiza los campos dinámicos (como Especialidad o Área)
            y selecciona el primer flujo cuyas condiciones coincidan con la metadata del documento. Si ninguna regla
            coincide, se aplicará el <strong>Flujo de Aprobación Estándar</strong>.
          </p>
        </div>
      </div>

      {/* Read-only notice for non-editors */}
      {!hasEditRights && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/10 p-3.5 flex gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-zinc-400" />
          <span>Solo los administradores y coordinadores del proyecto pueden editar los flujos de revisión.</span>
        </div>
      )}

      {/* Flows Grid */}
      <div className="grid grid-cols-1 gap-4">
        {flows.map((flow) => {
          return (
            <div
              key={flow.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-xs transition-all gap-4"
            >
              {/* Name & Conditions summary */}
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <span className="font-bold text-sm text-zinc-950 dark:text-zinc-50">
                    {flow.name}
                  </span>
                  {flow.isDefault && (
                    <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-zinc-100 text-zinc-600">
                      Fallback
                    </Badge>
                  )}
                </div>

                {/* Conditions badges */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-zinc-400 font-medium mr-1">Condición:</span>
                  {flow.isDefault ? (
                    <span className="text-[11px] italic text-zinc-400">
                      Aplica a todos los documentos (si no hay coincidencia previa)
                    </span>
                  ) : flow.conditions.length === 0 ? (
                    <span className="text-[11px] text-amber-500 font-medium">
                      Sin condiciones (flujo inactivo)
                    </span>
                  ) : (
                    flow.conditions.map((c, i) => {
                      const propLabel = customProperties.find((p) => p.key === c.field)?.label || c.field;
                      const opLabel = c.operator === "equals" ? "es" : "contiene";
                      return (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] font-semibold bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 px-2 py-0.5"
                        >
                          {propLabel} {opLabel} "{c.value || "cualquiera"}"
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {hasEditRights && !flow.isDefault && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs cursor-pointer"
                    onClick={() => openRulesDialog(flow)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Reglas
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs cursor-pointer border-primary/20 text-primary hover:bg-primary/5"
                  onClick={() => openEditor(flow)}
                >
                  <Play className="h-3.5 w-3.5" />
                  {hasEditRights ? "Editar Diagrama" : "Ver Diagrama"}
                </Button>

                {hasEditRights && !flow.isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                    onClick={() => handleDeleteFlow(flow.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Flow Trigger — only for editors */}
      {hasEditRights && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAddFlow}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Crear Flujo de Revisión
          </Button>
        </div>
      )}

      {/* ─── MODAL 1: Diagram Flow Editor ─────────────────────────────────────── */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => { if (!open) handleCancelEditor(); }}>
        <DialogContent className="fixed inset-0 !top-0 !left-0 z-50 flex flex-col !w-screen !h-screen !max-w-none !sm:max-w-none !translate-x-0 !translate-y-0 rounded-none border-none p-6 bg-background">
          <DialogHeader className="shrink-0 mb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-zinc-500" />
              {hasEditRights ? "Editar" : "Ver"} Flujo: <span className="text-primary">{activeFlow?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {hasEditRights
                ? "Modifica el diagrama del flujo utilizando los nodos disponibles en el panel lateral."
                : "Vista de solo lectura del diagrama de revisión del flujo."}
            </DialogDescription>
          </DialogHeader>

          {/* Orphaned reviewers warning */}
          {orphanedReviewers.length > 0 && (
            <div className="shrink-0 flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Revisores sin acceso al proyecto</p>
                <p>
                  Los siguientes revisores fueron removidos del equipo pero sus nodos siguen en este diagrama:{" "}
                  <span className="font-semibold">{orphanedReviewers.join(", ")}</span>.
                  Considera reemplazarlos o eliminarlos del flujo.
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
            {activeFlow && (
              <FlowEditor
                projectId={projectId}
                reviewers={reviewers}
                initialConfig={{ nodes: activeFlow.nodes || [], edges: activeFlow.edges || [] }}
                showSaveButton={false}
                onFlowChange={hasEditRights ? handleUpdateFlowDiagramInMemory : undefined}
                saveTrigger={hasEditRights ? saveTrigger : 0}
                readOnly={!hasEditRights}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 shrink-0 pt-4 mt-2 border-t bg-muted/20 -mx-6 -mb-6 p-4 rounded-b-none">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEditor}
              className="h-9 text-xs cursor-pointer"
            >
              {hasEditRights ? "Cancelar" : "Cerrar"}
            </Button>
            {hasEditRights && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEditor}
                className="h-9 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Guardar Cambios
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: Rules Editor & Conditions — only for editors ──────────────── */}
      <Dialog open={isRulesOpen && hasEditRights} onOpenChange={setIsRulesOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Configurar Reglas del Flujo</DialogTitle>
            <DialogDescription>
              Define las condiciones que debe cumplir la metadata del plano para que aplique este flujo.
            </DialogDescription>
          </DialogHeader>

          {editingFlow && (
            <div className="space-y-4 my-2">
              {/* Flow Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500">Nombre del Flujo</label>
                <Input
                  value={editingFlow.name}
                  onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                  placeholder="Ej: Estructuras Montreal"
                />
              </div>

              {/* Conditions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-semibold text-zinc-500">Condiciones de Activación</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                    className="h-7 text-[10px] gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Agregar Regla
                  </Button>
                </div>

                {editingFlow.conditions.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2 text-center">
                    Sin condiciones. Este flujo no se activará automáticamente a menos que agregues reglas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editingFlow.conditions.map((condition, idx) => {
                      const propDef = customProperties.find((p) => p.key === condition.field);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          {/* Field Select */}
                          <select
                            value={condition.field}
                            onChange={(e) => handleConditionChange(idx, "field", e.target.value)}
                            className="h-8 text-xs rounded-md border bg-white dark:bg-zinc-950 p-1 flex-1 cursor-pointer"
                          >
                            {customProperties.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>

                          {/* Operator */}
                          <select
                            value={condition.operator}
                            onChange={(e) => handleConditionChange(idx, "operator", e.target.value as any)}
                            className="h-8 text-xs rounded-md border bg-white dark:bg-zinc-950 p-1 w-24 cursor-pointer"
                          >
                            <option value="equals">es igual a</option>
                            <option value="contains">contiene</option>
                          </select>

                          {/* Value Input or Select */}
                          {propDef?.options && propDef.options.length > 0 ? (
                            <select
                              value={condition.value}
                              onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                              className="h-8 text-xs rounded-md border bg-white dark:bg-zinc-950 p-1 flex-1 cursor-pointer"
                            >
                              <option value="">Seleccionar valor...</option>
                              {propDef.options.map((opt, i) => {
                                const valStr = typeof opt === "string" ? opt : opt.value;
                                return (
                                  <option key={i} value={valStr}>
                                    {valStr}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <Input
                              value={condition.value}
                              onChange={(e) => handleConditionChange(idx, "value", e.target.value)}
                              placeholder="Valor..."
                              className="h-8 text-xs flex-1"
                            />
                          )}

                          {/* Remove button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCondition(idx)}
                            className="h-8 w-8 text-zinc-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t bg-muted/20 -mx-4 -mb-4 p-4 rounded-b-xl mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRulesOpen(false)}
              className="h-9 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRules}
              className="h-9 text-xs cursor-pointer"
            >
              Guardar Reglas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
