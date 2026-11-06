"use client";

import React, { useEffect, useState, useDeferredValue } from "react";
import { apiFetch } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  paymentProvider?: string;
  gatewayReference?: string;
  currency: string;
  status: string;
  txRef: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string | null;
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
  paidAmount?: number;
  remainingAmount?: number;
  submissions?: Array<{ id: string; amount: number; status: string; proofUrl?: string | null; submittedAt?: string; verifiedAt?: string | null; account?: PaymentAccount | null }>;
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
  const [loadError, setLoadError] = useState('');
  const [providers, setProviders] = useState<Record<string, { configured: boolean; mode: string }> | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);
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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
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
    setLoadError('');
    try {
      const [payList, allocList, accList, caseList, providerList] = await Promise.all([
        apiFetch("/payments"),
        apiFetch("/cases/allocations").catch(() => []),
        apiFetch("/payment-accounts"),
        apiFetch("/cases").catch(() => []),
        apiFetch("/payments/providers").catch(() => null),
      ]);

      setProviders(providerList);
      setPayments(Array.isArray(payList) ? payList : []);
      setAllocations(Array.isArray(allocList) ? allocList : []);
      setAccounts(Array.isArray(accList) ? accList : []);
      setCases(Array.isArray(caseList) ? caseList : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load finance records");
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
    if (!['ADMIN', 'ACCOUNTANT'].includes(user?.role || '')) return;
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

      await apiFetch(editingAccountId ? `/payment-accounts/${editingAccountId}` : "/payment-accounts", {
        method: editingAccountId ? "PATCH" : "POST",
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
      setEditingAccountId(null);
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

  const handleVerifySubmission = async (submissionId: string, status: 'SUCCESS' | 'FAILED') => {
    try {
      await apiFetch(`/payments/submissions/${submissionId}/verify`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await loadData();
    } catch (error) { alert(error instanceof Error ? error.message : 'Could not review this receipt'); }
  };

  const downloadPaymentHistoryPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(17);
    doc.text('MIDLEX LLP · PAYMENT HISTORY', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filteredPayments.length} records`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Reference', 'Client', 'Matter', 'Invoice', 'Paid', 'Remaining', 'Status', 'Method']],
      body: filteredPayments.map((p) => [new Date(p.createdAt).toLocaleDateString(), p.txRef, p.client?.name || 'Client', p.case?.title || p.description || 'Legal services', `${p.currency} ${Number(p.amount).toLocaleString()}`, `${p.currency} ${Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)).toLocaleString()}`, `${p.currency} ${Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)).toLocaleString()}`, p.status, p.paymentProvider || p.account?.bankName || 'Bank transfer']),
      styles: { fontSize: 8 }, headStyles: { fillColor: [27, 77, 46] },
    });
    doc.save(`midlex-payment-history-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintReceipt = (p: Payment, submission?: NonNullable<Payment['submissions']>[number]) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Please allow popups to print the receipt.');
    const paid = submission ? Number(submission.amount) : Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0));
    const receiptRef = submission ? `${p.txRef}-${submission.id.slice(-8)}` : p.txRef;
    const rows: Array<[string, string]> = [
      ['Receipt reference', receiptRef], ['Invoice reference', p.txRef], ['Client', p.client?.name || 'Client'],
      ['Email', p.client?.email || '—'], ['Matter', p.case?.title || p.description || 'Legal services'],
      ['Amount received', `${p.currency} ${paid.toLocaleString()}`],
      ['Paid to', submission?.account ? `${submission.account.bankName} · ${submission.account.accountName} · ${submission.account.accountNumber}` : p.account ? `${p.account.bankName} · ${p.account.accountName} · ${p.account.accountNumber}` : p.paymentProvider || 'Bank transfer'],
      ['Status', submission?.status === 'SUCCESS' || p.status === 'SUCCESS' ? 'Approved' : p.status],
      ['Date', new Date(submission?.verifiedAt || p.paidAt || p.updatedAt || p.createdAt).toLocaleString()],
    ];
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    printWindow.document.write(`<!doctype html><html><head><title>Payment receipt</title><style>body{font:15px Arial,sans-serif;color:#183c2c;margin:48px}h1{margin-bottom:4px}small{color:#64748b}.box{border:1px solid #d7e2d8;border-radius:12px;padding:20px;margin-top:24px}p{padding:10px 0;border-bottom:1px solid #edf0ed;display:flex;justify-content:space-between;gap:20px}b{text-align:right}@media print{body{margin:20mm}}</style></head><body><h1>MIDLEX LLP</h1><small>Payment receipt · Finance record</small><div class="box">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></p>`).join('')}</div><small>Generated ${escapeHtml(new Date().toLocaleString())}</small><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  // KPIs
  const totalVerifiedRevenue = payments
    .filter((p) => p.currency === "NGN")
    .reduce((sum, p) => sum + Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)), 0);

  const totalPendingAmount = payments
    .filter((p) => p.currency === "NGN")
    .reduce((sum, p) => sum + Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)), 0);

  const totalInvoicesCount = payments.length;
  const pendingCount = payments.reduce((count, p) => count + (p.submissions || []).filter((submission) => submission.status === 'PENDING' && submission.proofUrl).length + (p.proofUrl && p.status === 'PENDING' ? 1 : 0), 0);
  const unpaidInvoiceCount = payments.filter((payment) => Number(payment.remainingAmount ?? (payment.status === 'SUCCESS' ? 0 : payment.amount)) > 0).length;
  const canManagePayments = ['ADMIN', 'ACCOUNTANT'].includes(user?.role || '');

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const q = deferredSearch.toLowerCase();
    const matchesSearch =
      (p.txRef && p.txRef.toLowerCase().includes(q)) ||
      (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
      (p.case?.title && p.case.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus && (!reviewOnly || (p.submissions || []).some((submission) => submission.status === 'PENDING' && !!submission.proofUrl) || (p.status === "PENDING" && !!p.proofUrl));
  });

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[#123f32] px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#bbd6aa]">Midlex / Finance workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Every payment. In view.</h1><p className="mt-3 text-sm leading-6 text-white/70">Track invoices created by admin, review transfer receipts, and keep client payments reconciled.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={downloadPaymentHistoryPdf} className="rounded-xl border border-white/25 px-4 py-2.5 text-sm hover:bg-white/10">Download history PDF</button><button onClick={loadData} disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''}/> Refresh records</button></div>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-3">
          <button onClick={() => { setActiveTab('transactions'); setReviewOnly(true); setStatusFilter('PENDING'); }} className="inline-flex items-center gap-2 rounded-xl bg-[#d9ebc6] px-5 py-3 text-sm font-semibold text-[#163f31]"><ShieldCheck size={17}/> Review receipts <span className="rounded-full bg-[#163f31] px-2 py-0.5 text-xs text-white">{payments.filter(p => p.status === 'PENDING' && p.proofUrl).length}</span></button>
          <button onClick={() => setActiveTab('accounts')} className="rounded-xl border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10">Receiving accounts</button>
          {canManagePayments && <button onClick={() => setIsRequestModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-medium hover:bg-white/10"><Plus size={17}/> Create invoice</button>}
        </div>
      </section>
      {loadError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError} <button className="ml-2 underline" onClick={loadData}>Retry</button></div>}
      <section className="grid gap-4 md:grid-cols-2">
        {[{ key: 'opay', name: 'OPay', badge: 'O', description: 'Hosted checkout and business-account transfers.' }, { key: 'moniepoint', name: 'Moniepoint', badge: 'M', description: 'Monnify checkout and business-account transfers.' }].map(provider => {
          const status = providers?.[provider.key];
          const receiving = accounts.filter(a => a.bankName.toLowerCase().includes(provider.key === 'opay' ? 'opay' : 'moniepoint'));
          return <article key={provider.key} className="flex gap-4 rounded-2xl border border-[#dce6df] bg-white p-5"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${provider.key === 'opay' ? 'bg-[#d9f7eb] text-[#087f5b]' : 'bg-[#e9eeff] text-[#2354c5]'}`}>{provider.badge}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-[#173e34]">{provider.name}</h2><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Online checkout · Coming soon</span></div><p className="mt-2 text-xs leading-5 text-[#718277]">{provider.description}</p><button onClick={() => { setAccountForm({ ...accountForm, bankName: provider.name }); setEditingAccountId(null); setIsAccountModalOpen(true); }} className="mt-3 text-xs font-semibold text-[#245942]">{receiving.length ? `${receiving.length} receiving account(s) · Add another` : 'Add receiving account'} <ArrowUpRight size={12} className="inline"/></button></div></article>;
        })}
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected · NGN</span>
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outstanding · NGN</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              ₦{totalPendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={13} /> {unpaidInvoiceCount} invoices with a balance
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
          onClick={() => { setActiveTab("transactions"); setReviewOnly(false); }}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "transactions"
              ? "bg-emerald-800 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={16} />
          <span>Transactions & Verification</span>
          {pendingCount > 0 && (
            <span className="bg-[#d9ebc6] text-[#163f31] font-black text-[11px] px-2 py-0.5 rounded-full">
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
              {reviewOnly && <button onClick={() => setReviewOnly(false)} className="text-xs font-semibold text-emerald-700">Receipts only ×</button>}<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
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
                          {p.txRef}<span className="mt-1 block font-sans text-[10px] font-medium text-slate-500">{p.paymentProvider || p.account?.bankName || 'Bank transfer'}</span>
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
                          ₦{Number(p.amount || 0).toLocaleString()}<span className="mt-1 block text-[10px] font-medium text-slate-500">Paid ₦{Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)).toLocaleString()} · Left ₦{Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)).toLocaleString()}</span>
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
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
                            {(p.submissions || []).map((submission) => <div key={submission.id} className="flex items-center gap-1">{submission.proofUrl && <a href={submission.proofUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold">Receipt · ₦{Number(submission.amount).toLocaleString()} · {submission.account?.bankName} {submission.account?.accountNumber}</a>}{submission.status === 'SUCCESS' && <button onClick={() => handlePrintReceipt(p, submission)} className="rounded-lg border border-emerald-700 px-2 py-1.5 text-[10px] font-semibold text-emerald-800">Print receipt</button>}{submission.status === 'PENDING' && submission.proofUrl && <><button onClick={() => handleVerifySubmission(submission.id, 'SUCCESS')} className="rounded-lg bg-emerald-700 px-2 py-1.5 text-[10px] font-semibold text-white">Approve</button><button onClick={() => handleVerifySubmission(submission.id, 'FAILED')} className="rounded-lg bg-rose-100 px-2 py-1.5 text-[10px] font-semibold text-rose-700">Decline</button></>}</div>)}
                            {isSuccess && <button onClick={() => handlePrintReceipt(p)} className="rounded-lg border border-emerald-700 px-2 py-1.5 text-[10px] font-semibold text-emerald-800">Print invoice receipt</button>}
                            {p.status === 'PENDING' && ['OPAY', 'MONNIFY'].includes(p.paymentProvider || '') && <button disabled={isVerifying} onClick={async () => { setIsVerifying(true); try { await apiFetch(`/payments/${p.id}/${p.paymentProvider === 'MONNIFY' ? 'monnify' : 'opay'}-sync`, { method: 'POST' }); await loadData(); } catch (e) { alert(e instanceof Error ? e.message : 'Could not verify provider payment'); } finally { setIsVerifying(false); } }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Check provider</button>}
                            {p.proofUrl && (
                              <button
                                onClick={() => setSelectedProof(p)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={13} className="text-emerald-700" />
                                <span>View Receipt</span>
                              </button>
                            )}

                            {isPending && p.proofUrl && (
                              <>
                                <button
                                  onClick={() => { setVerificationNote(''); setSelectedProof(p); }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="Approve and mark payment cleared"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Review</span>
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
                  onClick={() => { setEditingAccountId(null); setAccountForm({ bankName: '', accountName: '', accountNumber: '', currency: 'NGN', label: '' }); setIsAccountModalOpen(true); }}
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
                <button onClick={() => { setEditingAccountId(acc.id); setAccountForm({ bankName: acc.bankName, accountName: acc.accountName, accountNumber: acc.accountNumber, currency: acc.currency, label: acc.label || '' }); setIsAccountModalOpen(true); }} className="mt-4 text-xs font-bold text-emerald-800">Edit account</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Generate Payment Request / Invoice */}
      <AnimatePresence>
        {isRequestModalOpen && canManagePayments && (
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
                      onChange={(e) => setRequestForm({ ...requestForm, currency: e.target.value, accountId: '' })}
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
                    <option value="">Online checkout only</option>
                    {accounts.filter((a) => a.currency === requestForm.currency).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bankName} - {a.accountNumber} ({a.accountName})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">Select the exact receiving account if this invoice allows a bank transfer.</p>
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
                    <h2 className="text-lg font-black text-slate-900">{editingAccountId ? 'Edit Firm Bank Account' : 'Add Firm Bank Account'}</h2>
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

              <datalist id="receiving-banks"><option value="OPay"/><option value="Moniepoint"/><option value="Zenith Bank"/><option value="Access Bank"/></datalist>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="OPay, Moniepoint or another bank" list="receiving-banks"
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
                    {isSubmittingAccount ? "Saving..." : editingAccountId ? "Save changes" : "Add Account"}
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
