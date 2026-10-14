"use client";

import React, { useEffect, useState, useDeferredValue } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Landmark,
  ArrowUpRight,
  Filter,
  Eye,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Scale,
  Calendar,
  Building,
  User,
  AlertCircle,
  CreditCard
} from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  txRef: string;
  createdAt: string;
  dueDate?: string | null;
  description?: string | null;
  case?: { id: string; title: string; lawyer?: { name: string } } | null;
  client?: { id: string; name: string; email: string; phone?: string } | null;
  account?: {
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
    label?: string | null;
  } | null;
  proofUrl?: string | null;
  proofSubmittedAt?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
  verifiedBy?: { name: string } | null;
}

interface Allocation {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  litigationTeam?: string | null;
  client: { id?: string; name: string; email: string; phone?: string };
  lawyer: { id?: string; name: string; email: string; phone?: string };
  totalPaid: number;
  totalPending: number;
  paymentCount: number;
}

interface PaymentAccount {
  id: string;
  label?: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  isActive: boolean;
}

interface CaseItem {
  id: string;
  title: string;
  client?: { id: string; name: string; email: string } | null;
  lawyer?: { id: string; name: string } | null;
  litigationTeam?: string | null;
}

export default function PaymentManagementDashboard() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "invoices" | "allocations" | "accounts">("transactions");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Payment | null>(null);

  // Forms
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestForm, setRequestForm] = useState({
    caseId: "",
    amount: "",
    currency: "NGN",
    description: "",
    dueDate: "",
    accountId: "",
  });

  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountForm, setAccountForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    currency: "NGN",
    label: "",
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationNote, setVerificationNote] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [payList, allocList, accList, caseList] = await Promise.all([
        apiFetch("/payments").catch(() => []),
        apiFetch("/cases/allocations").catch(() => []),
        apiFetch("/payment-accounts").catch(() => []),
        apiFetch("/cases").catch(() => []),
      ]);

      setPayments(Array.isArray(payList) ? payList : []);
      setAllocations(Array.isArray(allocList) ? allocList : []);
      setAccounts(Array.isArray(accList) ? accList : []);
      setCases(Array.isArray(caseList) ? caseList : []);
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action: Create Payment Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError("");
    setIsSubmittingRequest(true);

    try {
      if (!requestForm.caseId) throw new Error("Please select a legal case");
      if (!requestForm.amount || Number(requestForm.amount) <= 0) throw new Error("Please enter a valid amount");

      const selectedCase = cases.find((c) => c.id === requestForm.caseId);
      const clientId = selectedCase?.client?.id;

      await apiFetch("/payments/request", {
        method: "POST",
        body: JSON.stringify({
          caseId: requestForm.caseId,
          clientId,
          amount: parseFloat(requestForm.amount),
          currency: requestForm.currency || "NGN",
          description: requestForm.description.trim() || "Legal Service Fee",
          dueDate: requestForm.dueDate ? new Date(requestForm.dueDate).toISOString() : undefined,
          accountId: requestForm.accountId || undefined,
        }),
      });

      alert("Payment Request / Invoice issued successfully! It is now visible in both the Finance Portal and the Admin Dashboard.");
      setIsRequestModalOpen(false);
      setRequestForm({
        caseId: "",
        amount: "",
        currency: "NGN",
        description: "",
        dueDate: "",
        accountId: "",
      });
      loadData();
    } catch (err: any) {
      setRequestError(err.message || "Failed to create payment request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Action: Add Receiving Bank Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError("");
    setIsSubmittingAccount(true);

    try {
      if (!accountForm.bankName.trim()) throw new Error("Bank name is required");
      if (!accountForm.accountName.trim()) throw new Error("Account name is required");
      if (!accountForm.accountNumber.trim()) throw new Error("Account number is required");

      await apiFetch("/payment-accounts", {
        method: "POST",
        body: JSON.stringify({
          bankName: accountForm.bankName.trim(),
          accountName: accountForm.accountName.trim(),
          accountNumber: accountForm.accountNumber.trim(),
          currency: accountForm.currency || "NGN",
          label: accountForm.label.trim() || undefined,
        }),
      });

      alert("Firm receiving bank account added successfully!");
      setIsAccountModalOpen(false);
      setAccountForm({
        bankName: "",
        accountName: "",
        accountNumber: "",
        currency: "NGN",
        label: "",
      });
      loadData();
    } catch (err: any) {
      setAccountError(err.message || "Failed to add bank account");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  // Action: Verify / Approve / Reject Payment
  const handleVerifyPayment = async (paymentId: string, status: "SUCCESS" | "FAILED") => {
    setIsVerifying(true);
    try {
      await apiFetch(`/payments/${paymentId}/verify`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          note: verificationNote.trim() || `Processed by Finance (${user?.name || "Chief Accountant"})`,
        }),
      });

      alert(`Payment marked as ${status}. Records synced across Admin & Client portals.`);
      setSelectedProof(null);
      setVerificationNote("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to verify payment");
    } finally {
      setIsVerifying(false);
    }
  };

  // KPIs
  const totalVerifiedRevenue = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPendingAmount = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalInvoicesCount = payments.length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const q = deferredSearch.toLowerCase();
    const matchesSearch =
      (p.txRef && p.txRef.toLowerCase().includes(q)) ||
      (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
      (p.case?.title && p.case.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Financial Operations & Billing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorize client payments, issue official legal fee requests, and manage receiving accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-emerald-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Landmark size={16} className="text-emerald-700" />
            <span>Bank Accounts</span>
          </button>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-900/20 cursor-pointer"
          >
            <Plus size={18} />
            <span>Issue Payment Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Verified Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              ₦
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              ₦{totalVerifiedRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={13} /> {payments.filter((p) => p.status === "SUCCESS").length} Cleared Transactions
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              ₦{totalPendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={13} /> {pendingCount} Pending Invoices / Proofs
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices Issued</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalInvoicesCount}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Across all legal retainers & cases</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Bank Accounts</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Landmark size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {accounts.length}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Configured for Client Bank Transfers</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "transactions"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={16} />
          <span>Transactions & Verification</span>
          {pendingCount > 0 && (
            <span className="bg-amber-400 text-amber-950 font-black text-[11px] px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("allocations")}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "allocations"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Scale size={16} />
          <span>Case Financial Ledgers ({allocations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "accounts"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Landmark size={16} />
          <span>Firm Bank Accounts ({accounts.length})</span>
        </button>
      </div>

      {/* TAB 1: Transactions & Verification */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Search & Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reference, client, case..."
                className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Verification</option>
                <option value="SUCCESS">Approved (Success)</option>
                <option value="FAILED">Declined (Failed)</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Transaction Ref</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Case / Service</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                      No payment records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const isSuccess = p.status === "SUCCESS";
                    const isPending = p.status === "PENDING";
                    const isFailed = p.status === "FAILED";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-slate-800">
                          {p.txRef}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-900">{p.client?.name || "Midlex Client"}</p>
                          <p className="text-[11px] text-slate-500">{p.client?.email}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800 line-clamp-1">{p.case?.title || "General Legal Counsel"}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{p.description || "Invoice Fee"}</p>
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900">
                          ₦{(p.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-4 px-4">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock size={12} /> Pending Review
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                              <XCircle size={12} /> Declined
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.proofUrl && (
                              <button
                                onClick={() => setSelectedProof(p)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={13} className="text-emerald-700" />
                                <span>View Receipt</span>
                              </button>
                            )}

                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleVerifyPayment(p.id, "SUCCESS")}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="Approve and mark payment cleared"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleVerifyPayment(p.id, "FAILED")}
                                  className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Decline payment"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Case Financial Ledgers (Allocations) */}
      {activeTab === "allocations" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Case Financial Ledger & Retainer Balances</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown of total fees billed vs. collected per active litigation and legal matter.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Case Title</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Assigned Counsel / Team</th>
                  <th className="py-3.5 px-4">Total Paid (Cleared)</th>
                  <th className="py-3.5 px-4">Outstanding (Pending)</th>
                  <th className="py-3.5 px-4 text-right">Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                      No case allocation ledgers available.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {a.title}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800">{a.client?.name}</p>
                        <p className="text-[11px] text-slate-500">{a.client?.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800">{a.lawyer?.name || "Midlex Counsel"}</span>
                        {a.litigationTeam && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            {a.litigationTeam}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-black text-emerald-800">
                        ₦{(a.totalPaid || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-black text-amber-800">
                        ₦{(a.totalPending || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-600">
                        {a.paymentCount || 0} Records
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Firm Bank Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Firm Bank Accounts</h2>
              <p className="text-xs text-slate-500">Official bank accounts displayed to clients for legal fee transfers.</p>
            </div>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={16} /> Add Bank Account
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                    {acc.currency} Account
                  </span>
                  <Landmark size={20} className="text-emerald-700" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">{acc.bankName}</h3>
                <p className="font-mono text-xl font-black text-emerald-900 tracking-wider my-2">{acc.accountNumber}</p>
                <p className="text-xs font-semibold text-slate-600">{acc.accountName}</p>
                {acc.label && <p className="text-[11px] text-slate-400 mt-1 italic">{acc.label}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Generate Payment Request / Invoice */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Issue Payment Invoice</h2>
                    <p className="text-xs text-slate-500">Bill a client for legal representation & services</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {requestError && (
                <div className="mb-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
                  {requestError}
                </div>
              )}

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Legal Case *
                  </label>
                  <select
                    value={requestForm.caseId}
                    onChange={(e) => setRequestForm({ ...requestForm, caseId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  >
                    <option value="">-- Choose a matter / client --</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} &mdash; Client: {c.client?.name || "Client"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount (₦) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={requestForm.amount}
                      onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                      placeholder="e.g. 250000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Currency
                    </label>
                    <select
                      value={requestForm.currency}
                      onChange={(e) => setRequestForm({ ...requestForm, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deposit Bank Account
                  </label>
                  <select
                    value={requestForm.accountId}
                    onChange={(e) => setRequestForm({ ...requestForm, accountId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Default Firm Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} - {a.accountNumber} ({a.accountName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Fee Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="e.g. Litigation Retainer & Court Filing Fees"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={requestForm.dueDate}
                    onChange={(e) => setRequestForm({ ...requestForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingRequest ? "Issuing..." : "Send Invoice"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Add Firm Bank Account */}
      <AnimatePresence>
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Add Firm Bank Account</h2>
                    <p className="text-xs text-slate-500">Provide bank details for client fee deposits</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAccountModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {accountError && (
                <div className="mb-4 p-3.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">
                  {accountError}
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="e.g. Zenith Bank / Access Bank"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={accountForm.accountName}
                    onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                    placeholder="e.g. Midlex LLP Clients Account"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                    placeholder="e.g. 1012345678"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Label / Tag
                  </label>
                  <input
                    type="text"
                    value={accountForm.label}
                    onChange={(e) => setAccountForm({ ...accountForm, label: e.target.value })}
                    placeholder="e.g. Main Litigation & Retainer Account"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAccount}
                    className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingAccount ? "Saving..." : "Add Account"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: View Proof of Payment Receipt */}
      <AnimatePresence>
        {selectedProof && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Proof of Payment Review</h2>
                  <p className="text-xs text-slate-500">Ref: {selectedProof.txRef} &bull; ₦{(selectedProof.amount || 0).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedProof(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <div className="my-4 bg-slate-100 rounded-2xl p-2 border border-slate-200 flex items-center justify-center max-h-96 overflow-hidden">
                {selectedProof.proofUrl ? (
                  <img
                    src={selectedProof.proofUrl}
                    alt="Proof Receipt"
                    className="max-h-80 w-auto object-contain rounded-lg"
                  />
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">No attachment image uploaded</div>
                )}
              </div>

              {selectedProof.proofUrl && (
                <div className="text-center mb-4">
                  <a
                    href={selectedProof.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    Open Full Image in New Tab <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {selectedProof.status === "PENDING" && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <input
                    type="text"
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    placeholder="Optional note: e.g. Confirmed in bank statement on 14/10"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleVerifyPayment(selectedProof.id, "FAILED")}
                      disabled={isVerifying}
                      className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold cursor-pointer"
                    >
                      Decline Payment
                    </button>
                    <button
                      onClick={() => handleVerifyPayment(selectedProof.id, "SUCCESS")}
                      disabled={isVerifying}
                      className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md shadow-emerald-900/20 cursor-pointer"
                    >
                      {isVerifying ? "Verifying..." : "Approve & Mark Paid"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
