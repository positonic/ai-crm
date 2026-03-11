/**
 * Smoke Tests — Public Pages
 *
 * Three quick checks that the most important pages render correctly:
 *   1. Event page loads (admin auth) — event name visible in conference dashboard
 *   2. Schedule page renders (no auth) — session cards + filter controls
 *   3. Application form renders (user auth) — form fields visible
 */
import { test, expect } from "@playwright/test";

const EVENT_SLUG = "example-conf";
const EVENT_NAME = "Example Conference";

// ─── 1. Event page loads ────────────────────────────────────────────
test.describe("Event page", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  test("loads and shows event name", async ({ page }) => {
    await page.goto(`/events/${EVENT_SLUG}`);

    // The ConferenceDashboard renders the event name as a heading
    await expect(page.getByRole("heading", { name: EVENT_NAME })).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ─── 2. Schedule page renders ───────────────────────────────────────
test.describe("Schedule page", () => {
  // Schedule page has no auth guard — runs unauthenticated
  test("shows session cards and filter controls", async ({ page }) => {
    await page.goto(`/events/${EVENT_SLUG}/schedule`);

    // Event name appears as heading
    await expect(page.getByRole("heading", { name: EVENT_NAME })).toBeVisible({
      timeout: 15_000,
    });

    // Filter controls: search input (by placeholder) and view toggle button
    await expect(page.getByPlaceholder("Schedule or people")).toBeVisible();
    await expect(page.getByRole("button", { name: /view/i })).toBeVisible();

    // At least one session title from the seed data is visible
    await expect(
      page.getByText("Opening Keynote", { exact: false }),
    ).toBeVisible();
  });
});

// ─── 3. Application form renders ────────────────────────────────────
test.describe("Application form", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("displays speaker application form fields", async ({ page }) => {
    await page.goto(`/events/${EVENT_SLUG}/apply`);

    // The form is a multi-step wizard starting on Step 1 (Speaker Profile).
    // Verify the form mounted by checking the heading and Step 1 fields.
    await expect(
      page.getByRole("heading", { name: "Speaker Application" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Preferred Name")).toBeVisible();
    await expect(page.getByLabel("Primary Job Title or Role")).toBeVisible();
    await expect(page.getByLabel("Primary Organization")).toBeVisible();
    await expect(page.getByLabel("Speaker Bio")).toBeVisible();
  });
});
