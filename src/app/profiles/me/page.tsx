import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export async function generateMetadata() {
  return {
    title: `My Profile - FtC Platform`,
    description: "View and manage your profile",
  };
}

export default async function MyProfilePage() {
  // Check authentication
  const session = await auth();

  // Must be authenticated to view own profile
  if (!session?.user) {
    redirect("/signin?callbackUrl=/profiles/me");
  }

  // Redirect to the actual profile page with the user's ID
  redirect(`/profiles/${session.user.id}`);
}
