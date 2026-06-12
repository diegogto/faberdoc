import { TopBar } from "@/components/layout/top-bar";
import { notFound } from "next/navigation";
import { getProjectLayoutDataAction } from "./mdl/actions";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;

  const res = await getProjectLayoutDataAction(projectId);
  if (res.error || !res.project) {
    notFound();
  }

  const project = res.project;

  return (
    <div className="flex flex-col h-full">
      <TopBar projectId={project.id} projectName={project.name} />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
