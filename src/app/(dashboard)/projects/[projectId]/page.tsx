import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Project root (Dashboard tab) — shows summary.
 * For now, displays a welcome card. Will show task summary later.
 */
export default async function ProjectDashboardPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  
  // For now, redirect to MDL as the main view
  redirect(`/projects/${projectId}/mdl`);
}
