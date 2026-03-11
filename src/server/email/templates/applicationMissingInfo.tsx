import React from "react";
import { Section, Text, Button } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ApplicationMissingInfoProps {
  applicantName: string;
  eventName: string;
  missingFields: string[];
  applicationUrl: string;
}

export const ApplicationMissingInfoTemplate: React.FC<
  ApplicationMissingInfoProps
> = ({ applicantName, eventName, missingFields, applicationUrl }) => {
  const previewText = `Complete your ${eventName} application`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Complete Your Application</Text>

        <Text style={paragraph}>Hi {applicantName},</Text>

        <Text style={paragraph}>
          Thank you for your interest in <strong>{eventName}</strong>.
          We&apos;ve reviewed your application and noticed that some required
          information is missing.
        </Text>

        <Section style={warningBox}>
          <Text style={warningHeading}>Missing Information:</Text>
          <ul style={list}>
            {missingFields.map((field, index) => (
              <li key={index}>
                <strong>{field}</strong>
              </li>
            ))}
          </ul>
        </Section>

        <Text style={paragraph}>
          Please complete your application by providing the missing information.
          Note that the application process has been evolving, so some of these
          fields may be new since you started your application.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={applicationUrl}>
            Complete Application
          </Button>
        </Section>

        <Text style={paragraph}>
          If you have any questions, please contact us at{" "}
          <a href={`mailto:${process.env.ADMIN_EMAIL}`} style={link}>
            {process.env.ADMIN_EMAIL}
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
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1a1a1a",
  margin: "32px 0 24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
};

const warningBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const warningHeading = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#92400e",
  margin: "0 0 12px",
};

const list = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#92400e",
  margin: "8px 0",
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

export default ApplicationMissingInfoTemplate;
