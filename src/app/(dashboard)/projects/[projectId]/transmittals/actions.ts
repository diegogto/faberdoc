"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getTransmittalEmailHtml } from "@/lib/email-templates";
import { formatVersionLabel } from "@/lib/version-utils";
import { checkIfProjectArchived } from "@/app/(dashboard)/projects/actions";

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
 * Fetches all recipient organizations in the system
 */
export async function getRecipientOrganizationsAction() {
  const adminSupabase = createAdminClient();
  try {
    const { data: orgs, error } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { organizations: orgs || [] };
  } catch (err) {
    console.error("Excepción al listar organizaciones receptoras:", err);
    return { error: "Error inesperado al buscar organizaciones." };
  }
}

/**
 * Retrieves the latest revisions of documents in the project that are eligible for emission (e.g. status = APPROVED)
 */
export async function getEligibleRevisionsAction(projectId: string) {
  const adminSupabase = createAdminClient();

  try {
    // Load project versioning config to determine emission types
    const { data: project } = await adminSupabase
      .from("projects")
      .select("versioning_format_config")
      .eq("id", projectId)
      .single();

    const { data: docs, error } = await adminSupabase
      .from("documents")
      .select(`
        id,
        document_code,
        title,
        revisions (
          id,
          version_label,
          version_index,
          status
        )
      `)
      .eq("project_id", projectId)
      .is("deleted_at", null);

    if (error) {
      return { error: error.message };
    }

    const eligible = (docs || [])
      .map((doc) => {
        if (!doc.revisions || doc.revisions.length === 0) return null;
        // Sort revisions by version_index DESC to find the latest revision
        const sorted = [...doc.revisions].sort((a, b) => b.version_index - a.version_index);
        const latest = sorted[0];

        return {
          documentId: doc.id,
          documentCode: doc.document_code,
          title: doc.title,
          revisionId: latest.id,
          versionLabel: latest.version_label,
          status: latest.status as string,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return { eligible, versioningFormatConfig: project?.versioning_format_config || null };
  } catch (err) {
    console.error("Excepción al listar revisiones elegibles:", err);
    return { error: "Error inesperado al buscar documentos." };
  }
}

/**
 * Creates a formal Transmittal, emits the selected revisions, changes their status to ISSUED,
 * updates version labels (for MIXED logic) or records the emission code (for SEPARATE_EMISSION),
 * and updates the actual issuance date in the issuance logs.
 */
export async function createTransmittalAction(
  projectId: string,
  recipientOrgId: string,
  revisionIds: string[],
  emissionCode?: string
) {
  const supabase = await createClient();
  if (await checkIfProjectArchived(projectId, supabase)) {
    return { error: "Este proyecto está archivado y no puede ser modificado." };
  }
  const access = await verifyUserProjectAccess(projectId);
  if (access.error || !access.user) {
    return { error: access.error };
  }

  if (!recipientOrgId) {
    return { error: "Debes seleccionar una organización destinataria." };
  }

  if (!revisionIds || revisionIds.length === 0) {
    return { error: "Debes seleccionar al menos un documento para enviar." };
  }

  const adminSupabase = createAdminClient();

  try {
    // 1. Get project versioning logic and configuration
    const { data: project, error: projError } = await adminSupabase
      .from("projects")
      .select("versioning_logic, versioning_format_config")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return { error: "No se pudo obtener la configuración de versionado del proyecto." };
    }

    // 2. Generate sequential transmittal code (e.g. TRA-[YEAR]-[SEQ])
    const { count, error: countError } = await adminSupabase
      .from("transmittals")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      console.error("Error al contar transmittals:", countError);
    }

    const nextSeq = (count ?? 0) + 1;
    const year = new Date().getFullYear();
    const transmittalCode = `TRA-${year}-${String(nextSeq).padStart(3, "0")}`;

    // 3. Insert the transmittal record
    const { data: transmittal, error: transmittalError } = await adminSupabase
      .from("transmittals")
      .insert({
        project_id: projectId,
        transmittal_code: transmittalCode,
        sender_id: access.user.id,
        recipient_org_id: recipientOrgId,
      })
      .select("id")
      .single();

    if (transmittalError || !transmittal) {
      return { error: `Error al crear el transmittal: ${transmittalError?.message}` };
    }

    // 4. Process each revision
    for (const revisionId of revisionIds) {
      // 4a. Link to transmittal
      await adminSupabase
        .from("transmittal_items")
        .insert({
          transmittal_id: transmittal.id,
          revision_id: revisionId,
        });

      // 4b. Perform versioning adjustments
      if (project.versioning_logic === "SEPARATE_EMISSION") {
        // SEPARATE_EMISSION: keep revision label, record emission_code, mark ISSUED
        await adminSupabase
          .from("revisions")
          .update({
            status: "ISSUED",
            emission_code: (emissionCode || "A").trim(),
          })
          .eq("id", revisionId);
      } else {
        // MIXED: Convert iteration numeric label to formatted official version label
        const { data: rev } = await adminSupabase
          .from("revisions")
          .select("document_id")
          .eq("id", revisionId)
          .single();

        if (rev) {
          // Count previously ISSUED revisions to get the next versionIndex
          const { count: issuedCount } = await adminSupabase
            .from("revisions")
            .select("id", { count: "exact", head: true })
            .eq("document_id", rev.document_id)
            .eq("status", "ISSUED");

          const emissionTypes = project.versioning_format_config?.emission_types || [];
          const foundType = emissionTypes.find((et: any) => et.code === emissionCode);
          const emissionPurpose: "info" | "approved" = foundType?.type === "approved" ? "approved" : "info";

          const versionIndex = issuedCount ?? 0;
          const nextLabel = formatVersionLabel(
            versionIndex,
            project.versioning_logic,
            emissionPurpose,
            project.versioning_format_config
          );

          await adminSupabase
            .from("revisions")
            .update({
              status: "ISSUED",
              version_label: nextLabel,
              emission_code: (emissionCode || "B").trim(),
            })
            .eq("id", revisionId);
        }
      }

      // 4c. Update or insert issuance log actual date
      const { data: existingLog } = await adminSupabase
        .from("issuance_logs")
        .select("id")
        .eq("revision_id", revisionId)
        .single();

      if (existingLog) {
        await adminSupabase
          .from("issuance_logs")
          .update({
            actual_issuance_date: new Date().toISOString(),
          })
          .eq("id", existingLog.id);
      } else {
        await adminSupabase
          .from("issuance_logs")
          .insert({
            revision_id: revisionId,
            original_planned_date: new Date().toISOString(),
            current_planned_date: new Date().toISOString(),
            actual_issuance_date: new Date().toISOString(),
            iteration_count: 0,
          });
      }
    }

    // 5. Send transmittal notifications to all members of the recipient organization
    try {
      const { data: project } = await adminSupabase
        .from("projects")
        .select("name, organization_id")
        .eq("id", projectId)
        .single();

      let senderName = "Faberdoc";
      let logoUrl: string | null = null;

      if (project?.organization_id) {
        const { data: senderOrg } = await adminSupabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", project.organization_id)
          .single();

        if (senderOrg) {
          senderName = senderOrg.name;
          logoUrl = senderOrg.logo_url || null;
        }
      }

      let recipientOrgName = "Organización Receptora";
      const { data: recipientOrg } = await adminSupabase
        .from("organizations")
        .select("name")
        .eq("id", recipientOrgId)
        .single();
      if (recipientOrg) {
        recipientOrgName = recipientOrg.name;
      }

      const { data: recipientUsers } = await adminSupabase
        .from("users")
        .select("full_name, email")
        .eq("organization_id", recipientOrgId);

      const docsList: { code: string; title: string; revision: string }[] = [];
      for (const revisionId of revisionIds) {
        const { data: rev } = await adminSupabase
          .from("revisions")
          .select("version_label, document_id")
          .eq("id", revisionId)
          .single();

        if (rev) {
          const { data: doc } = await adminSupabase
            .from("documents")
            .select("document_code, title")
            .eq("id", rev.document_id)
            .single();

          if (doc) {
            docsList.push({
              code: doc.document_code,
              title: doc.title,
              revision: rev.version_label,
            });
          }
        }
      }

      const origin = await getRequestOrigin();
      const transmittalLink = `${origin}/projects/${projectId}/transmittals`;

      const activeRecipients = (recipientUsers || []).filter((u) => u.email);
      for (const recipient of activeRecipients) {
        const html = getTransmittalEmailHtml(
          senderName,
          recipientOrgName,
          transmittalCode,
          project?.name || "",
          transmittalLink,
          docsList,
          logoUrl
        );

        await sendEmail({
          to: recipient.email!,
          subject: `Nuevo Transmittal Recibido: ${transmittalCode} - ${project?.name || ""}`,
          html,
        });
      }
    } catch (notifErr) {
      console.error("Error al enviar notificaciones de transmittal:", notifErr);
    }

    revalidatePath(`/projects/${projectId}/transmittals`);
    revalidatePath(`/projects/${projectId}/mdl`);
    return { success: true, transmittalCode };
  } catch (err) {
    console.error("Excepción en creación de transmittal:", err);
    return { error: "Ocurrió un error inesperado al enviar el transmittal." };
  }
}
