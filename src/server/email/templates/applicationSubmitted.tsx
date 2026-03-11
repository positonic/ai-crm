import React from "react";
import { Section, Text, Button, Row, Column } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ApplicationSubmittedProps {
  applicantName: string;
  applicantFirstName?: string;
  eventName: string;
  applicationUrl: string;
  submittedAt: string;
  contactEmail?: string;
  nextSteps?: string[];
  reviewTimeline?: string;
}

export const ApplicationSubmittedTemplate: React.FC<
  ApplicationSubmittedProps
> = ({
  applicantFirstName,
  applicantName,
  eventName,
  applicationUrl,
  submittedAt,
  contactEmail,
}) => {
  const firstName = applicantFirstName ?? applicantName;
  const contact = contactEmail ?? "beth@fundingthecommons.io";
  const previewText = `We've received your speaker application for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={paragraph}>Hi {firstName},</Text>

        <Text style={paragraph}>
          Thank you for applying to speak at <strong>{eventName}</strong>.
        </Text>

        <Text style={paragraph}>
          We&apos;ve received your submission and are grateful you took the time
          to share your ideas with us. Our team is currently reviewing proposals
          and will reach out directly as we shape the program.
        </Text>

        <Section style={detailsBox}>
          <Row style={detailRow}>
            <Column style={detailLabel}>Submitted:</Column>
            <Column style={detailValue}>{submittedAt}</Column>
          </Row>
        </Section>

        <Text style={paragraph}>
          If you need to make any changes, you can update your application using
          the link below:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={applicationUrl}>
            Edit Your Application
          </Button>
        </Section>

        <Text style={paragraph}>
          If you have any questions in the meantime, feel free to reach out to{" "}
          <a href={`mailto:${contact}`} style={link}>
            <strong>{contact}</strong>
          </a>
          .
        </Text>

        <Text style={paragraph}>
          We appreciate your interest in contributing to this gathering and look
          forward to being in touch.
        </Text>

        <Text style={signature}>
          Warmly,
          <br />
          Funding the Commons
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

const detailsBox = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "16px 24px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const detailRow = {
  marginBottom: "0",
};

const detailLabel = {
  fontSize: "14px",
  color: "#64748b",
  width: "100px",
  verticalAlign: "top" as const,
};

const detailValue = {
  fontSize: "14px",
  color: "#1a1a1a",
  fontWeight: "500",
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

export default ApplicationSubmittedTemplate;
