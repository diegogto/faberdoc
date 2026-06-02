import { DocumentTable } from "@/components/documents/document-table";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTableRow, CustomPropertyDefinition } from "@/lib/types";

type ProjectRole = "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER" | "UPLOADER";

interface MDLPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MDLPage({ params }: MDLPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // 0. Auth user + project role
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let userRole: ProjectRole = "VIEWER";
  let isOrgAdmin = false;
  if (authUser) {
    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();
    if (membership?.role) userRole = membership.role as ProjectRole;

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();
    isOrgAdmin = profile?.is_admin === true;
  }

  // 1. Obtener información de configuración del proyecto (Naming y Propiedades)
  const { data: project } = await supabase
    .from("projects")
    .select("name, naming_pattern, custom_properties_definition, archived_at")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  const customPropertiesDef =
    (project?.custom_properties_definition as unknown as CustomPropertyDefinition[]) ?? [];
  const namingPattern = project?.naming_pattern ?? "{PROY}-{ESP}-{NUM}";
  const projectName = project?.name ?? "";
  const isProjectArchived = !!project?.archived_at;
  const canAccessArchivedIntermediate = isOrgAdmin || userRole === "ADMIN" || userRole === "COORDINATOR";

  // 2. Obtener documentos del proyecto con su última revisión, files e issuance
  const { data: rawDocuments } = await supabase
    .from("documents")
    .select(
      `
      id,
      document_code,
      title,
      custom_properties,
      revisions (
        id,
        version_label,
        version_index,
        status,
        current_flow_id,
        active_nodes,
        files ( id ),
        issuance_logs (
          current_planned_date,
          actual_issuance_date
        )
      )
    `
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("document_code", { ascending: true });

  // 3. Transformar a DocumentTableRow
  const documents: DocumentTableRow[] = (rawDocuments ?? []).map((doc) => {
    const revisions = (doc.revisions as Array<{
      id: string;
      version_label: string;
      version_index: number;
      status: string;
      current_flow_id: string | null;
      active_nodes: any[] | null;
      files: Array<{ id: string }>;
      issuance_logs: Array<{
        current_planned_date: string;
        actual_issuance_date: string | null;
      }>;
    }>) ?? [];

    // Ordenar por version_index descendente para obtener la última revisión
    const latestRevision = revisions.sort(
      (a, b) => b.version_index - a.version_index
    )[0];

    const issuance = latestRevision?.issuance_logs?.[0] ?? null;
    const customProps = doc.custom_properties as Record<string, string | number> | null;

    // Verificar si la última revisión tiene archivos subidos
    const hasFiles = (latestRevision?.files?.length ?? 0) > 0;

    // Aplanar las propiedades dinámicas
    const dynamicProps: Record<string, unknown> = {};
    for (const prop of customPropertiesDef) {
      dynamicProps[prop.key] = customProps?.[prop.key] ?? "—";
    }

    return {
      id: doc.id,
      document_code: doc.document_code,
      title: doc.title,
      latest_revision: hasFiles ? (latestRevision?.version_label ?? "—") : "—",
      status: hasFiles
        ? ((latestRevision?.status ?? "DRAFT") as DocumentTableRow["status"])
        : null, // Si no hay archivos, no tiene estado
      planned_date: issuance?.current_planned_date ?? null,
      actual_date: issuance?.actual_issuance_date ?? null,
      has_files: hasFiles,
      current_flow_id: latestRevision?.current_flow_id ?? null,
      active_nodes: latestRevision?.active_nodes ?? [],
      ...dynamicProps,
    };
  });

  return (
    <div className="h-full flex flex-col">
      <DocumentTable
        data={documents}
        projectId={projectId}
        projectName={projectName}
        customPropertiesDef={customPropertiesDef}
        namingPattern={namingPattern}
        userRole={userRole}
        currentUserId={authUser?.id}
        isProjectArchived={isProjectArchived}
        canAccessArchivedIntermediate={canAccessArchivedIntermediate}
      />
    </div>
  );
}
