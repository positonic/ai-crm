import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import DynamicApplicationForm from "../DynamicApplicationForm";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

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
            questionKey: "technical_skills",
            questionEn: "Technical Skills",
            questionEs: "Habilidades Técnicas",
            questionType: "MULTISELECT",
            required: true,
            options: ["Developer", "Designer", "Other"],
            order: 3,
          },
          {
            id: "4",
            questionKey: "technical_skills_other",
            questionEn:
              "If you answered 'other' in the previous question, please specify here",
            questionEs: "Si respondiste 'otro', especifica aquí",
            questionType: "TEXT",
            required: true,
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

describe("DynamicApplicationForm Performance Tests", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let renderCount = 0;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Intentionally empty - suppress console warnings during tests
    });
    renderCount = 0;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // CRITICAL: Infinite Loop Prevention Test
  it("should not re-render infinitely on load", async () => {
    const TestComponent = () => {
      renderCount++;
      return (
        <DynamicApplicationForm
          eventId="test-event"
          userEmail="test@example.com"
          language="en"
        />
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>,
    );

    // Allow initial renders
    await waitFor(() => {
      expect(renderCount).toBeLessThanOrEqual(5); // Max reasonable renders
    });

    // Wait longer to ensure no additional renders
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const finalRenderCount = renderCount;

    // Wait more to detect infinite loops
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(renderCount).toBe(finalRenderCount); // Should not increase
  });

  // Performance: No excessive console warnings
  it("should not generate excessive console warnings", async () => {
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
      expect(screen.getByText(/full name/i)).toBeInTheDocument();
    });

    // Should complete without warnings
    expect(console.warn).toHaveBeenCalledTimes(0);
  });

  // Data Persistence Test
  it("should maintain form data during field interactions", async () => {
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

    const nameInput = screen.getByLabelText(/full name/i);

    // Type in field
    await user.type(nameInput, "John Doe");
    expect(nameInput).toHaveValue("John Doe");

    // Trigger onBlur save
    await user.tab();

    // Data should still be preserved
    await waitFor(() => {
      expect(nameInput).toHaveValue("John Doe");
    });
  });

  // Email Auto-Save Test
  it("should auto-save email field when pre-populated", async () => {
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

    // Wait for auto-save to trigger
    await waitFor(
      () => {
        expect(updateResponseMock).toHaveBeenCalledWith(
          expect.objectContaining({
            answer: "test@example.com",
          }),
        );
      },
      { timeout: 1000 },
    );
  });
});

describe("DynamicApplicationForm Validation Tests", () => {
  // Conditional Field Test
  it("should correctly handle conditional fields", async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/technical skills/i)).toBeInTheDocument();
    });

    // Don't select "Other" - conditional field should not be required
    const techSkillsSelect = screen.getByLabelText(/technical skills/i);
    await user.selectOptions(techSkillsSelect, ["Developer"]);

    // Try to submit - should not complain about "specify other" field
    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Should not show error about conditional field
    expect(screen.queryByText(/specify here/i)).not.toBeInTheDocument();
  });

  // Missing Fields Display Test
  it("should show correct missing fields in completion status", async () => {
    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/please fill out the following required fields/i),
      ).toBeInTheDocument();
    });

    // Should show actual missing field names
    expect(screen.getByText(/full_name/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
  });

  // Form Completion Test
  it("should correctly calculate form completion status", async () => {
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

    // Initially incomplete
    expect(
      screen.getByText(/please fill out the following required fields/i),
    ).toBeInTheDocument();

    // Fill required fields
    await user.type(screen.getByLabelText(/full name/i), "John Doe");
    await user.selectOptions(screen.getByLabelText(/technical skills/i), [
      "Developer",
    ]);

    // Should become complete
    await waitFor(() => {
      expect(
        screen.queryByText(/please fill out the following required fields/i),
      ).not.toBeInTheDocument();
    });
  });
});

describe("DynamicApplicationForm UX Tests", () => {
  // Social Media Handle Test
  it("should convert social media handles to URLs", async () => {
    const user = userEvent.setup();
    const updateResponseMock =
      mockTRPC.application.updateResponse.useMutation().mutateAsync;

    render(
      <TestWrapper>
        <DynamicApplicationForm eventId="test-event" language="en" />
      </TestWrapper>,
    );

    // Mock Twitter field exists
    const twitterInput = screen.getByLabelText(/twitter handle/i);

    // Type handle
    await user.type(twitterInput, "johndoe");
    await user.tab(); // Trigger onBlur save

    // Should save as full URL
    await waitFor(() => {
      expect(updateResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: "https://x.com/johndoe",
        }),
      );
    });
  });

  // Save Draft Test
  it("should save all form data when Save Draft is clicked", async () => {
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

    // Should save all filled fields
    await waitFor(() => {
      expect(updateResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          answer: "John Doe",
        }),
      );
    });

    // Should show success notification
    expect(screen.getByText(/draft saved successfully/i)).toBeInTheDocument();
  });
});
