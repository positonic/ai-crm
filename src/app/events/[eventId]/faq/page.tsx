import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { env } from "~/env";

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event =
    (await db.event.findUnique({
      where: { slug: eventId },
      select: { name: true },
    })) ??
    (await db.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    }));

  return {
    title: `FAQ - ${event?.name ?? "Event"}`,
    description: `Frequently asked questions about ${event?.name ?? "this event"}`,
  };
}

export default async function EventFAQPage({ params }: PageProps) {
  const { eventId } = await params;

  let event = await db.event.findUnique({
    where: { slug: eventId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      startDate: true,
      endDate: true,
      location: true,
    },
  });

  event ??= await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      startDate: true,
      endDate: true,
      location: true,
    },
  });

  if (!event) {
    notFound();
  }

  const eventSlug = event.slug ?? event.id;
  const eventUrl = `/events/${eventSlug}`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <nav className="text-sm breadcrumbs mb-4">
          <Link href={eventUrl} className="text-blue-600 hover:text-blue-800">
            &larr; Back to {event.name}
          </Link>
        </nav>

        <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-600 mb-8">{event.name}</p>
      </div>

      <div className="space-y-8">
        {event.type === "CONFERENCE" ? (
          <ConferenceFaqContent event={event} eventUrl={eventUrl} />
        ) : event.type === "RESIDENCY" ? (
          <ResidencyFaqContent eventUrl={eventUrl} />
        ) : (
          <GenericFaqContent event={event} eventUrl={eventUrl} />
        )}
      </div>

      {/* Navigation Links */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={eventUrl}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            &larr; Back to {event.name}
          </Link>
          <Link
            href={`${eventUrl}/schedule`}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Schedule &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Conference FAQ Content ──────────────────────────────────────────────────

function ConferenceFaqContent({
  event,
  eventUrl,
}: {
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
  };
  eventUrl: string;
}) {
  const startStr = event.startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const endStr = event.endDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      {/* Speaker Information */}
      <FaqSection title="Speaker Information">
        <FaqItem question="How do I update my speaker profile or session details?">
          You can update your speaker profile, talk title, abstract, bio, and
          other details at any time by visiting your{" "}
          <Link
            href={`${eventUrl}/apply`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            speaker profile page
          </Link>
          . Changes you make will be reflected on the event schedule.
        </FaqItem>

        <FaqItem question="What session formats are available?">
          The conference supports multiple session formats including keynotes,
          panels, workshops, fireside chats, lightning talks, and presentations.
          Your floor lead will work with you to determine the best format for
          your session.
        </FaqItem>

        <FaqItem question="Can I change my talk title or abstract after being accepted?">
          Yes. Visit your{" "}
          <Link
            href={`${eventUrl}/apply`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            speaker profile page
          </Link>{" "}
          to update your talk title, abstract, or any other session details. We
          encourage you to keep your information up to date so attendees know
          what to expect.
        </FaqItem>

        <FaqItem question="Who is my floor lead and how do I contact them?">
          Your floor lead is the person who invited you or manages the floor
          where your session is scheduled. Their name should be in your
          invitation or acceptance email. If you&rsquo;re unsure, contact the
          event team at{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>
          .
        </FaqItem>
      </FaqSection>

      {/* Event Logistics */}
      <FaqSection title="Event Logistics">
        <FaqItem question="When and where is the event?">
          {event.name} takes place from <strong>{startStr}</strong> to{" "}
          <strong>{endStr}</strong>
          {event.location ? (
            <>
              {" "}
              at <strong>{event.location}</strong>
            </>
          ) : null}
          . Check the{" "}
          <Link
            href={`${eventUrl}/schedule`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            event schedule
          </Link>{" "}
          for detailed session times.
        </FaqItem>

        <FaqItem question="What is the multi-floor format?">
          The conference is organized across multiple themed floors, each with
          its own focus area and floor lead. Sessions run simultaneously across
          floors, allowing attendees to move between topics that interest them.
          Each floor operates semi-independently with its own schedule of talks,
          panels, and workshops.
        </FaqItem>

        <FaqItem question="Where can I see the full schedule?">
          The complete event schedule is available on the{" "}
          <Link
            href={`${eventUrl}/schedule`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            schedule page
          </Link>
          . You can filter by floor, session type, and speaker to find specific
          sessions.
        </FaqItem>
      </FaqSection>

      {/* Preparation */}
      <FaqSection title="Preparing for Your Session">
        <FaqItem question="What should I prepare for my session?">
          Bring your presentation materials on your own laptop. We recommend
          arriving at least 30 minutes before your session to check in with your
          floor lead and test the A/V equipment. Have a backup of your
          presentation accessible online in case of technical issues.
        </FaqItem>

        <FaqItem question="Will A/V equipment be provided?">
          Standard audio-visual equipment (projector, screen, microphone) is
          provided at each venue. Please bring your own laptop and any necessary
          display adapters (HDMI/USB-C). If you have special requirements,
          contact your floor lead in advance.
        </FaqItem>

        <FaqItem question="Can I invite a co-speaker or panelist?">
          Yes. Contact your floor lead to coordinate adding additional speakers
          or panelists to your session. They can update the session details and
          send invitations to your co-presenters.
        </FaqItem>
      </FaqSection>

      {/* Contact & Support */}
      <FaqSection title="Contact & Support">
        <FaqItem question="Who should I contact with questions?">
          For general event questions, reach out to{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>
          . For session-specific questions (scheduling, A/V, room setup),
          contact your floor lead directly.
        </FaqItem>

        <FaqItem question="I haven&rsquo;t received my acceptance email. What should I do?">
          First, check your spam or junk folder. If you still can&rsquo;t find
          it, contact the event team at{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>{" "}
          with your name and the email address you used to apply, and
          we&rsquo;ll resend it.
        </FaqItem>

        <FaqItem question="Will sessions be recorded?">
          Recording policies vary by floor and session type. Check with your
          floor lead about whether your session will be recorded. If you have
          preferences about recording, let your floor lead know in advance.
        </FaqItem>
      </FaqSection>
    </>
  );
}

// ─── Residency FAQ Content ───────────────────────────────────────────────────

function ResidencyFaqContent({ eventUrl }: { eventUrl: string }) {
  return (
    <>
      {/* Application Process */}
      <FaqSection title="Application Process">
        <FaqItem question="Why am I being asked for additional information?">
          The application process has been evolving, and some fields may have
          been missing from the original application form. We apologize for any
          inconvenience and thank you for your patience. This helps us ensure we
          have all the necessary information to properly evaluate your
          application.
        </FaqItem>

        <FaqItem question="What happens after I submit my application?">
          After submission, our team will review your application. If any
          required information is missing, we&rsquo;ll reach out via email with
          specific details about what needs to be completed. Once all
          information is provided, your application will proceed to the full
          evaluation process.
        </FaqItem>

        <FaqItem question="How long does the review process take?">
          The review process typically takes 2-3 weeks from the time we receive
          your complete application. We&rsquo;ll keep you updated throughout the
          process and notify you of our decision as soon as possible.
        </FaqItem>

        <FaqItem question="Can I edit my application after submission?">
          Yes, if we request additional information, you&rsquo;ll receive an
          email with a link to update your application. You can also contact us
          if you need to make changes to your submitted application.
        </FaqItem>
      </FaqSection>

      {/* Program Details */}
      <FaqSection title="Program Details">
        <FaqItem question="What kind of support do residents receive?">
          Residents receive mentorship from industry experts, access to funding
          opportunities, technical resources, community support, and potential
          stipends depending on the specific program track and funding
          availability.
        </FaqItem>

        <FaqItem question="Is the residency remote or in-person?">
          Specific logistics and format details will be shared in your
          acceptance communication. The residency format encourages deep
          collaboration and immersive development.
        </FaqItem>
      </FaqSection>

      {/* Eligibility & Requirements */}
      <FaqSection title="Eligibility & Requirements">
        <FaqItem question="Who is eligible to apply?">
          We welcome applications from researchers, developers, entrepreneurs,
          and innovators. Both individuals and teams may apply, regardless of
          their current stage of development.
        </FaqItem>

        <FaqItem question="Can international applicants participate?">
          Yes, we welcome international applicants. Visa requirements and
          logistics may vary depending on your location. If you require a visa
          support letter, please reach out to{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>
          .
        </FaqItem>
      </FaqSection>

      {/* Contact & Support */}
      <FaqSection title="Contact & Support">
        <FaqItem question="How can I get help with my application?">
          If you need assistance with your application or have questions not
          covered in this FAQ, please reach out to our team at{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>
          . We&rsquo;re here to help ensure you can complete your application
          successfully.
        </FaqItem>

        <FaqItem question="I didn&rsquo;t receive the email requesting additional information. What should I do?">
          First, please check your spam/junk folder. If you still can&rsquo;t
          find the email, contact our support team at{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>{" "}
          with your application details, and we&rsquo;ll resend the information.
        </FaqItem>
      </FaqSection>

      {/* Extra link for residency */}
      <div className="mt-4">
        <Link
          href={`${eventUrl}/about`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Learn more about the residency program &rarr;
        </Link>
      </div>
    </>
  );
}

// ─── Generic FAQ Content ─────────────────────────────────────────────────────

function GenericFaqContent({
  event,
  eventUrl,
}: {
  event: {
    name: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
  };
  eventUrl: string;
}) {
  const startStr = event.startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const endStr = event.endDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <FaqSection title="Event Information">
        <FaqItem question="When and where is the event?">
          {event.name} takes place from <strong>{startStr}</strong> to{" "}
          <strong>{endStr}</strong>
          {event.location ? (
            <>
              {" "}
              at <strong>{event.location}</strong>
            </>
          ) : null}
          . Check the{" "}
          <Link
            href={`${eventUrl}/schedule`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            schedule
          </Link>{" "}
          for details.
        </FaqItem>

        <FaqItem question="How can I update my profile or application?">
          Visit your{" "}
          <Link
            href={`${eventUrl}/apply`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            application page
          </Link>{" "}
          to update your profile and session details.
        </FaqItem>
      </FaqSection>

      <FaqSection title="Contact & Support">
        <FaqItem question="Who should I contact with questions?">
          For questions about the event, reach out to{" "}
          <a
            href={`mailto:${env.ADMIN_EMAIL}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {env.ADMIN_EMAIL}
          </a>
          . We aim to respond within 1-2 business days.
        </FaqItem>
      </FaqSection>
    </>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function FaqSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 border-b-2 border-blue-500 pb-2">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">{question}</h3>
      <p className="text-gray-700">{children}</p>
    </div>
  );
}
