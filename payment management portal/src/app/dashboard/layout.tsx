"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  DollarSign, 
  LogOut, 
  ShieldCheck, 
  CreditCard, 
  FileText, 
  Landmark, 
  Layers,
  ArrowUpRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Finance Management Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Midlex LLP" className="h-12 w-auto object-contain rounded" />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-950 text-base sm:text-lg tracking-tight">MIDLEX LLP</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Finance & Payments
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Accounting, Invoicing & Financial Operations</p>
                </div>
              </Link>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-3 text-right">
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-slate-900">{user.name || "Chief Accountant"}</p>
                  <p className="text-xs text-emerald-700 font-semibold">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center shadow">
                  {user.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Midlex LLP. Financial Management & Client Accounting Operations.</span>
          <span className="text-emerald-700 font-semibold">Connected to Render Backend (https://midlex-new.onrender.com)</span>
        </div>
      </footer>
    </div>
  );
}
