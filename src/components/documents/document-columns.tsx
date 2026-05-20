"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DocumentTableRow, CustomPropertyDefinition, RevisionStatus } from "@/lib/types";

export function generateDocumentColumns(
  customPropertiesDef: CustomPropertyDefinition[]
): ColumnDef<DocumentTableRow>[] {
  const baseColumnsBefore: ColumnDef<DocumentTableRow>[] = [
    {
      accessorKey: "document_code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Código
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-foreground font-medium">
          {row.getValue("document_code")}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Título
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-foreground max-w-[280px] truncate block font-medium">
          {row.getValue("title")}
        </span>
      ),
    },
  ];

  // Columnas dinámicas de propiedades personalizadas del proyecto
  const dynamicColumns: ColumnDef<DocumentTableRow>[] = customPropertiesDef.map((prop) => ({
    accessorKey: prop.key,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {prop.label}
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {String(row.getValue(prop.key) ?? "—")}
      </span>
    ),
    filterFn: prop.type === "select" ? "equals" : "auto",
  }));

  const baseColumnsAfter: ColumnDef<DocumentTableRow>[] = [
    {
      accessorKey: "latest_revision",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider text-center block w-full">
          Rev.
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-sm font-mono font-semibold text-center block w-full">
          {row.getValue("latest_revision")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="text-xs font-semibold uppercase tracking-wider block text-center md:text-left">
          Estado
        </span>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as RevisionStatus | null;
        if (!status) {
          return <span className="text-sm text-muted-foreground/60 italic block text-center md:text-left">—</span>;
        }
        return (
          <div className="flex items-center justify-center md:justify-start">
            <StatusBadge status={status} />
          </div>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "planned_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Emisión Plan.
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("planned_date") as string | null;
        if (!date) return <span className="text-sm text-muted-foreground/60">—</span>;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "actual_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Emisión Real
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("actual_date") as string | null;
        if (!date) return <span className="text-sm text-muted-foreground/60">—</span>;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      },
    },
  ];

  return [...baseColumnsBefore, ...dynamicColumns, ...baseColumnsAfter];
}
