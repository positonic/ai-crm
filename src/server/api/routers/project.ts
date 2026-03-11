import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type EmailResult } from "~/server/email/emailService";
import { env } from "~/env";
import { type PrismaClient } from "@prisma/client";

/**
 * Resolve event identifier - accepts both CUID and slug.
 * Returns the actual event ID or null if not found.
 */
async function resolveEventId(
  db: PrismaClient,
  identifier: string,
): Promise<string | null> {
  // Try by ID first
  const eventById = await db.event.findUnique({
    where: { id: identifier },
    select: { id: true },
  });
  if (eventById) return eventById.id;

  // Try by slug
  const eventBySlug = await db.event.findUnique({
    where: { slug: identifier },
    select: { id: true },
  });
  return eventBySlug?.id ?? null;
}

// Helper function to send project update notifications to Telegram channel
async function sendProjectUpdateNotification(params: {
  updateId: string;
  updateContent: string;
  projectTitle: string;
  authorName: string;
  authorId: string;
}) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_PROJECT_UPDATE_CHANNEL_ID;
  const topicId = env.TELEGRAM_PROJECT_UPDATE_TOPIC_ID;

  if (!botToken) {
    console.warn(
      "TELEGRAM_BOT_TOKEN not configured, skipping project update notification",
    );
    return;
  }

  if (!chatId) {
    console.warn(
      "TELEGRAM_PROJECT_UPDATE_CHANNEL_ID not configured, skipping project update notification",
    );
    return;
  }

  try {
    // Truncate content preview if too long
    const contentPreview =
      params.updateContent.length > 200
        ? `${params.updateContent.substring(0, 200)}...`
        : params.updateContent;

    const updateUrl = `https://platform.fundingthecommons.io/community/updates/${params.updateId}`;
    const profileUrl = `https://platform.fundingthecommons.io/profiles/${params.authorId}`;
    const communityUpdatesUrl =
      "https://platform.fundingthecommons.io/community/updates";

    const message = `🆕 *${params.projectTitle}* project update

${contentPreview}

👤 Posted by: [${params.authorName}](${profileUrl})

[View Update](${updateUrl}) | [View all Community Updates](${communityUpdatesUrl})`;

    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      disable_web_page_preview: boolean;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    // Only include topic ID if configured
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { description?: string };
      console.error(
        "Failed to send Telegram notification:",
        errorData.description ?? "Unknown error",
      );
    }
  } catch (error) {
    console.error(
      "Error sending Telegram notification:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

// Helper function to send update comment notifications to Telegram channel
async function sendUpdateCommentChannelNotification(params: {
  projectTitle: string;
  updateTitle: string;
  commenterName: string;
  commentContent: string;
  updateUrl: string;
}) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHANNEL_ID;
  const topicId = env.TELEGRAM_UPDATES_TOPIC_ID;

  if (!botToken) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return;
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHANNEL_ID not configured, skipping notification");
    return;
  }

  try {
    // Truncate comment preview if too long
    const commentPreview =
      params.commentContent.length > 200
        ? `${params.commentContent.substring(0, 200)}...`
        : params.commentContent;

    const message = `
💬 *New Comment on Update*

*Project:* ${params.projectTitle}
*Update:* ${params.updateTitle}

${commentPreview}

👤 Comment by: ${params.commenterName}

[View conversation](${params.updateUrl})
`.trim();

    // Build request body
    const requestBody: {
      chat_id: string;
      text: string;
      parse_mode: string;
      disable_web_page_preview: boolean;
      message_thread_id?: string;
    } = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    };

    // Only include topic ID if configured
    if (topicId) {
      requestBody.message_thread_id = topicId;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { description?: string };
      console.error(
        "Failed to send Telegram comment notification:",
        errorData.description ?? "Unknown error",
      );
    }
  } catch (error) {
    console.error(
      "Error sending Telegram comment notification:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export const projectRouter = createTRPCRouter({
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get user's accepted applications to find their eventId
    const acceptedApplications = await ctx.db.application.findMany({
      where: {
        userId,
        status: "ACCEPTED",
      },
      select: {
        eventId: true,
      },
      take: 1, // Assume user is only in one active event for now
    });

    // Default to funding-commons-residency-2025 if no accepted application
    const eventId =
      acceptedApplications[0]?.eventId ?? "funding-commons-residency-2025";

    // Get user's profile
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      return [];
    }

    // Get user's own projects
    const ownProjects = await ctx.db.userProject.findMany({
      where: {
        profileId: profile.id,
      },
      select: {
        id: true,
        title: true,
        githubUrl: true,
        repositories: {
          select: {
            url: true,
            isPrimary: true,
          },
          orderBy: {
            isPrimary: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get projects where user is a collaborator
    const collaboratorProjects = await ctx.db.userProject.findMany({
      where: {
        collaborators: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        githubUrl: true,
        repositories: {
          select: {
            url: true,
            isPrimary: true,
          },
          orderBy: {
            isPrimary: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Merge and deduplicate, add eventId to each
    const allProjects = [...ownProjects, ...collaboratorProjects];
    const uniqueProjects = Array.from(
      new Map(allProjects.map((p) => [p.id, p])).values(),
    ).map((p) => ({
      id: p.id,
      title: p.title,
      // Use primary repository URL if available, otherwise fall back to githubUrl
      githubUrl: p.repositories[0]?.url ?? p.githubUrl,
      eventId,
    }));

    return uniqueProjects;
  }),

  // Public: Get projects from event participants
  getEventProjects: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accepted participants for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      description: true,
                      githubUrl: true,
                      liveUrl: true,
                      imageUrl: true,
                      technologies: true,
                      focusAreas: true,
                      featured: true,
                      createdAt: true,
                      repositories: {
                        select: {
                          id: true,
                          url: true,
                          name: true,
                          description: true,
                          isPrimary: true,
                          order: true,
                        },
                        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                      },
                    },
                    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
                  },
                },
              },
            },
          },
        },
      });

      // Flatten projects with user information
      const projects = acceptedApplications
        .filter((app) => app.user?.profile?.projects?.length)
        .flatMap((app) =>
          app.user!.profile!.projects.map((project) => ({
            ...project,
            author: {
              id: app.user!.id,
              name: app.user!.name,
              image: app.user!.image,
            },
          })),
        )
        .sort((a, b) => {
          // Sort by featured first, then by creation date
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

      return projects;
    }),

  // Public: Get detailed project information
  getProjectDetails: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Resolve eventId if provided (could be slug or ID)
      let resolvedEventId: string | null = null;
      if (input.eventId) {
        resolvedEventId = await resolveEventId(ctx.db, input.eventId);
        if (!resolvedEventId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }
      }

      // Get project from UserProject model (not the hackathon Project model)
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          repositories: {
            select: {
              id: true,
              url: true,
              name: true,
              description: true,
              isPrimary: true,
              order: true,
              attestations: {
                select: {
                  id: true,
                  uid: true,
                  chain: true,
                  snapshotDate: true,
                  isRetroactive: true,
                  data: true,
                },
                orderBy: { snapshotDate: "desc" },
              },
            },
            orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
          },
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  applications: resolvedEventId
                    ? {
                        where: {
                          eventId: resolvedEventId,
                          status: "ACCEPTED",
                        },
                        take: 1,
                      }
                    : false,
                },
              },
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: {
                    select: {
                      jobTitle: true,
                      company: true,
                      location: true,
                      bio: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              addedAt: "asc",
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Verify the project owner is an accepted participant of this event (only if eventId provided)
      if (
        resolvedEventId &&
        project.profile.user.applications &&
        !project.profile.user.applications.length
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found for this event",
        });
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        githubUrl: project.githubUrl,
        liveUrl: project.liveUrl,
        imageUrl: project.imageUrl,
        bannerUrl: project.bannerUrl,
        technologies: project.technologies,
        focusAreas: project.focusAreas,
        featured: project.featured,
        createdAt: project.createdAt,
        repositories: project.repositories,
        author: {
          id: project.profile.user.id,
          name: project.profile.user.name,
          image: project.profile.user.image,
          profile: {
            jobTitle: project.profile.jobTitle,
            company: project.profile.company,
            location: project.profile.location,
            bio: project.profile.bio,
            githubUrl: project.profile.githubUrl,
            linkedinUrl: project.profile.linkedinUrl,
            twitterUrl: project.profile.twitterUrl,
            website: project.profile.website,
          },
        },
        collaborators: project.collaborators.map((collab) => ({
          id: collab.id,
          userId: collab.user.id,
          name: collab.user.name,
          image: collab.user.image,
          role: collab.role,
          canEdit: collab.canEdit,
          addedAt: collab.addedAt,
          profile: collab.user.profile
            ? {
                jobTitle: collab.user.profile.jobTitle,
                company: collab.user.profile.company,
                location: collab.user.profile.location,
                bio: collab.user.profile.bio,
              }
            : null,
        })),
        likes: project.likes,
      };
    }),

  // Public: Get project timeline updates
  getProjectTimeline: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const updates = await ctx.db.projectUpdate.findMany({
        where: { projectId: input.projectId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { updateDate: "desc" },
      });

      return updates;
    }),

  // Get all project updates for a user's projects
  getUserProjectUpdates: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get all projects where the user is the owner
      const ownedProjects = await ctx.db.userProject.findMany({
        where: {
          profile: {
            userId: input.userId,
          },
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
        },
      });

      // Get all projects where the user is a collaborator
      const collaboratorProjects = await ctx.db.projectCollaborator.findMany({
        where: {
          userId: input.userId,
        },
        select: {
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
      });

      // Combine both lists of projects
      const allProjects = [
        ...ownedProjects,
        ...collaboratorProjects.map((c) => c.project),
      ];

      if (allProjects.length === 0) {
        return [];
      }

      // Get all updates for these projects
      const updates = await ctx.db.projectUpdate.findMany({
        where: {
          projectId: {
            in: allProjects.map((p) => p.id),
          },
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
        orderBy: { updateDate: "desc" },
        take: 50, // Limit to most recent 50 updates
      });

      return updates;
    }),

  // Protected: Create project update (only project owner)
  createProjectUpdate: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1, "Update title is required"),
        content: z.string().min(1, "Update content is required"),
        weekNumber: z.number().optional(),
        updateDate: z.date().optional(),
        imageUrls: z.array(z.string().url()).optional(),
        githubUrls: z.array(z.string().url()).optional(),
        demoUrls: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the project exists and the user can edit it (owner or collaborator with edit permissions)
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            select: {
              userId: true,
            },
          },
          collaborators: {
            where: {
              userId,
            },
            select: {
              canEdit: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user is the owner or a collaborator with edit permissions
      const isOwner = project.profile.userId === userId;
      const isCollaboratorWithEdit = project.collaborators.some(
        (c) => c.canEdit,
      );

      if (!isOwner && !isCollaboratorWithEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update this project",
        });
      }

      const update = await ctx.db.projectUpdate.create({
        data: {
          projectId: input.projectId,
          userId,
          title: input.title,
          content: input.content,
          weekNumber: input.weekNumber ?? null,
          updateDate: input.updateDate ?? new Date(),
          imageUrls: input.imageUrls ?? [],
          githubUrls: input.githubUrls ?? [],
          demoUrls: input.demoUrls ?? [],
          tags: input.tags ?? [],
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // Send Telegram notification
      const authorName = update.author.name ?? "Someone";

      void sendProjectUpdateNotification({
        updateId: update.id,
        updateContent: update.content,
        projectTitle: project.title,
        authorName,
        authorId: userId,
      });

      return update;
    }),

  // Protected: Update project update (only author)
  updateProjectUpdate: protectedProcedure
    .input(
      z.object({
        updateId: z.string(),
        title: z.string().min(1, "Update title is required").optional(),
        content: z.string().min(1, "Update content is required").optional(),
        weekNumber: z.number().optional(),
        updateDate: z.date().optional(),
        imageUrls: z.array(z.string().url()).optional(),
        githubUrls: z.array(z.string().url()).optional(),
        demoUrls: z.array(z.string().url()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the update exists and the user owns it
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      if (update.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this update",
        });
      }

      const updatedUpdate = await ctx.db.projectUpdate.update({
        where: { id: input.updateId },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.content && { content: input.content }),
          ...(input.weekNumber !== undefined && {
            weekNumber: input.weekNumber,
          }),
          ...(input.updateDate !== undefined && {
            updateDate: input.updateDate,
          }),
          ...(input.imageUrls && { imageUrls: input.imageUrls }),
          ...(input.githubUrls && { githubUrls: input.githubUrls }),
          ...(input.demoUrls && { demoUrls: input.demoUrls }),
          ...(input.tags && { tags: input.tags }),
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
      });

      return updatedUpdate;
    }),

  // Protected: Delete project update (only author)
  deleteProjectUpdate: protectedProcedure
    .input(z.object({ updateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the update exists and the user can delete it
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          project: {
            include: {
              profile: {
                select: {
                  userId: true,
                },
              },
              collaborators: {
                where: {
                  userId,
                },
                select: {
                  canEdit: true,
                },
              },
            },
          },
        },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Check if user is the update author, project owner, or collaborator with edit permissions
      const isAuthor = update.userId === userId;
      const isProjectOwner = update.project.profile.userId === userId;
      const isCollaboratorWithEdit = update.project.collaborators.some(
        (c) => c.canEdit,
      );

      if (!isAuthor && !isProjectOwner && !isCollaboratorWithEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this update",
        });
      }

      await ctx.db.projectUpdate.delete({
        where: { id: input.updateId },
      });

      return { success: true };
    }),

  // Protected: Like a project update
  likeProjectUpdate: protectedProcedure
    .input(
      z.object({
        updateId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if update exists
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Check if user already liked this update
      const existingLike = await ctx.db.projectUpdateLike.findUnique({
        where: {
          projectUpdateId_userId: {
            projectUpdateId: input.updateId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this update",
        });
      }

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this update",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.projectUpdateLike.create({
          data: {
            projectUpdateId: input.updateId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to update author
        ctx.db.user.update({
          where: { id: update.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Protected: Unlike a project update
  unlikeProjectUpdate: protectedProcedure
    .input(
      z.object({
        updateId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.projectUpdateLike.findUnique({
        where: {
          projectUpdateId_userId: {
            projectUpdateId: input.updateId,
            userId,
          },
        },
      });

      if (!like) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Like not found",
        });
      }

      await ctx.db.projectUpdateLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),

  // Public: Get likes for a project update
  getUpdateLikes: publicProcedure
    .input(
      z.object({
        updateId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.projectUpdateLike.findMany({
        where: { projectUpdateId: input.updateId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: likes.length,
        likes,
        hasLiked: ctx.session?.user
          ? likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
      };
    }),

  // Public: Get all project updates for an event
  getAllEventUpdates: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accepted participants for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
        },
        select: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get all project IDs from accepted residents
      const projectIds = acceptedApplications
        .filter((app) => app.user?.profile?.projects?.length)
        .flatMap((app) =>
          app.user!.profile!.projects.map((project) => project.id),
        );

      if (projectIds.length === 0) {
        return [];
      }

      // Get all updates for these projects
      const updates = await ctx.db.projectUpdate.findMany({
        where: {
          projectId: {
            in: projectIds,
          },
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                  image: true,
                  profile: {
                    select: {
                      avatarUrl: true,
                    },
                  },
                },
              },
              likes: {
                select: {
                  userId: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 2, // Last 2 comments only
          },
        },
        orderBy: { updateDate: "desc" },
      });

      return updates;
    }),

  // Get user metrics for event residents (for badges/leaderboard)
  getEventUserMetrics: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get accepted residents for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
        },
        select: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      metrics: {
                        select: {
                          id: true,
                        },
                      },
                      updates: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Get all praise transactions with proper typing
      const praiseTransactions = (await ctx.db.praise.findMany({
        select: {
          senderId: true,
          recipientId: true,
        },
      })) as Array<{ senderId: string; recipientId: string }>;

      // Calculate metrics for each user
      const userMetrics = acceptedApplications
        .filter((app) => app.user)
        .map((app) => {
          const userId = app.user!.id;
          const projects = app.user!.profile?.projects ?? [];

          // Count projects with at least one metric
          const projectsWithMetrics = projects.filter(
            (p) => p.metrics && p.metrics.length > 0,
          ).length;

          // Count total updates across all projects
          const updateCount = projects.reduce(
            (sum, p) => sum + (p.updates?.length ?? 0),
            0,
          );

          // Count praise sent and received
          const praiseSent = praiseTransactions.filter(
            (t) => t.senderId === userId,
          ).length;

          const praiseReceived = praiseTransactions.filter(
            (t) => t.recipientId === userId,
          ).length;

          // Calculate kudos using the same formula as leaderboard
          const KUDOS_CONSTANTS = {
            BASE_KUDOS: 130,
            UPDATE_WEIGHT: 10,
            METRICS_WEIGHT: 10,
            BACKFILL_PRAISE_VALUE: 5,
          };

          const kudos = Math.max(
            0,
            KUDOS_CONSTANTS.BASE_KUDOS +
              updateCount * KUDOS_CONSTANTS.UPDATE_WEIGHT +
              projectsWithMetrics * KUDOS_CONSTANTS.METRICS_WEIGHT +
              praiseReceived * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE -
              praiseSent * KUDOS_CONSTANTS.BACKFILL_PRAISE_VALUE,
          );

          return {
            userId,
            kudos,
            updates: updateCount,
            projects: projectsWithMetrics,
            praiseReceived,
            praiseSent,
          };
        });

      // Return as a map for easy lookup by userId
      const metricsMap: Record<
        string,
        {
          userId: string;
          kudos: number;
          updates: number;
          projects: number;
          praiseReceived: number;
          praiseSent: number;
        }
      > = Object.fromEntries(userMetrics.map((m) => [m.userId, m]));

      return metricsMap;
    }),

  // Protected: Like a UserProject
  likeUserProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if project exists and get project owner
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          profile: {
            select: { userId: true },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user already liked this project
      const existingLike = await ctx.db.userProjectLike.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this project",
        });
      }

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this project",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.userProjectLike.create({
          data: {
            projectId: input.projectId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to project owner
        ctx.db.user.update({
          where: { id: project.profile.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Protected: Unlike a UserProject
  unlikeUserProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.userProjectLike.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId,
          },
        },
      });

      if (!like) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Like not found",
        });
      }

      await ctx.db.userProjectLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),

  // Public: Get likes for a UserProject
  getUserProjectLikes: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.userProjectLike.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        count: likes.length,
        likes,
        hasLiked: ctx.session?.user
          ? likes.some((like) => like.userId === ctx.session!.user.id)
          : false,
      };
    }),

  // Public: Get a single project update by ID
  getUpdateById: publicProcedure
    .input(
      z.object({
        updateId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  surname: true,
                  image: true,
                  profile: {
                    select: {
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      return update;
    }),

  // Protected: Create a comment on a project update
  createUpdateComment: protectedProcedure
    .input(
      z.object({
        updateId: z.string(),
        content: z
          .string()
          .min(1, "Comment cannot be empty")
          .max(5000, "Comment is too long"),
        eventId: z.string(), // Required for building notification URL
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify update exists and get project info
      const update = await ctx.db.projectUpdate.findUnique({
        where: { id: input.updateId },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!update) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Update not found",
        });
      }

      // Create the comment
      const comment = await ctx.db.projectUpdateComment.create({
        data: {
          projectUpdateId: input.updateId,
          userId: ctx.session.user.id,
          content: input.content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
        },
      });

      // Send notifications to project members asynchronously (both email and Telegram)
      // Use void to explicitly ignore the promise (fire-and-forget pattern)
      void (async () => {
        try {
          const commenterName =
            comment.user.name ??
            `${comment.user.firstName ?? ""} ${comment.user.surname ?? ""}`.trim() ??
            "Someone";

          const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://platform.fundingthecommons.io"}/events/${input.eventId}/updates/${input.updateId}`;

          // Get update author to ensure they're notified
          const updateAuthor = await ctx.db.user.findUnique({
            where: { id: update.userId },
            include: {
              profile: {
                select: {
                  telegramChatId: true,
                  telegramHandle: true,
                },
              },
            },
          });

          // Get all project collaborators (excluding the commenter)
          const collaborators = await ctx.db.projectCollaborator.findMany({
            where: {
              projectId: update.project.id,
              userId: { not: ctx.session.user.id },
            },
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      telegramChatId: true,
                      telegramHandle: true,
                    },
                  },
                },
              },
            },
          });

          // Combine update author and collaborators, deduplicate by userId
          const allRecipients = new Map<string, typeof updateAuthor>();

          // Add update author first (if not the commenter)
          if (updateAuthor && update.userId !== ctx.session.user.id) {
            allRecipients.set(updateAuthor.id, updateAuthor);
          }

          // Add collaborators (will skip duplicates due to Map)
          for (const collab of collaborators) {
            if (!allRecipients.has(collab.user.id)) {
              allRecipients.set(collab.user.id, collab.user);
            }
          }

          const recipients = Array.from(allRecipients.values());

          let telegramSuccessCount = 0;
          let telegramFailureCount = 0;
          let emailSuccessCount = 0;
          let emailFailureCount = 0;

          // Send Telegram notifications
          const { BotNotificationService } = await import(
            "~/server/services/botNotificationService"
          );
          const botNotificationService = new BotNotificationService(ctx.db);

          const telegramResults =
            await botNotificationService.sendUpdateCommentNotifications({
              commentId: comment.id,
              updateId: input.updateId,
              projectId: update.project.id,
              eventId: input.eventId,
              commenterUserId: ctx.session.user.id,
              commenterName,
              commentContent: input.content,
              updateUrl,
            });

          telegramSuccessCount = telegramResults.filter(
            (r) => r.success,
          ).length;
          telegramFailureCount = telegramResults.filter(
            (r) => !r.success,
          ).length;

          // Send channel notification to Telegram topic
          void sendUpdateCommentChannelNotification({
            projectTitle: update.project.title,
            updateTitle: update.title,
            commenterName,
            commentContent: input.content,
            updateUrl,
          });

          // Send Email notifications
          const { getEmailService } = await import(
            "~/server/email/emailService"
          );
          const emailService = getEmailService(ctx.db);

          const emailPromises = recipients
            .filter((recipient) => recipient?.email)
            .map(async (recipient): Promise<EmailResult> => {
              const recipientName =
                recipient!.name ??
                `${recipient!.firstName ?? ""} ${recipient!.surname ?? ""}`.trim() ??
                "Team Member";

              return emailService.sendUpdateCommentEmail({
                recipientEmail: recipient!.email!,
                recipientName,
                commenterName,
                commentContent: input.content,
                updateUrl,
                projectTitle: update.project.title,
                eventId: input.eventId,
                commentId: comment.id,
                updateId: input.updateId,
                projectId: update.project.id,
              });
            });

          const emailResults = await Promise.allSettled(emailPromises);

          emailSuccessCount = emailResults.filter(
            (r) => r.status === "fulfilled" && r.value.success,
          ).length;
          emailFailureCount = emailResults.filter(
            (r) =>
              r.status === "rejected" ||
              (r.status === "fulfilled" && !r.value.success),
          ).length;

          console.log(
            `Update comment notifications for comment ${comment.id}: ` +
              `Telegram (${telegramSuccessCount} sent, ${telegramFailureCount} failed), ` +
              `Email (${emailSuccessCount} sent, ${emailFailureCount} failed)`,
          );
        } catch (error) {
          // Log error but don't fail the comment creation
          console.error("Failed to send update comment notifications:", error);
        }
      })();

      return comment;
    }),

  // Protected: Update a comment
  updateUpdateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
        content: z
          .string()
          .min(1, "Comment cannot be empty")
          .max(5000, "Comment is too long"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Verify user owns this comment
      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      const updatedComment = await ctx.db.projectUpdateComment.update({
        where: { id: input.commentId },
        data: { content: input.content },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
        },
      });

      return updatedComment;
    }),

  // Protected: Delete a comment
  deleteUpdateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Verify user owns this comment
      if (comment.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await ctx.db.projectUpdateComment.delete({
        where: { id: input.commentId },
      });

      return { success: true };
    }),

  // Public: Get comments for a project update
  getUpdateComments: publicProcedure
    .input(
      z.object({
        updateId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const comments = await ctx.db.projectUpdateComment.findMany({
        where: { projectUpdateId: input.updateId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              surname: true,
              image: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return comments;
    }),

  // Protected: Like a comment on a project update
  likeUpdateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if comment exists
      const comment = await ctx.db.projectUpdateComment.findUnique({
        where: { id: input.commentId },
      });

      if (!comment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }

      // Check if user already liked this comment
      const existingLike = await ctx.db.projectUpdateCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId,
          },
        },
      });

      if (existingLike) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already liked this comment",
        });
      }

      // Get liker's current kudos for transfer calculation
      const liker = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { kudos: true },
      });

      if (!liker) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Calculate kudos transfer (2% of liker's kudos)
      const transferAmount = liker.kudos * 0.02;

      // Check if user has sufficient kudos
      if (liker.kudos < transferAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient kudos to like this comment",
        });
      }

      // Perform kudos transfer in a transaction
      const [like] = await ctx.db.$transaction([
        // Create the like with transfer data
        ctx.db.projectUpdateCommentLike.create({
          data: {
            commentId: input.commentId,
            userId,
            kudosTransferred: transferAmount,
            likerKudosAtTime: liker.kudos,
          },
        }),
        // Deduct kudos from liker
        ctx.db.user.update({
          where: { id: userId },
          data: { kudos: { decrement: transferAmount } },
        }),
        // Add kudos to comment author
        ctx.db.user.update({
          where: { id: comment.userId },
          data: { kudos: { increment: transferAmount } },
        }),
      ]);

      return like;
    }),

  // Protected: Unlike a comment on a project update
  unlikeUpdateComment: protectedProcedure
    .input(
      z.object({
        commentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find and delete the like
      const like = await ctx.db.projectUpdateCommentLike.findUnique({
        where: {
          commentId_userId: {
            commentId: input.commentId,
            userId,
          },
        },
      });

      if (!like) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Like not found",
        });
      }

      await ctx.db.projectUpdateCommentLike.delete({
        where: { id: like.id },
      });

      return { success: true };
    }),

  // Public: Get focus areas distribution for an event
  getFocusAreasDistribution: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all projects for accepted residents of this event
      const projects = await ctx.db.userProject.findMany({
        where: {
          profile: {
            user: {
              applications: {
                some: {
                  eventId: input.eventId,
                  status: "ACCEPTED",
                  applicationType: "RESIDENT",
                },
              },
            },
          },
        },
        select: {
          focusAreas: true,
        },
      });

      // Count focus areas
      const focusAreaCounts: Record<string, number> = {};
      for (const project of projects) {
        for (const area of project.focusAreas) {
          focusAreaCounts[area] = (focusAreaCounts[area] ?? 0) + 1;
        }
      }

      // Convert to array and sort by count
      const distribution = Object.entries(focusAreaCounts)
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count);

      return {
        distribution,
        totalProjects: projects.length,
        projectsWithFocusAreas: projects.filter((p) => p.focusAreas.length > 0)
          .length,
      };
    }),

  // Public: Get event-wide GitHub activity stats
  getEventActivityStats: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all repositories for accepted residents of this event
      const repositories = await ctx.db.repository.findMany({
        where: {
          project: {
            profile: {
              user: {
                applications: {
                  some: {
                    eventId: input.eventId,
                    status: "ACCEPTED",
                    applicationType: "RESIDENT",
                  },
                },
              },
            },
          },
        },
        select: {
          isActive: true,
          weeksActive: true,
          lastSyncedAt: true,
        },
      });

      const activeProjects = repositories.filter((r) => r.isActive).length;
      const totalProjects = repositories.length;
      const percentageActive =
        totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0;

      const repositoriesWithWeeks = repositories.filter(
        (r) => r.weeksActive !== null,
      );
      const avgWeeksActive =
        repositoriesWithWeeks.length > 0
          ? repositoriesWithWeeks.reduce(
              (sum, r) => sum + (r.weeksActive ?? 0),
              0,
            ) / repositoriesWithWeeks.length
          : 0;

      return {
        percentageActive: percentageActive.toFixed(1),
        avgWeeksActive: avgWeeksActive.toFixed(1),
        lastSyncedAt: repositories[0]?.lastSyncedAt ?? null,
        totalProjects,
        activeProjects,
      };
    }),

  // Public: Get repository metrics (lifetime + residency-specific)
  getRepositoryMetrics: publicProcedure
    .input(
      z.object({
        repositoryId: z.string(),
        eventId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const repo = await ctx.db.repository.findUnique({
        where: { id: input.repositoryId },
        include: {
          residencyMetrics: input.eventId
            ? { where: { eventId: input.eventId } }
            : true,
        },
      });

      return repo;
    }),

  // Public: Get all projects for an event with residency commit data
  getEventProjectsWithCommits: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all accepted residents for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
        },
        select: {
          user: {
            select: {
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      repositories: {
                        select: {
                          id: true,
                          url: true,
                          isPrimary: true,
                          residencyMetrics: {
                            where: {
                              eventId: input.eventId,
                            },
                            select: {
                              residencyCommits: true,
                            },
                          },
                        },
                        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                      },
                    },
                    orderBy: { createdAt: "desc" },
                  },
                },
              },
            },
          },
        },
      });

      // Flatten projects and calculate total commits
      const projects = acceptedApplications
        .filter((app) => app.user?.profile?.projects?.length)
        .flatMap((app) => app.user!.profile!.projects)
        .map((project) => {
          const primaryRepo =
            project.repositories.find((r) => r.isPrimary) ??
            project.repositories[0];
          const totalCommits = project.repositories.reduce(
            (sum, repo) =>
              sum + (repo.residencyMetrics[0]?.residencyCommits ?? 0),
            0,
          );

          return {
            id: project.id,
            title: project.title,
            totalCommits,
            primaryRepoUrl: primaryRepo?.url ?? null,
          };
        })
        // Remove duplicates (same user might have multiple accepted applications)
        .filter(
          (project, index, self) =>
            index === self.findIndex((p) => p.id === project.id),
        )
        // Sort by commits descending
        .sort((a, b) => b.totalCommits - a.totalCommits);

      return projects;
    }),

  // Public: Get all projects for an event with residency commit data AND metrics
  getEventProjectsWithMetrics: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all accepted residents for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
          userId: { not: null },
        },
        select: {
          id: true,
          user: {
            select: {
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      repositories: {
                        select: {
                          id: true,
                          url: true,
                          isPrimary: true,
                          residencyMetrics: {
                            where: {
                              eventId: input.eventId,
                            },
                            select: {
                              residencyCommits: true,
                            },
                          },
                        },
                        orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
                      },
                      metrics: {
                        where: {
                          isTracking: true,
                        },
                        select: {
                          id: true,
                          targetValue: true,
                          metric: {
                            select: {
                              id: true,
                              name: true,
                              description: true,
                              metricType: true,
                              unitOfMetric: true,
                              collectionMethod: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: { createdAt: "desc" },
                  },
                },
              },
            },
          },
        },
      });

      // Flatten projects and calculate total commits
      const projects = acceptedApplications
        .filter((app) => app.user?.profile?.projects?.length)
        .flatMap((app) => app.user!.profile!.projects)
        .map((project) => {
          const primaryRepo =
            project.repositories.find(
              (r: { isPrimary: boolean }) => r.isPrimary,
            ) ?? project.repositories[0];
          const totalCommits = project.repositories.reduce(
            (
              sum: number,
              repo: {
                residencyMetrics: Array<{ residencyCommits: number | null }>;
              },
            ) => sum + (repo.residencyMetrics[0]?.residencyCommits ?? 0),
            0,
          );

          return {
            id: project.id,
            title: project.title,
            totalCommits,
            primaryRepoId: primaryRepo?.id ?? null,
            primaryRepoUrl: primaryRepo?.url ?? null,
            metrics: project.metrics.map(
              (pm: {
                id: string;
                targetValue: number | null;
                metric: {
                  id: string;
                  name: string;
                  description: string | null;
                  metricType: string[];
                  unitOfMetric: string | null;
                  collectionMethod: string | null;
                };
              }) => ({
                id: pm.id,
                name: pm.metric.name,
                description: pm.metric.description,
                metricType: pm.metric.metricType,
                unitOfMetric: pm.metric.unitOfMetric,
                collectionMethod: pm.metric.collectionMethod,
                targetValue: pm.targetValue,
              }),
            ),
          };
        })
        // Remove duplicates (same user might have multiple accepted applications)
        .filter(
          (project, index, self) =>
            index === self.findIndex((p) => p.id === project.id),
        )
        // Sort by commits descending
        .sort((a, b) => b.totalCommits - a.totalCommits);

      return projects;
    }),

  // Public: Get all metrics tracked across an event with their associated projects
  getEventMetricsWithProjects: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get all accepted residents for this event
      const acceptedApplications = await ctx.db.application.findMany({
        where: {
          eventId: input.eventId,
          status: "ACCEPTED",
          applicationType: "RESIDENT",
          userId: { not: null },
        },
        select: {
          user: {
            select: {
              profile: {
                select: {
                  projects: {
                    select: {
                      id: true,
                      title: true,
                      metrics: {
                        where: {
                          isTracking: true,
                        },
                        select: {
                          id: true,
                          targetValue: true,
                          metric: {
                            select: {
                              id: true,
                              name: true,
                              description: true,
                              metricType: true,
                              unitOfMetric: true,
                              collectionMethod: true,
                              category: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Build a map of metrics to projects
      const metricsMap = new Map<
        string,
        {
          id: string;
          name: string;
          description: string | null;
          metricType: string[];
          unitOfMetric: string | null;
          collectionMethod: string;
          category: string | null;
          projects: Array<{
            id: string;
            title: string;
            targetValue: number | null;
          }>;
        }
      >();

      // Process all projects and their metrics
      const seenProjects = new Set<string>();
      for (const app of acceptedApplications) {
        const projects = app.user?.profile?.projects ?? [];
        for (const project of projects) {
          // Skip duplicate projects (user might have multiple accepted applications)
          if (seenProjects.has(project.id)) continue;
          seenProjects.add(project.id);

          for (const pm of project.metrics) {
            const metric = pm.metric;
            if (!metricsMap.has(metric.id)) {
              metricsMap.set(metric.id, {
                id: metric.id,
                name: metric.name,
                description: metric.description,
                metricType: metric.metricType,
                unitOfMetric: metric.unitOfMetric,
                collectionMethod: metric.collectionMethod,
                category: metric.category,
                projects: [],
              });
            }
            metricsMap.get(metric.id)!.projects.push({
              id: project.id,
              title: project.title,
              targetValue: pm.targetValue,
            });
          }
        }
      }

      // Convert map to array and sort by number of projects tracking the metric
      const metrics = Array.from(metricsMap.values()).sort(
        (a, b) => b.projects.length - a.projects.length,
      );

      return {
        metrics,
        totalMetrics: metrics.length,
        totalProjectsWithMetrics: seenProjects.size,
      };
    }),

  // Protected: Get all project updates across all events (for /latest page)
  getAllUpdates: protectedProcedure.query(async ({ ctx }) => {
    // Get all accepted resident applications
    const acceptedApplications = await ctx.db.application.findMany({
      where: {
        status: "ACCEPTED",
        applicationType: "RESIDENT",
      },
      select: {
        eventId: true,
        user: {
          select: {
            id: true,
            profile: {
              select: {
                projects: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all project IDs from accepted residents
    const projectIds = acceptedApplications
      .filter((app) => app.user?.profile?.projects?.length)
      .flatMap((app) =>
        app.user!.profile!.projects.map((project) => project.id),
      );

    if (projectIds.length === 0) {
      return [];
    }

    // Get all updates for these projects
    const updates = await ctx.db.projectUpdate.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            name: true,
            image: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                surname: true,
                image: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
            likes: {
              select: {
                userId: true,
              },
            },
            _count: {
              select: {
                likes: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 2, // Last 2 comments only
        },
      },
      orderBy: { updateDate: "desc" },
      take: 50, // Limit to most recent 50 updates
    });

    return updates;
  }),

  // Protected: Get user metrics across all events (for badges on /latest page)
  getAllUserMetrics: protectedProcedure.query(async ({ ctx }) => {
    // Get all accepted residents
    const acceptedApplications = await ctx.db.application.findMany({
      where: {
        status: "ACCEPTED",
        applicationType: "RESIDENT",
      },
      select: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                projects: {
                  select: {
                    id: true,
                    metrics: {
                      select: {
                        id: true,
                      },
                    },
                    updates: {
                      select: {
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get all praise transactions
    const praiseTransactions = (await ctx.db.praise.findMany({
      select: {
        senderId: true,
        recipientId: true,
      },
    })) as Array<{ senderId: string; recipientId: string }>;

    // Calculate metrics for each unique user
    const seenUsers = new Set<string>();
    const userMetrics = acceptedApplications
      .filter((app) => app.user && !seenUsers.has(app.user.id))
      .map((app) => {
        seenUsers.add(app.user!.id);
        const userId = app.user!.id;
        const projects = app.user!.profile?.projects ?? [];

        // Count projects with at least one metric
        const projectsWithMetrics = projects.filter(
          (p) => p.metrics && p.metrics.length > 0,
        ).length;

        // Count total updates
        const totalUpdates = projects.reduce(
          (sum, p) => sum + (p.updates?.length ?? 0),
          0,
        );

        // Count kudos sent and praise received
        const kudosSent = praiseTransactions.filter(
          (p) => p.senderId === userId,
        ).length;
        const praiseReceived = praiseTransactions.filter(
          (p) => p.recipientId === userId,
        ).length;

        return {
          userId,
          projects: projectsWithMetrics,
          updates: totalUpdates,
          kudos: kudosSent,
          praiseReceived,
        };
      });

    // Return as a map keyed by userId
    return Object.fromEntries(userMetrics.map((m) => [m.userId, m]));
  }),

  // Get all attestations for a project's repositories
  getProjectAttestations: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.userProject.findUnique({
        where: { id: input.projectId },
        include: {
          repositories: {
            include: {
              attestations: {
                orderBy: { snapshotDate: "desc" },
              },
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Flatten attestations with repository context
      const attestations = project.repositories.flatMap((repo) =>
        repo.attestations.map((attestation) => ({
          ...attestation,
          repository: {
            id: repo.id,
            name: repo.name,
            url: repo.url,
            isPrimary: repo.isPrimary,
          },
        })),
      );

      return {
        projectId: project.id,
        projectTitle: project.title,
        attestations,
        totalCount: attestations.length,
      };
    }),
});
