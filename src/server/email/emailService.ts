import { render } from "@react-email/render";
import type {
  PrismaClient,
  EmailType,
  EmailStatus,
  Prisma,
} from "@prisma/client";
import { sendEmail as sendViaPostmark, type EmailAttachment } from "~/lib/email";
import { templates, type TemplateName, templateToEmailType } from "./templates";
import { captureEmailError } from "~/utils/errorCapture";
import type {
  ApplicationAcceptedProps,
  ApplicationRejectedProps,
  ApplicationWaitlistedProps,
  ApplicationSubmittedProps,
  ApplicationMissingInfoProps,
  InvitationProps,
  PasswordResetProps,
  MagicLinkProps,
  UpdateCommentNotificationProps,
  ForumCommentNotificationProps,
  AskOfferCommentNotificationProps,
  FloorOwnerAssignedProps,
  SpeakerInvitedProps,
  SlidesReminderProps,
  SessionDetailsReminderProps,
} from "./templates";

type TemplateProps =
  | ApplicationAcceptedProps
  | ApplicationRejectedProps
  | ApplicationWaitlistedProps
  | ApplicationSubmittedProps
  | ApplicationMissingInfoProps
  | InvitationProps
  | PasswordResetProps
  | MagicLinkProps
  | UpdateCommentNotificationProps
  | ForumCommentNotificationProps
  | AskOfferCommentNotificationProps
  | FloorOwnerAssignedProps
  | SpeakerInvitedProps
  | SlidesReminderProps
  | SessionDetailsReminderProps;

// Strongly typed application data interface
interface ApplicationWithUserAndEvent {
  id: string;
  eventId: string;
  userId?: string | null;
  email: string;
  applicationType?: string | null;
  user?: {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    name: string | null;
    email: string | null;
  } | null;
  event: {
    id: string;
    name: string;
    description?: string | null;
    startDate: Date;
    endDate: Date;
    location?: string | null;
    registrationUrl?: string | null;
    discountCode?: string | null;
    lumaEventId?: string | null;
    slug?: string | null;
    type: string;
  };
}

interface SendEmailParams {
  to: string;
  templateName: TemplateName;
  templateData: TemplateProps;
  applicationId?: string;
  eventId?: string;
  userId?: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export class EmailService {
  constructor(private db: PrismaClient) {}

  /**
   * Send an email using a template
   */
  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const { to, templateName, templateData, applicationId, eventId, userId } =
      params;

    try {
      // 1. Render the template
      const Template = templates[templateName];
      if (!Template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // @ts-expect-error - React Email component typing
      const html = await render(Template(templateData));
      const subject = this.getSubjectForTemplate(templateName, templateData);

      // Simple text version (you could enhance this)
      const text = this.htmlToText(html);

      // 2. Save to database for tracking
      const emailRecord = await this.db.email.create({
        data: {
          toEmail: to,
          subject,
          htmlContent: html,
          textContent: text,
          type: templateToEmailType[templateName] as EmailType,
          status: "QUEUED",
          applicationId,
          eventId,
          createdBy: userId ?? "system",
          templateName,
          templateVersion: "1.0.0",
          templateData: templateData as unknown as Prisma.InputJsonValue,
        },
      });

      // 3. Send via Postmark
      const result = await sendViaPostmark({
        to,
        subject,
        htmlContent: html,
        textContent: text,
        attachments: params.attachments,
      });

      // 4. Update status based on result
      await this.db.email.update({
        where: { id: emailRecord.id },
        data: {
          status: result.success ? "SENT" : "FAILED",
          postmarkId: result.messageId,
          sentAt: result.success ? new Date() : null,
          failureReason: result.error,
        },
      });

      return {
        success: result.success,
        emailId: emailRecord.id,
        error: result.error,
      };
    } catch (error) {
      console.error("Error sending email:", error);
      captureEmailError(error, {
        userId: userId,
        emailType: templateName,
        recipient: to,
        templateName: templateName,
      });

      // Try to save the failure to database
      try {
        await this.db.email.create({
          data: {
            toEmail: to,
            subject: "Failed to render",
            htmlContent: "",
            type: templateToEmailType[templateName] as EmailType,
            status: "FAILED",
            failureReason:
              error instanceof Error ? error.message : "Unknown error",
            applicationId,
            eventId,
            createdBy: userId ?? "system",
            templateName,
            templateData: templateData as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (dbError) {
        console.error("Failed to save email error to database:", dbError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send application status change email
   */
  async sendApplicationStatusEmail(
    application: ApplicationWithUserAndEvent,
    status: "ACCEPTED" | "REJECTED" | "WAITLISTED" | "UNDER_REVIEW",
  ) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    let templateName: TemplateName;
    let templateData: TemplateProps;

    const applicantName =
      (application.user?.firstName ?? application.user?.surname)
        ? `${application.user.firstName ?? ""} ${application.user.surname ?? ""}`.trim()
        : (application.user?.name ?? application.user?.email ?? "Applicant");
    const applicantFirstName =
      application.user?.firstName ??
      application.user?.name?.split(" ")[0] ??
      undefined;
    const applicantEmail = application.user?.email ?? application.email;

    switch (status) {
      case "ACCEPTED": {
        const eventSlug = application.event.slug ?? application.eventId;
        const startStr = application.event.startDate.toLocaleDateString(
          "en-US",
          {
            month: "long",
            day: "numeric",
            year: "numeric",
          },
        );
        const endStr = application.event.endDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        // Create Luma coupon code if the event has a Luma event ID
        let speakerCouponCode: string | undefined;
        if (application.event.lumaEventId) {
          try {
            const { getLumaService, generateSpeakerCouponCode } = await import(
              "~/server/services/luma"
            );
            const lumaService = getLumaService();
            if (lumaService) {
              const couponCode = generateSpeakerCouponCode(
                application.user?.firstName,
                application.user?.surname,
              );
              const couponResult = await lumaService.createCoupon({
                eventId: application.event.lumaEventId,
                code: couponCode,
                percentOff: 100,
                remainingCount: 2,
              });
              if (couponResult.success) {
                speakerCouponCode = couponResult.code;
              } else {
                console.error(
                  `Luma coupon creation failed for application ${application.id}: ${couponResult.error}`,
                );
              }
            }
          } catch (error) {
            console.error("Error creating Luma coupon:", error);
          }
        }

        // Look up speaker's sessions for this event
        let sessions: Array<{ title: string; url: string }> | undefined;
        if (application.userId) {
          const speakerSessions = await this.db.sessionSpeaker.findMany({
            where: {
              userId: application.userId,
              session: { eventId: application.eventId },
            },
            include: {
              session: { select: { id: true, title: true } },
            },
          });
          if (speakerSessions.length > 0) {
            sessions = speakerSessions.map((ss) => ({
              title: ss.session.title,
              url: `${baseUrl}/events/${eventSlug}/schedule/${ss.session.id}`,
            }));
          }
        }

        templateName = "applicationAccepted";
        templateData = {
          applicantName,
          applicantFirstName,
          eventName: application.event.name,
          programDates: `${startStr} – ${endStr}`,
          location: application.event.location ?? "TBD",
          dashboardUrl: `${baseUrl}/events/${eventSlug}`,
          contactEmail: process.env.ADMIN_EMAIL ?? "beth@fundingthecommons.io",
          registrationUrl: application.event.registrationUrl ?? undefined,
          speakerCouponCode,
          sessions,
          myScheduleUrl: `${baseUrl}/events/${eventSlug}/schedule?my=true`,
        } satisfies ApplicationAcceptedProps;
        break;
      }

      case "REJECTED":
        templateName = "applicationRejected";
        templateData = {
          applicantName,
          applicantFirstName,
          eventName: application.event.name,
          contactEmail: process.env.ADMIN_EMAIL ?? "beth@fundingthecommons.io",
          discountCode: application.event.discountCode ?? undefined,
          registrationUrl: application.event.registrationUrl ?? undefined,
          location: application.event.location ?? undefined,
        } satisfies ApplicationRejectedProps;
        break;

      case "WAITLISTED":
        templateName = "applicationWaitlisted";
        templateData = {
          applicantName,
          eventName: application.event.name,
        } satisfies ApplicationWaitlistedProps;
        break;

      default:
        return { success: false, error: "Unsupported status for email" };
    }

    return this.sendEmail({
      to: applicantEmail,
      templateName,
      templateData,
      applicationId: application.id,
      eventId: application.eventId,
      userId: application.userId ?? undefined,
    });
  }

  /**
   * Send update comment notification email
   */
  async sendUpdateCommentEmail(params: {
    recipientEmail: string;
    recipientName: string;
    commenterName: string;
    commentContent: string;
    updateUrl: string;
    projectTitle: string;
    eventId: string;
    commentId: string;
    updateId: string;
    projectId: string;
  }): Promise<EmailResult> {
    // Truncate comment for preview
    const commentPreview =
      params.commentContent.length > 150
        ? params.commentContent.substring(0, 150) + "..."
        : params.commentContent;

    const templateData: UpdateCommentNotificationProps = {
      recipientName: params.recipientName,
      commenterName: params.commenterName,
      commentPreview,
      updateUrl: params.updateUrl,
      projectTitle: params.projectTitle,
    };

    return this.sendEmail({
      to: params.recipientEmail,
      templateName: "updateCommentNotification",
      templateData,
      eventId: params.eventId,
      userId: undefined, // No specific user ID for this type
    });
  }

  /**
   * Send forum comment notification email
   */
  async sendForumCommentEmail(params: {
    recipientEmail: string;
    recipientName: string;
    commenterName: string;
    commentContent: string;
    threadUrl: string;
    threadTitle: string;
    isReply: boolean;
    threadId: string;
    commentId: string;
  }): Promise<EmailResult> {
    const commentPreview =
      params.commentContent.length > 150
        ? params.commentContent.substring(0, 150) + "..."
        : params.commentContent;

    const templateData: ForumCommentNotificationProps = {
      recipientName: params.recipientName,
      commenterName: params.commenterName,
      commentPreview,
      threadUrl: params.threadUrl,
      threadTitle: params.threadTitle,
      isReply: params.isReply,
    };

    return this.sendEmail({
      to: params.recipientEmail,
      templateName: "forumCommentNotification",
      templateData,
      eventId: "community", // Forum is community-wide
      userId: undefined,
    });
  }

  /**
   * Send ask/offer comment notification email
   */
  async sendAskOfferCommentEmail(params: {
    recipientEmail: string;
    recipientName: string;
    commenterName: string;
    commentContent: string;
    askOfferUrl: string;
    askOfferTitle: string;
    askOfferType: "ASK" | "OFFER";
    isReply: boolean;
    eventId?: string;
    askOfferId: string;
    commentId: string;
  }): Promise<EmailResult> {
    const commentPreview =
      params.commentContent.length > 150
        ? params.commentContent.substring(0, 150) + "..."
        : params.commentContent;

    const templateData: AskOfferCommentNotificationProps = {
      recipientName: params.recipientName,
      commenterName: params.commenterName,
      commentPreview,
      askOfferUrl: params.askOfferUrl,
      askOfferTitle: params.askOfferTitle,
      askOfferType: params.askOfferType,
      isReply: params.isReply,
    };

    return this.sendEmail({
      to: params.recipientEmail,
      templateName: "askOfferCommentNotification",
      templateData,
      eventId: params.eventId ?? "community",
      userId: undefined,
    });
  }

  /**
   * Get subject line for a template
   */
  private getSubjectForTemplate(
    templateName: TemplateName,
    data: TemplateProps,
  ): string {
    switch (templateName) {
      case "applicationAccepted":
        return `🎉 You're Confirmed as a Presenter – ${(data as ApplicationAcceptedProps).eventName}`;
      case "applicationRejected":
        return `Update on Your Speaker Application – ${(data as ApplicationRejectedProps).eventName}`;
      case "applicationWaitlisted":
        return `You're on the waitlist for ${(data as ApplicationWaitlistedProps).eventName}`;
      case "applicationSubmitted":
        return `We've Received Your Speaker Application – ${(data as ApplicationSubmittedProps).eventName}`;
      case "applicationMissingInfo":
        return `Action required: Complete your ${(data as ApplicationMissingInfoProps).eventName} application`;
      case "invitation":
        return `You're invited to join ${(data as InvitationProps).eventName}`;
      case "passwordReset":
        return "Reset your Funding the Commons password";
      case "magicLink":
        return "Sign in to Funding the Commons";
      case "updateCommentNotification":
        return `💬 New comment from ${(data as UpdateCommentNotificationProps).commenterName}`;
      case "forumCommentNotification": {
        const forumData = data as ForumCommentNotificationProps;
        return forumData.isReply
          ? `💬 ${forumData.commenterName} replied to your comment`
          : `💬 New comment on "${forumData.threadTitle}"`;
      }
      case "askOfferCommentNotification": {
        const askOfferData = data as AskOfferCommentNotificationProps;
        const typeLabel = askOfferData.askOfferType === "ASK" ? "Ask" : "Offer";
        return askOfferData.isReply
          ? `💬 ${askOfferData.commenterName} replied to your comment`
          : `💬 Someone responded to your ${typeLabel}`;
      }
      case "floorOwnerAssigned":
        return `You've been assigned as a Floor Lead for ${(data as FloorOwnerAssignedProps).eventName}`;
      case "speakerInvited":
        return `You've been added as a speaker at ${(data as SpeakerInvitedProps).eventName}`;
      case "slidesReminder":
        return `Reminder: Please upload your slides for ${(data as SlidesReminderProps).eventName}`;
      case "sessionDetailsReminder":
        return `Your session details for ${(data as SessionDetailsReminderProps).eventName}`;
      default:
        return "Notification from Funding the Commons";
    }
  }

  /**
   * Simple HTML to text converter
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Get sent emails with filters
   */
  async getSentEmails(filters?: {
    eventId?: string;
    status?: EmailStatus;
    templateName?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    return this.db.email.findMany({
      where: {
        eventId: filters?.eventId,
        status: filters?.status,
        templateName: filters?.templateName,
        createdAt: {
          gte: filters?.startDate,
          lte: filters?.endDate,
        },
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 100,
    });
  }

  /**
   * Resend a failed email
   */
  async resendEmail(emailId: string) {
    const email = await this.db.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      return { success: false, error: "Email not found" };
    }

    if (!email.templateName || !email.templateData) {
      // Legacy email without template data - send as-is
      const result = await sendViaPostmark({
        to: email.toEmail,
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent ?? undefined,
      });

      await this.db.email.update({
        where: { id: emailId },
        data: {
          status: result.success ? "SENT" : "FAILED",
          postmarkId: result.messageId,
          sentAt: result.success ? new Date() : null,
          failureReason: result.error,
        },
      });

      return result;
    }

    // Re-render and send using template
    return this.sendEmail({
      to: email.toEmail,
      templateName: email.templateName as TemplateName,
      templateData: email.templateData as unknown as TemplateProps,
      applicationId: email.applicationId ?? undefined,
      eventId: email.eventId ?? undefined,
      userId: email.createdBy,
    });
  }
}

// Export singleton instance
let emailService: EmailService | null = null;

export function getEmailService(db: PrismaClient): EmailService {
  emailService ??= new EmailService(db);
  return emailService;
}
