/**
 * Text Sanitization Utility for Analytics
 *
 * Removes personally identifiable information (PII) from text content
 * while preserving semantic meaning for analysis tools like Broad Listening.
 */

export interface SanitizationOptions {
  /** Replace emails with placeholder instead of removing */
  preserveEmailStructure?: boolean;
  /** Replace URLs with placeholder instead of removing */
  preserveUrlStructure?: boolean;
  /** Replace names with placeholder instead of removing */
  preserveNameStructure?: boolean;
  /** Custom patterns to sanitize */
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

/**
 * Sanitizes text content by removing or replacing PII
 */
export function sanitizeTextForAnalysis(
  text: string,
  options: SanitizationOptions = {},
): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  let sanitized = text;

  // Remove email addresses
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitized = sanitized.replace(
    emailPattern,
    options.preserveEmailStructure ? "[EMAIL_ADDRESS]" : "",
  );

  // Remove phone numbers (various formats)
  const phonePatterns = [
    /(\+\d{1,3}\s?)?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, // International/US formats
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // US format
    /\b\d{2,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}\b/g, // International variants
  ];

  phonePatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[PHONE_NUMBER]");
  });

  // Remove URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  sanitized = sanitized.replace(
    urlPattern,
    options.preserveUrlStructure ? "[URL]" : "",
  );

  // Remove potential LinkedIn URLs specifically
  const linkedinPattern = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/gi;
  sanitized = sanitized.replace(linkedinPattern, "[LINKEDIN_PROFILE]");

  // Remove GitHub URLs specifically
  const githubPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s]+/gi;
  sanitized = sanitized.replace(githubPattern, "[GITHUB_PROFILE]");

  // Remove Twitter URLs specifically
  const twitterPattern =
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[^\s]+/gi;
  sanitized = sanitized.replace(twitterPattern, "[TWITTER_PROFILE]");

  // Remove potential names (capitalized words that could be names)
  // Be conservative - only replace obvious name patterns
  const namePatterns = [
    /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g, // First Last name format
    /\bMy name is\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, // "My name is..." patterns
    /\bI'm\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi, // "I'm FirstName..." patterns
  ];

  if (options.preserveNameStructure) {
    namePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[PERSON_NAME]");
    });
  } else {
    // More aggressive name removal for higher security
    namePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, (match) => {
        // Replace with generic terms to maintain sentence structure
        if (match.toLowerCase().includes("my name is")) {
          return "I am a participant";
        }
        if (match.toLowerCase().includes("i'm")) {
          return "I am a developer";
        }
        return "[NAME]";
      });
    });
  }

  // Remove company-specific identifiers (be conservative)
  const companyPatterns = [
    /\b(?:at\s+)?[A-Z][a-zA-Z\s]+(?:LLC|Inc|Corp|Ltd|Co\.|Company|Corporation|Technologies|Tech|Labs|Systems)\b/g,
    /\bI work at\s+[A-Z][a-zA-Z\s]+/gi,
    /\bemployed by\s+[A-Z][a-zA-Z\s]+/gi,
  ];

  companyPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[COMPANY_NAME]");
  });

  // Remove potential addresses
  const addressPatterns = [
    /\b\d+\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
    /\b\d{5}(?:-\d{4})?\b/g, // ZIP codes
  ];

  addressPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[ADDRESS]");
  });

  // Remove salary/compensation information
  const salaryPatterns = [
    /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, // Dollar amounts
    /\b\d+k?\s*(?:per\s+)?(?:year|annually|salary|compensation)/gi,
    /\b(?:salary|compensation|pay|wage):\s*\$?\d+/gi,
  ];

  salaryPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[COMPENSATION_INFO]");
  });

  // Apply custom patterns if provided
  if (options.customPatterns) {
    options.customPatterns.forEach(({ pattern, replacement }) => {
      sanitized = sanitized.replace(pattern, replacement);
    });
  }

  // Clean up multiple spaces and line breaks
  sanitized = sanitized
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\n\s*\n/g, "\n") // Multiple line breaks to single
    .trim();

  return sanitized;
}

/**
 * Batch sanitize multiple text entries
 */
export function sanitizeTextBatch(
  texts: string[],
  options: SanitizationOptions = {},
): string[] {
  return texts.map((text) => sanitizeTextForAnalysis(text, options));
}

/**
 * Sanitize application response data while preserving structure
 */
export function sanitizeApplicationResponses(
  responses: Array<{ questionKey: string; answer: string }>,
  options: SanitizationOptions = {},
): Array<{ questionKey: string; answer: string; originalLength: number }> {
  return responses.map((response) => ({
    questionKey: response.questionKey,
    answer: sanitizeTextForAnalysis(response.answer, options),
    originalLength: response.answer.length, // Preserve metadata for analysis
  }));
}

/**
 * Check if text contains potential PII that wasn't caught by sanitization
 */
export function detectPotentialPII(text: string): {
  hasPotentialPII: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for patterns that might be PII
  if (text.includes("@")) {
    warnings.push("Contains @ symbol - possible email");
  }

  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    warnings.push("Contains phone number pattern");
  }

  if (/linkedin|github|twitter/i.test(text)) {
    warnings.push("Contains social media references");
  }

  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) {
    warnings.push("Contains potential name pattern");
  }

  return {
    hasPotentialPII: warnings.length > 0,
    warnings,
  };
}

/**
 * Validate that text is safe for analytics export
 */
export function validateSanitizedText(text: string): {
  isSafe: boolean;
  issues: string[];
} {
  const { hasPotentialPII, warnings } = detectPotentialPII(text);

  return {
    isSafe: !hasPotentialPII,
    issues: warnings,
  };
}
