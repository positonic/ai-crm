import { useMemo } from "react";
import type {
  Application,
  ApplicationResponse,
  ApplicationQuestion,
  User,
} from "@prisma/client";

type ApplicationWithData = Application & {
  user: User | null;
  responses: (ApplicationResponse & {
    question: ApplicationQuestion;
  })[];
};

interface ApplicationCompletion {
  completionPercentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
}

/**
 * Hook to calculate application completion status based on required fields
 * Uses the same logic as the server-side validateApplicationFields function
 */
export function useApplicationCompletion(
  application: ApplicationWithData,
  allQuestions: ApplicationQuestion[],
): ApplicationCompletion {
  return useMemo(() => {
    if (!application || !allQuestions) {
      return {
        completionPercentage: 0,
        completedFields: 0,
        totalFields: 0,
        missingFields: [],
        isComplete: false,
      };
    }

    // Get all required questions for this event
    const allRequiredQuestions = allQuestions.filter((q) => q.required);

    // Filter out conditional fields that shouldn't be required
    const requiredQuestions = allRequiredQuestions.filter((question) => {
      const questionText = question.questionEn.toLowerCase();
      const isConditionalField =
        questionText.includes("specify") ||
        questionText.includes("if you answered") ||
        questionText.includes("if you did not select") ||
        questionText.includes("in the previous question");

      if (!isConditionalField) {
        return true; // Always required
      }

      // Special handling for technical_skills_other
      if (question.questionKey === "technical_skills_other") {
        const techSkillsResponse = application.responses.find(
          (r) => r.question.questionKey === "technical_skills",
        );

        if (techSkillsResponse?.answer) {
          try {
            const selectedSkills = JSON.parse(
              techSkillsResponse.answer,
            ) as unknown;
            const includesOther =
              Array.isArray(selectedSkills) &&
              (selectedSkills as string[]).includes("Other");
            return includesOther;
          } catch {
            // If not JSON, check string contains "Other"
            const includesOtherString =
              techSkillsResponse.answer.includes("Other");
            return includesOtherString;
          }
        }

        return false; // Don't require if no technical_skills response
      }

      return false; // Other conditional fields not required
    });

    // Create response map for quick lookup
    const responseMap = new Map(
      application.responses.map((r) => [r.questionId, r]),
    );

    // Find missing or inadequately answered required questions
    const missingQuestions = requiredQuestions.filter((question) => {
      const response = responseMap.get(question.id);

      // No response at all
      if (!response) {
        return true;
      }

      // Empty or whitespace-only answer
      if (!response.answer || response.answer.trim() === "") {
        return true;
      }

      // For SELECT/MULTISELECT questions, check if answer is valid
      if (
        question.questionType === "SELECT" ||
        question.questionType === "MULTISELECT"
      ) {
        const answer = response.answer.trim();

        // Common invalid select values
        if (
          answer === "" ||
          answer === "Please select" ||
          answer === "Select an option" ||
          answer === "Choose one" ||
          answer === "null" ||
          answer === "undefined"
        ) {
          return true;
        }

        // If question has options defined, check if answer is one of them
        if (question.options && question.options.length > 0) {
          const validOptions = question.options.map((opt) =>
            opt.toLowerCase().trim(),
          );
          const answerLower = answer.toLowerCase().trim();

          // For MULTISELECT, check each selected option
          if (question.questionType === "MULTISELECT") {
            let selectedOptions: string[] = [];

            // Handle JSON array format (e.g., ["Project Manager", "Developer"])
            if (answer.startsWith("[") && answer.endsWith("]")) {
              try {
                const parsed = JSON.parse(answer) as unknown;
                if (Array.isArray(parsed)) {
                  selectedOptions = (parsed as string[]).map((opt) =>
                    String(opt).toLowerCase().trim(),
                  );
                } else {
                  return true; // Invalid JSON array
                }
              } catch {
                return true; // Malformed JSON
              }
            } else {
              // Handle comma-separated format (e.g., "Project Manager, Developer")
              selectedOptions = answer
                .split(",")
                .map((opt) => opt.toLowerCase().trim());
            }

            const hasInvalidOption = selectedOptions.some(
              (opt) => !validOptions.includes(opt),
            );

            if (hasInvalidOption || selectedOptions.length === 0) {
              return true;
            }

            return false;
          } else {
            // For SELECT, check if the answer is one of the valid options
            if (!validOptions.includes(answerLower)) {
              return true;
            }
          }
        }
      }

      return false;
    });

    const completedFields = requiredQuestions.length - missingQuestions.length;
    const totalFields = requiredQuestions.length;
    const completionPercentage =
      totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

    return {
      completionPercentage,
      completedFields,
      totalFields,
      missingFields: missingQuestions.map((q) => q.questionKey),
      isComplete: missingQuestions.length === 0,
    };
  }, [application, allQuestions]);
}
