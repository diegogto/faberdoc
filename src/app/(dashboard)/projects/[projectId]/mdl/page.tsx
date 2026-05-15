import { DocumentTable } from "@/components/documents/document-table";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTableRow } from "@/lib/types";

interface MDLPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MDLPage({ params }: MDLPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Obtener documentos del proyecto con su última revisión y datos de issuance
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

  // Transformar a DocumentTableRow — toma la última revisión por version_index
  const documents: DocumentTableRow[] = (rawDocuments ?? []).map((doc) => {
    const revisions = (doc.revisions as Array<{
      id: string;
      version_label: string;
      version_index: number;
      status: string;
      issuance_logs: Array<{
        current_planned_date: string;
        actual_issuance_date: string | null;
      }>;
    }>) ?? [];

    // Ordenar por version_index descendente para obtener la última
    const latestRevision = revisions.sort(
      (a, b) => b.version_index - a.version_index
    )[0];

    const issuance = latestRevision?.issuance_logs?.[0] ?? null;
    const customProps = doc.custom_properties as Record<string, string> | null;

    return {
      id: doc.id,
      document_code: doc.document_code,
      title: doc.title,
      specialty: customProps?.specialty ?? customProps?.especialidad ?? "-",
      area: customProps?.area ?? "-",
      latest_revision: latestRevision?.version_label ?? "-",
      status: (latestRevision?.status ?? "DRAFT") as DocumentTableRow["status"],
      planned_date: issuance?.current_planned_date ?? null,
      actual_date: issuance?.actual_issuance_date ?? null,
    };
  });

  return (
    <div className="h-full flex flex-col">
      <DocumentTable data={documents} />
    </div>
  );
}
