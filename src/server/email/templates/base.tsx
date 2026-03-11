import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Hr,
  Text,
  Link,
} from "@react-email/components";

interface BaseTemplateProps {
  children: React.ReactNode;
  previewText?: string;
}

export const BaseTemplate: React.FC<BaseTemplateProps> = ({
  children,
  previewText = "",
}) => {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      {previewText && (
        <div
          style={{
            display: "none",
            fontSize: "1px",
            color: "#333333",
            lineHeight: "1px",
            maxHeight: "0px",
            maxWidth: "0px",
            opacity: 0,
            overflow: "hidden",
          }}
        >
          {previewText}
        </div>
      )}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>Funding the Commons</Text>
          </Section>

          {children}

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>Funding the Commons</Text>
            <Text style={footerLinks}>
              <Link href="https://fundingthecommons.io" style={link}>
                Website
              </Link>
              {" • "}
              <Link href="https://twitter.com/fundingcommons" style={link}>
                Twitter
              </Link>
              {" • "}
              <Link href={`mailto:${process.env.ADMIN_EMAIL}`} style={link}>
                Contact
              </Link>
            </Text>
            <Text style={footerAddress}>
              © {new Date().getFullYear()} Funding the Commons. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "24px 32px",
  backgroundColor: "#2563eb",
};

const headerText = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#ffffff",
  margin: "0",
  textAlign: "center" as const,
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  padding: "0 32px",
};

const footerText = {
  color: "#697386",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "center" as const,
  fontWeight: "bold",
  marginBottom: "8px",
};

const footerLinks = {
  color: "#697386",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  marginBottom: "8px",
};

const footerAddress = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};
