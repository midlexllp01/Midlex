const BACKEND_URLS = [
  'https://midlex-project-backend.onrender.com/health',
  'https://midlex-backend.onrender.com/health',
  'https://midlex-new.onrender.com/health',
  'https://midlex-hrms.onrender.com/api/health',
  'https://midlex-cbt-backend.onrender.com',
  'https://midlex-ai-new.onrender.com',
  'https://midlex-realty.onrender.com/health',
];

export function startBackendKeepAliveCron(intervalMinutes = 10) {
  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[KeepAlive Cron] Initialized: pinging ${BACKEND_URLS.length} Midlex backends every ${intervalMinutes} minutes.`);

  const pingAll = async () => {
    const timestamp = new Date().toISOString();
    for (const url of BACKEND_URLS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Midlex-KeepAlive-Cron/1.0' } });
        clearTimeout(timeout);
        console.log(`[KeepAlive Cron ${timestamp}] ${url} -> ${res.status}`);
      } catch (err: any) {
        console.warn(`[KeepAlive Cron ${timestamp}] ${url} -> ${err.message}`);
      }
    }
  };

  // Immediate warmup ping after 15 seconds
  setTimeout(pingAll, 15000);

  // Recurring cron every 10 minutes
  return setInterval(pingAll, intervalMs);
}
