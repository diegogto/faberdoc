import { Sidebar } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ProjectWithRole, User } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Obtener usuario autenticado — SIEMPRE usar getUser() en el servidor
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Obtener perfil del usuario y su organización
  const { data: userProfile } = await supabase
    .from("users")
    .select("*, organizations(id, name, logo_url)")
    .eq("id", authUser.id)
    .single();

  // Si no hay perfil o no tiene organización asociada, redirigir a Onboarding
  if (!userProfile || !userProfile.organization_id) {
    redirect("/onboarding");
  }

  const currentUser: User = {
    id: userProfile.id,
    organization_id: userProfile.organization_id,
    full_name: userProfile.full_name,
    avatar_url: userProfile.avatar_url,
    is_admin: userProfile.is_admin ?? false,
    created_at: userProfile.created_at,
  };

  const organizationName =
    (userProfile?.organizations as { name: string } | null)?.name ??
    "Mi Organización";

  const organizationLogoUrl =
    (userProfile?.organizations as { logo_url: string | null } | null)?.logo_url ??
    null;

  const userOrgId = userProfile.organization_id;

  // Obtener proyectos donde el usuario es miembro
  const { data: membershipRows } = await supabase
    .from("project_members")
    .select(
      `
      role,
      projects (
        id,
        name,
        organization_id,
        deleted_at,
        organizations:organizations!projects_organization_id_fkey ( id, name )
      )
    `
    )
    .eq("user_id", authUser.id);

  // Supabase devuelve `projects` como objeto (relación FK many-to-one).
  // Usamos `unknown` como paso intermedio para el type cast.
  type ProjectRow = {
    id: string;
    name: string;
    organization_id: string;
    deleted_at: string | null;
    organizations: { id: string; name: string } | null;
  };

  const projectsWithRole: ProjectWithRole[] = (membershipRows ?? [])
    .filter((row) => {
      const project = row.projects as unknown as ProjectRow | null;
      return project && !project.deleted_at;
    })
    .map((row) => {
      const project = row.projects as unknown as ProjectRow;

      return {
        id: project.id,
        name: project.name,
        organization_id: project.organization_id,
        organization_name: project.organizations?.name ?? "Sin organización",
        role: row.role as ProjectWithRole["role"],
        is_own_organization: project.organization_id === userOrgId,
      };
    });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        projects={projectsWithRole}
        organizationName={organizationName}
        organizationLogoUrl={organizationLogoUrl}
        user={currentUser}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Global user nav bar (always visible) */}
        <div className="flex items-center justify-end h-[var(--topbar-height)] border-b border-border px-4 bg-background">
          <UserNav user={currentUser} organizationName={organizationName} />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
