import React from "react";
import { Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ApplicationWaitlistedProps {
  applicantName: string;
  eventName: string;
}

export const ApplicationWaitlistedTemplate: React.FC<
  ApplicationWaitlistedProps
> = ({ applicantName, eventName }) => {
  const previewText = `You're on the waitlist for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Hi {applicantName},</Text>

        <Text style={paragraph}>
          Thank you for your application to the {eventName}. Your submission
          impressed us, and while we couldn&apos;t immediately offer you a spot
          due to limited capacity, we&apos;re pleased to inform you that
          you&apos;ve been placed on our <strong>waitlist</strong>.
        </Text>

        <Text style={subheading}>What This Means</Text>

        <Text style={paragraph}>Being on the waitlist means:</Text>

        <ul style={list}>
          <li>Your application was strong and met our criteria</li>
          <li>
            If a spot becomes available, we&apos;ll offer it to waitlisted
            candidates in order
          </li>
          <li>You&apos;ll be notified immediately if your status changes</li>
          <li>No further action is required from you at this time</li>
        </ul>

        <Text style={paragraph}>
          We expect to finalize our participant list by{" "}
          <strong>Wednesday, October 8th</strong>. If a spot becomes available
          for you before then, we&apos;ll contact you immediately with next
          steps.
        </Text>

        <Text style={paragraph}>
          We understand waiting can be challenging when making plans. If your
          circumstances change and you need to withdraw from the waitlist,
          please reply to this email to let us know.
        </Text>

        <Text style={paragraph}>
          Thank you for your patience and continued interest in the program.
          We&apos;ll be in touch as soon as we have any updates.
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

const list = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
  paddingLeft: "20px",
};

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default ApplicationWaitlistedTemplate;
