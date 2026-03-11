import React from "react";
import { Section, Text } from "@react-email/components";
import { BaseTemplate } from "./base";

export interface ApplicationAcceptedProps {
  applicantName: string;
  applicantFirstName?: string;
  eventName: string;
  programDates: string;
  location: string;
  dashboardUrl: string;
  speakerProfileUrl?: string;
  faqUrl?: string;
  contactEmail: string;
  registrationUrl?: string;
  speakerCouponCode?: string;
  sessions?: Array<{ title: string; url: string }>;
  myScheduleUrl?: string;
}

export const ApplicationAcceptedTemplate: React.FC<
  ApplicationAcceptedProps
> = ({
  applicantFirstName,
  applicantName,
  speakerCouponCode,
  sessions,
  myScheduleUrl,
}) => {
  const firstName = applicantFirstName ?? applicantName;
  const previewText = `🎉 You're confirmed as a presenter at Intelligence at the Frontier`;

  return (
    <BaseTemplate previewText={previewText}>
      <Section style={content}>
        <Text style={paragraph}>Hi {firstName},</Text>

        <Text style={paragraph}>
          Thank you for joining us as a presenter at{" "}
          <a
            href="https://www.fundingthecommons.io/ftc-frontiertower"
            style={link}
          >
            Intelligence at the Frontier: Funding the Commons Vertical Festival
          </a>
          , at{" "}
          <a
            href="https://www.fundingthecommons.io/ftc-frontiertower"
            style={link}
          >
            Frontier Tower
          </a>{" "}
          in San Francisco. The Festival runs from March 14 – 15, 2026 (9 am
          Saturday – 11 pm Sunday).
        </Text>

        <Text style={paragraph}>
          If you are receiving this email, you&apos;ve been selected as a
          presenter at the vertical festival. All the info you need to know
          about being a presenter is{" "}
          <a href="https://docsend.com/view/7b5zif62z3gvsxdp" style={link}>
            here
          </a>
          .
        </Text>

        <Text style={paragraph}>
          If your floor lead (program curator on one of the many floors of
          Frontier Tower) hasn&apos;t already been in touch with details about
          your session date, time and location, they&apos;ll contact you soon!
        </Text>

        <Text style={paragraph}>
          In the meantime, we&apos;d appreciate if you could help us announce
          your upcoming appearance with our community:
        </Text>

        <Text style={bulletItem}>
          • Complete your presenter profile{" "}
          <a href="https://platform.fundingthecommons.io/signin" style={link}>
            here
          </a>
          . Your floor lead may have already partially filled it out for you, so
          please feel free to remove, change, or add anything.
        </Text>

        <Text style={paragraph}>
          You can check if a profile already exists, and sign in to continue
          filling it out, by selecting &ldquo;Sign In&rdquo; here:{" "}
          <a href="https://platform.fundingthecommons.io/signin" style={link}>
            https://platform.fundingthecommons.io/signin
          </a>
          , and then &ldquo;Sign in with email link instead.&rdquo;
        </Text>

        <Text style={paragraph}>
          If your floor lead created a profile for you, it will send a link to
          the email address you&apos;re reading this on. If not, please create a
          new account for your profile.
        </Text>

        <Text style={paragraph}>
          Email your session title, headshot and preferred name + organization
          name to your floor lead (email addresses listed below) asap, if you
          don&apos;t have time to complete your profile yet – this way we can
          list you on the website and agenda!
        </Text>

        {speakerCouponCode && (
          <Section style={couponBox}>
            <Text style={couponHeading}>
              Your Complimentary Presenter Registration Codes
            </Text>
            <Text style={couponCode}>{speakerCouponCode}</Text>
            <Text style={couponNote}>
              This code provides complimentary access (2 uses).
            </Text>
          </Section>
        )}

        <Text style={paragraph}>
          Please register with{" "}
          {speakerCouponCode ? "this ticket code" : "your ticket codes"} at{" "}
          <a href="https://lu.ma/ftc-sf-2026" style={link}>
            https://lu.ma/ftc-sf-2026
          </a>
          .
        </Text>

        <Text style={paragraph}>
          We&apos;ll follow up soon with an email confirming your time to
          present, and a calendar invitation for your talk time.
        </Text>

        <Text style={paragraph}>
          You will also be prompted to upload slides, which you must do ahead of
          time for certain floors (no plugging in!), so please be prepared to do
          this by Friday, March 13 at the latest. If your presentation
          doesn&apos;t require slides, don&apos;t worry about this.
        </Text>

        {sessions && sessions.length > 0 && (
          <Text style={paragraph}>
            Please upload your slides as soon as possible to your session
            {sessions.length > 1 ? "s" : ""}:
            {sessions.map((session, index) => (
              <React.Fragment key={session.url}>
                {index > 0 && ","}{" "}
                <a href={session.url} style={link}>
                  {session.title}
                </a>
              </React.Fragment>
            ))}
            .
          </Text>
        )}

        {myScheduleUrl && (
          <Text style={paragraph}>
            You can manage your sessions{" "}
            <a href={myScheduleUrl} style={link}>
              here
            </a>
            .
          </Text>
        )}

        <Text style={sectionHeading}>Contact your floor lead here:</Text>

        <Section style={floorLeadBox}>
          <Text style={floorLeadItem}>
            <strong>Floor 2:</strong>{" "}
            <a href="mailto:beth@fundingthecommons.io" style={link}>
              beth@fundingthecommons.io
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 6:</strong>{" "}
            <a href="mailto:gageolesen@gmail.com" style={link}>
              gageolesen@gmail.com
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 7:</strong>{" "}
            <a href="mailto:annaleeholl@gmail.com" style={link}>
              annaleeholl@gmail.com
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 8:</strong>{" "}
            <a href="mailto:er.creates@gmail.com" style={link}>
              er.creates@gmail.com
            </a>{" "}
            or{" "}
            <a href="mailto:morgan.hough@gmail.com" style={link}>
              morgan.hough@gmail.com
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 9:</strong>{" "}
            <a href="mailto:lexibenak@gmail.com" style={link}>
              lexibenak@gmail.com
            </a>{" "}
            or{" "}
            <a href="mailto:dev@sodhiraro.com" style={link}>
              dev@sodhiraro.com
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 11:</strong>{" "}
            <a href="mailto:Laurence@viva.city" style={link}>
              Laurence@viva.city
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 12:</strong>{" "}
            <a href="mailto:yoofiannan000@gmail.com" style={link}>
              yoofiannan000@gmail.com
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 14:</strong>{" "}
            <a href="mailto:events@flourishing.foundation" style={link}>
              events@flourishing.foundation
            </a>
          </Text>
          <Text style={floorLeadItem}>
            <strong>Floor 16:</strong>{" "}
            <a href="mailto:david@fundingthecommons.io" style={link}>
              david@fundingthecommons.io
            </a>{" "}
            or{" "}
            <a href="mailto:events@flourishing.foundation" style={link}>
              events@flourishing.foundation
            </a>
          </Text>
        </Section>

        <Text style={paragraph}>
          For any questions about the overall event or support with the website,
          email{" "}
          <a href="mailto:events@fundingthecommons.io" style={link}>
            events@fundingthecommons.io
          </a>
          .
        </Text>

        <Text style={paragraph}>We look forward to seeing you very soon!</Text>

        <Text style={signature}>
          Warmly,
          <br />
          Funding the Commons, Frontier Tower, Protocol Labs and our curatorial
          collaborators
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

const bulletItem = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "8px 0",
  paddingLeft: "8px",
};

const sectionHeading = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "24px 0 8px",
};

const floorLeadBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px 24px",
  margin: "8px 0 24px",
  border: "1px solid #e2e8f0",
};

const floorLeadItem = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#404040",
  margin: "6px 0",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const couponBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #86efac",
  textAlign: "center" as const,
};

const couponHeading = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#15803d",
  margin: "0 0 12px",
};

const couponCode = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#166534",
  letterSpacing: "2px",
  fontFamily: "monospace, Courier New",
  margin: "0 0 8px",
};

const couponNote = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
};

const signature = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  margin: "32px 0 16px",
};

export default ApplicationAcceptedTemplate;
