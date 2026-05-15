import { redirect } from "next/navigation";

/**
 * Root page redirects to the dashboard.
 * In production, this would check auth state first.
 */
export default function Home() {
  redirect("/projects/proj-001/mdl");
}
