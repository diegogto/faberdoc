"use server";

import { z } from "zod";
import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getInviteEmailHtml } from "@/lib/email-templates";

// Esquemas de validación Zod
const updateProfileSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const inviteUserSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  is_admin: z.boolean(),
});

// Helper para verificar que el usuario actual es admin de la organización
async function checkCallerIsAdmin() {
  const supabase = await createClient();
  
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error("No autenticado");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, organization_id")
    .eq("id", authUser.id)
    .single();

  if (!profile || !profile.is_admin || !profile.organization_id) {
    throw new Error("No autorizado. Se requieren permisos de administrador.");
  }

  return { callerId: authUser.id, organizationId: profile.organization_id };
}

/**
 * Actualiza el perfil del usuario actual (nombre completo).
 */
export async function updateProfileAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, error: "No autenticado" };
    }

    const rawName = formData.get("full_name") as string;
    const validated = updateProfileSchema.safeParse({ full_name: rawName });

    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    const { error } = await supabase
      .from("users")
      .update({ full_name: validated.data.full_name })
      .eq("id", authUser.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

/**
 * Actualiza la contraseña del usuario en su sesión actual.
 */
export async function updatePasswordAction(formData: FormData) {
  try {
    const supabase = await createClient();
    
    const rawPassword = formData.get("password") as string;
    const validated = updatePasswordSchema.safeParse({ password: rawPassword });

    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: validated.data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

/**
 * Cambia el rol de un usuario de la organización (hacer o quitar admin).
 */
export async function changeUserRoleAction(targetUserId: string, isAdmin: boolean) {
  try {
    const { organizationId, callerId } = await checkCallerIsAdmin();
    const adminSupabase = createAdminClient();

    // Evitar que el administrador se quite permisos a sí mismo
    if (targetUserId === callerId) {
      return {
        success: false,
        error: "No puedes cambiar tu propio rol de administrador.",
      };
    }

    const { error } = await adminSupabase
      .from("users")
      .update({ is_admin: isAdmin })
      .eq("id", targetUserId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

/**
 * Remueve un usuario de la organización (y por ende de las membresías de proyectos).
 */
export async function removeUserFromOrgAction(targetUserId: string) {
  try {
    const { organizationId, callerId } = await checkCallerIsAdmin();
    const adminSupabase = createAdminClient();

    // Evitar que el administrador se elimine a sí mismo
    if (targetUserId === callerId) {
      return {
        success: false,
        error: "No puedes eliminarte a ti mismo de la organización.",
      };
    }

    // 1. Eliminar membresías de proyectos de la organización
    // Primero, obtener los IDs de los proyectos de la organización
    const { data: orgProjects } = await adminSupabase
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId);

    const projectIds = (orgProjects ?? []).map((p) => p.id);

    if (projectIds.length > 0) {
      await adminSupabase
        .from("project_members")
        .delete()
        .eq("user_id", targetUserId)
        .in("project_id", projectIds);
    }

    // 2. Remover al usuario de la organización
    const { error } = await adminSupabase
      .from("users")
      .update({ organization_id: null, is_admin: false })
      .eq("id", targetUserId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

/**
 * Crea una invitación para unirse a la organización y envía el correo.
 */
export async function inviteUserAction(email: string, isAdmin: boolean) {
  try {
    const { organizationId, callerId } = await checkCallerIsAdmin();
    const supabase = await createClient();

    const validated = inviteUserSchema.safeParse({ email, is_admin: isAdmin });
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    // Verificar si el correo ya es miembro de la organización
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, organization_id")
      .eq("email", validated.data.email)
      .single();

    if (existingUser && existingUser.organization_id === organizationId) {
      return {
        success: false,
        error: "El usuario ya forma parte de esta organización.",
      };
    }

    // Crear la invitación en la base de datos
    const { data: invitation, error: inviteError } = await supabase
      .from("organization_invitations")
      .upsert(
        {
          organization_id: organizationId,
          email: validated.data.email.toLowerCase(),
          is_admin: validated.data.is_admin,
          invited_by: callerId,
          status: "PENDING",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,email" }
      )
      .select("id")
      .single();

    if (inviteError) {
      return { success: false, error: inviteError.message };
    }

    // Enviar el correo de invitación
    const origin = await getRequestOrigin();

    const { data: orgInfo } = await supabase
      .from("organizations")
      .select("name, logo_url")
      .eq("id", organizationId)
      .single();

    const orgName = orgInfo?.name ?? "Faberdoc Organization";
    const logoUrl = orgInfo?.logo_url || null;
    const roleLabel = validated.data.is_admin ? "Administrador" : "Colaborador";
    const registerLink = `${origin}/register`;

    const emailContent = getInviteEmailHtml(orgName, roleLabel, registerLink, logoUrl);

    const emailResult = await sendEmail({
      to: validated.data.email.toLowerCase(),
      subject: `Invitación para unirte a ${orgName} en Faberdoc`,
      html: emailContent,
    });


    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

/**
 * Aprueba o rechaza una solicitud de acceso (join request).
 */
export async function handleJoinRequestAction(requestId: string, approve: boolean) {
  try {
    const { organizationId } = await checkCallerIsAdmin();
    const adminSupabase = createAdminClient();

    // Obtener información de la solicitud
    const { data: request, error: fetchError } = await adminSupabase
      .from("join_requests")
      .select("*, users(full_name, email)")
      .eq("id", requestId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: "Solicitud no encontrada." };
    }

    if (approve) {
      // 1. Vincular al usuario a la organización
      const { error: userUpdateError } = await adminSupabase
        .from("users")
        .update({ organization_id: organizationId })
        .eq("id", request.user_id);

      if (userUpdateError) {
        return { success: false, error: userUpdateError.message };
      }

      // 2. Marcar la solicitud como APPROVED
      await adminSupabase
        .from("join_requests")
        .update({ status: "APPROVED" })
        .eq("id", requestId);
    } else {
      // Marcar la solicitud como REJECTED
      await adminSupabase
        .from("join_requests")
        .update({ status: "REJECTED" })
        .eq("id", requestId);
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

const updateOrganizationSchema = z.object({
  name: z.string().min(2, "El nombre de la organización debe tener al menos 2 caracteres").max(100),
  logo_url: z.string().url("URL de logo inválida").or(z.literal("")).nullable(),
});

/**
 * Actualiza los datos de la organización (nombre y URL del logo).
 */
export async function updateOrganizationAction(formData: FormData) {
  try {
    const { organizationId } = await checkCallerIsAdmin();
    const supabase = await createClient();

    const name = formData.get("name") as string;
    const logoUrl = formData.get("logo_url") as string;

    const validated = updateOrganizationSchema.safeParse({
      name,
      logo_url: logoUrl ? logoUrl.trim() : null,
    });

    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    // adminClient bypasea RLS: la autorización ya fue validada por checkCallerIsAdmin().
    // Sin esto, el UPDATE falla silenciosamente porque organizations no tiene política UPDATE.
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("organizations")
      .update({
        name: validated.data.name,
        logo_url: validated.data.logo_url,
      })
      .eq("id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error inesperado" };
  }
}

