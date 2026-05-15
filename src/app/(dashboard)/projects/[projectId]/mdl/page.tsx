import { DocumentTable } from "@/components/documents/document-table";
import { mockDocumentRows } from "@/lib/mock-data";

interface MDLPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function MDLPage({ params }: MDLPageProps) {
  const { projectId } = await params;

  // Mock data lookup — will be Supabase query later
  const documents = mockDocumentRows[projectId] ?? [];

  return (
    <div className="h-full flex flex-col">
      <DocumentTable data={documents} />
    </div>
  );
}
