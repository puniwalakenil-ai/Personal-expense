import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, ShieldAlert, LogOut, CheckCircle2, Smartphone, Laptop, Database } from 'lucide-react';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading, isSigningIn, isAuthorized, authorizedEmail, loginError, signInWithGoogle, logout, clearError } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <Lock className="w-7 h-7 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Verifying Secure Identity</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to private Cloud Firestore vault...</p>
      </div>
    );
  }

  // Case 1: An unauthorized Google account was authenticated
  if (currentUser && !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/50 text-center relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-5 text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-3">
            Access Strictly Denied
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
            Unauthorized Google Account
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
            You signed in as <strong className="text-rose-300 font-semibold">{currentUser.email}</strong>. This personal finance vault is strictly locked to:
          </p>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl py-2.5 px-4 mb-6">
            <span className="text-xs font-mono font-bold text-emerald-400">{authorizedEmail}</span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
            All database operations, reading, and writing are denied by Cloud Firestore security rules. No financial records were exposed.
          </p>

          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Not authenticated at all
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header Icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Trust Vault
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Tech Expenses
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Private Personal Finance Vault with secure Cloud Firestore synchronization for iPhone and Laptop.
            </p>

            {/* Single User Lock Badge */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 mb-6">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Authorized Owner Only
                  </div>
                  <div className="text-xs font-mono font-semibold text-indigo-300 mt-0.5">
                    {authorizedEmail}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Public sign-ups and external accounts are blocked by Firestore security rules.
                  </p>
                </div>
              </div>
            </div>

            {loginError && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="leading-relaxed">{loginError}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="text-rose-400 hover:text-white font-bold text-sm leading-none p-1 cursor-pointer"
                    aria-label="Dismiss message"
                  >
                    ×
                  </button>
                </div>
                {loginError.toLowerCase().includes('popup was blocked') && (
                  <div className="pt-2 border-t border-rose-500/20 text-[11px] text-slate-300">
                    💡 <strong>Tip:</strong> Look for the popup blocked icon in your browser address bar and select "Always allow popups", then click Sign in with Google below.
                  </div>
                )}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isSigningIn}
              className="w-full inline-flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-xl shadow-white/5 cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Privacy Feature Highlights */}
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero-Trust Firestore Rules guard all entries</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1 text-indigo-400 shrink-0">
                  <Laptop className="w-3.5 h-3.5" />
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span>Seamless real-time synchronization across devices</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Database className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Existing data preserved and migrated automatically</span>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Track My Expenses · Secure Private Edition · 2026
          </p>
        </div>
      </div>
    );
  }

  // Case 3: Authenticated and authorized as puniwalakenil@gmail.com
  return <>{children}</>;
};
