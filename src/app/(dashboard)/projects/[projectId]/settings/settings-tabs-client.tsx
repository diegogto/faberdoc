"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsForm } from "./settings-form";
import { ProjectTeamPanel } from "./project-team-panel";
import { FlowConfigManager } from "@/components/flow-editor/FlowConfigManager";
import { ProjectClientsPanel } from "./project-clients-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { updateProjectAttributesAction } from "@/app/(dashboard)/projects/actions";
import {
  Building,
  Settings,
  ListFilter,
  Users,
  GitBranch,
  Shield,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  Upload
} from "lucide-react";

interface SettingsTabsClientProps {
  projectId: string;
  project: any;
  currentUserId: string;
  currentUserOrgId: string | null;
  isCurrentUserAdmin: boolean;
  members: any[];
  orgMembers: any[];
  clients: any[];
  customProperties: any[];
  flowReviewers: any[];
  existingFlows: any;
}

interface CustomPropertyDef {
  key: string;
  label: string;
  type: string;
  options?: Array<{ value: string; code: string } | string>;
}

function HelpModal({ title, content }: { title: string; content: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 shrink-0"
        title="Ayuda y documentación"
      >
        <HelpCircle className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 font-sans">
            <HelpCircle className="h-4.5 w-4.5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mt-3 leading-relaxed font-sans border-t border-border pt-3">
          {typeof content === "string" ? (
            <div className="whitespace-pre-line">{content}</div>
          ) : (
            content
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsTabsClient({
  projectId,
  project,
  currentUserId,
  currentUserOrgId,
  isCurrentUserAdmin,
  members,
  orgMembers,
  clients,
  customProperties,
  flowReviewers,
  existingFlows,
}: SettingsTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "general";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Attributes states
  const [attributes, setAttributes] = useState<CustomPropertyDef[]>(customProperties);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAttr, setSelectedAttr] = useState<CustomPropertyDef | null>(null);

  // Import attributes states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "map" | "preview">("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCsvRows, setImportCsvRows] = useState<any[][]>([]);
  const [importCsvHeaders, setImportCsvHeaders] = useState<string[]>([]);
  const [importMappings, setImportMappings] = useState<Record<string, string>>({
    label: "",
    key: "",
    type: "",
    options: "",
  });
  const [parsedAttrs, setParsedAttrs] = useState<CustomPropertyDef[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Forms states for creation/edition
  const [attrLabel, setAttrLabel] = useState("");
  const [attrKey, setAttrKey] = useState("");
  const [attrType, setAttrType] = useState("text");
  const [attrOptions, setAttrOptions] = useState<Array<{ value: string; code: string }>>([]);
  const [optionValue, setOptionValue] = useState("");
  const [optionCode, setOptionCode] = useState("");
  const [attrError, setAttrError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleDownloadAttributesTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = [
        {
          "Nombre del Atributo": "Especialidad",
          "Clave del Atributo": "especialidad",
          "Tipo de Atributo": "Selección",
          "Opciones (Valor:Código separados por comas)": "Estructuras:EST, Civil:CIV, Mecánica:MEC, Electricidad:ELE, Procesos:PRO"
        },
        {
          "Nombre del Atributo": "Área de Trabajo",
          "Clave del Atributo": "area",
          "Tipo de Atributo": "Texto",
          "Opciones (Valor:Código separados por comas)": ""
        },
        {
          "Nombre del Atributo": "Número Correlativo",
          "Clave del Atributo": "num",
          "Tipo de Atributo": "Número",
          "Opciones (Valor:Código separados por comas)": ""
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Atributos");
      XLSX.writeFile(workbook, "plantilla_atributos.xlsx");
    } catch (err) {
      console.error("Error al descargar plantilla:", err);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);
    setParsedAttrs([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import("xlsx");
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
          setImportError("El archivo está vacío o no es válido.");
          return;
        }

        const headers = rows[0].map((h, i) => String(h || "").trim() || `Columna ${i + 1}`);
        setImportCsvHeaders(headers);
        setImportCsvRows(rows.slice(1));

        // Auto-detect columns intelligently
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        const findCol = (keywords: string[]) => {
          const idx = lowerHeaders.findIndex((h) => keywords.some((kw) => h.includes(kw)));
          return idx >= 0 ? String(idx) : "";
        };

        setImportMappings({
          label: findCol(["nombre", "label", "título", "titulo", "atributo"]),
          key: findCol(["clave", "key", "identificador", "código", "codigo"]),
          type: findCol(["tipo", "type"]),
          options: findCol(["opcion", "valores", "choices", "options"]),
        });

        setImportStep("map");
      } catch (err) {
        console.error("Error al procesar archivo:", err);
        setImportError("Hubo un error al leer el archivo. Intenta de nuevo.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (field: string, indexStr: string) => {
    setImportMappings((prev) => ({
      ...prev,
      [field]: indexStr,
    }));
  };

  const handleProcessMappings = () => {
    setImportError(null);
    if (!importMappings.label) {
      setImportError("Debes seleccionar la columna correspondiente al Nombre del Atributo.");
      return;
    }
    if (!importMappings.type) {
      setImportError("Debes seleccionar la columna correspondiente al Tipo de Atributo.");
      return;
    }

    try {
      const attributesList: CustomPropertyDef[] = [];
      const labelIdx = Number(importMappings.label);
      const keyIdx = importMappings.key ? Number(importMappings.key) : -1;
      const typeIdx = Number(importMappings.type);
      const optionsIdx = importMappings.options ? Number(importMappings.options) : -1;

      importCsvRows.forEach((row) => {
        if (!row || row.length === 0) return;

        const rawName = String(row[labelIdx] || "").trim();
        const rawKey = keyIdx >= 0 ? String(row[keyIdx] || "").trim() : "";
        const rawType = String(row[typeIdx] || "").trim().toLowerCase();
        const rawOptions = optionsIdx >= 0 ? String(row[optionsIdx] || "").trim() : "";

        if (!rawName) return;

        const key = rawKey ? cleanKey(rawKey) : cleanKey(rawName);
        if (!key) return;

        let type: "text" | "select" | "number" = "text";
        if (rawType.includes("selec") || rawType.includes("dropdown") || rawType.includes("lista")) {
          type = "select";
        } else if (rawType.includes("num")) {
          type = "number";
        }

        let options: Array<{ value: string; code: string }> | undefined = undefined;
        if (type === "select" && rawOptions) {
          options = rawOptions
            .split(",")
            .map((opt) => {
              const parts = opt.split(":");
              const val = parts[0]?.trim();
              const code = parts[1]?.trim() || val.substring(0, 3).toUpperCase();
              return { value: val, code: code.toUpperCase().replace(/[^A-Z0-9]/g, "") };
            })
            .filter((opt) => !!opt.value && !!opt.code);
        }

        if (!attributesList.some((attr) => attr.key === key)) {
          attributesList.push({
            key,
            label: rawName,
            type,
            options,
          });
        }
      });

      if (attributesList.length === 0) {
        setImportError("No se encontraron atributos válidos tras aplicar el mapeo.");
      } else {
        setParsedAttrs(attributesList);
        setImportStep("preview");
      }
    } catch (err) {
      console.error("Error al procesar mapeo:", err);
      setImportError("Hubo un error al procesar las columnas mapeadas.");
    }
  };

  const handleConfirmImportAttributes = () => {
    if (parsedAttrs.length === 0) return;

    startTransition(async () => {
      let mergedList = [...attributes];
      parsedAttrs.forEach((newAttr) => {
        const idx = mergedList.findIndex((a) => a.key === newAttr.key);
        if (idx >= 0) {
          mergedList[idx] = newAttr;
        } else {
          mergedList.push(newAttr);
        }
      });

      const res = await updateProjectAttributesAction(projectId, mergedList);
      if (res.error) {
        setImportError(res.error);
      } else {
        setAttributes(mergedList);
        setIsImportOpen(false);
        setImportFile(null);
        setParsedAttrs([]);
        setImportStep("upload");
      }
    });
  };

  // Role evaluations
  const currentUserMember = members.find((m) => m.user_id === currentUserId);
  const isProjectCoordinator =
    currentUserMember?.role === "COORDINATOR" || currentUserMember?.role === "ADMIN";
  const hasEditRights = isCurrentUserAdmin || isProjectCoordinator;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`?tab=${value}`, { scroll: false });
  };

  const cleanKey = (val: string) => {
    return val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    setAttrLabel(label);
    if (!selectedAttr) {
      // Auto-suggest key only when creating a new attribute
      setAttrKey(cleanKey(label));
    }
  };

  const handleAddOption = () => {
    const val = optionValue.trim();
    const code = optionCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!val || !code) {
      setAttrError("Tanto el valor como el código son requeridos.");
      return;
    }

    if (attrOptions.some((opt) => opt.value.toLowerCase() === val.toLowerCase())) {
      setAttrError("Este valor ya está ingresado.");
      return;
    }

    if (attrOptions.some((opt) => opt.code === code)) {
      setAttrError("Este código ya está en uso.");
      return;
    }

    setAttrOptions([...attrOptions, { value: val, code }]);
    setOptionValue("");
    setOptionCode("");
    setAttrError(null);
  };

  const handleRemoveOption = (index: number) => {
    setAttrOptions(attrOptions.filter((_, i) => i !== index));
  };

  const handleUpdateOption = (index: number, field: "value" | "code", val: string) => {
    setAttrOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== index) return opt;
        return {
          ...opt,
          [field]: field === "code" ? val.toUpperCase().replace(/[^A-Z0-9]/g, "") : val,
        };
      })
    );
  };

  const handleSaveAttribute = () => {
    setAttrError(null);

    if (!attrLabel.trim()) {
      setAttrError("El nombre del atributo es requerido.");
      return;
    }

    if (!attrKey.trim()) {
      setAttrError("La clave del atributo es requerida.");
      return;
    }

    if (attrType === "select") {
      if (attrOptions.length === 0) {
        setAttrError("Un atributo de selección debe tener al menos una opción.");
        return;
      }

      // Validate inline edits
      if (attrOptions.some((o) => !o.value.trim() || !o.code.trim())) {
        setAttrError("Todos los valores y códigos de las opciones son obligatorios.");
        return;
      }

      const values = attrOptions.map((o) => o.value.trim().toLowerCase());
      const codes = attrOptions.map((o) => o.code.trim().toUpperCase());
      const hasDuplicateValue = new Set(values).size !== values.length;
      const hasDuplicateCode = new Set(codes).size !== codes.length;

      if (hasDuplicateValue) {
        setAttrError("Hay valores duplicados en las opciones.");
        return;
      }
      if (hasDuplicateCode) {
        setAttrError("Hay códigos duplicados en las opciones.");
        return;
      }
    }

    startTransition(async () => {
      let updatedList = [...attributes];

      if (selectedAttr) {
        // Edit Mode
        updatedList = updatedList.map((attr) =>
          attr.key === selectedAttr.key
            ? { ...attr, label: attrLabel.trim(), type: attrType, options: attrType === "select" ? attrOptions : undefined }
            : attr
        );
      } else {
        // Create Mode
        if (attributes.some((attr) => attr.key === attrKey)) {
          setAttrError("Ya existe un atributo con esta clave.");
          return;
        }
        updatedList.push({
          key: attrKey,
          label: attrLabel.trim(),
          type: attrType,
          options: attrType === "select" ? attrOptions : undefined,
        });
      }

      const res = await updateProjectAttributesAction(projectId, updatedList);
      if (res.error) {
        setAttrError(res.error);
      } else {
        setAttributes(updatedList);
        setIsAddOpen(false);
        setIsEditOpen(false);
        setSelectedAttr(null);
      }
    });
  };

  const handleDeleteAttribute = (key: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este atributo del proyecto? Se perderán las referencias guardadas en los planos del MDL.")) {
      return;
    }

    startTransition(async () => {
      const updatedList = attributes.filter((attr) => attr.key !== key);
      const res = await updateProjectAttributesAction(projectId, updatedList);
      if (res.error) {
        alert(res.error);
      } else {
        setAttributes(updatedList);
      }
    });
  };

  const openAddModal = () => {
    setAttrLabel("");
    setAttrKey("");
    setAttrType("text");
    setAttrOptions([]);
    setOptionValue("");
    setOptionCode("");
    setAttrError(null);
    setSelectedAttr(null);
    setIsAddOpen(true);
  };

  const openEditModal = (attr: CustomPropertyDef) => {
    setSelectedAttr(attr);
    setAttrLabel(attr.label);
    setAttrKey(attr.key);
    setAttrType(attr.type);
    const mapped = (attr.options || []).map((o) => {
      if (typeof o === "string") {
        return { value: o, code: o.substring(0, 3).toUpperCase() };
      }
      return { value: o.value, code: o.code.toUpperCase() };
    });
    setAttrOptions(mapped);
    setOptionValue("");
    setOptionCode("");
    setAttrError(null);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 rounded-none mb-6 gap-2">
          <TabsTrigger value="general" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="naming" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <ListFilter className="h-4 w-4 mr-2" />
            Nomenclatura
          </TabsTrigger>
          <TabsTrigger value="clients" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Building className="h-4 w-4 mr-2" />
            Receptores
          </TabsTrigger>
          <TabsTrigger value="team" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Users className="h-4 w-4 mr-2" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="flows" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <GitBranch className="h-4 w-4 mr-2" />
            Flujos
          </TabsTrigger>
          <TabsTrigger value="attributes" className="px-4 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            <Shield className="h-4 w-4 mr-2" />
            Atributos
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="general" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Información General</h2>
                <HelpModal
                  title="Ayuda: Información General"
                  content={`Detalles principales y ubicación del proyecto. 

- Ubicación: Puedes ingresar una dirección o coordenadas decimales (lat, lon) y hacer clic en 'Validar Geolocalización' para autocompletar la comuna, región y país. Los campos resueltos son completamente editables.
- Descripción: Campo multilínea con pestañas para formatear la descripción utilizando marcas HTML básicas de forma segura y sanitizada contra inyecciones XSS.`}
                />
              </div>
              <SettingsForm project={project} mode="general" />
            </div>
          </TabsContent>

          <TabsContent value="naming" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Nomenclatura y Versionamiento</h2>
                <HelpModal
                  title="Ayuda: Nomenclatura y Versionamiento"
                  content={`Configura las reglas de generación de código, versionamiento y mapeos de emisión para el proyecto.

- Estructura del Código: Constructor visual mediante fichas (chips). Puedes arrastrar campos de atributos y correlativos o agregar textos manuales.
- Lógicas de Versionamiento:
  - Clásico: Combina letras (para emisiones informativas) y números (para emisiones aprobadas/IFC) calculados secuencialmente. Puedes personalizar la letra y el número inicial.
  - Moderno: Usa correlativos numéricos en todas las emisiones e incorpora un código descriptor del transmittal (ej. IFC).
- Formato de Código Emitido: Constructor visual por chips para definir el patrón final del plano emitido.`}
                />
              </div>
              <SettingsForm project={project} mode="naming" />
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Organizaciones Receptoras</h2>
                <HelpModal
                  title="Ayuda: Organizaciones Receptoras"
                  content={`Administra las empresas destinatarias externas del proyecto.

- Clientes y Subcontratos: Clasifica las conexiones. Los miembros de estas empresas solo podrán acceder a los documentos emitidos para ellos a través de Transmittals.
- Gestión de Usuarios: Permite que los administradores de la organización receptora administren sus propios usuarios en el proyecto, o agrega usuarios de las empresas vinculadas directamente.`}
                />
              </div>
              <ProjectClientsPanel
                projectId={projectId}
                clients={clients}
                isCurrentUserAdmin={isCurrentUserAdmin}
                isProjectCoordinator={isProjectCoordinator}
                currentUserId={currentUserId}
                currentUserOrgId={currentUserOrgId}
                members={members}
              />
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Equipo del Proyecto</h2>
                <HelpModal
                  title="Ayuda: Equipo del Proyecto"
                  content={
                    <div className="space-y-4">
                      <p>Administración del personal interno que participa en el proyecto.</p>
                      
                      <div className="space-y-2.5 pt-2">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Descripción de Roles:</p>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold shrink-0 mt-0.5 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/30">
                              Admin
                            </Badge>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Control total del proyecto y su equipo</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold shrink-0 mt-0.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30">
                              Coordinador
                            </Badge>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Sube archivos y gestiona el estado de documentos</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold shrink-0 mt-0.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                              Revisor
                            </Badge>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Revisa, aprueba o comenta documentos</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold shrink-0 mt-0.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30">
                              Aprobador
                            </Badge>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Aprueba documentos como representante del cliente</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-[10px] font-semibold shrink-0 mt-0.5 bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-800">
                              Observador
                            </Badge>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Solo puede ver y descargar</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                />
              </div>
              <ProjectTeamPanel
                projectId={projectId}
                currentUserId={currentUserId}
                isCurrentUserAdmin={isCurrentUserAdmin}
                isProjectCoordinator={isProjectCoordinator}
                members={members}
                orgMembers={orgMembers}
              />
            </div>
          </TabsContent>

          <TabsContent value="flows" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Flujos de Revisión y Aprobación</h2>
                <HelpModal
                  title="Ayuda: Flujos de Revisión"
                  content={`Configura reglas avanzadas para enrutar las revisiones de documentos de forma secuencial o paralela según las propiedades seleccionadas.`}
                />
              </div>
              <FlowConfigManager
                projectId={projectId}
                customProperties={customProperties}
                reviewers={flowReviewers}
                initialFlows={existingFlows}
              />
            </div>
          </TabsContent>

          <TabsContent value="attributes" className="space-y-4">
            <div className="bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Atributos del Proyecto</h2>
                </div>
                <div className="flex items-center gap-2">
                  {hasEditRights && (
                    <>
                      <Button onClick={() => setIsImportOpen(true)} variant="outline" size="sm" className="h-8 text-xs cursor-pointer gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        Importar Atributos
                      </Button>
                      <Button onClick={openAddModal} size="sm" className="h-8 text-xs cursor-pointer gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Agregar Atributo
                      </Button>
                    </>
                  )}
                  <HelpModal
                    title="Ayuda: Atributos del Proyecto"
                    content={`Propiedades de metadatos personalizadas asociadas a los planos y documentos del proyecto.

- Tipo Texto: Permite el ingreso de caracteres libres.
- Tipo Selección: Permite configurar una lista cerrada de opciones admisibles (por ejemplo: códigos de especialidades o sub-áreas).`}
                  />
                </div>
              </div>

              {/* Attributes Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-3">Nombre del Atributo</th>
                      <th className="p-3 w-40">Clave del Atributo</th>
                      <th className="p-3 w-28">Tipo</th>
                      <th className="p-3">Opciones</th>
                      {hasEditRights && <th className="p-3 w-24 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attributes.map((attr) => (
                      <tr key={attr.key} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="p-3 font-semibold text-foreground">{attr.label}</td>
                        <td className="p-3"><code className="font-mono text-zinc-500 bg-muted/60 px-1.5 py-0.5 rounded text-[10px]">{attr.key}</code></td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {attr.type === "select" ? "Selección" : "Texto"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {attr.type === "select" && attr.options && attr.options.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {attr.options.map((opt, i) => {
                                const valStr = typeof opt === "string" ? opt : opt.value;
                                const codeStr = typeof opt === "string" ? null : opt.code;
                                return (
                                  <Badge key={i} variant="outline" className="text-[10px] bg-white dark:bg-zinc-900 gap-1.5 py-0.5">
                                    <span>{valStr}</span>
                                    {codeStr && (
                                      <code className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1 py-0.2 rounded font-bold">
                                        {codeStr}
                                      </code>
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">Texto libre</span>
                          )}
                        </td>
                        {hasEditRights && (
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-foreground cursor-pointer"
                                onClick={() => openEditModal(attr)}
                                disabled={isPending}
                                title="Editar atributo"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-red-500 cursor-pointer"
                                onClick={() => handleDeleteAttribute(attr.key)}
                                disabled={isPending}
                                title="Eliminar atributo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {attributes.length === 0 && (
                      <tr>
                        <td colSpan={hasEditRights ? 5 : 4} className="p-8 text-center text-zinc-400 italic">
                          No hay atributos personalizados definidos para este proyecto.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Add / Edit Attribute Modal */}
      {(isAddOpen || isEditOpen) && (
        <Dialog open={isAddOpen || isEditOpen} onOpenChange={() => { setIsAddOpen(false); setIsEditOpen(false); }}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 font-sans">
                {selectedAttr ? "Editar Atributo del Proyecto" : "Agregar Atributo al Proyecto"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Define las propiedades personalizadas de metadatos aplicadas a los planos del proyecto.
              </DialogDescription>
            </DialogHeader>

            {attrError && (
              <div className="p-2.5 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
                {attrError}
              </div>
            )}

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label htmlFor="attr-label" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nombre del Atributo
                </label>
                <Input
                  id="attr-label"
                  placeholder="Ej: Especialidad o Sub-Área"
                  value={attrLabel}
                  onChange={handleLabelChange}
                  disabled={isPending}
                  required
                  className="bg-white dark:bg-zinc-950 text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="attr-key" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Clave del Atributo
                </label>
                <Input
                  id="attr-key"
                  placeholder="ej: especialidad"
                  value={attrKey}
                  onChange={(e) => setAttrKey(cleanKey(e.target.value))}
                  disabled={isPending || !!selectedAttr} // Key cannot be edited after creation
                  required
                  className="font-mono bg-white dark:bg-zinc-950 text-xs h-9 disabled:opacity-60"
                />
                <p className="text-[10px] text-zinc-400">
                  Identificador técnico único en minúsculas y sin espacios.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="attr-type-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tipo de Atributo
                </label>
                <select
                  id="attr-type-select"
                  value={attrType}
                  onChange={(e) => {
                    setAttrType(e.target.value);
                    if (e.target.value === "text") setAttrOptions([]);
                  }}
                  disabled={isPending}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                >
                  <option value="text" className="text-zinc-900">Texto Libre (Ingreso libre por teclado)</option>
                  <option value="select" className="text-zinc-900">Selección (Lista de opciones predefinidas)</option>
                </select>
              </div>

              {attrType === "select" && (
                <div className="border border-border p-3 rounded-lg space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                    Opciones de Selección
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Valor (ej: Estructuras)"
                      value={optionValue}
                      onChange={(e) => setOptionValue(e.target.value)}
                      disabled={isPending}
                      className="bg-white dark:bg-zinc-950 text-xs h-8"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Código (ej: EST)"
                        value={optionCode}
                        onChange={(e) => setOptionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                        disabled={isPending}
                        className="bg-white dark:bg-zinc-950 text-xs h-8 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddOption}
                        disabled={isPending}
                        className="h-8 text-xs cursor-pointer px-2.5 shrink-0"
                      >
                        Añadir
                      </Button>
                    </div>
                  </div>

                  {/* Valor / Código Table */}
                  <div className="border border-border rounded-md overflow-hidden bg-white dark:bg-zinc-950 max-h-44 overflow-y-auto relative">
                    <table className="w-full text-left text-[11px] border-separate border-spacing-0">
                      <thead>
                        <tr className="text-muted-foreground font-semibold">
                          <th className="p-2 border-b border-border bg-zinc-100 dark:bg-zinc-900 sticky top-0 z-10">Valor</th>
                          <th className="p-2 w-28 border-b border-border bg-zinc-100 dark:bg-zinc-900 font-mono sticky top-0 z-10">Código</th>
                          <th className="p-2 w-10 border-b border-border bg-zinc-100 dark:bg-zinc-900 text-right sticky top-0 z-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attrOptions.map((opt, index) => (
                          <tr key={index} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/10">
                            <td className="p-1 border-b border-border">
                              <Input
                                value={opt.value}
                                onChange={(e) => handleUpdateOption(index, "value", e.target.value)}
                                disabled={isPending}
                                className="bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring h-7 text-xs px-1.5 py-0 w-full"
                              />
                            </td>
                            <td className="p-1 border-b border-border">
                              <Input
                                value={opt.code}
                                onChange={(e) => handleUpdateOption(index, "code", e.target.value)}
                                disabled={isPending}
                                className="font-mono bg-transparent border-0 focus-visible:ring-1 focus-visible:ring-ring h-7 text-xs px-1.5 py-0 w-full uppercase"
                              />
                            </td>
                            <td className="p-1 border-b border-border text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                disabled={isPending}
                                title="Eliminar opción"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {attrOptions.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-zinc-400 italic">
                              No hay opciones agregadas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                disabled={isPending}
                className="h-8 text-xs px-4"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveAttribute}
                disabled={isPending}
                className="h-8 text-xs px-4 gap-1.5"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Import Attributes Modal */}
      {isImportOpen && (
        <Dialog
          open={isImportOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsImportOpen(false);
              setImportFile(null);
              setImportStep("upload");
              setImportCsvRows([]);
              setImportCsvHeaders([]);
              setImportMappings({ label: "", key: "", type: "", options: "" });
              setParsedAttrs([]);
              setImportError(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-border rounded-xl p-6 shadow-xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold flex items-center gap-1.5 font-sans">
                Importar Atributos del Proyecto
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {importStep === "upload" && "Carga un archivo Excel (.xlsx) o CSV con el listado de atributos."}
                {importStep === "map" && "Mapea las columnas del archivo importado con las propiedades requeridas por el sistema."}
                {importStep === "preview" && "Revisa la vista previa de los atributos antes de confirmar su importación."}
              </DialogDescription>
            </DialogHeader>

            {importError && (
              <div className="p-2.5 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
                {importError}
              </div>
            )}

            <div className="space-y-4 py-3 flex-1 overflow-y-auto min-h-0">
              {/* STEP 1: UPLOAD */}
              {importStep === "upload" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10 p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Descarga la plantilla</p>
                      <p className="text-[10px] text-zinc-400">Plantilla oficial con columnas sugeridas</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAttributesTemplate}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Descargar Excel
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Subir Archivo (.csv, .xlsx)
                    </label>
                    <div className="border border-input rounded-md p-2 bg-white dark:bg-zinc-950">
                      <input
                        type="file"
                        accept=".csv, .xlsx"
                        onChange={handleImportFileChange}
                        className="text-xs w-full cursor-pointer focus:outline-none file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: COLUMN MAPPING */}
              {importStep === "map" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Nombre del Atributo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importMappings.label}
                      onChange={(e) => handleMappingChange("label", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                    >
                      <option value="" className="text-zinc-900">-- Selecciona una columna --</option>
                      {importCsvHeaders.map((header, idx) => (
                        <option key={idx} value={String(idx)} className="text-zinc-900">
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Clave del Atributo (Opcional - se genera a partir del nombre)
                    </label>
                    <select
                      value={importMappings.key}
                      onChange={(e) => handleMappingChange("key", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                    >
                      <option value="" className="text-zinc-900">-- Autogenerar a partir del Nombre --</option>
                      {importCsvHeaders.map((header, idx) => (
                        <option key={idx} value={String(idx)} className="text-zinc-900">
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Tipo de Atributo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importMappings.type}
                      onChange={(e) => handleMappingChange("type", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                    >
                      <option value="" className="text-zinc-900">-- Selecciona una columna --</option>
                      {importCsvHeaders.map((header, idx) => (
                        <option key={idx} value={String(idx)} className="text-zinc-900">
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Opciones (Opcional - para tipo Selección)
                    </label>
                    <select
                      value={importMappings.options}
                      onChange={(e) => handleMappingChange("options", e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
                    >
                      <option value="" className="text-zinc-900">-- Ninguna / No mapear --</option>
                      {importCsvHeaders.map((header, idx) => (
                        <option key={idx} value={String(idx)} className="text-zinc-900">
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW */}
              {importStep === "preview" && parsedAttrs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Vista Previa de Atributos ({parsedAttrs.length})
                  </p>
                  <div className="border border-border rounded-md overflow-hidden bg-white dark:bg-zinc-950 max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                          <th className="p-1.5">Nombre</th>
                          <th className="p-1.5 w-24">Clave</th>
                          <th className="p-1.5 w-20">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parsedAttrs.map((attr) => (
                          <tr key={attr.key} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10">
                            <td className="p-1.5 font-medium text-foreground">{attr.label}</td>
                            <td className="p-1.5 font-mono text-zinc-500">{attr.key}</td>
                            <td className="p-1.5 capitalize text-zinc-600 dark:text-zinc-300">
                              {attr.type === "select" ? "selección" : attr.type === "number" ? "número" : "texto"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-border mt-2">
              {importStep === "upload" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportFile(null);
                    setImportError(null);
                  }}
                  disabled={isPending}
                  className="h-8 text-xs px-4 cursor-pointer"
                >
                  Cancelar
                </Button>
              )}

              {importStep === "map" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportStep("upload");
                      setImportFile(null);
                      setImportError(null);
                    }}
                    disabled={isPending}
                    className="h-8 text-xs px-4 cursor-pointer"
                  >
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    onClick={handleProcessMappings}
                    disabled={isPending}
                    className="h-8 text-xs px-4 gap-1.5 cursor-pointer"
                  >
                    Procesar y Continuar
                  </Button>
                </>
              )}

              {importStep === "preview" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportStep("map");
                      setImportError(null);
                    }}
                    disabled={isPending}
                    className="h-8 text-xs px-4 cursor-pointer"
                  >
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmImportAttributes}
                    disabled={isPending || parsedAttrs.length === 0}
                    className="h-8 text-xs px-4 gap-1.5 cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Importar Atributos"
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
