import { TopBar } from "@/components/layout/top-bar";
import { mockProjects } from "@/lib/mock-data";
import { notFound } from "next/navigation";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;

  // Find the project (mock lookup — will be Supabase query later)
  const project = mockProjects.find((p) => p.id === projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar projectId={project.id} projectName={project.name} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
