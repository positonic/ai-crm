"use client";

import {
  Container,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Button,
} from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <Container size="sm" py="xl">
      <Paper shadow="md" p="xl" radius="md" ta="center">
        <Stack gap="lg" align="center">
          <ThemeIcon size={60} radius="xl" color="blue" variant="light">
            <IconMail size={30} />
          </ThemeIcon>
          <Text size="xl" fw={600}>
            Check your email
          </Text>
          <Text c="dimmed">
            A sign-in link has been sent to your email address. Click the link
            in the email to sign in to your account.
          </Text>
          <Text size="sm" c="dimmed">
            The link will expire in 24 hours. If you don&apos;t see the email,
            check your spam folder.
          </Text>
          <Button component={Link} href="/signin" variant="subtle">
            Back to sign in
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
