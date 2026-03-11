import Link from "next/link";
import DocsBreadcrumb from "../../DocsBreadcrumb";

export default function YourAccountPage() {
  return (
    <>
      <DocsBreadcrumb />

      <h1 className="docs-page-title">Your Account</h1>
      <p className="docs-page-subtitle">
        Set up your profile and manage your account settings.
      </p>

      <h2 id="signing-up" className="docs-heading-h2">
        Signing Up
      </h2>
      <p className="docs-text">
        You can create an account on the{" "}
        <Link href="/auth/signin" className="docs-link">
          sign-in page
        </Link>{" "}
        using one of two methods:
      </p>
      <ul className="docs-list">
        <li>
          <strong>Discord</strong> &ndash; The fastest option. Click &ldquo;Sign
          in with Discord&rdquo; and authorise the platform. Your name and
          profile picture will be imported automatically.
        </li>
        <li>
          <strong>Email and password</strong> &ndash; Enter your email address
          and choose a password. You will receive a confirmation email to verify
          your account.
        </li>
      </ul>

      <h2 id="your-profile" className="docs-heading-h2">
        Your Profile
      </h2>
      <p className="docs-text">
        After signing in, take a moment to complete your profile. A filled-out
        profile helps event organisers and fellow attendees learn more about
        you. You can update your name, bio, and links at any time from your
        profile page.
      </p>

      <h2 id="managing-your-account" className="docs-heading-h2">
        Managing Your Account
      </h2>
      <p className="docs-text">
        Your account settings allow you to update your email address, change
        your password, and manage connected services like Discord. If you need
        to delete your account, please contact the event organisers.
      </p>

      <hr className="docs-divider" />

      <p className="docs-text">
        Once your account is set up, head over to the{" "}
        <Link href="/docs/get-started/quickstart" className="docs-link">
          Quickstart guide
        </Link>{" "}
        to find and join your first event.
      </p>
    </>
  );
}
