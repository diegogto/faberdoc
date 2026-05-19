"use client";

import { useState, useTransition } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "@/app/(dashboard)/projects/actions";

interface EmptyProjectsViewProps {
  isAdmin: boolean;
  userFullName: string;
}

export function EmptyProjectsView({ isAdmin, userFullName }: EmptyProjectsViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
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

      const result = await createProjectAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setProjectName("");
        setIsDialogOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--topbar-height))] px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Animated Icon Container */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse mb-2">
          <FolderKanban className="h-8 w-8" />
        </div>

        {/* Dynamic Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isAdmin ? `¡Bienvenido, ${userFullName}! 👋` : "Sin proyectos asignados"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isAdmin
              ? "Comienza creando tu primer proyecto de ingeniería en Faberdoc para habilitar la nomenclatura inteligente, el Master Delivery List (MDL) y el control documental."
              : "Actualmente no tienes proyectos asignados en tu cuenta. Por favor, ponte en contacto con el administrador de tu organización para que te asigne a un proyecto activo."}
          </p>
        </div>

        {/* Dynamic Call to Action */}
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setProjectName("");
              setError(null);
            }
          }}>
            <DialogTrigger className="inline-flex h-9 gap-1.5 px-4 items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/80 active:translate-y-px transition-all cursor-pointer shadow-sm hover:shadow duration-200">
              <Plus className="h-4 w-4" />
              Crear mi primer proyecto
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateProject}>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                  <DialogDescription>
                    Ingresa el nombre de tu primer proyecto de ingeniería. Se creará con el formato estandarizado de Faberdoc.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name-landing" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nombre del Proyecto
                    </label>
                    <Input
                      id="name-landing"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Ej. Proyecto Central Hidroeléctrica, Edificio Central..."
                      disabled={isPending}
                      autoFocus
                    />
                    {error && (
                      <p className="text-xs font-medium text-destructive mt-1">
                        {error}
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
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
          </Dialog>
        )}
      </div>
    </div>
  );
}
