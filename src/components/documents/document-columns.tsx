"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DocumentTableRow } from "@/lib/types";

export const documentColumns: ColumnDef<DocumentTableRow>[] = [
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
      <span className="font-mono text-[13px] text-foreground">
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
      <span className="text-sm text-foreground max-w-[300px] truncate block">
        {row.getValue("title")}
      </span>
    ),
  },
  {
    accessorKey: "specialty",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Especialidad
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("specialty")}
      </span>
    ),
    filterFn: "equals",
  },
  {
    accessorKey: "area",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Área
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("area")}
      </span>
    ),
  },
  {
    accessorKey: "latest_revision",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Rev.
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm font-mono font-medium text-center block">
        {row.getValue("latest_revision")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Estado
      </span>
    ),
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
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
      if (!date) return <span className="text-sm text-muted-foreground">—</span>;
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
