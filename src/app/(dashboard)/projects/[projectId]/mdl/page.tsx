import { DocumentTable } from "@/components/documents/document-table";
import { getMDLPageDataAction } from "./actions";
import { notFound } from "next/navigation";

interface MDLPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MDLPage({ params }: MDLPageProps) {
  const { projectId } = await params;
  const res = await getMDLPageDataAction(projectId);

  if (res.error || !res.data) {
    notFound();
  }

  const {
    documents,
    customPropertiesDef,
    namingPattern,
    projectName,
    isProjectArchived,
    canAccessArchivedIntermediate,
    userRole,
    currentUserId,
  } = res.data;

  return (
    <div className="h-full flex flex-col">
      <DocumentTable
        data={documents}
        projectId={projectId}
        projectName={projectName}
        customPropertiesDef={customPropertiesDef}
        namingPattern={namingPattern}
        userRole={userRole as any}
        currentUserId={currentUserId}
        isProjectArchived={isProjectArchived}
        canAccessArchivedIntermediate={canAccessArchivedIntermediate}
      />
    </div>
  );
}

