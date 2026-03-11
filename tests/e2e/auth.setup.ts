/**
 * Playwright Auth Setup Project
 *
 * Signs in as admin and regular user, persisting browser storage state so that
 * subsequent test projects can skip the login flow.
 */
import { test as setup, expect } from "@playwright/test";
import {
  TEST_ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_SPEAKER_EMAIL,
  TEST_SPEAKER_PASSWORD,
} from "./global-setup";

export const ADMIN_STATE = "tests/e2e/.auth/admin.json";
export const USER_STATE = "tests/e2e/.auth/user.json";
export const SPEAKER_STATE = "tests/e2e/.auth/speaker.json";

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/signin");

  // Switch to Sign In tab (default may be "Join the Commons" / signup)
  await page.getByRole("tab", { name: /sign in/i }).click();

  // Fill credentials.
  // Mantine Tabs renders ALL panels in the DOM so both "Email" fields exist.
  // Scope to the <form> that contains the "Sign In" submit button.
  const signInForm = page.locator("form").filter({
    has: page.getByRole("button", { name: "Sign In", exact: true }),
  });
  await signInForm.getByLabel("Email").fill(email);
  await signInForm.getByLabel("Password").fill(password);

  await signInForm
    .getByRole("button", { name: "Sign In", exact: true })
    .click();

  // Wait until we leave the sign-in page (redirect to dashboard or callback)
  await expect(page).not.toHaveURL(/\/signin/, { timeout: 15_000 });
}

// ── Admin auth state ────────────────────────────────────────────────
setup("authenticate as admin", async ({ page }) => {
  await signIn(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
  await page.context().storageState({ path: ADMIN_STATE });
});

// ── Regular-user auth state ─────────────────────────────────────────
setup("authenticate as user", async ({ page }) => {
  await signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  await page.context().storageState({ path: USER_STATE });
});

// ── Speaker-user auth state (for golden path) ──────────────────────
setup("authenticate as speaker", async ({ page }) => {
  await signIn(page, TEST_SPEAKER_EMAIL, TEST_SPEAKER_PASSWORD);
  await page.context().storageState({ path: SPEAKER_STATE });
});
