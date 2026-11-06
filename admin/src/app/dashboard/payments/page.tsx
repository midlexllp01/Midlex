"use client";
import React, { useDeferredValue, useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardSearchBar from '@/components/Dashboard/DashboardSearchBar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  txRef: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string | null;
  case: { title: string };
  client?: { name: string; email: string };
  account?: {
    id: string;
    label?: string | null;
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  } | null;
  description?: string | null;
  dueDate?: string | null;
  proofUrl?: string | null;
  proofSubmittedAt?: string | null;
  verificationNote?: string | null;
  verifiedAt?: string | null;
  paymentProvider?: string | null;
  opayReference?: string | null;
  opayOrderNo?: string | null;
  opayStatus?: string | null;
  opayChannel?: string | null;
  paidAmount?: number;
  remainingAmount?: number;
  submissions?: Array<{ id: string; amount: number; status: string; proofUrl?: string | null; submittedAt?: string; verifiedAt?: string | null; account?: PaymentAccount | null }>;
}

interface PaymentAccount {
  id: string;
  label?: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  isActive?: boolean;
}

import MonthPickerFilter, { getCurrentMonthStr, isItemInMonth } from '@/components/Dashboard/MonthPickerFilter';

export default function PaymentsPage() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({
    label: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    currency: 'NGN',
  });
  const [isCasesLoading, setIsCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    caseId: '',
    amount: '',
    currency: 'NGN',
    description: '',
    dueDate: '',
    accountId: '',
  });
  const [selectedFileByPayment, setSelectedFileByPayment] = useState<Record<string, File | null>>({});
  const [isUploadingByPayment, setIsUploadingByPayment] = useState<Record<string, boolean>>({});
  const [isStartingCheckoutByPayment, setIsStartingCheckoutByPayment] = useState<Record<string, boolean>>({});
  const [isSyncingByPayment, setIsSyncingByPayment] = useState<Record<string, boolean>>({});
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null);
  const [verifyForm, setVerifyForm] = useState({ status: 'SUCCESS', note: '' });
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedMethodByPayment, setSelectedMethodByPayment] = useState<Record<string, 'opay' | 'transfer'>>({});

  const load = async () => {
    const endpoint = user?.role === 'CLIENT' ? '/payments/my-payments' : '/payments';
    const data = await apiFetch(endpoint);
    setPayments(data);
  };

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        await load();
        await loadAccounts();
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPayments();
  }, [user]);

  const loadCasesForRequest = async () => {
    if (!user) return;
    if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) return;

    setIsCasesLoading(true);
    setCasesError(null);
    try {
      const list = await apiFetch('/cases');
      setCases(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setCases([]);
      setCasesError(e?.message || 'Failed to load cases');
    } finally {
      setIsCasesLoading(false);
    }
  };

  const loadAccounts = async () => {
    setIsAccountsLoading(true);
    setAccountsError(null);
    try {
      const list = await apiFetch('/payment-accounts');
      setAccounts(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setAccounts([]);
      setAccountsError(e?.message || 'Failed to load accounts');
    } finally {
      setIsAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (isRequestModalOpen) {
      void loadCasesForRequest();
      void loadAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRequestModalOpen]);

  useEffect(() => {
    if (isAccountsModalOpen) void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountsModalOpen]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredPayments = payments.filter((p) => {
    if (!isItemInMonth(p.createdAt || p.paidAt, selectedMonth)) {
      return false;
    }
    if (!normalizedQuery) return true;
    const searchTargets = [
      p.txRef,
      p.case?.title,
      p.client?.name,
      p.client?.email,
      p.status,
      p.paymentProvider,
      p.opayReference,
      p.opayOrderNo,
      p.opayStatus,
      p.description,
    ].filter(Boolean);
    return searchTargets.some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });

  const totalPaid = filteredPayments
    .reduce((sum, p) => sum + Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)), 0);

  const outstanding = filteredPayments
    .reduce((sum, p) => sum + Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)), 0);

  const currency = filteredPayments.find((p) => !!p.currency)?.currency || 'NGN';

  const downloadPaymentHistoryPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(17);
    doc.text('MIDLEX LLP · PAYMENT HISTORY', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filteredPayments.length} records`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Reference', 'Client', 'Matter', 'Invoice', 'Paid', 'Remaining', 'Status']],
      body: filteredPayments.map((p) => [
        new Date(p.createdAt).toLocaleDateString(), p.txRef, p.client?.name || 'Client', p.case?.title || p.description || 'Legal services',
        `${p.currency} ${Number(p.amount).toLocaleString()}`,
        `${p.currency} ${Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)).toLocaleString()}`,
        `${p.currency} ${Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)).toLocaleString()}`, p.status,
      ]),
      styles: { fontSize: 8 }, headStyles: { fillColor: [27, 77, 46] },
    });
    doc.save(`midlex-payment-history-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintSubmissionReceipt = (p: Payment, submission: NonNullable<Payment['submissions']>[number]) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Please allow popups to print the receipt.');
    const rows: Array<[string, string]> = [
      ['Receipt reference', `${p.txRef}-${submission.id.slice(-8)}`], ['Invoice reference', p.txRef],
      ['Client', p.client?.name || 'Client'], ['Email', p.client?.email || '—'], ['Matter', p.case?.title || p.description || 'Legal services'],
      ['Payment amount', `${p.currency} ${Number(submission.amount).toLocaleString()}`],
      ['Paid to', submission.account ? `${submission.account.bankName} · ${submission.account.accountName} · ${submission.account.accountNumber}` : 'Bank transfer'],
      ['Approved', submission.verifiedAt ? new Date(submission.verifiedAt).toLocaleString() : 'Confirmed'],
    ];
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
    printWindow.document.write(`<!doctype html><html><head><title>Payment receipt</title><style>body{font:15px Arial,sans-serif;color:#183c2c;margin:48px}h1{margin-bottom:4px}small{color:#64748b}.box{border:1px solid #d7e2d8;border-radius:12px;padding:20px;margin-top:24px}p{padding:10px 0;border-bottom:1px solid #edf0ed;display:flex;justify-content:space-between;gap:20px}b{text-align:right}@media print{body{margin:20mm}}</style></head><body><h1>MIDLEX LLP</h1><small>Payment receipt · Approved transfer</small><div class="box">${rows.map(([label, value]) => `<p><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></p>`).join('')}</div><small>Generated ${escapeHtml(new Date().toLocaleString())}</small><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  const startOpayCheckout = async (paymentId: string) => {
    setIsStartingCheckoutByPayment((p) => ({ ...p, [paymentId]: true }));
    try {
      const data = await apiFetch(`/payments/${paymentId}/opay-checkout`, {
        method: 'POST',
      });
      if (!data?.checkoutUrl) throw new Error('No checkout URL returned');
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      alert(e?.message || 'Unable to start OPay checkout');
    } finally {
      setIsStartingCheckoutByPayment((p) => ({ ...p, [paymentId]: false }));
    }
  };

  const syncOpayPayment = async (paymentId: string) => {
    setIsSyncingByPayment((p) => ({ ...p, [paymentId]: true }));
    try {
      await apiFetch(`/payments/${paymentId}/opay-sync`, { method: 'POST' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Unable to refresh OPay status');
    } finally {
      setIsSyncingByPayment((p) => ({ ...p, [paymentId]: false }));
    }
  };

  const submitProof = async (paymentId: string) => {
    const file = selectedFileByPayment[paymentId];
    if (!file) return;
    setIsUploadingByPayment((p) => ({ ...p, [paymentId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${getApiBaseUrl()}/payments/${paymentId}/proof`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Failed to upload proof');

      setSelectedFileByPayment((p) => ({ ...p, [paymentId]: null }));
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to upload proof');
    } finally {
      setIsUploadingByPayment((p) => ({ ...p, [paymentId]: false }));
    }
  };

  const createPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!['ADMIN', 'ACCOUNTANT'].includes(user?.role || '')) return;
    const c = cases.find((x) => x.id === requestForm.caseId);
    if (!c) return alert('Select a case');
    try {
      await apiFetch('/payments/request', {
        method: 'POST',
        body: JSON.stringify({
          caseId: requestForm.caseId,
          clientId: c.clientId,
          amount: Number(requestForm.amount),
          currency: requestForm.currency,
          accountId: requestForm.accountId || undefined,
          description: requestForm.description || undefined,
          dueDate: requestForm.dueDate ? new Date(requestForm.dueDate).toISOString() : undefined,
        }),
      });
      setIsRequestModalOpen(false);
      setRequestForm({ caseId: '', amount: '', currency: 'NGN', description: '', dueDate: '', accountId: '' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to create payment request');
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(editingAccountId ? `/payment-accounts/${editingAccountId}` : '/payment-accounts', {
        method: editingAccountId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          label: newAccount.label || undefined,
          bankName: newAccount.bankName,
          accountName: newAccount.accountName,
          accountNumber: newAccount.accountNumber,
          currency: newAccount.currency,
        }),
      });
      setNewAccount({ label: '', bankName: '', accountName: '', accountNumber: '', currency: 'NGN' });
      setEditingAccountId(null);
      setIsAccountsModalOpen(false);
      await loadAccounts();
    } catch (e: any) {
      alert(e?.message || 'Failed to add account');
    }
  };

  const reviewSubmission = async (submissionId: string, status: 'SUCCESS' | 'FAILED') => {
    try {
      await apiFetch(`/payments/submissions/${submissionId}/verify`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await load();
    } catch (error) { alert(error instanceof Error ? error.message : 'Could not review receipt'); }
  };

  const verifyPayment = async () => {
    if (!verifyTarget) return;
    try {
      await apiFetch(`/payments/${verifyTarget.id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status: verifyForm.status, note: verifyForm.note || undefined }),
      });
      setVerifyTarget(null);
      setVerifyForm({ status: 'SUCCESS', note: '' });
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to verify payment');
    }
  };

  const handlePrintReceipt = (p: Payment, size: '80mm' | 'a4') => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return alert('Failed to open print window. Please allow popups.');

    const dateStr = new Date(p.paidAt || p.updatedAt || p.createdAt).toLocaleString();
    const amountStr = `${p.currency} ${p.amount.toLocaleString()}`;

    let html = '';

    if (size === '80mm') {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${p.txRef}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              width: 74mm;
              margin: 0 auto;
              padding: 5mm 2mm;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: bold;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
            .flex-row {
              display: flex;
              justify-content: space-between;
            }
            .header {
              font-size: 14px;
              margin-bottom: 2px;
            }
            .title {
              font-size: 12px;
              margin: 6px 0;
              text-transform: uppercase;
            }
            .item-table {
              width: 100%;
              margin: 6px 0;
            }
            .footer {
              margin-top: 10px;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold header">MIDLEX LLP</div>
            <div>Legal Practitioners & Consultants</div>
            <div>midlexllp01@gmail.com</div>
            <div class="divider"></div>
            <div class="bold title">${p.status === 'SUCCESS' ? 'Payment Receipt' : 'Payment Slip'}</div>
            <div class="divider"></div>
          </div>

          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Date:</span>
            <span class="bold">${dateStr}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Ref:</span>
            <span class="bold">${p.txRef}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Client:</span>
            <span class="bold">${p.client?.name || 'Client'}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Email:</span>
            <span class="bold">${p.client?.email || 'N/A'}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Case:</span>
            <span class="bold">${p.case?.title}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Method:</span>
            <span class="bold">${p.paymentProvider || 'Transfer'}</span>
          </div>
          <div class="flex-row" style="display: flex; justify-content: space-between;">
            <span>Status:</span>
            <span class="bold">${p.status}</span>
          </div>

          <div class="divider"></div>

          <table class="item-table" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr class="flex-row bold" style="display: flex; justify-content: space-between;">
                <span>Description</span>
                <span>Amount</span>
              </tr>
            </thead>
            <tbody>
              <tr class="flex-row" style="display: flex; justify-content: space-between;">
                <span>${p.description || 'Legal Services'}</span>
                <span>${amountStr}</span>
              </tr>
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="flex-row bold" style="font-size: 12px; display: flex; justify-content: space-between;">
            <span>TOTAL PAID:</span>
            <span>${amountStr}</span>
          </div>

          <div class="divider"></div>

          <div class="center footer">
            <p>Thank you for your patronage!</p>
            <p>Powered by Midlex Management System</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;
    } else {
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${p.txRef}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              font-size: 13px;
              line-height: 1.5;
              padding: 0;
              margin: 0;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
              letter-spacing: 1px;
            }
            .subtitle {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .document-title {
              font-size: 20px;
              font-weight: bold;
              text-align: right;
              color: #0f172a;
              text-transform: uppercase;
            }
            .meta-section {
              width: 100%;
              margin-bottom: 30px;
              border-collapse: collapse;
            }
            .meta-section td {
              vertical-align: top;
              width: 50%;
            }
            .section-title {
              font-size: 11px;
              font-weight: bold;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .info-block {
              line-height: 1.6;
            }
            .info-block strong {
              color: #0f172a;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              padding: 12px;
              text-align: left;
              font-size: 11px;
              font-weight: bold;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }
            .total-table {
              float: right;
              width: 300px;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .total-table td {
              padding: 10px 12px;
            }
            .total-table tr.grand-total {
              background: #f8fafc;
              font-weight: bold;
              font-size: 14px;
              color: #0f172a;
              border-top: 2px solid #e2e8f0;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              font-size: 11px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="logo-text">MIDLEX LLP</div>
                <div class="subtitle">Legal Practitioners & Consultants</div>
              </td>
              <td class="document-title">
                ${p.status === 'SUCCESS' ? 'Payment Receipt' : 'Payment Invoice'}
              </td>
            </tr>
          </table>

          <table class="meta-section">
            <tr>
              <td>
                <div class="section-title">Issued By</div>
                <div class="info-block">
                  <strong>Midlex LLP</strong><br/>
                  12 Legal Chambers Plaza<br/>
                  Lagos, Nigeria<br/>
                  Email: midlexllp01@gmail.com
                </div>
              </td>
              <td>
                <div class="section-title">Bill To</div>
                <div class="info-block">
                  <strong>${p.client?.name || 'Client Name'}</strong><br/>
                  Email: ${p.client?.email || 'N/A'}<br/>
                  Case: ${p.case?.title || 'General Legal Matter'}
                </div>
              </td>
            </tr>
            <tr style="height: 20px;"></tr>
            <tr>
              <td>
                <div class="section-title">Payment Details</div>
                <div class="info-block">
                  Transaction Ref: <strong>${p.txRef}</strong><br/>
                  Payment Provider: <strong>${p.paymentProvider || 'Bank Transfer'}</strong><br/>
                  Status: <strong style="color: ${p.status === 'SUCCESS' ? '#16a34a' : '#d97706'}">${p.status}</strong>
                </div>
              </td>
              <td>
                <div class="section-title">Dates</div>
                <div class="info-block">
                  Payment Date: <strong>${dateStr}</strong><br/>
                  Due Date: <strong>${p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A'}</strong>
                </div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 70%;">Description</th>
                <th style="text-align: right; width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${p.description || 'Legal services retainer and advisory'}</td>
                <td style="text-align: right; font-weight: bold;">${amountStr}</td>
              </tr>
            </tbody>
          </table>

          <table class="total-table">
            <tr>
              <td style="color: #64748b;">Subtotal</td>
              <td style="text-align: right; font-weight: bold;">${amountStr}</td>
            </tr>
            <tr class="grand-total">
              <td>Total Paid</td>
              <td style="text-align: right;">${amountStr}</td>
            </tr>
          </table>

          <div class="footer">
            <p>Thank you for choosing Midlex LLP. If you have any questions, please contact us at midlexllp01@gmail.com.</p>
            <p>Page 1 of 1</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;
    }

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const statusClass = (status: string) => {
    if (status === 'SUCCESS') return 'bg-green-100 text-green-700';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const canUseOpayCheckout = (p: Payment) => {
    return user?.role === 'CLIENT' && p.status !== 'SUCCESS';
  };

  const renderCheckoutProofActions = (p: Payment) => {
    const isClientPending = user?.role === 'CLIENT' && p.status === 'PENDING';
    const method = selectedMethodByPayment[p.id] || 'opay';
    const mainAccount = p.account?.currency === p.currency ? p.account : null;

    return (
      <div className="space-y-4">
        {(p.submissions || []).map((submission) => <div key={submission.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 text-xs ${submission.status === 'PENDING' ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>{submission.proofUrl && <a href={submission.proofUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">View {p.currency} {Number(submission.amount).toLocaleString()} receipt · {submission.account?.bankName} {submission.account?.accountNumber}</a>}{submission.status === 'SUCCESS' && <button onClick={() => handlePrintSubmissionReceipt(p, submission)} className="rounded-lg border border-primary px-3 py-1.5 font-bold text-primary">Print receipt</button>}{submission.status === 'PENDING' && ['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && <><button onClick={() => reviewSubmission(submission.id, 'SUCCESS')} className="rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white">Approve</button><button onClick={() => reviewSubmission(submission.id, 'FAILED')} className="rounded-lg bg-rose-100 px-3 py-1.5 font-bold text-rose-700">Decline</button></>}</div>)}
        {/* Receipt View if uploaded */}
        <div>
          {p.proofUrl ? (
            <div className="space-y-2">
              <a className="text-secondary font-bold inline-flex items-center gap-1 hover:underline text-sm" href={p.proofUrl} target="_blank" rel="noreferrer">
                View uploaded receipt ↗
              </a>
              {isClientPending && (
                <p className="text-xs text-amber-600 font-semibold bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  Receipt uploaded. Awaiting admin verification.
                </p>
              )}
            </div>
          ) : (
            p.status === 'SUCCESS' && <span className="text-xs text-gray-400">No receipt file attached</span>
          )}
        </div>

        {/* Tab selection for CLIENT with PENDING payment & no proof uploaded */}
        {isClientPending && !p.proofUrl && (
          <div className="space-y-4 rounded-3xl border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Payment Method</p>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedMethodByPayment(prev => ({ ...prev, [p.id]: 'opay' }))}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  method === 'opay'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-primary'
                }`}
              >
                OPay Checkout
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethodByPayment(prev => ({ ...prev, [p.id]: 'transfer' }))}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  method === 'transfer'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-primary'
                }`}
              >
                Bank Transfer
              </button>
            </div>

            {method === 'opay' ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Pay securely online using card, bank transfer, or OPay wallet. The transaction updates instantly.
                </p>
                {canUseOpayCheckout(p) && (
                  <button
                    type="button"
                    onClick={() => startOpayCheckout(p.id)}
                    disabled={!!isStartingCheckoutByPayment[p.id]}
                    className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all disabled:opacity-50"
                  >
                    {isStartingCheckoutByPayment[p.id] ? 'Opening OPay...' : 'Pay with OPay'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {mainAccount ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">BANK NAME</span>
                        <span className="font-bold text-primary">{mainAccount.bankName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">ACCOUNT NAME</span>
                        <span className="font-bold text-primary">{mainAccount.accountName}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-2">
                        <span className="text-gray-400 font-medium">ACCOUNT NUMBER</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-secondary text-sm">{mainAccount.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(mainAccount.accountNumber);
                              alert('Account number copied to clipboard!');
                            }}
                            className="px-2 py-1 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg font-bold text-[10px] transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Upload Transfer Proof
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-primary hover:file:bg-gray-200"
                        onChange={(e) => setSelectedFileByPayment((prev) => ({ ...prev, [p.id]: e.target.files?.[0] || null }))}
                      />
                      <button
                        type="button"
                        onClick={() => submitProof(p.id)}
                        disabled={!selectedFileByPayment[p.id] || isUploadingByPayment[p.id]}
                        className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/15 hover:bg-secondary/95 transition-all disabled:opacity-50"
                      >
                        {isUploadingByPayment[p.id] ? 'Uploading...' : 'Submit Receipt'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 rounded-xl px-3 py-2 border border-rose-100">
                    Bank transfer details are not configured. Please use OPay checkout or contact support.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sync OPay status action */}
        {(user?.role === 'CLIENT' || user?.role === 'ADMIN' || user?.role === 'LAWYER') && p.paymentProvider === 'OPAY' && p.status === 'PENDING' && (
          <button
            type="button"
            onClick={() => syncOpayPayment(p.id)}
            disabled={!!isSyncingByPayment[p.id]}
            className="w-full rounded-2xl bg-secondary/10 border border-secondary/20 px-4 py-3 text-sm font-bold text-secondary hover:bg-secondary/15 transition-all disabled:opacity-50 sm:w-auto"
          >
            {isSyncingByPayment[p.id] ? 'Refreshing...' : user?.role === 'CLIENT' ? 'Refresh OPay Status' : 'Sync OPay status'}
          </button>
        )}

        {/* Admin Verification action */}
        {['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && p.status === 'PENDING' && p.proofUrl && p.paymentProvider !== 'OPAY' && (
          <button
            type="button"
            onClick={() => setVerifyTarget(p)}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary/10 hover:bg-primary/95 transition-all sm:w-auto"
          >
            Verify payment receipt
          </button>
        )}

        {/* Print Receipt Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => handlePrintReceipt(p, 'a4')}
            className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 text-xs font-bold text-primary transition-all flex items-center justify-center gap-1 border border-gray-200/50"
          >
            Print A4 Receipt
          </button>
          <button
            type="button"
            onClick={() => handlePrintReceipt(p, '80mm')}
            className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 text-xs font-bold text-primary transition-all flex items-center justify-center gap-1 border border-gray-200/50"
          >
            Print 80mm Receipt
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl" />)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold text-primary">Financial History</h2>
        <div className="flex gap-3">
          <button onClick={downloadPaymentHistoryPdf} className="rounded-2xl border border-primary px-5 py-4 font-bold text-primary">Download history PDF</button>
          {['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 sm:w-auto sm:px-8"
            >
              Create Payment Request
            </button>
          )}
          {['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && <button onClick={() => { setEditingAccountId(null); setNewAccount({ label: '', bankName: '', accountName: '', accountNumber: '', currency: 'NGN' }); setIsAccountsModalOpen(true); }} className="rounded-2xl border border-primary px-5 py-4 font-bold text-primary">Payment accounts & setup</button>}
        </div>
      </div>

      <MonthPickerFilter
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
        totalCount={filteredPayments.length}
        countLabel="payment transactions"
      />

      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {[
          { label: 'Total Paid (This Month)', value: `${currency} ${totalPaid.toLocaleString()}`, color: 'text-primary' },
          { label: 'Outstanding (This Month)', value: `${currency} ${outstanding.toLocaleString()}`, color: 'text-secondary' },
          { label: 'Transactions', value: filteredPayments.length, color: 'text-primary' }
        ].map((stat, i) => (
          <div key={i} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:rounded-[32px] sm:p-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className={`break-words text-2xl font-bold sm:text-3xl ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <DashboardSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search payments by reference, case, client, provider, or status"
        count={filteredPayments.length}
        countLabel="payments"
      />

      <div className="space-y-4 lg:hidden">
        {filteredPayments.map((p) => (
          <article key={p.id} className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Transaction Ref</p>
                <p className="mt-1 break-all font-mono text-xs text-gray-500">{p.txRef}</p>
                {(p.opayReference || p.opayOrderNo) && (
                  <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                    {p.opayReference && <div>OPay ref: {p.opayReference}</div>}
                    {p.opayOrderNo && <div>Order: {p.opayOrderNo}</div>}
                  </div>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(p.status)}`}>
                {p.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Case</p>
                <p className="mt-1 break-words font-bold text-primary">{p.case.title}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</p>
                <p className="mt-1 break-words font-bold text-primary">{p.currency} {p.amount.toLocaleString()}</p>
                <p className="mt-1 text-xs text-emerald-800">Paid {p.currency} {Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)).toLocaleString()}</p>
                <p className="text-xs text-amber-800">Remaining {p.currency} {Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)).toLocaleString()}</p>
              </div>
              {user?.role === 'ADMIN' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Client</p>
                  <p className="mt-1 break-words text-sm font-bold text-primary">{p.client?.name || 'N/A'}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</p>
                <p className="mt-1 text-sm text-gray-500">{new Date(p.paidAt || p.updatedAt || p.createdAt).toLocaleDateString()}</p>
              </div>
              {(p.paymentProvider || p.opayStatus || p.opayChannel) && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Provider</p>
                  <div className="mt-1 space-y-1 text-sm text-gray-500">
                    {p.paymentProvider && <div>Provider: {p.paymentProvider}</div>}
                    {p.opayStatus && <div>Gateway: {p.opayStatus}</div>}
                    {p.opayChannel && <div>Channel: {p.opayChannel}</div>}
                  </div>
                </div>
              )}
              {p.description && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</p>
                  <p className="mt-1 break-words text-sm text-gray-500">{p.description}</p>
                </div>
              )}
              {p.dueDate && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Due Date</p>
                  <p className="mt-1 text-sm text-gray-500">{new Date(p.dueDate).toLocaleDateString()}</p>
                </div>
              )}
              {p.account && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment Account</p>
                  <p className="mt-1 break-words text-sm text-gray-500">
                    {p.account.bankName} - {p.account.accountName} ({p.account.accountNumber})
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Checkout / Proof</p>
              {renderCheckoutProofActions(p)}
            </div>
          </article>
        ))}
        {filteredPayments.length === 0 && (
          <div className="rounded-[28px] border border-gray-100 bg-white px-6 py-12 text-center text-gray-400 italic">
            {payments.length === 0 ? 'No payment records found.' : 'No payments matched your search.'}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-[40px] border border-gray-100 bg-white lg:block">
        <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction Ref</th>
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Case</th>
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Checkout / Proof</th>
              <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPayments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/30 transition-all">
                <td className="px-8 py-6">
                  <div className="font-mono text-xs text-gray-500">{p.txRef}</div>
                  {(p.opayReference || p.opayOrderNo) && (
                    <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                      {p.opayReference && <div>OPay ref: {p.opayReference}</div>}
                      {p.opayOrderNo && <div>Order: {p.opayOrderNo}</div>}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 font-bold text-primary">{p.case.title}</td>
                <td className="px-8 py-6 font-bold text-primary">
                  {p.currency} {p.amount.toLocaleString()}<span className="mt-1 block text-[10px] font-medium text-gray-500">Paid {p.currency} {Number(p.paidAmount ?? (p.status === 'SUCCESS' ? p.amount : 0)).toLocaleString()} · Remaining {p.currency} {Number(p.remainingAmount ?? (p.status === 'SUCCESS' ? 0 : p.amount)).toLocaleString()}</span>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'SUCCESS'
                      ? 'bg-green-100 text-green-700'
                      : p.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {p.status}
                  </span>
                  {(p.paymentProvider || p.opayStatus || p.opayChannel) && (
                    <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                      {p.paymentProvider && <div>Provider: {p.paymentProvider}</div>}
                      {p.opayStatus && <div>Gateway: {p.opayStatus}</div>}
                      {p.opayChannel && <div>Channel: {p.opayChannel}</div>}
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-sm text-gray-400">
                  {renderCheckoutProofActions(p)}
                </td>
                <td className="px-8 py-6 text-sm text-gray-400">
                  {new Date(p.paidAt || p.updatedAt || p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-gray-400 italic">
                  {payments.length === 0 ? 'No payment records found.' : 'No payments matched your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <AnimatePresence>
        {isAccountsModalOpen && ['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAccountsModalOpen(false)} className="absolute inset-0 bg-primary/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-5 flex items-center justify-between"><div><h3 className="text-xl font-bold text-primary">Payment accounts & setup</h3><p className="mt-1 text-sm text-gray-500">These receiving accounts are shared with the Finance portal.</p></div><button onClick={() => setIsAccountsModalOpen(false)} className="rounded-xl border px-3 py-2 text-sm">Close</button></div>
              <div className="mb-6 grid gap-3 sm:grid-cols-2">{accounts.map((account) => <div key={account.id} className="rounded-2xl border border-gray-200 p-4"><p className="font-bold text-primary">{account.bankName}</p><p className="mt-1 font-mono text-sm">{account.accountNumber}</p><p className="text-xs text-gray-500">{account.accountName} · {account.currency}</p><button onClick={() => { setEditingAccountId(account.id); setNewAccount({ label: account.label || '', bankName: account.bankName, accountName: account.accountName, accountNumber: account.accountNumber, currency: account.currency }); }} className="mt-3 text-xs font-bold text-emerald-800">Edit account</button></div>)}</div>
              <form onSubmit={createAccount} className="grid gap-3 sm:grid-cols-2">
                <input aria-label="Bank name" placeholder="Bank name" value={newAccount.bankName} onChange={(event) => setNewAccount({ ...newAccount, bankName: event.target.value })} className="rounded-xl border p-3" required />
                <input aria-label="Account name" placeholder="Account name" value={newAccount.accountName} onChange={(event) => setNewAccount({ ...newAccount, accountName: event.target.value })} className="rounded-xl border p-3" required />
                <input aria-label="Account number" placeholder="Account number" value={newAccount.accountNumber} onChange={(event) => setNewAccount({ ...newAccount, accountNumber: event.target.value })} className="rounded-xl border p-3" required />
                <input aria-label="Account label" placeholder="Label (optional)" value={newAccount.label} onChange={(event) => setNewAccount({ ...newAccount, label: event.target.value })} className="rounded-xl border p-3" />
                <div className="flex items-center gap-3 sm:col-span-2"><select value={newAccount.currency} onChange={(event) => setNewAccount({ ...newAccount, currency: event.target.value })} className="rounded-xl border p-3"><option value="NGN">NGN</option><option value="USD">USD</option></select><button type="submit" className="flex-1 rounded-xl bg-primary p-3 font-bold text-white">{editingAccountId ? 'Save account changes' : 'Add receiving account'}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRequestModalOpen && ['ADMIN', 'ACCOUNTANT'].includes(user?.role || '') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden"
            >
              <h3 className="text-2xl font-bold text-primary mb-6">Create Payment Request</h3>
              <form onSubmit={createPaymentRequest} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Case</label>
                  <select
                    value={requestForm.caseId}
                    onChange={(e) => setRequestForm({ ...requestForm, caseId: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-primary"
                    required
                  >
                    <option value="">Select case…</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} — {c.client?.name || c.clientId}
                      </option>
                    ))}
                  </select>
                  {isCasesLoading && <p className="mt-2 text-xs text-gray-400 font-bold">Loading cases…</p>}
                  {casesError && <p className="mt-2 text-xs text-red-500 font-bold">{casesError}</p>}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-primary mb-2">Amount</label>
                    <input
                      type="number"
                      value={requestForm.amount}
                      onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl"
                      required
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-primary mb-2">Currency</label>
                    <select
                      value={requestForm.currency}
                      onChange={(e) => setRequestForm({ ...requestForm, currency: e.target.value, accountId: '' })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-primary"
                    >
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Receiving account for bank transfer</label>
                  <select
                    value={requestForm.accountId}
                    onChange={(e) => setRequestForm({ ...requestForm, accountId: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-primary"
                  >
                    <option value="">Online checkout only</option>
                    {accounts.filter((account) => account.currency === requestForm.currency).map((account) => (
                      <option key={account.id} value={account.id}>{account.bankName} — {account.accountNumber} ({account.accountName})</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">Choose the exact OPay, Moniepoint or bank account for this invoice. Leave blank if the client should pay online.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Description (optional)</label>
                  <input
                    type="text"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl"
                    placeholder="e.g. Filing fees, retainer, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Due Date (optional)</label>
                  <input
                    type="date"
                    value={requestForm.dueDate}
                    onChange={(e) => setRequestForm({ ...requestForm, dueDate: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl"
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-8 py-4 text-gray-400 font-bold hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    Create Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verifyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerifyTarget(null)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl p-10 overflow-hidden"
            >
              <h3 className="text-2xl font-bold text-primary mb-2">Verify Payment</h3>
              <p className="text-gray-500 mb-6">{verifyTarget.case.title} — {verifyTarget.client?.name}</p>
                  {verifyTarget.proofUrl && (
                <a href={verifyTarget.proofUrl} target="_blank" rel="noreferrer" className="text-secondary font-bold">
                  View uploaded receipt
                </a>
              )}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Status</label>
                  <select
                    value={verifyForm.status}
                    onChange={(e) => setVerifyForm({ ...verifyForm, status: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-primary"
                  >
                    <option value="SUCCESS">Approve (SUCCESS)</option>
                    <option value="FAILED">Reject (FAILED)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Note (optional)</label>
                  <textarea
                    value={verifyForm.note}
                    onChange={(e) => setVerifyForm({ ...verifyForm, note: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl"
                    rows={4}
                    placeholder="e.g. Received in bank statement…"
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setVerifyTarget(null)}
                    className="px-8 py-4 text-gray-400 font-bold hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={verifyPayment}
                    className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    Submit Verification
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
