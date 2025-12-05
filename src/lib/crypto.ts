/**
 * Secure Cryptographic Utilities for Mobile App
 * Uses Web Crypto API (AES-256-GCM) - Works in browsers and Capacitor
 */

// Encryption key derived from environment variable or fallback
// In production, this should be stored securely (e.g., Keychain/Keystore)
const ENCRYPTION_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'tailor-shop-secure-key-2024';

/**
 * Convert string to Uint8Array
 */
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
function bufferToString(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive a cryptographic key from the secret using PBKDF2
 */
async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBuffer(ENCRYPTION_SECRET),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a secure random IV (Initialization Vector)
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt a password using AES-256-GCM
 * Returns a base64 encoded string containing: salt + iv + ciphertext
 * @param plainPassword - The plain text password to encrypt
 * @returns Encrypted password as base64 string
 */
export async function encryptPassword(plainPassword: string): Promise<string> {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(salt);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      stringToBuffer(plainPassword)
    );

    // Combine salt (16 bytes) + iv (12 bytes) + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password using AES-256-GCM
 * @param encryptedPassword - The base64 encoded encrypted password
 * @returns Decrypted plain text password or null if decryption fails
 */
export async function decryptPassword(encryptedPassword: string): Promise<string | null> {
  try {
    if (!encryptedPassword) {
      console.error('[Crypto] No encrypted password provided');
      return null;
    }

    const combined = new Uint8Array(base64ToArrayBuffer(encryptedPassword));

    // Extract salt (16 bytes), iv (12 bytes), and ciphertext
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKey(salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    return bufferToString(new Uint8Array(decrypted));
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return null;
  }
}

/**
 * Hash a password using SHA-256 (one-way hash for comparison)
 * This is useful for storing password hashes instead of encrypted passwords
 * @param password - The password to hash
 * @param salt - Optional salt (will be generated if not provided)
 * @returns Object containing the hash and salt as base64 strings
 */
export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  try {
    const salt = existingSalt
      ? new Uint8Array(base64ToArrayBuffer(existingSalt))
      : generateSalt();

    // Combine password and salt
    const combined = stringToBuffer(password + bufferToString(salt));

    // Hash using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);

    return {
      hash: arrayBufferToBase64(hashBuffer),
      salt: arrayBufferToBase64(salt.buffer),
    };
  } catch (error) {
    console.error('[Crypto] Hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a stored hash
 * @param password - The plain text password to verify
 * @param storedHash - The stored hash to compare against
 * @param salt - The salt used when creating the hash
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('[Crypto] Verification failed:', error);
    return false;
  }
}

/**
 * Generate a secure random password
 * @param length - Password length (default: 12)
 * @returns Secure random password
 */
export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let password = '';

  // Ensure at least one of each type
  password += uppercase[randomValues[0] % uppercase.length];
  password += lowercase[randomValues[1] % lowercase.length];
  password += numbers[randomValues[2] % numbers.length];
  password += special[randomValues[3] % special.length];

  // Fill remaining characters
  for (let i = 4; i < length; i++) {
    password += allChars[randomValues[i] % allChars.length];
  }

  // Shuffle the password using Fisher-Yates
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = randomValues[i % randomValues.length] % (i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

/**
 * Check if a string is already encrypted (base64 with proper length)
 * This helps with migration from old plain text/base64 passwords
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  try {
    // Encrypted passwords have: 16 (salt) + 12 (iv) + at least 16 (ciphertext + tag) = 44+ bytes
    // Base64 encoding increases size by ~33%, so minimum ~60 characters
    const decoded = atob(value);
    return decoded.length >= 44;
  } catch {
    return false;
  }
}

/**
 * Migrate a legacy password (plain text or old base64) to new encrypted format
 * @param legacyPassword - The old password (plain text or base64)
 * @param isBase64 - Whether the legacy password is base64 encoded
 * @returns New encrypted password
 */
export async function migrateLegacyPassword(legacyPassword: string, isBase64: boolean = false): Promise<string> {
  try {
    // If already encrypted with new format, return as-is
    if (isEncrypted(legacyPassword)) {
      return legacyPassword;
    }

    // Decode base64 if needed
    let plainPassword = legacyPassword;
    if (isBase64) {
      try {
        plainPassword = atob(legacyPassword);
      } catch {
        // Not valid base64, treat as plain text
        plainPassword = legacyPassword;
      }
    }

    // Encrypt with new format
    return await encryptPassword(plainPassword);
  } catch (error) {
    console.error('[Crypto] Migration failed:', error);
    throw new Error('Failed to migrate password');
  }
}
