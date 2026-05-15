"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { documentColumns } from "./document-columns";
import { DocumentToolbar } from "./document-toolbar";
import { DocumentDrawer } from "./document-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import type { DocumentTableRow, DocumentDetail } from "@/lib/types";

interface DocumentTableProps {
  data: DocumentTableRow[];
}

export function DocumentTable({ data }: DocumentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Drawer state
  const [selectedDocumentDetail, setSelectedDocumentDetail] =
    useState<DocumentDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const table = useReactTable({
    data,
    columns: documentColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleRowClick = async (documentId: string) => {
    setIsDrawerOpen(true);
    setIsLoadingDetail(true);

    try {
      const supabase = createClient();

      // Obtener documento completo con revisiones, archivos, comentarios e issuance
      const { data: doc } = await supabase
        .from("documents")
        .select(
          `
          *,
          revisions (
            *,
            uploader:users!uploader_id ( full_name ),
            files ( * ),
            comments ( * ),
            issuance_logs ( * )
          )
        `
        )
        .eq("id", documentId)
        .single();

      if (!doc) {
        setSelectedDocumentDetail(null);
        return;
      }

      // Transformar a DocumentDetail
      const revisions = (doc.revisions as Array<{
        id: string;
        document_id: string;
        uploader_id: string;
        version_label: string;
        version_index: number;
        status: string;
        created_at: string;
        uploader: { full_name: string } | null;
        files: Array<{
          id: string;
          revision_id: string;
          s3_key: string;
          file_name: string;
          file_size_bytes: number;
          created_at: string;
        }>;
        comments: Array<{
          id: string;
          revision_id: string;
          author_id: string;
          content: string;
          status: string;
          response_text: string | null;
          closed_at: string | null;
          created_at: string;
        }>;
        issuance_logs: Array<{
          id: string;
          revision_id: string;
          original_planned_date: string;
          current_planned_date: string;
          actual_issuance_date: string | null;
          iteration_count: number;
          created_at: string;
        }>;
      }>) ?? [];

      // Ordenar revisiones por version_index (más reciente primero)
      revisions.sort((a, b) => b.version_index - a.version_index);

      // Tomar el issuance de la última revisión
      const latestIssuance = revisions[0]?.issuance_logs?.[0] ?? null;

      const detail: DocumentDetail = {
        document: {
          id: doc.id,
          project_id: doc.project_id,
          document_code: doc.document_code,
          title: doc.title,
          custom_properties: doc.custom_properties,
          created_at: doc.created_at,
          deleted_at: doc.deleted_at,
        },
        revisions: revisions.map((rev) => ({
          id: rev.id,
          document_id: rev.document_id,
          uploader_id: rev.uploader_id,
          version_label: rev.version_label,
          version_index: rev.version_index,
          status: rev.status as DocumentDetail["revisions"][0]["status"],
          created_at: rev.created_at,
          uploader_name: rev.uploader?.full_name ?? "Desconocido",
          files: rev.files ?? [],
          comments: (rev.comments ?? []).map((c) => ({
            ...c,
            status: c.status as "OPEN" | "RESPONDED" | "CLOSED",
          })),
        })),
        issuance: latestIssuance,
      };

      setSelectedDocumentDetail(detail);
    } catch (error) {
      console.error("Error fetching document detail:", error);
      setSelectedDocumentDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    // Delay clearing data for exit animation
    setTimeout(() => setSelectedDocumentDetail(null), 300);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <DocumentToolbar table={table} />

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
                  onClick={() => handleRowClick(row.original.id)}
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
                  colSpan={documentColumns.length}
                  className="h-48"
                >
                  <EmptyState
                    title="Sin documentos"
                    description="No se encontraron documentos con los filtros aplicados."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Document Detail Drawer */}
      <DocumentDrawer
        documentDetail={selectedDocumentDetail}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  );
}
