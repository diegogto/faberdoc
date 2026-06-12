import { notFound } from "next/navigation";
import { IssuesClient } from "./issues-client";
import { getIssuesPageDataAction } from "../mdl/actions";

interface IssuesPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function IssuesPage({ params }: IssuesPageProps) {
  const { projectId } = await params;

  const res = await getIssuesPageDataAction(projectId);
  if (res.error || !res.data) {
    notFound();
  }

  const { issues, userRole } = res.data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 font-sans">
          Panel de Incidencias
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Revisa y responde a las observaciones técnicas formales emitidas por los revisores del cliente.
        </p>
      </div>

      <IssuesClient
        initialIssues={issues}
        projectId={projectId}
        userRole={userRole}
      />
    </div>
  );
}
