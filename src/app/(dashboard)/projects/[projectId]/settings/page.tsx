import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SettingsTabsClient } from "./settings-tabs-client";
import { getProjectClientsAction } from "./client-actions";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Get current auth user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) notFound();

  // Load project including new explicit columns
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, name, naming_pattern, versioning_logic, review_flow_config, custom_properties_definition, organization_id, description, location, location_details, client_name, versioning_format_config, archived_at"
    )
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (!project) notFound();

  // Load current user profile (to check if admin)
  const { data: currentUserProfile } = await supabase
    .from("users")
    .select("organization_id, is_admin")
    .eq("id", authUser.id)
    .single();

  const isCurrentUserAdmin = currentUserProfile?.is_admin === true;

  // Load project members with user info including organization_id
  const { data: rawMembers } = await supabase
    .from("project_members")
    .select("user_id, role, users(full_name, email, organization_id)")
    .eq("project_id", projectId);

  type MemberRow = {
    user_id: string;
    role: "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER";
    full_name: string;
    email: string | null;
    organization_id: string | null;
  };

  const members: MemberRow[] = (rawMembers ?? []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: m.users?.full_name ?? "Sin nombre",
    email: m.users?.email ?? null,
    organization_id: m.users?.organization_id ?? null,
  }));

  // Load all org members (for the "add member" dropdown — only users in the same org)
  const orgId = project.organization_id;
  type OrgMemberRow = { id: string; full_name: string; email: string | null };
  let orgMembers: OrgMemberRow[] = [];

  if (orgId && isCurrentUserAdmin) {
    const { data: rawOrgMembers } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", orgId);
    orgMembers = rawOrgMembers ?? [];
  }

  type CustomPropertyDef = {
    key: string;
    label: string;
    type: string;
    options?: string[];
  };

  const customProperties = (project.custom_properties_definition as unknown as CustomPropertyDef[]) ?? [];

  // Reviewers available for the flow editor (REVIEWER + OWNER_APPROVER roles)
  const reviewerRoles = ["REVIEWER", "OWNER_APPROVER", "COORDINATOR", "ADMIN"];
  const flowReviewers = members
    .filter((m) => reviewerRoles.includes(m.role))
    .map((m) => ({ userId: m.user_id, userName: m.full_name, userEmail: m.email }));

  // Existing flows (auto-migrate if old structure is found)
  let existingFlows = null;
  if (project.review_flow_config && typeof project.review_flow_config === "object") {
    const configObj = project.review_flow_config as any;
    if (Array.isArray(configObj.flows)) {
      existingFlows = configObj.flows;
    } else if (Array.isArray(configObj.nodes)) {
      existingFlows = [
        {
          id: "default-flow",
          name: "Flujo de Aprobación Estándar",
          isDefault: true,
          conditions: [],
          nodes: configObj.nodes,
          edges: configObj.edges,
        },
      ];
    }
  }

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
        currentUserId={authUser.id}
        currentUserOrgId={currentUserProfile?.organization_id || null}
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
