"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDocumentAction } from "@/app/(dashboard)/projects/[projectId]/mdl/actions";
import type { CustomPropertyDefinition } from "@/lib/types";

interface DocumentCreateDialogProps {
  projectId: string;
  projectName: string;
  customPropertiesDef: CustomPropertyDefinition[];
  namingPattern: string;
  currentCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentCreateDialog({
  projectId,
  projectName,
  customPropertiesDef,
  namingPattern,
  currentCount,
  isOpen,
  onClose,
  onSuccess,
}: DocumentCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [customProps, setCustomProps] = useState<Record<string, string>>({});
  
  // Código personalizado manual
  const [manualCode, setManualCode] = useState("");
  const [isManual, setIsManual] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar propiedades dinámicas por defecto
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setPlannedDate("");
      setError(null);
      setIsManual(false);
      setManualCode("");
      
      const initialProps: Record<string, string> = {};
      customPropertiesDef.forEach((prop) => {
        const firstOpt = prop.options?.[0];
        const valStr = typeof firstOpt === "string" ? firstOpt : firstOpt?.value || "";
        initialProps[prop.key] = prop.type === "select" ? valStr : "";
      });
      setCustomProps(initialProps);
    }
  }, [isOpen, customPropertiesDef]);

  // Generar código de previsualización dinámicamente en cliente
  const getGeneratedCode = () => {
    let code = namingPattern;

    // {PROY}
    const projPrefix = projectName.substring(0, 4).toUpperCase();
    code = code.replace("{PROY}", projPrefix);

    // Helper to get code for an attribute value
    const getAttrCode = (key: string, value: any) => {
      const valStr = String(value || "").trim();
      if (!valStr) return "";
      const def = customPropertiesDef.find((p: any) => p.key.toLowerCase() === key.toLowerCase());
      if (def?.type === "select" && def.options) {
        const opt = def.options.find((o: any) => 
          (typeof o === "string" && o === valStr) || 
          (typeof o === "object" && o !== null && o.value === valStr)
        );
        if (opt && typeof opt === "object" && opt.code) {
          return opt.code.toUpperCase();
        }
      }
      return valStr.toUpperCase();
    };

    // {ESP}
    const specialtyVal = customProps.specialty || customProps.especialidad || "GEN";
    const specialtyCode = getAttrCode("especialidad", specialtyVal) || getAttrCode("specialty", specialtyVal) || "GEN";
    code = code.replace("{ESP}", specialtyCode);

    // {NUM}
    const numStr = String(currentCount + 1).padStart(3, "0");
    code = code.replace("{NUM}", numStr);

    // Reemplazar cualquier otra propiedad personalizada en el patrón
    Object.entries(customProps).forEach(([key, val]) => {
      const placeholder = `{${key.toUpperCase()}}`;
      if (code.includes(placeholder)) {
        const codeVal = getAttrCode(key, val);
        code = code.replace(placeholder, codeVal || "—");
      }
    });

    return code;
  };

  const generatedCode = getGeneratedCode();

  const handleCustomPropChange = (key: string, value: string) => {
    setCustomProps((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("El título es un campo obligatorio.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const finalCode = isManual ? manualCode.trim() : generatedCode;
      
      const result = await createDocumentAction(projectId, {
        title,
        document_code: finalCode,
        custom_properties: customProps,
        planned_date: plannedDate || null,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al crear el documento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Nuevo Documento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Título del Documento *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Planos Eléctricos de Subestación"
              className="h-9 text-sm"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Dynamic Properties */}
          {customPropertiesDef.map((prop) => (
            <div key={prop.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {prop.label}
              </label>
              
              {prop.type === "select" ? (
                <Select
                  value={customProps[prop.key] || ""}
                  onValueChange={(val) => handleCustomPropChange(prop.key, val || "")}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={`Seleccionar ${prop.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {prop.options?.map((opt, idx) => {
                      const valStr = typeof opt === "string" ? opt : opt.value;
                      const displayStr = typeof opt === "string" ? opt : `${opt.value} (${opt.code})`;
                      return (
                        <SelectItem key={idx} value={valStr}>
                          {displayStr}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={prop.type === "number" ? "number" : "text"}
                  value={customProps[prop.key] || ""}
                  onChange={(e) => handleCustomPropChange(prop.key, e.target.value)}
                  placeholder={`Ej: ${prop.label}`}
                  className="h-9 text-sm"
                  disabled={isSubmitting}
                />
              )}
            </div>
          ))}

          {/* Planned Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Fecha Planificada de Emisión
            </label>
            <Input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
          </div>

          {/* Document Code Section */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Código del Documento
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="toggle-manual"
                  checked={isManual}
                  onChange={(e) => {
                    setIsManual(e.target.checked);
                    if (e.target.checked) setManualCode(generatedCode);
                  }}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="toggle-manual"
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                >
                  Personalizar código
                </label>
              </div>
            </div>

            {isManual ? (
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Código personalizado..."
                className="h-9 font-mono text-sm uppercase"
                required
                disabled={isSubmitting}
              />
            ) : (
              <div className="border border-border/50 bg-muted/30 p-2.5 rounded-md flex items-center justify-between">
                <span className="font-mono text-xs text-foreground tracking-wider select-all font-semibold">
                  {generatedCode}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-muted">
                  Auto-generado
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-sm"
            >
              {isSubmitting ? "Creando..." : "Crear Documento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
