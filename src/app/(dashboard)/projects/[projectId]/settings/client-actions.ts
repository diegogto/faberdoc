"use server";

import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getClientConnectionEmailHtml } from "@/lib/email-templates";
import { checkIfProjectArchived } from "@/app/(dashboard)/projects/actions";

const connectClientSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

// List of public email domains to discard
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "zoho.com",
  "protonmail.com",
]);

/**
 * Checks if a domain is corporate (returns domain string if yes, null if public or invalid)
 */
function getCorporateDomain(email: string): string | null {
  const parts = email.split("@");
  if (parts.length < 2) return null;
  const domain = parts[1].toLowerCase().trim();
  if (PUBLIC_DOMAINS.has(domain)) return null;
  return domain;
}

/**
 * Fetches connected client/subcontractor organizations for a project
 */
export async function getProjectClientsAction(projectId: string) {
  const adminSupabase = createAdminClient();
  try {
    const { data, error } = await adminSupabase
      .from("project_connections")
      .select("status, contact_email, created_at, organization_id, connection_type, organizations(id, name, email_domain, logo_url)")
      .eq("project_id", projectId);

    if (error) {
      return { error: error.message };
    }

    const clients = (data ?? []).map((conn: any) => ({
      organization_id: conn.organization_id,
      name: conn.organizations?.name ?? "Ficha Temporal",
      email_domain: conn.organizations?.email_domain ?? null,
      logo_url: conn.organizations?.logo_url ?? null,
      status: conn.status,
      connection_type: conn.connection_type as "CLIENT" | "SUBCONTRACTOR",
      contact_email: conn.contact_email,
      created_at: conn.created_at,
    }));

    return { clients };
  } catch (err) {
    console.error("Excepción al listar receptores del proyecto:", err);
    return { error: "Ocurrió un error inesperado al cargar los receptores." };
  }
}

/**
 * Connects a client/subcontractor organization to the project by email domain.
 */
export async function connectClientAction(
  projectId: string,
  email: string,
  connectionType: "CLIENT" | "SUBCONTRACTOR" = "CLIENT"
) {
  const userSupabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Verify Authentication
  const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  // 2. Validate input
  const validation = connectClientSchema.safeParse({ email });
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Correo inválido." };
  }

  const clientEmail = validation.data.email.toLowerCase().trim();
  const domain = getCorporateDomain(clientEmail);
  if (!domain) {
    return { error: "No se permiten correos de dominio público (Gmail, Yahoo, Outlook, etc.) para conectar receptores corporativos." };
  }

  try {
    if (await checkIfProjectArchived(projectId, userSupabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
    // 3. Verify user has Organization Admin or Project Coordinator role
    const { data: userProfile } = await userSupabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: member } = await userSupabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isOrgAdmin = userProfile?.is_admin === true;
    const isProjectCoordinator = member?.role === "COORDINATOR" || member?.role === "ADMIN";

    if (!isOrgAdmin && !isProjectCoordinator) {
      return { error: "Solo los administradores de la organización o coordinadores de este proyecto pueden conectar receptores." };
    }

    // Get current project details and sender organization details
    const { data: project } = await adminSupabase
      .from("projects")
      .select("name, organization_id")
      .eq("id", projectId)
      .single();

    if (!project) return { error: "Proyecto no encontrado." };

    let senderOrgName = "Faberdoc Owner";
    let senderLogoUrl: string | null = null;
    if (project.organization_id) {
      const { data: senderOrg } = await adminSupabase
        .from("organizations")
        .select("name, logo_url")
        .eq("id", project.organization_id)
        .single();
      if (senderOrg) {
        senderOrgName = senderOrg.name;
        senderLogoUrl = senderOrg.logo_url || null;
      }
    }

    // 4. Check if the domain is already registered as an organization
    const { data: targetOrg } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("email_domain", domain)
      .is("deleted_at", null)
      .single();

    const origin = await getRequestOrigin();

    if (targetOrg) {
      // --- CASE 1: Domain exists in Faberdoc ---
      // Check if connection already exists
      const { data: existingConn } = await adminSupabase
        .from("project_connections")
        .select("status")
        .eq("project_id", projectId)
        .eq("organization_id", targetOrg.id)
        .single();

      if (existingConn) {
        if (existingConn.status === "APPROVED") {
          return { error: `La organización '${targetOrg.name}' ya está vinculada a este proyecto.` };
        } else if (existingConn.status === "PENDING") {
          return { error: `Ya existe una solicitud de conexión pendiente para '${targetOrg.name}'.` };
        }
      }

      // Create connection request (PENDING)
      const { error: insertError } = await adminSupabase
        .from("project_connections")
        .insert({
          project_id: projectId,
          organization_id: targetOrg.id,
          status: "PENDING",
          connection_type: connectionType,
          contact_email: clientEmail,
        });

      if (insertError) {
        return { error: `Error al crear la vinculación: ${insertError.message}` };
      }

      // Retrieve admins of the client organization to send CC
      const { data: clientAdmins } = await adminSupabase
        .from("users")
        .select("email")
        .eq("organization_id", targetOrg.id)
        .eq("is_admin", true);

      const adminEmails = (clientAdmins ?? [])
        .map((admin) => admin.email)
        .filter((email): email is string => !!email && email.toLowerCase() !== clientEmail);

      const connectionLink = `${origin}/settings?tab=org`; // Point to client org settings to approve
      const emailHtml = getClientConnectionEmailHtml(
        project.name,
        senderOrgName,
        connectionLink,
        false,
        senderLogoUrl
      );

      // Send connection email to contact, CC client admins
      await sendEmail({
        to: clientEmail,
        cc: adminEmails.length > 0 ? adminEmails : undefined,
        subject: `Solicitud de vinculación de proyecto: ${project.name} - Faberdoc`,
        html: emailHtml,
      });

      revalidatePath(`/projects/${projectId}/settings`);
      return { success: true, message: `Solicitud de vinculación enviada a '${targetOrg.name}'.` };
    } else {
      // --- CASE 2: Domain does NOT exist (Temporary Profile) ---
      const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1).split(".")[0];
      const tempOrgName = `${capitalizedDomain} Client`;

      // Create a temporary organization profile
      const { data: tempOrg, error: orgError } = await adminSupabase
        .from("organizations")
        .insert({
          name: tempOrgName,
          email_domain: domain,
        })
        .select("id")
        .single();

      if (orgError || !tempOrg) {
        return { error: `No se pudo crear la ficha temporal de la organización: ${orgError?.message}` };
      }

      // Automatically link to project as APPROVED (ready for transmittals)
      const { error: insertError } = await adminSupabase
        .from("project_connections")
        .insert({
          project_id: projectId,
          organization_id: tempOrg.id,
          status: "APPROVED",
          connection_type: connectionType,
          contact_email: clientEmail,
        });

      if (insertError) {
        // Cleanup temp org on error
        await adminSupabase.from("organizations").delete().eq("id", tempOrg.id);
        return { error: `Error al crear vinculación: ${insertError.message}` };
      }

      // Send invitation email with the value proposition
      const registrationLink = `${origin}/register?email=${encodeURIComponent(clientEmail)}`;
      const emailHtml = getClientConnectionEmailHtml(
        project.name,
        senderOrgName,
        registrationLink,
        true,
        senderLogoUrl
      );

      await sendEmail({
        to: clientEmail,
        subject: `Invitación a participar en el proyecto: ${project.name} - Faberdoc`,
        html: emailHtml,
      });

      revalidatePath(`/projects/${projectId}/settings`);
      return { success: true, message: `Ficha temporal creada. Se envió una invitación comercial para registrarse a ${clientEmail}.` };
    }
  } catch (err) {
    console.error("Excepción en vinculación de receptor:", err);
    return { error: "Ocurrió un error inesperado al procesar la vinculación." };
  }
}

/**
 * Removes a client organization connection from the project.
 */
export async function removeClientConnectionAction(projectId: string, organizationId: string) {
  const userSupabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user: authUser }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    if (await checkIfProjectArchived(projectId, userSupabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
    const { data: userProfile } = await userSupabase
      .from("users")
      .select("is_admin")
      .eq("id", authUser.id)
      .single();

    const { data: member } = await userSupabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", authUser.id)
      .single();

    const isOrgAdmin = userProfile?.is_admin === true;
    const isProjectCoordinator = member?.role === "COORDINATOR" || member?.role === "ADMIN";

    if (!isOrgAdmin && !isProjectCoordinator) {
      return { error: "Solo los administradores de la organización o coordinadores de este proyecto pueden remover receptores." };
    }

    const { error } = await adminSupabase
      .from("project_connections")
      .delete()
      .eq("project_id", projectId)
      .eq("organization_id", organizationId);

    if (error) {
      return { error: `Error al remover la vinculación: ${error.message}` };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Excepción al remover receptor:", err);
    return { error: "Ocurrió un error inesperado." };
  }
}

/**
 * Adds a user of a connected recipient organization to the project.
 */
export async function addRecipientMemberAction(
  projectId: string,
  organizationId: string,
  userId: string,
  role: string
) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) return { error: "No estás autenticado." };

  try {
    if (await checkIfProjectArchived(projectId, supabase)) {
      return { error: "Este proyecto está archivado y no puede ser modificado." };
    }
    // Validate authorization:
    // - Caller is Org Admin of project owner
    // - OR Caller is Project Coordinator of project
    // - OR Caller is Org Admin of the connected recipient organization (matching organizationId)
    const { data: userProfile } = await supabase
      .from("users")
      .select("organization_id, is_admin")
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
    const isRecipientOrgAdmin = isOrgAdmin && userProfile?.organization_id === organizationId;

    if (!isProjectCoordinator && !isRecipientOrgAdmin) {
      return { error: "No tienes permisos para agregar usuarios de esta organización al proyecto. Debes ser Coordinador del Proyecto o Administrador de la Organización Receptora." };
    }

    // Verify if the target organization is indeed connected to the project
    const { data: connection } = await adminSupabase
      .from("project_connections")
      .select("status")
      .eq("project_id", projectId)
      .eq("organization_id", organizationId)
      .single();

    if (!connection || connection.status !== "APPROVED") {
      return { error: "La organización no está vinculada activamente a este proyecto." };
    }

    // Verify the target user belongs to the recipient organization
    const { data: targetUser } = await adminSupabase
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.organization_id !== organizationId) {
      return { error: "El usuario seleccionado no pertenece a la organización receptora." };
    }

    // Add the user to the project members
    const { error: memberError } = await adminSupabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role: role as any,
      });

    if (memberError) {
      return { error: `Error al agregar miembro: ${memberError.message}` };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (err) {
    console.error("Error adding recipient member:", err);
    return { error: "Ocurrió un error inesperado al agregar el miembro." };
  }
}

/**
 * Lists users of a connected organization who are not yet project members.
 */
export async function getRecipientOrgUsersAction(projectId: string, organizationId: string) {
  const adminSupabase = createAdminClient();
  try {
    // Fetch users of organizationId
    const { data: orgUsers, error: usersError } = await adminSupabase
      .from("users")
      .select("id, full_name, email")
      .eq("organization_id", organizationId);

    if (usersError) {
      return { error: usersError.message };
    }

    // Fetch users already in project members
    const { data: members } = await adminSupabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId);

    const memberIds = new Set((members ?? []).map((m) => m.user_id));

    // Filter out users already in project
    const availableUsers = (orgUsers ?? []).filter((user) => !memberIds.has(user.id));

    return { users: availableUsers };
  } catch (err) {
    console.error("Error listing recipient users:", err);
    return { error: "Ocurrió un error inesperado al listar los usuarios." };
  }
}
