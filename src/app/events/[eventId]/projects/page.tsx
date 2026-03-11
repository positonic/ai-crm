"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Container,
  Title,
  Text,
  Stack,
  Grid,
  Card,
  Group,
  Badge,
  Avatar,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Image,
} from "@mantine/core";
import { IconExternalLink, IconBrandGithub } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";
import { LikeButton } from "~/app/_components/LikeButton";
import { getPrimaryRepoUrl } from "~/utils/project";

interface ProjectsPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ProjectsPage({ params }: ProjectsPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const { data: session, status } = useSession();

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  // Get resident projects
  const { data: residentProjects, isLoading: projectsLoading } =
    api.application.getResidentProjects.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  if (status === "loading" || eventLoading || projectsLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container size="lg" py="xl">
        <Title order={1}>Event Not Found</Title>
        <Text c="dimmed">
          The event you&apos;re looking for doesn&apos;t exist.
        </Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1} mb="xs">
            Participant Projects
          </Title>
          <Text c="dimmed">
            Explore projects created by event participants.
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              All Projects
            </Text>
            <Badge variant="light" size="lg">
              {residentProjects?.length ?? 0} projects
            </Badge>
          </Group>

          {residentProjects && residentProjects.length > 0 ? (
            <Grid>
              {residentProjects.map((project) => (
                <Grid.Col key={project.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    shadow="xs"
                    padding="md"
                    radius="md"
                    withBorder
                    h="100%"
                    component={Link}
                    href={`/projects/${project.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <Stack gap="xs">
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                      >
                        <Group
                          gap="xs"
                          wrap="nowrap"
                          style={{ minWidth: 0, flex: 1 }}
                        >
                          {project.imageUrl ? (
                            <Image
                              src={project.imageUrl}
                              alt={project.title}
                              w={24}
                              h={24}
                              radius="sm"
                              fit="contain"
                              style={{ flexShrink: 0 }}
                            />
                          ) : (
                            <Avatar
                              size={24}
                              radius="sm"
                              color={
                                [
                                  "blue",
                                  "cyan",
                                  "grape",
                                  "green",
                                  "indigo",
                                  "orange",
                                  "pink",
                                  "teal",
                                  "violet",
                                ][project.id.charCodeAt(0) % 9]
                              }
                              style={{ flexShrink: 0 }}
                            >
                              {project.title.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                          <Text
                            fw={500}
                            size="sm"
                            lineClamp={1}
                            style={{ minWidth: 0 }}
                          >
                            {project.title}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          {project.liveUrl && (
                            <Tooltip label="View Demo">
                              <ActionIcon
                                variant="light"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(project.liveUrl!, "_blank");
                                }}
                              >
                                <IconExternalLink size={12} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {getPrimaryRepoUrl(project) && (
                            <Tooltip label="View Source">
                              <ActionIcon
                                variant="light"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    getPrimaryRepoUrl(project)!,
                                    "_blank",
                                  );
                                }}
                              >
                                <IconBrandGithub size={12} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>

                      {project.description && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {project.description}
                        </Text>
                      )}

                      {project.technologies.length > 0 && (
                        <Group gap="xs">
                          {project.technologies.slice(0, 2).map((tech) => (
                            <Badge key={tech} size="xs" variant="outline">
                              {tech}
                            </Badge>
                          ))}
                          {project.technologies.length > 2 && (
                            <Badge size="xs" variant="outline" color="gray">
                              +{project.technologies.length - 2}
                            </Badge>
                          )}
                        </Group>
                      )}

                      <div onClick={(e) => e.stopPropagation()}>
                        <LikeButton
                          updateId={project.id}
                          initialLikeCount={project.likes.length}
                          initialHasLiked={
                            session?.user
                              ? project.likes.some(
                                  (like) => like.userId === session.user.id,
                                )
                              : false
                          }
                          userId={session?.user.id}
                          likeType="userProject"
                        />
                      </div>

                      <Group gap="xs" mt="auto">
                        <Avatar
                          src={getAvatarUrl({
                            customAvatarUrl: project.profile.avatarUrl,
                            oauthImageUrl: project.profile.user?.image,
                            name: project.profile.user?.name,
                            email: project.profile.user?.email,
                          })}
                          size="xs"
                          radius="xl"
                        >
                          {getAvatarInitials({
                            name: project.profile.user?.name,
                            email: project.profile.user?.email,
                          })}
                        </Avatar>
                        <Text size="xs" c="dimmed">
                          {getDisplayName(project.profile.user, "Anonymous")}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <Stack align="center" gap="md" py="xl">
              <Text ta="center" c="dimmed">
                No projects shared yet
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                Participants will showcase their work here as they add projects.
              </Text>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
