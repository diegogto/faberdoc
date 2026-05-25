"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getProjectInviteEmailHtml } from "@/lib/email-templates";

const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre del proyecto debe tener al menos 3 caracteres")
    .max(100, "El nombre del proyecto no puede superar los 100 caracteres")
    .trim(),
  versioning_logic: z.enum(["MIXED", "SEPARATE_EMISSION"]).default("MIXED"),
  review_flow_type: z.enum(["PARALLEL", "SEQUENTIAL"]).default("PARALLEL"),
});

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();

  // 1. Verificar autenticación
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Validar campos
  const rawName = formData.get("name") as string;
  const rawVersioning = formData.get("versioning_logic") as string;
  const rawReviewFlow = formData.get("review_flow_type") as string;

  const validation = createProjectSchema.safeParse({
    name: rawName,
    versioning_logic: rawVersioning || "MIXED",
    review_flow_type: rawReviewFlow || "PARALLEL",
  });

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Datos inválidos.",
    };
  }

  const { name, versioning_logic, review_flow_type } = validation.data;

  try {
    // 3. Obtener el perfil del usuario para validar la organización y permisos
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", authUser.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Error al obtener perfil de usuario:", profileError);
      return { error: "No se pudo validar tu perfil de usuario." };
    }

    if (!userProfile.is_admin) {
      return { error: "Solo los administradores de la organización pueden crear proyectos." };
    }

    // 4. Definir propiedades personalizadas por defecto para un nuevo proyecto (estilo Notion/MDL)
    const defaultProperties = [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: ["Estructura", "Civil", "Mecánica", "Electricidad", "Instrumentación", "Procesos"],
      },
      {
        key: "area",
        label: "Área",
        type: "text",
      },
    ];

    // 5. Insertar proyecto en la base de datos (se aplica RLS de inserción)
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        name,
        organization_id: userProfile.organization_id,
        naming_pattern: "{PROY}-{ESP}-{NUM}",
        custom_properties_definition: defaultProperties,
        versioning_logic,
        review_flow_config: {
          review_type: review_flow_type,
          reviewers: [],
        },
      } as any)
      .select("id")
      .single();

    if (projectError || !newProject) {
      console.error("Error al insertar proyecto:", projectError);
      return { error: `No se pudo crear el proyecto. Detalle: ${projectError.message}` };
    }

    const projectId = newProject.id;

    // 6. Asignar automáticamente al creador (admin) como miembro del proyecto con rol ADMIN
    const { error: memberError } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: authUser.id,
        role: "ADMIN",
      });

    if (memberError) {
      console.error("Error al asignar membresía al proyecto:", memberError);
      return { error: `Proyecto creado, pero falló la membresía. Detalle: ${memberError.message}` };
    }

    // 7. Revalidar el path para refrescar Sidebar
    revalidatePath("/", "layout");

    return { success: true, projectId };
  } catch (err) {
    console.error("Excepción en creación de proyecto:", err);
    return { error: "Ocurrió un error inesperado al crear el proyecto." };
  }
}

export async function updateProjectSettingsAction(projectId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No autenticado." };

  const name = formData.get("name") as string;
  const versioning_logic = formData.get("versioning_logic") as string;
  const review_flow_type = formData.get("review_flow_type") as string;
  const naming_pattern = formData.get("naming_pattern") as string;

  if (!name || !name.trim()) {
    return { error: "El nombre del proyecto es requerido." };
  }

  try {
    const { error } = await supabase
      .from("projects")
      .update({
        name: name.trim(),
        versioning_logic,
        naming_pattern: naming_pattern.trim(),
        review_flow_config: {
          review_type: review_flow_type,
          reviewers: [],
        }
      } as any)
      .eq("id", projectId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return { error: "Error inesperado al guardar la configuración." };
  }
}

/**
 * Asigna un usuario de la organización a un proyecto y le envía una notificación por correo.
 */
export async function assignProjectMemberAction(
  projectId: string,
  userId: string,
  role: "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER"
) {
  const supabase = await createClient();

  // 1. Verificar autenticación
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    // 2. Obtener el perfil del usuario llamante
    const { data: userProfile } = await supabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", authUser.id)
      .single();

    if (!userProfile) return { error: "No se encontró perfil de usuario." };

    // 3. Verificar permisos
    const { data: callerMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    if (!userProfile.is_admin && callerMember?.role !== "ADMIN") {
      return { error: "No tienes permisos para administrar miembros en este proyecto." };
    }

    // 4. Verificar que el usuario objetivo pertenezca a la misma organización
    const { data: targetUser } = await supabase
      .from("users")
      .select("full_name, email, organization_id")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.organization_id !== userProfile.organization_id) {
      return { error: "El usuario debe pertenecer a tu organización." };
    }

    // 5. Insertar/actualizar la membresía
    const { error: memberError } = await supabase
      .from("project_members")
      .upsert({
        project_id: projectId,
        user_id: userId,
        role,
      }, { onConflict: "project_id,user_id" });

    if (memberError) {
      return { error: `Error al asignar miembro: ${memberError.message}` };
    }

    // 6. Enviar notificación por correo
    try {
      const { data: project } = await supabase
        .from("projects")
        .select("name, organization_id")
        .eq("id", projectId)
        .single();

      let logoUrl: string | null = null;
      if (project?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("logo_url")
          .eq("id", project.organization_id)
          .single();
        logoUrl = org?.logo_url || null;
      }

      const origin = await getRequestOrigin();
      const projectLink = `${origin}/projects/${projectId}`;
      const html = getProjectInviteEmailHtml(
        targetUser.full_name || "Colaborador",
        project?.name || "Proyecto",
        role,
        projectLink,
        logoUrl
      );

      await sendEmail({
        to: targetUser.email!,
        subject: `Asignación a proyecto: ${project?.name || ""} - Faberdoc`,
        html,
      });
    } catch (notifErr) {
      console.error("Error al enviar correo de asignación de proyecto:", notifErr);
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al asignar miembro del proyecto:", err);
    return { error: "Ocurrió un error inesperado al asignar el miembro." };
  }
}

