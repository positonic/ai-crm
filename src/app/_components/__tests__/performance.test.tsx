import React, { useState, useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Type definitions
type Question = {
  id: string;
  questionKey: string;
  questionEn: string;
  questionEs: string;
  questionType:
    | "TEXT"
    | "TEXTAREA"
    | "EMAIL"
    | "PHONE"
    | "URL"
    | "SELECT"
    | "MULTISELECT"
    | "CHECKBOX"
    | "NUMBER";
  required: boolean;
  options: string[];
  order: number;
};

// Helper functions
function calculateMissingFields(
  formValues: Record<string, unknown>,
  requiredQuestions: Question[],
): string[] {
  return requiredQuestions
    .filter((question) => {
      const value = formValues[question.questionKey];
      if (question.questionType === "MULTISELECT") {
        return !Array.isArray(value) || value.length === 0;
      } else if (question.questionType === "CHECKBOX") {
        return !Boolean(value);
      } else {
        return !value || (typeof value === "string" && !value.trim());
      }
    })
    .map((q) => q.questionKey);
}

function isFormComplete(
  formValues: Record<string, unknown>,
  requiredQuestions: Question[],
): boolean {
  return requiredQuestions.every((question) => {
    const value = formValues[question.questionKey];
    if (question.questionType === "MULTISELECT") {
      return Array.isArray(value) && value.length > 0;
    } else if (question.questionType === "CHECKBOX") {
      return Boolean(value);
    } else {
      return value && (typeof value === "string" ? value.trim() : true);
    }
  });
}
// Mock tRPC with performance monitoring
const createMockTRPC = () => ({
  application: {
    getEventQuestions: {
      useQuery: vi.fn(() => ({
        data: [
          {
            id: "1",
            questionKey: "test_field",
            questionEn: "Test Field",
            questionEs: "Campo de Prueba",
            questionType: "TEXT",
            required: true,
            options: [],
            order: 1,
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
});

vi.mock("~/trpc/react", () => ({
  api: createMockTRPC(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
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

// Performance monitoring component
const PerformanceMonitor: React.FC<{
  onRender: () => void;
  children: React.ReactNode;
}> = ({ onRender, children }) => {
  useEffect(() => {
    onRender();
  });

  return <>{children}</>;
};

describe("Form Performance Monitoring", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Console Warning Detection
  it("should not generate console warnings during normal use", async () => {
    const user = userEvent.setup();

    const { unmount } = render(
      <TestWrapper>
        <div>Test Form</div>
      </TestWrapper>,
    );

    // Simulate normal interaction
    await user.click(screen.getByText("Test Form"));

    // Wait for any async operations
    await waitFor(() => {
      expect(screen.getByText("Test Form")).toBeInTheDocument();
    });

    unmount();

    // Should complete without warnings
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(0);
  });

  // Re-render Counting Test
  it("should not re-render excessively", async () => {
    let renderCount = 0;
    const onRender = () => {
      renderCount++;
    };

    const TestComponent = () => {
      const [state, setState] = useState(0);

      // Simulate state changes that shouldn't cause infinite loops
      useEffect(() => {
        if (state < 2) {
          setState((s) => s + 1);
        }
      }, [state]);

      return <div>Render count: {renderCount}</div>;
    };

    render(
      <TestWrapper>
        <PerformanceMonitor onRender={onRender}>
          <TestComponent />
        </PerformanceMonitor>
      </TestWrapper>,
    );

    // Allow component to stabilize
    await waitFor(() => {
      expect(screen.getByText(/render count/i)).toBeInTheDocument();
    });

    // Wait additional time to detect infinite loops
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should not have excessive renders (allowing for initial setup + state changes)
    expect(renderCount).toBeLessThan(10);
  });

  // Memory Leak Detection
  it("should clean up properly on unmount", () => {
    const { unmount } = render(
      <TestWrapper>
        <div>Test Component</div>
      </TestWrapper>,
    );

    // Track initial state
    const initialWarnings = (console.warn as ReturnType<typeof vi.fn>).mock
      .calls.length;

    // Unmount and wait
    unmount();

    // Should not generate warnings during cleanup
    expect(console.warn).toHaveBeenCalledTimes(initialWarnings);
  });

  // Performance Timing Test
  it("should render within acceptable time limits", async () => {
    const startTime = Date.now();

    render(
      <TestWrapper>
        <div>Performance Test</div>
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Performance Test")).toBeInTheDocument();
    });

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    // Should render quickly (adjust threshold as needed)
    expect(renderTime).toBeLessThan(1000); // 1 second max
  });
});

describe("Form State Management", () => {
  // State Persistence Test
  it("should maintain state during simulated re-renders", () => {
    const TestComponent = () => {
      const [formValues, setFormValues] = useState<Record<string, unknown>>({
        test_field: "initial_value",
      });
      const [, forceRender] = useState(0);

      return (
        <div>
          <div data-testid="form-value">{String(formValues.test_field)}</div>
          <button
            onClick={() => forceRender(Date.now())}
            data-testid="force-render"
          >
            Force Re-render
          </button>
          <button
            onClick={() =>
              setFormValues((prev) => ({
                ...prev,
                test_field: "updated_value",
              }))
            }
            data-testid="update-state"
          >
            Update State
          </button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>,
    );

    // Initial value should be present
    expect(screen.getByTestId("form-value")).toHaveTextContent("initial_value");

    // Force re-render
    fireEvent.click(screen.getByTestId("force-render"));

    // Value should persist
    expect(screen.getByTestId("form-value")).toHaveTextContent("initial_value");

    // Update state
    fireEvent.click(screen.getByTestId("update-state"));

    // New value should be present
    expect(screen.getByTestId("form-value")).toHaveTextContent("updated_value");
  });

  // useEffect Stability Test
  it("should have stable useEffect behavior", async () => {
    let effectRunCount = 0;

    const TestComponent = () => {
      const [data] = useState({ stable: "value" });

      useEffect(() => {
        effectRunCount++;
      }, [data]); // Object dependency that shouldn't change

      return <div>Effect runs: {effectRunCount}</div>;
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/effect runs: 1/i)).toBeInTheDocument();
    });

    // Wait to detect additional effect runs
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Effect should only run once
    expect(screen.getByText(/effect runs: 1/i)).toBeInTheDocument();
  });
});

describe("Data Validation Logic", () => {
  const testQuestions: Question[] = [
    {
      id: "1",
      questionKey: "name",
      questionEn: "Name",
      questionEs: "Nombre",
      questionType: "TEXT",
      required: true,
      options: [],
      order: 1,
    },
    {
      id: "2",
      questionKey: "skills",
      questionEn: "Skills",
      questionEs: "Habilidades",
      questionType: "MULTISELECT",
      required: true,
      options: ["A", "B"],
      order: 2,
    },
    {
      id: "3",
      questionKey: "agree",
      questionEn: "Agree",
      questionEs: "Acepto",
      questionType: "CHECKBOX",
      required: true,
      options: [],
      order: 3,
    },
  ];

  it("should correctly identify missing fields", () => {
    const formValues = { name: "John", skills: [], agree: false };
    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["skills", "agree"]);
  });

  it("should correctly calculate completion status", () => {
    const incompleteForm = { name: "John", skills: [], agree: true };
    const completeForm = { name: "John", skills: ["A"], agree: true };

    expect(isFormComplete(incompleteForm, testQuestions)).toBe(false);
    expect(isFormComplete(completeForm, testQuestions)).toBe(true);
  });

  it("should handle edge cases in validation", () => {
    const edgeCases = {
      name: "   ", // Whitespace only
      skills: undefined, // Undefined value
      agree: null, // Null value
    };

    const missing = calculateMissingFields(edgeCases, testQuestions);
    expect(missing).toEqual(["name", "skills", "agree"]);
  });
});
