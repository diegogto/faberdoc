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
import { getDocumentDetailAction } from "@/app/(dashboard)/projects/[projectId]/mdl/actions";
import type { DocumentTableRow, DocumentDetail, CustomPropertyDefinition } from "@/lib/types";


type ProjectRole = "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER" | "UPLOADER";

interface DocumentTableProps {
  data: DocumentTableRow[];
  projectId: string;
  projectName: string;
  customPropertiesDef: CustomPropertyDefinition[];
  namingPattern: string;
  userRole?: ProjectRole;
  currentUserId?: string;
  isProjectArchived?: boolean;
  canAccessArchivedIntermediate?: boolean;
}

export function DocumentTable({
  data,
  projectId,
  projectName,
  customPropertiesDef,
  namingPattern,
  userRole = "VIEWER",
  currentUserId,
  isProjectArchived = false,
  canAccessArchivedIntermediate = false,
}: DocumentTableProps) {
  const router = useRouter();

  // Estados de tabla
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [filterTab, setFilterTab] = useState<"all" | "pending">("all");

  // Estados de modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Estado del panel lateral (Drawer)
  const [selectedDocumentDetail, setSelectedDocumentDetail] =
    useState<DocumentDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Filtrar los documentos donde el usuario actual tiene revisión/ejecución pendiente en active_nodes
  const checkIsPending = (doc: DocumentTableRow) => {
    if (!currentUserId) return false;
    const activeNodes = (doc.active_nodes as any[]) || [];
    return activeNodes.some((node) => {
      if (node.status !== "PENDING") return false;
      if (node.type === "reviewer") {
        return node.data?.userId === currentUserId;
      }
      if (node.type === "executor") {
        return userRole === "COORDINATOR" || userRole === "UPLOADER" || userRole === "ADMIN";
      }
      return false;
    });
  };

  const pendingCount = useMemo(() => {
    return data.filter(checkIsPending).length;
  }, [data, currentUserId, userRole]);

  const filteredData = useMemo(() => {
    if (filterTab === "all") return data;
    return data.filter(checkIsPending);
  }, [data, filterTab, currentUserId, userRole]);

  // Generar columnas de forma dinámica
  const columns = useMemo(
    () => generateDocumentColumns(customPropertiesDef),
    [customPropertiesDef]
  );

  const table = useReactTable({
    data: filteredData,
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
      const res = await getDocumentDetailAction(projectId, documentId);

      if (res.error || !res.detail) {
        console.error("Error fetching document detail:", res.error);
        setSelectedDocumentDetail(null);
        return;
      }

      setSelectedDocumentDetail(res.detail as DocumentDetail);
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
        filterTab={filterTab}
        onFilterTabChange={setFilterTab}
        currentUserId={currentUserId}
        pendingCount={pendingCount}
        isProjectArchived={isProjectArchived}
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
                    description="No hay documentos en el Maestro de Documentos para este proyecto o ningún registro coincide con los filtros."
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
        userRole={userRole}
        currentUserId={currentUserId}
        onRefresh={() => {
          if (selectedDocumentDetail) {
            handleRowClick(selectedDocumentDetail.document.id);
          }
          router.refresh();
        }}
        isProjectArchived={isProjectArchived}
        canAccessArchivedIntermediate={canAccessArchivedIntermediate}
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
