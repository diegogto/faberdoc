"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  sequence: number
): string {
  let code = pattern;

  // Reemplazar {PROY}
  const projPrefix = projectName.substring(0, 4).toUpperCase();
  code = code.replace("{PROY}", projPrefix);

  // Reemplazar {ESP}
  const specialty = String(customProps.specialty || customProps.especialidad || "GEN").trim().toUpperCase();
  const espPrefix = specialty.substring(0, 3);
  code = code.replace("{ESP}", espPrefix);

  // Reemplazar {NUM}
  const numStr = String(sequence).padStart(3, "0");
  code = code.replace("{NUM}", numStr);

  // Reemplazar propiedades dinámicas adicionales en mayúsculas
  for (const [key, val] of Object.entries(customProps)) {
    const placeholder = `{${key.toUpperCase()}}`;
    if (code.includes(placeholder)) {
      code = code.replace(placeholder, String(val).toUpperCase());
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

  const allowedRoles = ["ADMIN", "COORDINATOR", "REVIEWER", "OWNER_APPROVER"];
  if (!allowedRoles.includes(member.role)) {
    return { error: "No tienes permisos de edición en este proyecto.", user: null };
  }

  return { user, error: null };
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
      .select("name, naming_pattern")
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

  if (!documents || documents.length === 0) {
    return { error: "No se proporcionaron documentos para importar." };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Obtener detalles del proyecto
    const { data: project, error: projError } = await adminSupabase
      .from("projects")
      .select("name, naming_pattern")
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
