import { TopBar } from "@/components/layout/top-bar";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

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
