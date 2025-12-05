/**
 * Biometric Authentication Service for Mobile App
 * Supports fingerprint and face recognition on Android/iOS
 */

import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

// Storage key for biometric credentials
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export interface BiometricCredentials {
  username: string;
  /** Encrypted password reference - actual password stored securely */
  passwordRef: string;
  userType: 'owner' | 'employee' | 'vendor';
  userId: string;
}

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: BiometryType;
  biometryTypeName: string;
  reason?: string;
}

/**
 * Check if biometric authentication is available on this device
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  // Only available on native platforms
  if (!Capacitor.isNativePlatform()) {
    return {
      isAvailable: false,
      biometryType: BiometryType.NONE,
      biometryTypeName: 'None',
      reason: 'Biometric auth only available on mobile devices',
    };
  }

  try {
    const result = await NativeBiometric.isAvailable();

    const biometryTypeName = getBiometryTypeName(result.biometryType);

    return {
      isAvailable: result.isAvailable,
      biometryType: result.biometryType,
      biometryTypeName,
      reason: result.isAvailable ? undefined : 'Biometric not enrolled or not available',
    };
  } catch (error) {
    console.error('[Biometric] Error checking availability:', error);
    return {
      isAvailable: false,
      biometryType: BiometryType.NONE,
      biometryTypeName: 'None',
      reason: 'Error checking biometric availability',
    };
  }
}

/**
 * Get human-readable biometry type name
 */
function getBiometryTypeName(type: BiometryType): string {
  switch (type) {
    case BiometryType.FINGERPRINT:
      return 'Fingerprint';
    case BiometryType.FACE_ID:
      return 'Face ID';
    case BiometryType.FACE_AUTHENTICATION:
      return 'Face Recognition';
    case BiometryType.IRIS_AUTHENTICATION:
      return 'Iris';
    case BiometryType.MULTIPLE:
      return 'Multiple Biometrics';
    default:
      return 'None';
  }
}

/**
 * Verify user with biometric authentication
 * Shows the native biometric prompt
 */
export async function verifyBiometric(reason: string = 'Verify your identity'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('[Biometric] Not available on web');
    return false;
  }

  try {
    const availability = await checkBiometricAvailability();
    if (!availability.isAvailable) {
      console.warn('[Biometric] Not available:', availability.reason);
      return false;
    }

    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Biometric Login',
      subtitle: 'Use your fingerprint or face to login',
      description: 'Tailor Shop Manager',
      negativeButtonText: 'Cancel',
      maxAttempts: 3,
    });

    return true;
  } catch (error) {
    console.error('[Biometric] Verification failed:', error);
    return false;
  }
}

/**
 * Store credentials for biometric login
 * Stores credentials securely using the device's secure storage
 */
export async function storeBiometricCredentials(credentials: BiometricCredentials): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.warn('[Biometric] Cannot store credentials on web');
    return false;
  }

  try {
    // First verify the user's identity before storing
    const verified = await verifyBiometric('Verify to enable biometric login');
    if (!verified) {
      return false;
    }

    // Store credentials in secure storage
    await NativeBiometric.setCredentials({
      username: credentials.username,
      password: JSON.stringify({
        passwordRef: credentials.passwordRef,
        userType: credentials.userType,
        userId: credentials.userId,
      }),
      server: 'com.tailorshop.manager', // App identifier
    });

    // Also store a flag in localStorage to know biometric is enabled
    localStorage.setItem(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify({
        enabled: true,
        username: credentials.username,
        userType: credentials.userType,
      })
    );

    console.log('[Biometric] Credentials stored successfully');
    return true;
  } catch (error) {
    console.error('[Biometric] Failed to store credentials:', error);
    return false;
  }
}

/**
 * Retrieve credentials after biometric verification
 * Returns credentials if user successfully authenticates
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    // First verify the user's identity
    const verified = await verifyBiometric('Login with biometrics');
    if (!verified) {
      return null;
    }

    // Get credentials from secure storage
    const credentials = await NativeBiometric.getCredentials({
      server: 'com.tailorshop.manager',
    });

    if (!credentials.username || !credentials.password) {
      return null;
    }

    const additionalData = JSON.parse(credentials.password);

    return {
      username: credentials.username,
      passwordRef: additionalData.passwordRef,
      userType: additionalData.userType,
      userId: additionalData.userId,
    };
  } catch (error) {
    console.error('[Biometric] Failed to get credentials:', error);
    return null;
  }
}

/**
 * Delete stored biometric credentials
 */
export async function deleteBiometricCredentials(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    localStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    return true;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: 'com.tailorshop.manager',
    });

    localStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    console.log('[Biometric] Credentials deleted');
    return true;
  } catch (error) {
    console.error('[Biometric] Failed to delete credentials:', error);
    return false;
  }
}

/**
 * Check if biometric login is enabled for this device
 */
export function isBiometricLoginEnabled(): boolean {
  try {
    const stored = localStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
    if (!stored) return false;

    const data = JSON.parse(stored);
    return data.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Get the username associated with biometric login
 */
export function getBiometricUsername(): string | null {
  try {
    const stored = localStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    return data.username || null;
  } catch {
    return null;
  }
}
