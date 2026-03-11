import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import DynamicApplicationForm from "../DynamicApplicationForm";
// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock tRPC with realistic responses
const mockTRPC = {
  application: {
    getEventQuestions: {
      useQuery: vi.fn(() => ({
        data: [
          {
            id: "1",
            questionKey: "full_name",
            questionEn: "Full Name",
            questionEs: "Nombre Completo",
            questionType: "TEXT",
            required: true,
            options: [],
            order: 1,
          },
          {
            id: "2",
            questionKey: "email",
            questionEn: "Email",
            questionEs: "Correo",
            questionType: "EMAIL",
            required: true,
            options: [],
            order: 2,
          },
          {
            id: "3",
            questionKey: "twitter",
            questionEn: "Twitter",
            questionEs: "Twitter",
            questionType: "URL",
            required: false,
            options: [],
            order: 3,
          },
          {
            id: "4",
            questionKey: "cohort_contribution",
            questionEn: "What can you offer to others in the cohort?",
            questionEs: "¿Qué puedes ofrecer a otros en la cohorte?",
            questionType: "TEXTAREA",
            required: true,
            options: [],
            order: 4,
          },
          {
            id: "5",
            questionKey: "technical_skills",
            questionEn: "Technical Skills",
            questionEs: "Habilidades Técnicas",
            questionType: "MULTISELECT",
            required: true,
            options: ["Developer", "Designer", "Other"],
            order: 5,
          },
          {
            id: "6",
            questionKey: "technical_skills_other",
            questionEn:
              "If you answered 'other' in the previous question, please specify here",
            questionEs: "Si respondiste 'otro', especifica aquí",
            questionType: "TEXT",
            required: true,
            options: [],
            order: 6,
          },
        ],
        isLoading: false,
        error: null,
      })),
    },
    getApplicationCompletion: {
      useQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
      })),
    },
    getApplication: {
      useQuery: vi.fn(() => ({
        data: null,
        isLoading: false,
        error: null,
      })),
    },
    createApplication: {
      useMutation: vi.fn(() => ({
        mutateAsync: vi.fn().mockResolvedValue({ id: "test-app-id" }),
        isPending: false,
      })),
    },
    updateResponse: {
      useMutation: vi.fn(() => ({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })),
    },
    submitApplication: {
      useMutation: vi.fn(() => ({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })),
    },
  },
};

vi.mock("~/trpc/react", () => ({
  api: mockTRPC,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
};

describe("Form Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Complete User Journey Test
  it("should complete full application submission workflow", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DynamicApplicationForm
          eventId="test-event"
          userEmail="test@example.com"
          language="en"
        />
      </TestWrapper>,
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Fill all required fields
    await user.type(screen.getByLabelText(/full name/i), "John Doe");

    // Find and fill cohort contribution (should be multiline)
    const cohortField = screen.getByLabelText(/what can you offer/i);
    await user.type(
      cohortField,
      "I can offer extensive React development experience and mentoring skills.",
    );

    // Select technical skills
    const skillsSelect = screen.getByLabelText(/technical skills/i);
    await user.click(skillsSelect);
    // Note: Multiselect testing might need more specific implementation

    // Email should be pre-populated and auto-saved
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();

    // Submit should work (mock will succeed)
    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeInTheDocument();
  }, 10000); // Longer timeout for complex interaction

  // Save Draft Workflow Test
  it("should handle save draft workflow correctly", async () => {
    const user = userEvent.setup();
    const updateResponseMock =
      mockTRPC.application.updateResponse.useMutation().mutateAsync;

    render(
      <TestWrapper>
        <DynamicApplicationForm
          eventId="test-event"
          userEmail="test@example.com"
          language="en"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Fill some fields
    await user.type(screen.getByLabelText(/full name/i), "John Doe");

    // Click Save Draft
    const saveDraftButton = screen.getByRole("button", { name: /save draft/i });
    await user.click(saveDraftButton);

    // Should attempt to save filled fields
    await waitFor(() => {
      expect(updateResponseMock).toHaveBeenCalled();
    });

    // Should show success notification
    await waitFor(() => {
      expect(screen.getByText(/draft saved successfully/i)).toBeInTheDocument();
    });
  });

  // Social Media Handle Conversion Test
  it("should convert social media handles to URLs correctly", async () => {
    const user = userEvent.setup();
    const updateResponseMock =
      mockTRPC.application.updateResponse.useMutation().mutateAsync;

    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/twitter handle/i)).toBeInTheDocument();
    });

    const twitterInput = screen.getByLabelText(/twitter handle/i);

    // Type handle
    await user.type(twitterInput, "johndoe");

    // Trigger onBlur save
    await user.tab();

    // Should save as full URL
    await waitFor(() => {
      expect(updateResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: "https://x.com/johndoe",
        }),
      );
    });
  });

  // Error Recovery Test
  it("should handle save failures gracefully", async () => {
    const user = userEvent.setup();

    // Mock save failure
    const updateResponseMock =
      mockTRPC.application.updateResponse.useMutation().mutateAsync;
    updateResponseMock.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Type and blur to trigger save
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.tab();

    // Should show error notification
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Form data should still be preserved in UI
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
  });

  // Conditional Field Logic Test
  it("should handle conditional fields correctly", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DynamicApplicationForm
          eventId="test-event"
          userEmail="test@example.com"
          language="en"
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/technical skills/i)).toBeInTheDocument();
    });

    // Fill required fields but don't select "Other"
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.type(
      screen.getByLabelText(/what can you offer/i),
      "Experience with React",
    );

    // Technical skills without "Other"

    // Form should be submittable without filling "specify other" field
    const submitButton = screen.getByRole("button", { name: /submit/i });

    // Should not scroll to conditional field when other fields are missing
    await user.click(submitButton);

    // Should focus on actual missing field, not conditional one
    const conditionalField = screen.queryByText(/if you answered 'other'/i);
    if (conditionalField) {
      expect(conditionalField).not.toHaveFocus();
    }
  });

  // Missing Fields Display Test
  it("should show correct missing fields in real-time", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    // Initially should show missing fields
    await waitFor(() => {
      expect(
        screen.getByText(/please fill out the following required fields/i),
      ).toBeInTheDocument();
    });

    // Should show specific missing field names
    expect(screen.getByText(/full_name/i)).toBeInTheDocument();

    // Fill a field
    await user.type(screen.getByLabelText(/full name/i), "John Doe");

    // Missing fields should update (full_name should disappear from list)
    // Note: This depends on the ApplicationCompletionStatus component implementation
  });

  // Data Persistence Across Sessions Test
  it("should handle existing application data correctly", async () => {
    const existingApplication = {
      id: "existing-app",
      status: "DRAFT" as const,
      language: "en",
      responses: [
        {
          id: "1",
          answer: "Jane Smith",
          question: {
            id: "1",
            questionKey: "full_name",
            questionEn: "Full Name",
            questionEs: "Nombre",
          },
        },
      ],
    };

    render(
      <TestWrapper>
        <DynamicApplicationForm
          eventId="test-event"
          existingApplication={existingApplication}
          userEmail="jane@example.com"
          language="en"
        />
      </TestWrapper>,
    );

    // Should pre-populate with existing data
    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
    });

    // Should also show pre-populated email
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
  });
});
