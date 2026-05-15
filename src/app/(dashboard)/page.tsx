import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard root — redirige al primer proyecto del usuario.
 * Si no tiene proyectos, muestra un estado vacío.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Buscar primer proyecto del usuario
  const { data: firstMembership } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (firstMembership) {
    redirect(`/projects/${firstMembership.project_id}/mdl`);
  }

  // Si no tiene proyectos, mostrar estado vacío
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-3">
        <h2 className="text-lg font-medium text-foreground">
          Sin proyectos asignados
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          No tienes proyectos asignados aún. Contacta al administrador de tu
          organización para que te agregue como miembro de un proyecto.
        </p>
      </div>
    </div>
  );
}
