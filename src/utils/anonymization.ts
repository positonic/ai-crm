/**
 * Anonymization Utility for Analytics
 *
 * Provides cryptographically secure methods to generate anonymous but consistent
 * identifiers for use in analytics while ensuring data cannot be de-anonymized.
 */

import crypto from "crypto";

/**
 * Configuration for anonymization
 */
interface AnonymizationConfig {
  /** Salt for additional security */
  salt: string;
  /** Length of generated hash (8-32 characters) */
  hashLength?: number;
  /** Prefix for generated IDs */
  prefix?: string;
}

/**
 * Generate a synthetic ID that is consistent but non-reversible
 */
export function generateSyntheticId(
  realId: string,
  config: AnonymizationConfig,
): string {
  if (!realId || !config.salt) {
    throw new Error(
      "Real ID and salt are required for synthetic ID generation",
    );
  }

  // Get secret from environment
  const secret = process.env.ANONYMIZATION_SECRET;
  if (!secret) {
    throw new Error("ANONYMIZATION_SECRET environment variable is required");
  }

  // Create hash using SHA-256
  const hash = crypto
    .createHash("sha256")
    .update(realId + config.salt + secret)
    .digest("hex");

  // Truncate to desired length (default 8 characters)
  const length = config.hashLength ?? 8;
  const truncatedHash = hash.substring(0, length);

  // Add prefix if specified
  const prefix = config.prefix ?? "ANON";

  return `${prefix}_${truncatedHash}`;
}

/**
 * Generate synthetic IDs for a batch of real IDs
 */
export function generateSyntheticIdBatch(
  realIds: string[],
  config: AnonymizationConfig,
): Map<string, string> {
  const results = new Map<string, string>();

  for (const realId of realIds) {
    const syntheticId = generateSyntheticId(realId, config);
    results.set(realId, syntheticId);
  }

  return results;
}

/**
 * Generate a consistent but anonymous event context identifier
 */
export function generateEventContextId(eventId: string): string {
  return generateSyntheticId(eventId, {
    salt: "event_context",
    hashLength: 6,
    prefix: "EVT",
  });
}

/**
 * Generate anonymous participant IDs for analytics
 */
export function generateParticipantId(
  userId: string,
  eventId?: string,
): string {
  // Include event context for additional anonymization if provided
  const baseId = eventId ? `${userId}_${eventId}` : userId;

  return generateSyntheticId(baseId, {
    salt: "participant_analytics",
    hashLength: 8,
    prefix: "PART",
  });
}

/**
 * Generate anonymous application IDs for analytics
 */
export function generateApplicationId(applicationId: string): string {
  return generateSyntheticId(applicationId, {
    salt: "application_analytics",
    hashLength: 8,
    prefix: "APP",
  });
}

/**
 * Create a mapping of real IDs to synthetic IDs for batch processing
 */
export function createAnonymousMapping<T extends { id: string }>(
  items: T[],
  generateId: (id: string) => string,
): {
  mapping: Map<string, string>;
  anonymizedItems: Array<T & { anonymousId: string }>;
} {
  const mapping = new Map<string, string>();
  const anonymizedItems = items.map((item) => {
    const anonymousId = generateId(item.id);
    mapping.set(item.id, anonymousId);

    return {
      ...item,
      anonymousId,
    };
  });

  return { mapping, anonymizedItems };
}

/**
 * Remove identifying fields from data structures
 */
export function stripIdentifyingFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToRemove: (keyof T)[],
): Omit<T, keyof T> {
  const result = { ...data };

  for (const field of fieldsToRemove) {
    delete result[field];
  }

  return result;
}

/**
 * Anonymize user data for analytics
 */
export function anonymizeUserData(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  [key: string]: unknown;
}): {
  anonymousId: string;
  hasName: boolean;
  hasEmail: boolean;
  [key: string]: unknown;
} {
  const anonymousId = generateParticipantId(user.id);

  // Convert PII to boolean flags
  const result = stripIdentifyingFields(user, ["id", "name", "email"]);

  return {
    ...result,
    anonymousId,
    hasName: Boolean(user.name),
    hasEmail: Boolean(user.email),
  };
}

/**
 * Anonymize application data for analytics
 */
export function anonymizeApplicationData(application: {
  id: string;
  userId?: string | null;
  email?: string | null;
  [key: string]: unknown;
}): {
  anonymousId: string;
  anonymousUserId?: string;
  hasEmail: boolean;
  [key: string]: unknown;
} {
  const anonymousId = generateApplicationId(application.id);
  const anonymousUserId = application.userId
    ? generateParticipantId(application.userId)
    : undefined;

  const result = stripIdentifyingFields(application, ["id", "userId", "email"]);

  return {
    ...result,
    anonymousId,
    anonymousUserId,
    hasEmail: Boolean(application.email),
  };
}

/**
 * Generate deterministic but anonymous session tokens for rate limiting
 */
export function generateSessionToken(userId: string, endpoint: string): string {
  return generateSyntheticId(`${userId}_${endpoint}`, {
    salt: "rate_limit_session",
    hashLength: 16,
    prefix: "SESS",
  });
}

/**
 * Hash sensitive data for secure comparison without storing plain text
 */
export function hashSensitiveData(data: string, purpose: string): string {
  const secret = process.env.ANONYMIZATION_SECRET;
  if (!secret) {
    throw new Error("ANONYMIZATION_SECRET environment variable is required");
  }

  return crypto
    .createHash("sha256")
    .update(data + purpose + secret)
    .digest("hex");
}

/**
 * Validate that anonymization is working correctly
 */
export function validateAnonymization(
  original: { id: string; [key: string]: unknown },
  anonymized: { anonymousId: string; [key: string]: unknown },
): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check that original ID is not present
  if ("id" in anonymized || anonymized.anonymousId === original.id) {
    issues.push("Original ID is still present in anonymized data");
  }

  // Check that anonymous ID follows expected pattern
  if (!/^[A-Z]+_[a-f0-9]+$/.exec(anonymized.anonymousId)) {
    issues.push("Anonymous ID does not follow expected pattern");
  }

  // Check for potential PII leakage in string fields
  for (const [key, value] of Object.entries(anonymized)) {
    if (typeof value === "string" && value.includes("@")) {
      issues.push(`Field '${key}' may contain email address`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Environment setup helper - ensures required environment variables are present
 */
export function validateAnonymizationEnvironment(): {
  isValid: boolean;
  missingVariables: string[];
} {
  const requiredVars = ["ANONYMIZATION_SECRET"];
  const missingVariables: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVariables.push(varName);
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}
