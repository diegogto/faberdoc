"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  Building2,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProjectWithRole } from "@/lib/types";

interface SidebarProps {
  projects: ProjectWithRole[];
  organizationName: string;
}

export function Sidebar({ projects, organizationName }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const ownProjects = projects.filter((p) => p.is_own_organization);
  const externalProjects = projects.filter((p) => !p.is_own_organization);

  const isProjectActive = (projectId: string) =>
    pathname.startsWith(`/projects/${projectId}`);

  return (
    <aside
      className={cn(
        "sidebar-transition relative flex flex-col border-r border-border bg-sidebar h-full",
        isCollapsed ? "w-[var(--sidebar-collapsed-width)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          "flex items-center h-[var(--topbar-height)] border-b border-border px-3",
          isCollapsed ? "justify-center" : "gap-2"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FolderKanban className="h-4 w-4" />
        </div>
        {!isCollapsed && (
          <span className="text-sm font-semibold tracking-tight truncate">
            Faberdoc
          </span>
        )}
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1 notion-scroll">
        <div className={cn("py-2", isCollapsed ? "px-1" : "px-2")}>
          {/* Own Organization Projects */}
          <SidebarSection
            icon={<Building2 className="h-3.5 w-3.5" />}
            title={organizationName}
            isCollapsed={isCollapsed}
          />
          {ownProjects.map((project) => (
            <SidebarProjectItem
              key={project.id}
              project={project}
              isActive={isProjectActive(project.id)}
              isCollapsed={isCollapsed}
            />
          ))}

          {externalProjects.length > 0 && (
            <>
              <Separator className="my-3" />
              {/* External Projects */}
              <SidebarSection
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                title="Proyectos Externos"
                isCollapsed={isCollapsed}
              />
              {externalProjects.map((project) => (
                <SidebarProjectItem
                  key={project.id}
                  project={project}
                  isActive={isProjectActive(project.id)}
                  isCollapsed={isCollapsed}
                  showOrganization
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SidebarSection({
  icon,
  title,
  isCollapsed,
}: {
  icon: React.ReactNode;
  title: string;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          className="flex items-center justify-center py-2 text-muted-foreground w-full"
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
        {title}
      </span>
    </div>
  );
}

function SidebarProjectItem({
  project,
  isActive,
  isCollapsed,
  showOrganization = false,
}: {
  project: ProjectWithRole;
  isActive: boolean;
  isCollapsed: boolean;
  showOrganization?: boolean;
}) {
  const href = `/projects/${project.id}/mdl`;

  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center rounded-md text-sm transition-colors",
        isCollapsed ? "justify-center p-2" : "gap-2 px-2 py-1.5",
        isActive
          ? "bg-accent text-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-accent/50 hover:text-accent-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold",
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {project.name.charAt(0)}
      </span>
      {!isCollapsed && (
        <div className="flex flex-col min-w-0">
          <span className="truncate text-[13px] leading-tight">{project.name}</span>
          {showOrganization && (
            <span className="truncate text-[11px] text-muted-foreground leading-tight">
              {project.organization_name}
            </span>
          )}
        </div>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="w-full">
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col">
          <span>{project.name}</span>
          {showOrganization && (
            <span className="text-xs text-muted-foreground">
              {project.organization_name}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}
