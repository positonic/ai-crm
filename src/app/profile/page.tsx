import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  redirect(`/profiles/${session.user.id}`);
}
