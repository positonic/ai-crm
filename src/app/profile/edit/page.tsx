import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { ProfileEditClient } from "./ProfileEditClient";

export const metadata = {
  title: "Edit Profile - FtC Platform",
  description: "Update your profile information",
};

export default async function EditProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/signin");
  }

  return <ProfileEditClient />;
}
