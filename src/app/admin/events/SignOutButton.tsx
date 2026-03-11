"use client";

import { Button } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <Button
      variant="light"
      size="sm"
      leftSection={<IconLogout size={16} />}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign Out
    </Button>
  );
}
