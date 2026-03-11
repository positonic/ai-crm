import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  // Check authentication and role
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <AdminDashboard />;
}
