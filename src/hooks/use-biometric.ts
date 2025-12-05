/**
 * React Hook for Biometric Authentication
 * Provides easy-to-use biometric auth functionality for components
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  checkBiometricAvailability,
  verifyBiometric,
  storeBiometricCredentials,
  getBiometricCredentials,
  deleteBiometricCredentials,
  isBiometricLoginEnabled,
  getBiometricUsername,
  BiometricAvailability,
  BiometricCredentials,
} from '@/lib/biometricAuth';

export interface UseBiometricReturn {
  /** Whether biometric auth is available on this device */
  isAvailable: boolean;
  /** Type of biometric (fingerprint, face, etc.) */
  biometryType: string;
  /** Whether biometric login is enabled for this user */
  isEnabled: boolean;
  /** The username associated with biometric login */
  savedUsername: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Enable biometric login for a user */
  enableBiometric: (credentials: BiometricCredentials) => Promise<boolean>;
  /** Disable biometric login */
  disableBiometric: () => Promise<boolean>;
  /** Perform biometric login */
  loginWithBiometric: () => Promise<BiometricCredentials | null>;
  /** Verify identity with biometric */
  verifyIdentity: (reason?: string) => Promise<boolean>;
  /** Refresh availability status */
  checkAvailability: () => Promise<void>;
}

/**
 * Hook for managing biometric authentication
 */
export function useBiometric(): UseBiometricReturn {
  const [availability, setAvailability] = useState<BiometricAvailability>({
    isAvailable: false,
    biometryType: 0,
    biometryTypeName: 'None',
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check biometric availability on mount
   */
  const checkAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only check on native platforms
      if (!Capacitor.isNativePlatform()) {
        setAvailability({
          isAvailable: false,
          biometryType: 0,
          biometryTypeName: 'None',
          reason: 'Web platform - biometric not available',
        });
        setIsEnabled(false);
        setSavedUsername(null);
        return;
      }

      const result = await checkBiometricAvailability();
      setAvailability(result);

      // Check if biometric is enabled for this device
      const enabled = isBiometricLoginEnabled();
      setIsEnabled(enabled);

      if (enabled) {
        const username = getBiometricUsername();
        setSavedUsername(username);
      }
    } catch (err) {
      console.error('[useBiometric] Error checking availability:', err);
      setError('Failed to check biometric availability');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  /**
   * Enable biometric login for a user
   */
  const enableBiometric = useCallback(
    async (credentials: BiometricCredentials): Promise<boolean> => {
      setError(null);

      if (!availability.isAvailable) {
        setError('Biometric authentication not available');
        return false;
      }

      try {
        const success = await storeBiometricCredentials(credentials);
        if (success) {
          setIsEnabled(true);
          setSavedUsername(credentials.username);
        }
        return success;
      } catch (err) {
        console.error('[useBiometric] Error enabling biometric:', err);
        setError('Failed to enable biometric login');
        return false;
      }
    },
    [availability.isAvailable]
  );

  /**
   * Disable biometric login
   */
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const success = await deleteBiometricCredentials();
      if (success) {
        setIsEnabled(false);
        setSavedUsername(null);
      }
      return success;
    } catch (err) {
      console.error('[useBiometric] Error disabling biometric:', err);
      setError('Failed to disable biometric login');
      return false;
    }
  }, []);

  /**
   * Login with biometric
   */
  const loginWithBiometric = useCallback(async (): Promise<BiometricCredentials | null> => {
    setError(null);

    if (!isEnabled) {
      setError('Biometric login not enabled');
      return null;
    }

    try {
      const credentials = await getBiometricCredentials();
      return credentials;
    } catch (err) {
      console.error('[useBiometric] Error during biometric login:', err);
      setError('Biometric login failed');
      return null;
    }
  }, [isEnabled]);

  /**
   * Verify identity with biometric
   */
  const verifyIdentity = useCallback(
    async (reason?: string): Promise<boolean> => {
      setError(null);

      if (!availability.isAvailable) {
        setError('Biometric authentication not available');
        return false;
      }

      try {
        return await verifyBiometric(reason);
      } catch (err) {
        console.error('[useBiometric] Error verifying identity:', err);
        setError('Biometric verification failed');
        return false;
      }
    },
    [availability.isAvailable]
  );

  return {
    isAvailable: availability.isAvailable,
    biometryType: availability.biometryTypeName,
    isEnabled,
    savedUsername,
    isLoading,
    error,
    enableBiometric,
    disableBiometric,
    loginWithBiometric,
    verifyIdentity,
    checkAvailability,
  };
}

export default useBiometric;
