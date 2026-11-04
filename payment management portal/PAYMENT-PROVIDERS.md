# OPay and Moniepoint rollout

Only admins create invoices in Legal Admin or the Finance Portal. Lawyers and clients cannot create invoices or set amounts. Accountants monitor all invoices, review receipts, maintain receiving accounts, and check gateway status. Accountant invoice creation is disabled.

## Bank transfers
Add your real OPay or Moniepoint business account under Receiving accounts. The admin selects the exact same-currency account on each invoice when bank transfer is allowed. Clients see only the account assigned to that invoice, then upload proof. Invoices without an assigned account offer online checkout only. Confirm receipt against the actual bank statement before approving. A submitted receipt alone is not proof of settlement.

## Checkout activation (server environment only)
OPay: OPAY_PUBLIC_KEY, OPAY_PRIVATE_KEY, OPAY_MERCHANT_ID. Keep OPAY_SANDBOX=true for tests; use false only with approved live credentials. Existing callback: /payments/opay/webhook.

Moniepoint online collection uses Monnify hosted checkout. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE. MONNIFY_LIVE defaults to sandbox; set true only after merchant approval and sandbox testing. Set FRONTEND_URL to the client portal origin. Callback: /payments/monnify/webhook. Production callbacks require the HMAC-SHA512 monnify-signature header over the raw request body. Sandbox callbacks without signatures are refused; use authenticated Check provider instead.

Never put private keys in frontend variables or paste them into chat. Provider status shows configured/sandbox/live configuration, not merchant approval or settlement health.

## Release checks
Deploy backend before client and finance frontends. Verify /payments/providers, an accountant's all-invoice list, an admin-created invoice, receipt upload/review, and test-provider checkout plus server verification. Test underpayment, wrong currency/reference, duplicate callbacks and cancelled sessions before live activation. No live provider transaction has been tested without merchant accounts.

Official references: https://developers.monnify.com/docs/collections/one-time-payments/checkout-api and https://developers.monnify.com/docs/collections/manage-payments/verify-transactions
