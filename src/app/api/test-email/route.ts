import { NextResponse } from "next/server";
import { sendEmail } from "~/lib/email";
import { env } from "~/env";

export async function GET() {
  // Get current email configuration
  const emailConfig = {
    mode: env.EMAIL_MODE,
    testEmail: env.TEST_EMAIL_OVERRIDE,
    hasSandboxToken: !!env.POSTMARK_SANDBOX_TOKEN,
  };

  // Send a test email
  const testRecipient = "test.user@example.com";
  const result = await sendEmail({
    to: testRecipient,
    subject: "Test Email - Development Mode",
    htmlContent: `
      <h2>Test Email</h2>
      <p>This is a test email sent in ${env.EMAIL_MODE} mode.</p>
      <p><strong>Original recipient:</strong> ${testRecipient}</p>
      <p><strong>Current time:</strong> ${new Date().toISOString()}</p>
      <hr>
      <p>Email Configuration:</p>
      <ul>
        <li>Mode: ${emailConfig.mode}</li>
        <li>Test Email: ${emailConfig.testEmail}</li>
        <li>Using Sandbox: ${emailConfig.hasSandboxToken}</li>
      </ul>
    `,
  });

  // Check where the email went
  const emailDestination = emailConfig.hasSandboxToken
    ? "Postmark Sandbox (black hole - no actual delivery)"
    : `Redirected to: ${emailConfig.testEmail}`;

  return NextResponse.json({
    success: result.success,
    configuration: emailConfig,
    testDetails: {
      originalRecipient: testRecipient,
      actualDestination: emailDestination,
      messageId: result.messageId,
      error: result.error,
    },
    instructions: {
      development:
        "Emails are either sent to sandbox (black hole) or redirected to TEST_EMAIL_OVERRIDE",
      staging:
        "All emails are redirected to TEST_EMAIL_OVERRIDE with [STAGING] prefix",
      production: "Emails are sent to actual recipients",
    },
  });
}
