import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "./settings-form";

interface SettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, naming_pattern, versioning_logic, review_flow_config, custom_properties_definition, client_info")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (!project) notFound();

  type CustomPropertyDef = {
    key: string;
    label: string;
    type: string;
    options?: string[];
  };

  const customProperties = (project.custom_properties_definition as unknown as CustomPropertyDef[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
      {/* Project Info Settings Form */}
      <section>
        <h2 className="text-lg font-semibold mb-6">Información del Proyecto</h2>
        <SettingsForm project={project} />
      </section>

      <Separator />

      {/* Dynamic Properties */}
      <section>
        <h2 className="text-lg font-semibold mb-4 font-sans text-zinc-900 dark:text-zinc-50">
          Propiedades Dinámicas (Campos JSONB)
        </h2>
        <div className="space-y-4">
          {customProperties.map((prop) => (
            <div
              key={prop.key}
              className="rounded-lg border border-border p-4 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/30"
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
                    <Badge key={opt} variant="outline" className="text-xs bg-white dark:bg-zinc-950">
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
