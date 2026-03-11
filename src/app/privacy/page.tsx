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

export default function PrivacyPolicy() {
  const { data: config } = api.config.getPublicConfig.useQuery();
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Stack gap="md" ta="center">
          <Title order={1}>Privacy Policy</Title>
          <Text c="dimmed">
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </Stack>

        <Paper p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <section>
              <Title order={2} size="h3" mb="md">
                Introduction
              </Title>
              <Text>
                Funding the Commons (&quot;we,&quot; &quot;our,&quot; or
                &quot;us&quot;) is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you visit our application.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Information We Collect
              </Title>
              <Text mb="sm">
                We may collect information about you in a variety of ways:
              </Text>

              <Title order={3} size="h4" mb="xs">
                Personal Data
              </Title>
              <Text mb="md">
                When you register for an account or use our services, we may ask
                for personal information such as:
              </Text>
              <List>
                <List.Item>Name and email address</List.Item>
                <List.Item>Company information and job title</List.Item>
                <List.Item>Profile information you choose to provide</List.Item>
                <List.Item>Event application and participation data</List.Item>
              </List>

              <Title order={3} size="h4" mb="xs" mt="md">
                OAuth Information
              </Title>
              <Text>
                When you sign in using third-party services (Google, Discord),
                we collect basic profile information including your name, email
                address, and profile picture as provided by those services.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                How We Use Your Information
              </Title>
              <Text mb="sm">We use the information we collect to:</Text>
              <List>
                <List.Item>
                  Provide, operate, and maintain our services
                </List.Item>
                <List.Item>
                  Process event applications and manage registrations
                </List.Item>
                <List.Item>
                  Communicate with you about events, updates, and administrative
                  matters
                </List.Item>
                <List.Item>Improve our services and user experience</List.Item>
                <List.Item>
                  Send periodic emails regarding events or other products and
                  services
                </List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Information Sharing
              </Title>
              <Text>
                We do not sell, trade, or rent your personal information to
                third parties. We may share your information in the following
                situations:
              </Text>
              <List mt="sm">
                <List.Item>With your explicit consent</List.Item>
                <List.Item>To comply with legal obligations</List.Item>
                <List.Item>
                  To protect and defend our rights and property
                </List.Item>
                <List.Item>
                  With trusted service providers who assist in operating our
                  platform
                </List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Data Security
              </Title>
              <Text>
                We use administrative, technical, and physical security measures
                to help protect your personal information. While we have taken
                reasonable steps to secure the personal information you provide
                to us, please be aware that no security measures are perfect or
                impenetrable.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Third-Party Services
              </Title>
              <Text>
                Our application may contain links to third-party websites and
                services, including authentication providers like Google and
                Discord. We are not responsible for the privacy practices or
                content of these third-party services.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Your Rights
              </Title>
              <Text mb="sm">You have the right to:</Text>
              <List>
                <List.Item>
                  Access, update, or delete your personal information
                </List.Item>
                <List.Item>Opt-out of marketing communications</List.Item>
                <List.Item>Request a copy of your data</List.Item>
                <List.Item>Withdraw consent where applicable</List.Item>
              </List>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Changes to This Privacy Policy
              </Title>
              <Text>
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the &quot;Last updated&quot; date.
              </Text>
            </section>

            <section>
              <Title order={2} size="h3" mb="md">
                Contact Us
              </Title>
              <Text>
                If you have any questions about this Privacy Policy, please
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
