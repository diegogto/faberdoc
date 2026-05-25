"use client";

import Link from "next/link";
import { FileUp, MessageSquare, Send, Calendar, Folder } from "lucide-react";
import type { ActivityItem } from "@/app/(dashboard)/dashboard-actions";

interface GlobalTimelineProps {
  activities: ActivityItem[];
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GlobalTimeline({ activities }: GlobalTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-zinc-50/30 dark:bg-zinc-900/10">
        <Calendar className="h-8 w-8 text-zinc-400 mb-3 stroke-[1.5]" />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Sin actividad registrada</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          La actividad del proyecto aparecerá aquí a medida que se carguen archivos o se realicen comentarios.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Central timeline line */}
      <div className="absolute left-[11px] top-1.5 bottom-1.5 w-0.5 bg-zinc-100 dark:bg-zinc-800" />

      <div className="space-y-6">
        {activities.map((activity) => {
          let icon = <FileUp className="h-3.5 w-3.5" />;
          let iconBg = "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400";
          let actionText = "";
          let linkUrl = `/projects/${activity.project_id}/mdl`;

          if (activity.type === "revision") {
            const label = activity.details.version_label || "";
            const formattedLabel = label.startsWith("Rev") ? label : `Rev ${label}`;
            actionText = `cargó la versión ${formattedLabel} de`;
            
            if (activity.details.status === "APPROVED") {
              iconBg = "bg-green-50 border-green-200 text-green-600 dark:bg-green-950/20 dark:border-green-900/30 dark:text-green-400";
              actionText = `aprobó la versión ${formattedLabel} de`;
            } else if (activity.details.status === "COMMENTED") {
              iconBg = "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400";
              actionText = `marcó con comentarios la versión ${formattedLabel} de`;
            }
            // Link directly to open this revision in the MDL
            linkUrl = `/projects/${activity.project_id}/mdl?openRevisionId=${activity.id}`;

          } else if (activity.type === "comment") {
            icon = <MessageSquare className="h-3.5 w-3.5" />;
            iconBg = "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/30 dark:text-orange-400";
            actionText = `agregó un comentario técnico en`;
            linkUrl = `/projects/${activity.project_id}/mdl?openRevisionId=${activity.id}`;

          } else if (activity.type === "transmittal") {
            icon = <Send className="h-3.5 w-3.5" />;
            iconBg = "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-950/20 dark:border-purple-900/30 dark:text-purple-400";
            actionText = `emitió el Transmittal ${activity.details.transmittal_code || ""} a`;
            linkUrl = `/projects/${activity.project_id}/transmittals`;
          }

          return (
            <div key={activity.id} className="relative group transition-all duration-200">
              {/* Timeline Indicator Node */}
              <div
                className={`absolute -left-[23px] top-1 flex h-5 w-5 items-center justify-center rounded-full border shadow-xs transition-transform duration-200 group-hover:scale-110 ${iconBg}`}
              >
                {icon}
              </div>

              {/* Activity Card */}
              <div className="flex flex-col gap-1.5">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {activity.user_name}
                  </span>
                  <span>{actionText}</span>
                  {activity.type === "transmittal" ? (
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {activity.details.recipient_org_name}
                    </span>
                  ) : (
                    <Link
                      href={linkUrl}
                      className="font-semibold font-mono text-primary hover:underline transition-colors shrink-0 max-w-[150px] sm:max-w-none truncate"
                    >
                      {activity.details.document_code}
                    </Link>
                  )}
                  <span>en</span>
                  <Link
                    href={`/projects/${activity.project_id}/mdl`}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-medium hover:underline transition-colors"
                  >
                    <Folder className="h-3 w-3" />
                    {activity.project_name}
                  </Link>
                </div>

                {/* Sub details block (if comment content exists) */}
                {activity.type === "comment" && activity.details.comment_content && (
                  <div className="mt-1 pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 max-w-2xl">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans italic">
                      "{activity.details.comment_content}"
                    </p>
                  </div>
                )}

                {/* Date */}
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tracking-wide font-mono mt-0.5">
                  {formatDate(activity.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
