import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "./settings-form";
import { ProjectTeamPanel } from "./project-team-panel";
import { FlowConfigManager } from "@/components/flow-editor/FlowConfigManager";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // Get current auth user
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) notFound();

  // Load project
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, naming_pattern, versioning_logic, review_flow_config, custom_properties_definition, client_info, organization_id")
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

  const isCurrentUserAdmin =
    currentUserProfile?.is_admin === true;

  // Load project members with user info
  const { data: rawMembers } = await supabase
    .from("project_members")
    .select("user_id, role, users(full_name, email)")
    .eq("project_id", projectId);

  type MemberRow = {
    user_id: string;
    role: string;
    full_name: string;
    email: string | null;
  };

  const members: MemberRow[] = (rawMembers ?? []).map((m: any) => ({
    user_id: m.user_id,
    role: m.role,
    full_name: m.users?.full_name ?? "Sin nombre",
    email: m.users?.email ?? null,
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

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-10">
      {/* Project Info Settings Form */}
      <section>
        <h2 className="text-lg font-semibold mb-6">Información del Proyecto</h2>
        <SettingsForm project={project} />
      </section>

      <Separator />

      {/* Team Management */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold font-sans text-zinc-900 dark:text-zinc-50">
            Equipo del Proyecto
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestiona quién tiene acceso al proyecto y qué puede hacer cada miembro.
          </p>
        </div>
        <ProjectTeamPanel
          projectId={projectId}
          currentUserId={authUser.id}
          isCurrentUserAdmin={isCurrentUserAdmin}
          members={members as any}
          orgMembers={orgMembers}
        />
      </section>

      <Separator />

      {/* Review Flow Editor */}
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold font-sans text-zinc-900 dark:text-zinc-50">
            Flujos de Revisión y Aprobación
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configura reglas personalizadas para aplicar diferentes flujos de aprobación según los metadatos del documento.
          </p>
        </div>
        <FlowConfigManager
          projectId={projectId}
          customProperties={customProperties}
          reviewers={flowReviewers}
          initialFlows={existingFlows}
        />
      </section>

      <Separator />

      {/* Dynamic Properties (read-only for now) */}
      <section>
        <h2 className="text-lg font-semibold mb-4 font-sans text-zinc-900 dark:text-zinc-50">
          Propiedades Dinámicas (Campos JSONB)
        </h2>
        <div className="space-y-4">
          {customProperties.map((prop) => (
            <div
              key={prop.key}
              className="rounded-lg border border-border p-4 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{prop.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {prop.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                key: {prop.key}
              </p>
              {prop.options && prop.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {prop.options.map((opt) => (
                    <Badge key={opt} variant="outline" className="text-xs bg-white dark:bg-zinc-950">
                      {opt}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
