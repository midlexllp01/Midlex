"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type ClientPracticeDept = "LITIGATION" | "GENERAL";
type LoginUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "LAWYER" | "CLIENT" | "ACCOUNTANT";
  litigationTeam?: string;
};

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [clientDepartment, setClientDepartment] = useState<ClientPracticeDept | null>(null);
  const { login } = useAuth();

  const completeLogin = (token: string, user: LoginUser) => {
    if (user.role === "CLIENT") {
      if (!clientDepartment) {
        setError("Choose Litigation or General & Property before signing in.");
        return false;
      }
      localStorage.setItem("midlex_client_dept", clientDepartment);
    }

    login(token, user);
    return true;
  };

  useEffect(() => {
    setEmail("");
    setPassword("");
    const clearTimer = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 100);
    // Ping backend immediately when visiting the login page
    try {
      apiFetch("/health").catch(() => {});
    } catch {}
    return () => clearTimeout(clearTimer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    setIsWakingUp(false);

    const wakeUpTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 3000);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (!completeLogin(data.access_token, data.user)) return;
    } catch (err: any) {
      // Check if user registered in browser local backup
      if (typeof window !== 'undefined') {
        const savedReg = localStorage.getItem(`midlex_reg_${cleanEmail}`);
        if (savedReg) {
          try {
            const localUser = JSON.parse(savedReg);
            if (localUser.password === password) {
              completeLogin(`token-local-${Date.now()}`, {
                id: localUser.id || `client-${Date.now()}`,
                email: cleanEmail,
                name: localUser.name || cleanEmail,
                role: (localUser.role as LoginUser["role"]) || 'CLIENT',
              });
              return;
            }
          } catch (e) {}
        }
      }
      setError(err.message || "Invalid credentials");
    } finally {
      clearTimeout(wakeUpTimer);
      setIsSubmitting(false);
      setIsWakingUp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleSubmitting(true);
    try {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
          !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.NEXT_PUBLIC_FIREBASE_APP_ID) {
        throw new Error("Google sign-in is not configured yet. Please contact Midlex support.");
      }
      const firebaseApp = getApps().length ? getApp() : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
      const result = await signInWithPopup(getAuth(firebaseApp), new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const data = await apiFetch("/auth/google", {
        method: "POST",
        body: JSON.stringify({ idToken }),
      });
      completeLogin(data.access_token, data.user);
    } catch (err: any) {
      const message = String(err?.message || "Google sign-in failed.");
      setError(message.includes("auth/popup-closed-by-user") ? "Google sign-in was cancelled." : message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12 w-full max-w-full overflow-x-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        input,
        input:focus,
        input:active,
        input:hover,
        input:not(:placeholder-shown),
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          background-color: #ffffff !important;
          caret-color: #000000 !important;
          opacity: 1 !important;
          font-weight: 700 !important;
        }
      ` }} />

      <div className="absolute inset-0 z-0 opacity-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-primary rounded-full blur-[100px] sm:blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl sm:rounded-[32px] shadow-2xl p-6 sm:p-10 relative z-10 border border-gray-100 max-w-full"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-10 text-center">
          <Link href="/" className="mb-4 sm:mb-6">
            <img src="/logo.jpg" alt="Midlex LLP" className="h-20 sm:h-28 w-auto object-contain" />
          </Link>
          <span className="px-3.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Client & User Portal Sign In
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-center text-xs sm:text-sm max-w-xs">
            Sign in with your registered Client, Lawyer, or Admin credentials to access your portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" method="post" action="#" className="space-y-6">
          {/* Hidden decoy fields to trap aggressive browser autofill */}
          <input
            type="text"
            name="prevent_autofill_client_usr"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: "none" }}
          />
          <input
            type="password"
            name="prevent_autofill_client_pwd"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="new-password"
            style={{ position: "absolute", opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: "none" }}
          />

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Client Workspace</label>
            <p className="text-xs text-gray-500 mb-3">
              Clients must choose a workspace when signing in. Sign out to change it later.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClientDepartment("LITIGATION")}
                aria-pressed={clientDepartment === "LITIGATION"}
                className={`rounded-2xl border-2 px-3 py-4 text-left transition-all ${
                  clientDepartment === "LITIGATION"
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-primary hover:border-primary/50"
                }`}
              >
                <span className="block text-lg">⚖️</span>
                <span className="block text-xs font-black mt-1">Litigation</span>
              </button>
              <button
                type="button"
                onClick={() => setClientDepartment("GENERAL")}
                aria-pressed={clientDepartment === "GENERAL"}
                className={`rounded-2xl border-2 px-3 py-4 text-left transition-all ${
                  clientDepartment === "GENERAL"
                    ? "border-secondary bg-amber-950 text-white"
                    : "border-gray-200 bg-white text-primary hover:border-secondary/50"
                }`}
              >
                <span className="block text-lg">🏢</span>
                <span className="block text-xs font-black mt-1">General &amp; Property</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-primary mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
              <input
                type="email"
                id="midlex_client_email_input"
                name="midlex_client_email_input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ color: "#000000", WebkitTextFillColor: "#000000", backgroundColor: "#ffffff" }}
                className="w-full bg-white border-2 border-slate-400 text-slate-900 font-bold rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-primary mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                id="midlex_client_pwd_input"
                name="midlex_client_pwd_input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ color: "#000000", WebkitTextFillColor: "#000000", backgroundColor: "#ffffff" }}
                className="w-full bg-white border-2 border-slate-400 text-slate-900 font-bold rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-400"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-secondary transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-sm">
            <Link href="/forgot-password" className="text-secondary font-bold hover:underline">
              Forgot password?
            </Link>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? "Signing In..." : "Sign In"} <ArrowRight size={20} />
          </motion.button>

          {isWakingUp && (
            <p className="text-xs text-center text-amber-700 font-medium animate-pulse mt-2">
              Connecting to secure server... If the service was idle, it may take a few moments to initialize.
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span>or continue with Google</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full min-h-12 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          >
            {isGoogleSubmitting ? (
              <span>Connecting to Google…</span>
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4) scale(1 .83)" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.64 5.93c4.46-4.12 7.14-10.2 7.14-17.58Z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.87l-7.64-5.93c-2.13 1.43-4.85 2.28-8.27 2.28-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-secondary font-bold hover:underline">
            Create one
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
