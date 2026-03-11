import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import { IconLock, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { auth } from "~/server/auth";

export default async function UnauthorizedPage() {
  const session = await auth();

  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" radius="md" ta="center">
        <Stack gap="lg">
          <ThemeIcon
            size={80}
            radius="xl"
            color="red"
            variant="light"
            mx="auto"
          >
            <IconLock size={40} />
          </ThemeIcon>

          <Stack gap="sm">
            <Title order={1} c="red">
              Access Denied
            </Title>
            <Text size="lg" c="dimmed">
              You don&apos;t have permission to access this page
            </Text>
          </Stack>

          <Text size="sm">
            This page is restricted to Funding the Commons staff members only.
            If you believe you should have access, please contact an
            administrator.
          </Text>

          {session?.user ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Signed in as: {session.user.email}
              </Text>
              <Text size="xs" c="dimmed">
                Contact an administrator for access
              </Text>
            </Stack>
          ) : (
            <Text size="sm">Please sign in to continue.</Text>
          )}

          <Stack gap="sm">
            <Link href="/" style={{ textDecoration: "none" }}>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="filled"
                size="md"
                fullWidth
              >
                Go to Homepage
              </Button>
            </Link>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
