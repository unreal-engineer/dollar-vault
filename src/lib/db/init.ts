import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export function initDatabaseSchema(dbPath: string) {
  // Ensure parent directory exists
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      plaid_item_id TEXT UNIQUE NOT NULL,
      plaid_access_token TEXT NOT NULL,
      institution_id TEXT,
      institution_name TEXT,
      status TEXT DEFAULT 'active',
      error_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      plaid_account_id TEXT UNIQUE NOT NULL,
      item_id TEXT NOT NULL REFERENCES items(id),
      name TEXT NOT NULL,
      custom_name TEXT,
      official_name TEXT,
      type TEXT NOT NULL,
      subtype TEXT,
      mask TEXT,
      current_balance REAL,
      available_balance REAL,
      iso_currency_code TEXT DEFAULT 'USD',
      balance_updated_at TEXT,
      owner TEXT DEFAULT 'Joint',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      plaid_transaction_id TEXT UNIQUE NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      datetime TEXT,
      name TEXT NOT NULL,
      merchant_name TEXT,
      pending INTEGER DEFAULT 0,
      category_primary TEXT,
      category_detailed TEXT,
      category_confidence TEXT,
      payment_channel TEXT,
      iso_currency_code TEXT DEFAULT 'USD',
      custom_category TEXT,
      notes TEXT,
      excluded INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_cursors (
      item_id TEXT PRIMARY KEY REFERENCES items(id),
      cursor TEXT NOT NULL,
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plaid_category_primary TEXT,
      plaid_category_detailed TEXT,
      monthly_limit REAL NOT NULL,
      color TEXT,
      icon TEXT,
      active INTEGER DEFAULT 1,
      due_date INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_snapshots (
      id TEXT PRIMARY KEY,
      budget_id TEXT REFERENCES budgets(id),
      month TEXT NOT NULL,
      spent REAL DEFAULT 0,
      limit_amount REAL NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(budget_id, month)
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      plaid_stream_id TEXT UNIQUE,
      accountId TEXT REFERENCES accounts(id),
      merchant_name TEXT,
      description TEXT,
      amount_average REAL,
      amount_last REAL,
      frequency TEXT,
      category_primary TEXT,
      is_active INTEGER DEFAULT 1,
      is_income INTEGER DEFAULT 0,
      last_date TEXT,
      next_expected_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_rules (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Seed profiles if empty
  const profilesCount = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='profiles'").get() as { count: number };
  if (profilesCount) {
    const row = db.prepare("SELECT count(*) as count FROM profiles").get() as { count: number };
    if (row && row.count === 0) {
      const insertProfile = db.prepare("INSERT INTO profiles (id, name, icon) VALUES (?, ?, ?)");
      insertProfile.run(randomUUID(), 'Joint', '👥');
      insertProfile.run(randomUUID(), 'Husband', '👨🏽');
      insertProfile.run(randomUUID(), 'Spouse', '👩🏽');
    }
  }

  // Seed default category rules if empty
  const rulesCount = db.prepare("SELECT count(*) as count FROM category_rules").get() as { count: number };
  if (rulesCount && rulesCount.count === 0) {
    const rules = [
      { k: 'salary', c: 'Salary' },
      { k: 'dividend', c: 'Side Hustle' },
      { k: 'freelance', c: 'Freelance' },
      { k: 'bofa', c: 'BOFA' },
      { k: 'bank of america', c: 'BOFA' },
      { k: 'pnc', c: 'PNC' },
      { k: 'cap 1', c: 'CAP 1' },
      { k: 'capital one', c: 'CAP 1' },
      { k: 'church', c: 'Church' },
      { k: 'tithe', c: 'Church' },
      { k: 'mortgage', c: 'Mortgage' },
      { k: 'homeloan', c: 'Mortgage' },
      { k: 'sewer', c: 'Sewer' },
      { k: 'msd', c: 'Sewer' },
      { k: 'water', c: 'Elec/Water/Trash' },
      { k: 'trash', c: 'Elec/Water/Trash' },
      { k: 'electric', c: 'Elec/Water/Trash' },
      { k: 'ameren', c: 'Elec/Water/Trash' },
      { k: 'utility', c: 'Elec/Water/Trash' },
      { k: 'spire', c: 'Gas' },
      { k: 'gas', c: 'Gas' },
      { k: 'att ', c: 'Phone' },
      { k: 'at&t', c: 'Phone' },
      { k: 'verizon', c: 'Phone' },
      { k: 't-mobile', c: 'Phone' },
      { k: 'phone', c: 'Phone' },
      { k: 'netflix', c: 'Subscriptions' },
      { k: 'spotify', c: 'Subscriptions' },
      { k: 'hulu', c: 'Subscriptions' },
      { k: 'amazon prime', c: 'Subscriptions' },
      { k: 'subscription', c: 'Subscriptions' },
      { k: 'spectrum', c: 'Internet' },
      { k: 'internet', c: 'Internet' },
      { k: 'comcast', c: 'Internet' },
      { k: 'state farm', c: 'Insurance' },
      { k: 'geico', c: 'Insurance' },
      { k: 'progressive', c: 'Insurance' },
      { k: 'allstate', c: 'Insurance' },
      { k: 'carmax', c: 'Car Loan' },
      { k: 'carwash', c: 'Car Wash' },
      { k: 'club carwash', c: 'Car Wash' },
      { k: 'shell', c: 'Fuel' },
      { k: 'bp ', c: 'Fuel' },
      { k: 'mobil', c: 'Fuel' },
      { k: 'quiktrip', c: 'Fuel' },
      { k: 'qt ', c: 'Fuel' },
      { k: 'fuel', c: 'Fuel' },
      { k: 'gym', c: 'Gym' },
      { k: 'planet fitness', c: 'Gym' },
      { k: 'club fitness', c: 'Gym' },
      { k: 'lifetime', c: 'Gym' },
      { k: 'ybi', c: 'Investments' },
      { k: 'young bull investors', c: 'Investments' },
      { k: 'aidvantage', c: 'Student Loans' },
      { k: 'student loan', c: 'Student Loans' },
      { k: 'life insurance', c: 'Life Insurance' },
      { k: 'mutual of omaha', c: 'Life Insurance' },
      { k: 'northwestern mutual', c: 'Life Insurance' },
      { k: 'petsmart', c: 'Pets' },
      { k: 'dog ', c: 'Pets' },
      { k: 'pet ', c: 'Pets' },
      { k: 'vet ', c: 'Pets' },
      { k: 'chewy', c: 'Pets' },
      { k: 'grocery', c: 'Groceries' },
      { k: 'schnucks', c: 'Groceries' },
      { k: 'aldi', c: 'Groceries' },
      { k: 'dierbergs', c: 'Groceries' },
      { k: 'walmart', c: 'Groceries' },
      { k: 'trader joes', c: 'Groceries' },
      { k: 'costco', c: 'Groceries' },
      { k: 'sam', c: 'Groceries' },
      { k: 'restaurant', c: 'Restaurants' },
      { k: 'mcdonald', c: 'Restaurants' },
      { k: 'starbucks', c: 'Restaurants' },
      { k: 'doordash', c: 'Restaurants' },
      { k: 'uber eats', c: 'Restaurants' }
    ];

    const insertRule = db.prepare('INSERT INTO category_rules (id, keyword, category) VALUES (?, ?, ?)');
    for (const rule of rules) {
      insertRule.run(randomUUID(), rule.k, rule.c);
    }
  }
}
