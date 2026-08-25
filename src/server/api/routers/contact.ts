import { z } from "zod";
import { google, type gmail_v1 } from "googleapis";
import { type PrismaClient } from "@prisma/client";
import { Client as NotionClient } from "@notionhq/client";
import { TelegramClient, sessions, Api } from "telegram";
import bigInt from "big-integer";

// Type definitions for Telegram API responses
interface TelegramUser {
  _: string;
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  bot?: boolean;
  contact?: boolean;
}

interface TelegramContactsResult {
  users?: TelegramUser[];
}

import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { convertHtmlToText } from "~/utils/htmlToText";

// Contact data contains PII (emails, phones, socials) - restrict to staff/admin
function assertStaffOrAdmin(role: string | undefined) {
  if (role !== "staff" && role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only staff and admin users can access contact data",
    });
  }
}

type Context = {
  db: PrismaClient;
  session: {
    user: {
      id: string;
    };
  };
};

async function getGoogleAuthClient(
  ctx: Context,
  requiredScope?: "contacts" | "gmail",
) {
  console.log(
    `[DEBUG] Getting Google auth client for user: ${ctx.session.user.id}`,
  );

  // 1. Get user's Google access token from session
  const account = await ctx.db.account.findFirst({
    where: {
      userId: ctx.session.user.id,
      provider: "google",
    },
  });

  if (!account?.access_token || !account.refresh_token) {
    console.log(
      `[DEBUG] No Google account found or missing tokens for user: ${ctx.session.user.id}`,
    );
    throw new Error("GOOGLE_NOT_CONNECTED");
  }

  // Log token information (safely)
  const contactsScope = "https://www.googleapis.com/auth/contacts.readonly";
  const gmailScope = "https://www.googleapis.com/auth/gmail.readonly";
  const hasContactsScope = account.scope?.includes(contactsScope) ?? false;
  const hasGmailScope = account.scope?.includes(gmailScope) ?? false;

  console.log(
    `[DEBUG] Google account details for user ${ctx.session.user.id}:`,
    {
      hasAccessToken: !!account.access_token,
      accessTokenLength: account.access_token?.length,
      hasRefreshToken: !!account.refresh_token,
      refreshTokenLength: account.refresh_token?.length,
      scope: account.scope,
      hasContactsScope,
      hasGmailScope,
      requiredScope,
      expiresAt: account.expires_at,
      currentTime: Math.floor(Date.now() / 1000),
      isExpired: account.expires_at
        ? account.expires_at < Math.floor(Date.now() / 1000)
        : "unknown",
      accountId: account.id,
      providerAccountId: account.providerAccountId,
    },
  );

  // Check if account has required scope
  if (requiredScope === "contacts" && !hasContactsScope) {
    console.log(
      `[DEBUG] Account missing contacts scope for user: ${ctx.session.user.id}. Current scope: ${account.scope}`,
    );
    throw new Error("GOOGLE_PERMISSIONS_INSUFFICIENT");
  }

  if (requiredScope === "gmail" && !hasGmailScope) {
    console.log(
      `[DEBUG] Account missing Gmail scope for user: ${ctx.session.user.id}. Current scope: ${account.scope}`,
    );
    throw new Error("GOOGLE_GMAIL_PERMISSIONS_INSUFFICIENT");
  }

  // 2. Set up Google API client with credentials and refresh token handling
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  console.log(
    `[DEBUG] Setting OAuth2 credentials for user: ${ctx.session.user.id}`,
  );
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Listen for token refresh events and update the database
  oauth2Client.on("tokens", (tokens) => {
    void (async () => {
      console.log(
        `[DEBUG] Google token refresh event triggered for user: ${ctx.session.user.id}`,
        {
          hasNewAccessToken: !!tokens.access_token,
          hasNewRefreshToken: !!tokens.refresh_token,
          newExpiryDate: tokens.expiry_date,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        },
      );

      const updateData: {
        access_token?: string;
        expires_at?: number;
        refresh_token?: string;
      } = {};

      if (tokens.access_token) {
        updateData.access_token = tokens.access_token;
      }
      if (tokens.expiry_date) {
        // expires_at from google is in ms, convert to seconds for db
        updateData.expires_at = Math.floor(tokens.expiry_date / 1000);
      }
      if (tokens.refresh_token) {
        // A new refresh token is sometimes issued
        updateData.refresh_token = tokens.refresh_token;
      }

      try {
        await ctx.db.account.update({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          data: updateData,
        });
        console.log(
          `[DEBUG] Successfully updated tokens in database for user: ${ctx.session.user.id}`,
        );
      } catch (error) {
        console.error(
          `[DEBUG] Failed to update tokens in database for user: ${ctx.session.user.id}`,
          error,
        );
      }
    })();
  });

  return oauth2Client;
}

// Gmail message parser helpers
function parseEmailAddress(emailString: string): {
  email: string;
  name?: string;
} {
  // Parse email from formats like: "John Doe <john@example.com>" or "john@example.com"
  const withBracketsRegex = /(.*?)<(.+?)>/;
  const simpleEmailRegex = /^(.+)$/;

  const withBracketsMatch = withBracketsRegex.exec(emailString);
  const simpleMatch = withBracketsMatch ?? simpleEmailRegex.exec(emailString);

  if (simpleMatch) {
    if (simpleMatch[2]) {
      // Has name and email
      return {
        name: simpleMatch[1]?.trim(),
        email: simpleMatch[2].trim().toLowerCase(),
      };
    } else {
      // Just email
      return {
        email: simpleMatch[1]?.trim().toLowerCase() ?? "",
      };
    }
  }

  return { email: emailString.trim().toLowerCase() };
}

function decodeBase64(data: string): string {
  // Gmail API returns base64url encoded strings (- instead of +, _ instead of /)
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function extractMessageBody(payload: gmail_v1.Schema$MessagePart): {
  text?: string;
  html?: string;
} {
  const result: { text?: string; html?: string } = {};

  // If message has parts, it's multipart
  if (payload.parts) {
    for (const part of payload.parts) {
      const mimeType = part.mimeType;

      if (mimeType === "text/plain" && part.body?.data) {
        result.text = decodeBase64(part.body.data);
      } else if (mimeType === "text/html" && part.body?.data) {
        result.html = decodeBase64(part.body.data);
      } else if (part.parts) {
        // Recursively check nested parts
        const nested = extractMessageBody(part);
        if (nested.text) result.text = nested.text;
        if (nested.html) result.html = nested.html;
      }
    }
  } else if (payload.body?.data) {
    // Simple message with single body
    const mimeType = payload.mimeType;
    const decoded = decodeBase64(payload.body.data);

    if (mimeType === "text/plain") {
      result.text = decoded;
    } else if (mimeType === "text/html") {
      result.html = decoded;
    } else {
      // Default to text
      result.text = decoded;
    }
  }

  return result;
}

function getHeaderValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string | undefined {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    undefined
  );
}

// Extract contact data from application responses
async function extractContactFromApplication(
  db: PrismaClient,
  application: {
    id: string;
    email: string;
    responses: Array<{
      questionId: string;
      answer: string;
      question: {
        id: string;
      };
    }>;
  },
) {
  // Mapping of ApplicationQuestion IDs to contact fields
  const questionMapping = {
    cmeh86ipf000guo436knsqluc: "full_name",
    cmeh86isu000muo43h8ju1wit: "twitter",
    cmeh86itn000ouo43ycs8sygw: "github",
    cmeh86iuj000quo43em4nevxd: "linkedin",
    cmeh86ive000suo43k2edx15q: "telegram",
  } as const;

  const contactData: {
    email: string;
    firstName?: string;
    lastName?: string;
    twitter?: string;
    github?: string;
    linkedIn?: string;
    telegram?: string;
  } = {
    email: application.email,
  };

  // Process each response
  for (const response of application.responses) {
    const fieldType =
      questionMapping[response.questionId as keyof typeof questionMapping];
    if (!fieldType || !response.answer?.trim()) continue;

    switch (fieldType) {
      case "full_name": {
        // Split full name into firstName and lastName
        const nameParts = response.answer.trim().split(/\s+/);
        contactData.firstName = nameParts[0] ?? "";
        contactData.lastName = nameParts.slice(1).join(" ") || "";
        break;
      }
      case "twitter": {
        // Clean Twitter handle (remove @ and URLs)
        let twitter = response.answer.trim();
        twitter = twitter.replace(/^@/, ""); // Remove leading @
        twitter = twitter.replace(/^https?:\/\/(www\.)?twitter\.com\//, ""); // Remove Twitter URL
        twitter = twitter.replace(/^https?:\/\/(www\.)?x\.com\//, ""); // Remove X.com URL
        twitter = twitter.replace(/\?.*$/, ""); // Remove query parameters
        if (twitter && !twitter.includes("/") && !twitter.includes(" ")) {
          contactData.twitter = twitter;
        }
        break;
      }
      case "github": {
        // Clean GitHub handle (remove URLs)
        let github = response.answer.trim();
        github = github.replace(/^@/, ""); // Remove leading @
        github = github.replace(/^https?:\/\/(www\.)?github\.com\//, ""); // Remove GitHub URL
        github = github.replace(/\?.*$/, ""); // Remove query parameters
        if (github && !github.includes("/") && !github.includes(" ")) {
          contactData.github = github;
        }
        break;
      }
      case "linkedin": {
        // Clean LinkedIn URL or handle
        const linkedin = response.answer.trim();
        if (linkedin.includes("linkedin.com")) {
          // Keep full LinkedIn URL
          contactData.linkedIn = linkedin;
        } else if (linkedin && !linkedin.includes(" ")) {
          // Convert handle to full URL
          contactData.linkedIn = `https://linkedin.com/in/${linkedin.replace(/^@/, "")}`;
        }
        break;
      }
      case "telegram": {
        // Clean Telegram handle
        let telegram = response.answer.trim();
        telegram = telegram.replace(/^@/, ""); // Remove leading @
        telegram = telegram.replace(/^https?:\/\/(www\.)?t\.me\//, ""); // Remove Telegram URL
        if (telegram && !telegram.includes("/") && !telegram.includes(" ")) {
          contactData.telegram = telegram;
        }
        break;
      }
    }
  }

  return contactData;
}

// Enhanced contact upserting for application data with social media fields
async function upsertContactFromApplication(
  db: PrismaClient,
  contactData: {
    email: string;
    firstName?: string;
    lastName?: string;
    twitter?: string;
    github?: string;
    linkedIn?: string;
    telegram?: string;
  },
) {
  const {
    email,
    firstName = "",
    lastName = "",
    twitter,
    github,
    linkedIn,
    telegram,
  } = contactData;

  // Find existing contact by email first, then by telegram
  let existingContact = await db.contact.findFirst({
    where: { email },
  });

  // If no email match and we have telegram, check by telegram
  if (!existingContact && telegram) {
    existingContact = await db.contact.findFirst({
      where: { telegram },
    });
  }

  // Determine sponsor from email (skip placeholder emails)
  let sponsor = null;
  if (email && !email.endsWith("@telegram.placeholder")) {
    const domain = email.substring(email.lastIndexOf("@") + 1);
    sponsor = await db.sponsor.upsert({
      where: { name: domain },
      update: {},
      create: { name: domain },
    });
  }

  if (existingContact) {
    // Update existing contact with intelligent merging
    const updateData: {
      firstName?: string;
      lastName?: string;
      twitter?: string;
      github?: string;
      linkedIn?: string;
      telegram?: string;
      email?: string;
      sponsorId?: string | null;
    } = {};

    // Only update names if we have better data (non-empty values)
    if (firstName?.trim()) updateData.firstName = firstName;
    if (lastName?.trim()) updateData.lastName = lastName;

    // Update social media fields if provided
    if (twitter?.trim()) updateData.twitter = twitter;
    if (github?.trim()) updateData.github = github;
    if (linkedIn?.trim()) updateData.linkedIn = linkedIn;
    if (telegram?.trim()) updateData.telegram = telegram;

    // Special case: if found by telegram, update email with application email
    if (
      existingContact.telegram === telegram &&
      email !== existingContact.email
    ) {
      updateData.email = email;
      updateData.sponsorId = sponsor?.id ?? null;
    }

    await db.contact.update({
      where: { id: existingContact.id },
      data: updateData,
    });

    return { created: false, updated: true, contactId: existingContact.id };
  } else {
    // Create new contact
    const newContact = await db.contact.create({
      data: {
        email,
        firstName,
        lastName,
        twitter,
        github,
        linkedIn,
        telegram,
        sponsorId: sponsor?.id ?? null,
      },
    });

    return { created: true, updated: false, contactId: newContact.id };
  }
}

async function upsertContact(
  db: PrismaClient,
  contact: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    telegram?: string;
  },
) {
  const { email, firstName = "", lastName = "", phone, telegram } = contact;

  // Need at least email or phone to create a contact
  const identifier = email ?? phone;
  if (!identifier) {
    return;
  }

  // First, check if a contact already exists by phone number (higher priority than email for duplicates)
  let existingContact = null;
  if (phone) {
    existingContact = await db.contact.findFirst({
      where: { phone },
    });
  }

  // If no phone match and we have email, check by email
  if (!existingContact && email && !email.endsWith("@telegram.placeholder")) {
    existingContact = await db.contact.findFirst({
      where: { email },
    });
  }

  // Set up sponsor if we have a real email
  let sponsor = null;
  if (email && !email.endsWith("@telegram.placeholder")) {
    const domain = email.substring(email.lastIndexOf("@") + 1);
    sponsor = await db.sponsor.upsert({
      where: { name: domain },
      update: {},
      create: { name: domain },
    });
  }

  if (existingContact) {
    // Update existing contact, merging data intelligently
    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      telegram?: string;
      email?: string;
      sponsorId?: string | null;
    } = {};

    // Only update names if we have better data (non-empty values)
    if (firstName?.trim()) updateData.firstName = firstName;
    if (lastName?.trim()) updateData.lastName = lastName;

    // Always update phone and telegram if provided
    if (phone) updateData.phone = phone;
    if (telegram) updateData.telegram = telegram;

    // Update email if we have a real email and existing is placeholder
    if (
      email &&
      !email.endsWith("@telegram.placeholder") &&
      existingContact.email?.endsWith("@telegram.placeholder")
    ) {
      updateData.email = email;
      updateData.sponsorId = sponsor?.id ?? null;
    }

    await db.contact.update({
      where: { id: existingContact.id },
      data: updateData,
    });
  } else {
    // Create new contact
    const finalEmail =
      email ?? `${phone?.replace(/\D/g, "")}@telegram.placeholder`;

    await db.contact.create({
      data: {
        email: finalEmail,
        firstName,
        lastName,
        phone,
        telegram,
        sponsorId: sponsor?.id ?? null,
      },
    });
  }
}

export const contactRouter = createTRPCRouter({
  getContacts: protectedProcedure.query(async ({ ctx }) => {
    assertStaffOrAdmin(ctx.session.user.role);
    const contacts = await ctx.db.contact.findMany({
      include: {
        sponsor: true,
      },
    });

    return contacts ?? null;
  }),

  getContact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      assertStaffOrAdmin(ctx.session.user.role);
      const contact = await ctx.db.contact.findUnique({
        where: { id: input.id },
        include: {
          sponsor: true,
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
      return contact;
    }),

  getContactCommunications: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertStaffOrAdmin(ctx.session.user.role);
      // Get the contact to find their email and telegram
      const contact = await ctx.db.contact.findUnique({
        where: { id: input.contactId },
        select: {
          email: true,
          telegram: true,
        },
      });

      if (!contact) {
        return [];
      }

      // Query communications by email or telegram username (both sent TO and FROM contact)
      const whereConditions = [];
      if (contact.email) {
        whereConditions.push({ toEmail: contact.email });
        whereConditions.push({ fromEmail: contact.email });
      }
      if (contact.telegram) {
        whereConditions.push({ toTelegram: contact.telegram });
        whereConditions.push({ fromTelegram: contact.telegram });
      }

      if (whereConditions.length === 0) {
        return [];
      }

      const communications = await ctx.db.communication.findMany({
        where: {
          OR: whereConditions,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          channel: true,
          type: true,
          status: true,
          subject: true,
          textContent: true,
          sentAt: true,
          createdAt: true,
          createdBy: true,
          fromEmail: true,
          toEmail: true,
          fromTelegram: true,
          toTelegram: true,
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return communications;
    }),

  assignContactToSponsor: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        sponsorId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffOrAdmin(ctx.session.user.role);
      const contact = await ctx.db.contact.update({
        where: { id: input.contactId },
        data: { sponsorId: input.sponsorId },
        include: {
          sponsor: true,
        },
      });
      return contact;
    }),

  removeContactFromSponsor: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertStaffOrAdmin(ctx.session.user.role);
      const contact = await ctx.db.contact.update({
        where: { id: input.contactId },
        data: { sponsorId: null },
        include: {
          sponsor: true,
        },
      });
      return contact;
    }),

  importGoogleContacts: protectedProcedure.mutation(async ({ ctx }) => {
    console.log(
      `[DEBUG] Starting Google Contacts import for user: ${ctx.session.user.id}`,
    );

    try {
      const oauth2Client = await getGoogleAuthClient(ctx, "contacts");
      console.log(
        `[DEBUG] OAuth client obtained successfully for user: ${ctx.session.user.id}`,
      );

      const people = google.people({ version: "v1", auth: oauth2Client });
      console.log(
        `[DEBUG] Google People API client created for user: ${ctx.session.user.id}`,
      );

      console.log(
        `[DEBUG] Making API request to Google People API for user: ${ctx.session.user.id}`,
      );
      const requestStart = Date.now();

      const res = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "names,emailAddresses,phoneNumbers",
        pageSize: 1000,
      });

      const requestDuration = Date.now() - requestStart;
      console.log(
        `[DEBUG] Google API request completed in ${requestDuration}ms for user: ${ctx.session.user.id}`,
      );
      console.log(
        `[DEBUG] API response status: ${res.status}, data keys: ${Object.keys(res.data ?? {}).join(", ")}`,
      );

      const connections = res.data.connections ?? [];
      console.log(
        `[DEBUG] Found ${connections.length} connections for user: ${ctx.session.user.id}`,
      );

      for (const person of connections) {
        const email = person.emailAddresses?.[0]?.value;
        if (email) {
          const phone = person.phoneNumbers?.[0]?.value;
          await upsertContact(ctx.db, {
            email,
            firstName: person.names?.[0]?.givenName ?? "",
            lastName: person.names?.[0]?.familyName ?? "",
            phone: phone ?? undefined,
          });
        }
      }

      console.log(
        `[DEBUG] Successfully imported ${connections.length} contacts for user: ${ctx.session.user.id}`,
      );
      return { count: connections.length };
    } catch (error) {
      console.error(
        `[DEBUG] Google Contacts import failed for user: ${ctx.session.user.id}:`,
        error,
      );

      // Log detailed error information
      if (error && typeof error === "object") {
        console.error(`[DEBUG] Error details:`, {
          message: (error as Error).message,
          name: (error as Error).name,
          stack: (error as Error).stack?.split("\n").slice(0, 3), // First 3 lines of stack
          code: (error as unknown as { code?: string }).code,
          status: (error as unknown as { status?: number }).status,
          response: (
            error as unknown as {
              response?: {
                status?: number;
                statusText?: string;
                data?: unknown;
              };
            }
          ).response
            ? {
                status: (error as unknown as { response: { status?: number } })
                  .response.status,
                statusText: (
                  error as unknown as { response: { statusText?: string } }
                ).response.statusText,
                data: (error as unknown as { response: { data?: unknown } })
                  .response.data,
              }
            : undefined,
        });
      }

      // Handle specific OAuth errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Check for token expiry/invalidity
        if (
          errorMessage.includes("invalid_grant") ||
          errorMessage.includes("invalid_token") ||
          errorMessage.includes("token has been expired") ||
          errorMessage.includes("token_expired")
        ) {
          // Automatically clean up invalid tokens to prevent repeated failures
          console.log(
            `[DEBUG] Cleaning up invalid Google tokens for user: ${ctx.session.user.id}`,
          );
          try {
            const deletedAccount = await ctx.db.account.deleteMany({
              where: {
                userId: ctx.session.user.id,
                provider: "google",
              },
            });
            console.log(
              `[DEBUG] Auto-cleanup: Deleted ${deletedAccount.count} invalid Google account(s) for user: ${ctx.session.user.id}`,
            );
          } catch (cleanupError) {
            console.error(
              `[DEBUG] Failed to auto-cleanup invalid tokens for user: ${ctx.session.user.id}`,
              cleanupError,
            );
          }

          throw new Error("GOOGLE_AUTH_EXPIRED");
        }

        // Check for permission/scope issues
        if (
          errorMessage.includes("insufficient permissions") ||
          errorMessage.includes("access_denied") ||
          errorMessage.includes("contacts") ||
          errorMessage.includes("scope") ||
          errorMessage.includes("403") ||
          errorMessage.includes("forbidden") ||
          errorMessage.includes("permission denied")
        ) {
          throw new Error("GOOGLE_PERMISSIONS_INSUFFICIENT");
        }
      }

      // Check for Google API error object structure
      if (typeof error === "object" && error !== null && "code" in error) {
        const apiError = error as { code?: number; status?: number };
        if (apiError.code === 403 || apiError.status === 403) {
          throw new Error("GOOGLE_PERMISSIONS_INSUFFICIENT");
        }
        if (apiError.code === 401 || apiError.status === 401) {
          throw new Error("GOOGLE_AUTH_EXPIRED");
        }
      }

      // Re-throw other errors as-is
      throw error;
    }
  }),

  importGoogleContactsFromEmails: protectedProcedure.mutation(
    async ({ ctx }) => {
      const oauth2Client = await getGoogleAuthClient(ctx, "gmail");
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const emails = new Set<string>();
      let nextPageToken: string | undefined | null = undefined;
      const emailRegex = /[\w._%+-]+@[\w.-]+\.[\w]{2,}/gi;

      do {
        const res: { data: gmail_v1.Schema$ListMessagesResponse } =
          await gmail.users.messages.list({
            userId: "me",
            pageToken: nextPageToken ?? undefined,
            maxResults: 500, // 500 is the max
          });

        const messages = res.data.messages ?? [];

        for (const message of messages) {
          if (message.id) {
            const msg = await gmail.users.messages.get({
              userId: "me",
              id: message.id,
              format: "METADATA",
              metadataHeaders: ["To", "From", "Cc", "Bcc"],
            });

            const headers = msg.data.payload?.headers;
            if (headers) {
              const emailHeaders = headers.filter((h) =>
                ["To", "From", "Cc", "Bcc"].includes(h.name ?? ""),
              );

              for (const header of emailHeaders) {
                if (header.value) {
                  const foundEmails = header.value.match(emailRegex);
                  if (foundEmails) {
                    foundEmails.forEach((e) => emails.add(e.toLowerCase()));
                  }
                }
              }
            }
          }
        }

        nextPageToken = res.data.nextPageToken;
      } while (nextPageToken);

      for (const email of emails) {
        await upsertContact(ctx.db, { email });
      }

      return { count: emails.size };
    },
  ),

  importGmailMessages: protectedProcedure
    .input(
      z.object({
        eventId: z.string().optional(), // Optional: communications can be event-agnostic
        maxMessages: z.number().min(1).max(10000).default(100),
        dateFilter: z
          .object({
            after: z.string().optional(), // Format: YYYY/MM/DD
            before: z.string().optional(), // Format: YYYY/MM/DD
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const oauth2Client = await getGoogleAuthClient(ctx, "gmail");
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      let imported = 0;
      let errors = 0;
      const errorMessages: string[] = [];

      try {
        // Build Gmail query string
        let query = "";
        if (input.dateFilter?.after) {
          query += `after:${input.dateFilter.after} `;
        }
        if (input.dateFilter?.before) {
          query += `before:${input.dateFilter.before} `;
        }

        // List messages
        const listResponse = await gmail.users.messages.list({
          userId: "me",
          maxResults: input.maxMessages,
          q: query.trim() || undefined,
        });

        const messages = listResponse.data.messages ?? [];

        // Process each message
        for (const message of messages) {
          if (!message.id) continue;

          try {
            // Fetch full message content
            const fullMessage = await gmail.users.messages.get({
              userId: "me",
              id: message.id,
              format: "full",
            });

            const payload = fullMessage.data.payload;
            if (!payload) continue;

            const headers = payload.headers;

            // Extract metadata from headers
            const fromHeader = getHeaderValue(headers, "From");
            const toHeader = getHeaderValue(headers, "To");
            const subjectHeader = getHeaderValue(headers, "Subject");
            const dateHeader = getHeaderValue(headers, "Date");

            if (!fromHeader || !toHeader) {
              errors++;
              continue;
            }

            // Parse email addresses
            const fromEmail = parseEmailAddress(fromHeader).email;
            const toEmail = parseEmailAddress(toHeader).email;

            // Extract message body
            const body = extractMessageBody(payload);
            // Convert HTML to text if plain text is not available
            const textContent =
              body.text ?? (body.html ? convertHtmlToText(body.html) : "");

            if (!textContent) {
              errors++;
              continue;
            }

            // Parse date
            let sentAt: Date | null = null;
            if (dateHeader) {
              const parsedDate = new Date(dateHeader);
              if (!isNaN(parsedDate.getTime())) {
                sentAt = parsedDate;
              }
            }

            // If no valid date from header, use internalDate from Gmail
            if (!sentAt && fullMessage.data.internalDate) {
              sentAt = new Date(parseInt(fullMessage.data.internalDate));
            }

            // Save to Communication table
            await ctx.db.communication.create({
              data: {
                channel: "EMAIL",
                type: "GENERAL",
                status: "SENT",
                fromEmail,
                toEmail,
                subject: subjectHeader ?? undefined,
                textContent,
                htmlContent: body.html ?? undefined,
                sentAt: sentAt ?? undefined,
                ...(input.eventId && { eventId: input.eventId }),
                createdBy: ctx.session.user.id,
              },
            });

            imported++;
          } catch (error) {
            errors++;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            errorMessages.push(`Message ${message.id}: ${errorMessage}`);
            console.error(`Failed to import message ${message.id}:`, error);
          }
        }

        return {
          imported,
          errors,
          total: messages.length,
          errorMessages: errorMessages.slice(0, 10), // Return first 10 errors
        };
      } catch (error) {
        console.error("Gmail import error:", error);
        throw new Error(
          `Failed to import Gmail messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  importNotionContacts: protectedProcedure.mutation(async ({ ctx }) => {
    const notionToken = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_CONTACTS_DATABASE_ID;
    if (!notionToken || !databaseId) {
      throw new Error(
        "Notion integration token or database ID not set in environment variables.",
      );
    }
    const notion = new NotionClient({ auth: notionToken });
    // Query the Notion database for contacts
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    let count = 0;
    for (const page of response.results) {
      // Extract fields from the Notion page properties
      // Adjust these property names to match your Notion database
      const properties = (page as { properties?: Record<string, unknown> })
        .properties;
      const email =
        (
          properties?.Email as {
            email?: string;
            rich_text?: Array<{ plain_text?: string }>;
          }
        )?.email ??
        (properties?.Email as { rich_text?: Array<{ plain_text?: string }> })
          ?.rich_text?.[0]?.plain_text;
      const firstName =
        (
          properties?.FirstName as {
            title?: Array<{ plain_text?: string }>;
            rich_text?: Array<{ plain_text?: string }>;
          }
        )?.title?.[0]?.plain_text ??
        (
          properties?.FirstName as {
            rich_text?: Array<{ plain_text?: string }>;
          }
        )?.rich_text?.[0]?.plain_text;
      const lastName =
        (
          properties?.LastName as {
            rich_text?: Array<{ plain_text?: string }>;
            title?: Array<{ plain_text?: string }>;
          }
        )?.rich_text?.[0]?.plain_text ??
        (properties?.LastName as { title?: Array<{ plain_text?: string }> })
          ?.title?.[1]?.plain_text;
      if (email) {
        await upsertContact(ctx.db, { email, firstName, lastName });
        count++;
      }
    }
    return { count };
  }),

  importTelegramContacts: protectedProcedure.mutation(async ({ ctx }) => {
    // Get the user's stored Telegram credentials
    const userAuth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!userAuth?.isActive) {
      throw new Error(
        "Please set up Telegram authentication first. Go to the Telegram section and click 'Set Up Telegram'.",
      );
    }

    // Check if session is expired
    if (new Date() > userAuth.expiresAt) {
      await ctx.db.telegramAuth.update({
        where: { userId: ctx.session.user.id },
        data: { isActive: false },
      });
      throw new Error(
        "Your Telegram authentication has expired. Please set up Telegram authentication again.",
      );
    }

    try {
      // Import decryption functions
      const { decryptTelegramCredentials } = await import(
        "~/server/utils/encryption"
      );

      // Decrypt user's credentials - contains everything we need
      const credentials = decryptTelegramCredentials(
        {
          encryptedSession: userAuth.encryptedSession,
          encryptedApiId: userAuth.encryptedApiId,
          encryptedApiHash: userAuth.encryptedApiHash,
          salt: userAuth.salt,
          iv: userAuth.iv,
        },
        ctx.session.user.id,
      );

      const client = new TelegramClient(
        new sessions.StringSession(credentials.sessionString),
        parseInt(credentials.apiId),
        credentials.apiHash,
        {},
      );

      // Start client with existing session
      await client.start({
        phoneNumber: async () => {
          throw new Error(
            "Session expired. Please set up Telegram authentication again.",
          );
        },
        password: async () => {
          throw new Error(
            "Session expired. Please set up Telegram authentication again.",
          );
        },
        phoneCode: async () => {
          throw new Error(
            "Session expired. Please set up Telegram authentication again.",
          );
        },
        onError: (err) => console.log(err),
      });

      // Get all contacts from Telegram
      const result = (await client.invoke(
        new Api.contacts.GetContacts({
          hash: bigInt(0),
        }),
      )) as TelegramContactsResult;

      let count = 0;
      if (result.users && Array.isArray(result.users)) {
        for (const user of result.users) {
          // Filter for valid users - not bots and marked as contacts
          const isValidUser = !user.bot && user.contact;
          if (isValidUser) {
            let firstName = user.first_name ?? "";
            const lastName = user.last_name ?? "";
            const phone = user.phone ? `+${user.phone}` : undefined;
            const telegram = user.username ?? `user_${user.id}`;

            // Fallback naming strategy: use Telegram username when names are missing
            if (
              !firstName.trim() &&
              !lastName.trim() &&
              telegram &&
              !telegram.startsWith("user_")
            ) {
              // Use username as first name for better display
              firstName = telegram;
            }

            if (phone ?? telegram) {
              await upsertContact(ctx.db, {
                firstName,
                lastName,
                phone,
                telegram,
              });
              count++;
            }
          }
        }
      }

      await client.disconnect();

      // Log successful import (with hashed user ID for privacy)
      const { hashForAudit } = await import("~/server/utils/encryption");
      console.log(
        `Successfully imported ${count} Telegram contacts for user ${hashForAudit(ctx.session.user.id)}`,
      );

      return { count };
    } catch (error) {
      console.error("Telegram import failed:", error);

      // If session is invalid, mark as inactive
      if (
        error instanceof Error &&
        (error.message.includes("SESSION_REVOKED") ||
          error.message.includes("AUTH_KEY_INVALID") ||
          error.message.includes("SESSION_EXPIRED"))
      ) {
        await ctx.db.telegramAuth.update({
          where: { userId: ctx.session.user.id },
          data: { isActive: false },
        });
        throw new Error(
          "Your Telegram session has expired or been revoked. Please set up Telegram authentication again.",
        );
      }

      throw new Error(
        `Failed to import Telegram contacts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }),

  importTelegramMessagesForContact: protectedProcedure
    .input(
      z.object({
        contactId: z.string().min(1, "Contact ID is required"),
        eventId: z.string().optional(), // Optional: communications can be event-agnostic
        maxMessages: z.number().min(1).max(500).default(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the contact to verify they have a Telegram username
      const contact = await ctx.db.contact.findUnique({
        where: { id: input.contactId },
        select: { telegram: true, firstName: true, lastName: true },
      });

      if (!contact?.telegram) {
        throw new Error("This contact does not have a Telegram username");
      }

      // Get the user's stored Telegram credentials
      const userAuth = await ctx.db.telegramAuth.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!userAuth?.isActive) {
        throw new Error("Please set up Telegram authentication first");
      }

      // Check if session is expired
      if (new Date() > userAuth.expiresAt) {
        await ctx.db.telegramAuth.update({
          where: { userId: ctx.session.user.id },
          data: { isActive: false },
        });
        throw new Error("Your Telegram authentication has expired");
      }

      try {
        // Import decryption functions
        const { decryptTelegramCredentials } = await import(
          "~/server/utils/encryption"
        );

        // Decrypt user's credentials
        const credentials = decryptTelegramCredentials(
          {
            encryptedSession: userAuth.encryptedSession,
            encryptedApiId: userAuth.encryptedApiId,
            encryptedApiHash: userAuth.encryptedApiHash,
            salt: userAuth.salt,
            iv: userAuth.iv,
          },
          ctx.session.user.id,
        );

        const client = new TelegramClient(
          new sessions.StringSession(credentials.sessionString),
          parseInt(credentials.apiId),
          credentials.apiHash,
          {},
        );

        // Start client with existing session
        await client.start({
          phoneNumber: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          password: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          phoneCode: async () => {
            throw new Error(
              "Session expired. Please set up Telegram authentication again.",
            );
          },
          onError: (err) => console.log(err),
        });

        let imported = 0;
        let errors = 0;
        const errorMessages: string[] = [];

        try {
          // Resolve the username to get the user entity
          const result = await client.invoke(
            new Api.contacts.ResolveUsername({
              username: contact.telegram.replace("@", ""),
            }),
          );

          if (!result.users?.[0]) {
            throw new Error(
              `Could not find Telegram user: @${contact.telegram}`,
            );
          }

          const telegramUser = result.users[0];

          // Get message history with this user
          const messagesResult = await client.invoke(
            new Api.messages.GetHistory({
              peer: telegramUser.id,
              limit: input.maxMessages,
              offsetId: 0,
              offsetDate: 0,
              addOffset: 0,
              maxId: 0,
              minId: 0,
              hash: bigInt(0),
            }),
          );

          if (
            "messages" in messagesResult &&
            Array.isArray(messagesResult.messages)
          ) {
            for (const msg of messagesResult.messages) {
              try {
                // Only process text messages
                if (!("message" in msg) || !msg.message) continue;

                const messageText = String(msg.message);
                const messageDate =
                  "date" in msg
                    ? new Date(Number(msg.date) * 1000)
                    : new Date();

                // Determine if message is from us or from them
                const isOutgoing = "out" in msg ? Boolean(msg.out) : false;

                // Save to Communication table
                // Note: toTelegram is the contact, direction indicated by message prefix
                await ctx.db.communication.create({
                  data: {
                    channel: "TELEGRAM",
                    type: "GENERAL",
                    status: "SENT",
                    toTelegram: contact.telegram,
                    textContent: isOutgoing
                      ? `[SENT] ${messageText}`
                      : `[RECEIVED] ${messageText}`,
                    sentAt: messageDate,
                    ...(input.eventId && { eventId: input.eventId }),
                    createdBy: ctx.session.user.id,
                  },
                });

                imported++;
              } catch (error) {
                errors++;
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                errorMessages.push(errorMessage);
                console.error(`Failed to import message:`, error);
              }
            }
          }
        } finally {
          await client.disconnect();
        }

        return {
          imported,
          errors,
          errorMessages: errorMessages.slice(0, 10),
        };
      } catch (error) {
        console.error("Telegram message import failed:", error);

        // If session is invalid, mark as inactive
        if (
          error instanceof Error &&
          (error.message.includes("SESSION_REVOKED") ||
            error.message.includes("AUTH_KEY_INVALID") ||
            error.message.includes("SESSION_EXPIRED"))
        ) {
          await ctx.db.telegramAuth.update({
            where: { userId: ctx.session.user.id },
            data: { isActive: false },
          });
          throw new Error("Your Telegram session has expired or been revoked");
        }

        throw new Error(
          `Failed to import Telegram messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  matchEventApplicants: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all applications with their responses and questions
    const applications = await ctx.db.application.findMany({
      include: {
        responses: {
          include: {
            question: true,
          },
        },
      },
    });

    let contactsCreated = 0;
    let contactsUpdated = 0;
    let errors = 0;

    for (const application of applications) {
      try {
        // Extract contact data from application
        const contactData = await extractContactFromApplication(
          ctx.db,
          application,
        );

        if (contactData) {
          // Try to match and upsert the contact
          const result = await upsertContactFromApplication(
            ctx.db,
            contactData,
          );

          if (result.created) {
            contactsCreated++;
          } else if (result.updated) {
            contactsUpdated++;
          }
        }
      } catch (error) {
        console.error(`Error processing application ${application.id}:`, error);
        errors++;
      }
    }

    console.log(
      `Match event applicants completed: ${contactsCreated} created, ${contactsUpdated} updated, ${errors} errors from ${applications.length} applications`,
    );

    return {
      applicationsProcessed: applications.length,
      contactsCreated,
      contactsUpdated,
      errors,
    };
  }),

  createContact: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z
          .string()
          .email("Please enter a valid email address")
          .optional(),
        phone: z.string().optional(),
        telegram: z.string().optional(),
        twitter: z.string().optional(),
        github: z.string().optional(),
        linkedIn: z.string().optional(),
        sponsorId: z.string().optional(),
        about: z.string().optional(),
        skills: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists (only if email is provided)
      if (input.email) {
        const existingContact = await ctx.db.contact.findFirst({
          where: { email: { equals: input.email, mode: "insensitive" } },
        });

        if (existingContact) {
          throw new Error("A contact with this email address already exists");
        }
      }

      // Clean up social media handles and URLs
      const cleanedInput = {
        ...input,
        telegram: input.telegram?.replace(/^@/, ""), // Remove @ if present
        twitter: input.twitter?.replace(/^@/, ""), // Remove @ if present
        github: input.github?.replace(/^@/, ""), // Remove @ if present
        linkedIn: input.linkedIn?.startsWith("http")
          ? input.linkedIn
          : input.linkedIn?.replace(/^@/, ""), // Keep full URLs, remove @ if present
        skills: input.skills ?? [], // Default to empty array
      };

      // Create the contact
      const contact = await ctx.db.contact.create({
        data: cleanedInput,
        include: {
          sponsor: true,
        },
      });

      return contact;
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Contact ID is required"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z
          .string()
          .email("Please enter a valid email address")
          .optional(),
        phone: z.string().optional(),
        telegram: z.string().optional(),
        twitter: z.string().optional(),
        github: z.string().optional(),
        linkedIn: z.string().optional(),
        sponsorId: z.string().optional(),
        about: z.string().optional(),
        skills: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if contact exists
      const existingContact = await ctx.db.contact.findUnique({
        where: { id: input.id },
      });

      if (!existingContact) {
        throw new Error("Contact not found");
      }

      // Check if email is being changed to an email that already exists
      if (input.email && input.email !== existingContact.email) {
        const emailInUse = await ctx.db.contact.findFirst({
          where: {
            email: input.email,
            id: { not: input.id },
          },
        });

        if (emailInUse) {
          throw new Error("A contact with this email address already exists");
        }
      }

      // Clean up social media handles and URLs
      const cleanedInput = {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        telegram: input.telegram ? input.telegram.replace(/^@/, "") : null,
        twitter: input.twitter ? input.twitter.replace(/^@/, "") : null,
        github: input.github ? input.github.replace(/^@/, "") : null,
        linkedIn: input.linkedIn?.startsWith("http")
          ? input.linkedIn
          : input.linkedIn
            ? input.linkedIn.replace(/^@/, "")
            : null,
        sponsorId: input.sponsorId ?? null,
        about: input.about ?? null,
        skills: input.skills ?? [],
      };

      // Update the contact
      const contact = await ctx.db.contact.update({
        where: { id: input.id },
        data: cleanedInput,
        include: {
          sponsor: true,
        },
      });

      return contact;
    }),

  // Disconnect Google account to force fresh authentication
  disconnectGoogleAccount: protectedProcedure.mutation(async ({ ctx }) => {
    console.log(
      `[DEBUG] Disconnecting Google account for user: ${ctx.session.user.id}`,
    );

    try {
      // Find and delete the user's Google account connection
      const deletedAccount = await ctx.db.account.deleteMany({
        where: {
          userId: ctx.session.user.id,
          provider: "google",
        },
      });

      console.log(
        `[DEBUG] Deleted ${deletedAccount.count} Google account(s) for user: ${ctx.session.user.id}`,
      );

      return {
        success: true,
        message: `Disconnected ${deletedAccount.count} Google account(s)`,
      };
    } catch (error) {
      console.error(
        `[DEBUG] Failed to disconnect Google account for user: ${ctx.session.user.id}`,
        error,
      );
      throw new Error(
        `Failed to disconnect Google account: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }),

  importGmailMessagesForContact: protectedProcedure
    .input(
      z.object({
        contactId: z.string().min(1, "Contact ID is required"),
        eventId: z.string().optional(), // Optional: communications can be event-agnostic
        maxMessages: z.number().min(1).max(10000).default(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the contact to get their email
      const contact = await ctx.db.contact.findUnique({
        where: { id: input.contactId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!contact?.email) {
        throw new Error("This contact does not have an email address");
      }

      if (contact.email.endsWith("telegram.placeholder")) {
        throw new Error(
          "Cannot import Gmail messages for a Telegram placeholder email",
        );
      }

      // Get Google OAuth client with Gmail scope
      const oauth2Client = await getGoogleAuthClient(ctx, "gmail");
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Build query to search for emails from or to this contact
      const query = `from:${contact.email} OR to:${contact.email}`;

      try {
        // List messages matching the query
        const listResponse = await gmail.users.messages.list({
          userId: "me",
          maxResults: input.maxMessages,
          q: query,
        });

        const messages = listResponse.data.messages ?? [];
        let imported = 0;
        let errors = 0;
        const errorMessages: string[] = [];

        for (const message of messages) {
          if (!message.id) continue;

          try {
            // Fetch full message content
            const fullMessage = await gmail.users.messages.get({
              userId: "me",
              id: message.id,
              format: "full",
            });

            const headers = fullMessage.data.payload?.headers;
            const fromHeader = getHeaderValue(headers, "From");
            const toHeader = getHeaderValue(headers, "To");
            const subject = getHeaderValue(headers, "Subject");
            const dateHeader = getHeaderValue(headers, "Date");

            if (!fromHeader || !toHeader) {
              errors++;
              continue;
            }

            const fromEmail = parseEmailAddress(fromHeader).email;
            const toEmail = parseEmailAddress(toHeader).email;

            // Extract message body
            const body = extractMessageBody(fullMessage.data.payload ?? {});

            // Parse date
            let sentAt: Date;
            if (dateHeader) {
              sentAt = new Date(dateHeader);
              if (isNaN(sentAt.getTime())) {
                sentAt = new Date();
              }
            } else {
              sentAt = new Date();
            }

            // Save to Communication table
            await ctx.db.communication.create({
              data: {
                channel: "EMAIL",
                type: "GENERAL",
                status: "SENT",
                fromEmail,
                toEmail,
                subject: subject ?? undefined,
                // Convert HTML to text if plain text is not available
                textContent:
                  body.text ?? (body.html ? convertHtmlToText(body.html) : ""),
                htmlContent: body.html ?? undefined,
                sentAt,
                ...(input.eventId && { eventId: input.eventId }),
                createdBy: ctx.session.user.id,
              },
            });

            imported++;
          } catch (error) {
            errors++;
            errorMessages.push(
              `Message ${message.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        return {
          imported,
          errors,
          total: messages.length,
          errorMessages: errorMessages.slice(0, 5), // Return first 5 errors
        };
      } catch (error) {
        throw new Error(
          `Failed to import Gmail messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  mergeContacts: protectedProcedure
    .input(
      z.object({
        contactIds: z
          .array(z.string())
          .min(2, "Must select at least 2 contacts to merge"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch all contacts to be merged
      const contacts = await ctx.db.contact.findMany({
        where: {
          id: { in: input.contactIds },
        },
      });

      if (contacts.length < 2) {
        throw new Error("At least 2 contacts must exist to merge");
      }

      // Determine which contact is from Telegram (email ends in "telegram.placeholder")
      const telegramContact = contacts.find((c) =>
        c.email?.endsWith("telegram.placeholder"),
      );
      const nonTelegramContact = contacts.find(
        (c) => !c.email?.endsWith("telegram.placeholder"),
      );

      // Determine the primary contact to keep
      // If there's a non-telegram contact, prefer it (so we can use its email)
      // Otherwise, use the first contact
      const primaryContact = nonTelegramContact ?? contacts[0];
      if (!primaryContact) {
        throw new Error("No primary contact found");
      }

      // Build merged data using the rules:
      // 1. Telegram contacts are canonical for telegram and phone fields
      // 2. Non-telegram email overwrites telegram.placeholder email
      // 3. Other fields: concatenate with ' - ' if they clash
      const mergedData: {
        email?: string | null;
        phone?: string | null;
        telegram?: string | null;
        firstName?: string;
        lastName?: string;
        twitter?: string | null;
        github?: string | null;
        linkedIn?: string | null;
        about?: string | null;
        skills?: string[];
      } = {};

      // Email: Use non-telegram email if available, otherwise use telegram email
      if (
        nonTelegramContact?.email &&
        !nonTelegramContact.email.endsWith("telegram.placeholder")
      ) {
        mergedData.email = nonTelegramContact.email;
      } else if (telegramContact?.email) {
        mergedData.email = telegramContact.email;
      } else {
        mergedData.email = primaryContact.email;
      }

      // Phone and Telegram: Use telegram contact values if available (canonical)
      if (telegramContact) {
        mergedData.phone = telegramContact.phone;
        mergedData.telegram = telegramContact.telegram;
      } else {
        // Merge phone numbers from all contacts
        const phones = contacts.map((c) => c.phone).filter(Boolean);
        mergedData.phone = phones.length > 0 ? phones.join(" - ") : null;

        // Merge telegram usernames from all contacts
        const telegrams = contacts.map((c) => c.telegram).filter(Boolean);
        mergedData.telegram =
          telegrams.length > 0 ? telegrams.join(" - ") : null;
      }

      // First/Last names: Concatenate if different
      const firstNames = [...new Set(contacts.map((c) => c.firstName))];
      const lastNames = [...new Set(contacts.map((c) => c.lastName))];
      mergedData.firstName = firstNames.join(" - ");
      mergedData.lastName = lastNames.join(" - ");

      // Other text fields: Concatenate unique values
      const mergeTextField = (
        field: "twitter" | "github" | "linkedIn" | "about",
      ) => {
        const values = contacts
          .map((c) => c[field])
          .filter(Boolean) as string[];
        const uniqueValues = [...new Set(values)];
        return uniqueValues.length > 0 ? uniqueValues.join(" - ") : null;
      };

      mergedData.twitter = mergeTextField("twitter");
      mergedData.github = mergeTextField("github");
      mergedData.linkedIn = mergeTextField("linkedIn");
      mergedData.about = mergeTextField("about");

      // Skills: Merge all unique skills
      const allSkills = contacts.flatMap((c) => c.skills ?? []);
      mergedData.skills = [...new Set(allSkills)];

      // Update the primary contact with merged data
      await ctx.db.contact.update({
        where: { id: primaryContact.id },
        data: mergedData,
      });

      // Delete all other contacts
      const contactsToDelete = contacts.filter(
        (c) => c.id !== primaryContact.id,
      );
      await ctx.db.contact.deleteMany({
        where: {
          id: { in: contactsToDelete.map((c) => c.id) },
        },
      });

      return {
        success: true,
        mergedContactId: primaryContact.id,
        deletedContactIds: contactsToDelete.map((c) => c.id),
        mergedCount: contacts.length,
      };
    }),
});
