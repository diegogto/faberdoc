"use client";

import { useState, useTransition } from "react";
import { createProjectAction } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CreateProjectDialogContentProps {
  onClose: () => void;
  description?: string;
}

export function CreateProjectDialogContent({
  onClose,
  description = "Ingresa el nombre del proyecto. Se creará con la codificación estándar y especialidades predefinidas.",
}: CreateProjectDialogContentProps) {
  const [projectName, setProjectName] = useState("");
  const [versioningLogic, setVersioningLogic] = useState("MIXED");
  const [reviewFlowType, setReviewFlowType] = useState("PARALLEL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError("El nombre del proyecto es requerido.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", projectName.trim());
      formData.append("versioning_logic", versioningLogic);
      formData.append("review_flow_type", reviewFlowType);

      const result = await createProjectAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setProjectName("");
        onClose();
      }
    });
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <form onSubmit={handleCreateProject}>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="project-name-input"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Nombre del Proyecto
            </label>
            <Input
              id="project-name-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej. Edificio Costanera, Planta Solar..."
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="project-versioning-select"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Lógica de Versionamiento
            </label>
            <select
              id="project-versioning-select"
              value={versioningLogic}
              onChange={(e) => setVersioningLogic(e.target.value)}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            >
              <option value="MIXED" className="text-zinc-900">MIXED (Letras borrador, Números emitido)</option>
              <option value="SEPARATE_EMISSION" className="text-zinc-900">SEPARATE EMISSION (Números con emisión manual)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="project-review-flow-select"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Flujo de Revisión Interna
            </label>
            <select
              id="project-review-flow-select"
              value={reviewFlowType}
              onChange={(e) => setReviewFlowType(e.target.value)}
              disabled={isPending}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50"
            >
              <option value="PARALLEL" className="text-zinc-900">Paralela (Simultánea)</option>
              <option value="SEQUENTIAL" className="text-zinc-900">Subsecuente / Secuencial</option>
            </select>
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive mt-1">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear Proyecto"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
