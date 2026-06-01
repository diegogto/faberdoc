"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storageService } from "@/lib/services/storage";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import {
  getReviewPendingEmailHtml,
  getDocumentCommentedEmailHtml,
  getDocumentApprovedEmailHtml,
} from "@/lib/email-templates";

import { formatIterationLabel } from "@/lib/version-utils";

// Helper helper to generate letter label for an index (0 -> A, 1 -> B, etc.)
function getLetterForIndex(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Verifies if user has edit rights for a project
 */
async function verifyUserProjectAccess(projectId: string) {
  const userSupabase = await createClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "No estás autenticado.", user: null };
  }

  const { data: member, error: memberError } = await userSupabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !member) {
    return { error: "No tienes permisos en este proyecto.", user: null };
  }

  const allowedRoles = ["ADMIN", "COORDINATOR", "REVIEWER", "OWNER_APPROVER"];
  if (!allowedRoles.includes(member.role)) {
    return { error: "No tienes permisos de edición en este proyecto.", user: null };
  }

  return { user, error: null };
}

/**
 * Creates the next revision index/label for a document, propagating any unresolved comments.
 */
export async function createNextRevisionAction(projectId: string, documentId: string) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Get project config
    const { data: project, error: projError } = await adminSupabase
      .from("projects")
      .select("versioning_logic")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return { error: "No se pudo encontrar la configuración de versionado del proyecto." };
    }

    // 2. Find all existing revisions
    const { data: revisions, error: revsError } = await adminSupabase
      .from("revisions")
      .select("id, version_index, status")
      .eq("document_id", documentId)
      .order("version_index", { ascending: false });

    if (revsError) {
      return { error: "Error al obtener las revisiones del documento." };
    }

    let nextIndex = 0;
    let nextLabel = "";

    const hasRevisions = revisions && revisions.length > 0;

    if (hasRevisions) {
      const latestRev = revisions[0];
      nextIndex = latestRev.version_index + 1;
    }

    // Internal revision label is always a simple sequential iteration index (1, 2, 3...)
    nextLabel = formatIterationLabel(nextIndex);

    // 3. Create the new revision
    const { data: newRev, error: createError } = await adminSupabase
      .from("revisions")
      .insert({
        document_id: documentId,
        uploader_id: access.user.id,
        version_label: nextLabel,
        version_index: nextIndex,
        status: "DRAFT",
      })
      .select("id")
      .single();

    if (createError || !newRev) {
      return { error: `No se pudo crear la revisión: ${createError?.message}` };
    }

    // 4. Propagate unresolved comments (status = 'OPEN') from the previous revision (if any)
    if (hasRevisions) {
      const latestRevId = revisions[0].id;
      const { data: openComments } = await adminSupabase
        .from("comments")
        .select("author_id, content")
        .eq("revision_id", latestRevId)
        .eq("status", "OPEN");

      if (openComments && openComments.length > 0) {
        const commentsToInsert = openComments.map((c) => ({
          revision_id: newRev.id,
          author_id: c.author_id,
          content: c.content,
          status: "OPEN" as const,
        }));

        const { error: copyError } = await adminSupabase
          .from("comments")
          .insert(commentsToInsert);

        if (copyError) {
          console.error("Error al copiar comentarios sin resolver:", copyError);
        }
      }
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, revisionId: newRev.id };
  } catch (err) {
    console.error("Excepción en creación de revisión:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Handles uploading a file to a revision.
 * Processes state transitions depending on comment_level if previously COMMENTED.
 */
export async function uploadRevisionFileAction(
  projectId: string,
  documentId: string,
  revisionId: string,
  formData: FormData
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No se proporcionó ningún archivo." };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Upload file using agnostic storage service
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await storageService.uploadFile(
      {
        name: file.name,
        size: file.size,
        buffer,
        mimeType: file.type,
      },
      `projects/${projectId}/documents/${documentId}`
    );

    // 2. Save file record in DB
    const { data: fileRecord, error: fileError } = await adminSupabase
      .from("files")
      .insert({
        revision_id: revisionId,
        s3_key: uploadResult.s3Key,
        file_name: file.name,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (fileError) {
      // Cleanup uploaded file on DB error
      await storageService.deleteFile(uploadResult.s3Key);
      return { error: `Error al guardar archivo en la base de datos: ${fileError.message}` };
    }

    // 3. Compute status transitions
    const { data: revision, error: revError } = await adminSupabase
      .from("revisions")
      .select("status, comment_level")
      .eq("id", revisionId)
      .single();

    if (revError || !revision) {
      return { error: "No se pudo recuperar la revisión asociada." };
    }

    let nextStatus = revision.status;
    if (revision.status === "COMMENTED") {
      if (revision.comment_level === "MINOR") {
        nextStatus = "APPROVED";
      } else {
        nextStatus = "IN_REVIEW";
      }
    } else if (revision.status === "DRAFT") {
      nextStatus = "IN_REVIEW";
    }

    if (nextStatus !== revision.status) {
      const { error: updateError } = await adminSupabase
        .from("revisions")
        .update({ status: nextStatus })
        .eq("id", revisionId);

      if (updateError) {
        console.error("Error al actualizar estado de la revisión:", updateError);
      } else {
        await sendRevisionStatusNotifications(projectId, revisionId);
      }
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, fileRecord };
  } catch (err) {
    console.error("Excepción en subida de archivo de revisión:", err);
    return { error: "Ocurrió un error inesperado al subir el archivo." };
  }
}

/**
 * Updates the revision status and optionally its comment level.
 */
export async function updateRevisionStatusAction(
  projectId: string,
  revisionId: string,
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "COMMENTED",
  commentLevel?: "MINOR" | "MAJOR" | null
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const adminSupabase = createAdminClient();

  try {
    const updateData: { status: string; comment_level?: string | null } = { status };
    if (status === "COMMENTED") {
      updateData.comment_level = commentLevel || "MAJOR";
    } else {
      updateData.comment_level = null;
    }

    const { error } = await adminSupabase
      .from("revisions")
      .update(updateData)
      .eq("id", revisionId);

    if (error) {
      return { error: `Error al actualizar estado: ${error.message}` };
    }

    // Enviar notificaciones del nuevo estado
    await sendRevisionStatusNotifications(projectId, revisionId);

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al cambiar estado de revisión:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Adds an open comment to a revision.
 */
export async function addCommentToRevisionAction(
  projectId: string,
  revisionId: string,
  content: string
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  if (!content.trim()) {
    return { error: "El comentario no puede estar vacío." };
  }

  const adminSupabase = createAdminClient();

  try {
    const { error } = await adminSupabase
      .from("comments")
      .insert({
        revision_id: revisionId,
        author_id: access.user.id,
        content: content.trim(),
        status: "OPEN",
      });

    if (error) {
      return { error: `Error al agregar comentario: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción en creación de comentario:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Responds to a specific comment, optionally closing it.
 */
export async function respondToCommentAction(
  projectId: string,
  commentId: string,
  responseText: string,
  closeComment: boolean
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const adminSupabase = createAdminClient();

  try {
    const updateData: { response_text: string; status?: string; closed_at?: string | null } = {
      response_text: responseText.trim(),
    };

    if (closeComment) {
      updateData.status = "CLOSED";
      updateData.closed_at = new Date().toISOString();
    } else {
      updateData.status = "RESPONDED";
      updateData.closed_at = null;
    }

    const { error } = await adminSupabase
      .from("comments")
      .update(updateData)
      .eq("id", commentId);

    if (error) {
      return { error: `Error al responder comentario: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al responder comentario:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Envía las notificaciones de correo correspondientes según el cambio de estado de una revisión.
 */
async function sendRevisionStatusNotifications(projectId: string, revisionId: string) {
  try {
    const adminSupabase = createAdminClient();
    const origin = await getRequestOrigin();

    // 1. Obtener la revisión
    const { data: revision, error: revError } = await adminSupabase
      .from("revisions")
      .select("id, status, version_label, comment_level, uploader_id, document_id")
      .eq("id", revisionId)
      .single();

    if (revError || !revision) {
      console.error("No se pudo obtener la revisión:", revError);
      return;
    }

    // 2. Obtener el cargador (uploader)
    const { data: uploader } = await adminSupabase
      .from("users")
      .select("full_name, email")
      .eq("id", revision.uploader_id)
      .single();

    // 3. Obtener el documento
    const { data: document } = await adminSupabase
      .from("documents")
      .select("document_code, title")
      .eq("id", revision.document_id)
      .single();

    if (!document) {
      console.error("No se pudo obtener el documento asociado.");
      return;
    }

    // 4. Obtener el proyecto y su logo de organización
    const { data: project } = await adminSupabase
      .from("projects")
      .select("name, organization_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      console.error("No se pudo obtener el proyecto asociado.");
      return;
    }

    let logoUrl: string | null = null;
    if (project.organization_id) {
      const { data: org } = await adminSupabase
        .from("organizations")
        .select("logo_url")
        .eq("id", project.organization_id)
        .single();
      logoUrl = org?.logo_url || null;
    }

    const documentCode = document.document_code;
    const documentTitle = document.title;
    const projectName = project.name;
    const detailLink = `${origin}/projects/${projectId}/mdl?openRevisionId=${revisionId}`;

    if (revision.status === "IN_REVIEW") {
      // Notificar a los REVIEWERs
      const { data: members } = await adminSupabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .eq("role", "REVIEWER");

      const userIds = (members || []).map((m) => m.user_id);
      if (userIds.length > 0) {
        const { data: reviewers } = await adminSupabase
          .from("users")
          .select("full_name, email")
          .in("id", userIds);

        const activeReviewers = (reviewers || []).filter((r) => r.email);

        for (const reviewer of activeReviewers) {
          const html = getReviewPendingEmailHtml(
            projectName,
            documentCode,
            documentTitle,
            revision.version_label,
            detailLink,
            logoUrl
          );

          await sendEmail({
            to: reviewer.email!,
            subject: `Revisión pendiente: ${documentCode} - ${projectName}`,
            html,
          });
        }
      }
    } else if (revision.status === "COMMENTED") {
      // Notificar al uploader con copia a los REVIEWERs
      if (uploader && uploader.email) {
        const { data: members } = await adminSupabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)
          .eq("role", "REVIEWER");

        const userIds = (members || []).map((m) => m.user_id);
        let reviewerEmails: string[] = [];
        if (userIds.length > 0) {
          const { data: reviewers } = await adminSupabase
            .from("users")
            .select("email")
            .in("id", userIds);
          reviewerEmails = (reviewers || [])
            .map((r) => r.email!)
            .filter((email) => email && email !== uploader.email);
        }

        const { count: commentsCount } = await adminSupabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("revision_id", revisionId)
          .eq("status", "OPEN");

        const html = getDocumentCommentedEmailHtml(
          uploader.full_name,
          projectName,
          documentCode,
          documentTitle,
          revision.version_label,
          (revision.comment_level || "MAJOR") as "MINOR" | "MAJOR",
          commentsCount || 0,
          detailLink,
          logoUrl
        );

        await sendEmail({
          to: uploader.email,
          cc: reviewerEmails.length > 0 ? reviewerEmails : undefined,
          subject: `Documento comentado: ${documentCode} - ${projectName}`,
          html,
        });
      }
    } else if (revision.status === "APPROVED") {
      // Notificar a COORDINATOR y ADMIN
      const { data: members } = await adminSupabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId)
        .in("role", ["COORDINATOR", "ADMIN"]);

      const userIds = (members || []).map((m) => m.user_id);
      if (userIds.length > 0) {
        const { data: targets } = await adminSupabase
          .from("users")
          .select("full_name, email")
          .in("id", userIds);

        const activeTargets = (targets || []).filter((t) => t.email);

        for (const target of activeTargets) {
          const html = getDocumentApprovedEmailHtml(
            projectName,
            documentCode,
            documentTitle,
            revision.version_label,
            detailLink,
            logoUrl
          );

          await sendEmail({
            to: target.email!,
            subject: `Documento aprobado: ${documentCode} - ${projectName}`,
            html,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error al enviar notificaciones de estado de revisión:", error);
  }
}

/**
 * Genera una URL firmada temporal para descargar un archivo asociado a una revisión.
 */
export async function getDownloadUrlAction(projectId: string, s3Key: string) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  try {
    const url = await storageService.getSignedUrl(s3Key);
    return { success: true, url };
  } catch (err) {
    console.error("Error al generar URL firmada:", err);
    return { error: "No se pudo generar el enlace de descarga seguro." };
  }
}

/**
 * Genera una URL firmada de subida para cargar directamente desde el cliente.
 */
export async function getSignedUploadUrlAction(
  projectId: string,
  documentId: string,
  revisionId: string,
  fileName: string,
  fileType: string
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  try {
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueName = `${timestamp}-${cleanFileName}`;
    const s3Key = `projects/${projectId}/documents/${documentId}/${uniqueName}`;

    const res = await storageService.createSignedUploadUrl(s3Key);
    return {
      success: true,
      signedUrl: res.signedUrl,
      token: res.token,
      s3Key,
    };
  } catch (err) {
    console.error("Error al generar URL firmada de subida:", err);
    return { error: "No se pudo generar el enlace de subida seguro." };
  }
}

/**
 * Registra el archivo subido en la base de datos y actualiza el estado de la revisión.
 */
export async function registerUploadedFileAction(
  projectId: string,
  documentId: string,
  revisionId: string,
  s3Key: string,
  fileName: string,
  fileSize: number
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Guardar registro del archivo en la base de datos
    const { data: fileRecord, error: fileError } = await adminSupabase
      .from("files")
      .insert({
        revision_id: revisionId,
        s3_key: s3Key,
        file_name: fileName,
        file_size_bytes: fileSize,
      })
      .select()
      .single();

    if (fileError) {
      // Eliminar el archivo de Supabase Storage si falla el registro en BD
      await storageService.deleteFile(s3Key);
      return { error: `Error al guardar archivo en la base de datos: ${fileError.message}` };
    }

    // 2. Calcular transiciones de estado de la revisión
    const { data: revision, error: revError } = await adminSupabase
      .from("revisions")
      .select("status, comment_level")
      .eq("id", revisionId)
      .single();

    if (revError || !revision) {
      return { error: "No se pudo recuperar la revisión asociada." };
    }

    let nextStatus = revision.status;
    if (revision.status === "COMMENTED") {
      if (revision.comment_level === "MINOR") {
        nextStatus = "APPROVED";
      } else {
        nextStatus = "IN_REVIEW";
      }
    } else if (revision.status === "DRAFT") {
      nextStatus = "IN_REVIEW";
    }

    if (nextStatus !== revision.status) {
      const { error: updateError } = await adminSupabase
        .from("revisions")
        .update({ status: nextStatus })
        .eq("id", revisionId);

      if (updateError) {
        console.error("Error al actualizar estado de la revisión:", updateError);
      } else {
        await sendRevisionStatusNotifications(projectId, revisionId);
      }
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, fileRecord };
  } catch (err) {
    console.error("Excepción al registrar archivo de revisión:", err);
    return { error: "Ocurrió un error inesperado al registrar el archivo." };
  }
}

