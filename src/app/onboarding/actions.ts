"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Lista de dominios públicos comunes a ignorar para la detección corporativa
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "aol.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "yahoo.es",
  "hotmail.es",
]);

/**
 * Extrae y valida el dominio corporativo de un correo electrónico.
 * Retorna el dominio si es corporativo, o null si es público o inválido.
 */
export async function getCorporateDomain(email: string): Promise<string | null> {
  if (!email || !email.includes("@")) return null;
  const parts = email.split("@");
  if (parts.length < 2) return null;
  
  const domain = parts[1].toLowerCase().trim();
  if (PUBLIC_DOMAINS.has(domain)) {
    return null;
  }
  return domain;
}

const onboardingSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre de la organización debe tener al menos 3 caracteres")
    .max(100, "El nombre de la organización no puede superar los 100 caracteres")
    .trim(),
});

/**
 * Server Action para completar el Onboarding creando una nueva organización
 */
export async function completeOnboardingAction(prevState: any, formData: FormData) {
  // Cliente estándar para validar al usuario autenticado actual
  const userSupabase = await createClient();

  // 1. Verificar autenticación del usuario
  const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Validar campos con Zod
  const rawName = formData.get("name") as string;
  const validatedFields = onboardingSchema.safeParse({ name: rawName });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.name?.[0] || "Nombre inválido.",
    };
  }

  const { name } = validatedFields.data;

  // 3. Obtener dominio corporativo del creador
  const domain = await getCorporateDomain(authUser.email ?? "");

  // Cliente administrativo con service role para realizar las mutaciones
  const adminSupabase = createAdminClient();

  try {
    // 4. Crear la organización con estrategia de doble-intento (resiliente a migraciones pendientes)
    let orgData = null;
    let orgError = null;

    // Intento 1: Esquema Nuevo (email_domain, sin org_type)
    const { data: newOrgData, error: newOrgError } = await adminSupabase
      .from("organizations")
      .insert({
        name,
        email_domain: domain,
      } as any)
      .select("id")
      .single();

    if (newOrgError) {
      console.warn("Fallo al insertar con esquema nuevo (email_domain/no org_type), reintentando con esquema original:", newOrgError.message);
      
      // Intento 2 (Fallback): Esquema Original (org_type es requerido y debe ser 'OWNER', 'CLIENT' o 'CONTRACTOR')
      const { data: oldOrgData, error: oldOrgError } = await adminSupabase
        .from("organizations")
        .insert({
          name,
          org_type: "OWNER", // Satisface la restricción CHECK original
        } as any)
        .select("id")
        .single();

      if (oldOrgError) {
        console.error("Error al crear organización con ambos esquemas:", oldOrgError);
        return { error: `No se pudo crear la organización. Detalle: ${oldOrgError.message}` };
      }
      orgData = oldOrgData;
    } else {
      orgData = newOrgData;
    }

    const organizationId = orgData.id;

    // 5. Actualizar o crear de forma resiliente el perfil del usuario conectándolo a la organización
    const { data: existingUser } = await adminSupabase
      .from("users")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!existingUser) {
      console.warn(`Perfil de usuario no encontrado en la tabla public.users para el ID ${authUser.id}. Creándolo de forma resiliente...`);
      const { error: insertUserError } = await adminSupabase
        .from("users")
        .insert({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email || "Usuario",
          organization_id: organizationId,
          is_admin: true,
        });

      if (insertUserError) {
        console.error("Error al crear perfil de usuario de forma resiliente:", insertUserError);
        return { error: `No se pudo asociar tu usuario a la organización. Detalle: ${insertUserError.message}` };
      }
    } else {
      const { error: userError } = await adminSupabase
        .from("users")
        .update({ 
          organization_id: organizationId,
          is_admin: true,
        })
        .eq("id", authUser.id);

      if (userError) {
        console.error("Error al actualizar usuario:", userError);
        return { error: `No se pudo asociar tu usuario a la organización. Detalle: ${userError.message}` };
      }
    }

    // 6. Crear la suscripción gratuita (FREE) por defecto para la organización
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const { error: subError } = await adminSupabase
      .from("subscriptions")
      .insert({
        organization_id: organizationId,
        plan_name: "FREE",
        status: "ACTIVE",
        storage_limit_mb: 500, // 500 MB
        projects_limit: 3,     // Límite de 3 proyectos activos
        current_period_end: oneYearFromNow.toISOString(),
      });

    if (subError) {
      console.error("Error al crear suscripción inicial:", subError);
    }

  } catch (err) {
    console.error("Excepción crítica en Server Action:", err);
    return { error: "Ocurrió un error inesperado al procesar el onboarding." };
  }

  // Revalidar el path global para actualizar el layout y sidebar
  revalidatePath("/", "layout");
  
  // Redirigir al dashboard principal
  redirect("/");
}

/**
 * Server Action para cerrar sesión
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
