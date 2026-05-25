import { TransmittalTable } from "@/components/transmittals/transmittal-table";
import { createClient } from "@/lib/supabase/server";
import type { TransmittalTableRow } from "@/lib/types";

interface TransmittalsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TransmittalsPage({
  params,
}: TransmittalsPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  // 1. Obtener la configuración de versionado del proyecto
  const { data: project } = await supabase
    .from("projects")
    .select("versioning_logic")
    .eq("id", projectId)
    .single();

  const versioningLogic = project?.versioning_logic ?? "MIXED";

  // 2. Obtener transmittals del proyecto con conteo de items y datos del sender/recipient
  const { data: rawTransmittals } = await supabase
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

  const transmittals: TransmittalTableRow[] = (rawTransmittals ?? []).map(
    (row) => {
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
    }
  );

  return (
    <div className="h-full flex flex-col">
      <TransmittalTable
        data={transmittals}
        projectId={projectId}
        versioningLogic={versioningLogic}
      />
    </div>
  );
}
