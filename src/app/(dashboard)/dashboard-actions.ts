"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActivityItem {
  id: string;
  type: "revision" | "comment" | "transmittal";
  created_at: string;
  user_name: string;
  project_id: string;
  project_name: string;
  details: {
    document_code?: string;
    document_title?: string;
    version_label?: string;
    status?: string;
    comment_content?: string;
    transmittal_code?: string;
    recipient_org_name?: string;
  };
}

export interface DashboardData {
  projects: { id: string; name: string; organization_name: string }[];
  pendingReviews: {
    id: string;
    version_label: string;
    created_at: string;
    uploader_name: string;
    document_id: string;
    document_code: string;
    document_title: string;
    project_id: string;
    project_name: string;
  }[];
  pendingCorrections: {
    id: string;
    version_label: string;
    created_at: string;
    document_id: string;
    document_code: string;
    document_title: string;
    project_id: string;
    project_name: string;
  }[];
  activities: ActivityItem[];
}

function extractName(userObj: any): string {
  if (!userObj) return "Usuario";
  if (Array.isArray(userObj)) {
    return userObj[0]?.full_name || "Usuario";
  }
  return userObj.full_name || "Usuario";
}

function extractOrgName(orgObj: any): string {
  if (!orgObj) return "Organización";
  if (Array.isArray(orgObj)) {
    return orgObj[0]?.name || "Organización";
  }
  return orgObj.name || "Organización";
}

export async function getDashboardDataAction(): Promise<{ data?: DashboardData; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "No autenticado" };
  }

  try {
    // 1. Fetch user's projects
    const { data: memberships } = await supabase
      .from("project_members")
      .select(`
        project:projects(
          id,
          name,
          organization:organizations(name)
        )
      `)
      .eq("user_id", user.id);

    const projectsList = (memberships || []).map((m: any) => {
      const proj = m.project;
      return {
        id: proj.id,
        name: proj.name,
        organization_name: proj.organization?.name || "Organización",
      };
    });

    // 2. Fetch pending reviews (revisions in 'IN_REVIEW' within user's projects)
    const { data: inReviewRevs } = await supabase
      .from("revisions")
      .select(`
        id,
        version_label,
        created_at,
        uploader:users(full_name),
        document:documents(
          id,
          document_code,
          title,
          project:projects(id, name)
        )
      `)
      .eq("status", "IN_REVIEW")
      .order("created_at", { ascending: false });

    const pendingReviewsList = (inReviewRevs || []).map((r: any) => {
      const doc = r.document;
      const proj = doc?.project;
      return {
        id: r.id,
        version_label: r.version_label,
        created_at: r.created_at,
        uploader_name: extractName(r.uploader),
        document_id: doc?.id || "",
        document_code: doc?.document_code || "",
        document_title: doc?.title || "",
        project_id: proj?.id || "",
        project_name: proj?.name || "Proyecto",
      };
    });

    // 3. Fetch pending corrections (revisions in 'COMMENTED' uploaded by the user)
    const { data: commentedRevs } = await supabase
      .from("revisions")
      .select(`
        id,
        version_label,
        created_at,
        document:documents(
          id,
          document_code,
          title,
          project:projects(id, name)
        )
      `)
      .eq("status", "COMMENTED")
      .eq("uploader_id", user.id)
      .order("created_at", { ascending: false });

    const pendingCorrectionsList = (commentedRevs || []).map((r: any) => {
      const doc = r.document;
      const proj = doc?.project;
      return {
        id: r.id,
        version_label: r.version_label,
        created_at: r.created_at,
        document_id: doc?.id || "",
        document_code: doc?.document_code || "",
        document_title: doc?.title || "",
        project_id: proj?.id || "",
        project_name: proj?.name || "Proyecto",
      };
    });

    // 4. Fetch recent revisions (limit 15) for activity timeline
    const { data: revs } = await supabase
      .from("revisions")
      .select(`
        id,
        created_at,
        version_label,
        status,
        uploader:users(full_name),
        document:documents(
          document_code,
          title,
          project:projects(id, name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(15);

    // 5. Fetch recent comments
    const { data: comments } = await supabase
      .from("comments")
      .select(`
        id,
        created_at,
        content,
        author:users(full_name),
        revision:revisions(
          document:documents(
            document_code,
            title,
            project:projects(id, name)
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(15);

    // 6. Fetch recent transmittals
    const { data: transmittals } = await supabase
      .from("transmittals")
      .select(`
        id,
        transmittal_code,
        created_at,
        sender:users(full_name),
        recipient:organizations(name),
        project:projects(id, name)
      `)
      .order("created_at", { ascending: false })
      .limit(15);

    // Compile into unified list
    const activities: ActivityItem[] = [];

    if (revs) {
      for (const r of revs) {
        const doc = Array.isArray(r.document) ? r.document[0] : (r.document as any);
        const proj = doc && Array.isArray(doc.project) ? doc.project[0] : (doc?.project as any);
        if (doc) {
          activities.push({
            id: r.id,
            type: "revision",
            created_at: r.created_at,
            user_name: extractName(r.uploader),
            project_id: proj?.id || "",
            project_name: proj?.name || "Proyecto",
            details: {
              document_code: doc.document_code,
              document_title: doc.title,
              version_label: r.version_label,
              status: r.status,
            },
          });
        }
      }
    }

    if (comments) {
      for (const c of comments) {
        const rev = Array.isArray(c.revision) ? c.revision[0] : (c.revision as any);
        const doc = rev && Array.isArray(rev.document) ? rev.document[0] : (rev?.document as any);
        const proj = doc && Array.isArray(doc.project) ? doc.project[0] : (doc?.project as any);
        if (doc) {
          activities.push({
            id: c.id,
            type: "comment",
            created_at: c.created_at,
            user_name: extractName(c.author),
            project_id: proj?.id || "",
            project_name: proj?.name || "Proyecto",
            details: {
              document_code: doc.document_code,
              document_title: doc.title,
              comment_content: c.content,
            },
          });
        }
      }
    }

    if (transmittals) {
      for (const t of transmittals) {
        const proj = t.project as any;
        if (proj) {
          activities.push({
            id: t.id,
            type: "transmittal",
            created_at: t.created_at,
            user_name: extractName(t.sender),
            project_id: proj.id,
            project_name: proj.name,
            details: {
              transmittal_code: t.transmittal_code,
              recipient_org_name: extractOrgName(t.recipient),
            },
          });
        }
      }
    }

    activities.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      data: {
        projects: projectsList,
        pendingReviews: pendingReviewsList,
        pendingCorrections: pendingCorrectionsList,
        activities: activities.slice(0, 15),
      },
    };
  } catch (err) {
    console.error("Error in getDashboardDataAction:", err);
    return { error: "Ocurrió un error al obtener la información del dashboard" };
  }
}
