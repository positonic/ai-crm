"use client";

import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Badge,
  Stack,
  ThemeIcon,
} from "@mantine/core";
import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";

interface ImpactReport {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  location: string;
  stats: { label: string; value: string }[];
  color: string;
}

const impactReports: ImpactReport[] = [
  {
    slug: "ftc-residency-chiang-mai",
    title: "FtC Residency Chiang Mai",
    subtitle: "Intensive residency program for public goods builders",
    date: "TBD 2025",
    location: "Chiang Mai, Thailand",
    stats: [
      { label: "Residents", value: "TBD" },
      { label: "Projects", value: "TBD" },
    ],
    color: "teal",
  },
  {
    slug: "funding-commons-residency-2025",
    title: "Funding the Commons Residency 2025",
    subtitle: "3-week residency program for public goods builders",
    date: "Oct 24 - Nov 14, 2025",
    location: "Buenos Aires, Argentina",
    stats: [
      { label: "Residents", value: "33" },
      { label: "Projects", value: "42" },
    ],
    color: "violet",
  },
  {
    slug: "buenos-aires-2025",
    title: "Funding the Commons Buenos Aires",
    subtitle: "Conference bringing together builders, researchers, and funders",
    date: "November 2024",
    location: "Buenos Aires, Argentina",
    stats: [
      { label: "Attendees", value: "305" },
      { label: "Countries", value: "45+" },
    ],
    color: "blue",
  },
];

export default function ImpactReportsPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Impact Reports
          </Title>
          <Text c="dimmed" size="lg">
            Explore the outcomes and achievements from our events and programs
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {impactReports.map((report) => (
            <Card
              key={report.slug}
              component={Link}
              href={`/impact-reports/${report.slug}`}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <Stack gap="md">
                <div>
                  <Badge color={report.color} variant="light" mb="xs">
                    Impact Report
                  </Badge>
                  <Title order={3} mb="xs">
                    {report.title}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {report.subtitle}
                  </Text>
                </div>

                <Group gap="lg">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="gray">
                      <IconCalendar size={14} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {report.date}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="gray">
                      <IconMapPin size={14} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {report.location}
                    </Text>
                  </Group>
                </Group>

                <Group gap="xl">
                  {report.stats.map((stat) => (
                    <div key={stat.label}>
                      <Text size="xl" fw={700} c={report.color}>
                        {stat.value}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {stat.label}
                      </Text>
                    </div>
                  ))}
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
