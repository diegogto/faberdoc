"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPastDueByProject } from "@/lib/services/limits";

async function verifyUserProjectAccess(projectId: string, supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No estás autenticado.", user: null };
  }

  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    // Verificar si el usuario es un Org Admin
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userProfile?.is_admin) {
      return { user, error: null };
    }

    return { error: "No tienes acceso a este proyecto.", user: null };
  }

  return { user, error: null };
}

async function checkIfProjectArchived(projectId: string, supabase: any) {
  const { data: project } = await supabase
    .from("projects")
    .select("archived_at")
    .eq("id", projectId)
    .single();
  return !!project?.archived_at;
}

/**
 * Agrega un nuevo comentario a una entidad (Proyecto, Documento, Envío).
 */
export async function addCommentAction(
  projectId: string,
  params: {
    targetType: "project" | "document" | "transmittal";
    targetId: string;
    content: string;
    parentId?: string | null;
  }
) {
  const supabase = await createClient();
  if (await checkIfProjectArchived(projectId, supabase)) {
    return { error: "Este proyecto está archivado y no puede ser modificado." };
  }

  const access = await verifyUserProjectAccess(projectId, supabase);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const pastDueCheck = await checkPastDueByProject(projectId);
  if (!pastDueCheck.allowed) {
    return { error: pastDueCheck.error };
  }

  const { targetType, targetId, content, parentId } = params;
  if (!content.trim()) {
    return { error: "El comentario no puede estar vacío." };
  }

  try {
    const insertData: any = {
      author_id: access.user.id,
      content: content.trim(),
      parent_id: parentId || null,
    };

    if (targetType === "project") {
      insertData.project_id = targetId;
    } else if (targetType === "document") {
      insertData.document_id = targetId;
    } else if (targetType === "transmittal") {
      insertData.transmittal_id = targetId;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert(insertData)
      .select(`
        id,
        parent_id,
        content,
        created_at,
        author_id,
        author:users(full_name, avatar_url)
      `)
      .single();

    if (error) {
      return { error: `Error al crear el comentario: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, comment: data };
  } catch (err) {
    console.error("Excepción en creación de comentario:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Obtiene el listado de comentarios de una entidad (Proyecto, Documento, Envío).
 */
export async function getCommentsAction(
  projectId: string,
  params: {
    targetType: "project" | "document" | "transmittal";
    targetId: string;
  }
) {
  const supabase = await createClient();
  const access = await verifyUserProjectAccess(projectId, supabase);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const { targetType, targetId } = params;

  try {
    let query = supabase
      .from("comments")
      .select(`
        id,
        parent_id,
        content,
        created_at,
        author_id,
        author:users(full_name, avatar_url)
      `);

    if (targetType === "project") {
      query = query.eq("project_id", targetId);
    } else if (targetType === "document") {
      query = query.eq("document_id", targetId);
    } else if (targetType === "transmittal") {
      query = query.eq("transmittal_id", targetId);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return { error: `Error al obtener comentarios: ${error.message}` };
    }

    return { success: true, comments: data };
  } catch (err) {
    console.error("Excepción al obtener comentarios:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}
