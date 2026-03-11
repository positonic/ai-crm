"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Table,
  Badge,
  Group,
  ThemeIcon,
  List,
  Alert,
  Grid,
  Progress,
  Paper,
  Box,
} from "@mantine/core";
import {
  IconClipboardList,
  IconBolt,
  IconTarget,
  IconHeart,
  IconVideo,
  IconRocket,
  IconScale,
  IconUsers,
  IconTrendingUp,
  IconShield,
  IconInfoCircle,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";

interface SelectionRubricClientProps {
  eventId: string;
}

// Evaluation criteria based on the system implementation
const evaluationCriteria = [
  {
    category: "TECHNICAL",
    name: "Technical Skills & Experience",
    weight: 20,
    color: "blue",
    icon: IconBolt,
    description:
      "Assessment of technical capabilities, coding skills, and relevant experience",
    subcriteria: [
      "Programming Languages & Frameworks",
      "System Architecture & Design",
      "Development Experience & Portfolio",
      "Problem-Solving Approach",
    ],
  },
  {
    category: "PROJECT",
    name: "Project Quality & Feasibility",
    weight: 20,
    color: "green",
    icon: IconTarget,
    description:
      "Evaluation of project vision, feasibility, and potential impact",
    subcriteria: [
      "Project Vision & Goals",
      "Technical Feasibility",
      "Innovation & Originality",
      "Implementation Plan",
    ],
  },
  {
    category: "COMMUNITY_FIT",
    name: "Community Fit & Values",
    weight: 15,
    color: "pink",
    icon: IconHeart,
    description:
      "Alignment with Funding the Commons values and community culture",
    subcriteria: [
      "Public goods mindset",
      "Collaboration & Community Engagement",
      "Values Alignment",
      "Long-term Commitment",
    ],
  },
  {
    category: "VIDEO",
    name: "Communication & Presentation",
    weight: 20,
    color: "orange",
    icon: IconVideo,
    description:
      "Assessment of communication skills and presentation abilities",
    subcriteria: [
      "Clarity of Communication",
      "Passion & Enthusiasm",
      "Professional Presentation",
      "Storytelling Ability",
    ],
  },
  {
    category: "ENTREPRENEURIAL",
    name: "Entrepreneurial Mindset",
    weight: 25,
    color: "teal",
    icon: IconRocket,
    description: "Assessment of business acumen and entrepreneurial potential",
    subcriteria: [
      "Leadership & Team Building (8%)",
      "Business Acumen & Market Understanding (7%)",
      "Execution Track Record (9%)",
      "Network & Relationship Building (6%)",
      "Risk Assessment & Calculated Risk-Taking (7%)",
      "Resilience & Adaptability (8%)",
    ],
  },
];

const scoringGuidelines = [
  {
    range: "9-10",
    label: "Outstanding",
    description: "Exceptional candidate, top 5% of applicants",
    color: "green",
  },
  {
    range: "8",
    label: "Excellent",
    description: "Strong candidate who exceeds expectations",
    color: "blue",
  },
  {
    range: "6-7",
    label: "Good",
    description: "Solid candidate with good potential",
    color: "cyan",
  },
  {
    range: "4-5",
    label: "Below Average",
    description: "Meets minimum requirements but has limitations",
    color: "yellow",
  },
  {
    range: "1-3",
    label: "Poor",
    description: "Significant gaps or red flags",
    color: "red",
  },
];

const recommendationTypes = [
  {
    type: "ACCEPT",
    description: "Strong fit, likely to succeed and contribute significantly",
    color: "green",
  },
  {
    type: "WAITLIST",
    description: "Good potential but some concerns or missing information",
    color: "blue",
  },
  {
    type: "NEEDS_MORE_INFO",
    description: "Promising but requires additional information/clarification",
    color: "orange",
  },
  {
    type: "REJECT",
    description:
      "Poor fit, significant concerns, or insufficient qualifications",
    color: "red",
  },
];

const confidenceLevels = [
  {
    level: 5,
    label: "Very High",
    description: "Excellent data quality, very confident in assessment",
  },
  {
    level: 4,
    label: "High",
    description: "Good data quality, confident in assessment",
  },
  {
    level: 3,
    label: "Medium",
    description: "Adequate data for basic assessment",
  },
  { level: 2, label: "Low", description: "Limited data, high uncertainty" },
  {
    level: 1,
    label: "Very Low",
    description: "Insufficient data to make reliable assessment",
  },
];

function renderStars(count: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <ThemeIcon
      key={i}
      size="xs"
      variant="transparent"
      c={i < count ? "yellow" : "gray"}
    >
      {i < count ? <IconStarFilled size={12} /> : <IconStar size={12} />}
    </ThemeIcon>
  ));
}

export default function SelectionRubricClient({
  eventId: _eventId,
}: SelectionRubricClientProps) {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon
              size="xl"
              radius="xl"
              variant="gradient"
              gradient={{ from: "purple", to: "pink" }}
            >
              <IconClipboardList size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Selection Rubric
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={800} mx="auto">
            Comprehensive evaluation criteria and process for Funding the
            Commons Residency program selection. This rubric ensures consistent,
            fair, and thorough assessment of all applicants.
          </Text>
        </Stack>

        {/* Overview Alert */}
        <Alert icon={<IconInfoCircle />} color="blue" variant="light">
          <Stack gap="xs">
            <Text fw={500}>Evaluation Process Overview</Text>
            <Text size="sm">
              Each application goes through a multi-stage evaluation process
              with multiple reviewers. Reviewers score applicants across 5 key
              categories to ensure comprehensive assessment.
            </Text>
          </Stack>
        </Alert>

        {/* Evaluation Categories */}
        <Card withBorder>
          <Title order={2} mb="md">
            <Group gap="sm">
              <IconScale size={24} />
              Evaluation Categories
            </Group>
          </Title>

          <Stack gap="lg">
            {evaluationCriteria.map((criteria) => {
              const Icon = criteria.icon;
              return (
                <Paper key={criteria.category} p="md" withBorder radius="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 8 }}>
                      <Group gap="md">
                        <ThemeIcon
                          size="lg"
                          color={criteria.color}
                          variant="light"
                        >
                          <Icon size={24} />
                        </ThemeIcon>
                        <Stack gap="xs" style={{ flex: 1 }}>
                          <Group gap="sm">
                            <Text fw={600} size="lg">
                              {criteria.name}
                            </Text>
                            <Badge color={criteria.color} variant="light">
                              {criteria.weight}% weight
                            </Badge>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {criteria.description}
                          </Text>
                          <List size="sm" spacing="xs">
                            {criteria.subcriteria.map((sub, idx) => (
                              <List.Item key={idx}>{sub}</List.Item>
                            ))}
                          </List>
                        </Stack>
                      </Group>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <Stack gap="xs" align="center">
                        <Text size="sm" fw={500} c="dimmed">
                          Weight Distribution
                        </Text>
                        <Progress
                          value={criteria.weight}
                          size="xl"
                          color={criteria.color}
                          radius="xl"
                        />
                        <Text size="xs" c="dimmed">
                          {criteria.weight}% of total score
                        </Text>
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        </Card>

        {/* Scoring Guidelines */}
        <Card withBorder>
          <Title order={2} mb="md">
            <Group gap="sm">
              <IconTrendingUp size={24} />
              Scoring Guidelines
            </Group>
          </Title>

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Score Range</Table.Th>
                <Table.Th>Rating</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Visual Guide</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {scoringGuidelines.map((guideline) => (
                <Table.Tr key={guideline.range}>
                  <Table.Td>
                    <Badge color={guideline.color} variant="filled">
                      {guideline.range}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{guideline.label}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{guideline.description}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={2}>
                      {renderStars(
                        Math.ceil(
                          parseInt(guideline.range.split("-")[0] ?? "0") / 2,
                        ),
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Confidence & Data Quality */}
        <Card withBorder>
          <Title order={2} mb="md">
            <Group gap="sm">
              <IconShield size={24} />
              Confidence & Data Quality Assessment
            </Group>
          </Title>

          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Reviewers assess their confidence level based on the quality and
              completeness of application data:
            </Text>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Confidence Level</Table.Th>
                  <Table.Th>Rating</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {confidenceLevels.map((level) => (
                  <Table.Tr key={level.level}>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge variant="light">{level.level}/5</Badge>
                        {renderStars(level.level)}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{level.label}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{level.description}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        {/* Recommendation Types */}
        <Card withBorder>
          <Title order={2} mb="md">
            <Group gap="sm">
              <IconUsers size={24} />
              Final Recommendation Types
            </Group>
          </Title>

          <Grid>
            {recommendationTypes.map((rec) => (
              <Grid.Col key={rec.type} span={{ base: 12, sm: 6 }}>
                <Paper p="md" withBorder radius="md" h="100%">
                  <Stack gap="sm">
                    <Badge color={rec.color} variant="filled" size="lg">
                      {rec.type.replace("_", " ")}
                    </Badge>
                    <Text size="sm">{rec.description}</Text>
                  </Stack>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        </Card>

        {/* Process Flow */}
        <Card withBorder>
          <Title order={2} mb="md">
            <Group gap="sm">
              <IconTarget size={24} />
              Evaluation Process Flow
            </Group>
          </Title>

          <Stack gap="lg">
            <Group>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-blue-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                1
              </Box>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text fw={500}>Initial Review Assignment</Text>
                <Text size="sm" c="dimmed">
                  Applications assigned to qualified reviewers based on
                  expertise
                </Text>
              </Stack>
            </Group>

            <Group>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-green-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                2
              </Box>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text fw={500}>Screening Evaluation</Text>
                <Text size="sm" c="dimmed">
                  Comprehensive assessment using this rubric by qualified
                  reviewers
                </Text>
              </Stack>
            </Group>

            <Group>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-orange-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                3
              </Box>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text fw={500}>Consensus Building</Text>
                <Text size="sm" c="dimmed">
                  Multiple reviewer scores combined using confidence weighting
                </Text>
              </Stack>
            </Group>

            <Group>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-purple-6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                4
              </Box>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text fw={500}>Final Decision</Text>
                <Text size="sm" c="dimmed">
                  Administrative review and final acceptance decisions
                </Text>
              </Stack>
            </Group>
          </Stack>
        </Card>

        {/* Footer Note */}
        <Paper p="md" withBorder radius="md" bg="gray.0">
          <Text size="sm" c="dimmed" ta="center">
            This rubric is designed to ensure fair, consistent, and thorough
            evaluation of all Funding the Commons Residency applicants. For
            questions or clarifications, contact the admin team.
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}
