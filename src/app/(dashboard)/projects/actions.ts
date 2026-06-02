"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getProjectInviteEmailHtml } from "@/lib/email-templates";
import { sanitizeHtml } from "@/lib/sanitize";

export async function checkIfProjectArchived(projectId: string, supabase: any): Promise<boolean> {
  const { data: project } = await supabase
    .from("projects")
    .select("archived_at")
    .eq("id", projectId)
    .single();
  return !!project?.archived_at;
}

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
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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
  role: "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER" | "UPLOADER"
) {
  const supabase = await createClient();
  // adminClient bypasea RLS para mutaciones privilegiadas validadas en servidor
  const adminSupabase = createAdminClient();

  // 1. Verificar autenticación
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
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

export async function archiveProjectAction(projectId: string) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
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
      return { error: "No tienes permisos para archivar este proyecto. Debes ser Administrador de la Organización o Coordinador del Proyecto." };
    }

    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "El proyecto ya está archivado." };
    }

    const { error } = await supabase
      .from("projects")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) {
      return { error: `Error al archivar el proyecto: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath(`/projects/${projectId}/mdl`);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Excepción en archivar proyecto:", err);
    return { error: "Error inesperado al archivar el proyecto." };
  }
}

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin) {
      return { error: "Solo los administradores de la organización pueden eliminar proyectos." };
    }

    const { data: project } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .single();

    if (!project || project.organization_id !== userProfile.organization_id) {
      return { error: "El proyecto no pertenece a tu organización o no existe." };
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) {
      return { error: `Error al eliminar el proyecto: ${error.message}` };
    }

    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Excepción en eliminar proyecto:", err);
    return { error: "Error inesperado al eliminar el proyecto." };
  }
}

async function purgeProjectStorageFiles(projectId: string, supabase: any) {
  try {
    const { data: docs } = await supabase
      .from("documents")
      .select("id")
      .eq("project_id", projectId);

    if (!docs || docs.length === 0) return;
    const docIds = docs.map((d: any) => d.id);

    const { data: revs } = await supabase
      .from("revisions")
      .select("id")
      .in("document_id", docIds);

    if (!revs || revs.length === 0) return;
    const revIds = revs.map((r: any) => r.id);

    const { data: fileRows } = await supabase
      .from("files")
      .select("s3_key")
      .in("revision_id", revIds);

    if (!fileRows || fileRows.length === 0) return;
    
    // Import storageService
    const { storageService } = await import("@/lib/services/storage");
    
    for (const row of fileRows) {
      if (row.s3_key) {
        try {
          await storageService.deleteFile(row.s3_key);
        } catch (storageErr) {
          console.error(`Error deleting storage file ${row.s3_key}:`, storageErr);
        }
      }
    }
  } catch (err) {
    console.error("Error in purgeProjectStorageFiles:", err);
  }
}

export async function getDeletedProjectsAction() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden acceder a la papelera." };
    }

    // 1. Run automatic cleanup/purge for expired deleted projects (older than 30 days) in this organization
    const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const adminSupabase = createAdminClient();
    
    // Find expired projects in this org
    const { data: expiredProjects } = await adminSupabase
      .from("projects")
      .select("id")
      .eq("organization_id", userProfile.organization_id)
      .not("deleted_at", "is", null)
      .lt("deleted_at", limitDate);

    if (expiredProjects && expiredProjects.length > 0) {
      for (const ep of expiredProjects) {
        // Purge files first
        await purgeProjectStorageFiles(ep.id, adminSupabase);
        // Physical cascade delete
        await adminSupabase.from("projects").delete().eq("id", ep.id);
      }
    }

    // 2. Fetch active deleted projects (within 30 days)
    const { data: deletedProjects, error } = await adminSupabase
      .from("projects")
      .select("id, name, deleted_at")
      .eq("organization_id", userProfile.organization_id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      return { error: `Error al obtener la papelera: ${error.message}` };
    }

    return { projects: deletedProjects || [] };
  } catch (err) {
    console.error("Excepción en getDeletedProjectsAction:", err);
    return { error: "Error inesperado al cargar la papelera." };
  }
}

export async function restoreProjectAction(projectId: string) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden restaurar proyectos." };
    }

    const adminSupabase = createAdminClient();
    
    // Verify it belongs to the same org
    const { data: project } = await adminSupabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .single();

    if (!project || project.organization_id !== userProfile.organization_id) {
      return { error: "El proyecto no existe o no pertenece a tu organización." };
    }

    const { error } = await adminSupabase
      .from("projects")
      .update({ deleted_at: null })
      .eq("id", projectId);

    if (error) {
      return { error: `Error al restaurar el proyecto: ${error.message}` };
    }

    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Excepción en restaurar proyecto:", err);
    return { error: "Error inesperado al restaurar el proyecto." };
  }
}

export async function purgeProjectAction(projectId: string) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden vaciar la papelera." };
    }

    const adminSupabase = createAdminClient();
    
    // Verify it belongs to the same org
    const { data: project } = await adminSupabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .single();

    if (!project || project.organization_id !== userProfile.organization_id) {
      return { error: "El proyecto no existe o no pertenece a tu organización." };
    }

    // 1. Purge storage files first
    await purgeProjectStorageFiles(projectId, adminSupabase);

    // 2. Physical delete from DB (cascades)
    const { error } = await adminSupabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      return { error: `Error al vaciar el proyecto de la papelera: ${error.message}` };
    }

    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Excepción en purgar proyecto:", err);
    return { error: "Error inesperado al purgar el proyecto." };
  }
}

async function purgeDocumentStorageFiles(documentId: string, supabase: any) {
  try {
    const { data: revs } = await supabase
      .from("revisions")
      .select("id")
      .eq("document_id", documentId);

    if (!revs || revs.length === 0) return;
    const revIds = revs.map((r: any) => r.id);

    const { data: fileRows } = await supabase
      .from("files")
      .select("s3_key")
      .in("revision_id", revIds);

    if (!fileRows || fileRows.length === 0) return;
    
    // Import storageService
    const { storageService } = await import("@/lib/services/storage");
    
    for (const row of fileRows) {
      if (row.s3_key) {
        try {
          await storageService.deleteFile(row.s3_key);
        } catch (storageErr) {
          console.error(`Error deleting storage file ${row.s3_key}:`, storageErr);
        }
      }
    }
  } catch (err) {
    console.error("Error in purgeDocumentStorageFiles:", err);
  }
}

export async function getDeletedDocumentsAction() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden acceder a la papelera." };
    }

    const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const adminSupabase = createAdminClient();

    // 1. Run automatic cleanup/purge for expired deleted documents (older than 30 days) in this organization
    const { data: expiredDocs } = await adminSupabase
      .from("documents")
      .select(`
        id,
        projects!inner(organization_id)
      `)
      .eq("projects.organization_id", userProfile.organization_id)
      .not("deleted_at", "is", null)
      .lt("deleted_at", limitDate);

    if (expiredDocs && expiredDocs.length > 0) {
      for (const ed of expiredDocs) {
        // Purge files first
        await purgeDocumentStorageFiles(ed.id, adminSupabase);
        // Physical cascade delete
        await adminSupabase.from("documents").delete().eq("id", ed.id);
      }
    }

    // 2. Fetch active deleted documents (within 30 days)
    const { data: deletedDocs, error } = await adminSupabase
      .from("documents")
      .select(`
        id,
        document_code,
        title,
        deleted_at,
        projects!inner(id, name, organization_id)
      `)
      .eq("projects.organization_id", userProfile.organization_id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      return { error: `Error al obtener la papelera de documentos: ${error.message}` };
    }

    const mappedDocs = (deletedDocs || []).map((d: any) => ({
      id: d.id,
      document_code: d.document_code,
      title: d.title,
      deleted_at: d.deleted_at,
      project_id: d.projects?.id || "",
      project_name: d.projects?.name || "",
    }));

    return { documents: mappedDocs };
  } catch (err) {
    console.error("Excepción en getDeletedDocumentsAction:", err);
    return { error: "Error inesperado al cargar la papelera de documentos." };
  }
}

export async function restoreDocumentAction(documentId: string) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden restaurar documentos." };
    }

    const adminSupabase = createAdminClient();

    // Verify it belongs to user's org
    const { data: doc } = await adminSupabase
      .from("documents")
      .select("projects!inner(organization_id, id)")
      .eq("id", documentId)
      .single();

    const projectObj = Array.isArray(doc?.projects)
      ? doc.projects[0]
      : (doc?.projects as any);

    if (!doc || !projectObj || projectObj.organization_id !== userProfile.organization_id) {
      return { error: "El documento no existe o no pertenece a tu organización." };
    }

    const { error } = await adminSupabase
      .from("documents")
      .update({ deleted_at: null })
      .eq("id", documentId);

    if (error) {
      return { error: `Error al restaurar el documento: ${error.message}` };
    }

    revalidatePath(`/projects/${projectObj.id}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción en restaurar documento:", err);
    return { error: "Error inesperado al restaurar el documento." };
  }
}

export async function purgeDocumentAction(documentId: string) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, organization_id")
      .eq("id", authUser.id)
      .single();

    if (!userProfile?.is_admin || !userProfile.organization_id) {
      return { error: "Solo los administradores de la organización pueden vaciar la papelera." };
    }

    const adminSupabase = createAdminClient();

    // Verify it belongs to user's org
    const { data: doc } = await adminSupabase
      .from("documents")
      .select("projects!inner(organization_id, id)")
      .eq("id", documentId)
      .single();

    const projectObj = Array.isArray(doc?.projects)
      ? doc.projects[0]
      : (doc?.projects as any);

    if (!doc || !projectObj || projectObj.organization_id !== userProfile.organization_id) {
      return { error: "El documento no existe o no pertenece a tu organización." };
    }

    // 1. Purge storage files first
    await purgeDocumentStorageFiles(documentId, adminSupabase);

    // 2. Physical delete from DB (cascades)
    const { error } = await adminSupabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      return { error: `Error al vaciar el documento de la papelera: ${error.message}` };
    }

    revalidatePath(`/projects/${projectObj.id}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción en purgar documento:", err);
    return { error: "Error inesperado al purgar el documento." };
  }
}






