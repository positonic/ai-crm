"use client";

import Link from "next/link";
import { Container, Title, Text, Stack, Button } from "@mantine/core";
import { IconCalendarEvent } from "@tabler/icons-react";

export default function PublicHomepage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b">
      <Container size="xl" py="xl">
        <Stack gap="xl" align="center">
          {/* Hero Section */}
          <Stack gap="lg" ta="center" maw={800}>
            <Title
              order={1}
              size="3.5rem"
              fw={800}
              style={{
                background: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Funding the Commons
            </Title>
            <Title order={2} size="1.5rem" fw={400} c="dimmed">
              Join the Commons
            </Title>
            <Text
              size="xl"
              c="dimmed"
              maw={600}
              mx="auto"
              style={{ lineHeight: 1.6 }}
            >
              Join our community to connect with people who innovate and build
              public goods.
            </Text>
          </Stack>

          {/* Single CTA Button */}
          <Link href="/signin" style={{ textDecoration: "none" }}>
            <Button
              size="xl"
              radius="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "purple" }}
              leftSection={<IconCalendarEvent size={24} />}
            >
              Enter the Commons
            </Button>
          </Link>
        </Stack>
      </Container>
    </main>
  );
}
