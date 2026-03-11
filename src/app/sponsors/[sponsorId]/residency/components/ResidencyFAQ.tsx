"use client";

import React from "react";
import {
  Card,
  Stack,
  Title,
  Text,
  Accordion,
  ThemeIcon,
  Group,
  List,
  Alert,
} from "@mantine/core";
import {
  IconQuestionMark,
  IconClock,
  IconUsers,
  IconMapPin,
  IconInfoCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

const faqData = [
  {
    id: "onsite-support",
    icon: IconMapPin,
    color: "blue",
    question:
      "How much onsite support is required during the Builder Residency?",
    answer: (
      <Stack gap="sm">
        <Text>
          The more time that mentors can spend on-site the better. We suggest
          that you send at least one mentor to be on-site for at least 4-7 days,
          and we are happy to host more than one mentor from your organization
          at different times during the residency (non-overlapping dates).
        </Text>
        <Text>
          This onsite presence adds significant value through direct interaction
          with builders, immediate problem-solving support, and relationship
          building that enhances the long-term impact of the program.
        </Text>
      </Stack>
    ),
  },
  {
    id: "rotation-schedule",
    icon: IconClock,
    color: "green",
    question:
      "What is the rotation schedule for the onsite team during the month-long Builder Residency?",
    answer: (
      <Stack gap="sm">
        <Text>
          The Residency is designed to be lightweight for partners — most of the
          mentoring and technical guidance can be provided virtually. That said,
          having some onsite presence adds significant value:
        </Text>
        <List spacing="sm">
          <List.Item>
            <Text fw={500}>Kick-off / Opening Week (1–2 days):</Text>
            <Text size="sm">
              A representative joining at the start to run a workshop or give a
              keynote helps residents understand your vision and available
              tooling right from day one.
            </Text>
          </List.Item>
          <List.Item>
            <Text fw={500}>Mentorship Touchpoints:</Text>
            <Text size="sm">
              Beyond the kick-off, ongoing support can be provided remotely
              (office hours, async feedback, resource sharing). Residents
              primarily need responsiveness, not full-time onsite presence.
            </Text>
          </List.Item>
          <List.Item>
            <Text fw={500}>Final Showcase / Demo Day (1 day):</Text>
            <Text size="sm">
              It would be powerful to have a team member present for the
              Residency showcase. This ensures builders can pitch directly to
              ecosystem stakeholders and feel connected to next-step
              opportunities.
            </Text>
          </List.Item>
        </List>
        <Text>
          <Text fw={500} span>
            In summary:
          </Text>{" "}
          Onsite presence is optional, but if you can send someone for the
          kick-off and/or the showcase, that would be ideal. All other mentoring
          and technical support can be handled virtually.
        </Text>
      </Stack>
    ),
  },
  {
    id: "team-commitment",
    icon: IconUsers,
    color: "violet",
    question:
      "Do we need to commit one person end-to-end for the Residency, or will there be multiple touchpoints?",
    answer: (
      <Stack gap="sm">
        <Text>
          From the FTC side, we&apos;ll provide consistent support across the
          full Residency (program curation, logistics, facilitation). What
          we&apos;d ask from your organization is:
        </Text>
        <List spacing="sm">
          <List.Item>
            <Text fw={500}>A clear point of contact</Text> — ideally one primary
            team member who serves as the &quot;anchor&quot; for the Residency,
            so builders always know who to go to with technical or program
            questions.
          </List.Item>
          <List.Item>
            <Text fw={500}>Additional contributors as needed</Text> — other
            colleagues can drop in for workshops, mentoring, or the showcase.
            These can be distributed across your team depending on expertise.
          </List.Item>
        </List>
        <Text>
          <Text fw={500} span>
            In short:
          </Text>{" "}
          We don&apos;t expect one person to carry the whole Residency
          end-to-end, but having a single named lead ensures continuity, while
          others can plug in at key moments.
        </Text>
      </Stack>
    ),
  },
  {
    id: "virtual-vs-onsite",
    icon: IconQuestionMark,
    color: "orange",
    question: "Can mentorship be provided remotely?",
    answer: (
      <Stack gap="sm">
        <Text>
          Yes, absolutely! Most mentorship and technical guidance can be
          provided virtually through:
        </Text>
        <List spacing="sm">
          <List.Item>Virtual office hours and one-on-one sessions</List.Item>
          <List.Item>Online workshops and technical deep-dives</List.Item>
          <List.Item>Asynchronous feedback on code and prototypes</List.Item>
          <List.Item>Resource sharing and documentation</List.Item>
          <List.Item>Virtual participation in demo sessions</List.Item>
        </List>
        <Text>
          Onsite presence enhances the experience but isn&apos;t required for
          the full duration. The key is responsiveness and availability when
          builders need guidance during critical development phases.
        </Text>
      </Stack>
    ),
  },
  {
    id: "support-expectations",
    icon: IconInfoCircle,
    color: "teal",
    question: "What kind of support do builders typically need?",
    answer: (
      <Stack gap="sm">
        <Text>Residents often need very practical support while building:</Text>
        <List spacing="sm">
          <List.Item>Code snippets and starter templates</List.Item>
          <List.Item>
            Example integrations and reference implementations
          </List.Item>
          <List.Item>Technical troubleshooting and debugging help</List.Item>
          <List.Item>Architecture guidance for specific use cases</List.Item>
          <List.Item>Connections to relevant developer communities</List.Item>
          <List.Item>
            Pathway guidance for post-residency opportunities
          </List.Item>
        </List>
        <Text>
          This accelerates residents&apos; ability to produce something tangible
          within the three-week timeframe while building meaningful connections
          to your ecosystem.
        </Text>
      </Stack>
    ),
  },
];

export default function ResidencyFAQ() {
  const { data: config } = api.config.getPublicConfig.useQuery();
  return (
    <Card withBorder radius="md" p="xl">
      <Stack gap="lg">
        <Title order={3}>Frequently Asked Questions</Title>

        <Text>
          Common questions about sponsor involvement in the Builder Residency
          program.
        </Text>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          Have a question not covered here? Contact our team at{" "}
          <Text
            component="a"
            href={`mailto:${config?.adminEmail ?? ""}`}
            fw={500}
          >
            {config?.adminEmail ?? ""}
          </Text>
        </Alert>

        <Accordion variant="separated" radius="md">
          {faqData.map((faq) => (
            <Accordion.Item key={faq.id} value={faq.id}>
              <Accordion.Control>
                <Group gap="md">
                  <ThemeIcon size="md" color={faq.color} variant="light">
                    <faq.icon size={16} />
                  </ThemeIcon>
                  <Text fw={500}>{faq.question}</Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md" pl="xl">
                  {faq.answer}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Card>
  );
}
