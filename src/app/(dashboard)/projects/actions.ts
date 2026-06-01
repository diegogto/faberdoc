"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getProjectInviteEmailHtml } from "@/lib/email-templates";
import { sanitizeHtml } from "@/lib/sanitize";

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

  const mode = formData.get("mode") as string; // 'general' | 'naming' or null

  try {
    // Security check: must be Org Admin OR Project Coordinator
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: projectMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isOrgAdmin = userProfile?.is_admin === true;
    const isProjectCoordinator = projectMember?.role === "COORDINATOR" || projectMember?.role === "ADMIN";

    if (!isOrgAdmin && !isProjectCoordinator) {
      return { error: "No tienes permisos para modificar la configuración de este proyecto. Debes ser Administrador de la Organización o Coordinador del Proyecto." };
    }

    const updateData: any = {};

    if (!mode || mode === "general") {
      const name = formData.get("name") as string;
      if (name !== null) {
        if (!name.trim()) {
          return { error: "El nombre del proyecto es requerido." };
        }
        updateData.name = name.trim();
      }

      if (formData.has("description")) {
        const description = formData.get("description") as string;
        updateData.description = description ? sanitizeHtml(description) : null;
      }

      if (formData.has("location")) {
        const location = formData.get("location") as string;
        updateData.location = location ? location.trim() : null;
      }

      if (formData.has("location_details")) {
        const location_details_str = formData.get("location_details") as string;
        try {
          updateData.location_details = JSON.parse(location_details_str);
        } catch (e) {
          console.error("Error parsing location_details:", e);
        }
      }

      if (formData.has("client_name")) {
        const client_name = formData.get("client_name") as string;
        updateData.client_name = client_name ? client_name.trim() : null;
      }
    }

    if (!mode || mode === "naming") {
      if (formData.has("naming_pattern")) {
        const naming_pattern = formData.get("naming_pattern") as string;
        updateData.naming_pattern = naming_pattern.trim();
      }

      if (formData.has("versioning_logic")) {
        updateData.versioning_logic = formData.get("versioning_logic") as string;
      }

      if (formData.has("versioning_format_config")) {
        const versioning_format_config_str = formData.get("versioning_format_config") as string;
        try {
          updateData.versioning_format_config = JSON.parse(versioning_format_config_str);
        } catch (e) {
          console.error("Error parsing versioning_format_config:", e);
        }
      }

      if (formData.has("review_flow_type")) {
        const review_flow_type = formData.get("review_flow_type") as string;
        const { data: existingProject } = await supabase
          .from("projects")
          .select("review_flow_config")
          .eq("id", projectId)
          .single();
        const currentReviewFlowConfig = (existingProject?.review_flow_config as any) || {};
        updateData.review_flow_config = {
          ...currentReviewFlowConfig,
          review_type: review_flow_type || currentReviewFlowConfig.review_type || "PARALLEL",
        };
      }
    }

    // Ejecutar actualización
    const { error } = await supabase
      .from("projects")
      .update(updateData)
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
  // adminClient bypasea RLS para mutaciones privilegiadas validadas en servidor
  const adminSupabase = createAdminClient();

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

    const isProjectCoordinator = callerMember?.role === "COORDINATOR" || callerMember?.role === "ADMIN";
    if (!userProfile.is_admin && !isProjectCoordinator) {
      return { error: "No tienes permisos para administrar miembros en este proyecto. Debes ser Administrador de la Organización o Coordinador del Proyecto." };
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

    // 5. Insertar/actualizar la membresía (admin bypasea RLS; la autorización
    //    ya fue validada en los pasos anteriores del servidor)
    const { error: memberError } = await adminSupabase
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
    console.error("Excepción en asignación de membresía:", err);
    return { error: "Error inesperado." };
  }
}

export async function updateProjectAttributesAction(projectId: string, attributes: any[]) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No autenticado." };

  try {
    // Validate authorization: Org Admin or Project Coordinator
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: projectMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isOrgAdmin = userProfile?.is_admin === true;
    const isProjectCoordinator = projectMember?.role === "COORDINATOR" || projectMember?.role === "ADMIN";

    if (!isOrgAdmin && !isProjectCoordinator) {
      return { error: "No tienes permisos para modificar los atributos de este proyecto. Debes ser Administrador de la Organización o Coordinador del Proyecto." };
    }

    const { error } = await supabase
      .from("projects")
      .update({
        custom_properties_definition: attributes
      } as any)
      .eq("id", projectId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Error updating project attributes:", err);
    return { error: "Ocurrió un error inesperado al actualizar los atributos." };
  }
}

/**
 * Removes a user from a project's member list.
 * Only project ADMINs or org admins can remove members.
 * A user cannot remove themselves.
 */
export async function removeProjectMemberAction(projectId: string, targetUserId: string) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  if (authUser.id === targetUserId) {
    return { error: "No puedes removerte a ti mismo del proyecto." };
  }

  try {
    // Verify caller is org admin or project ADMIN
    const { data: userProfile } = await supabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", authUser.id)
      .single();

    if (!userProfile) return { error: "No se encontró perfil de usuario." };

    const { data: callerMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isProjectCoordinator = callerMember?.role === "COORDINATOR" || callerMember?.role === "ADMIN";
    if (!userProfile.is_admin && !isProjectCoordinator) {
      return { error: "No tienes permisos para remover miembros de este proyecto. Debes ser Administrador de la Organización o Coordinador del Proyecto." };
    }

    // adminClient bypasea RLS para DELETE privilegiado validado en servidor
    const adminSupabase = createAdminClient();
    const { error: deleteError } = await adminSupabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      return { error: `Error al remover miembro: ${deleteError.message}` };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al remover miembro del proyecto:", err);
    return { error: "Ocurrió un error inesperado al remover el miembro." };
  }
}

/**
 * Persists the visual review flow diagram (nodes + edges) to the project's
 * review_flow_config JSONB column.
 */
export async function saveReviewFlowAction(
  projectId: string,
  flowConfig: { nodes: unknown[]; edges: unknown[] }
) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    // Verify caller is org admin or project ADMIN
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: callerMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isProjectAdmin = callerMember?.role === "ADMIN" || callerMember?.role === "COORDINATOR";
    if (!userProfile?.is_admin && !isProjectAdmin) {
      return { error: "Solo los administradores del proyecto pueden modificar el flujo de aprobación." };
    }

    const { error } = await supabase
      .from("projects")
      .update({ review_flow_config: flowConfig } as any)
      .eq("id", projectId);

    if (error) return { error: `Error al guardar el flujo: ${error.message}` };

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al guardar flujo de revisión:", err);
    return { error: "Ocurrió un error inesperado al guardar el flujo." };
  }
}

/**
 * Saves the entire list of approval flows for the project.
 */
export async function saveProjectFlowsAction(
  projectId: string,
  flows: any[]
) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    // Verify caller is org admin or project ADMIN
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: callerMember } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isProjectAdmin = callerMember?.role === "ADMIN" || callerMember?.role === "COORDINATOR";
    if (!userProfile?.is_admin && !isProjectAdmin) {
      return { error: "Solo los administradores del proyecto pueden modificar el flujo de aprobación." };
    }

    const { error } = await supabase
      .from("projects")
      .update({ review_flow_config: { flows } } as any)
      .eq("id", projectId);

    if (error) return { error: `Error al guardar los flujos: ${error.message}` };

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al guardar flujos del proyecto:", err);
    return { error: "Ocurrió un error inesperado al guardar los flujos." };
  }
}



