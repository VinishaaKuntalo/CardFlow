const baseUrl = (process.env.CARDFLOW_BASE_URL || '').replace(/\/$/, '');
const jobSecret = process.env.WHATSAPP_CRON_SECRET || '';

if (!baseUrl || !jobSecret) {
  console.error('Set CARDFLOW_BASE_URL and WHATSAPP_CRON_SECRET for the scheduled reminder job.');
  process.exit(1);
}

try {
  const response = await fetch(`${baseUrl}/api/jobs/whatsapp-reminders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jobSecret}` }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Reminder job failed (${response.status})`);
  console.log(JSON.stringify({ sent: result.sent, skipped: result.skipped, failures: result.failures?.length || 0 }));
  if (result.failures?.length) process.exitCode = 1;
} catch (error) {
  console.error(`WhatsApp reminder job failed: ${error.message}`);
  process.exit(1);
}
