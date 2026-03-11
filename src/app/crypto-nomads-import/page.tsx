import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import CryptoNomadsImportClient from "./CryptoNomadsImportClient";

export default async function CryptoNomadsImportPage() {
  // Check authentication and role
  const session = await auth();

  // Must be authenticated
  if (!session?.user) {
    redirect("/signin?callbackUrl=/crypto-nomads-import");
  }

  // Must have staff or admin role
  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <CryptoNomadsImportClient />;
}
