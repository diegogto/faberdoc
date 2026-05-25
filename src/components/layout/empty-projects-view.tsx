"use client";

import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateProjectDialogContent } from "./create-project-dialog-content";

interface EmptyProjectsViewProps {
  isAdmin: boolean;
  userFullName: string;
}

export function EmptyProjectsView({ isAdmin, userFullName }: EmptyProjectsViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger className="inline-flex h-9 gap-1.5 px-4 items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/80 active:translate-y-px transition-all cursor-pointer shadow-sm hover:shadow duration-200">
              <Plus className="h-4 w-4" />
              Crear mi primer proyecto
            </DialogTrigger>

            <CreateProjectDialogContent
              onClose={() => setIsDialogOpen(false)}
              description="Ingresa el nombre de tu primer proyecto de ingeniería. Se creará con el formato estandarizado de Faberdoc."
            />
          </Dialog>
        )}
      </div>
    </div>
  );
}
