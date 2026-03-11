import React from "react";
import { Section, Text, Button } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface SpeakerInvitedProps {
  speakerName: string;
  eventName: string;
  talkTitle: string;
  venueName?: string;
  invitedByName: string;
  profileUrl: string;
  faqUrl?: string;
  contactEmail: string;
}

export const SpeakerInvitedTemplate: React.FC<SpeakerInvitedProps> = ({
  speakerName,
  eventName,
  talkTitle,
  venueName,
  invitedByName,
  profileUrl,
  faqUrl,
  contactEmail,
}) => {
  const previewText = `You've been added as a speaker at ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>You&apos;ve Been Added as a Speaker</Text>

        <Text style={paragraph}>Hi {speakerName},</Text>

        <Text style={paragraph}>
          {invitedByName} has added you as a <strong>Speaker</strong> at{" "}
          <strong>{eventName}</strong>.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsHeading}>Session Details</Text>
          <Text style={detailsText}>Talk: {talkTitle}</Text>
          {venueName && <Text style={detailsText}>Floor: {venueName}</Text>}
          <Text style={detailsText}>Added by: {invitedByName}</Text>
        </Section>

        <Text style={subheading}>Next Steps</Text>

        <ol style={list}>
          <li>Review and update your speaker profile and session details</li>
          {faqUrl && (
            <li>
              Check the{" "}
              <a href={faqUrl} style={link}>
                event FAQ
              </a>{" "}
              for important details
            </li>
          )}
          <li>Mark your calendar for the event</li>
        </ol>

        <Section style={buttonContainer}>
          <Button style={button} href={profileUrl}>
            Review Your Speaker Profile
          </Button>
        </Section>

        <Text style={paragraph}>
          If you have any questions, please reach out to us at{" "}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>
        </Text>

        <Text style={paragraph}>We look forward to your session!</Text>

        <Text style={signature}>
          Best regards,
          <br />
          The {eventName} Team
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: "0 32px",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1a1a1a",
  textAlign: "center" as const,
  margin: "32px 0 24px",
};

const subheading = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "32px 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
};

const detailsBox = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const detailsHeading = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1e40af",
  margin: "0 0 16px",
};

const detailsText = {
  fontSize: "14px",
  color: "#334155",
  margin: "8px 0",
};

const list = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
  paddingLeft: "20px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
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

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default SpeakerInvitedTemplate;
