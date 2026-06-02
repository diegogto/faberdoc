"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProjectSettingsAction } from "@/app/(dashboard)/projects/actions";
import { resolveLocationAction } from "./geocoding-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, GripVertical, Plus, Trash2, Edit2, Check, Search, MapPin, Eye, FileText, Bold, Italic, Underline, Heading1, Heading2, List, Loader2 } from "lucide-react";
import { formatVersionLabel, formatEmittedCode } from "@/lib/version-utils";
import { sanitizeHtml } from "@/lib/sanitize";

interface SettingsFormProps {
  project: {
    id: string;
    name: string;
    naming_pattern: string;
    versioning_logic: string;
    review_flow_config: any;
    custom_properties_definition: any;
    description?: string | null;
    location?: string | null;
    location_details?: any;
    client_name?: string | null;
    versioning_format_config?: any;
    archived_at?: string | null;
  };
  mode: "general" | "naming";
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

export function SettingsForm({ project, mode }: SettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── 1. MODO INFORMACIÓN GENERAL ───────────────────────────────────────────
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.client_name || "");
  
  // HTML Description states
  const [description, setDescription] = useState(project.description || "");
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Geocoding states
  const [locationSearch, setLocationSearch] = useState(project.location || "");
  const [resolvedAddress, setResolvedAddress] = useState(project.location || "");
  const [comuna, setComuna] = useState(project.location_details?.comuna || "");
  const [region, setRegion] = useState(project.location_details?.region || "");
  const [country, setCountry] = useState(project.location_details?.country || "");
  const [lat, setLat] = useState(project.location_details?.coords?.lat || "");
  const [lon, setLon] = useState(project.location_details?.coords?.lon || "");
  const [geocodingPending, setGeocodingPending] = useState(false);

  const handleInsertHtml = (openTag: string, closeTag: string) => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = openTag + selected + closeTag;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newValue);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }, 0);
  };

  const handleGeocode = async () => {
    setError(null);
    setSuccess(null);
    if (!locationSearch.trim()) return;

    setGeocodingPending(true);
    try {
      const res = await resolveLocationAction(locationSearch);
      if (!res.success || res.error) {
        setError(res.error || "No se pudo obtener la geolocalización.");
      } else {
        setResolvedAddress(res.address || "");
        setLocationSearch(res.address || "");
        setComuna(res.comuna || "");
        setRegion(res.region || "");
        setCountry(res.country || "");
        setLat(res.lat || "");
        setLon(res.lon || "");
        setSuccess("Ubicación geolocalizada exitosamente. Verifica los campos detallados.");
      }
    } catch (e) {
      setError("Error de red al consultar el mapa.");
    } finally {
      setGeocodingPending(false);
    }
  };

  // ─── 2. MODO NOMENCLATURA Y VERSIONADO ─────────────────────────────────────
  const [namingPattern, setNamingPattern] = useState(project.naming_pattern);
  const [versioningLogic, setVersioningLogic] = useState(project.versioning_logic || "MIXED");
  
  // Custom property arrays
  const customProps = project.custom_properties_definition || [];
  const options = getAvailableOptions(customProps);

  // Drag and Drop Base Code States
  const [tokens, setTokens] = useState<Token[]>(() => parsePattern(project.naming_pattern));
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Versioning configurations based on logic
  const formatConfig = project.versioning_format_config || {};
  
  // Clásico parameters
  const [classicStartLetter, setClassicStartLetter] = useState(formatConfig.classic_config?.info_start_letter || "A");
  const [classicStartNumber, setClassicStartNumber] = useState(formatConfig.classic_config?.approved_start_number ?? 0);
  const [classicPadding, setClassicPadding] = useState(formatConfig.classic_config?.approved_padding ?? 2);
  
  // Moderno parameters
  const [modernStartNumber, setModernStartNumber] = useState(formatConfig.modern_config?.start_number ?? 0);
  const [modernPadding, setModernPadding] = useState(formatConfig.modern_config?.padding ?? 2);

  // Emission Types mapping array
  const [emissionTypes, setEmissionTypes] = useState<Array<{ name: string; code: string; type: "info" | "approved" }>>(
    formatConfig.emission_types || [
      { name: "Para Revisión", code: "B", type: "info" },
      { name: "Para Aprobación", code: "A", type: "info" },
      { name: "Aprobado para Construcción", code: "IFC", type: "approved" },
      { name: "As Built", code: "ASB", type: "approved" }
    ]
  );
  
  const [newEmissionName, setNewEmissionName] = useState("");
  const [newEmissionCode, setNewEmissionCode] = useState("");
  const [newEmissionType, setNewEmissionType] = useState<"info" | "approved">("info");

  // Inline Editing of Emission Types
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editEmissionName, setEditEmissionName] = useState("");
  const [editEmissionCode, setEditEmissionCode] = useState("");
  const [editEmissionType, setEditEmissionType] = useState<"info" | "approved">("info");

  // Drag and Drop Emitted Code States (Visual Pattern Builder)
  const defaultEmittedPattern = formatConfig.emission_pattern || "{CODE} - Rev {REV}";
  const [emittedTokens, setEmittedTokens] = useState<Token[]>(() => parsePattern(defaultEmittedPattern));
  const [emittedInputValue, setEmittedInputValue] = useState("");
  const [showEmittedDropdown, setShowEmittedDropdown] = useState(false);
  const [draggedEmittedIndex, setDraggedEmittedIndex] = useState<number | null>(null);
  const emittedDropdownRef = useRef<HTMLDivElement>(null);

  const [previewOverrides, setPreviewOverrides] = useState<{
    tagValues?: Record<string, string>;
    numValue?: string;
    versionIndex?: number;
    emissionCode?: string;
  } | null>(null);

  const emittedOptions = [
    { key: "CODE", label: "Código Base de Plano" },
    { key: "REV", label: "Versión Oficial" },
    { key: "EMISSION", label: "Código de Emisión (ej: IFC)" }
  ];

  useEffect(() => {
    setName(project.name);
    setClientName(project.client_name || "");
    setDescription(project.description || "");
    setLocationSearch(project.location || "");
    setResolvedAddress(project.location || "");
    setComuna(project.location_details?.comuna || "");
    setRegion(project.location_details?.region || "");
    setCountry(project.location_details?.country || "");
    setLat(project.location_details?.coords?.lat || "");
    setLon(project.location_details?.coords?.lon || "");

    // Synchronize naming and versioning logic states
    setNamingPattern(project.naming_pattern);
    setVersioningLogic(project.versioning_logic || "MIXED");
    setTokens(parsePattern(project.naming_pattern));

    const fmt = project.versioning_format_config || {};
    setClassicStartLetter(fmt.classic_config?.info_start_letter || "A");
    setClassicStartNumber(fmt.classic_config?.approved_start_number ?? 0);
    setClassicPadding(fmt.classic_config?.approved_padding ?? 2);

    setModernStartNumber(fmt.modern_config?.start_number ?? 0);
    setModernPadding(fmt.modern_config?.padding ?? 2);

    setEmissionTypes(
      fmt.emission_types || [
        { name: "Para Revisión", code: "B", type: "info" },
        { name: "Para Aprobación", code: "A", type: "info" },
        { name: "Aprobado para Construcción", code: "IFC", type: "approved" },
        { name: "As Built", code: "ASB", type: "approved" }
      ]
    );

    const emittedPattern = fmt.emission_pattern || "{CODE} - Rev {REV}";
    setEmittedTokens(parsePattern(emittedPattern));
    setPreviewOverrides(null);
  }, [project]);

  useEffect(() => {
    setNamingPattern(serializeTokens(tokens));
  }, [tokens]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (emittedDropdownRef.current && !emittedDropdownRef.current.contains(e.target as Node)) {
        setShowEmittedDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // ─── DRAG AND DROP: BASE CODE NOMENCLATURE ─────────────────────────────────
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => e.preventDefault();
  
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
      { id: Math.random().toString(36).substring(2, 9), type, value: cleanValue }
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

  // ─── DRAG AND DROP: EMITTED PATTERN ────────────────────────────────────────
  const handleEmittedDragStart = (index: number) => setDraggedEmittedIndex(index);
  const handleEmittedDragOver = (e: React.DragEvent, index: number) => e.preventDefault();

  const handleEmittedDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedEmittedIndex === null || draggedEmittedIndex === index) return;
    const newTokens = [...emittedTokens];
    const [draggedToken] = newTokens.splice(draggedEmittedIndex, 1);
    newTokens.splice(index, 0, draggedToken);
    setEmittedTokens(newTokens);
    setDraggedEmittedIndex(null);
  };

  const addEmittedToken = (type: "tag" | "text", value: string) => {
    if (!value) return;
    const cleanValue = type === "tag" ? value.replace(/[{}]/g, "") : value;
    setEmittedTokens((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), type, value: cleanValue }
    ]);
  };

  const removeEmittedToken = (id: string) => {
    setEmittedTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const updateEmittedTokenValue = (id: string, newVal: string) => {
    setEmittedTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, value: newVal } : t))
    );
  };

  // ─── LIVE PREVIEWS ────────────────────────────────────────────────────────
  const getTagPreviewValue = (tagKey: string) => {
    const upperKey = tagKey.toUpperCase();
    if (previewOverrides?.tagValues?.[upperKey]) {
      return previewOverrides.tagValues[upperKey];
    }

    const attr = customProps.find((p: any) => p.key.toUpperCase() === upperKey);
    if (attr) {
      if (attr.type === "select" && attr.options && attr.options.length > 0) {
        const firstOpt = attr.options[0];
        if (typeof firstOpt === "string") {
          return firstOpt.substring(0, 3).toUpperCase();
        }
        if (firstOpt && typeof firstOpt === "object" && firstOpt.code) {
          return firstOpt.code.toUpperCase();
        }
      }
      return tagKey.substring(0, 3).toUpperCase();
    }

    if (upperKey === "PROY") {
      return project.name.substring(0, 5).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }
    return tagKey.substring(0, 3).toUpperCase();
  };

  const compileNamingPreview = (tokensList: Token[]) => {
    if (tokensList.length === 0) return "sin-formato";
    return tokensList
      .map((t) => {
        if (t.type === "text") return t.value;
        if (t.value === "NUM") {
          return previewOverrides?.numValue || "100";
        }
        return getTagPreviewValue(t.value);
      })
      .join("");
  };

  // Compile Live Preview
  const docCodePreview = compileNamingPreview(tokens);
  
  // Format versions simulation
  const mockConfig = {
    version_format: {
      type: versioningLogic === "MIXED" ? "alphabetic" : "numeric",
      prefix: "",
      padding: versioningLogic === "MIXED" ? 1 : modernPadding,
      starting_value: versioningLogic === "MIXED" ? 0 : modernStartNumber
    },
    classic_config: {
      info_start_letter: classicStartLetter,
      approved_start_number: classicStartNumber,
      approved_padding: classicPadding
    },
    modern_config: {
      start_number: modernStartNumber,
      padding: modernPadding
    }
  };

  const simulatedInfoRev = formatVersionLabel(
    previewOverrides?.versionIndex ?? 0,
    versioningLogic,
    "info",
    mockConfig
  );
  const simulatedAppRev = formatVersionLabel(
    previewOverrides?.versionIndex ?? 0,
    versioningLogic,
    "approved",
    mockConfig
  );

  const activeEmittedPattern = serializeTokens(emittedTokens);
  const mockFormatConfig = { emission_pattern: activeEmittedPattern };
  
  // Find dynamic emission codes with robust fallback for legacy data (missing "type" property)
  const firstInfoType = emissionTypes.find(et => et.type === "info") || emissionTypes[0];
  const firstApproveType = emissionTypes.find(et => et.type === "approved") || emissionTypes.find(et => et.type !== "info") || emissionTypes[1] || emissionTypes[0];

  const simulatedInfoEmissionCode = previewOverrides?.emissionCode || (firstInfoType ? firstInfoType.code : "B");
  const simulatedAppEmissionCode = previewOverrides?.emissionCode || (firstApproveType ? firstApproveType.code : "C");

  const simulatedInfoCode = formatEmittedCode(docCodePreview, simulatedInfoRev, simulatedInfoEmissionCode, mockFormatConfig);
  const simulatedAppCode = formatEmittedCode(docCodePreview, simulatedAppRev, simulatedAppEmissionCode, mockFormatConfig);

  const handleGenerateRandomPreview = () => {
    const tagValues: Record<string, string> = {};
    
    // Random project code
    const projectCodes = ["MONTR", "TOKYO", "BERLN", "PARIS", "SYDNY", "MADRD"];
    tagValues["PROY"] = projectCodes[Math.floor(Math.random() * projectCodes.length)];
    
    // Random custom tags
    customProps.forEach((attr: any) => {
      if (attr.type === "select" && attr.options && attr.options.length > 0) {
        const randomOpt = attr.options[Math.floor(Math.random() * attr.options.length)];
        if (typeof randomOpt === "string") {
          tagValues[attr.key.toUpperCase()] = randomOpt.substring(0, 3).toUpperCase();
        } else if (randomOpt && typeof randomOpt === "object" && randomOpt.code) {
          tagValues[attr.key.toUpperCase()] = randomOpt.code.toUpperCase();
        }
      } else {
        // Text attribute: random uppercase letters
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let randStr = "";
        for (let i = 0; i < 3; i++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        tagValues[attr.key.toUpperCase()] = randStr;
      }
    });

    // Random NUM correlative (001 to 999 with padding)
    const randNumVal = Math.floor(Math.random() * 999) + 1;
    const padding = 3; 
    const randNum = String(randNumVal).padStart(padding, "0");

    // Random version index
    const randVerIndex = Math.floor(Math.random() * 5); // 0-4

    // Random emission code
    let randEmission = "IFC";
    if (emissionTypes.length > 0) {
      const randType = emissionTypes[Math.floor(Math.random() * emissionTypes.length)];
      randEmission = randType.code;
    }

    setPreviewOverrides({
      tagValues,
      numValue: randNum,
      versionIndex: randVerIndex,
      emissionCode: randEmission
    });
  };

  const cleanInput = inputValue.replace(/[{}]/g, "").toLowerCase();
  const filteredOptions = cleanInput
    ? options.filter(
        (opt) =>
          opt.key.toLowerCase().includes(cleanInput) ||
          opt.label.toLowerCase().includes(cleanInput)
      )
    : options;

  const cleanEmittedInput = emittedInputValue.replace(/[{}]/g, "").toLowerCase();
  const filteredEmittedOptions = cleanEmittedInput
    ? emittedOptions.filter(
        (opt) =>
          opt.key.toLowerCase().includes(cleanEmittedInput) ||
          opt.label.toLowerCase().includes(cleanEmittedInput)
      )
    : emittedOptions;

  // ─── CRUD EMISSION TYPES ───────────────────────────────────────────────────
  const handleAddEmissionType = () => {
    if (!newEmissionName.trim() || !newEmissionCode.trim()) return;
    setEmissionTypes((prev) => [
      ...prev,
      {
        name: newEmissionName.trim(),
        code: newEmissionCode.trim().toUpperCase(),
        type: newEmissionType
      }
    ]);
    setNewEmissionName("");
    setNewEmissionCode("");
    setNewEmissionType("info");
  };

  const handleRemoveEmissionType = (index: number) => {
    setEmissionTypes((prev) => prev.filter((_, i) => i !== index));
  };

  const startInlineEdit = (index: number) => {
    const item = emissionTypes[index];
    setEditingIndex(index);
    setEditEmissionName(item.name);
    setEditEmissionCode(item.code);
    setEditEmissionType(item.type || "info");
  };

  const saveInlineEdit = (index: number) => {
    if (!editEmissionName.trim() || !editEmissionCode.trim()) return;
    setEmissionTypes((prev) =>
      prev.map((item, i) =>
        i === index
          ? { name: editEmissionName.trim(), code: editEmissionCode.trim().toUpperCase(), type: editEmissionType }
          : item
      )
    );
    setEditingIndex(null);
  };

  const getCountryLabels = (countryName: string) => {
    const lower = (countryName || "").toLowerCase().trim();
    if (lower.includes("chile")) {
      return { comuna: "Comuna", region: "Región" };
    }
    if (lower.includes("argentina")) {
      return { comuna: "Localidad", region: "Provincia" };
    }
    if (lower.includes("colombia")) {
      return { comuna: "Municipio", region: "Departamento" };
    }
    if (lower.includes("mexico") || lower.includes("méxico")) {
      return { comuna: "Municipio", region: "Estado" };
    }
    if (lower.includes("peru") || lower.includes("perú")) {
      return { comuna: "Distrito", region: "Departamento" };
    }
    if (lower.includes("espana") || lower.includes("españa")) {
      return { comuna: "Municipio", region: "Provincia" };
    }
    return { comuna: "Comuna / Ciudad", region: "Región / Estado" };
  };

  const handleSaveLocationOnly = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("mode", "general");
      formData.append("name", name);
      formData.append("description", description);
      formData.append("location", resolvedAddress);
      formData.append("client_name", clientName);
      formData.append("naming_pattern", namingPattern);
      formData.append("versioning_logic", versioningLogic);

      const reviewFlowType = project.review_flow_config?.review_type || "PARALLEL";
      formData.append("review_flow_type", reviewFlowType);

      const locationDetails = {
        comuna: comuna.trim(),
        region: region.trim(),
        country: country.trim(),
        coords: lat && lon ? { lat: lat.trim(), lon: lon.trim() } : null
      };
      formData.append("location_details", JSON.stringify(locationDetails));

      const serializedFormatConfig = {
        classic_config: {
          info_start_letter: classicStartLetter,
          approved_start_number: Number(classicStartNumber),
          approved_padding: Number(classicPadding)
        },
        modern_config: {
          start_number: Number(modernStartNumber),
          padding: Number(modernPadding)
        },
        emission_types: emissionTypes,
        emission_pattern: activeEmittedPattern
      };
      formData.append("versioning_format_config", JSON.stringify(serializedFormatConfig));

      const res = await updateProjectSettingsAction(project.id, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Ubicación guardada exitosamente.");
        setIsEditingLocation(false);
        router.refresh();
      }
    });
  };

  // ─── FORM SUBMIT ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "naming" && !namingPattern.includes("{NUM}")) {
      setError("El patrón de nomenclatura debe contener obligatoriamente el correlativo {NUM}.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("name", name);
      formData.append("description", description);
      formData.append("location", resolvedAddress);
      formData.append("client_name", clientName);
      formData.append("naming_pattern", namingPattern);
      formData.append("versioning_logic", versioningLogic);

      // We maintain review_flow_type in project, keeping it default from config
      const reviewFlowType = project.review_flow_config?.review_type || "PARALLEL";
      formData.append("review_flow_type", reviewFlowType);

      // Serialize location details
      const locationDetails = {
        comuna: comuna.trim(),
        region: region.trim(),
        country: country.trim(),
        coords: lat && lon ? { lat: lat.trim(), lon: lon.trim() } : null
      };
      formData.append("location_details", JSON.stringify(locationDetails));

      // Serialize versioning format config
      const serializedFormatConfig = {
        classic_config: {
          info_start_letter: classicStartLetter,
          approved_start_number: Number(classicStartNumber),
          approved_padding: Number(classicPadding)
        },
        modern_config: {
          start_number: Number(modernStartNumber),
          padding: Number(modernPadding)
        },
        emission_types: emissionTypes,
        emission_pattern: activeEmittedPattern
      };
      formData.append("versioning_format_config", JSON.stringify(serializedFormatConfig));

      const res = await updateProjectSettingsAction(project.id, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Configuración de proyecto guardada exitosamente.");
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
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
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-md border border-green-200 dark:border-green-900/30 font-medium font-sans">
          {success}
        </div>
      )}

      {/* ─── 1. MODO INFORMACIÓN GENERAL ─────────────────────────────────────── */}
      {mode === "general" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name-input" className="text-xs font-semibold text-muted-foreground">
                Nombre del Proyecto
              </label>
              <Input
                id="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
                placeholder="ej: Planta Industrial Minera"
                className="bg-white dark:bg-zinc-950 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="client-input" className="text-xs font-semibold text-muted-foreground">
                Cliente / Mandante
              </label>
              <Input
                id="client-input"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={isPending}
                placeholder="ej: Anglo American plc"
                className="bg-white dark:bg-zinc-950 text-sm"
              />
            </div>
          </div>

          {/* Advanced Geolocation Field */}
          {resolvedAddress && !isEditingLocation ? (
            <div className="border border-border p-5 rounded-xl bg-white dark:bg-zinc-950/20 shadow-xs flex flex-col md:flex-row gap-5">
              {/* Left side: Location details */}
              <div className="flex-1 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50 font-bold text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Ubicación del Proyecto</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingLocation(true)}
                    className="h-7 text-[11px] cursor-pointer gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Editar
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dirección</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{resolvedAddress}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {getCountryLabels(country).comuna}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{comuna || "No especificada"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {getCountryLabels(country).region}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{region || "No especificada"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">País</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">{country || "No especificado"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Coordenadas</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-mono">
                        {lat && lon ? `${lat}, ${lon}` : "No especificadas"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side: Google Maps iframe */}
              <div className="w-full md:w-[320px] h-[200px] rounded-lg overflow-hidden border border-border shrink-0 bg-zinc-100 dark:bg-zinc-900 relative">
                <iframe
                  title="Mapa de ubicación del proyecto"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={
                    lat && lon
                      ? `https://maps.google.com/maps?q=${lat},${lon}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                      : `https://maps.google.com/maps?q=${encodeURIComponent(resolvedAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
                  }
                />
              </div>
            </div>
          ) : (
            <div className="border border-border p-5 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50 font-bold text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Configurar Ubicación del Proyecto</span>
                </div>
                {project.location && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLocationSearch(project.location || "");
                      setResolvedAddress(project.location || "");
                      setComuna(project.location_details?.comuna || "");
                      setRegion(project.location_details?.region || "");
                      setCountry(project.location_details?.country || "");
                      setLat(project.location_details?.coords?.lat || "");
                      setLon(project.location_details?.coords?.lon || "");
                      setIsEditingLocation(false);
                    }}
                    className="h-7 text-[11px] cursor-pointer"
                  >
                    Cancelar
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="location-search" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Dirección o Coordenadas de búsqueda
                </label>
                <div className="flex gap-2">
                  <Input
                    id="location-search"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      setResolvedAddress(e.target.value);
                    }}
                    disabled={isPending || geocodingPending}
                    placeholder="Ej: Av. Vitacura 1234, Santiago, Chile o -33.4489, -70.6693"
                    className="bg-white dark:bg-zinc-950 text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeocode}
                    disabled={isPending || geocodingPending || !locationSearch.trim()}
                    className="h-9 text-xs cursor-pointer gap-1 shrink-0"
                  >
                    {geocodingPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Validar Geolocalización
                  </Button>
                </div>
              </div>

              {/* Resolved Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    {getCountryLabels(country).comuna}
                  </label>
                  <Input
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    disabled={isPending}
                    placeholder="Autocompletado o manual"
                    className="bg-white dark:bg-zinc-950 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    {getCountryLabels(country).region}
                  </label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    disabled={isPending}
                    placeholder="Autocompletado o manual"
                    className="bg-white dark:bg-zinc-950 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">País</label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={isPending}
                    placeholder="Autocompletado o manual"
                    className="bg-white dark:bg-zinc-950 text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Latitud</label>
                  <Input
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    disabled={isPending}
                    placeholder="-33.4489"
                    className="bg-white dark:bg-zinc-950 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Longitud</label>
                  <Input
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    disabled={isPending}
                    placeholder="-70.6693"
                    className="bg-white dark:bg-zinc-950 text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleSaveLocationOnly}
                  disabled={isPending || !resolvedAddress.trim()}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Guardar Ubicación
                </Button>
              </div>
            </div>
          )}

          {/* HTML Multiline Description Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <label htmlFor="description-textarea" className="text-xs font-semibold text-muted-foreground">
                Descripción del Proyecto
              </label>
              
              <div className="flex border border-border rounded-md overflow-hidden bg-muted/30">
                <button
                  type="button"
                  onClick={() => setDescTab("write")}
                  className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    descTab === "write" ? "bg-white dark:bg-zinc-900 shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  Escribir
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab("preview")}
                  className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    descTab === "preview" ? "bg-white dark:bg-zinc-900 shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Vista Previa
                </button>
              </div>
            </div>

            {descTab === "write" ? (
              <div className="space-y-2">
                {/* HTML Helper Buttons */}
                <div className="flex flex-wrap gap-1 p-1 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-md">
                  <button type="button" onClick={() => handleInsertHtml("<b>", "</b>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Negrita"><Bold className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<i>", "</i>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Itálica"><Italic className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<u>", "</u>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Subrayado"><Underline className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<h1>", "</h1>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Título 1"><Heading1 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<h2>", "</h2>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Título 2"><Heading2 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<ul>\n  <li>", "</li>\n</ul>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer" title="Lista de viñetas"><List className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleInsertHtml("<br />", "")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer text-[10px] font-bold" title="Salto de línea">BR</button>
                  <button type="button" onClick={() => handleInsertHtml("<p>", "</p>")} className="p-1 hover:bg-white dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-foreground cursor-pointer text-[10px] font-bold" title="Párrafo">P</button>
                </div>
                <Textarea
                  id="description-textarea"
                  ref={descriptionRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  placeholder="Detalles sobre el proyecto..."
                  rows={6}
                  className="bg-white dark:bg-zinc-950 font-sans text-xs h-32"
                />
              </div>
            ) : (
              <div 
                className="prose dark:prose-invert max-w-none text-xs text-muted-foreground p-4 border border-border rounded-lg bg-zinc-50/20 dark:bg-zinc-900/5 min-h-[128px] overflow-y-auto whitespace-pre-line leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) || '<span class="italic text-zinc-400">Sin descripción ingresada</span>' }}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── 2. MODO NOMENCLATURA Y VERSIONADO ───────────────────────────────── */}
      {mode === "naming" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Estructura del Código base de Plano</h4>
            
            {/* Draggable Chips Workspace */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 p-4 space-y-4">
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
                      className="text-xs h-9 bg-white dark:bg-zinc-950"
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
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Lógicas de Versionamiento y Emisión</h4>
            
            <div className="flex flex-col gap-2 max-w-md">
              <label htmlFor="versioning-logic-select" className="text-xs font-semibold text-muted-foreground">
                Lógica de Versionamiento
              </label>
              <select
                id="versioning-logic-select"
                value={versioningLogic}
                onChange={(e) => setVersioningLogic(e.target.value)}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer"
              >
                <option value="MIXED" className="text-zinc-900">Clásico (Letras Informativas, Números Aprobados)</option>
                <option value="SEPARATE_EMISSION" className="text-zinc-900">Moderno (Correlativo numérico, Código de Transmittal)</option>
              </select>
            </div>

            {/* Clásico Version Config */}
            {versioningLogic === "MIXED" && (
              <div className="space-y-4 border border-border p-4 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combina letras y números para la versión del documento. Las letras indican que son documentos que son emitidos para información y/o aprobación del cliente, hasta que se aprueban para emitir apto para construir o aprobados por el cliente con versiones en números. Debes configurar en qué letra y número comenzará la versión en cada caso y el formato en que aparecerá en el nombre del documento.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Letra Inicial Informativa</label>
                    <select
                      value={classicStartLetter}
                      onChange={(e) => setClassicStartLetter(e.target.value)}
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer bg-white"
                    >
                      {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => (
                        <option key={letter} value={letter} className="text-zinc-900">{letter}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Número Inicial Aprobado</label>
                    <select
                      value={classicStartNumber}
                      onChange={(e) => setClassicStartNumber(Number(e.target.value))}
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer bg-white"
                    >
                      {Array.from({ length: 10 }, (_, i) => i).map((num) => (
                        <option key={num} value={num} className="text-zinc-900">{num}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Padding Numérico (Dígitos)</label>
                    <select
                      value={classicPadding}
                      onChange={(e) => setClassicPadding(Number(e.target.value))}
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer bg-white"
                    >
                      <option value={1} className="text-zinc-900">1 dígito (0, 1, 2...)</option>
                      <option value={2} className="text-zinc-900">2 dígitos (00, 01, 02...)</option>
                      <option value={3} className="text-zinc-900">3 dígitos (000, 001, 002...)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Moderno Version Config */}
            {versioningLogic === "SEPARATE_EMISSION" && (
              <div className="space-y-4 border border-border p-4 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Las versiones emitidas son siempre numéricas. Se asocia un código de emisión (e.g. IFC) para el envío y se incrementa el correlativo numérico.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Número Inicial</label>
                    <select
                      value={modernStartNumber}
                      onChange={(e) => setModernStartNumber(Number(e.target.value))}
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer bg-white"
                    >
                      {Array.from({ length: 10 }, (_, i) => i).map((num) => (
                        <option key={num} value={num} className="text-zinc-900">{num}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Padding Numérico (Dígitos)</label>
                    <select
                      value={modernPadding}
                      onChange={(e) => setModernPadding(Number(e.target.value))}
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 cursor-pointer bg-white"
                    >
                      <option value={1} className="text-zinc-900">1 dígito (0, 1, 2...)</option>
                      <option value={2} className="text-zinc-900">2 dígitos (00, 01, 02...)</option>
                      <option value={3} className="text-zinc-900">3 dígitos (000, 001, 002...)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emission Types Mapping CRUD */}
          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Mapeos de Tipos de Emisión</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define los propósitos de transmittal oficiales con sus respectivos códigos y el tipo de versión a aplicar en la lógica Clásica.
              </p>
            </div>

            <div className="border border-border rounded-lg overflow-hidden max-w-3xl bg-white dark:bg-zinc-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="p-2.5">Propósito / Descripción de Emisión</th>
                    <th className="p-2.5 w-28">Código / Tag</th>
                    {versioningLogic === "MIXED" && <th className="p-2.5 w-44">Tipo (Lógica Clásica)</th>}
                    <th className="p-2.5 w-28 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {emissionTypes.map((et, index) => (
                    <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30 h-10">
                      {editingIndex === index ? (
                        <>
                          <td className="p-1">
                            <Input
                              value={editEmissionName}
                              onChange={(e) => setEditEmissionName(e.target.value)}
                              className="text-xs h-7 w-full bg-white"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={editEmissionCode}
                              onChange={(e) => setEditEmissionCode(e.target.value)}
                              className="text-xs h-7 uppercase w-full bg-white"
                            />
                          </td>
                          {versioningLogic === "MIXED" && (
                            <td className="p-1">
                              <select
                                value={editEmissionType}
                                onChange={(e) => setEditEmissionType(e.target.value as any)}
                                className="h-7 w-full rounded border border-input text-xs bg-white cursor-pointer"
                              >
                                <option value="info">Informativo (Letra)</option>
                                <option value="approved">Aprobado (Número)</option>
                              </select>
                            </td>
                          )}
                          <td className="p-1 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-800 cursor-pointer"
                                onClick={() => saveInlineEdit(index)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-foreground cursor-pointer"
                                onClick={() => setEditingIndex(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2.5 font-medium text-foreground">{et.name}</td>
                          <td className="p-2.5"><code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono font-bold text-primary">{et.code}</code></td>
                          {versioningLogic === "MIXED" && (
                            <td className="p-2.5">
                              <Badge variant={et.type === "approved" ? "default" : "secondary"} className="text-[10px]">
                                {et.type === "approved" ? "Aprobado (Números)" : "Informativo (Letras)"}
                              </Badge>
                            </td>
                          )}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-foreground cursor-pointer"
                                onClick={() => startInlineEdit(index)}
                                disabled={isPending}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-red-500 cursor-pointer"
                                onClick={() => handleRemoveEmissionType(index)}
                                disabled={isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {emissionTypes.length === 0 && (
                    <tr>
                      <td colSpan={versioningLogic === "MIXED" ? 4 : 3} className="p-4 text-center text-xs text-muted-foreground italic">
                        No hay tipos de emisión registrados. Agrega uno abajo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Add New Emission Item */}
            <div className="flex flex-wrap gap-2 max-w-3xl items-end bg-zinc-50/50 p-3 rounded-lg border border-border">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">Descripción de la Emisión</label>
                <Input
                  placeholder="ej: Aprobado para construcción"
                  value={newEmissionName}
                  onChange={(e) => setNewEmissionName(e.target.value)}
                  disabled={isPending}
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground">Código / Tag</label>
                <Input
                  placeholder="ej: IFC"
                  value={newEmissionCode}
                  onChange={(e) => setNewEmissionCode(e.target.value)}
                  disabled={isPending}
                  className="text-xs h-8 uppercase bg-white text-center font-bold"
                />
              </div>
              {versioningLogic === "MIXED" && (
                <div className="w-40 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Tipo de Propósito</label>
                  <select
                    value={newEmissionType}
                    onChange={(e) => setNewEmissionType(e.target.value as any)}
                    disabled={isPending}
                    className="flex h-8 w-full rounded-md border border-input px-2 py-1 text-xs shadow-sm bg-white cursor-pointer"
                  >
                    <option value="info">Informativo (Letras)</option>
                    <option value="approved">Aprobado (Números)</option>
                  </select>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmissionType}
                disabled={isPending || !newEmissionName.trim() || !newEmissionCode.trim()}
                className="h-8 text-xs cursor-pointer px-4"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Añadir
              </Button>
            </div>
          </div>

          {/* Emitted code format selection using Visual Chips drag-and-drop */}
          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Estructura del Código de Plano Emitido (Transmittal)</h4>
            
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 min-h-[58px]">
                {emittedTokens.map((token, index) => {
                  if (token.type === "tag") {
                    const label = emittedOptions.find((o) => o.key === token.value)?.label || token.value;
                    return (
                      <div
                        key={token.id}
                        draggable
                        onDragStart={() => handleEmittedDragStart(index)}
                        onDragOver={(e) => handleEmittedDragOver(e, index)}
                        onDrop={(e) => handleEmittedDrop(e, index)}
                        className="flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary border border-primary/25 rounded-md px-2.5 py-1 text-xs font-semibold cursor-grab active:cursor-grabbing select-none hover:bg-primary/15 transition-all shadow-2xs group"
                      >
                        <GripVertical className="h-3 w-3 text-primary/60 shrink-0" />
                        <span>{label}</span>
                        <button
                          type="button"
                          onClick={() => removeEmittedToken(token.id)}
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
                        onDragStart={() => handleEmittedDragStart(index)}
                        onDragOver={(e) => handleEmittedDragOver(e, index)}
                        onDrop={(e) => handleEmittedDrop(e, index)}
                        className="relative flex items-center cursor-grab active:cursor-grabbing hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded px-1.5 py-0.5 border border-dashed border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                      >
                        <input
                          type="text"
                          value={token.value}
                          onChange={(e) => updateEmittedTokenValue(token.id, e.target.value)}
                          disabled={isPending}
                          onBlur={() => {
                            if (!token.value) removeEmittedToken(token.id);
                          }}
                          className="bg-transparent border-0 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-center font-mono text-xs focus:outline-none focus:border-primary text-zinc-800 dark:text-zinc-200 focus:bg-zinc-50 dark:focus:bg-zinc-900 font-semibold focus:ring-0 p-0"
                          style={{ width: `${Math.max(token.value.length || 1, 1) * 8 + 8}px` }}
                        />
                      </div>
                    );
                  }
                })}

                {emittedTokens.length === 0 && (
                  <span className="text-xs text-zinc-400 italic">Agrega campos abajo para armar el formato de emisión...</span>
                )}
              </div>

              {/* Autocomplete for Emitted Code */}
              <div className="relative autocomplete-container" ref={emittedDropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Escribe { para agregar fichas de emisión o escribe texto manual (ej: - o _)..."
                      value={emittedInputValue}
                      onChange={(e) => {
                        setEmittedInputValue(e.target.value);
                        setShowEmittedDropdown(true);
                      }}
                      onFocus={() => setShowEmittedDropdown(true)}
                      disabled={isPending}
                      className="text-xs h-9 bg-white dark:bg-zinc-950"
                    />
                    {showEmittedDropdown && (
                      <div className="absolute z-15 w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmittedOptions.length > 0 ? (
                          filteredEmittedOptions.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                addEmittedToken("tag", opt.key);
                                setEmittedInputValue("");
                                setShowEmittedDropdown(false);
                              }}
                              className="flex flex-col text-left w-full px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-0 cursor-pointer"
                            >
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{`{${opt.key}}`}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-zinc-500 italic text-center">
                            Presiona Enter para agregar "{emittedInputValue}" como texto manual
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
                      if (!emittedInputValue.trim()) return;
                      if (emittedInputValue.startsWith("{") && emittedInputValue.endsWith("}")) {
                        addEmittedToken("tag", emittedInputValue);
                      } else {
                        addEmittedToken("text", emittedInputValue);
                      }
                      setEmittedInputValue("");
                      setShowEmittedDropdown(false);
                    }}
                    className="text-xs h-9 cursor-pointer"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {/* Previews Box */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 p-4 space-y-3 max-w-2xl shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5 mb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Previsualización de Versión y Emisión
                </h4>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateRandomPreview}
                    className="h-7 text-[10px] gap-1 cursor-pointer"
                  >
                    <span>Probar Aleatorio</span>
                  </Button>
                  {previewOverrides && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewOverrides(null)}
                      className="h-7 text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                      Restablecer
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="space-y-1">
                  <span className="text-zinc-400">Código de Plano (Base):</span>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{docCodePreview}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-400">Iteración de Trabajo Interno (Borrador/Elaboración):</span>
                  <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">1</div>
                </div>
              </div>

              {versioningLogic === "MIXED" ? (
                <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2 pt-2 space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-zinc-400">
                        Emisión Informativa (ej. {firstInfoType?.name || "Para Revisión"}):
                      </span>
                      <div className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        Versión: {simulatedInfoRev} (Emisión: {simulatedInfoEmissionCode})
                      </div>
                      <div className="font-mono font-bold text-primary text-[11px]">{simulatedInfoCode}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400">
                        Emisión Aprobada (ej. {firstApproveType?.name || "Aprobado para Construcción"}):
                      </span>
                      <div className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        Versión: {simulatedAppRev} (Emisión: {simulatedAppEmissionCode})
                      </div>
                      <div className="font-mono font-bold text-primary text-[11px]">{simulatedAppCode}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-dashed border-zinc-200 dark:border-zinc-800 my-2 pt-2 space-y-1 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-zinc-400">
                        Versión Emitida (Moderno - {simulatedAppEmissionCode}):
                      </span>
                      <div className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        Versión: {simulatedAppRev} (Emisión: {simulatedAppEmissionCode})
                      </div>
                      <div className="font-mono font-bold text-primary text-[11px]">{simulatedAppCode}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Button type="submit" disabled={isPending || !!project.archived_at} className="w-full md:w-auto px-8 cursor-pointer">
        {isPending ? "Guardando..." : project.archived_at ? "Proyecto Archivado" : "Guardar Cambios"}
      </Button>
    </form>
  );
}
