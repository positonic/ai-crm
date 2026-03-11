"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Badge,
  Button,
  TextInput,
  MultiSelect,
  Select,
  Checkbox,
  Stack,
  Group,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Divider,
} from "@mantine/core";
import {
  IconSearch,
  IconMapPin,
  IconBriefcase,
  IconClock,
  IconHeart,
  IconUserPlus,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconWorld,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { ADMIN_LABELS } from "~/app/_components/AdminFieldsEditor";

interface ProfileFilters {
  search: string;
  skills: string[];
  location: string;
  availableForMentoring: boolean | undefined;
  availableForHiring: boolean | undefined;
  availableForOfficeHours: boolean | undefined;
  // Admin-only filters
  eventId: string | undefined;
  adminLabels: string[];
}

export function ProfilesClient() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "staff";

  const [filters, setFilters] = useState<ProfileFilters>({
    search: "",
    skills: [],
    location: "",
    availableForMentoring: undefined,
    availableForHiring: undefined,
    availableForOfficeHours: undefined,
    eventId: undefined,
    adminLabels: [],
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.profile.getAllMembers.useInfiniteQuery(
      {
        search: filters.search || undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        location: filters.location || undefined,
        availableForMentoring: filters.availableForMentoring,
        availableForHiring: filters.availableForHiring,
        availableForOfficeHours: filters.availableForOfficeHours,
        limit: 20,
        // Admin-only (server ignores these for non-admins)
        eventId: filters.eventId,
        adminLabels:
          filters.adminLabels.length > 0 ? filters.adminLabels : undefined,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const { data: stats } = api.profile.getProfileStats.useQuery();
  const { data: allSkills = [] } = api.profile.getAllSkills.useQuery();
  const { data: events } = api.event.getEvents.useQuery(undefined, {
    enabled: isAdmin,
  });

  const allMembers = data?.pages.flatMap((page) => page.members) ?? [];

  const handleFilterChange = (
    key: keyof ProfileFilters,
    value: string | string[] | boolean | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      skills: [],
      location: "",
      availableForMentoring: undefined,
      availableForHiring: undefined,
      availableForOfficeHours: undefined,
      eventId: undefined,
      adminLabels: [],
    });
  };

  const getSocialIcon = (
    url: string,
    type: "github" | "linkedin" | "twitter" | "website",
  ) => {
    const icons = {
      github: IconBrandGithub,
      linkedin: IconBrandLinkedin,
      twitter: IconBrandTwitter,
      website: IconWorld,
    };
    const Icon = icons[type];
    return (
      <ActionIcon
        component="a"
        href={url}
        target="_blank"
        variant="light"
        size="sm"
        color="blue"
      >
        <Icon size={16} />
      </ActionIcon>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">
            Members Directory
          </Title>
          <Text c="dimmed">
            {stats?.totalProfiles
              ? `${stats.totalProfiles} members`
              : "Discover and connect with community members"}
          </Text>
        </div>
        {session && (
          <Button
            component={Link}
            href="/profile/edit"
            leftSection={<IconUserPlus size={16} />}
          >
            Edit My Profile
          </Button>
        )}
      </Group>

      <Grid gutter="xl">
        {/* Filters Sidebar */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Filters</Text>
              <Button variant="subtle" size="xs" onClick={clearFilters}>
                Clear all
              </Button>
            </Group>

            <Stack gap="md">
              <TextInput
                placeholder="Search members..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />

              <MultiSelect
                label="Skills"
                placeholder="Select skills"
                data={allSkills}
                value={filters.skills}
                onChange={(value) => handleFilterChange("skills", value)}
                searchable
                clearable
              />

              <TextInput
                label="Location"
                placeholder="City, Country"
                leftSection={<IconMapPin size={16} />}
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              />

              <div>
                <Text size="sm" fw={500} mb="xs">
                  Availability
                </Text>
                <Stack gap="xs">
                  <Checkbox
                    label="Available for mentoring"
                    checked={filters.availableForMentoring === true}
                    indeterminate={filters.availableForMentoring === undefined}
                    onChange={(e) =>
                      handleFilterChange(
                        "availableForMentoring",
                        e.target.checked ? true : undefined,
                      )
                    }
                  />
                  <Checkbox
                    label="Available for hiring"
                    checked={filters.availableForHiring === true}
                    indeterminate={filters.availableForHiring === undefined}
                    onChange={(e) =>
                      handleFilterChange(
                        "availableForHiring",
                        e.target.checked ? true : undefined,
                      )
                    }
                  />
                  <Checkbox
                    label="Office hours available"
                    checked={filters.availableForOfficeHours === true}
                    indeterminate={
                      filters.availableForOfficeHours === undefined
                    }
                    onChange={(e) =>
                      handleFilterChange(
                        "availableForOfficeHours",
                        e.target.checked ? true : undefined,
                      )
                    }
                  />
                </Stack>
              </div>

              {isAdmin && (
                <>
                  <Divider
                    my="xs"
                    label="Admin Filters"
                    labelPosition="center"
                  />

                  <Select
                    label="Attended event"
                    placeholder="Any event"
                    data={
                      events?.map((e) => ({ value: e.id, label: e.name })) ?? []
                    }
                    value={filters.eventId ?? null}
                    onChange={(value) =>
                      handleFilterChange("eventId", value ?? undefined)
                    }
                    clearable
                    searchable
                  />

                  <MultiSelect
                    label="Admin labels"
                    placeholder="Any label"
                    data={ADMIN_LABELS.map((l) => l.value)}
                    value={filters.adminLabels}
                    onChange={(value) =>
                      handleFilterChange("adminLabels", value)
                    }
                    searchable
                    clearable
                  />
                </>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Members Grid */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          {isLoading ? (
            <Center h={400}>
              <Loader size="lg" />
            </Center>
          ) : (
            <>
              <Grid>
                {allMembers.map((member) => (
                  <Grid.Col key={member.id} span={{ base: 12, sm: 6, lg: 4 }}>
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      h="100%"
                      component={Link}
                      href={`/profiles/${member.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Card.Section p="lg" pb="xs">
                        <Group gap="sm">
                          <UserAvatar
                            user={{
                              customAvatarUrl: member.profile?.avatarUrl,
                              oauthImageUrl: member.image,
                              name: member.name,
                              email: member.email,
                              firstName: member.firstName,
                              surname: member.surname,
                            }}
                            size="lg"
                            radius="md"
                          />
                          <div style={{ flex: 1 }}>
                            <Text fw={600} size="lg" lineClamp={1}>
                              {member.name ?? "Unnamed User"}
                            </Text>
                            {member.profile?.jobTitle && (
                              <Text size="sm" c="dimmed" lineClamp={1}>
                                {member.profile.jobTitle}
                                {member.profile.company &&
                                  ` at ${member.profile.company}`}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Card.Section>

                      <Card.Section px="lg" pb="xs">
                        {member.profile?.location && (
                          <Group gap={4} mb="xs">
                            <IconMapPin size={14} />
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {member.profile.location}
                            </Text>
                          </Group>
                        )}

                        {member.profile?.bio && (
                          <Text size="sm" lineClamp={3} mb="xs">
                            {member.profile.bio}
                          </Text>
                        )}

                        {member.userSkills && member.userSkills.length > 0 && (
                          <Group gap={4} mb="xs">
                            {member.userSkills.slice(0, 3).map((userSkill) => (
                              <Badge
                                key={userSkill.id}
                                size="xs"
                                variant="light"
                              >
                                {userSkill.skill.name}
                              </Badge>
                            ))}
                            {member.userSkills.length > 3 && (
                              <Badge size="xs" variant="outline" color="gray">
                                +{member.userSkills.length - 3}
                              </Badge>
                            )}
                          </Group>
                        )}

                        {isAdmin &&
                          "adminLabels" in member &&
                          Array.isArray(member.adminLabels) &&
                          member.adminLabels.length > 0 && (
                            <Group gap={4} mb="xs">
                              {(member.adminLabels as string[])
                                .slice(0, 3)
                                .map((label) => (
                                  <Badge
                                    key={label}
                                    size="xs"
                                    variant="dot"
                                    color="violet"
                                  >
                                    {label}
                                  </Badge>
                                ))}
                              {member.adminLabels.length > 3 && (
                                <Badge
                                  size="xs"
                                  variant="outline"
                                  color="violet"
                                >
                                  +{member.adminLabels.length - 3}
                                </Badge>
                              )}
                            </Group>
                          )}
                      </Card.Section>

                      <Card.Section px="lg" pb="lg">
                        <Group justify="space-between" align="flex-end" h={40}>
                          <Group gap={4}>
                            {member.profile?.availableForMentoring && (
                              <Tooltip label="Available for mentoring">
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="green"
                                  leftSection={<IconHeart size={10} />}
                                >
                                  Mentor
                                </Badge>
                              </Tooltip>
                            )}
                            {member.profile?.availableForHiring && (
                              <Tooltip label="Available for hiring">
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="blue"
                                  leftSection={<IconBriefcase size={10} />}
                                >
                                  Hiring
                                </Badge>
                              </Tooltip>
                            )}
                            {member.profile?.availableForOfficeHours && (
                              <Tooltip label="Office hours available">
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="orange"
                                  leftSection={<IconClock size={10} />}
                                >
                                  Office Hours
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>

                          <Group gap={4}>
                            {member.profile?.githubUrl &&
                              getSocialIcon(member.profile.githubUrl, "github")}
                            {member.profile?.linkedinUrl &&
                              getSocialIcon(
                                member.profile.linkedinUrl,
                                "linkedin",
                              )}
                            {member.profile?.twitterUrl &&
                              getSocialIcon(
                                member.profile.twitterUrl,
                                "twitter",
                              )}
                            {member.profile?.website &&
                              getSocialIcon(member.profile.website, "website")}
                          </Group>
                        </Group>
                      </Card.Section>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {hasNextPage && (
                <Center mt="xl">
                  <Button
                    onClick={() => fetchNextPage()}
                    loading={isFetchingNextPage}
                    variant="light"
                  >
                    Load More
                  </Button>
                </Center>
              )}

              {allMembers.length === 0 && !isLoading && (
                <Center h={200}>
                  <Stack align="center" gap="sm">
                    <Text size="lg" c="dimmed">
                      No members found
                    </Text>
                    <Text size="sm" c="dimmed">
                      Try adjusting your search filters
                    </Text>
                  </Stack>
                </Center>
              )}
            </>
          )}
        </Grid.Col>
      </Grid>
    </Container>
  );
}
