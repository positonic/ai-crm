import React from "react";
import { Section, Text, Button, Img, Hr } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface SessionDetailsReminderProps {
  speakerName: string;
  eventName: string;
  sessionTitle: string;
  sessionUrl: string;
  contactEmail: string;
  sessionDate?: string;
  sessionTime?: string;
  venueName?: string;
  roomName?: string;
  speakerCouponCode?: string;
  scheduleUrl?: string;
  signinUrl?: string;
  signinScreenshotUrl?: string;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
}

export const SessionDetailsReminderTemplate: React.FC<
  SessionDetailsReminderProps
> = ({
  speakerName,
  eventName,
  sessionTitle,
  sessionUrl,
  contactEmail,
  sessionDate,
  sessionTime,
  venueName,
  roomName,
  speakerCouponCode,
  scheduleUrl,
  signinUrl,
  signinScreenshotUrl,
  googleCalendarUrl,
  outlookCalendarUrl,
}) => {
  const previewText = `Your session details for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={paragraph}>Hi {speakerName},</Text>

        <Text style={paragraph}>
          Thank you for your patience as we finalize the agenda for{" "}
          <strong>{eventName}</strong>:{" "}
          <a
            href="https://www.fundingthecommons.io/ftc-frontiertower"
            style={link}
          >
            Funding the Commons Vertical Festival
          </a>
        </Text>

        <Text style={paragraph}>
          The event will take place at Frontier Tower in San Francisco from March
          14&ndash;15, 2026 (9am Saturday &ndash; 11pm Sunday).
        </Text>

        <Text style={paragraph}>
          Most information you need is below, in this deck:{" "}
          <a href="https://docsend.com/view/7b5zif62z3gvsxdp" style={link}>
            https://docsend.com/view/7b5zif62z3gvsxdp
          </a>
        </Text>

        <Text style={paragraph}>
          and on our Luma page:{" "}
          <a href="https://luma.com/ftc-sf-2026" style={link}>
            https://luma.com/ftc-sf-2026
          </a>
        </Text>

        <Text style={paragraph}>
          If you have any questions, feel free to email{" "}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>
          .
        </Text>

        <Hr style={divider} />

        {/* Your Session Information */}
        <Text style={sectionHeading}>Your Session Information</Text>

        <Section style={detailsBox}>
          <Text style={detailsText}>
            <strong>Session:</strong> {sessionTitle}
          </Text>
          {sessionDate && (
            <Text style={detailsText}>
              <strong>Date:</strong> {sessionDate}
            </Text>
          )}
          {sessionTime && (
            <Text style={detailsText}>
              <strong>Time:</strong> {sessionTime}
            </Text>
          )}
          {venueName && (
            <Text style={detailsText}>
              <strong>Floor:</strong> {venueName}
            </Text>
          )}
          {roomName && (
            <Text style={detailsText}>
              <strong>Room:</strong> {roomName}
            </Text>
          )}
        </Section>

        {(googleCalendarUrl ?? outlookCalendarUrl) && (
          <Section style={calendarLinks}>
            <Text style={calendarLinksText}>
              <strong>Add to your calendar:</strong>{" "}
              {googleCalendarUrl && (
                <a href={googleCalendarUrl} style={link}>
                  Google Calendar
                </a>
              )}
              {googleCalendarUrl && outlookCalendarUrl && " · "}
              {outlookCalendarUrl && (
                <a href={outlookCalendarUrl} style={link}>
                  Outlook
                </a>
              )}
            </Text>
            <Text style={calendarNote}>
              A calendar file (.ics) is also attached to this email.
            </Text>
          </Section>
        )}

        <Hr style={divider} />

        {/* Agenda */}
        <Text style={sectionHeading}>Agenda</Text>

        <Text style={paragraph}>
          You can view the agenda here:{" "}
          {scheduleUrl ? (
            <a href={scheduleUrl} style={link}>
              {scheduleUrl}
            </a>
          ) : (
            "the event schedule page"
          )}
        </Text>

        <Text style={paragraph}>
          Right now the system may show your name as the talk title and the talk
          summary may be empty if your profile has not yet been updated.
        </Text>

        <Text style={paragraph}>
          Please update your profile using the instructions below, or email that
          information to{" "}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>{" "}
          as soon as possible so we can publish it on the website:{" "}
          <a
            href="https://www.fundingthecommons.io/ftc-frontiertower"
            style={link}
          >
            https://www.fundingthecommons.io/ftc-frontiertower
          </a>
        </Text>

        <Hr style={divider} />

        {/* Presenter Profile */}
        <Text style={sectionHeading}>Presenter Profile</Text>

        <Text style={paragraph}>
          Thank you for your patience with our speaker management software. We
          are currently testing in production with the FtC custom platform, so
          things may occasionally be a bit janky. If you run into any issues,
          please let us know and we&apos;ll help you out.
        </Text>

        <Text style={paragraph}>
          Complete your presenter profile here:{" "}
          {signinUrl ? (
            <a href={signinUrl} style={link}>
              {signinUrl}
            </a>
          ) : (
            "the platform sign-in page"
          )}
        </Text>

        <Text style={paragraph}>
          Your profile may already be partially filled out. Please feel free to
          remove, change, or add anything.
        </Text>

        <Text style={paragraph}>
          To check whether a profile already exists, go to:{" "}
          {signinUrl ? (
            <a href={signinUrl} style={link}>
              {signinUrl}
            </a>
          ) : (
            "the platform sign-in page"
          )}
        </Text>

        <Text style={paragraph}>
          Then select &ldquo;Sign in with email link instead.&rdquo;
        </Text>

        {signinScreenshotUrl && (
          <Section style={screenshotContainer}>
            <Img
              src={signinScreenshotUrl}
              alt="Screenshot showing the 'Sign in with email link instead' option on the sign-in page"
              width="400"
              style={screenshotImg}
            />
          </Section>
        )}

        <Text style={paragraph}>
          If we already created a profile for you, the system will send a
          sign-in link to the email address you&apos;re reading this on. If not,
          please create a new account.
        </Text>

        <Text style={paragraph}>
          If you don&apos;t have time to complete your profile yet, please email
          your session title, headshot, and preferred name + organization to{" "}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>{" "}
          so we can list you on the website and agenda.
        </Text>

        <Hr style={divider} />

        {/* Uploading Your Slides */}
        <Text style={sectionHeading}>Uploading Your Slides</Text>

        <Text style={paragraph}>
          Due to our A/V setup, it will not be possible to plug in your own
          computer.
        </Text>

        <Text style={paragraph}>
          If you are using slides, please upload or share them with us ahead of
          your talk.
        </Text>

        <Text style={paragraph}>
          If you are participating in a fireside chat or panel, slides are not
          required.
        </Text>

        <Text style={paragraph}>
          Upload or share a link to your slides here:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={sessionUrl}>
            Upload Your Slides
          </Button>
        </Section>

        <Text style={paragraph}>
          If you experience any issues uploading slides to your profile, you can
          email them to{" "}
          <a href="mailto:events@fundingthecommons.io" style={link}>
            events@fundingthecommons.io
          </a>{" "}
          and we will ensure they are ready for your session.
        </Text>

        {speakerCouponCode && (
          <>
            <Hr style={divider} />

            {/* Presenter Ticket Codes */}
            <Text style={sectionHeading}>Presenter Ticket Codes</Text>

            <Text style={paragraph}>
              Please use the presenter ticket codes below for yourself and your
              community:
            </Text>

            <Section style={couponBox}>
              <Text style={couponCodeStyle}>{speakerCouponCode}</Text>
              <Text style={couponNote}>
                This code provides complimentary access (2 uses).
              </Text>
            </Section>

            <Text style={paragraph}>
              Register using these codes here:{" "}
              <a href="https://luma.com/ftc-sf-2026" style={link}>
                https://luma.com/ftc-sf-2026
              </a>
            </Text>
          </>
        )}

        <Hr style={divider} />

        <Text style={paragraph}>
          If you have any questions about the event or need support with the
          website, please reply to this email or contact{" "}
          <a href="mailto:events@fundingthecommons.io" style={link}>
            events@fundingthecommons.io
          </a>
          .
        </Text>

        <Text style={paragraph}>
          We look forward to seeing you very soon.
        </Text>

        <Text style={signature}>
          Warmly,
          <br />
          <br />
          Beth, David, and the Funding the Commons Team
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: "0 32px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
};

const sectionHeading = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "24px 0 12px",
};

const detailsBox = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "24px",
  margin: "16px 0",
  border: "1px solid #bfdbfe",
};

const detailsText = {
  fontSize: "15px",
  color: "#334155",
  margin: "8px 0",
};

const calendarLinks = {
  textAlign: "center" as const,
  margin: "12px 0 0",
};

const calendarLinksText = {
  fontSize: "15px",
  color: "#334155",
  margin: "0",
};

const calendarNote = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "4px 0 0",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const couponBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  margin: "16px 0",
  border: "1px solid #86efac",
  textAlign: "center" as const,
};

const couponCodeStyle = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#166534",
  letterSpacing: "2px",
  fontFamily: "monospace, Courier New",
  margin: "0 0 8px",
};

const couponNote = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
};

const screenshotContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const screenshotImg = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  maxWidth: "100%",
};

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default SessionDetailsReminderTemplate;
