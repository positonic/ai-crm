import {
  createHash,
  randomBytes,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
} from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000; // High iteration count for security

// Get the app secret for key derivation
function getAppSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is required for encryption",
    );
  }
  return secret;
}

// Generate a cryptographically secure random salt
export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString("hex");
}

// Generate a cryptographically secure random IV
export function generateIV(): string {
  return randomBytes(IV_LENGTH).toString("hex");
}

// Derive encryption key from user ID and app secret
function deriveKey(userId: string, salt: string): Buffer {
  const appSecret = getAppSecret();
  const keyMaterial = `${userId}:${appSecret}`;
  return pbkdf2Sync(keyMaterial, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
}

// Encrypt data using AES-256-GCM
export function encryptData(
  data: string,
  userId: string,
  salt: string,
  iv: string,
): string {
  try {
    const key = deriveKey(userId, salt);

    // For GCM mode, IV should be 12 bytes (96 bits)
    const ivBuffer = Buffer.from(iv, "hex");
    if (ivBuffer.length !== 12) {
      throw new Error("IV must be 12 bytes for AES-256-GCM");
    }

    const cipher = createCipheriv(ALGORITHM, key, ivBuffer);

    // Set Additional Authenticated Data (AAD)
    cipher.setAAD(Buffer.from(userId, "utf8"));

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get authentication tag for GCM
    const authTag = cipher.getAuthTag();

    // Combine encrypted data with auth tag
    return encrypted + authTag.toString("hex");
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Decrypt data using AES-256-GCM
export function decryptData(
  encryptedData: string,
  userId: string,
  salt: string,
  iv: string,
): string {
  try {
    const key = deriveKey(userId, salt);

    // For GCM mode, IV should be 12 bytes (96 bits)
    const ivBuffer = Buffer.from(iv, "hex");
    if (ivBuffer.length !== 12) {
      throw new Error("IV must be 12 bytes for AES-256-GCM");
    }

    // Split encrypted data and auth tag
    const authTagHex = encryptedData.slice(-TAG_LENGTH * 2);
    const encrypted = encryptedData.slice(0, -TAG_LENGTH * 2);

    const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);

    // Set Additional Authenticated Data (AAD) - must match encryption
    decipher.setAAD(Buffer.from(userId, "utf8"));

    // Set authentication tag - must be done before update/final for GCM
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Invalid data or key"}`,
    );
  }
}

// Encrypt Telegram session data
export interface TelegramCredentials {
  apiId: string;
  apiHash: string;
  sessionString: string;
}

export interface EncryptedTelegramAuth {
  encryptedApiId: string;
  encryptedApiHash: string;
  encryptedSession: string;
  salt: string;
  iv: string;
}

export function encryptTelegramCredentials(
  credentials: TelegramCredentials,
  userId: string,
): EncryptedTelegramAuth {
  const salt = generateSalt();
  const iv = generateIV();

  return {
    encryptedApiId: encryptData(credentials.apiId, userId, salt, iv),
    encryptedApiHash: encryptData(credentials.apiHash, userId, salt, iv),
    encryptedSession: encryptData(credentials.sessionString, userId, salt, iv),
    salt,
    iv,
  };
}

export function decryptTelegramCredentials(
  encrypted: EncryptedTelegramAuth,
  userId: string,
): TelegramCredentials {
  return {
    apiId: decryptData(
      encrypted.encryptedApiId,
      userId,
      encrypted.salt,
      encrypted.iv,
    ),
    apiHash: decryptData(
      encrypted.encryptedApiHash,
      userId,
      encrypted.salt,
      encrypted.iv,
    ),
    sessionString: decryptData(
      encrypted.encryptedSession,
      userId,
      encrypted.salt,
      encrypted.iv,
    ),
  };
}

// Secure comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// Generate session expiration date (30 days from now)
export function getSessionExpiration(): Date {
  const expirationMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  return new Date(Date.now() + expirationMs);
}

// Check if session is expired
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// Hash sensitive data for audit logging (one-way)
export function hashForAudit(data: string): string {
  return createHash("sha256").update(data).digest("hex").substring(0, 16);
}
