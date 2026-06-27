export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initScheduledJobs } = await import('./lib/cron');
    initScheduledJobs();
  }
}
