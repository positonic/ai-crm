import React from "react";
import { Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ApplicationRejectedProps {
  applicantName: string;
  applicantFirstName?: string;
  eventName: string;
  contactEmail?: string;
  discountCode?: string;
  registrationUrl?: string;
  location?: string;
}

export const ApplicationRejectedTemplate: React.FC<
  ApplicationRejectedProps
> = ({
  applicantFirstName,
  applicantName,
  eventName,
  discountCode,
  registrationUrl,
  location,
}) => {
  const firstName = applicantFirstName ?? applicantName;
  const previewText = `Update on your speaker application for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={paragraph}>Hi {firstName},</Text>

        <Text style={paragraph}>
          Thank you again for applying to speak at <strong>{eventName}</strong>.
        </Text>

        <Text style={paragraph}>
          We received a strong set of proposals and, after careful
          consideration, we&apos;re not able to offer you a speaking slot in
          this year&apos;s program. This was not an easy decision, and we
          appreciate the thought and care you put into your submission.
        </Text>

        {discountCode && registrationUrl && (
          <Text style={paragraph}>
            We would still love to have you join us
            {location ? ` in ${location}` : ""}. As a thank you for applying,
            we&apos;re happy to offer you a 50% discount on a ticket to the
            event. You can use the code <strong>{discountCode}</strong> when
            registering on{" "}
            <a href={registrationUrl} style={link}>
              Luma
            </a>
            .
          </Text>
        )}

        <Text style={paragraph}>
          We&apos;re grateful for your interest in contributing to this
          gathering and hope to connect with you at the event.
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

export default ApplicationRejectedTemplate;
