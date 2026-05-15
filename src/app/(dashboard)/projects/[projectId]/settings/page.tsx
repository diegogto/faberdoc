import { mockProjects } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;

  const project = mockProjects.find((p) => p.id === projectId);
  if (!project) notFound();

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
      {/* Project Info */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Información del Proyecto</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{project.name}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
            <span className="text-muted-foreground">Patrón de Código</span>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {project.naming_pattern}
            </code>
          </div>
          {project.client_info && (
            <>
              <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                <span className="text-muted-foreground">Cliente</span>
                <span>
                  {(project.client_info as Record<string, string>).client_name ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                <span className="text-muted-foreground">Contrato</span>
                <span>
                  {(project.client_info as Record<string, string>).contract ?? "—"}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      <Separator />

      {/* Dynamic Properties */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          Propiedades Dinámicas (Campos JSONB)
        </h2>
        <div className="space-y-4">
          {project.custom_properties_definition.map((prop) => (
            <div
              key={prop.key}
              className="rounded-lg border border-border p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{prop.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {prop.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                key: {prop.key}
              </p>
              {prop.options && prop.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {prop.options.map((opt) => (
                    <Badge key={opt} variant="outline" className="text-xs">
                      {opt}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
