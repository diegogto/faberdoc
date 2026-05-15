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
import { X, Search } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import type { DocumentTableRow } from "@/lib/types";

interface DocumentToolbarProps {
  table: Table<DocumentTableRow>;
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "IN_REVIEW", label: "En Revisión" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "ISSUED", label: "Emitido" },
];

const SPECIALTY_OPTIONS = [
  "Civil",
  "Mecánica",
  "Eléctrica",
  "Instrumentación",
  "Piping",
  "Procesos",
  "Estructural",
  "Geotecnia",
  "Hidráulica",
  "Topografía",
];

export function DocumentToolbar({ table }: DocumentToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const globalFilter = table.getState().globalFilter ?? "";

  return (
    <div className="flex items-center gap-3 py-3 px-4">
      {/* Global search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="pl-8 h-8 text-sm"
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
        <SelectTrigger className="h-8 w-[140px] text-sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Specialty filter */}
      <Select
        value={
          (table.getColumn("specialty")?.getFilterValue() as string) ??
          "__all__"
        }
        onValueChange={(value) =>
          table
            .getColumn("specialty")
            ?.setFilterValue(value === "__all__" ? undefined : value)
        }
      >
        <SelectTrigger className="h-8 w-[160px] text-sm">
          <SelectValue placeholder="Especialidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas</SelectItem>
          {SPECIALTY_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2 text-xs"
        >
          Limpiar
          <X className="ml-1 h-3 w-3" />
        </Button>
      )}

      {/* Row count */}
      <span className="text-xs text-muted-foreground ml-auto">
        {table.getFilteredRowModel().rows.length} documentos
      </span>
    </div>
  );
}
