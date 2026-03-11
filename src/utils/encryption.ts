import crypto from "crypto";
import { env } from "~/env.js";

// Encryption algorithm
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a key from the encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  if (!env.ATPROTO_ENCRYPTION_KEY) {
    throw new Error("ATPROTO_ENCRYPTION_KEY environment variable is not set");
  }

  return crypto.pbkdf2Sync(
    env.ATPROTO_ENCRYPTION_KEY,
    salt,
    100000,
    KEY_LENGTH,
    "sha512",
  );
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns a base64-encoded string containing: salt:iv:tag:encrypted_data
 */
export function encrypt(text: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from password and salt
    const key = deriveKey(salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the text
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    // Return base64-encoded string
    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts a string that was encrypted with encrypt()
 * Expects base64-encoded string containing: salt:iv:tag:encrypted_data
 */
export function decrypt(encryptedData: string): string {
  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from password and salt
    const key = deriveKey(salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Checks if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  return (
    !!env.ATPROTO_ENCRYPTION_KEY && env.ATPROTO_ENCRYPTION_KEY.length >= 32
  );
}
