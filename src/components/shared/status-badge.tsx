"use client";

import { Badge } from "@/components/ui/badge";
import type { RevisionStatus, CommentStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  RevisionStatus | CommentStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Borrador",
    className:
      "bg-[var(--status-draft-bg)] text-[var(--status-draft)] border-[var(--status-draft)]/20 hover:bg-[var(--status-draft-bg)]",
  },
  IN_REVIEW: {
    label: "En Revisión",
    className:
      "bg-[var(--status-review-bg)] text-[var(--status-review)] border-[var(--status-review)]/20 hover:bg-[var(--status-review-bg)]",
  },
  APPROVED: {
    label: "Aprobado",
    className:
      "bg-[var(--status-approved-bg)] text-[var(--status-approved)] border-[var(--status-approved)]/20 hover:bg-[var(--status-approved-bg)]",
  },
  ISSUED: {
    label: "Emitido",
    className:
      "bg-[var(--status-issued-bg)] text-[var(--status-issued)] border-[var(--status-issued)]/20 hover:bg-[var(--status-issued-bg)]",
  },
  OPEN: {
    label: "Abierto",
    className:
      "bg-[var(--status-review-bg)] text-[var(--status-review)] border-[var(--status-review)]/20 hover:bg-[var(--status-review-bg)]",
  },
  RESPONDED: {
    label: "Respondido",
    className:
      "bg-[var(--status-issued-bg)] text-[var(--status-issued)] border-[var(--status-issued)]/20 hover:bg-[var(--status-issued-bg)]",
  },
  CLOSED: {
    label: "Cerrado",
    className:
      "bg-[var(--status-approved-bg)] text-[var(--status-approved)] border-[var(--status-approved)]/20 hover:bg-[var(--status-approved-bg)]",
  },
};

interface StatusBadgeProps {
  status: RevisionStatus | CommentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}
