'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  signUp as amplifySignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignIn,
  signInWithRedirect,
  getCurrentUser,
  fetchUserAttributes,
  setUpTOTP,
  verifyTOTPSetup as amplifyVerifyTotpSetup,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '@/amplify/data/resource';

// --- Types ---

export type AuthMethod = 'email' | 'passkey' | 'google';

export interface SignInResult {
  isSignedIn: boolean;
  nextStep?: 'TOTP_REQUIRED' | 'CONFIRM_SIGN_UP';
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authMethod?: AuthMethod;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsCompanyProfile: boolean;
  // Sign-in methods
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<void>;
  signInWithPasskey: () => Promise<void>;
  confirmTotpCode: (code: string) => Promise<void>;
  // Sign-up
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  // Sign-out
  signOut: () => Promise<void>;
  // TOTP management (for settings page)
  setupTotp: () => Promise<{ qrUri: string; secretKey: string }>;
  verifyTotpSetup: (code: string) => Promise<void>;
  // Company profile flag
  clearNeedsCompanyProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsCompanyProfile, setNeedsCompanyProfile] = useState(false);

  // --- Core user check ---

  const checkUser = useCallback(async (method?: AuthMethod) => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      setUser({
        id: currentUser.userId,
        email: attributes.email || '',
        firstName: attributes.given_name,
        lastName: attributes.family_name,
        authMethod: method,
      });

      // Check if company profile exists
      try {
        const client = generateClient<Schema>();
        const { data: profiles } = await client.models.CompanyProfile.list();
        setNeedsCompanyProfile(!profiles || profiles.length === 0);
      } catch (profileError) {
        console.error('Failed to check company profile:', profileError);
        // Default to false — don't block sign-in if profile check fails
        setNeedsCompanyProfile(false);
      }
    } catch {
      setUser(null);
      setNeedsCompanyProfile(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Initial session check ---

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  // --- Hub listener for Google sign-in redirect ---

  useEffect(() => {
    const hubListenerCancel = Hub.listen('auth', async ({ payload }) => {
      if (payload.event === 'signInWithRedirect') {
        await checkUser('google');
      }
      if (payload.event === 'signInWithRedirect_failure') {
        console.error('Social sign-in failed:', payload.data);
      }
    });

    return () => hubListenerCancel();
  }, [checkUser]);

  // --- Sign-in with email/password ---

  async function handleSignInWithEmail(email: string, password: string): Promise<SignInResult> {
    // Clear any existing session first
    try { await amplifySignOut(); } catch { /* ignore */ }

    const result = await amplifySignIn({ username: email, password });

    if (!result.isSignedIn) {
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        return { isSignedIn: false, nextStep: 'CONFIRM_SIGN_UP' };
      }
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        return { isSignedIn: false, nextStep: 'TOTP_REQUIRED' };
      }
    }

    await checkUser('email');
    return { isSignedIn: true };
  }

  // --- Sign-in with Google ---

  async function handleSignInWithGoogle(): Promise<void> {
    await signInWithRedirect({ provider: 'Google' });
    // Redirect happens — Hub listener handles the callback
  }

  // --- Sign-in with Passkey (WebAuthn) ---

  async function handleSignInWithPasskey(): Promise<void> {
    let result = await amplifySignIn({
      options: { authFlowType: 'USER_AUTH', preferredChallenge: 'WEB_AUTHN' },
    });

    // Handle first factor selection challenge by selecting WebAuthn
    if (!result.isSignedIn && result.nextStep?.signInStep === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
      result = await confirmSignIn({ challengeResponse: 'WEB_AUTHN' });
    }

    if (result.isSignedIn) {
      await checkUser('passkey');
    }
  }

  // --- Confirm TOTP code (MFA step) ---

  async function handleConfirmTotpCode(code: string): Promise<void> {
    const result = await confirmSignIn({ challengeResponse: code });
    if (result.isSignedIn) {
      await checkUser('email'); // TOTP only applies to email/password
    }
  }

  // --- Sign-up ---

  async function handleSignUp(email: string, password: string, firstName: string, lastName: string): Promise<void> {
    await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          given_name: firstName,
          family_name: lastName,
        },
      },
    });
  }

  // --- Sign-out ---

  async function handleSignOut(): Promise<void> {
    await amplifySignOut();
    setUser(null);
    setNeedsCompanyProfile(false);
  }

  // --- TOTP setup (for settings page) ---

  async function handleSetupTotp(): Promise<{ qrUri: string; secretKey: string }> {
    const totpSetup = await setUpTOTP();
    const secretKey = totpSetup.sharedSecret;
    const qrUri = totpSetup.getSetupUri('CloudPro Books').toString();
    return { qrUri, secretKey };
  }

  // --- TOTP verify setup (for settings page) ---

  async function handleVerifyTotpSetup(code: string): Promise<void> {
    await amplifyVerifyTotpSetup({ code });
  }

  // --- Clear company profile flag ---

  function clearNeedsCompanyProfile(): void {
    setNeedsCompanyProfile(false);
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      needsCompanyProfile,
      signInWithEmail: handleSignInWithEmail,
      signInWithGoogle: handleSignInWithGoogle,
      signInWithPasskey: handleSignInWithPasskey,
      confirmTotpCode: handleConfirmTotpCode,
      signUp: handleSignUp,
      signOut: handleSignOut,
      setupTotp: handleSetupTotp,
      verifyTotpSetup: handleVerifyTotpSetup,
      clearNeedsCompanyProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
