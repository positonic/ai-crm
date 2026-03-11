import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DynamicApplicationForm from "../DynamicApplicationForm";
// Mock scroll behavior
const mockScrollIntoView = vi.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;
HTMLElement.prototype.focus = vi.fn();

// Mock getElementById to return mock elements
const mockGetElementById = vi.fn();
Object.defineProperty(document, "getElementById", {
  value: mockGetElementById,
  configurable: true,
});

// Mock tRPC
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
            questionKey: "project_description",
            questionEn: "Project Description",
            questionEs: "Descripción del Proyecto",
            questionType: "TEXTAREA",
            required: true,
            options: [],
            order: 3,
          },
          {
            id: "4",
            questionKey: "technical_skills_other",
            questionEn:
              "If you answered 'other' in the previous question, please specify here",
            questionEs: "Si respondiste 'otro', especifica aquí",
            questionType: "TEXT",
            required: true, // Marked as required in DB but should be conditional
            options: [],
            order: 4,
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
        mutateAsync: vi
          .fn()
          .mockRejectedValue(
            new Error(
              "Please answer all required questions: full_name, project_description",
            ),
          ),
        isPending: false,
      })),
    },
  },
};

vi.mock("~/trpc/react", () => ({
  api: mockTRPC,
}));

// Test wrapper
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

describe("Scroll-to-Error Behavior Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock element for scroll testing
    mockGetElementById.mockImplementation((id: string) => {
      if (id.startsWith("field-")) {
        return {
          scrollIntoView: mockScrollIntoView,
          querySelector: vi.fn().mockReturnValue({
            focus: vi.fn(),
          }),
        };
      }
      return null;
    });
  });

  // CRITICAL: Should scroll to actual required fields, not conditional ones
  it("should scroll to actual missing required field, not conditional field", async () => {
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

    // Don't fill any fields except email (auto-filled)
    // Submit to trigger validation and scroll
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/please complete required fields/i),
      ).toBeInTheDocument();
    });

    // Should scroll to first actual missing field (full_name), NOT conditional field
    expect(mockGetElementById).toHaveBeenCalledWith("field-full_name");
    expect(mockGetElementById).not.toHaveBeenCalledWith(
      "field-technical_skills_other",
    );

    // Should scroll the correct element
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  });

  // Test scroll order prioritizes actual missing fields
  it("should prioritize actual required fields over conditional fields in scroll order", async () => {
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
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Fill full_name but leave project_description empty
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.tab(); // Trigger save

    // Submit to trigger validation
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Should scroll to project_description (next actual required field)
    // NOT to technical_skills_other (conditional field that appears later)
    expect(mockGetElementById).toHaveBeenCalledWith(
      "field-project_description",
    );
    expect(mockGetElementById).not.toHaveBeenCalledWith(
      "field-technical_skills_other",
    );
  });

  // Test conditional field is excluded from scroll targets
  it("should never scroll to conditional fields when other required fields are missing", async () => {
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
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Leave all actual required fields empty
    // Submit multiple times to test scroll behavior
    const submitButton = screen.getByRole("button", { name: /submit/i });

    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    // Should never have scrolled to conditional field
    expect(mockGetElementById).not.toHaveBeenCalledWith(
      "field-technical_skills_other",
    );

    // Should only scroll to actual required fields
    const scrollCalls = (mockGetElementById.mock.calls as unknown[][]).map(
      (call) => call[0] as string,
    );
    const conditionalScrolls = scrollCalls.filter(
      (id) => id === "field-technical_skills_other",
    );
    expect(conditionalScrolls).toHaveLength(0);
  });

  // Test scroll focus functionality
  it("should focus input element after scrolling", async () => {
    const user = userEvent.setup();
    const mockFocus = vi.fn();

    mockGetElementById.mockImplementation((_id: string) => ({
      scrollIntoView: mockScrollIntoView,
      querySelector: vi.fn().mockReturnValue({
        focus: mockFocus,
      }),
    }));

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

    // Submit to trigger scroll and focus
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Wait for scroll and focus logic
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    // Should focus after scroll delay
    await new Promise((resolve) => setTimeout(resolve, 600)); // Wait for focus timeout
    expect(mockFocus).toHaveBeenCalled();
  });

  // Test multiple missing fields scroll to first one
  it("should scroll to first missing required field when multiple are missing", async () => {
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
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    // Submit with multiple missing fields
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Should scroll to FIRST missing field (full_name), not later ones
    expect(mockGetElementById).toHaveBeenCalledWith("field-full_name");

    // Should not scroll to later fields even if they're also missing
    const allScrollCalls = mockGetElementById.mock.calls;
    expect(allScrollCalls).toHaveLength(1); // Only one scroll call
  });
});
