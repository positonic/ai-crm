import React from "react";
import { Section, Text, Button, Hr } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface MagicLinkProps {
  signInUrl: string;
  expirationMinutes: number;
}

export const MagicLinkTemplate: React.FC<MagicLinkProps> = ({
  signInUrl,
  expirationMinutes,
}) => {
  return (
    <BaseTemplate previewText="Sign in to Funding the Commons">
      <Section style={content}>
        <Text style={title}>Sign In to Your Account</Text>

        <Text style={text}>
          Click the button below to sign in to your Funding the Commons account.
          No password needed.
        </Text>

        <Section style={buttonContainer}>
          <Button href={signInUrl} style={button}>
            Sign In
          </Button>
        </Section>

        <Text style={text}>Or copy and paste this link into your browser:</Text>

        <Text style={linkText}>{signInUrl}</Text>

        <Hr style={hr} />

        <Text style={warning}>
          <strong>Important:</strong> This link will expire in{" "}
          {expirationMinutes} minutes for your security. If you need to sign in
          after this time, please request a new link.
        </Text>

        <Text style={helpText}>
          If you didn&apos;t request this sign-in link, you can safely ignore
          this email.
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles (consistent with passwordReset.tsx)
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
