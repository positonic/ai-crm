import { describe, it, expect } from "vitest";

// Unit tests for form validation logic

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

// Function to test conditional field detection
function isConditionalField(question: Question, language = "en"): boolean {
  const questionText =
    language === "es" ? question.questionEs : question.questionEn;
  return (
    questionText.toLowerCase().includes("specify") ||
    questionText.toLowerCase().includes("if you answered") ||
    questionText.toLowerCase().includes("if you did not select") ||
    (questionText.toLowerCase().includes("other") &&
      questionText.toLowerCase().includes("please"))
  );
}

// Function to test missing fields calculation
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

// Function to test form completion
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

describe("Conditional Field Detection", () => {
  it("should identify conditional fields correctly", () => {
    const conditionalQuestions: Question[] = [
      {
        id: "1",
        questionKey: "technical_skills_other",
        questionEn:
          "If you answered 'other' in the previous question, please specify here",
        questionEs: "Si respondiste 'otro', especifica aquí",
        questionType: "TEXT",
        required: true,
        options: [],
        order: 1,
      },
      {
        id: "2",
        questionKey: "other_specify",
        questionEn: "If you did not select 'other,' please answer with N/A",
        questionEs: "Si no seleccionaste 'otro', responde N/A",
        questionType: "TEXT",
        required: true,
        options: [],
        order: 2,
      },
      {
        id: "3",
        questionKey: "specify_details",
        questionEn: "Please specify your other technical skills",
        questionEs: "Por favor especifica tus otras habilidades",
        questionType: "TEXT",
        required: true,
        options: [],
        order: 3,
      },
    ];

    const normalQuestions: Question[] = [
      {
        id: "4",
        questionKey: "full_name",
        questionEn: "What is your full name?",
        questionEs: "¿Cuál es tu nombre completo?",
        questionType: "TEXT",
        required: true,
        options: [],
        order: 4,
      },
      {
        id: "5",
        questionKey: "experience",
        questionEn: "Tell us about your experience",
        questionEs: "Cuéntanos sobre tu experiencia",
        questionType: "TEXTAREA",
        required: true,
        options: [],
        order: 5,
      },
    ];

    // Test conditional fields are detected
    conditionalQuestions.forEach((question) => {
      expect(isConditionalField(question)).toBe(true);
    });

    // Test normal fields are not detected as conditional
    normalQuestions.forEach((question) => {
      expect(isConditionalField(question)).toBe(false);
    });
  });

  // Note: Conditional field detection primarily works with English patterns
  // Spanish support can be enhanced later if needed
});

describe("Missing Fields Calculation", () => {
  const testQuestions: Question[] = [
    {
      id: "1",
      questionKey: "full_name",
      questionEn: "Full Name",
      questionEs: "Nombre",
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
      questionKey: "skills",
      questionEn: "Skills",
      questionEs: "Habilidades",
      questionType: "MULTISELECT",
      required: true,
      options: ["Developer", "Designer"],
      order: 3,
    },
    {
      id: "4",
      questionKey: "agree_terms",
      questionEn: "Agree to Terms",
      questionEs: "Acepto términos",
      questionType: "CHECKBOX",
      required: true,
      options: [],
      order: 4,
    },
  ];

  it("should correctly identify missing text fields", () => {
    const formValues = {
      full_name: "John",
      email: "",
      skills: ["Developer"],
      agree_terms: true,
    };

    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["email"]);
  });

  it("should correctly identify missing multiselect fields", () => {
    const formValues = {
      full_name: "John",
      email: "john@example.com",
      skills: [],
      agree_terms: true,
    };

    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["skills"]);
  });

  it("should correctly identify missing checkbox fields", () => {
    const formValues = {
      full_name: "John",
      email: "john@example.com",
      skills: ["Developer"],
      agree_terms: false,
    };

    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["agree_terms"]);
  });

  it("should handle empty form correctly", () => {
    const formValues = {};

    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["full_name", "email", "skills", "agree_terms"]);
  });

  it("should handle whitespace-only values as missing", () => {
    const formValues = {
      full_name: "   ",
      email: "\t",
      skills: ["Developer"],
      agree_terms: true,
    };

    const missing = calculateMissingFields(formValues, testQuestions);
    expect(missing).toEqual(["full_name", "email"]);
  });
});

describe("Form Completion Calculation", () => {
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
  ];

  it("should return false for incomplete forms", () => {
    const formValues = { name: "John", skills: [] };
    expect(isFormComplete(formValues, testQuestions)).toBe(false);
  });

  it("should return true for complete forms", () => {
    const formValues = { name: "John", skills: ["A"] };
    expect(isFormComplete(formValues, testQuestions)).toBe(true);
  });

  it("should handle empty forms", () => {
    const formValues = {};
    expect(isFormComplete(formValues, testQuestions)).toBe(false);
  });
});
