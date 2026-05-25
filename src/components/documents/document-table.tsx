"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateDocumentColumns } from "./document-columns";
import { DocumentToolbar } from "./document-toolbar";
import { DocumentDrawer } from "./document-drawer";
import { DocumentCreateDialog } from "./document-create-dialog";
import { DocumentImportDialog } from "./document-import-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import type { DocumentTableRow, DocumentDetail, CustomPropertyDefinition } from "@/lib/types";

interface DocumentTableProps {
  data: DocumentTableRow[];
  projectId: string;
  projectName: string;
  customPropertiesDef: CustomPropertyDefinition[];
  namingPattern: string;
}

export function DocumentTable({
  data,
  projectId,
  projectName,
  customPropertiesDef,
  namingPattern,
}: DocumentTableProps) {
  const router = useRouter();

  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Estados de modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Estado del panel lateral (Drawer)
  const [selectedDocumentDetail, setSelectedDocumentDetail] =
    useState<DocumentDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Generar columnas de forma dinámica
  const columns = useMemo(
    () => generateDocumentColumns(customPropertiesDef),
    [customPropertiesDef]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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
    // Retrasar la limpieza de datos para permitir la animación de salida
    setTimeout(() => setSelectedDocumentDetail(null), 300);
  };

  const handleRefreshData = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg shadow-xs overflow-hidden">
      {/* Toolbar */}
      <DocumentToolbar
        table={table}
        customPropertiesDef={customPropertiesDef}
        onNewDocumentClick={() => setIsCreateOpen(true)}
        onImportCSVClick={() => setIsImportOpen(true)}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-4 text-muted-foreground font-semibold"
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
                  className="notion-table-row cursor-pointer border-b border-border/50 hover:bg-muted/40 transition-colors"
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
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-64 text-center"
                >
                  <EmptyState
                    title="Sin documentos registrados"
                    description="No hay documentos en la MDL para este proyecto o ningún registro coincide con los filtros."
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
        projectId={projectId}
        onRefresh={() => {
          if (selectedDocumentDetail) {
            handleRowClick(selectedDocumentDetail.document.id);
          }
          router.refresh();
        }}
      />

      {/* Modal: Crear Documento */}
      <DocumentCreateDialog
        projectId={projectId}
        projectName={projectName}
        customPropertiesDef={customPropertiesDef}
        namingPattern={namingPattern}
        currentCount={data.length}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleRefreshData}
      />

      {/* Modal: Importar CSV */}
      <DocumentImportDialog
        projectId={projectId}
        projectName={projectName}
        customPropertiesDef={customPropertiesDef}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleRefreshData}
      />
    </div>
  );
}
