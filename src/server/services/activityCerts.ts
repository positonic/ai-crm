import { AtpAgent } from "@atproto/api";
import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { env } from "~/env.js";
import * as Sentry from "@sentry/nextjs";
import { getDisplayName } from "~/utils/userDisplay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateRecordResponse {
  uri: string;
  cid: string;
}

interface ActivityContributor {
  contributorIdentity: {
    displayName: string;
    identifier?: string;
  };
  contributionDetails?: {
    role: string;
  };
}

interface EventData {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string | null;
  type: string;
}

export interface PublishActivityCertResult {
  activityUri: string;
  activityCid: string;
  boardUri: string;
  boardCid: string;
  contributorCount: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ActivityCertService {
  private db: PrismaClient;
  private pdsUrl: string;

  constructor(db: PrismaClient) {
    this.db = db;
    this.pdsUrl = env.ATPROTO_PDS_URL ?? "https://bsky.social";
  }

  /**
   * Authenticate as the platform AT Proto account using env var credentials.
   */
  private async getPlatformAgent(): Promise<{ agent: AtpAgent; did: string }> {
    const handle = env.ATPROTO_PLATFORM_HANDLE;
    const appPassword = env.ATPROTO_PLATFORM_APP_PASSWORD;

    if (!handle || !appPassword) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Platform AT Proto account not configured. Set ATPROTO_PLATFORM_HANDLE and ATPROTO_PLATFORM_APP_PASSWORD environment variables.",
      });
    }

    try {
      const agent = new AtpAgent({ service: this.pdsUrl });
      const response = await agent.login({
        identifier: handle.replace(/^@/, ""),
        password: appPassword,
      });

      if (!response.success) {
        throw new Error("Login returned unsuccessful response");
      }

      const did = response.data.did;
      return { agent, did };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: "activity-certs", operation: "platform_login" },
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Failed to authenticate platform AT Proto account. Check credentials.",
      });
    }
  }

  /**
   * Gather event data and deduplicate speakers across all published sessions.
   */
  private async gatherEventData(eventId: string): Promise<{
    event: EventData;
    contributors: ActivityContributor[];
  }> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      include: {
        scheduleSessions: {
          where: { isPublished: true },
          include: {
            sessionSpeakers: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    firstName: true,
                    surname: true,
                    image: true,
                    atProtoAccount: {
                      select: { did: true, handle: true },
                    },
                  },
                },
              },
              orderBy: { order: "asc" as const },
            },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    // Deduplicate speakers across sessions
    const speakerMap = new Map<
      string,
      {
        displayName: string;
        did: string | undefined;
        role: string;
        sessions: string[];
      }
    >();

    for (const session of event.scheduleSessions) {
      for (const ss of session.sessionSpeakers) {
        const user = ss.user;
        const existing = speakerMap.get(user.id);

        const displayName = getDisplayName(user, "Unknown");

        if (existing) {
          existing.sessions.push(session.title);
        } else {
          speakerMap.set(user.id, {
            displayName,
            did: user.atProtoAccount?.did,
            role: ss.role,
            sessions: [session.title],
          });
        }
      }
    }

    const contributors: ActivityContributor[] = [];
    for (const speaker of speakerMap.values()) {
      const contributor: ActivityContributor = {
        contributorIdentity: {
          displayName: speaker.displayName,
          ...(speaker.did ? { identifier: speaker.did } : {}),
        },
      };

      if (speaker.role) {
        contributor.contributionDetails = {
          role: speaker.role,
        };
      }

      contributors.push(contributor);
    }

    return {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        type: event.type,
      },
      contributors,
    };
  }

  /**
   * Create an org.hypercerts.claim.activity record on the platform's PDS.
   */
  private async createActivityRecord(
    agent: AtpAgent,
    did: string,
    event: EventData,
    contributors: ActivityContributor[],
  ): Promise<CreateRecordResponse> {
    const shortDescription =
      event.description?.slice(0, 300) ?? `${event.name} - ${event.type} event`;

    const record: Record<string, unknown> = {
      $type: "org.hypercerts.claim.activity",
      title: event.name.slice(0, 256),
      shortDescription,
      createdAt: new Date().toISOString(),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      workScope: event.type,
    };

    if (contributors.length > 0) {
      record.contributors = contributors;
    }

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.hypercerts.claim.activity",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Create an org.hyperboards.board record pointing to the activity cert.
   */
  private async createBoardRecord(
    agent: AtpAgent,
    did: string,
    activityUri: string,
    activityCid: string,
  ): Promise<CreateRecordResponse> {
    const record: Record<string, unknown> = {
      $type: "org.hyperboards.board",
      subject: {
        uri: activityUri,
        cid: activityCid,
      },
      createdAt: new Date().toISOString(),
    };

    const response = (await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.hyperboards.board",
      record,
    })) as unknown as { data: CreateRecordResponse };

    return response.data;
  }

  /**
   * Publish an event as an activity cert with speakers as contributors
   * and create a hyperboard for it.
   */
  async publishEventActivityCert(
    eventId: string,
  ): Promise<PublishActivityCertResult> {
    try {
      const { agent, did } = await this.getPlatformAgent();
      const { event, contributors } = await this.gatherEventData(eventId);

      const activity = await this.createActivityRecord(
        agent,
        did,
        event,
        contributors,
      );

      const board = await this.createBoardRecord(
        agent,
        did,
        activity.uri,
        activity.cid,
      );

      return {
        activityUri: activity.uri,
        activityCid: activity.cid,
        boardUri: board.uri,
        boardCid: board.cid,
        contributorCount: contributors.length,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      Sentry.captureException(error, {
        tags: {
          service: "activity-certs",
          operation: "publish_event_activity_cert",
        },
        extra: { eventId },
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to publish activity cert",
      });
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createActivityCertService(
  db: PrismaClient,
): ActivityCertService {
  return new ActivityCertService(db);
}
