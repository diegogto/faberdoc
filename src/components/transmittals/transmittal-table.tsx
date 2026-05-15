"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowUpDown, Search, Send, Plus } from "lucide-react";
import type { TransmittalTableRow } from "@/lib/types";

const transmittalColumns: ColumnDef<TransmittalTableRow>[] = [
  {
    accessorKey: "transmittal_code",
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
        {row.getValue("transmittal_code")}
      </span>
    ),
  },
  {
    accessorKey: "recipient_name",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Destinatario
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue("recipient_name")}</span>
    ),
  },
  {
    accessorKey: "document_count",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Documentos
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground text-center block">
        {row.getValue("document_count")}
      </span>
    ),
  },
  {
    accessorKey: "sender_name",
    header: () => (
      <span className="text-xs font-semibold uppercase tracking-wider">
        Enviado por
      </span>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.getValue("sender_name")}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Fecha
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
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

interface TransmittalTableProps {
  data: TransmittalTableRow[];
}

export function TransmittalTable({ data }: TransmittalTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: transmittalColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 py-3 px-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar envíos..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {table.getFilteredRowModel().rows.length} envíos
        </span>
        <Button size="sm" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          Nuevo Envío
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-4 text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="notion-table-row cursor-pointer border-b border-border/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={transmittalColumns.length}
                  className="h-48"
                >
                  <EmptyState
                    icon={<Send className="h-8 w-8 text-muted-foreground" />}
                    title="Sin envíos"
                    description="No hay transmittals registrados para este proyecto."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
