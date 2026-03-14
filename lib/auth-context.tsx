'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signUp, signIn, signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      
      setUser({
        id: currentUser.userId,
        email: attributes.email || '',
        firstName: attributes.given_name,
        lastName: attributes.family_name,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    // Clear any existing session first
    try { await signOut(); } catch {}
    
    const result = await signIn({ username: email, password });
    
    if (!result.isSignedIn && result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
      const error = new Error('User is not confirmed');
      error.name = 'UserNotConfirmedException';
      throw error;
    }
    
    await checkUser();
    return result;
  }

  async function handleSignUp(email: string, password: string, firstName: string, lastName: string) {
    await signUp({
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

  async function handleSignOut() {
    await signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn: handleSignIn, 
      signUp: handleSignUp, 
      signOut: handleSignOut 
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
