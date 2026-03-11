import React from "react";
import { Section, Text, Button, Hr } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface PasswordResetProps {
  userName: string;
  resetUrl: string;
  expirationMinutes: number;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({
  userName,
  resetUrl,
  expirationMinutes,
}) => {
  return (
    <BaseTemplate previewText="Reset your Funding the Commons password">
      <Section style={content}>
        <Text style={title}>Password Reset Request</Text>

        <Text style={text}>Hi {userName},</Text>

        <Text style={text}>
          We received a request to reset your password for your Funding the
          Commons account. If you didn&apos;t make this request, you can safely
          ignore this email.
        </Text>

        <Text style={text}>
          To reset your password, click the button below:
        </Text>

        <Section style={buttonContainer}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>

        <Text style={text}>Or copy and paste this link into your browser:</Text>

        <Text style={linkText}>{resetUrl}</Text>

        <Hr style={hr} />

        <Text style={warning}>
          <strong>Important:</strong> This link will expire in{" "}
          {expirationMinutes} minutes for your security. If you need to reset
          your password after this time, please request a new reset link.
        </Text>

        <Text style={helpText}>
          If you&apos;re having trouble with the button above, copy and paste
          the URL into your web browser.
        </Text>

        <Text style={helpText}>
          If you didn&apos;t request this password reset, please ignore this
          email or contact our support team if you have concerns about your
          account security.
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: "32px",
};

const title = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0 0 24px 0",
  textAlign: "center" as const,
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#374151",
  margin: "0 0 16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  lineHeight: "1",
};

const linkText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  wordBreak: "break-all" as const,
  margin: "0 0 24px 0",
  padding: "12px",
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  border: "1px solid #e5e7eb",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const warning = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#dc2626",
  margin: "0 0 16px 0",
  padding: "12px",
  backgroundColor: "#fef2f2",
  borderRadius: "6px",
  border: "1px solid #fecaca",
};

const helpText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0 0 8px 0",
};
