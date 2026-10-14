# 💼 Midlex LLP - Payment & Finance Management Portal

Live Deployment: [https://payment-portal-midlex-llp-lawfirm.vercel.app](https://payment-portal-midlex-llp-lawfirm.vercel.app)  
Backend API: [https://midlex-new.onrender.com](https://midlex-new.onrender.com)

Dedicated financial operations and accounting portal for Midlex LLP. Chief Accountants and authorized Finance Officers use this portal to issue legal fee invoices, verify client payments, approve bank transfer receipts, and maintain firm receiving accounts.

---

## 🔑 Authorized Login Credentials

| Role | Name | Email Address | Password | Permissions |
|---|---|---|---|---|
| **Chief Accountant** | Chief Accountant (Finance) | `accountant@midlex.com` | `accountant123` | Full Billing, Invoicing & Payment Verification |
| **Super Admin** | Super Admin | `midlexllp01@gmail.com` | `Admin@123` *(or `admin123`)* | Global Firm Financial Oversight |

---

## 🌟 Key Responsibilities & Capabilities

1. **Issue Legal Fee Invoices / Payment Requests**:
   - Bill clients directly for legal services (Retainers, Court Filing Fees, Consultation, Corporate Advisory).
   - Assign invoices to specific cases and clients.
   - Designate the firm receiving bank account for funds collection.
   - **Shared System Sync**: Any invoice created here immediately synchronizes with the main PostgreSQL database and appears in both the client's mobile app and the Super Admin dashboard.

2. **Manual Payment Verification Queue**:
   - Review submitted client bank transfer receipts and transaction references.
   - One-click **Approve & Mark Paid** or **Decline & Reject**.
   - Cleared funds immediately update case financial balances across all dashboards.

3. **Case Financial Ledgers & Fee Allocations**:
   - Track total amount billed vs. cleared per legal matter.
   - Filter by case, client, and assigned legal litigation team (`TEAM ANCHOR`).

4. **Receiving Bank Accounts Management**:
   - Configure corporate bank accounts (Zenith Bank, Access Bank, GTBank, etc.) presented to clients for manual bank deposits.

---

## 🚀 Local Development

```bash
cd "payment management portal"
npm install
npm run dev
```

Server starts on `http://localhost:3004`.
