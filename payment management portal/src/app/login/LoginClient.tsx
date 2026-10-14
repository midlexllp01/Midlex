"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff, DollarSign, ShieldCheck } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

export default function LoginClient() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("accountant@midlex.com");
  const [password, setPassword] = useState("accountant123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    try {
      apiFetch("/health").catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    setIsWakingUp(false);

    const wakeUpTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 3000);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      // Role check: Only ACCOUNTANT and ADMIN are authorized for Finance & Payment Management
      const allowedRoles = ["ACCOUNTANT", "ADMIN"];
      if (!allowedRoles.includes(data.user?.role)) {
        setError(`Access denied. Role "${data.user?.role}" is not authorized for Financial Management.`);
        return;
      }

      login(data.access_token, data.user);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      clearTimeout(wakeUpTimer);
      setIsSubmitting(false);
      setIsWakingUp(false);
    }
  };

  const fillAccountantCreds = () => {
    setEmail("accountant@midlex.com");
    setPassword("accountant123");
    setError("");
  };

  const fillAdminCreds = () => {
    setEmail("midlexllp01@gmail.com");
    setPassword("Admin@123");
    setError("");
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12 w-full max-w-full overflow-x-hidden relative" />
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-3 sm:p-6 py-6 sm:py-12 w-full max-w-full overflow-x-hidden relative">
      <div className="absolute inset-0 z-0 opacity-5 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-primary rounded-full blur-[100px] sm:blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-secondary rounded-full blur-[100px] sm:blur-[120px] translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl sm:rounded-[32px] shadow-2xl p-6 sm:p-10 relative z-10 border border-gray-100 max-w-full"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
          <div className="mb-4 sm:mb-6">
            <img src="/logo.jpg" alt="Midlex LLP" className="h-20 sm:h-28 w-auto object-contain" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <DollarSign size={14} /> Payment & Finance Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Finance & Accountant Login</h1>
          <p className="text-gray-500 text-center text-xs sm:text-sm max-w-xs">
            Sign in to manage client invoices, verify bank payments, and oversee firm financial duties.
          </p>
        </div>

        {/* Quick Fill Pills */}
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
            <span>Quick Test Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillAccountantCreds}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-emerald-50 hover:border-emerald-400 transition-all text-left flex flex-col"
            >
              <span className="text-emerald-700">💼 Chief Accountant</span>
              <span className="text-[10px] text-slate-500 font-normal">accountant@midlex.com</span>
            </button>
            <button
              type="button"
              onClick={fillAdminCreds}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-400 transition-all text-left flex flex-col"
            >
              <span className="text-blue-700">🛡️ Super Admin</span>
              <span className="text-[10px] text-slate-500 font-normal">midlexllp01@gmail.com</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Finance Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all placeholder:text-gray-400"
                placeholder="accountant@midlex.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold rounded-2xl py-3.5 pl-12 pr-12 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? "Authenticating..." : "Finance Sign In"} <ArrowRight size={20} />
          </motion.button>

          {isWakingUp && (
            <p className="text-xs text-center text-amber-700 font-medium animate-pulse mt-2">
              Connecting to secure financial server... Cold-start in progress.
            </p>
          )}
        </form>

        <div className="mt-8 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-700" /> Authorized Midlex LLP Accounting & Finance Department
        </div>
      </motion.div>
    </main>
  );
}
