import { copyFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'budget.db');
const BACKUP_DIR = join(process.cwd(), 'backups');
const MAX_BACKUPS = 30; // Rolling 30-day window

/**
 * Copy the SQLite database to the backups directory with a date-stamped filename.
 * Prunes backups older than MAX_BACKUPS days.
 */
export function backupDatabase(): void {
  // Ensure the source database exists before trying to copy
  if (!existsSync(DB_PATH)) {
    console.warn('[backup] Database file not found — skipping backup:', DB_PATH);
    return;
  }

  // Ensure the backups directory exists
  mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dest = join(BACKUP_DIR, `budget-${timestamp}.db`);

  copyFileSync(DB_PATH, dest);
  console.log(`[backup] Backed up database to: ${dest}`);

  // Prune old backups (keep only the most recent MAX_BACKUPS)
  const backups = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('budget-') && f.endsWith('.db'))
    .sort(); // Alphabetical sort works for YYYY-MM-DD filenames

  while (backups.length > MAX_BACKUPS) {
    const oldest = backups.shift()!;
    unlinkSync(join(BACKUP_DIR, oldest));
    console.log(`[backup] Pruned old backup: ${oldest}`);
  }
}
