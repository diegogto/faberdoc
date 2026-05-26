"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { updateProjectSettingsAction } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, GripVertical, HelpCircle, Eye } from "lucide-react";

interface SettingsFormProps {
  project: {
    id: string;
    name: string;
    naming_pattern: string;
    versioning_logic: string;
    review_flow_config: any;
    custom_properties_definition: any;
  };
}

interface Token {
  id: string;
  type: "tag" | "text";
  value: string;
}

function parsePattern(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let textBuffer = "";

  while (i < pattern.length) {
    if (pattern[i] === "{") {
      if (textBuffer) {
        tokens.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "text",
          value: textBuffer,
        });
        textBuffer = "";
      }
      let tagVal = "";
      i++; // skip {
      while (i < pattern.length && pattern[i] !== "}") {
        tagVal += pattern[i];
        i++;
      }
      if (tagVal) {
        tokens.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "tag",
          value: tagVal,
        });
      }
      i++; // skip }
    } else {
      textBuffer += pattern[i];
      i++;
    }
  }

  if (textBuffer) {
    tokens.push({
      id: Math.random().toString(36).substring(2, 9),
      type: "text",
      value: textBuffer,
    });
  }

  return tokens;
}

function serializeTokens(tokens: Token[]): string {
  return tokens
    .map((t) => (t.type === "tag" ? `{${t.value}}` : t.value))
    .join("");
}

interface NamingOption {
  key: string;
  label: string;
}

const getAvailableOptions = (customProps: any[]): NamingOption[] => {
  const defaults = [
    { key: "PROY", label: "Código de Proyecto" },
    { key: "NUM", label: "Correlativo Numérico" },
  ];
  
  const custom = (customProps || []).map((prop: any) => ({
    key: prop.key,
    label: prop.label || prop.key,
  }));

  const uniqueKeys = new Set(defaults.map((d) => d.key));
  const uniqueCustom = custom.filter((c) => {
    if (uniqueKeys.has(c.key)) return false;
    uniqueKeys.add(c.key);
    return true;
  });

  return [...defaults, ...uniqueCustom];
};

export function SettingsForm({ project }: SettingsFormProps) {
  const [name, setName] = useState(project.name);
  const [namingPattern, setNamingPattern] = useState(project.naming_pattern);
  const [versioningLogic, setVersioningLogic] = useState(project.versioning_logic || "MIXED");
  
  const currentReviewType = project.review_flow_config?.review_type || "PARALLEL";
  const [reviewFlowType, setReviewFlowType] = useState(currentReviewType);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Naming builder states
  const [tokens, setTokens] = useState<Token[]>(() => parsePattern(project.naming_pattern));
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const customProps = project.custom_properties_definition || [];
  const options = getAvailableOptions(customProps);

  useEffect(() => {
    setNamingPattern(serializeTokens(tokens));
  }, [tokens]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTokens = [...tokens];
    const [draggedToken] = newTokens.splice(draggedIndex, 1);
    newTokens.splice(index, 0, draggedToken);
    
    setTokens(newTokens);
    setDraggedIndex(null);
  };

  const addToken = (type: "tag" | "text", value: string) => {
    if (!value) return;
    const cleanValue = type === "tag" ? value.replace(/[{}]/g, "") : value;
    setTokens((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        type,
        value: cleanValue,
      },
    ]);
  };

  const removeToken = (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTokenValue = (id: string, newVal: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, value: newVal } : t))
    );
  };

  const compilePreview = (tokensList: Token[]) => {
    if (tokensList.length === 0) return "sin-formato";
    return tokensList
      .map((t) => {
        if (t.type === "text") return t.value;
        if (t.value === "PROY") return "PRJ";
        if (t.value === "NUM") return "001";
        return t.value.substring(0, 3).toUpperCase();
      })
      .join("");
  };

  const cleanInput = inputValue.replace(/[{}]/g, "").toLowerCase();
  
  // Show all options if input starts with { or is focused, otherwise filter
  const filteredOptions = cleanInput
    ? options.filter(
        (opt) =>
          opt.key.toLowerCase().includes(cleanInput) ||
          opt.label.toLowerCase().includes(cleanInput)
      )
    : options;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate that the pattern contains {NUM} which is critical for document revision numbering
    if (!namingPattern.includes("{NUM}")) {
      setError("El patrón de nomenclatura debe contener obligatoriamente el correlativo {NUM}.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("naming_pattern", namingPattern);
      formData.append("versioning_logic", versioningLogic);
      formData.append("review_flow_type", reviewFlowType);

      const res = await updateProjectSettingsAction(project.id, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Configuración del proyecto guardada exitosamente.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-md border border-green-200 dark:border-green-900/30 font-medium">
          {success}
        </div>
      )}

      <div className="space-y-5">
        {/* Project Name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name-input" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Nombre del Proyecto
          </label>
          <Input
            id="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="max-w-md"
          />
        </div>

        {/* Naming Configurator Visual Constructor */}
        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            Estructura del Código (Naming Engine)
            <span title="Arrastra los chips para cambiar el orden del código del documento.">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-400 cursor-help" />
            </span>
          </label>
          
          {/* Draggable Chips Workspace */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 p-4 space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 min-h-[58px]">
              {tokens.map((token, index) => {
                if (token.type === "tag") {
                  const label = options.find((o) => o.key === token.value)?.label || token.value;
                  return (
                    <div
                      key={token.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary border border-primary/25 rounded-md px-2.5 py-1 text-xs font-semibold cursor-grab active:cursor-grabbing select-none hover:bg-primary/15 transition-all shadow-2xs group"
                    >
                      <GripVertical className="h-3 w-3 text-primary/60 shrink-0" />
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => removeToken(token.id)}
                        disabled={isPending}
                        className="text-primary hover:text-white hover:bg-primary rounded p-0.5 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={token.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className="relative flex items-center cursor-grab active:cursor-grabbing hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded px-1.5 py-0.5 border border-dashed border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                    >
                      <input
                        type="text"
                        value={token.value}
                        onChange={(e) => updateTokenValue(token.id, e.target.value)}
                        disabled={isPending}
                        onBlur={() => {
                          if (!token.value) removeToken(token.id);
                        }}
                        className="bg-transparent border-0 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs focus:outline-none focus:border-primary text-zinc-800 dark:text-zinc-200 focus:bg-zinc-50 dark:focus:bg-zinc-900 font-semibold focus:ring-0 p-0"
                        style={{ width: `${Math.max(token.value.length || 1, 1) * 8 + 8}px` }}
                      />
                    </div>
                  );
                }
              })}

              {tokens.length === 0 && (
                <span className="text-xs text-zinc-400 italic">Agrega campos abajo para armar la nomenclatura...</span>
              )}
            </div>

            {/* Autocomplete Input Container */}
            <div className="relative autocomplete-container" ref={dropdownRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Escribe { para campos recomendados, o escribe texto manual (ej: - o _)..."
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    disabled={isPending}
                    className="text-xs h-9"
                  />
                  {showDropdown && (
                    <div className="absolute z-15 w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              addToken("tag", opt.key);
                              setInputValue("");
                              setShowDropdown(false);
                            }}
                            className="flex flex-col text-left w-full px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-0 cursor-pointer"
                          >
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{`{${opt.key}}`}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-zinc-500 italic text-center">
                          Presiona Enter para agregar "{inputValue}" como texto manual
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    if (!inputValue.trim()) return;
                    if (inputValue.startsWith("{") && inputValue.endsWith("}")) {
                      addToken("tag", inputValue);
                    } else {
                      addToken("text", inputValue);
                    }
                    setInputValue("");
                    setShowDropdown(false);
                  }}
                  className="text-xs h-9 cursor-pointer"
                >
                  Agregar
                </Button>
              </div>
            </div>

            {/* Dynamic Preview Display */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-zinc-400" />
                <span className="font-medium text-zinc-500">Previsualización del código:</span>
              </div>
              <code className="font-mono text-xs font-bold text-primary bg-primary/5 dark:bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                {compilePreview(tokens)}
              </code>
            </div>
          </div>
        </div>

        {/* Versioning Logic Selection */}
        <div className="flex flex-col gap-2">
          <label htmlFor="versioning-logic-select" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Lógica de Versionamiento
          </label>
          <select
            id="versioning-logic-select"
            value={versioningLogic}
            onChange={(e) => setVersioningLogic(e.target.value)}
            disabled={isPending}
            className="flex h-9 max-w-md w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
          >
            <option value="MIXED" className="text-zinc-900">MIXED (Letras borrador, Números al emitir)</option>
            <option value="SEPARATE_EMISSION" className="text-zinc-900">SEPARATE EMISSION (Números con emisión manual)</option>
          </select>
        </div>


      </div>

      <Button type="submit" disabled={isPending} className="mt-4 cursor-pointer">
        {isPending ? "Guardando..." : "Guardar Cambios"}
      </Button>
    </form>
  );
}
