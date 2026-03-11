/**
 * Golden Path — Cross-system E2E workflow
 *
 * Tests the admin acceptance flow and speaker verification:
 * 1. Global setup creates a SUBMITTED speaker application via the database
 * 2. Admin navigates to speakers page → finds application → accepts it
 * 3. Speaker logs in → sees accepted status on their dashboard
 *
 * Note: The speaker application form rendering is covered by the
 * public-pages smoke tests. This test focuses on the cross-system
 * admin↔speaker workflow that requires multiple authenticated sessions.
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_SPEAKER_EMAIL,
} from "../global-setup";

const EVENT_SLUG = "example-conf";

// ── Helper: sign in within a fresh browser context ──────────────────
async function signInAs(
  browser: Browser,
  email: string,
  password: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/signin");

  await page.getByRole("tab", { name: /sign in/i }).click();
  const signInForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Sign In", exact: true }),
  });
  await signInForm.getByLabel("Email").fill(email);
  await signInForm.getByLabel("Password").fill(password);
  await signInForm
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
  await expect(page).not.toHaveURL(/\/signin/, { timeout: 15_000 });

  return page;
}

test("admin accepts speaker application → speaker sees accepted status", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  // ── Step 1: Admin finds and accepts the speaker application ───────
  const adminPage = await signInAs(
    browser,
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
  );

  await adminPage.goto(`/admin/events/${EVENT_SLUG}/speakers`);

  // Wait for the applications table to load
  await expect(adminPage.getByText("Speaker Management")).toBeVisible({
    timeout: 15_000,
  });

  // Find the test speaker's application
  await expect(adminPage.getByText(TEST_SPEAKER_EMAIL)).toBeVisible({
    timeout: 15_000,
  });

  // Find the row and click the Accept button (green check icon)
  const speakerRow = adminPage
    .getByRole("row")
    .filter({ hasText: TEST_SPEAKER_EMAIL });
  await speakerRow.getByRole("button", { name: "Accept" }).click();

  // Wait for success notification
  await expect(adminPage.getByText(/status updated/i)).toBeVisible({
    timeout: 10_000,
  });

  // Reload to verify the status persisted in the database
  await adminPage.reload();
  await expect(adminPage.getByText("Speaker Management")).toBeVisible({
    timeout: 15_000,
  });
  const updatedRow = adminPage
    .getByRole("row")
    .filter({ hasText: TEST_SPEAKER_EMAIL });
  await expect(updatedRow.getByText(/accepted/i)).toBeVisible({
    timeout: 10_000,
  });

  await adminPage.context().close();

  // ── Step 2: Speaker verifies accepted status on dashboard ─────────
  const speakerPage = await signInAs(
    browser,
    TEST_SPEAKER_EMAIL,
    "E2eSpeaker123!",
  );

  // Navigate to the event page — speaker with accepted application sees ConferenceDashboard
  await speakerPage.goto(`/events/${EVENT_SLUG}`);

  // The ConferenceDashboard shows the event name
  await expect(
    speakerPage.getByRole("heading", { name: "Example Conference" }),
  ).toBeVisible({ timeout: 15_000 });

  // The "My Talk Submission" section should show accepted status
  await expect(speakerPage.getByText(/my talk submission/i)).toBeVisible();
  await expect(
    speakerPage.getByText("ACCEPTED", { exact: true }),
  ).toBeVisible();

  await speakerPage.context().close();
});
