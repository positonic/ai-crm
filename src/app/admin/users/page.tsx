import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage() {
  // Check authentication and role
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin/users");
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <UsersPageClient />;
}
