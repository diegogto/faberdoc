"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopBarProps {
  projectId: string;
  projectName: string;
}

const TABS = [
  { key: "dashboard", label: "Dashboard", href: "" },
  { key: "mdl", label: "Maestro de Documentos", href: "/mdl" },
  { key: "transmittals", label: "Envíos", href: "/transmittals" },
  { key: "settings", label: "Configuración", href: "/settings" },
] as const;

export function TopBar({ projectId, projectName }: TopBarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  const getActiveTab = (): string => {
    for (const tab of TABS) {
      if (tab.href === "") {
        // Dashboard is active only when path is exactly /projects/[id]
        if (pathname === basePath || pathname === `${basePath}/`) {
          return tab.key;
        }
        continue;
      }
      if (pathname.startsWith(`${basePath}${tab.href}`)) {
        return tab.key;
      }
    }
    return "dashboard";
  };

  const activeTab = getActiveTab();

  return (
    <header className="flex items-center h-[var(--topbar-height)] border-b border-border bg-background/80 backdrop-blur-sm px-4 gap-6">
      {/* Project name breadcrumb */}
      <div className="flex items-center gap-2 shrink-0">
        <h1 className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {projectName}
        </h1>
      </div>

      {/* Tab navigation */}
      <nav className="flex items-center gap-1 h-full" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const href = tab.href === "" ? basePath : `${basePath}${tab.href}`;

          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative flex items-center px-3 h-full text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {/* Active underline indicator */}
              {isActive && (
                <span className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User nav is handled externally or here for simplicity */}
    </header>
  );
}
