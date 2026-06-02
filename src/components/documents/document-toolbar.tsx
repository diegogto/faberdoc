"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { X, Search, Plus, Upload, Eye } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import type { DocumentTableRow, CustomPropertyDefinition } from "@/lib/types";

interface DocumentToolbarProps {
  table: Table<DocumentTableRow>;
  customPropertiesDef: CustomPropertyDefinition[];
  onNewDocumentClick: () => void;
  onImportCSVClick: () => void;
  filterTab?: "all" | "pending";
  onFilterTabChange?: (tab: "all" | "pending") => void;
  currentUserId?: string;
  pendingCount?: number;
  isProjectArchived?: boolean;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "IN_REVIEW", label: "En Revisión" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "ISSUED", label: "Emitido" },
];

export function DocumentToolbar({
  table,
  customPropertiesDef,
  onNewDocumentClick,
  onImportCSVClick,
  filterTab = "all",
  onFilterTabChange,
  currentUserId,
  pendingCount = 0,
  isProjectArchived = false,
}: DocumentToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const globalFilter = table.getState().globalFilter ?? "";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3.5 px-4 border-b border-border/50 bg-background/50 backdrop-blur-xs">
      {/* Filters Left Section */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* Tab Switcher */}
        {currentUserId && onFilterTabChange && (
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 shrink-0">
            <button
              onClick={() => onFilterTabChange("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onFilterTabChange("pending")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === "pending"
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs font-bold"
                  : "text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100"
              }`}
            >
              Mis Pendientes
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center bg-[#2e3e56] text-white dark:bg-[#3e689a] text-[9px] font-bold px-1.5 py-0.5 rounded-full h-4 min-w-4 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Global search */}
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={globalFilter}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="pl-8 h-8 text-xs w-full bg-background"
          />
        </div>

        {/* Status filter */}
        <Select
          value={
            (table.getColumn("status")?.getFilterValue() as string) ?? "__all__"
          }
          onValueChange={(value) =>
            table
              .getColumn("status")
              ?.setFilterValue(value === "__all__" ? undefined : value)
          }
        >
          <SelectTrigger className="h-8 w-[120px] text-xs bg-background">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los Estados</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dynamic select filters from custom properties */}
        {customPropertiesDef
          .filter((prop) => prop.type === "select")
          .map((prop) => {
            const col = table.getColumn(prop.key);
            if (!col) return null;
            return (
              <Select
                key={prop.key}
                value={(col.getFilterValue() as string) ?? "__all__"}
                onValueChange={(value) =>
                  col.setFilterValue(value === "__all__" ? undefined : value)
                }
              >
                <SelectTrigger className="h-8 min-w-[130px] max-w-[180px] text-xs bg-background">
                  <SelectValue placeholder={prop.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas ({prop.label})</SelectItem>
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
            );
          })}

        {/* Clear filters button */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 text-xs hover:bg-muted/80"
          >
            Limpiar Filtros
            <X className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Actions Right Section */}
      <div className="flex items-center gap-2">
        {/* Column Visibility Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-border/80 bg-background hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Columnas
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px] bg-popover border-border">
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Mostrar / Ocultar
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                let label = column.id;
                if (column.id === "document_code") label = "Código";
                else if (column.id === "title") label = "Título";
                else if (column.id === "latest_revision") label = "Revisión";
                else if (column.id === "status") label = "Estado";
                else if (column.id === "planned_date") label = "Emisión Plan.";
                else if (column.id === "actual_date") label = "Emisión Real";
                else {
                  const propDef = customPropertiesDef.find((p) => p.key === column.id);
                  if (propDef) label = propDef.label;
                }

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className="text-xs"
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* CSV Import */}
        {!isProjectArchived && (
          <Button
            variant="outline"
            size="sm"
            onClick={onImportCSVClick}
            className="h-8 text-xs gap-1.5 border-border/80 bg-background hover:bg-muted/50 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar CSV
          </Button>
        )}

        {/* New Document */}
        {!isProjectArchived && (
          <Button
            size="sm"
            onClick={onNewDocumentClick}
            className="h-8 text-xs gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo Documento
          </Button>
        )}
      </div>
    </div>
  );
}
