import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("id");
  const action = searchParams.get("action");
  const origin = await getRequestOrigin();

  if (!requestId || (action !== "approve" && action !== "reject")) {
    return NextResponse.redirect(new URL("/login?error=invalid_request", origin));
  }

  const supabase = await createClient();

  // Check if user is logged in
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    // Redirect to login but save the action URL to redirect back after login
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.url)}`, origin));
  }

  // Get user profile to check if they are admin of the organization
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, organization_id")
    .eq("id", authUser.id)
    .single();

  if (!profile || !profile.is_admin || !profile.organization_id) {
    return NextResponse.redirect(new URL("/settings?error=unauthorized_admin", origin));
  }

  const adminSupabase = createAdminClient();

  // Fetch join request to verify organization match
  const { data: joinRequest } = await adminSupabase
    .from("join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!joinRequest) {
    return NextResponse.redirect(new URL("/settings?error=request_not_found", origin));
  }

  if (joinRequest.status !== "PENDING") {
    const statusStr = joinRequest.status === "APPROVED" ? "APPROVED" : "REJECTED";
    return NextResponse.redirect(new URL(`/settings?message=request_already_processed&status=${statusStr}&tab=org`, origin));
  }

  const approve = action === "approve";

  if (approve) {
    // 1. Link user to org
    const { error: userUpdateError } = await adminSupabase
      .from("users")
      .update({ organization_id: profile.organization_id })
      .eq("id", joinRequest.user_id);

    if (userUpdateError) {
      return NextResponse.redirect(new URL(`/settings?error=update_failed&detail=${encodeURIComponent(userUpdateError.message)}&tab=org`, origin));
    }

    // 2. Mark join request as APPROVED
    await adminSupabase
      .from("join_requests")
      .update({ status: "APPROVED" })
      .eq("id", requestId);
  } else {
    // Mark join request as REJECTED
    await adminSupabase
      .from("join_requests")
      .update({ status: "REJECTED" })
      .eq("id", requestId);
  }

  revalidatePath("/settings");
  return NextResponse.redirect(new URL(`/settings?success=request_${action}d&tab=org`, origin));
}
