import cron from 'node-cron';
import { syncAllItems } from './sync';
import { backupDatabase } from './backup';

let isInitialized = false;

export function initScheduledJobs() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('Initializing scheduled jobs...');

  // Sync transactions every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled transaction sync...`);
    try {
      const results = await syncAllItems();
      console.log(`[${new Date().toISOString()}] Sync complete:`, results);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during scheduled sync:`, error);
    }
  });

  // Backup database daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log(`[${new Date().toISOString()}] Running daily database backup...`);
    try {
      backupDatabase();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error during database backup:`, error);
    }
  });

  console.log('Scheduled: transaction sync every 6h (0 */6 * * *), backup daily at 2am (0 2 * * *)');
}

