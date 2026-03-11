import React from "react";
import { Section, Text, Button } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface FloorOwnerAssignedProps {
  floorOwnerName: string;
  eventName: string;
  venueName: string;
  assignedByName: string;
  manageFloorUrl: string;
}

export const FloorOwnerAssignedTemplate: React.FC<FloorOwnerAssignedProps> = ({
  floorOwnerName,
  eventName,
  venueName,
  assignedByName,
  manageFloorUrl,
}) => {
  const previewText = `You've been assigned as a Floor Lead for ${eventName}`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={heading}>Floor Lead Assignment</Text>

        <Text style={paragraph}>Hi {floorOwnerName},</Text>

        <Text style={paragraph}>
          {assignedByName} has assigned you as a <strong>Floor Lead</strong> for{" "}
          <strong>{venueName}</strong> at <strong>{eventName}</strong>.
        </Text>

        <Text style={paragraph}>
          As a Floor Lead, you can manage the schedule for your assigned floor,
          including adding and editing sessions.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsHeading}>Assignment Details</Text>
          <Text style={detailsText}>Event: {eventName}</Text>
          <Text style={detailsText}>Floor: {venueName}</Text>
          <Text style={detailsText}>Assigned by: {assignedByName}</Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={manageFloorUrl}>
            Manage Your Floor
          </Button>
        </Section>

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

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default FloorOwnerAssignedTemplate;
