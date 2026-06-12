"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkIfProjectArchived } from "@/app/(dashboard)/projects/actions";
import { checkPastDueByProject } from "@/lib/services/limits";
import type { CustomPropertyDefinition, DocumentTableRow } from "@/lib/types";

// Validaciones
const documentSchema = z.object({
  title: z
    .string()
    .min(3, "El título del documento debe tener al menos 3 caracteres")
    .max(255, "El título no puede superar los 255 caracteres")
    .trim(),
  document_code: z.string().trim().optional(),
  custom_properties: z.record(z.string(), z.any()),
  planned_date: z.string().nullable().optional(),
});

/**
 * Genera el código de documento secuencial si no se especifica.
 */
function generateDocumentCode(
  pattern: string,
  projectName: string,
  customProps: Record<string, any>,
  customPropertiesDefs: any[],
  sequence: number
): string {
  let code = pattern;

  // Reemplazar {PROY}
  const projPrefix = projectName.substring(0, 4).toUpperCase();
  code = code.replace("{PROY}", projPrefix);

  // Helper to get code for an attribute value
  const getAttrCode = (key: string, value: any) => {
    const valStr = String(value || "").trim();
    if (!valStr) return "";
    const def = customPropertiesDefs?.find((p: any) => p.key.toLowerCase() === key.toLowerCase());
    if (def?.type === "select" && def.options) {
      const opt = def.options.find((o: any) => 
        (typeof o === "string" && o === valStr) || 
        (typeof o === "object" && o !== null && o.value === valStr)
      );
      if (opt && typeof opt === "object" && opt.code) {
        return opt.code.toUpperCase();
      }
    }
    return valStr.toUpperCase();
  };

  // Reemplazar {ESP}
  const specialtyVal = customProps.specialty || customProps.especialidad || "GEN";
  const specialtyCode = getAttrCode("especialidad", specialtyVal) || getAttrCode("specialty", specialtyVal) || "GEN";
  code = code.replace("{ESP}", specialtyCode);

  // Reemplazar {NUM}
  const numStr = String(sequence).padStart(3, "0");
  code = code.replace("{NUM}", numStr);

  // Reemplazar propiedades dinámicas adicionales en mayúsculas
  for (const [key, val] of Object.entries(customProps)) {
    const placeholder = `{${key.toUpperCase()}}`;
    if (code.includes(placeholder)) {
      const codeVal = getAttrCode(key, val);
      code = code.replace(placeholder, codeVal);
    }
  }

  return code;
}

/**
 * Verifica si el usuario tiene permisos de edición (ADMIN, REVIEWER, OWNER_APPROVER)
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

  const allowedRoles = ["ADMIN", "COORDINATOR", "REVIEWER", "OWNER_APPROVER", "UPLOADER"];
  if (!allowedRoles.includes(member.role)) {
    return { error: "No tienes permisos de edición en este proyecto.", user: null };
  }

  // Verificar si el proyecto está archivado
  if (await checkIfProjectArchived(projectId, userSupabase)) {
    return { error: "Este proyecto está archivado y no puede ser modificado.", user: null };
  }

  return { user, error: null };
}

/**
 * Verifica si el usuario tiene permisos de lectura en el proyecto (cualquier rol o admin)
 */
async function verifyUserProjectReadAccess(projectId: string) {
  const userSupabase = await createClient();
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "No estás autenticado.", user: null, isOrgAdmin: false, role: null };
  }

  // Verificar si es miembro del proyecto
  const { data: member, error: memberError } = await userSupabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  // Verificar si es administrador de la organización
  const { data: profile } = await userSupabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isOrgAdmin = profile?.is_admin === true;

  if (memberError || !member) {
    if (isOrgAdmin) {
      return { user, error: null, isOrgAdmin: true, role: "ADMIN" };
    }
    return { error: "No tienes acceso a este proyecto.", user: null, isOrgAdmin: false, role: null };
  }

  return { user, error: null, isOrgAdmin, role: member.role };
}


/**
 * Crea un único documento en la MDL con su revisión e issuance log de planificación.
 */
export async function createDocumentAction(
  projectId: string,
  rawData: z.infer<typeof documentSchema>
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const pastDueCheck = await checkPastDueByProject(projectId);
  if (!pastDueCheck.allowed) {
    return { error: pastDueCheck.error };
  }

  const validation = documentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { title, document_code, custom_properties, planned_date } = validation.data;
  const adminSupabase = createAdminClient();

  try {
    // 1. Obtener detalles del proyecto
    const { data: project, error: projError } = await adminSupabase
      .from("projects")
      .select("name, naming_pattern, custom_properties_definition")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return { error: "No se pudo obtener la información del proyecto." };
    }

    // 2. Determinar el código del documento
    let finalCode = document_code?.trim() || "";
    if (!finalCode) {
      // Contar documentos existentes para generar correlativo
      const { count, error: countError } = await adminSupabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (countError) {
        console.error("Error al contar documentos:", countError);
      }
      const nextSequence = (count ?? 0) + 1;
      finalCode = generateDocumentCode(
        project.naming_pattern,
        project.name,
        custom_properties,
        (project.custom_properties_definition as any) || [],
        nextSequence
      );
    }

    // 3. Crear el documento
    const { data: newDoc, error: docError } = await adminSupabase
      .from("documents")
      .insert({
        project_id: projectId,
        document_code: finalCode,
        title,
        custom_properties,
      })
      .select("id, document_code")
      .single();

    if (docError) {
      console.error("Error al insertar documento:", docError);
      if (docError.code === "23505") {
        return { error: `Ya existe un documento con el código "${finalCode}" en este proyecto.` };
      }
      return { error: `Error al crear el documento: ${docError.message}` };
    }

    // 4. Crear la revisión inicial (placeholder: version_index 0, sin archivos cargados)
    const { data: newRev, error: revError } = await adminSupabase
      .from("revisions")
      .insert({
        document_id: newDoc.id,
        uploader_id: access.user.id,
        version_label: "A",
        version_index: 0,
        status: "DRAFT",
      })
      .select("id")
      .single();

    if (revError) {
      console.error("Error al crear revisión inicial:", revError);
      return { error: `Documento creado, pero falló la revisión inicial: ${revError.message}` };
    }

    // 5. Crear el registro en issuance_logs si se especifica una fecha planificada
    if (planned_date) {
      const { error: issueError } = await adminSupabase
        .from("issuance_logs")
        .insert({
          revision_id: newRev.id,
          original_planned_date: new Date(planned_date).toISOString(),
          current_planned_date: new Date(planned_date).toISOString(),
          iteration_count: 0,
        });

      if (issueError) {
        console.error("Error al crear issuance log:", issueError);
      }
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, documentId: newDoc.id, code: newDoc.document_code };
  } catch (err) {
    console.error("Excepción en creación de documento:", err);
    return { error: "Ocurrió un error inesperado al registrar el documento." };
  }
}

/**
 * Importación masiva de documentos desde la previsualización del CSV.
 */
export async function bulkImportDocumentsAction(
  projectId: string,
  documents: Array<{
    title: string;
    document_code?: string;
    custom_properties: Record<string, any>;
    planned_date?: string | null;
  }>
) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const pastDueCheck = await checkPastDueByProject(projectId);
  if (!pastDueCheck.allowed) {
    return { error: pastDueCheck.error };
  }

  if (!documents || documents.length === 0) {
    return { error: "No se proporcionaron documentos para importar." };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Obtener detalles del proyecto
    const { data: project, error: projError } = await adminSupabase
      .from("projects")
      .select("name, naming_pattern, custom_properties_definition")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return { error: "No se pudo obtener la información del proyecto." };
    }

    // 2. Obtener correlativo inicial
    const { count, error: countError } = await adminSupabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      console.error("Error al contar documentos:", countError);
    }
    let currentSequence = count ?? 0;

    // 3. Preparar inserción de documentos
    const docsToInsert = documents.map((doc) => {
      let finalCode = doc.document_code?.trim() || "";
      if (!finalCode) {
        currentSequence++;
        finalCode = generateDocumentCode(
          project.naming_pattern,
          project.name,
          doc.custom_properties,
          (project.custom_properties_definition as any) || [],
          currentSequence
        );
      }
      return {
        project_id: projectId,
        document_code: finalCode,
        title: doc.title.trim(),
        custom_properties: doc.custom_properties,
      };
    });

    // 4. Inserción masiva de documentos
    const { data: insertedDocs, error: docsError } = await adminSupabase
      .from("documents")
      .insert(docsToInsert)
      .select("id, document_code");

    if (docsError) {
      console.error("Error en bulk insert de documentos:", docsError);
      return { error: `Error al importar documentos: ${docsError.message}` };
    }

    if (!insertedDocs || insertedDocs.length === 0) {
      return { error: "No se insertó ningún documento." };
    }

    // 5. Inserción masiva de revisiones iniciales (placeholders)
    const revisionsToInsert = insertedDocs.map((doc) => ({
      document_id: doc.id,
      uploader_id: access.user.id,
      version_label: "A",
      version_index: 0,
      status: "DRAFT",
    }));

    const { data: insertedRevs, error: revsError } = await adminSupabase
      .from("revisions")
      .insert(revisionsToInsert)
      .select("id, document_id");

    if (revsError) {
      console.error("Error en bulk insert de revisiones:", revsError);
      return { error: `Documentos creados, pero falló la inicialización de revisiones: ${revsError.message}` };
    }

    // 6. Inserción masiva de issuance logs para los documentos que tengan fecha planificada
    const logsToInsert = [];
    for (const rev of insertedRevs) {
      // Buscar el documento correspondiente en los datos originales de entrada
      const docIndex = insertedDocs.findIndex((d) => d.id === rev.document_id);
      const inputDoc = documents[docIndex];

      if (inputDoc && inputDoc.planned_date) {
        logsToInsert.push({
          revision_id: rev.id,
          original_planned_date: new Date(inputDoc.planned_date).toISOString(),
          current_planned_date: new Date(inputDoc.planned_date).toISOString(),
          iteration_count: 0,
        });
      }
    }

    if (logsToInsert.length > 0) {
      const { error: logsError } = await adminSupabase
        .from("issuance_logs")
        .insert(logsToInsert);

      if (logsError) {
        console.error("Error en bulk insert de issuance logs:", logsError);
      }
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, count: insertedDocs.length };
  } catch (err) {
    console.error("Excepción en importación masiva:", err);
    return { error: "Ocurrió un error inesperado al realizar la importación masiva." };
  }
}

export async function deleteDocumentAction(projectId: string, documentId: string) {
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const pastDueCheck = await checkPastDueByProject(projectId);
  if (!pastDueCheck.allowed) {
    return { error: pastDueCheck.error };
  }

  const adminSupabase = createAdminClient();

  try {
    const { error } = await adminSupabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (error) {
      return { error: `Error al eliminar el documento: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true };
  } catch (err) {
    console.error("Excepción en eliminar documento:", err);
    return { error: "Error inesperado al eliminar el documento." };
  }
}

/**
 * Obtiene el detalle completo de un documento
 */
export async function getDocumentDetailAction(projectId: string, documentId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    const { data: doc, error } = await userSupabase
      .from("documents")
      .select(
        `
        id,
        project_id,
        document_code,
        title,
        custom_properties,
        created_at,
        deleted_at,
        revisions (
          id,
          document_id,
          uploader_id,
          version_label,
          version_index,
          status,
          created_at,
          uploader:users!uploader_id ( full_name ),
          files ( id, revision_id, s3_key, file_name, file_size_bytes, created_at ),
          document_issues ( id, revision_id, author_id, content, status, response_text, closed_at, created_at ),
          issuance_logs ( id, revision_id, original_planned_date, current_planned_date, actual_issuance_date, iteration_count, created_at )
        )
      `
      )
      .eq("id", documentId)
      .single();

    if (error || !doc) {
      return { error: error?.message || "No se pudo obtener el detalle del documento." };
    }

    const revisions = (doc.revisions as unknown as Array<{
      id: string;
      document_id: string;
      uploader_id: string;
      version_label: string;
      version_index: number;
      status: string;
      created_at: string;
      uploader: any;
      files: Array<{
        id: string;
        revision_id: string;
        s3_key: string;
        file_name: string;
        file_size_bytes: number;
        created_at: string;
      }>;
      document_issues: Array<{
        id: string;
        revision_id: string;
        author_id: string;
        content: string;
        status: string;
        response_text: string | null;
        closed_at: string | null;
        created_at: string;
      }>;
      issuance_logs: Array<{
        id: string;
        revision_id: string;
        original_planned_date: string;
        current_planned_date: string;
        actual_issuance_date: string | null;
        iteration_count: number;
        created_at: string;
      }>;
    }>) ?? [];

    revisions.sort((a, b) => b.version_index - a.version_index);
    const latestIssuance = revisions[0]?.issuance_logs?.[0] ?? null;

    const detail = {
      document: {
        id: doc.id,
        project_id: doc.project_id,
        document_code: doc.document_code,
        title: doc.title,
        custom_properties: doc.custom_properties,
        created_at: doc.created_at,
        deleted_at: doc.deleted_at,
      },
      revisions: revisions.map((rev) => ({
        id: rev.id,
        document_id: rev.document_id,
        uploader_id: rev.uploader_id,
        version_label: rev.version_label,
        version_index: rev.version_index,
        status: rev.status as "DRAFT" | "IN_REVIEW" | "COMMENTED" | "APPROVED" | "ISSUED",
        created_at: rev.created_at,
        uploader_name: (Array.isArray(rev.uploader)
          ? rev.uploader[0]?.full_name
          : rev.uploader?.full_name) ?? "Desconocido",
        files: rev.files ?? [],
        issues: (rev.document_issues ?? []).map((c) => ({
          id: c.id,
          revision_id: c.revision_id,
          author_id: c.author_id,
          content: c.content,
          status: c.status as "OPEN" | "RESOLVED" | "CLOSED",
          response_text: c.response_text,
          closed_at: c.closed_at,
          created_at: c.created_at,
        })),
      })),
      issuance: latestIssuance ? {
        id: latestIssuance.id,
        revision_id: latestIssuance.revision_id,
        original_planned_date: latestIssuance.original_planned_date,
        current_planned_date: latestIssuance.current_planned_date,
        actual_issuance_date: latestIssuance.actual_issuance_date,
        iteration_count: latestIssuance.iteration_count,
        created_at: latestIssuance.created_at,
      } : null,
    };

    return { success: true, detail };
  } catch (err) {
    console.error("Excepción en obtener detalle del documento:", err);
    return { error: "Ocurrió un error inesperado al obtener los detalles del documento." };
  }
}

/**
 * Obtiene los flujos de revisión configurados en el proyecto
 */
export async function getProjectFlowsAction(projectId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    const { data, error } = await userSupabase
      .from("projects")
      .select("review_flow_config")
      .eq("id", projectId)
      .single();

    if (error) {
      return { error: error.message };
    }

    const projectFlows = (data?.review_flow_config as any)?.flows || [];
    return { success: true, flows: projectFlows };
  } catch (err) {
    console.error("Excepción en obtener flujos de revisión del proyecto:", err);
    return { error: "Ocurrió un error inesperado al obtener los flujos de revisión." };
  }
}

/**
 * Obtiene todos los datos para la página principal del Maestro de Documentos (MDL)
 */
export async function getMDLPageDataAction(projectId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    // 1. Obtener información de configuración del proyecto
    const { data: project, error: projError } = await userSupabase
      .from("projects")
      .select("name, naming_pattern, custom_properties_definition, archived_at")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projError || !project) {
      return { error: "No se pudo encontrar el proyecto especificado." };
    }

    const customPropertiesDef =
      (project.custom_properties_definition as unknown as CustomPropertyDefinition[]) ?? [];
    const namingPattern = project.naming_pattern ?? "{PROY}-{ESP}-{NUM}";
    const projectName = project.name ?? "";
    const isProjectArchived = !!project.archived_at;
    const canAccessArchivedIntermediate =
      access.isOrgAdmin || access.role === "ADMIN" || access.role === "COORDINATOR";

    // 2. Obtener documentos del proyecto con su última revisión, files e issuance
    const { data: rawDocuments, error: docsError } = await userSupabase
      .from("documents")
      .select(
        `
        id,
        document_code,
        title,
        custom_properties,
        revisions (
          id,
          version_label,
          version_index,
          status,
          current_flow_id,
          active_nodes,
          files ( id ),
          issuance_logs (
            current_planned_date,
            actual_issuance_date
          )
        )
      `
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("document_code", { ascending: true });

    if (docsError) {
      return { error: docsError.message };
    }

    // 3. Transformar a DocumentTableRow
    const documents: DocumentTableRow[] = (rawDocuments ?? []).map((doc) => {
      const revisions = (doc.revisions as Array<{
        id: string;
        version_label: string;
        version_index: number;
        status: string;
        current_flow_id: string | null;
        active_nodes: any[] | null;
        files: Array<{ id: string }>;
        issuance_logs: Array<{
          current_planned_date: string;
          actual_issuance_date: string | null;
        }>;
      }>) ?? [];

      const latestRevision = revisions.sort(
        (a, b) => b.version_index - a.version_index
      )[0];

      const issuance = latestRevision?.issuance_logs?.[0] ?? null;
      const customProps = doc.custom_properties as Record<string, string | number> | null;
      const hasFiles = (latestRevision?.files?.length ?? 0) > 0;

      const dynamicProps: Record<string, unknown> = {};
      for (const prop of customPropertiesDef) {
        dynamicProps[prop.key] = customProps?.[prop.key] ?? "—";
      }

      return {
        id: doc.id,
        document_code: doc.document_code,
        title: doc.title,
        latest_revision: hasFiles ? (latestRevision?.version_label ?? "—") : "—",
        status: hasFiles
          ? ((latestRevision?.status ?? "DRAFT") as DocumentTableRow["status"])
          : null,
        planned_date: issuance?.current_planned_date ?? null,
        actual_date: issuance?.actual_issuance_date ?? null,
        has_files: hasFiles,
        current_flow_id: latestRevision?.current_flow_id ?? null,
        active_nodes: latestRevision?.active_nodes ?? [],
        ...dynamicProps,
      };
    });

    return {
      success: true,
      data: {
        documents,
        customPropertiesDef,
        namingPattern,
        projectName,
        isProjectArchived,
        canAccessArchivedIntermediate,
        userRole: access.role as any,
        currentUserId: access.user.id,
      },
    };
  } catch (err) {
    console.error("Excepción en getMDLPageDataAction:", err);
    return { error: "Ocurrió un error inesperado al cargar los datos del Maestro de Documentos." };
  }
}

/**
 * Obtiene las incidencias y datos necesarios para la página de Incidencias
 */
export async function getIssuesPageDataAction(projectId: string) {
  let access = await verifyUserProjectReadAccess(projectId);
  const userSupabase = await createClient();

  if (access.error || !access.user) {
    const { data: { user } } = await userSupabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await userSupabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (userProfile?.is_admin) {
        access = { user, error: null, isOrgAdmin: true, role: "ORGANIZATION_ADMIN" as any };
      } else {
        return { error: "No tienes acceso a este proyecto." };
      }
    } else {
      return { error: "No estás autenticado." };
    }
  }

  const user = access.user;
  if (!user) return { error: "No estás autenticado." };
  const userRole = access.role || "VIEWER";

  try {
    const { data: issuesData, error } = await userSupabase
      .from("document_issues")
      .select(`
        id,
        revision_id,
        author_id,
        content,
        status,
        response_text,
        closed_at,
        created_at,
        author:users(full_name),
        revision:revisions!inner(
          id,
          version_label,
          document:documents!inner(
            id,
            document_code,
            title,
            project_id
          )
        )
      `)
      .eq("revisions.document.project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    const issues = (issuesData || []).map((issue: any) => {
      const rev = issue.revision;
      const doc = rev?.document;
      return {
        id: issue.id,
        revision_id: issue.revision_id,
        author_id: issue.author_id,
        content: issue.content,
        status: issue.status as "OPEN" | "RESOLVED" | "CLOSED",
        response_text: issue.response_text,
        closed_at: issue.closed_at,
        created_at: issue.created_at,
        author_name: issue.author?.full_name || "Desconocido",
        version_label: rev?.version_label || "",
        document_id: doc?.id || "",
        document_code: doc?.document_code || "",
        document_title: doc?.title || "",
      };
    });

    return {
      success: true,
      data: {
        issues,
        userRole: userRole as any,
      },
    };
  } catch (err) {
    console.error("Excepción en getIssuesPageDataAction:", err);
    return { error: "Error inesperado al cargar las incidencias." };
  }
}

/**
 * Obtiene transmittals y configuración para la página de Transmittals
 */
export async function getTransmittalsPageDataAction(projectId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    const { data: project, error: projError } = await userSupabase
      .from("projects")
      .select("versioning_logic")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return { error: "No se pudo obtener la configuración del proyecto." };
    }

    const versioningLogic = project.versioning_logic ?? "MIXED";

    const { data: rawTransmittals, error: transError } = await userSupabase
      .from("transmittals")
      .select(
        `
        id,
        transmittal_code,
        created_at,
        sender:users!sender_id ( full_name ),
        recipient:organizations!recipient_org_id ( name ),
        transmittal_items ( id )
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (transError) {
      return { error: transError.message };
    }

    const transmittals = (rawTransmittals ?? []).map((row) => {
      const sender = row.sender as unknown as { full_name: string } | null;
      const recipient = row.recipient as unknown as { name: string } | null;
      const items = row.transmittal_items as Array<{ id: string }> | null;

      return {
        id: row.id,
        transmittal_code: row.transmittal_code,
        recipient_name: recipient?.name ?? "Desconocido",
        document_count: items?.length ?? 0,
        created_at: row.created_at,
        sender_name: sender?.full_name ?? "Desconocido",
      };
    });

    return {
      success: true,
      data: {
        transmittals,
        versioningLogic,
      },
    };
  } catch (err) {
    console.error("Excepción en getTransmittalsPageDataAction:", err);
    return { error: "Error inesperado al obtener los transmittals." };
  }
}

/**
 * Obtiene miembros, configuraciones y flujos para la página de Configuración
 */
export async function getProjectSettingsDataAction(projectId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    const { data: project, error: projError } = await userSupabase
      .from("projects")
      .select(
        "id, name, naming_pattern, versioning_logic, review_flow_config, custom_properties_definition, organization_id, description, location, location_details, client_name, versioning_format_config, archived_at"
      )
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (projError || !project) {
      return { error: "Proyecto no encontrado." };
    }

    const { data: currentUserProfile } = await userSupabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", access.user.id)
      .single();

    const isCurrentUserAdmin = currentUserProfile?.is_admin === true;
    const currentUserOrgId = currentUserProfile?.organization_id || null;

    const { data: rawMembers, error: membersError } = await userSupabase
      .from("project_members")
      .select("user_id, role, users(full_name, email, organization_id)")
      .eq("project_id", projectId);

    if (membersError) {
      return { error: membersError.message };
    }

    const members = (rawMembers ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role as "ADMIN" | "COORDINATOR" | "REVIEWER" | "OWNER_APPROVER" | "VIEWER",
      full_name: m.users?.full_name ?? "Sin nombre",
      email: m.users?.email ?? null,
      organization_id: m.users?.organization_id ?? null,
    }));

    const orgId = project.organization_id;
    let orgMembers: Array<{ id: string; full_name: string; email: string | null }> = [];

    if (orgId && isCurrentUserAdmin) {
      const { data: rawOrgMembers } = await userSupabase
        .from("users")
        .select("id, full_name, email")
        .eq("organization_id", orgId);
      orgMembers = rawOrgMembers ?? [];
    }

    const customProperties = (project.custom_properties_definition as unknown as Array<{
      key: string;
      label: string;
      type: string;
      options?: string[];
    }>) ?? [];

    const reviewerRoles = ["REVIEWER", "OWNER_APPROVER", "COORDINATOR", "ADMIN"];
    const flowReviewers = members
      .filter((m) => reviewerRoles.includes(m.role))
      .map((m) => ({ userId: m.user_id, userName: m.full_name, userEmail: m.email }));

    let existingFlows = null;
    if (project.review_flow_config && typeof project.review_flow_config === "object") {
      const configObj = project.review_flow_config as any;
      if (Array.isArray(configObj.flows)) {
        existingFlows = configObj.flows;
      } else if (Array.isArray(configObj.nodes)) {
        existingFlows = [
          {
            id: "default-flow",
            name: "Flujo de Aprobación Estándar",
            isDefault: true,
            conditions: [],
            nodes: configObj.nodes,
            edges: configObj.edges,
          },
        ];
      }
    }

    return {
      success: true,
      data: {
        project,
        currentUserId: access.user.id,
        currentUserOrgId,
        isCurrentUserAdmin,
        members,
        orgMembers,
        customProperties,
        flowReviewers,
        existingFlows,
      },
    };
  } catch (err) {
    console.error("Excepción en getProjectSettingsDataAction:", err);
    return { error: "Ocurrió un error inesperado al cargar la configuración." };
  }
}

/**
 * Obtiene información básica del proyecto para el Layout
 */
export async function getProjectLayoutDataAction(projectId: string) {
  const access = await verifyUserProjectReadAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  const userSupabase = await createClient();

  try {
    const { data: project, error } = await userSupabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .is("deleted_at", null)
      .single();

    if (error || !project) {
      return { error: error?.message || "Proyecto no encontrado." };
    }

    return { success: true, project };
  } catch (err) {
    console.error("Excepción en getProjectLayoutDataAction:", err);
    return { error: "Error inesperado al cargar el layout del proyecto." };
  }
}



