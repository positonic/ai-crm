import React from "react";
import { Section, Text, Button } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface InvitationProps {
  inviteeName: string;
  eventName: string;
  roleName: string;
  inviterName: string;
  signupUrl: string;
  expiresAt: string;
}

export const InvitationTemplate: React.FC<InvitationProps> = ({
  inviteeName,
  eventName,
  roleName,
  inviterName,
  signupUrl,
  expiresAt,
}) => {
  const previewText = `You're invited to join ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>You&apos;re Invited!</Text>

        <Text style={paragraph}>Hi {inviteeName},</Text>

        <Text style={paragraph}>
          {inviterName} has invited you to join <strong>{eventName}</strong> as
          a <strong>{roleName}</strong>.
        </Text>

        <Section style={inviteBox}>
          <Text style={inviteHeading}>Invitation Details</Text>
          <Text style={inviteText}>Event: {eventName}</Text>
          <Text style={inviteText}>Role: {roleName}</Text>
          <Text style={inviteText}>Invited by: {inviterName}</Text>
          <Text style={inviteText}>Expires: {expiresAt}</Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={signupUrl}>
            Accept Invitation
          </Button>
        </Section>

        <Text style={paragraph}>
          This invitation will expire on {expiresAt}. Please accept it before
          then to secure your role.
        </Text>

        <Text style={signature}>
          Best regards,
          <br />
          The Funding the Commons Team
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

const inviteBox = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const inviteHeading = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1e40af",
  margin: "0 0 16px",
};

const inviteText = {
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

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default InvitationTemplate;
