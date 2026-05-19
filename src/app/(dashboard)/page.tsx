import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyProjectsView } from "@/components/layout/empty-projects-view";

/**
 * Dashboard root — redirige al primer proyecto del usuario.
 * Si no tiene proyectos, muestra un estado vacío interactivo.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Obtener perfil de usuario para validar permisos y nombre
  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    redirect("/onboarding");
  }

  // Buscar primer proyecto del usuario
  const { data: firstMembership } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (firstMembership) {
    redirect(`/projects/${firstMembership.project_id}/mdl`);
  }

  // Si no tiene proyectos, mostrar estado vacío interactivo premium
  return (
    <EmptyProjectsView
      isAdmin={userProfile.is_admin ?? false}
      userFullName={userProfile.full_name}
    />
  );
}
