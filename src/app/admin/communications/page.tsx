import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { CommunicationsClient } from "./CommunicationsClient";

export default async function AdminCommunicationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "staff") {
    redirect("/");
  }

  return <CommunicationsClient />;
}
