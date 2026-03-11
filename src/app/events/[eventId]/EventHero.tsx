import { Stack, Title, Text, Group, Button, Anchor } from "@mantine/core";
import {
  IconCalendar,
  IconMapPin,
  IconExternalLink,
} from "@tabler/icons-react";
import Image from "next/image";

interface EventHeroProps {
  eventName?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function EventHero({
  eventName: _eventName = "Intelligence at the Frontier",
  startDate: _startDate,
  endDate: _endDate,
}: EventHeroProps) {
  return (
    <Stack gap={48}>
      {/* Hero Title Section */}
      <Stack gap={24}>
        <Title
          order={1}
          fw={700}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 3.5rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--mantine-color-dark-9)",
          }}
        >
          Welcome to Intelligence at the Frontier
        </Title>

        <Group gap={24}>
          <Group gap={8}>
            <IconCalendar
              size={20}
              style={{ color: "var(--mantine-color-gray-6)" }}
            />
            <Text size="lg" c="dimmed" fw={500}>
              March 14–15, 2026
            </Text>
          </Group>
          <Group gap={8}>
            <IconMapPin
              size={20}
              style={{ color: "var(--mantine-color-gray-6)" }}
            />
            <Text size="lg" c="dimmed" fw={500}>
              San Francisco
            </Text>
          </Group>
        </Group>
      </Stack>

      {/* Register Button */}
      <Button
        component="a"
        href="https://luma.com/ftc-sf-2026"
        target="_blank"
        rel="noopener noreferrer"
        size="xl"
        radius="md"
        rightSection={<IconExternalLink size={20} />}
        style={{ width: "fit-content" }}
      >
        REGISTER NOW
      </Button>

      {/* Banner Image */}
      <div
        style={{
          width: "100%",
          overflow: "hidden",
          borderRadius: "var(--mantine-radius-md)",
          boxShadow: "var(--mantine-shadow-sm)",
        }}
      >
        <Image
          src="/images/iatf-banner.jpg"
          alt="Intelligence at the Frontier banner"
          width={1200}
          height={600}
          style={{ width: "100%", height: "auto", display: "block" }}
          priority
        />
      </div>

      {/* Main Question */}
      <Title
        order={2}
        fw={600}
        style={{
          fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
          lineHeight: 1.3,
          letterSpacing: "-0.02em",
          color: "var(--mantine-color-dark-8)",
        }}
      >
        How do we design for human flourishing in the age of AI?
      </Title>

      {/* Event Description */}
      <Text size="lg" style={{ lineHeight: 1.8, maxWidth: "65ch" }}>
        A two-day vertical festival to prototype the funding, governance, and
        coordination systems humanity needs before superintelligence arrives.
      </Text>

      {/* The Event Section */}
      <Stack gap={32} mt={16}>
        <Title order={3} fw={600} size="xl">
          The Event
        </Title>

        <Stack gap={24}>
          <Text size="md" style={{ lineHeight: 1.8, maxWidth: "65ch" }}>
            For centuries, intelligence was a biological accident.
          </Text>

          <Text size="md" style={{ lineHeight: 1.8, maxWidth: "65ch" }}>
            Now it&apos;s becoming a resource we mine and refine.
          </Text>

          <Text size="md" style={{ lineHeight: 1.8, maxWidth: "65ch" }}>
            Will we treat this new intelligence like oil, or like a garden?
          </Text>

          <Text size="md" style={{ lineHeight: 1.8, maxWidth: "65ch" }}>
            We convene to map and prototype the coordination systems we need
            today to ensure AI serves human flourishing tomorrow.
          </Text>

          <Text
            size="lg"
            fw={600}
            mt={8}
            style={{ lineHeight: 1.7, maxWidth: "65ch" }}
          >
            Six floors. Hundreds of sessions. One living experiment in
            coordination.
          </Text>
        </Stack>
      </Stack>

      {/* Additional Resources */}
      <div
        style={{
          padding: "24px",
          backgroundColor: "var(--mantine-color-gray-0)",
          borderRadius: "var(--mantine-radius-md)",
          borderLeft: "4px solid var(--mantine-color-blue-5)",
        }}
      >
        <Text size="md" style={{ lineHeight: 1.8 }}>
          In the meantime, check out the{" "}
          <Anchor
            href="https://www.fundingthecommons.io/ftc-frontiertower"
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            underline="hover"
          >
            Funding the Commons IatF website
          </Anchor>
          , follow{" "}
          <Anchor
            href="https://x.com/fundingcommons"
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            underline="hover"
          >
            FtC
          </Anchor>{" "}
          and{" "}
          <Anchor
            href="https://x.com/frontiertower"
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            underline="hover"
          >
            Frontier Tower
          </Anchor>{" "}
          on Twitter/X for updates, and register your ticket on{" "}
          <Anchor
            href="https://luma.com/ftc-sf-2026"
            target="_blank"
            rel="noopener noreferrer"
            fw={600}
            underline="hover"
          >
            Luma
          </Anchor>
          .
        </Text>
      </div>
    </Stack>
  );
}
