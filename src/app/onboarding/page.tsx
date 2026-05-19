import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getCorporateDomain } from "./actions";
import { OnboardingClient } from "./onboarding-client";

interface PageProps {
  searchParams: Promise<{ bypass?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  // 1. Obtener sesión del usuario
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Verificar si el usuario ya tiene una organización asociada
  const { data: userProfile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", authUser.id)
    .single();

  if (userProfile?.organization_id) {
    redirect("/");
  }

  const { bypass } = await searchParams;
  const isBypass = bypass === "true";

  // 3. Extraer dominio del correo y buscar duplicados corporativos
  const email = authUser.email ?? "";
  const domain = await getCorporateDomain(email);

  let existingOrg: { id: string; name: string } | null = null;
  let members: string[] = [];

  // Solo buscar duplicados si el dominio es corporativo y no se solicitó bypass explícito
  if (domain && !isBypass) {
    const adminSupabase = createAdminClient();

    const { data: orgData } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("email_domain", domain)
      .is("deleted_at", null)
      .maybeSingle();

    if (orgData) {
      existingOrg = orgData;

      // Obtener compañeros o miembros para que puedan contactarles
      const { data: membersData } = await adminSupabase
        .from("users")
        .select("full_name")
        .eq("organization_id", orgData.id)
        .limit(5); // Limitar a los primeros 5 miembros para no saturar la UI

      if (membersData) {
        members = membersData.map((m) => m.full_name);
      }
    }
  }

  return (
    <OnboardingClient
      userEmail={email}
      corporateDomain={domain}
      existingOrg={existingOrg}
      members={members}
    />
  );
}
