"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { FileText, MessageSquare, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Revision, FileRecord, Comment } from "@/lib/types";

interface RevisionTimelineProps {
  revisions: (Revision & {
    files: FileRecord[];
    uploader_name: string;
    comments: Comment[];
  })[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RevisionTimeline({ revisions }: RevisionTimelineProps) {
  if (revisions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay revisiones registradas.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

      <div className="space-y-6">
        {revisions.map((revision, index) => (
          <div key={revision.id} className="relative pl-8">
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-background ${
                index === 0
                  ? "border-primary"
                  : "border-muted-foreground/30"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                }`}
              />
            </div>

            {/* Revision content */}
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono">
                  Rev {revision.version_label}
                </span>
                <StatusBadge status={revision.status} />
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {revision.uploader_name}
                </span>
                <span>•</span>
                <span>{formatDate(revision.created_at)}</span>
              </div>

              {/* Files */}
              {revision.files.length > 0 && (
                <div className="space-y-1 mt-2">
                  {revision.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm group"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-[13px]">
                        {file.file_name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.file_size_bytes)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Descargar ${file.file_name}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Comments */}
              {revision.comments.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {revision.comments.length} comentario
                    {revision.comments.length !== 1 ? "s" : ""}
                  </div>
                  {revision.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-md border border-border/50 bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.created_at)}
                        </span>
                        <StatusBadge status={comment.status} />
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {comment.content}
                      </p>
                      {comment.response_text && (
                        <div className="border-l-2 border-primary/30 pl-3 mt-2">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Respuesta:
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {comment.response_text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
