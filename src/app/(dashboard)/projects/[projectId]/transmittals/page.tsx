import { TransmittalTable } from "@/components/transmittals/transmittal-table";
import { mockTransmittalRows } from "@/lib/mock-data";

interface TransmittalsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TransmittalsPage({
  params,
}: TransmittalsPageProps) {
  const { projectId } = await params;

  const transmittals = mockTransmittalRows[projectId] ?? [];

  return (
    <div className="h-full flex flex-col">
      <TransmittalTable data={transmittals} />
    </div>
  );
}
