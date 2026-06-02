import { redirect } from "next/navigation";
import Link from "next/link";
import { Folder, Plus, CheckCircle, AlertCircle, FileText, Inbox, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyProjectsView } from "@/components/layout/empty-projects-view";
import { GlobalTimeline } from "@/components/layout/global-timeline";
import { getDashboardDataAction } from "./dashboard-actions";
import { CreateProjectButton } from "@/components/layout/create-project-button";
import { TrashcanButton } from "@/components/layout/trashcan-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile for roles and admin permission
  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    redirect("/onboarding");
  }

  const res = await getDashboardDataAction();
  if (res.error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-var(--topbar-height))]">
        <p className="text-red-500 font-medium">{res.error}</p>
      </div>
    );
  }

  const data = res.data;
  if (!data || data.projects.length === 0) {
    return (
      <EmptyProjectsView
        isAdmin={userProfile.is_admin ?? false}
        userFullName={userProfile.full_name}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 font-sans">
            ¡Hola, {userProfile.full_name}!
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            Bienvenido al panel de control de Faberdoc. Revisa la actividad reciente y tus tareas pendientes.
          </p>
        </div>

        {userProfile.is_admin && (
          <div className="flex items-center gap-2">
            <TrashcanButton />
            <CreateProjectButton />
          </div>
        )}
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <Folder className="h-5 w-5 text-zinc-400" />
          Proyectos Activos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.projects.map((proj) => (
            <Link
              key={proj.id}
              href={`/projects/${proj.id}/mdl`}
              className="group flex flex-col justify-between p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden"
            >
              {/* Highlight accent on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300" />
              
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
                  {proj.organization_name}
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                  {proj.name}
                </h3>
              </div>

              {/* KPI Badges */}
              <div className="flex items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  <FileText className="h-3 w-3" />
                  {proj.doc_count} doc{proj.doc_count !== 1 ? "s" : ""}
                </span>
                {proj.pending_review_count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    {proj.pending_review_count} pendiente{proj.pending_review_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-4 pt-3 border-t border-zinc-50 dark:border-zinc-900">
                <span>Ver Maestro de Documentos</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

      </div>

      {/* Main Dashboard Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle Columns: Global Activity Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 p-6 shadow-xs">
            <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mb-6 flex items-center gap-2">
              <Inbox className="h-5 w-5 text-zinc-400" />
              Línea de Tiempo Global
            </h2>
            <GlobalTimeline activities={data.activities} />
          </div>
        </div>

        {/* Right Column: Actionable Tasks List */}
        <div className="space-y-6">
          
          {/* Pending Tasks Container */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-zinc-400" />
              Tareas Pendientes
            </h2>

            {/* Sub-Section: Reviews Pending Approval */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                Por Revisar ({data.pendingReviews.length})
              </h3>
              
              {data.pendingReviews.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2 italic">
                  No hay documentos esperando tu revisión.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.pendingReviews.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project_id}/mdl?openRevisionId=${task.id}`}
                      className="block p-3 rounded-lg border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 hover:bg-zinc-100/50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold font-mono text-zinc-400 dark:text-zinc-500 truncate">
                          {task.project_name}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-primary truncate group-hover:underline">
                            {task.document_code}
                          </span>
                          <span className="text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 px-1.5 py-0.5 rounded-sm uppercase shrink-0">
                            Rev {task.version_label}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate">
                          {task.document_title}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                          Subido por {task.uploader_name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Section: Commented Revisions needing Correction */}
            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                Por Corregir ({data.pendingCorrections.length})
              </h3>

              {data.pendingCorrections.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2 italic">
                  No tienes documentos marcados con comentarios.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.pendingCorrections.map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${task.project_id}/mdl?openRevisionId=${task.id}`}
                      className="block p-3 rounded-lg border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 hover:bg-zinc-100/50 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/30 transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold font-mono text-zinc-400 dark:text-zinc-500 truncate">
                          {task.project_name}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-orange-600 dark:text-orange-500 truncate group-hover:underline">
                            {task.document_code}
                          </span>
                          <span className="text-[10px] font-medium bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 px-1.5 py-0.5 rounded-sm uppercase shrink-0">
                            Rev {task.version_label}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate">
                          {task.document_title}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3 shrink-0" />
                          Requiere corregir comentarios
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
