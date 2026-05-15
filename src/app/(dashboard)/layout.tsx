import { Sidebar } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import {
  mockProjectsWithRole,
  getMockCurrentUser,
  getMockCurrentOrganization,
} from "@/lib/mock-data";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = getMockCurrentUser();
  const currentOrg = getMockCurrentOrganization();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        projects={mockProjectsWithRole}
        organizationName={currentOrg.name}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Global user nav bar (always visible) */}
        <div className="flex items-center justify-end h-[var(--topbar-height)] border-b border-border px-4 bg-background">
          <UserNav user={currentUser} organizationName={currentOrg.name} />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
