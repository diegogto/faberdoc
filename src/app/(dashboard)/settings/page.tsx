import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "Configuración | Faberdoc",
  description: "Configura tu perfil de usuario y gestiona los miembros de tu organización.",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado (siempre usar getUser en el servidor)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Obtener perfil del usuario
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, organization_id, full_name, email, avatar_url, is_admin")
    .eq("id", authUser.id)
    .single();

  if (!userProfile) {
    redirect("/login");
  }

  if (!userProfile.organization_id) {
    redirect("/onboarding");
  }

  // 3. Obtener organización
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, org_type")
    .eq("id", userProfile.organization_id)
    .single();

  if (!organization) {
    redirect("/onboarding");
  }

  // 4. Obtener todos los miembros de la organización
  const { data: orgUsers } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url, is_admin")
    .eq("organization_id", organization.id)
    .order("full_name", { ascending: true });

  // 5. Si es administrador, obtener invitaciones y solicitudes de acceso pendientes
  let invitations: any[] = [];
  let joinRequests: any[] = [];

  const isAdmin = userProfile.is_admin ?? false;

  if (isAdmin) {
    const { data: inviteData } = await supabase
      .from("organization_invitations")
      .select("id, email, is_admin, created_at, status")
      .eq("organization_id", organization.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    invitations = inviteData ?? [];

    const { data: requestData } = await supabase
      .from("join_requests")
      .select(`
        id,
        user_id,
        status,
        created_at,
        users (
          full_name,
          email
        )
      `)
      .eq("organization_id", organization.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false });

    joinRequests = requestData ?? [];
  }

  const currentUser = {
    id: userProfile.id,
    organization_id: userProfile.organization_id,
    full_name: userProfile.full_name,
    email: userProfile.email ?? authUser.email ?? null,
    avatar_url: userProfile.avatar_url,
    is_admin: isAdmin,
  };

  return (
    <SettingsClient
      currentUser={currentUser}
      organization={organization}
      orgUsers={orgUsers ?? []}
      invitations={invitations}
      joinRequests={joinRequests}
    />
  );
}
