import { createAdminClient } from "@/lib/supabase/admin";
import type { Subscription, SubscriptionStatus, PaymentStatus } from "@/lib/types";

export async function getOrganizationSubscription(organizationId: string): Promise<Omit<Subscription, "id" | "created_at" | "updated_at">> {
  const adminSupabase = createAdminClient();
  const { data: subscription, error } = await adminSupabase
    .from("subscriptions")
    .select("organization_id, plan_name, status, storage_limit_mb, projects_limit, current_period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !subscription) {
    // Return default FREE tier plan if no active subscription record is found
    const defaultEnd = new Date();
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
    return {
      organization_id: organizationId,
      plan_name: "FREE",
      status: "ACTIVE" as SubscriptionStatus,
      storage_limit_mb: 500,
      projects_limit: 3,
      current_period_end: defaultEnd.toISOString(),
    };
  }

  return subscription as Omit<Subscription, "id" | "created_at" | "updated_at">;
}

export async function getOrganizationSubscriptionByProject(projectId: string) {
  const adminSupabase = createAdminClient();
  const { data: project, error: projError } = await adminSupabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();

  if (projError || !project?.organization_id) {
    throw new Error("Proyecto no encontrado o no tiene organización asociada.");
  }

  const subscription = await getOrganizationSubscription(project.organization_id);
  return {
    subscription,
    organizationId: project.organization_id,
  };
}

export async function checkPastDue(organizationId: string): Promise<{ allowed: boolean; error?: string }> {
  const subscription = await getOrganizationSubscription(organizationId);
  if (subscription.status === "PAST_DUE") {
    return {
      allowed: false,
      error: "Tu organización tiene pagos vencidos (PAST_DUE). Las operaciones de escritura y cargas de archivos están bloqueadas hasta regularizar la suscripción.",
    };
  }
  return { allowed: true };
}

export async function checkPastDueByProject(projectId: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { subscription } = await getOrganizationSubscriptionByProject(projectId);
    if (subscription.status === "PAST_DUE") {
      return {
        allowed: false,
        error: "Tu organización tiene pagos vencidos (PAST_DUE). Las operaciones de escritura y cargas de archivos están bloqueadas hasta regularizar la suscripción.",
      };
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: false, error: "No se pudo validar el estado de la suscripción del proyecto." };
  }
}

export async function checkProjectLimit(organizationId: string): Promise<{ allowed: boolean; error?: string }> {
  const subscription = await getOrganizationSubscription(organizationId);
  const adminSupabase = createAdminClient();

  const { count, error } = await adminSupabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error counting active projects:", error);
    return { allowed: false, error: "Error al validar el límite de proyectos de la organización." };
  }

  const activeCount = count ?? 0;
  if (activeCount >= subscription.projects_limit) {
    return {
      allowed: false,
      error: `Has alcanzado el límite de proyectos activos permitidos para tu plan (${subscription.projects_limit} proyectos). Por favor, actualiza tu plan o archiva/elimina un proyecto existente.`,
    };
  }

  return { allowed: true };
}

export async function checkStorageLimit(projectId: string, additionalBytes: number): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { subscription, organizationId } = await getOrganizationSubscriptionByProject(projectId);
    const adminSupabase = createAdminClient();

    // Call the database function to compute organization storage used bytes
    const { data: usedBytes, error: rpcError } = await adminSupabase
      .rpc("get_organization_storage_used_bytes", { org_id: organizationId });

    if (rpcError) {
      console.error("Error calling RPC get_organization_storage_used_bytes:", rpcError);
      return { allowed: false, error: "Error al calcular el almacenamiento utilizado." };
    }

    const currentBytes = Number(usedBytes || 0);
    const maxBytes = subscription.storage_limit_mb * 1024 * 1024;

    if (currentBytes + additionalBytes > maxBytes) {
      const currentMb = (currentBytes / (1024 * 1024)).toFixed(2);
      const limitMb = subscription.storage_limit_mb;
      const requestedMb = (additionalBytes / (1024 * 1024)).toFixed(2);

      return {
        allowed: false,
        error: `Espacio de almacenamiento insuficiente. Has usado ${currentMb} MB de ${limitMb} MB y el archivo solicitado (${requestedMb} MB) superaría el límite de almacenamiento de tu plan.`,
      };
    }

    return { allowed: true };
  } catch (err) {
    return { allowed: false, error: "No se pudo validar el límite de almacenamiento del proyecto." };
  }
}

export async function recordSubscriptionExpense(
  subscriptionId: string,
  amount: number,
  paymentStatus: PaymentStatus,
  currency: string = "USD",
  invoiceUrl: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("subscription_expenses")
    .insert({
      subscription_id: subscriptionId,
      amount,
      currency,
      billing_date: new Date().toISOString(),
      invoice_url: invoiceUrl,
      payment_status: paymentStatus,
    });

  if (error) {
    console.error("Error recording subscription expense:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
