"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Box,
  ThemeIcon,
  Badge,
  Divider,
  Anchor,
  List,
} from "@mantine/core";
import {
  IconUsers,
  IconWorld,
  IconSparkles,
  IconVideo,
  IconPhoto,
  IconMicrophone,
  IconBrandX,
  IconBrandLinkedin,
  IconPlayerPlay,
  IconMapPin,
  IconCalendar,
  IconTrendingUp,
} from "@tabler/icons-react";

export default function BuenosAiresImpactReport() {
  const stats = [
    {
      value: "305",
      label: "Attendees",
      subtitle: "60% show rate",
      icon: IconUsers,
      color: "violet",
    },
    {
      value: "45+",
      label: "Countries",
      subtitle: "41% Global South",
      icon: IconWorld,
      color: "blue",
    },
    {
      value: "65%",
      label: "First-Timers",
      subtitle: "new to FtC",
      icon: IconSparkles,
      color: "pink",
    },
    {
      value: "502",
      label: "Total Reach",
      subtitle: "in-person + livestream",
      icon: IconTrendingUp,
      color: "teal",
    },
  ];

  const socialStats = [
    {
      platform: "Twitter/X",
      impressions: "102k",
      engagement: "5.3%",
      followers: "+268",
      icon: IconBrandX,
      color: "blue",
    },
    {
      platform: "LinkedIn",
      impressions: "13.3k",
      engagement: "6.6%",
      followers: "+114",
      icon: IconBrandLinkedin,
      color: "cyan",
    },
    {
      platform: "Livestream",
      viewers: "197",
      subtitle: "real-time engagement",
      icon: IconPlayerPlay,
      color: "pink",
    },
  ];

  const contentAssets = [
    { count: 21, label: "session recordings", icon: IconVideo },
    { count: 6, label: "long-form interviews", icon: IconMicrophone },
    { count: "100+", label: "photos", icon: IconPhoto },
    { count: 18, label: "video clips", icon: IconPlayerPlay },
  ];

  const geographicDistribution = [
    { region: "LATAM", percentage: 31 },
    { region: "Europe", percentage: 25 },
    { region: "North America", percentage: 18 },
    { region: "Asia", percentage: 7 },
    { region: "Africa", percentage: 3 },
    { region: "Other", percentage: 16 },
  ];

  const attendeeProfile = [
    { role: "Builders", percentage: 59 },
    { role: "Researchers", percentage: 23 },
    { role: "Funders", percentage: 19 },
  ];

  const investmentBreakdown = [
    { category: "Staff & Travel", percentage: 35, color: "violet" },
    { category: "Content & Marketing", percentage: 23, color: "blue" },
    { category: "Design & Production", percentage: 12, color: "cyan" },
    { category: "Food & Hospitality", percentage: 12, color: "teal" },
    { category: "Venue", percentage: 9, color: "pink" },
    { category: "Other", percentage: 8, color: "gray" },
  ];

  const sponsors = [
    { name: "Protocol Labs", url: "https://protocol.ai" },
    { name: "Stellar Development Foundation", url: "https://stellar.org" },
    { name: "Octant", url: "https://octant.app" },
    { name: "human.tech by Holonym", url: "https://holonym.id" },
    { name: "Drips", url: "https://drips.network" },
    { name: "Gitcoin", url: "https://gitcoin.co" },
    { name: "Logos", url: "https://logos.co" },
    { name: "GoodDollar", url: "https://gooddollar.org" },
    { name: "Ethereum for the World", url: "https://ethereum.foundation" },
    {
      name: "Ethereum Ecosystem Support Program",
      url: "https://esp.ethereum.foundation",
    },
  ];

  const partners = [
    { name: "Deep Work", url: "https://deepwork.studio" },
    { name: "Crecimiento", url: "#" },
    { name: "Tor Project", url: "https://torproject.org" },
    {
      name: "UNICEF Office of Innovation",
      url: "https://unicef.org/innovation",
    },
    { name: "UNDP AltFinLab", url: "https://undp.org" },
    { name: "SEED Latam", url: "https://seedlatam.org" },
    { name: "BAF", url: "#" },
  ];

  return (
    <Box className="bg-theme-gradient" style={{ minHeight: "100vh" }}>
      <Container size="xl" py={60}>
        {/* Header Section */}
        <Stack gap="xl" mb={60}>
          <Box>
            <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
              Impact Report
            </Text>
            <Title
              order={1}
              size={56}
              fw={900}
              mb="md"
              style={{ lineHeight: 1.1 }}
            >
              Funding the Commons
            </Title>
            <Group gap="md" align="center">
              <Title order={2} size={32} fw={600} c="dimmed">
                Buenos Aires 2025
              </Title>
              <Badge
                size="lg"
                variant="light"
                color="blue"
                leftSection={<IconMapPin size={14} />}
              >
                Argentina
              </Badge>
              <Badge
                size="lg"
                variant="light"
                color="violet"
                leftSection={<IconCalendar size={14} />}
              >
                DevConnect Week
              </Badge>
            </Group>
          </Box>

          {/* Key Stats Grid */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {stats.map((stat, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-${stat.color}-0) 0%, var(--mantine-color-${stat.color}-1) 100%)`,
                  border: `2px solid var(--mantine-color-${stat.color}-2)`,
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color={stat.color}
                    >
                      <stat.icon size={28} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text size="3xl" fw={900} lh={1} c={stat.color}>
                      {stat.value}
                    </Text>
                    <Text size="sm" fw={600} mt={8}>
                      {stat.label}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {stat.subtitle}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Description */}
          <Paper p="xl" radius="lg" withBorder>
            <Text size="lg" fw={500} style={{ lineHeight: 1.6 }}>
              A single-day conference on public goods funding, financial access,
              and privacy—grounded in the Argentinian context. Co-produced with
              Schelling Point during DevConnect week. Our highest single-day
              attendance to date.
            </Text>
          </Paper>
        </Stack>

        {/* Who Was In The Room */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Who Was In The Room
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Geographic Distribution */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="xl">
                Geographic Distribution
              </Title>
              <Stack gap="md">
                {geographicDistribution.map((item) => (
                  <Box key={item.region}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        {item.region}
                      </Text>
                      <Text size="sm" fw={700} c="blue">
                        {item.percentage}%
                      </Text>
                    </Group>
                    <Box
                      style={{
                        height: 8,
                        backgroundColor: "var(--mantine-color-gray-2)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          height: "100%",
                          width: `${item.percentage}%`,
                          background:
                            "linear-gradient(90deg, var(--mantine-color-blue-5), var(--mantine-color-violet-5))",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* Attendee Profile */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="xl">
                Attendee Profile
              </Title>
              <Stack gap="md">
                {attendeeProfile.map((item) => (
                  <Box key={item.role}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        {item.role}
                      </Text>
                      <Text size="sm" fw={700} c="pink">
                        {item.percentage}%
                      </Text>
                    </Group>
                    <Box
                      style={{
                        height: 8,
                        backgroundColor: "var(--mantine-color-gray-2)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          height: "100%",
                          width: `${item.percentage}%`,
                          background:
                            "linear-gradient(90deg, var(--mantine-color-pink-5), var(--mantine-color-orange-5))",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
                <Divider my="md" />
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    <strong>Sectors:</strong> Web3 (63%), Tech (11%), Nonprofit
                    (9%), Finance (3%), Academia (3%)
                  </Text>
                  <Text size="sm" fw={600}>
                    <strong>Age:</strong> 83% between 25-44 years old
                  </Text>
                </Stack>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Reach Beyond The Room */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Reach Beyond The Room
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            {socialStats.map((stat, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-${stat.color}-0) 0%, var(--mantine-color-${stat.color}-1) 100%)`,
                  border: `2px solid var(--mantine-color-${stat.color}-2)`,
                }}
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="lg" fw={700}>
                      {stat.platform}
                    </Text>
                    <ThemeIcon
                      size={36}
                      radius="md"
                      variant="light"
                      color={stat.color}
                    >
                      <stat.icon size={20} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text size="2xl" fw={900} c={stat.color}>
                      {stat.impressions ?? stat.viewers}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {stat.impressions ? "impressions" : "viewers"}
                    </Text>
                  </Box>
                  {stat.engagement && (
                    <Group gap="xl">
                      <Box>
                        <Text size="sm" fw={600}>
                          {stat.engagement}
                        </Text>
                        <Text size="xs" c="dimmed">
                          engagement
                        </Text>
                      </Box>
                      <Box>
                        <Text size="sm" fw={600}>
                          {stat.followers}
                        </Text>
                        <Text size="xs" c="dimmed">
                          followers
                        </Text>
                      </Box>
                    </Group>
                  )}
                  {stat.subtitle && (
                    <Text size="sm" c="dimmed">
                      {stat.subtitle}
                    </Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Viral Moment */}
          <Paper
            p="xl"
            radius="lg"
            style={{
              background:
                "linear-gradient(135deg, var(--mantine-color-grape-0) 0%, var(--mantine-color-violet-0) 100%)",
              border: "2px solid var(--mantine-color-grape-3)",
            }}
          >
            <Badge
              size="lg"
              variant="filled"
              color="grape"
              mb="md"
              leftSection={<IconSparkles size={14} />}
            >
              Viral Moment
            </Badge>
            <Text size="lg" fw={600} mb="sm">
              134.7K views, 1K likes, 117 reposts on a single community post
            </Text>
            <Text size="md" fs="italic" style={{ lineHeight: 1.6 }}>
              &ldquo;If I did not go to an in-person event for one and a half
              years and I only read Twitter every day... that would almost
              certainly lead me to rage quit and retire.&rdquo;
            </Text>
            <Text size="sm" c="dimmed" mt="sm">
              — Vitalik Buterin, on stage with Roger Dingledine
            </Text>
          </Paper>
        </Stack>

        {/* Content Assets */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Content Assets Captured
          </Title>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            {contentAssets.map((asset, index) => (
              <Paper
                key={index}
                p="lg"
                radius="md"
                withBorder
                style={{
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md" align="center">
                  <ThemeIcon size={56} radius="md" variant="light" color="blue">
                    <asset.icon size={32} />
                  </ThemeIcon>
                  <Box style={{ textAlign: "center" }}>
                    <Text size="2xl" fw={900} c="blue">
                      {asset.count}
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      {asset.label}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          <Paper p="md" radius="md" withBorder>
            <Text size="sm" c="dimmed">
              <strong>Interviews include:</strong> Roger Dingledine (Tor),
              Jarrad Hope (Logos)
            </Text>
          </Paper>
        </Stack>

        {/* What Resonated */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            What Resonated
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Programming Wins */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="lg">
                Programming Wins
              </Title>
              <List spacing="md" size="sm">
                <List.Item>
                  <Text fw={600}>FtC stage debuts:</Text> Vitalik Buterin and
                  Roger Dingledine (Tor)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Cross-ecosystem dialogue:</Text> bridged web3,
                  open source, and privacy communities
                </List.Item>
                <List.Item>
                  <Text fw={600}>Local relevance:</Text> Argentine judge
                  presented a live decentralized arbitration pilot
                </List.Item>
                <List.Item>
                  <Text fw={600}>High dwell time:</Text> most stayed 4+ hours
                </List.Item>
              </List>
            </Paper>

            {/* Accessibility Model */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="lg">
                Accessibility Model
              </Title>
              <List spacing="md" size="sm">
                <List.Item>
                  <Text fw={600}>67% free/discounted tickets</Text> via
                  community promo codes
                </List.Item>
                <List.Item>
                  <Text fw={600}>$40 standard, $20 local</Text>—set for local
                  affordability
                </List.Item>
                <List.Item>
                  <Text fw={600}>Ticketing drove quality:</Text> 60% show rate
                  vs ~10% for free events
                </List.Item>
                <List.Item>
                  <Text fw={600}>Reduced waste:</Text> accurate catering from
                  committed registrations
                </List.Item>
              </List>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Investment */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Investment
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Total Investment */}
            <Paper
              p="xl"
              radius="lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--mantine-color-teal-0) 0%, var(--mantine-color-cyan-0) 100%)",
                border: "2px solid var(--mantine-color-teal-3)",
              }}
            >
              <Stack gap="lg">
                <Box>
                  <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
                    Total Investment
                  </Text>
                  <Text size="4xl" fw={900} c="teal">
                    $71,097
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
                    Cost per Attendee
                  </Text>
                  <Text size="3xl" fw={900} c="cyan">
                    $233
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    Industry benchmark: $500–$3,000+
                  </Text>
                </Box>
                <Text size="sm" c="dimmed" mt="md">
                  Includes: full-day programming, meals, swag, video production,
                  VIP dinner
                </Text>
              </Stack>
            </Paper>

            {/* Investment Breakdown */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="xl">
                Investment Breakdown
              </Title>
              <Stack gap="md">
                {investmentBreakdown.map((item) => (
                  <Box key={item.category}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        {item.category}
                      </Text>
                      <Text size="sm" fw={700} c={item.color}>
                        {item.percentage}%
                      </Text>
                    </Group>
                    <Box
                      style={{
                        height: 10,
                        backgroundColor: "var(--mantine-color-gray-2)",
                        borderRadius: 5,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          height: "100%",
                          width: `${item.percentage}%`,
                          backgroundColor: `var(--mantine-color-${item.color}-5)`,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* What We're Improving */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            What We&apos;re Improving
          </Title>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Lessons from BA */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="lg">
                Lessons from BA
              </Title>
              <List spacing="md" size="sm">
                <List.Item>
                  Single-day format harder to balance sponsor vs. community
                  stage time
                </List.Item>
                <List.Item>
                  20+ competing events despite early announcements
                </List.Item>
                <List.Item>
                  Wayfinding gaps in a complex venue interior
                </List.Item>
                <List.Item>
                  Local infrastructure (A/V, internet) needs more buffer
                </List.Item>
              </List>
            </Paper>

            {/* Commitments for 2026 */}
            <Paper p="xl" radius="lg" withBorder>
              <Title order={3} size={20} fw={600} mb="lg">
                Commitments for 2026
              </Title>
              <List spacing="md" size="sm">
                <List.Item>
                  Schedule before or after main conference week
                </List.Item>
                <List.Item>
                  Advance venue scout + analog schedule backups
                </List.Item>
                <List.Item>
                  Amplify workshop space, add dedicated coworking with an office
                  hours section
                </List.Item>
                <List.Item>Hands-on experiences: DIY swag, PGF games</List.Item>
              </List>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Thank You Section */}
        <Paper
          p={60}
          radius="lg"
          mb={60}
          style={{
            background:
              "linear-gradient(135deg, var(--mantine-color-indigo-6) 0%, var(--mantine-color-violet-6) 100%)",
          }}
        >
          <Stack gap="lg">
            <Title order={2} size={36} fw={700} c="white">
              Thank You
            </Title>
            <Text size="lg" c="white" style={{ lineHeight: 1.6 }}>
              This event was made possible by our sponsors, speakers, and the
              FtC community. Argentina during DevConnect was the right context
              to ground public goods funding in real-world narratives—and
              we&apos;re committed to maintaining momentum here.
            </Text>
            <Group gap="xl" mt="md">
              <Anchor
                href="https://fundingthecommons.io/ba2025"
                target="_blank"
                c="white"
                fw={600}
                size="lg"
              >
                Event page: fundingthecommons.io/ba2025
              </Anchor>
              <Anchor
                href="https://x.com/Mariana0ka/status/1991875318756381041"
                target="_blank"
                c="white"
                fw={600}
                size="lg"
              >
                Viral post →
              </Anchor>
            </Group>
          </Stack>
        </Paper>

        {/* Sponsors & Partners */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" mb={60}>
          {/* Sponsors */}
          <Paper p="xl" radius="lg" withBorder>
            <Title order={3} size={24} fw={700} mb="lg">
              Sponsors ({sponsors.length})
            </Title>
            <List spacing="sm">
              {sponsors.map((sponsor) => (
                <List.Item key={sponsor.name}>
                  <Anchor href={sponsor.url} target="_blank" size="sm">
                    {sponsor.name}
                  </Anchor>
                </List.Item>
              ))}
            </List>
          </Paper>

          {/* Partners */}
          <Paper p="xl" radius="lg" withBorder>
            <Title order={3} size={24} fw={700} mb="lg">
              Partners ({partners.length})
            </Title>
            <List spacing="sm">
              {partners.map((partner) => (
                <List.Item key={partner.name}>
                  <Anchor href={partner.url} target="_blank" size="sm">
                    {partner.name}
                  </Anchor>
                </List.Item>
              ))}
            </List>
          </Paper>
        </SimpleGrid>

        {/* Custom Styles */}
        <style jsx>{`
          :global(.hover-lift) {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          :global(.hover-lift:hover) {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }
        `}</style>
      </Container>
    </Box>
  );
}
