import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, googleProvider, AUTHORIZED_EMAIL, isUserAuthorized, testConnection } from '../lib/firebase';

const SESSION_STORAGE_FLAG = 'tech_expenses_user_authenticated';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isAuthorized: boolean;
  authorizedEmail: string;
  loginError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Run connection test on boot
    testConnection().catch((err) => {
      console.warn('Initial connection probe:', err);
    });

    // Explicitly configure browserLocalPersistence to keep session active across tab closes, browser restarts, and refreshes
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Set persistence failed:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (isUserAuthorized(user)) {
          setCurrentUser(user);
          setLoginError(null);
          try {
            localStorage.setItem(SESSION_STORAGE_FLAG, 'true');
          } catch {}
        } else {
          // Explicitly reject unauthorized accounts
          setCurrentUser(user);
          setLoginError(`Unauthorized Google account: ${user.email}. Access is strictly restricted to ${AUTHORIZED_EMAIL}.`);
          try {
            localStorage.removeItem(SESSION_STORAGE_FLAG);
          } catch {}
        }
      } else {
        setCurrentUser(null);
        try {
          localStorage.removeItem(SESSION_STORAGE_FLAG);
        } catch {}
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoginError(null);
    setIsSigningIn(true);
    try {
      // NOTE: Call signInWithPopup directly without any preceding await
      // to preserve the synchronous user gesture tick required by browsers for window.open
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!isUserAuthorized(user)) {
        setLoginError(
          `Access Denied: ${user.email || 'This account'} is not authorized. This vault is privately restricted to ${AUTHORIZED_EMAIL}.`
        );
        try {
          localStorage.removeItem(SESSION_STORAGE_FLAG);
        } catch {}
        await fbSignOut(auth);
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
        setLoginError(null);
        try {
          localStorage.setItem(SESSION_STORAGE_FLAG, 'true');
        } catch {}
      }
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      if (err && typeof err === 'object') {
        const error = err as { code?: string; message?: string };
        const code = error.code || '';
        const msg = error.message || '';
        if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
          setLoginError('Popup was blocked by your browser. Please allow popups for this site in your browser URL bar or settings, then click Sign in with Google again.');
        } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
          setLoginError('Sign-in prompt was closed. Please click Sign in with Google to continue.');
        } else if (code === 'auth/cancelled-popup-request' || msg.includes('cancelled-popup-request')) {
          setLoginError('A sign-in window is already open. Please switch to the open window.');
        } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
          setLoginError('This domain is not authorized in Firebase Auth settings. Please verify authorized domains.');
        } else {
          setLoginError(msg || 'An unknown error occurred during sign-in.');
        }
      } else {
        setLoginError('An unknown error occurred during sign-in.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      try {
        localStorage.removeItem(SESSION_STORAGE_FLAG);
      } catch {}
      await fbSignOut(auth);
      setCurrentUser(null);
      setLoginError(null);
    } catch (err) {
      console.error('Sign-Out Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setLoginError(null);

  const isAuthorized = isUserAuthorized(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isSigningIn,
        isAuthorized,
        authorizedEmail: AUTHORIZED_EMAIL,
        loginError,
        signInWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
