import { TransmittalTable } from "@/components/transmittals/transmittal-table";
import { getTransmittalsPageDataAction } from "../mdl/actions";
import { notFound } from "next/navigation";

interface TransmittalsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TransmittalsPage({
  params,
}: TransmittalsPageProps) {
  const { projectId } = await params;

  const res = await getTransmittalsPageDataAction(projectId);
  if (res.error || !res.data) {
    notFound();
  }

  const { transmittals, versioningLogic } = res.data;

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
