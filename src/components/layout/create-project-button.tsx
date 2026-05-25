"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { CreateProjectDialogContent } from "./create-project-dialog-content";

export function CreateProjectButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="inline-flex h-9 gap-1.5 px-4 items-center justify-center rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:translate-y-px transition-all cursor-pointer shadow-sm hover:shadow duration-200">
        <Plus className="h-4 w-4" />
        Nuevo Proyecto
      </DialogTrigger>
      <CreateProjectDialogContent
        onClose={() => setIsOpen(false)}
        description="Ingresa el nombre del proyecto de ingeniería para comenzar a estructurar el control documental."
      />
    </Dialog>
  );
}
