import { ServerClient } from "postmark";
import { env } from "~/env";

// Email environment configuration
const EMAIL_MODE: "development" | "staging" | "production" = env.EMAIL_MODE;
const TEST_EMAIL: string | undefined = env.TEST_EMAIL_OVERRIDE;

// Check if email is configured (Postmark token available)
const isEmailConfigured = (): boolean => {
  return !!(env.POSTMARK_SERVER_TOKEN ?? env.POSTMARK_SANDBOX_TOKEN);
};

// Create appropriate Postmark client based on environment
// Returns null if no token is configured (preview/test environments)
const getPostmarkClient = (): ServerClient | null => {
  const serverToken = env.POSTMARK_SERVER_TOKEN;
  const sandboxToken = env.POSTMARK_SANDBOX_TOKEN;

  // No tokens configured - email is disabled
  if (!serverToken && !sandboxToken) {
    console.log("📧 Email disabled: No Postmark tokens configured");
    return null;
  }

  switch (EMAIL_MODE) {
    case "development":
      // Use sandbox token if available, otherwise live token with redirection
      return new ServerClient(sandboxToken ?? serverToken!);
    case "staging":
    case "production":
      if (!serverToken) {
        console.log(
          "📧 Email disabled: POSTMARK_SERVER_TOKEN required for staging/production",
        );
        return null;
      }
      return new ServerClient(serverToken);
    default:
      return new ServerClient(sandboxToken ?? serverToken!);
  }
};

const postmarkClient = getPostmarkClient();

// Safety configuration
const EMAIL_SAFETY_CONFIG = {
  useSandboxInDev: !!env.POSTMARK_SANDBOX_TOKEN,
  redirectInStaging: EMAIL_MODE === "staging",
  directSendInProd: EMAIL_MODE === "production",
  requireConfirmationInProd: EMAIL_MODE === "production",
};

export interface EmailAttachment {
  Name: string;
  Content: string; // Base64 encoded
  ContentType: string;
  ContentID?: string | null;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  messageStream?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Enhanced email sending with multiple safety layers
 *
 * Development: Uses sandbox server (black-hole) or redirects to test email
 * Staging: Redirects all emails to test email with clear labeling
 * Production: Sends to actual recipients with safety checks
 */
export async function sendEmail(
  params: SendEmailParams & {
    bypassSafety?: boolean; // Admin override for production
  },
): Promise<SendEmailResult> {
  try {
    // Check if email is configured
    if (!postmarkClient) {
      console.log("📧 Email skipped (not configured):", {
        to: params.to,
        subject: params.subject,
        reason: "No Postmark token available - likely preview/test environment",
      });
      return {
        success: true, // Return success to not break application flow
        messageId: "email-disabled-no-postmark-token",
      };
    }

    const emailMode: "development" | "staging" | "production" = EMAIL_MODE;
    const recipient = params.to;

    // Determine email handling strategy
    let finalRecipient: string;
    let subjectPrefix: string;
    let shouldAddWarningBanner: boolean;
    let warningType: string;

    switch (emailMode) {
      case "development":
        if (EMAIL_SAFETY_CONFIG.useSandboxInDev) {
          // Sandbox server - emails go to black hole (safest for dev)
          finalRecipient = recipient; // Postmark sandbox handles the black-holing
          subjectPrefix = "[DEV-SANDBOX]";
          shouldAddWarningBanner = false; // No need since it won't be delivered
          warningType = "sandbox";
        } else if (TEST_EMAIL) {
          // Redirect to test email
          finalRecipient = TEST_EMAIL;
          subjectPrefix = "[DEV]";
          shouldAddWarningBanner = true;
          warningType = "development";
        } else {
          // No test email configured - skip sending
          console.log("📧 Email skipped (dev mode, no TEST_EMAIL_OVERRIDE):", {
            to: params.to,
            subject: params.subject,
          });
          return {
            success: true,
            messageId: "email-disabled-no-test-email",
          };
        }
        break;

      case "staging":
        // Always redirect to test email in staging
        if (!TEST_EMAIL) {
          console.log(
            "📧 Email skipped (staging mode, no TEST_EMAIL_OVERRIDE):",
            {
              to: params.to,
              subject: params.subject,
            },
          );
          return {
            success: true,
            messageId: "email-disabled-no-test-email",
          };
        }
        finalRecipient = TEST_EMAIL;
        subjectPrefix = "[STAGING]";
        shouldAddWarningBanner = true;
        warningType = "staging";
        break;

      case "production":
        // Postmark account is now approved - send directly to all recipients
        finalRecipient = recipient;
        subjectPrefix = "";
        shouldAddWarningBanner = false;
        warningType = "none";
        break;

      default:
        // Fallback to safe mode - skip if no test email
        if (!TEST_EMAIL) {
          console.log(
            "📧 Email skipped (unknown mode, no TEST_EMAIL_OVERRIDE):",
            {
              to: params.to,
              subject: params.subject,
            },
          );
          return {
            success: true,
            messageId: "email-disabled-no-test-email",
          };
        }
        finalRecipient = TEST_EMAIL;
        subjectPrefix = "[UNKNOWN-MODE]";
        shouldAddWarningBanner = true;
        warningType = "fallback";
    }

    // Log email routing for debugging
    console.log("📧 Email routing:", {
      mode: emailMode,
      originalRecipient: recipient,
      finalRecipient,
      subjectPrefix,
      warningType,
      usingSandbox:
        EMAIL_SAFETY_CONFIG.useSandboxInDev && emailMode === "development",
    });

    // Prepare final content
    const finalSubject = subjectPrefix
      ? `${subjectPrefix} ${params.subject} - Original: ${recipient}`
      : params.subject;

    const finalHtmlContent = shouldAddWarningBanner
      ? `
      <div style="border: 2px solid #${getWarningColor(warningType)}; padding: 16px; margin-bottom: 16px; background-color: #${getWarningBgColor(warningType)}; border-radius: 4px;">
        <strong>⚠️ ${getWarningTitle(warningType)}:</strong> This email was originally intended for <strong>${recipient}</strong> but has been redirected ${getWarningReason(warningType)}.
        ${getWarningDetails(warningType)}
      </div>
      ${params.htmlContent}
    `
      : params.htmlContent;

    const finalTextContent =
      params.textContent ??
      (shouldAddWarningBanner
        ? `${getWarningTitle(warningType)}: This email was originally intended for ${recipient} but has been redirected ${getWarningReason(warningType)}.\n\n${stripHtml(params.htmlContent)}`
        : stripHtml(params.htmlContent));

    const response = await postmarkClient.sendEmail({
      From: `Funding the Commons <${env.ADMIN_EMAIL}>`,
      To: finalRecipient,
      Subject: finalSubject,
      HtmlBody: finalHtmlContent,
      TextBody: finalTextContent,
      MessageStream: params.messageStream ?? "outbound",
      Attachments: params.attachments?.map((a) => ({
        Name: a.Name,
        Content: a.Content,
        ContentType: a.ContentType,
        ContentID: a.ContentID ?? null,
      })),
    });

    return {
      success: true,
      messageId: response.MessageID,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Warning message helpers for different email redirection scenarios
 */
function getWarningColor(warningType: string): string {
  switch (warningType) {
    case "development":
      return "ff6b6b";
    case "staging":
      return "ffa500";
    case "production-redirect":
      return "ff9800";
    case "sandbox":
      return "2196f3";
    default:
      return "666666";
  }
}

function getWarningBgColor(warningType: string): string {
  switch (warningType) {
    case "development":
      return "ffe6e6";
    case "staging":
      return "fff3cd";
    case "production-redirect":
      return "fff8e1";
    case "sandbox":
      return "e3f2fd";
    default:
      return "f5f5f5";
  }
}

function getWarningTitle(warningType: string): string {
  switch (warningType) {
    case "development":
      return "DEVELOPMENT MODE";
    case "staging":
      return "STAGING MODE";
    case "production-redirect":
      return "PRODUCTION REDIRECT";
    case "sandbox":
      return "SANDBOX MODE";
    default:
      return "TEST MODE";
  }
}

function getWarningReason(warningType: string): string {
  switch (warningType) {
    case "development":
      return "for safe development testing";
    case "staging":
      return "for staging environment testing";
    case "production-redirect":
      return "due to external domain safety restrictions";
    case "sandbox":
      return "via Postmark sandbox server";
    default:
      return "for testing purposes";
  }
}

function getWarningDetails(warningType: string): string {
  switch (warningType) {
    case "development":
      return "<br><br><strong>Safe Testing:</strong> This is your development environment - no real emails will be sent.";
    case "staging":
      return "<br><br><strong>Staging Test:</strong> This is your staging environment for testing before production.";
    case "production-redirect":
      return "<br><br><strong>Safety First:</strong> External domain emails are redirected until Postmark account approval.";
    case "sandbox":
      return "<br><br><strong>Sandbox Server:</strong> Using Postmark sandbox - emails are safely black-holed.";
    default:
      return "";
  }
}

/**
 * Simple HTML to text converter for fallback text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/&amp;/g, "&") // Replace HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Check if email sending is enabled (Postmark is configured)
 */
export function isEmailEnabled(): boolean {
  return isEmailConfigured();
}

/**
 * Check if email sending is safe for the current environment
 */
export function isEmailSendingSafe(): {
  safe: boolean;
  reason: string;
  mode: string;
  enabled: boolean;
} {
  const mode: "development" | "staging" | "production" = EMAIL_MODE;
  const enabled = isEmailConfigured();

  if (!enabled) {
    return {
      safe: true,
      reason: "Email disabled - no Postmark token configured",
      mode,
      enabled: false,
    };
  }

  switch (mode) {
    case "development":
      return {
        safe: true,
        reason: EMAIL_SAFETY_CONFIG.useSandboxInDev
          ? "Using Postmark sandbox server (black-hole)"
          : TEST_EMAIL
            ? "Redirecting to test email"
            : "Email disabled - no test email configured",
        mode: "development",
        enabled,
      };
    case "staging":
      return {
        safe: true,
        reason: TEST_EMAIL
          ? "All emails redirected to test address"
          : "Email disabled - no test email configured",
        mode: "staging",
        enabled,
      };
    case "production":
      return {
        safe: false,
        reason: "Production mode - emails go to real recipients",
        mode: "production",
        enabled,
      };
    default:
      return {
        safe: true,
        reason: "Unknown mode - defaulting to safe redirection",
        mode: "unknown",
        enabled,
      };
  }
}

/**
 * Generate email content for missing application information
 */
export function generateMissingInfoEmail(params: {
  applicantName: string;
  eventName: string;
  eventId: string;
  missingFields: string[];
  applicationUrl: string;
}): { subject: string; htmlContent: string; textContent: string } {
  const { applicantName, eventName, eventId, missingFields, applicationUrl } =
    params;

  const subject = `Complete Your Application for ${eventName}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        Complete Your Application
      </h2>
      
      <p>Hi ${applicantName},</p>
      
      <p>Thank you for your interest in <strong>${eventName}</strong>. We've reviewed your application and noticed that some required information is missing.</p>
      
      <p>Please note that the application process has been evolving so it may be that some of these fields were missing from the original application form. We apologise for any inconvenience and thank you for your patience while we process your application.</p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">Missing Information:</h3>
        <ul style="margin-bottom: 0;">
          ${missingFields.map((field) => `<li><strong>${formatFieldName(field)}</strong></li>`).join("")}
        </ul>
      </div>
      
      <p>To complete your application, please:</p>
      <ol>
        <li>Click the link below to access your application</li>
        <li>Fill in the missing information listed above</li>
        <li>Submit your updated application</li>
      </ol>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${applicationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Application
        </a>
      </div>
      
      <p>If you have any questions or need assistance, please visit our <a href="/events/${eventId}/faq" style="color: #007bff; text-decoration: none;">FAQ page</a> or don't hesitate to reach out to us.</p>
      
      <p>Best regards,<br>
      The ${eventName} Team</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this email because you started an application for ${eventName}. 
        If you no longer wish to receive these emails, please contact us.
      </p>
    </div>
  `;

  const textContent = `
Complete Your Application for ${eventName}

Hi ${applicantName},

Thank you for your interest in ${eventName}. We've reviewed your application and noticed that some required information is missing.

Please note that the application process has been evolving so it may be that some of these fields were missing from the original application form. We apologise for any inconvenience and thank you for your patience in processing your application.

Missing Information:
${missingFields.map((field) => `- ${formatFieldName(field)}`).join("\n")}

To complete your application, please:
1. Visit: ${applicationUrl}
2. Fill in the missing information listed above
3. Submit your updated application

If you have any questions or need assistance, please visit our FAQ page at /events/${eventId}/faq or don't hesitate to reach out to us.

Best regards,
The ${eventName} Team

---
You received this email because you started an application for ${eventName}. 
If you no longer wish to receive these emails, please contact us.
  `;

  return { subject, htmlContent, textContent };
}

/**
 * Format field names for display in emails
 */
function formatFieldName(fieldKey: string): string {
  return fieldKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Generate email content for event invitations
 */
export function generateInvitationEmail(params: {
  inviteeName?: string;
  email: string;
  eventName: string;
  eventDescription: string;
  roleName: string;
  inviterName: string;
  signupUrl: string;
  invitationToken: string;
  expiresAt: Date;
}): { subject: string; htmlContent: string; textContent: string } {
  const {
    inviteeName,
    email,
    eventName,
    eventDescription,
    roleName,
    inviterName,
    signupUrl,
    invitationToken,
    expiresAt,
  } = params;

  const tokenSeparator = signupUrl.includes("?") ? "&" : "?";
  const signupWithTokenUrl = `${signupUrl}${tokenSeparator}invitation=${invitationToken}`;
  const displayName = inviteeName ?? email.split("@")[0];
  const expirationDate = expiresAt.toLocaleDateString();

  const subject = `You're Invited: Join ${eventName} as ${roleName}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">You're Invited!</h1>
        <div style="height: 3px; background: linear-gradient(90deg, #007bff, #28a745); margin: 10px auto; width: 100px;"></div>
      </div>
      
      <p>Hi ${displayName},</p>
      
      <p>${inviterName} has invited you to join <strong>${eventName}</strong> as a <strong style="color: #007bff;">${roleName}</strong>.</p>
      
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">${eventName}</h3>
        <p style="color: #666; margin-bottom: 0;">${eventDescription}</p>
      </div>
      
      <div style="background-color: #e3f2fd; border-left: 4px solid #007bff; padding: 15px; margin: 25px 0;">
        <h4 style="color: #1976d2; margin-top: 0; margin-bottom: 10px;">Your Role: ${roleName}</h4>
        <p style="margin-bottom: 0; color: #555;">You'll have special access and permissions for this event.</p>
      </div>
      
      <p><strong>What's next?</strong></p>
      <ol style="color: #555;">
        <li>Click the button below to create your account or sign in</li>
        <li>Your role will be automatically assigned when you sign up</li>
        <li>You'll get access to ${roleName}-specific features and areas</li>
      </ol>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${signupWithTokenUrl}" 
           style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 12px; margin: 25px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⏰ This invitation expires on ${expirationDate}.</strong> 
          Make sure to accept it before then!
        </p>
      </div>
      
      <p>If you have any questions about this invitation or the event, feel free to reach out to ${inviterName} or our support team.</p>
      
      <p>Looking forward to having you as part of ${eventName}!</p>
      
      <p>Best regards,<br>
      The ${eventName} Team</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this invitation because ${inviterName} thought you'd be a great ${roleName} for ${eventName}. 
        If you believe this was sent in error, please ignore this email.
        <br><br>
        Invitation link: <a href="${signupWithTokenUrl}" style="color: #007bff; text-decoration: none;">${signupWithTokenUrl}</a>
      </p>
    </div>
  `;

  const textContent = `
You're Invited: Join ${eventName} as ${roleName}

Hi ${displayName},

${inviterName} has invited you to join ${eventName} as a ${roleName}.

About the Event:
${eventName}
${eventDescription}

Your Role: ${roleName}
You'll have special access and permissions for this event.

What's next?
1. Click the link below to create your account or sign in
2. Your role will be automatically assigned when you sign up
3. You'll get access to ${roleName}-specific features and areas

Accept your invitation:
${signupWithTokenUrl}

⏰ This invitation expires on ${expirationDate}. Make sure to accept it before then!

If you have any questions about this invitation or the event, feel free to reach out to ${inviterName} or our support team.

Looking forward to having you as part of ${eventName}!

Best regards,
The ${eventName} Team

---
You received this invitation because ${inviterName} thought you'd be a great ${roleName} for ${eventName}. 
If you believe this was sent in error, please ignore this email.

Invitation link: ${signupWithTokenUrl}
  `;

  return { subject, htmlContent, textContent };
}

/**
 * Generate email content for global admin invitations
 */
export function generateGlobalAdminInvitationEmail(params: {
  inviteeName?: string;
  email: string;
  globalRole: string;
  inviterName: string;
  signupUrl: string;
  invitationToken: string;
  expiresAt: Date;
}): { subject: string; htmlContent: string; textContent: string } {
  const {
    inviteeName,
    email,
    globalRole,
    inviterName,
    signupUrl,
    invitationToken,
    expiresAt,
  } = params;

  const tokenSeparator = signupUrl.includes("?") ? "&" : "?";
  const signupWithTokenUrl = `${signupUrl}${tokenSeparator}invitation=${invitationToken}`;
  const displayName = inviteeName ?? email.split("@")[0];
  const expirationDate = expiresAt.toLocaleDateString();
  const roleDisplayName =
    globalRole === "admin" ? "Administrator" : "Staff Member";

  const subject = `Platform Admin Invitation - Join as ${roleDisplayName}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin-bottom: 10px;">🔑 Admin Invitation</h1>
        <div style="height: 3px; background: linear-gradient(90deg, #dc2626, #ea580c); margin: 10px auto; width: 120px;"></div>
      </div>
      
      <p>Hi ${displayName},</p>
      
      <p>${inviterName} has invited you to join <strong>Funding the Commons</strong> as a <strong style="color: #dc2626;">Platform ${roleDisplayName}</strong>.</p>
      
      <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #991b1b; margin-top: 0; margin-bottom: 15px;">🛡️ ${roleDisplayName} Access</h3>
        <p style="color: #7f1d1d; margin-bottom: 0;">
          ${
            globalRole === "admin"
              ? "You'll have full administrative access to the entire platform, including user management, event creation, and system configuration."
              : "You'll have staff-level access to manage events, applications, and user interactions across the platform."
          }
        </p>
      </div>
      
      <p><strong>Your responsibilities will include:</strong></p>
      <ul style="color: #555;">
        ${
          globalRole === "admin"
            ? "<li>Managing platform users and permissions</li><li>Creating and configuring events</li><li>Overseeing all platform operations</li><li>System administration and settings</li>"
            : "<li>Managing event applications and participants</li><li>Coordinating with sponsors and mentors</li><li>Supporting event operations</li><li>Assisting with user inquiries</li>"
        }
      </ul>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${signupWithTokenUrl}" 
           style="background: linear-gradient(90deg, #dc2626, #ea580c); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
          Accept Admin Invitation
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 25px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⏰ This invitation expires on ${expirationDate}.</strong> 
          Please accept it promptly to gain admin access.
        </p>
      </div>
      
      <p>This is a privileged invitation with administrative responsibilities. If you have any questions about your role or the platform, feel free to reach out to ${inviterName}.</p>
      
      <p>We're excited to have you join our administrative team!</p>
      
      <p>Best regards,<br>
      ${inviterName}<br>
      <em>Funding the Commons Platform</em></p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #666;">
        You received this administrative invitation because ${inviterName} believes you'd be an excellent ${roleDisplayName} for our platform. 
        This invitation grants privileged access - please keep your account secure.
        <br><br>
        Invitation link: <a href="${signupWithTokenUrl}" style="color: #dc2626; text-decoration: none;">${signupWithTokenUrl}</a>
      </p>
    </div>
  `;

  const textContent = `
Platform Admin Invitation - Join as ${roleDisplayName}

Hi ${displayName},

${inviterName} has invited you to join Funding the Commons as a Platform ${roleDisplayName}.

${roleDisplayName} Access:
${
  globalRole === "admin"
    ? "You'll have full administrative access to the entire platform, including user management, event creation, and system configuration."
    : "You'll have staff-level access to manage events, applications, and user interactions across the platform."
}

Your responsibilities will include:
${
  globalRole === "admin"
    ? "- Managing platform users and permissions\n- Creating and configuring events\n- Overseeing all platform operations\n- System administration and settings"
    : "- Managing event applications and participants\n- Coordinating with sponsors and mentors\n- Supporting event operations\n- Assisting with user inquiries"
}

Accept your admin invitation:
${signupWithTokenUrl}

⏰ This invitation expires on ${expirationDate}. Please accept it promptly to gain admin access.

This is a privileged invitation with administrative responsibilities. If you have any questions about your role or the platform, feel free to reach out to ${inviterName}.

We're excited to have you join our administrative team!

Best regards,
${inviterName}
Funding the Commons Platform

---
You received this administrative invitation because ${inviterName} believes you'd be an excellent ${roleDisplayName} for our platform. 
This invitation grants privileged access - please keep your account secure.

Invitation link: ${signupWithTokenUrl}
  `;

  return { subject, htmlContent, textContent };
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(params: {
  email: string;
  inviteeName?: string;
  eventName: string;
  eventDescription: string;
  roleName: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: Date;
  eventId?: string;
  isGlobalRole?: boolean;
  globalRole?: string;
  signupUrl?: string;
}): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const signupUrl =
    params.signupUrl ??
    (params.eventId
      ? `${baseUrl}/events/${params.eventId}/${params.roleName.toLowerCase()}`
      : `${baseUrl}/auth/register`);

  let emailContent;

  if (params.isGlobalRole && params.globalRole) {
    emailContent = generateGlobalAdminInvitationEmail({
      ...params,
      globalRole: params.globalRole,
      signupUrl,
    });
  } else {
    emailContent = generateInvitationEmail({
      ...params,
      signupUrl,
    });
  }

  return sendEmail({
    to: params.email,
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
    textContent: emailContent.textContent,
  });
}

/**
 * Test email connectivity
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email Connection",
      htmlContent:
        "<p>This is a test email to verify Postmark configuration.</p>",
    });
    return result.success;
  } catch (error) {
    console.error("Email connection test failed:", error);
    return false;
  }
}
