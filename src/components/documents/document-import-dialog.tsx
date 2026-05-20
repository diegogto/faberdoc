"use client";

import { useState, useRef, useEffect } from "react";
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
import { bulkImportDocumentsAction } from "@/app/(dashboard)/projects/[projectId]/mdl/actions";
import type { CustomPropertyDefinition } from "@/lib/types";
import Papa from "papaparse";

interface DocumentImportDialogProps {
  projectId: string;
  projectName: string;
  customPropertiesDef: CustomPropertyDefinition[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "map" | "importing";

export function DocumentImportDialog({
  projectId,
  projectName,
  customPropertiesDef,
  isOpen,
  onClose,
  onSuccess,
}: DocumentImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [skipRows, setSkipRows] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  
  // Datos crudos del CSV parseado
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  
  // Mapeo: clave de Faberdoc -> índice de columna del CSV (como string)
  const [mappings, setMappings] = useState<Record<string, string>>({});
  
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reiniciar diálogo al abrir
  useEffect(() => {
    if (isOpen) {
      setStep("upload");
      setFile(null);
      setCsvData([]);
      setCsvHeaders([]);
      setPreviewRows([]);
      setMappings({});
      setError(null);
      setIsProcessing(false);
      setSkipRows(1);
    }
  }, [isOpen]);

  // Generar y descargar plantilla de CSV personalizada
  const downloadTemplate = () => {
    const headers = [
      "Código de Documento (Opcional)",
      "Título del Documento",
      "Fecha Planificada (AAAA-MM-DD)",
      ...customPropertiesDef.map((p) => p.label),
    ];
    
    const sampleRow = [
      "PROY-EST-001",
      "Plano General de Fundaciones",
      "2026-06-30",
      ...customPropertiesDef.map((p) =>
        p.type === "select" ? p.options?.[0] || "Opción" : "Valor"
      ),
    ];

    const csvContent =
      "\uFEFF" + // BOM para compatibilidad con Excel en UTF-8
      [headers.join(";"), sampleRow.join(";")].join("\n");
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `plantilla_mdl_${safeProjectName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manejar subida de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleParseCSV = () => {
    if (!file) {
      setError("Por favor, selecciona un archivo CSV.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    Papa.parse(file, {
      skipEmptyLines: "greedy",
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length === 0) {
          setError("El archivo CSV está vacío.");
          setIsProcessing(false);
          return;
        }

        // Obtener cabeceras
        const headerIndex = Math.max(0, skipRows - 1);
        const headers = rows[headerIndex] || [];
        
        if (headers.length === 0) {
          setError("No se pudieron detectar cabeceras en la fila indicada.");
          setIsProcessing(false);
          return;
        }

        // Limpiar cabeceras de espacios o caracteres raros
        const cleanedHeaders = headers.map((h, i) => h.trim() || `Columna ${i + 1}`);

        // Filas de datos reales (después de las filas omitidas)
        const dataRows = rows.slice(skipRows);
        if (dataRows.length === 0) {
          setError("No se detectaron filas de datos tras omitir las cabeceras.");
          setIsProcessing(false);
          return;
        }

        setCsvData(dataRows);
        setCsvHeaders(cleanedHeaders);
        // Mostrar primeras 5 filas para vista previa
        setPreviewRows(dataRows.slice(0, 5));

        // Auto-detección inteligente del mapeo
        const initialMappings: Record<string, string> = {};
        
        // Mapear campos base
        const findColumnIndex = (keywords: string[]) => {
          const idx = cleanedHeaders.findIndex((header) =>
            keywords.some((keyword) => header.toLowerCase().includes(keyword))
          );
          return idx >= 0 ? String(idx) : "";
        };

        initialMappings["title"] = findColumnIndex(["título", "titulo", "title", "nombre", "documento"]);
        initialMappings["document_code"] = findColumnIndex(["código", "codigo", "code", "identificador", "nro", "número"]);
        initialMappings["planned_date"] = findColumnIndex(["fecha", "date", "planificada", "planned", "emisión", "emision"]);

        // Mapear campos dinámicos del proyecto
        customPropertiesDef.forEach((prop) => {
          const propLabel = prop.label.toLowerCase();
          const propKey = prop.key.toLowerCase();
          const idx = cleanedHeaders.findIndex((header) => {
            const h = header.toLowerCase();
            return h.includes(propLabel) || h.includes(propKey);
          });
          initialMappings[prop.key] = idx >= 0 ? String(idx) : "";
        });

        setMappings(initialMappings);
        setStep("map");
        setIsProcessing(false);
      },
      error: (err) => {
        console.error("Error al parsear CSV:", err);
        setError(`Error al leer el archivo: ${err.message}`);
        setIsProcessing(false);
      },
    });
  };

  const handleMappingChange = (field: string, csvColIndex: string) => {
    setMappings((prev) => ({
      ...prev,
      [field]: csvColIndex,
    }));
  };

  const handleImport = async () => {
    // Validar mapeo de título (campo obligatorio)
    if (!mappings["title"]) {
      setError("Debes mapear el campo obligatorio: Título del Documento.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep("importing");

    try {
      // Formatear los datos según el mapeo
      const documentsToImport = csvData.map((row) => {
        const titleIndex = Number(mappings["title"]);
        const title = row[titleIndex] || "Documento sin título";

        const codeIndex = mappings["document_code"] ? Number(mappings["document_code"]) : -1;
        const document_code = codeIndex >= 0 ? row[codeIndex]?.trim() : undefined;

        const dateIndex = mappings["planned_date"] ? Number(mappings["planned_date"]) : -1;
        const planned_date = dateIndex >= 0 ? row[dateIndex]?.trim() || null : null;

        // Construir propiedades personalizadas
        const custom_properties: Record<string, any> = {};
        customPropertiesDef.forEach((prop) => {
          const mapIndex = mappings[prop.key] ? Number(mappings[prop.key]) : -1;
          const rawValue = mapIndex >= 0 ? row[mapIndex]?.trim() || "" : "";
          
          if (prop.type === "number") {
            custom_properties[prop.key] = rawValue ? Number(rawValue) : null;
          } else {
            custom_properties[prop.key] = rawValue;
          }
        });

        return {
          title,
          document_code,
          custom_properties,
          planned_date,
        };
      });

      const result = await bulkImportDocumentsAction(projectId, documentsToImport);

      if (result.error) {
        setError(result.error);
        setStep("map");
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error inesperado al importar los documentos.");
      setStep("map");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-[720px] bg-background border-border max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2 border-b border-border/50">
          <DialogTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Importar Documentos desde CSV</span>
            {step === "map" && (
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                {csvData.length} filas detectadas
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md border border-destructive/20 font-medium mt-3">
            {error}
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-5 py-4 flex-1 overflow-y-auto">
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Sube tu listado de documentos en formato <strong>CSV</strong>. Asegúrate de configurar correctamente los separadores y cabeceras.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="text-xs h-8 text-primary border-primary/20 hover:bg-primary/5"
                >
                  Descargar Plantilla CSV
                </Button>
              </div>
            </div>

            {/* Configuración de Filas a omitir */}
            <div className="space-y-1.5 max-w-[240px]">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fila de las Cabeceras (1-indexed)
              </label>
              <Input
                type="number"
                min={1}
                value={skipRows}
                onChange={(e) => setSkipRows(Math.max(1, Number(e.target.value)))}
                className="h-9 text-sm"
              />
              <span className="text-[10px] text-muted-foreground leading-none">
                La cabecera se leerá de esta fila; las filas anteriores se ignorarán.
              </span>
            </div>

            {/* Zona de Arrastre o Selección */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/30 p-8 rounded-lg text-center cursor-pointer transition-all duration-200"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground text-lg">
                  📁
                </div>
                <div className="text-sm font-medium">
                  {file ? file.name : "Selecciona o arrastra tu archivo CSV"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Solo archivos .csv codificados en UTF-8"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MAP & PREVIEW */}
        {step === "map" && (
          <div className="py-3 flex-1 overflow-y-auto space-y-5">
            {/* Sección de Mapeo */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
                Mapeo de Campos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-muted/20 p-3 rounded-lg border border-border/40">
                {/* Título (Obligatorio) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Título del Documento *</span>
                    {!mappings["title"] && <span className="text-[10px] text-destructive uppercase">Requerido</span>}
                  </label>
                  <Select
                    value={mappings["title"] || ""}
                    onValueChange={(val) => handleMappingChange("title", val || "")}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Seleccionar columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Código (Opcional) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Código del Documento</span>
                    <span className="text-[10px] text-muted-foreground">Opcional (Auto-generar si vacío)</span>
                  </label>
                  <Select
                    value={mappings["document_code"] || ""}
                    onValueChange={(val) => handleMappingChange("document_code", val || "")}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Seleccionar columna (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Generar automáticamente --</SelectItem>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha Planificada (Opcional) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                    <span>Fecha Planificada</span>
                    <span className="text-[10px] text-muted-foreground">Opcional</span>
                  </label>
                  <Select
                    value={mappings["planned_date"] || ""}
                    onValueChange={(val) => handleMappingChange("planned_date", val || "")}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Seleccionar columna (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Ninguna --</SelectItem>
                      {csvHeaders.map((header, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Propiedades Dinámicas */}
                {customPropertiesDef.map((prop) => (
                  <div key={prop.key} className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      {prop.label}
                    </label>
                    <Select
                      value={mappings[prop.key] || ""}
                      onValueChange={(val) => handleMappingChange(prop.key, val || "")}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder={`Seleccionar columna para ${prop.label}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Ninguna --</SelectItem>
                        {csvHeaders.map((header, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {/* Vista Previa de Datos */}
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
                Vista Previa de Filas (Primeras 5)
              </h3>
              <div className="border border-border/80 rounded-md overflow-x-auto bg-background/50">
                <table className="min-w-full text-xs font-sans text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/80 border-b border-border/80">
                      {csvHeaders.map((header, i) => (
                        <th key={i} className="p-2 font-semibold text-muted-foreground border-r border-border/40 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        {csvHeaders.map((_, colIdx) => (
                          <td key={colIdx} className="p-2 text-foreground/80 border-r border-border/30 max-w-[200px] truncate">
                            {row[colIdx] || <span className="text-muted-foreground/45 italic">vacío</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: IMPORTING LOADER */}
        {step === "importing" && (
          <div className="py-12 flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-muted/80"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
            </div>
            <div className="text-sm font-medium">Procesando importación masiva...</div>
            <div className="text-xs text-muted-foreground">
              Creando documentos, revisiones iniciales y planificaciones.
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border/50 gap-2 sm:gap-0">
          {step === "upload" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="h-9 text-sm"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleParseCSV}
                disabled={!file || isProcessing}
                className="h-9 text-sm"
              >
                {isProcessing ? "Procesando..." : "Analizar CSV"}
              </Button>
            </>
          )}

          {step === "map" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                disabled={isProcessing}
                className="h-9 text-sm"
              >
                Atrás
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={!mappings["title"] || isProcessing}
                className="h-9 text-sm"
              >
                Confirmar Importación
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
