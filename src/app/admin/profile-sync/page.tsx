import { ProfileSyncAdminClient } from "./ProfileSyncAdminClient";

export const metadata = {
  title: "Profile Sync Management - Admin",
  description: "Bulk sync application data to user profiles",
};

export default function ProfileSyncAdminPage() {
  return <ProfileSyncAdminClient />;
}
