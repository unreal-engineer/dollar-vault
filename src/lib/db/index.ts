import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Construct the absolute path to the database file
// In Next.js, process.cwd() is the root of the project.
const dbPath = path.join(process.cwd(), 'data', 'budget.db');

// Create the SQLite database connection
const sqlite = new Database(dbPath);

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema });
