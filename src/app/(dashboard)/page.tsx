import { redirect } from "next/navigation";

/**
 * Dashboard root page — redirects to the first available project.
 * In production this would read from user session / preferences.
 */
export default function DashboardPage() {
  // Redirect to first project (mock: proj-001)
  redirect("/projects/proj-001/mdl");
}
