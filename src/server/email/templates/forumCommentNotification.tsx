import React from "react";
import { Section, Text, Button, Row, Column } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ForumCommentNotificationProps {
  recipientName: string;
  commenterName: string;
  commentPreview: string;
  threadUrl: string;
  threadTitle: string;
  isReply: boolean; // True if this is a reply to recipient's comment
}

export const ForumCommentNotificationTemplate: React.FC<
  ForumCommentNotificationProps
> = ({
  recipientName,
  commenterName,
  commentPreview,
  threadUrl,
  threadTitle,
  isReply,
}) => {
  const previewText = isReply
    ? `${commenterName} replied to your comment`
    : `New comment on "${threadTitle}"`;

  const heading = isReply
    ? "New Reply to Your Comment"
    : "New Comment on Forum Thread";

  const description = isReply ? (
    <>
      <strong>{commenterName}</strong> replied to your comment on the thread{" "}
      <strong>{threadTitle}</strong>.
    </>
  ) : (
    <>
      <strong>{commenterName}</strong> commented on your thread{" "}
      <strong>{threadTitle}</strong>.
    </>
  );

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={icon}>💬</Text>
        <Text style={headingStyle}>{heading}</Text>

        <Text style={paragraph}>Hi {recipientName},</Text>

        <Text style={paragraph}>{description}</Text>

        <Section style={commentBox}>
          <Text style={commentHeading}>Comment</Text>

          <Text style={commentText}>{commentPreview}</Text>

          <Row style={detailRow}>
            <Column style={detailLabel}>From:</Column>
            <Column style={detailValue}>{commenterName}</Column>
          </Row>
        </Section>

        <Text style={paragraph}>View the full conversation and reply:</Text>

        <Section style={buttonContainer}>
          <Button style={button} href={threadUrl}>
            View Thread
          </Button>
        </Section>

        <Text style={paragraph}>
          Stay engaged with the community by participating in forum discussions.
        </Text>

        <Text style={footerText}>
          You&apos;re receiving this email because you&apos;re participating in
          the forum thread <strong>{threadTitle}</strong>. To manage your
          notification preferences, visit your profile settings.
        </Text>
      </Section>
    </BaseTemplate>
  );
};

// Styles
const content = {
  padding: "0 32px",
};

const icon = {
  fontSize: "48px",
  textAlign: "center" as const,
  margin: "32px 0 16px",
};

const headingStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1a1a1a",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "16px 0",
};

const commentBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  border: "1px solid #e2e8f0",
};

const commentHeading = {
  fontSize: "14px",
  fontWeight: "bold",
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const commentText = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#1a1a1a",
  fontStyle: "italic",
  margin: "0 0 16px",
  padding: "12px 0",
  borderBottom: "1px solid #e2e8f0",
};

const detailRow = {
  marginTop: "12px",
};

const detailLabel = {
  fontSize: "14px",
  color: "#64748b",
  width: "60px",
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

const footerText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#64748b",
  margin: "32px 0 16px",
  textAlign: "center" as const,
};

export default ForumCommentNotificationTemplate;
