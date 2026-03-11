"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Card,
  Group,
  ThemeIcon,
  Badge,
  List,
  Divider,
  Box,
  Paper,
} from "@mantine/core";
import {
  IconBriefcase,
  IconRocket,
  IconUsers,
  IconTarget,
  IconBulb,
} from "@tabler/icons-react";
import Link from "next/link";

export default function EntrepreneurInResidencyPage() {
  return (
    <Box className="bg-theme-gradient" style={{ minHeight: "100vh" }}>
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Card shadow="lg" padding="xl" radius="md" withBorder>
            <Group align="flex-start" gap="lg">
              <Box visibleFrom="sm">
                <ThemeIcon
                  size={80}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: "purple", to: "pink" }}
                >
                  <IconBriefcase size={40} />
                </ThemeIcon>
              </Box>

              <Stack gap="sm" style={{ flex: 1 }}>
                <Group justify="space-between" align="flex-start">
                  <Title order={1} size="h1">
                    Entrepreneur in Residency (EIR)
                  </Title>
                  <Badge
                    size="lg"
                    variant="light"
                    color="purple"
                    tt="uppercase"
                  >
                    Program
                  </Badge>
                </Group>

                <Text size="xl" fw={600} c="purple.7">
                  Build the future of coordination.
                </Text>

                <Text size="lg" c="dimmed">
                  Commons Lab is building the next generation of technologies
                  and ventures that power collective intelligence and public
                  goods.
                </Text>

                <Group mt="md">
                  <Button
                    component={Link}
                    href="/events/eir/apply"
                    size="lg"
                    variant="filled"
                    color="purple"
                    leftSection={<IconRocket size={20} />}
                  >
                    Apply Now
                  </Button>
                  <Button
                    component={Link}
                    href="/events"
                    size="lg"
                    variant="outline"
                    color="gray"
                  >
                    ← Back to Events
                  </Button>
                </Group>
              </Stack>
            </Group>
          </Card>

          {/* Mission Statement */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Text size="lg">
                We believe the systems that govern how people coordinate — to
                fund, build, and sustain what matters — are the foundation of a
                more regenerative and equitable economy.
              </Text>

              <Text size="lg">
                We work at the intersection of{" "}
                <strong>AI, Web3, and new economic design</strong>, developing
                models, tools, and ventures that turn public goods into
                investable, scalable systems.
              </Text>

              <Text size="lg">
                Our ecosystem brings together founders, researchers, and
                investors from across the Protocol Labs and Ethereum networks to
                accelerate a new wave of coordination-native startups.
              </Text>

              <Divider />

              <Text size="lg">
                As an <strong>Entrepreneur in Residence (EIR)</strong> at
                Commons Lab, you&apos;ll immerse yourself in our ecosystem —
                exploring the frontier of coordination technology, economic
                primitives, and collective intelligence — and identify
                opportunities to build a new venture within the Commons Lab
                network.
              </Text>

              <Text size="lg" c="dimmed">
                This is an ideal role for a technically fluent, strategically
                minded founder-type who wants to build something meaningful,
                with the backing of a world-class community, but needs time,
                mentorship, and resources to crystallize the right idea.
              </Text>
            </Stack>
          </Paper>

          {/* Program Structure */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="blue">
                  <IconTarget size={16} />
                </ThemeIcon>
                <Title order={2}>Program Structure</Title>
              </Group>

              <Stack gap="xl">
                <Card withBorder p="lg" radius="md">
                  <Stack gap="sm">
                    <Group gap="sm">
                      <Badge color="blue" variant="light">
                        Months 0–3
                      </Badge>
                      <Text fw={600}>Deep Immersion</Text>
                    </Group>
                    <Text c="dimmed">
                      Immerse yourself in Commons Lab&apos;s frameworks,
                      research, and ecosystem.
                    </Text>
                    <Text c="dimmed">
                      Work closely with our partners and internal teams to
                      identify high-leverage opportunities in coordination,
                      funding mechanisms, and decentralized infrastructure.
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="lg" radius="md">
                  <Stack gap="sm">
                    <Group gap="sm">
                      <Badge color="green" variant="light">
                        End of Month 3
                      </Badge>
                      <Text fw={600}>Venture Pitch</Text>
                    </Group>
                    <Text c="dimmed">
                      Present a well-researched venture concept to the Commons
                      Lab review committee.
                    </Text>
                    <Text c="dimmed">
                      Approved ventures advance to the MVP development phase.
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="lg" radius="md">
                  <Stack gap="sm">
                    <Group gap="sm">
                      <Badge color="purple" variant="light">
                        Months 3–6
                      </Badge>
                      <Text fw={600}>MVP Development & Validation</Text>
                    </Group>
                    <Text c="dimmed">
                      Build, test, and validate an MVP with early users, DAOs,
                      and aligned communities.
                    </Text>
                    <Text c="dimmed">
                      Measure traction through clear signals: activation,
                      retention, and willingness to contribute or fund.
                    </Text>
                  </Stack>
                </Card>

                <Card withBorder p="lg" radius="md">
                  <Stack gap="sm">
                    <Group gap="sm">
                      <Badge color="orange" variant="light">
                        After Month 6
                      </Badge>
                      <Text fw={600}>Venture Spinout or Scale</Text>
                    </Group>
                    <Text c="dimmed">
                      Successful ventures may spin out as independent companies
                      with Commons Lab&apos;s support — including pre-seed
                      investment from Commons Fund I and introductions to
                      leading ecosystem investors.
                    </Text>
                  </Stack>
                </Card>
              </Stack>
            </Stack>
          </Paper>

          {/* Responsibilities */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="green">
                  <IconUsers size={16} />
                </ThemeIcon>
                <Title order={2}>Responsibilities</Title>
              </Group>

              <List spacing="md" icon={<IconBulb size={16} />}>
                <List.Item>
                  <Text>
                    <strong>Integration:</strong> Work closely with the Commons
                    Lab team to deeply understand our technology stack, models,
                    and investment theses.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Opportunity Discovery:</strong> Research and
                    validate new venture ideas grounded in coordination theory,
                    open data, or regenerative finance.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Prototyping & Validation:</strong> Design and test
                    MVPs or pilot experiments to identify product-solution fit.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Strategy Development:</strong> Craft business
                    models, go-to-market strategies, and operational plans for
                    potential spinouts.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Collaboration:</strong> Engage with our research,
                    engineering, and ecosystem partners to shape new pathways
                    for public goods ventures.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Venture Formation:</strong> Lead the transition of
                    validated concepts into independent entities ready for seed
                    funding.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Knowledge Contribution:</strong> Share insights and
                    frameworks that strengthen the broader Commons ecosystem.
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Paper>

          {/* You Are Section */}
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <Title order={2}>You Are</Title>

              <List spacing="md" icon={<IconTarget size={16} />}>
                <List.Item>
                  <Text>
                    A founder or early-stage operator with a strong{" "}
                    <strong>bias for action</strong> and ability to move from 0
                    → 1.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    Deeply curious about{" "}
                    <strong>
                      coordination technology, incentive design, and the
                      economics of public goods.
                    </strong>
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    Comfortable operating in ambiguity, learning fast, and
                    working closely with technical and research teams.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    A systems thinker who sees how technology, governance, and
                    markets intersect.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    An excellent communicator — able to synthesize complex ideas
                    into clear narratives.
                  </Text>
                </List.Item>
              </List>

              <Divider />

              <Stack gap="sm">
                <Text fw={600}>Bonus points if you have:</Text>
                <List spacing="sm" icon={<IconBulb size={14} />}>
                  <List.Item>
                    <Text>
                      Experience in systems design, open-source development, or
                      decentralized governance.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text>
                      Background in economics, computer science, or AI.
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text>
                      Prior experience as a founder, researcher, or early-stage
                      builder.
                    </Text>
                  </List.Item>
                </List>
              </Stack>
            </Stack>
          </Paper>

          {/* Why Join */}
          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{ backgroundColor: "var(--mantine-color-purple-0)" }}
          >
            <Stack gap="lg">
              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="purple">
                  <IconRocket size={16} />
                </ThemeIcon>
                <Title order={2} c="purple.7">
                  Why Join Commons Lab
                </Title>
              </Group>

              <List
                spacing="md"
                icon={
                  <IconBulb size={16} color="var(--mantine-color-purple-6)" />
                }
              >
                <List.Item>
                  <Text>
                    <strong>Build the future:</strong> Work at the frontier of
                    coordination, AI, and decentralized technology.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Backed by alignment:</strong> Access mentorship and
                    funding through <strong>Commons Fund I</strong> and partners
                    across the Protocol Labs and Ethereum ecosystems.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Network effects:</strong> Collaborate with an
                    interdisciplinary community of researchers, founders, and
                    investors.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Remote-first:</strong> 100% remote and globally
                    distributed, with opportunities for in-person retreats and
                    gatherings.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Founder-friendly:</strong> You retain founder equity
                    and autonomy in any venture that spins out from the program.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text>
                    <strong>Mission-driven:</strong> Help redefine how humanity
                    funds, builds, and governs the commons.
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Paper>

          {/* Call to Action */}
          <Paper p="xl" radius="md" withBorder ta="center">
            <Stack gap="lg">
              <Title order={3}>Ready to Build the Future?</Title>
              <Text size="lg" c="dimmed">
                If this sounds like the right fit, we&apos;d love to hear from
                you.
              </Text>
              <Text>
                Submit your CV and a short note about why you&apos;re excited to
                build in the <strong>coordination / public goods</strong> space.
              </Text>

              <Group justify="center" gap="md">
                <Button
                  component={Link}
                  href="/events/eir/apply"
                  size="xl"
                  variant="filled"
                  color="purple"
                  leftSection={<IconRocket size={20} />}
                >
                  Apply Now
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
