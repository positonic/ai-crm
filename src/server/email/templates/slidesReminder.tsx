import React from "react";
import { Section, Text, Button } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface SlidesReminderProps {
  speakerName: string;
  eventName: string;
  sessionTitle: string;
  sessionUrl: string;
  contactEmail: string;
  sessionDate?: string;
  sessionTime?: string;
  speakerCouponCode?: string;
}

export const SlidesReminderTemplate: React.FC<SlidesReminderProps> = ({
  speakerName,
  eventName,
  sessionTitle,
  sessionUrl,
  contactEmail,
  sessionDate,
  sessionTime,
  speakerCouponCode,
}) => {
  const previewText = `Reminder: Please upload your slides for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Slides Upload Reminder</Text>

        <Text style={paragraph}>Hi {speakerName},</Text>

        <Text style={paragraph}>
          We&apos;re reaching out to remind you to upload your presentation
          slides for your upcoming session at <strong>{eventName}</strong>.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsHeading}>Session Details</Text>
          <Text style={detailsText}>Session: {sessionTitle}</Text>
          {sessionDate && <Text style={detailsText}>Date: {sessionDate}</Text>}
          {sessionTime && <Text style={detailsText}>Time: {sessionTime}</Text>}
          <Text style={detailsText}>Event: {eventName}</Text>
        </Section>

        {speakerCouponCode && (
          <Section style={couponBox}>
            <Text style={couponHeading}>
              Your Complimentary Presenter Registration Code
            </Text>
            <Text style={couponCodeStyle}>{speakerCouponCode}</Text>
            <Text style={couponNote}>
              This code provides complimentary access (2 uses).
            </Text>
          </Section>
        )}

        <Text style={paragraph}>
          Please upload your slides by visiting your session page using the
          button below. You can upload PDF, PowerPoint, or other presentation
          files (up to 50MB).
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={sessionUrl}>
            Upload Your Slides
          </Button>
        </Section>

        <Text style={paragraph}>
          If you have any questions, please reach out to us at{" "}
          <a href={`mailto:${contactEmail}`} style={link}>
            {contactEmail}
          </a>
        </Text>

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

const couponBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #86efac",
  textAlign: "center" as const,
};

const couponHeading = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#15803d",
  margin: "0 0 12px",
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

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default SlidesReminderTemplate;
