"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  List,
  Anchor,
} from "@mantine/core";
import { api } from "~/trpc/react";

export default function TermsOfService() {
  const { data: config } = api.config.getPublicConfig.useQuery();
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap="md" ta="center">
          <Title order={1}>Terms of Service</Title>
          <Text c="dimmed">
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </Stack>

        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <section>
              <Title order={2} size="h3" mb="md">
                Acceptance of Terms
              </Title>
              <Text>
                By accessing and using the Funding the Commons platform
                (&quot;Service&quot;), you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to
                abide by the above, please do not use this service.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Description of Service
              </Title>
              <Text>
                Funding the Commons provides a platform for managing events,
                applications, and community engagement related to public goods
                funding and governance. Our services include event registration,
                application management, and community coordination tools.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                User Accounts
              </Title>
              <Text mb="sm">When creating an account, you agree to:</Text>
              <List>
                <List.Item>
                  Provide accurate, current, and complete information
                </List.Item>
                <List.Item>
                  Maintain the security of your password and account
                </List.Item>
                <List.Item>
                  Accept responsibility for all activities under your account
                </List.Item>
                <List.Item>
                  Notify us immediately of any unauthorized use of your account
                </List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Acceptable Use
              </Title>
              <Text mb="sm">You agree not to use the Service to:</Text>
              <List>
                <List.Item>
                  Upload, post, or transmit any unlawful, harmful, or
                  inappropriate content
                </List.Item>
                <List.Item>
                  Impersonate any person or entity or misrepresent your
                  affiliation
                </List.Item>
                <List.Item>
                  Interfere with or disrupt the Service or servers
                </List.Item>
                <List.Item>
                  Attempt to gain unauthorized access to any part of the Service
                </List.Item>
                <List.Item>
                  Use the Service for any commercial purposes without permission
                </List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Event Applications and Participation
              </Title>
              <Text>
                By submitting applications for events through our platform, you
                understand that:
              </Text>
              <List mt="sm">
                <List.Item>
                  Applications are subject to review and approval by event
                  organizers
                </List.Item>
                <List.Item>
                  Event details, dates, and requirements may be subject to
                  change
                </List.Item>
                <List.Item>
                  Participation in events may be subject to additional terms and
                  conditions
                </List.Item>
                <List.Item>
                  We reserve the right to reject applications that do not meet
                  event criteria
                </List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Intellectual Property
              </Title>
              <Text>
                The Service and its original content, features, and
                functionality are owned by Funding the Commons and are protected
                by international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Privacy
              </Title>
              <Text>
                Your privacy is important to us. Please review our Privacy
                Policy, which also governs your use of the Service, to
                understand our practices. Our Privacy Policy is available at:{" "}
                <Anchor href="/privacy">ftc-commons.vercel.app/privacy</Anchor>
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Limitation of Liability
              </Title>
              <Text>
                In no event shall Funding the Commons be liable for any
                indirect, incidental, special, consequential, or punitive
                damages, including without limitation, loss of profits, data,
                use, goodwill, or other intangible losses, resulting from your
                use of the Service.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Disclaimer
              </Title>
              <Text>
                The information on this Service is provided on an &quot;as
                is&quot; basis. To the fullest extent permitted by law, this
                Company excludes all representations, warranties, conditions and
                terms relating to this Service.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Termination
              </Title>
              <Text>
                We may terminate or suspend your account and bar access to the
                Service immediately, without prior notice or liability, under
                our sole discretion, for any reason whatsoever and without
                limitation, including but not limited to a breach of the Terms.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Changes to Terms
              </Title>
              <Text>
                We reserve the right to modify these terms at any time. We will
                notify users of any changes by posting the new Terms of Service
                on this page and updating the &quot;Last updated&quot; date.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Governing Law
              </Title>
              <Text>
                These Terms shall be interpreted and governed by the laws of the
                jurisdiction in which Funding the Commons operates, without
                regard to its conflict of law provisions.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Contact Information
              </Title>
              <Text>
                If you have any questions about these Terms of Service, please
                contact us at:{" "}
                <Anchor href={`mailto:${config?.adminEmail ?? ""}`}>
                  {config?.adminEmail ?? ""}
                </Anchor>
              </Text>
            </section>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
