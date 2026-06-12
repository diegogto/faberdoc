import { notFound } from "next/navigation";
import { SettingsTabsClient } from "./settings-tabs-client";
import { getProjectClientsAction } from "./client-actions";
import { getProjectSettingsDataAction } from "../mdl/actions";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;

  const res = await getProjectSettingsDataAction(projectId);
  if (res.error || !res.data) {
    notFound();
  }

  const {
    project,
    currentUserId,
    currentUserOrgId,
    isCurrentUserAdmin,
    members,
    orgMembers,
    customProperties,
    flowReviewers,
    existingFlows,
  } = res.data;

  // Load connected clients for this project
  const { clients = [] } = await getProjectClientsAction(projectId);

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-sans text-zinc-900 dark:text-zinc-50">
          Configuración del Proyecto
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configura y personaliza los detalles, nomenclatura, accesos de clientes, miembros de equipo y flujos de revisión de tu proyecto.
        </p>
      </div>

      <SettingsTabsClient
        projectId={projectId}
        project={project}
        currentUserId={currentUserId}
        currentUserOrgId={currentUserOrgId}
        isCurrentUserAdmin={isCurrentUserAdmin}
        members={members}
        orgMembers={orgMembers}
        clients={clients}
        customProperties={customProperties}
        flowReviewers={flowReviewers}
        existingFlows={existingFlows}
      />
    </div>
  );
}
