import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 1. Create data directory if not exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'budget.db');
const db = new Database(dbPath);

console.log('Initializing SQLite database schema...');
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
    account_id TEXT REFERENCES accounts(id),
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

console.log('Clearing old test data...');
// Delete dependent child rows first to avoid Foreign Key violations
db.prepare('DELETE FROM budget_snapshots').run();
db.prepare('DELETE FROM transactions').run();
db.prepare('DELETE FROM recurring_transactions').run();
db.prepare('DELETE FROM accounts').run();
db.prepare('DELETE FROM sync_cursors').run();
db.prepare('DELETE FROM items').run();
db.prepare('DELETE FROM budgets').run();
db.prepare('DELETE FROM profiles').run();
db.prepare('DELETE FROM category_rules').run();
db.prepare('DELETE FROM system_settings').run();


// 2. Parse .env.local for credentials
console.log('Loading .env.local environment variables...');
const envPath = path.join(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value.trim();
    }
  });
}

const encryptionKey = env.ENCRYPTION_KEY || '8d12cd5164a7231bad1c3d2c3201740a';
const plaidClientId = env.PLAID_CLIENT_ID || 'dummy_client_id';
const plaidSecretRaw = env.PLAID_SECRET || 'dummy_secret';
const passwordHash = env.APP_PASSWORD_HASH || '$2b$10$92j/x6Q8mOkaFiena2WUE.GCMaCiQolGFaGkOV1w059ADekPBuhLq'; // default hash for 'budget123'
const authDisabled = env.AUTH_DISABLED || 'true';

// Encrypt secret using the AES-256-GCM routine matching src/lib/crypto.ts
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

function encryptSecret(text, keyString) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = Buffer.from(keyString, 'utf-8');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

const encryptedPlaidSecret = encryptSecret(plaidSecretRaw, encryptionKey);

console.log('Seeding system settings...');
const insertSetting = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)');
insertSetting.run('plaid_client_id', plaidClientId);
insertSetting.run('plaid_secret', encryptedPlaidSecret);
insertSetting.run('plaid_env', env.PLAID_ENV || 'development');
insertSetting.run('ai_api_url', env.AI_API_URL || env.GOJO_API_URL || 'http://127.0.0.1:8000');
insertSetting.run('app_password_hash', passwordHash);
insertSetting.run('auth_disabled', authDisabled);

console.log('Seeding profiles...');
const insertProfile = db.prepare('INSERT INTO profiles (id, name, icon) VALUES (?, ?, ?)');
insertProfile.run('prof_joint', 'Joint', '👥');
insertProfile.run('prof_husband', 'Husband', '👨🏽');
insertProfile.run('prof_spouse', 'Spouse', '👩🏽');

console.log('Seeding default category rules...');
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
  { k: 'uber eats', c: 'Restaurants' },
  { k: 'openai', c: 'Subscriptions' },
  { k: 'monthly service fee', c: 'Bank Fees' },
  { k: 'maintenance fee', c: 'Bank Fees' },
  { k: 'foreign transaction fee', c: 'Bank Fees' },
  { k: 'walgreens', c: 'Pharmacy/Medical' },
  { k: 'cvs', c: 'Pharmacy/Medical' },
  { k: 'the home depot', c: 'Maintenance/Other Housing' },
  { k: 'lowes', c: 'Maintenance/Other Housing' },
  { k: 'hindu temple', c: 'Donations' },
  { k: 'target', c: 'General' },
  { k: 'amazon', c: 'General' },
  { k: 'amzn', c: 'General' },
  { k: 'southwest', c: 'Travel' },
  { k: 'airbnb', c: 'Travel' },
  { k: 'uber', c: 'Travel' },
  { k: 'lyft', c: 'Travel' }
];

const insertRule = db.prepare('INSERT INTO category_rules (id, keyword, category) VALUES (?, ?, ?)');
for (const rule of rules) {
  insertRule.run(crypto.randomUUID(), rule.k, rule.c);
}

console.log('Seeding items...');
const insertItem = db.prepare('INSERT INTO items (id, plaid_item_id, plaid_access_token, institution_id, institution_name, status) VALUES (?, ?, ?, ?, ?, ?)');
insertItem.run('item_chase', 'plaid_item_chase_123', 'access_chase_token_123', 'ins_chase', 'Chase Bank', 'active');
insertItem.run('item_capone', 'plaid_item_capone_456', 'access_capone_token_456', 'ins_capone', 'Capital One', 'active');
insertItem.run('item_vanguard', 'plaid_item_vanguard_789', 'access_vanguard_token_789', 'ins_vanguard', 'Vanguard', 'active');

console.log('Seeding financial accounts...');
const insertAccount = db.prepare(`
  INSERT INTO accounts (id, plaid_account_id, item_id, name, custom_name, official_name, type, subtype, mask, current_balance, available_balance, owner)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
// Chase Bank accounts
insertAccount.run('acc_chase_checking', 'plaid_acc_chase_checking', 'item_chase', 'Chase Checking', 'Chase Checking', 'Chase Total Personal Checking', 'depository', 'checking', '1234', 5430.12, 5430.12, 'Joint');
insertAccount.run('acc_chase_savings', 'plaid_acc_chase_savings', 'item_chase', 'Chase Savings', 'Chase Savings', 'Chase Personal Savings Account', 'depository', 'savings', '5678', 15200.50, 15200.50, 'Joint');
insertAccount.run('acc_chase_credit', 'plaid_acc_chase_credit', 'item_chase', 'Chase Credit Card', 'Chase Sapphire Card', 'Chase Sapphire Preferred Credit Card', 'credit', 'credit card', '9012', 1240.50, 8759.50, 'Joint');

// Capital One accounts
insertAccount.run('acc_capone_savings', 'plaid_acc_capone_savings', 'item_capone', 'Capital One 360', 'Capital One Savings', 'Capital One 360 Performance Savings', 'depository', 'savings', '3456', 24500.00, 24500.00, 'Husband');

// Student Loan account
insertAccount.run('acc_student_loan', 'plaid_acc_student_loan', 'item_chase', 'Student Loan Payoff', 'Student Loan', 'Federal Student Loan', 'loan', 'student', '7890', 12500.00, null, 'Spouse');

// Vanguard Investment account
insertAccount.run('acc_vanguard_brokerage', 'plaid_acc_vanguard_brokerage', 'item_vanguard', 'Vanguard Brokerage', 'Vanguard Investment', 'Vanguard Brokerage Taxable Account', 'investment', 'brokerage', '4321', 45000.00, null, 'Joint');

console.log('Seeding custom budgets...');
const budgetsToInsert = [
  { name: 'CAP 1 Savings', category: 'CAP 1', limit: 4050, color: '#10b981', due: null },
  { name: 'Church Giving', category: 'Church', limit: 200, color: '#8b5cf6', due: null },
  { name: 'Gifts', category: 'Gifts', limit: 200, color: '#ec4899', due: null },
  { name: 'Mortgage', category: 'Mortgage', limit: 2340, color: '#3b82f6', due: 1 },
  { name: 'Sewer', category: 'Sewer', limit: 120, color: '#0ea5e9', due: 10 },
  { name: 'Elec/Water/Trash', category: 'Elec/Water/Trash', limit: 250, color: '#f59e0b', due: 15 },
  { name: 'Gas', category: 'Gas', limit: 100, color: '#f97316', due: 15 },
  { name: 'Phone', category: 'Phone', limit: 110, color: '#6366f1', due: 20 },
  { name: 'Subscriptions', category: 'Subscriptions', limit: 55, color: '#d946ef', due: 5 },
  { name: 'Internet', category: 'Internet', limit: 65, color: '#8b5cf6', due: 12 },
  { name: 'Housing Maint', category: 'Maintenance/Other Housing', limit: 100, color: '#64748b', due: null },
  { name: 'Auto Insurance', category: 'Insurance', limit: 80, color: '#14b8a6', due: 8 },
  { name: 'Car Loan', category: 'Car Loan', limit: 100, color: '#f43f5e', due: 18 },
  { name: 'Car Wash', category: 'Car Wash', limit: 40, color: '#06b6d4', due: 22 },
  { name: 'Fuel', category: 'Fuel', limit: 200, color: '#eab308', due: null },
  { name: 'Vehicle Maint', category: 'Maintenance/Other Vehicle', limit: 200, color: '#94a3b8', due: null },
  { name: 'Groceries', category: 'Groceries', limit: 800, color: '#22c55e', due: null },
  { name: 'Restaurants', category: 'Restaurants', limit: 400, color: '#ef4444', due: null },
  { name: 'Events/Entertain', category: 'Events/Entertain', limit: 200, color: '#d946ef', due: null },
  { name: 'Hobbies/Crafts', category: 'Hobbies/Crafts', limit: 200, color: '#f472b6', due: null },
  { name: 'Gym', category: 'Gym', limit: 325, color: '#3b82f6', due: 24 },
  { name: 'Investments', category: 'Investments', limit: 100, color: '#6366f1', due: 28 },
  { name: 'Student Loans', category: 'Student Loans', limit: 105, color: '#f59e0b', due: 17 },
  { name: 'Life Insurance', category: 'Life Insurance', limit: 400, color: '#10b981', due: 8 },
  { name: 'Pets', category: 'Pets', limit: 100, color: '#ec4899', due: null },
  { name: 'Other Expenses', category: 'Other', limit: 350, color: '#64748b', due: null }
];

const insertBudget = db.prepare(`
  INSERT INTO budgets (id, name, plaid_category_primary, monthly_limit, color, active, due_date)
  VALUES (?, ?, ?, ?, ?, 1, ?)
`);

for (const b of budgetsToInsert) {
  insertBudget.run(crypto.randomUUID(), b.name, b.category, b.limit, b.color, b.due);
}

console.log('Seeding recurring transaction models (for calendars & projections)...');
const insertRecurring = db.prepare(`
  INSERT INTO recurring_transactions (id, plaid_stream_id, account_id, merchant_name, description, amount_average, amount_last, frequency, category_primary, is_active, is_income, last_date, next_expected_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
`);

// Income streams
insertRecurring.run('rec_inc_salary', 'stream_salary', 'acc_chase_checking', 'Corporate Employer', 'Salary Direct Deposit', 3500.00, 3500.00, 'biweekly', 'INCOME', 1, '2026-06-15', '2026-06-29');

// Expense bills
insertRecurring.run('rec_exp_mortgage', 'stream_mortgage', 'acc_chase_checking', 'Mortgage', 'Chase Home Lending Mortgage', 2340.00, 2340.00, 'monthly', 'HOUSING', 0, '2026-06-01', '2026-07-01');
insertRecurring.run('rec_exp_sewer', 'stream_sewer', 'acc_chase_checking', 'Sewer', 'St Louis MSD Sewer', 120.00, 120.00, 'monthly', 'HOUSING', 0, '2026-06-10', '2026-07-10');
insertRecurring.run('rec_exp_elec', 'stream_elec', 'acc_chase_checking', 'Ameren', 'Ameren Missouri Electric', 155.80, 155.80, 'monthly', 'HOUSING', 0, '2026-06-15', '2026-07-15');
insertRecurring.run('rec_exp_gas', 'stream_gas', 'acc_chase_checking', 'Spire', 'Spire Natural Gas Bill', 92.00, 92.00, 'monthly', 'HOUSING', 0, '2026-06-15', '2026-07-15');
insertRecurring.run('rec_exp_internet', 'stream_internet', 'acc_chase_checking', 'Spectrum', 'Spectrum High Speed Internet', 65.00, 65.00, 'monthly', 'HOUSING', 0, '2026-06-12', '2026-07-12');
insertRecurring.run('rec_exp_netflix', 'stream_netflix', 'acc_chase_credit', 'Netflix', 'Netflix.com Subscription', 15.49, 15.49, 'monthly', 'HOUSING', 0, '2026-06-03', '2026-07-03');
insertRecurring.run('rec_exp_phone', 'stream_phone', 'acc_chase_checking', 'AT&T Phone', 'AT&T Mobile Bill', 110.00, 110.00, 'monthly', 'HOUSING', 0, '2026-06-20', '2026-07-20');
insertRecurring.run('rec_exp_life_ins', 'stream_life_ins', 'acc_chase_checking', 'Mutual of Omaha', 'Mutual of Omaha Life Insurance', 400.00, 400.00, 'monthly', 'OTHER', 0, '2026-06-08', '2026-07-08');
insertRecurring.run('rec_exp_car_loan', 'stream_car_loan', 'acc_chase_checking', 'Auto Financing', 'Auto Loan Payment', 100.00, 100.00, 'monthly', 'VEHICLES', 0, '2026-06-18', '2026-07-18');
insertRecurring.run('rec_exp_carwash', 'stream_carwash', 'acc_chase_credit', 'Car Wash Club', 'Monthly Car Wash Pass', 40.00, 40.00, 'monthly', 'VEHICLES', 0, '2026-06-22', '2026-07-22');
insertRecurring.run('rec_exp_gym', 'stream_gym', 'acc_chase_credit', 'Gym Center', 'Monthly Gym Membership', 325.00, 325.00, 'monthly', 'OTHER', 0, '2026-06-24', '2026-07-24');
insertRecurring.run('rec_exp_student', 'stream_student', 'acc_chase_checking', 'Student Loans', 'Student Loan Bill', 105.00, 105.00, 'monthly', 'OTHER', 0, '2026-06-17', '2026-07-17');

console.log('Generating and seeding historical transactions (May & June 2026)...');
const insertTransaction = db.prepare(`
  INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, date, name, merchant_name, pending, category_primary, category_detailed, custom_category, excluded)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
`);

const txData = [];

// Helper to push transactions
const addTx = (id, accountId, amount, date, name, merchant, catPrimary, catDetailed, customCat, excluded = 0) => {
  txData.push({ id, accountId, amount, date, name, merchant, catPrimary, catDetailed, customCat, excluded });
};

// ================== MAY 2026 ==================
// Income
addTx('tx_may_sal1', 'acc_chase_checking', -3500.00, '2026-05-01', 'Salary Direct Deposit', 'Employer', 'INCOME', 'WAGES_SALARY', 'Salary');
addTx('tx_may_sal2', 'acc_chase_checking', -3500.00, '2026-05-15', 'Salary Direct Deposit', 'Employer', 'INCOME', 'WAGES_SALARY', 'Salary');
addTx('tx_may_sal3', 'acc_chase_checking', -3500.00, '2026-05-29', 'Salary Direct Deposit', 'Employer', 'INCOME', 'WAGES_SALARY', 'Salary'); // 3 salaries in May
addTx('tx_may_div', 'acc_chase_checking', -150.00, '2026-05-18', 'Dividend Payment', 'Brokerage', 'INCOME', 'DIVIDENDS', 'Side Hustle');

// Regular Bills
addTx('tx_may_mortgage', 'acc_chase_checking', 2340.00, '2026-05-01', 'Chase Mortgage AutoPay', 'Mortgage', 'LOAN_PAYMENTS', 'MORTGAGE', 'Mortgage');
addTx('tx_may_netflix', 'acc_chase_credit', 15.49, '2026-05-03', 'Netflix.com', 'Netflix', 'ENTERTAINMENT', 'TV_AND_MOVIES', 'Subscriptions');
addTx('tx_may_life_ins', 'acc_chase_checking', 400.00, '2026-05-08', 'Mutual of Omaha Life Ins', 'Mutual of Omaha', 'INSURANCE', 'LIFE_INSURANCE', 'Life Insurance');
addTx('tx_may_sewer', 'acc_chase_checking', 120.00, '2026-05-10', 'St Louis MSD Sewer Bill', 'Sewer', 'UTILITIES', 'WATER', 'Sewer');
addTx('tx_may_internet', 'acc_chase_credit', 65.00, '2026-05-12', 'Spectrum Internet', 'Spectrum', 'UTILITIES', 'CABLE_AND_INTERNET', 'Internet');
addTx('tx_may_electric', 'acc_chase_checking', 135.40, '2026-05-15', 'Ameren Missouri Electric', 'Ameren', 'UTILITIES', 'ELECTRICITY', 'Elec/Water/Trash');
addTx('tx_may_gas', 'acc_chase_checking', 85.00, '2026-05-15', 'Spire Natural Gas Bill', 'Spire', 'UTILITIES', 'GAS', 'Gas');
addTx('tx_may_student', 'acc_chase_checking', 105.00, '2026-05-17', 'Student Loan Bill', 'Student Loans', 'LOAN_PAYMENTS', 'STUDENT_LOANS', 'Student Loans');
addTx('tx_may_car_loan', 'acc_chase_checking', 100.00, '2026-05-18', 'Auto Financing Payment', 'Auto Financing', 'LOAN_PAYMENTS', 'AUTO_LOANS', 'Car Loan');
addTx('tx_may_phone', 'acc_chase_checking', 110.00, '2026-05-20', 'Cell Phone Bill', 'Phone Provider', 'UTILITIES', 'TELEPHONE', 'Phone');
addTx('tx_may_carwash', 'acc_chase_credit', 40.00, '2026-05-22', 'Car Wash Monthly Pass', 'Car Wash Club', 'TRANSPORTATION', 'AUTO_EXPENSES', 'Car Wash');
addTx('tx_may_gym', 'acc_chase_credit', 325.00, '2026-05-24', 'Gym Membership Annual', 'Gym Center', 'PERSONAL_CARE', 'GYM_MEMBERSHIP', 'Gym');
addTx('tx_may_ybi', 'acc_chase_checking', 100.00, '2026-05-28', 'Investment Contribution', 'Investments', 'FINANCIAL', 'INVESTMENTS', 'Investments');

// Groceries & Food
addTx('tx_may_groc1', 'acc_chase_credit', 145.20, '2026-05-04', 'Schnucks Market #12', 'Schnucks', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');
addTx('tx_may_groc2', 'acc_chase_credit', 85.30, '2026-05-11', 'Aldi Food Store', 'Aldi', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');
addTx('tx_may_groc3', 'acc_chase_credit', 162.10, '2026-05-18', 'Schnucks Market #12', 'Schnucks', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');
addTx('tx_may_groc4', 'acc_chase_credit', 94.80, '2026-05-25', 'Dierbergs Market', 'Dierbergs', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');

// Restaurants & Fun
addTx('tx_may_rest1', 'acc_chase_credit', 42.50, '2026-05-02', 'Olive Garden Italian', 'Olive Garden', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_may_rest2', 'acc_chase_credit', 15.20, '2026-05-06', 'Starbucks Coffee', 'Starbucks', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_may_rest3', 'acc_chase_credit', 68.40, '2026-05-16', 'Texas Roadhouse', 'Texas Roadhouse', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_may_rest4', 'acc_chase_credit', 24.80, '2026-05-22', 'McDonalds Delivery', 'McDonalds', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_may_fun1', 'acc_chase_credit', 85.00, '2026-05-09', 'St Louis Cardinals Ticket', 'St Louis Cardinals', 'ENTERTAINMENT', 'SPORTING_EVENTS', 'Events/Entertain');

// Fuel & Pets
addTx('tx_may_fuel1', 'acc_chase_credit', 45.00, '2026-05-05', 'Quiktrip #123', 'Quiktrip', 'TRANSPORTATION', 'GAS_STATIONS', 'Fuel');
addTx('tx_may_fuel2', 'acc_chase_credit', 48.00, '2026-05-19', 'Shell Oil Station', 'Shell', 'TRANSPORTATION', 'GAS_STATIONS', 'Fuel');
addTx('tx_may_pet1', 'acc_chase_credit', 78.40, '2026-05-14', 'Pet Supply Store', 'Chewy', 'PERSONAL_CARE', 'PET_SUPPLIES', 'Pets');

// Transfers (Excluded)
addTx('tx_may_vanguard_out', 'acc_chase_checking', 500.00, '2026-05-26', 'Vanguard Invest Draft', 'Vanguard', 'TRANSFER_OUT', 'INVESTMENT_TRANSFER', 'CAP 1 Savings', 1);
addTx('tx_may_vanguard_in', 'acc_vanguard_brokerage', -500.00, '2026-05-26', 'Deposit from Chase', 'Vanguard', 'TRANSFER_IN', 'INVESTMENT_TRANSFER', null, 1);
addTx('tx_may_cc_pmt_out', 'acc_chase_checking', 1240.50, '2026-05-30', 'Chase Credit Card Payment', 'Chase Card', 'TRANSFER_OUT', 'CREDIT_CARD_PAYMENT', null, 1);
addTx('tx_may_cc_pmt_in', 'acc_chase_credit', -1240.50, '2026-05-30', 'Payment thank you', 'Chase Card', 'TRANSFER_IN', 'CREDIT_CARD_PAYMENT', null, 1);


// ================== JUNE 2026 ==================
// Income
addTx('tx_june_sal1', 'acc_chase_checking', -3500.00, '2026-06-01', 'Salary Direct Deposit', 'Employer', 'INCOME', 'WAGES_SALARY', 'Salary');
addTx('tx_june_sal2', 'acc_chase_checking', -3500.00, '2026-06-15', 'Salary Direct Deposit', 'Employer', 'INCOME', 'WAGES_SALARY', 'Salary');
addTx('tx_june_div', 'acc_chase_checking', -150.00, '2026-06-18', 'Dividend Payment', 'Brokerage', 'INCOME', 'DIVIDENDS', 'Side Hustle');

// Regular Bills
addTx('tx_june_mortgage', 'acc_chase_checking', 2340.00, '2026-06-01', 'Chase Mortgage AutoPay', 'Mortgage', 'LOAN_PAYMENTS', 'MORTGAGE', 'Mortgage');
addTx('tx_june_netflix', 'acc_chase_credit', 15.49, '2026-06-03', 'Netflix.com', 'Netflix', 'ENTERTAINMENT', 'TV_AND_MOVIES', 'Subscriptions');
addTx('tx_june_life_ins', 'acc_chase_checking', 400.00, '2026-06-08', 'Mutual of Omaha Life Ins', 'Mutual of Omaha', 'INSURANCE', 'LIFE_INSURANCE', 'Life Insurance');
addTx('tx_june_sewer', 'acc_chase_checking', 120.00, '2026-06-10', 'St Louis MSD Sewer Bill', 'Sewer', 'UTILITIES', 'WATER', 'Sewer');
addTx('tx_june_internet', 'acc_chase_credit', 65.00, '2026-06-12', 'Spectrum Internet', 'Spectrum', 'UTILITIES', 'CABLE_AND_INTERNET', 'Internet');
addTx('tx_june_electric', 'acc_chase_checking', 155.80, '2026-06-15', 'Ameren Missouri Electric', 'Ameren', 'UTILITIES', 'ELECTRICITY', 'Elec/Water/Trash');
addTx('tx_june_gas', 'acc_chase_checking', 92.00, '2026-06-15', 'Spire Natural Gas Bill', 'Spire', 'UTILITIES', 'GAS', 'Gas');
addTx('tx_june_student', 'acc_chase_checking', 105.00, '2026-06-17', 'Student Loan Bill', 'Student Loans', 'LOAN_PAYMENTS', 'STUDENT_LOANS', 'Student Loans');
addTx('tx_june_car_loan', 'acc_chase_checking', 100.00, '2026-06-18', 'Auto Financing Payment', 'Auto Financing', 'LOAN_PAYMENTS', 'AUTO_LOANS', 'Car Loan');
addTx('tx_june_phone', 'acc_chase_checking', 110.00, '2026-06-20', 'Cell Phone Bill', 'Phone Provider', 'UTILITIES', 'TELEPHONE', 'Phone');
addTx('tx_june_carwash', 'acc_chase_credit', 40.00, '2026-06-22', 'Car Wash Monthly Pass', 'Car Wash Club', 'TRANSPORTATION', 'AUTO_EXPENSES', 'Car Wash');
addTx('tx_june_gym', 'acc_chase_credit', 325.00, '2026-06-24', 'Planet Fitness Annual', 'Planet Fitness', 'PERSONAL_CARE', 'GYM_MEMBERSHIP', 'Gym');

// Groceries & Food
addTx('tx_june_groc1', 'acc_chase_credit', 162.30, '2026-06-05', 'Schnucks Market #12', 'Schnucks', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');
addTx('tx_june_groc2', 'acc_chase_credit', 91.50, '2026-06-11', 'Aldi Food Store', 'Aldi', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');
addTx('tx_june_groc3', 'acc_chase_credit', 148.70, '2026-06-19', 'Schnucks Market #12', 'Schnucks', 'FOOD_AND_DRINK', 'GROCERIES', 'Groceries');

// Restaurants & Fun
addTx('tx_june_rest1', 'acc_chase_credit', 54.00, '2026-06-02', 'Cheesecake Factory', 'Cheesecake Factory', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_june_rest2', 'acc_chase_credit', 18.50, '2026-06-09', 'Starbucks Coffee', 'Starbucks', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');
addTx('tx_june_rest3', 'acc_chase_credit', 82.10, '2026-06-21', 'Buffalo Wild Wings', 'Buffalo Wild Wings', 'FOOD_AND_DRINK', 'RESTAURANTS', 'Restaurants');

// Fuel & Pets
addTx('tx_june_fuel1', 'acc_chase_credit', 47.50, '2026-06-07', 'Quiktrip #123', 'Quiktrip', 'TRANSPORTATION', 'GAS_STATIONS', 'Fuel');
addTx('tx_june_fuel2', 'acc_chase_credit', 51.00, '2026-06-20', 'Shell Oil Station', 'Shell', 'TRANSPORTATION', 'GAS_STATIONS', 'Fuel');
addTx('tx_june_pet1', 'acc_chase_credit', 65.20, '2026-06-14', 'Pet Supply Store', 'Chewy', 'PERSONAL_CARE', 'PET_SUPPLIES', 'Pets');

// Transfers (Excluded)
addTx('tx_june_vanguard_out', 'acc_chase_checking', 500.00, '2026-06-23', 'Vanguard Invest Draft', 'Vanguard', 'TRANSFER_OUT', 'INVESTMENT_TRANSFER', 'CAP 1 Savings', 1);
addTx('tx_june_vanguard_in', 'acc_vanguard_brokerage', -500.00, '2026-06-23', 'Deposit from Chase', 'Vanguard', 'TRANSFER_IN', 'INVESTMENT_TRANSFER', null, 1);

// Insert transactions
let txCount = 0;
for (const t of txData) {
  insertTransaction.run(
    t.id,
    'plaid_tx_' + t.id,
    t.accountId,
    t.amount,
    t.date,
    t.name,
    t.merchant,
    t.catPrimary,
    t.catDetailed,
    t.customCat,
    t.excluded
  );
  txCount++;
}

console.log(`Successfully seeded ${txCount} historical transactions.`);

// 8. Re-calculate budget snapshots for May and June 2026
console.log('Calculating and seeding budget snapshots (May & June 2026)...');
const budgetList = db.prepare('SELECT id, name, monthly_limit, plaid_category_primary FROM budgets').all();

const updateSnapshot = db.prepare(`
  INSERT INTO budget_snapshots (id, budget_id, month, spent, limit_amount)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(budget_id, month) DO UPDATE SET spent = excluded.spent, limit_amount = excluded.limit_amount
`);

const months = ['2026-05', '2026-06'];

for (const month of months) {
  for (const b of budgetList) {
    const spentRow = db.prepare(`
      SELECT SUM(amount) as total
      FROM transactions
      WHERE custom_category = ? AND date LIKE ? AND excluded = 0
    `).get(b.name, `${month}%`);
    
    const spent = Math.max(0, spentRow ? (spentRow.total || 0) : 0);
    
    updateSnapshot.run(
      crypto.randomUUID(),
      b.id,
      month,
      spent,
      b.monthly_limit
    );
  }
}

console.log('Budget snapshots updated successfully.');

// Clean up deprecated middleware.ts if it exists to prevent Next.js crashes
const deprecatedMiddlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');
if (fs.existsSync(deprecatedMiddlewarePath)) {
  fs.unlinkSync(deprecatedMiddlewarePath);
  console.log('Successfully removed deprecated src/middleware.ts (using src/proxy.ts instead).');
}

console.log('=============================================');
console.log('Database initialization and seeding COMPLETE!');
console.log('SQLite budget.db has been created and populated.');
console.log('To start testing, run:');
console.log('  npm run dev');
console.log('=============================================');
db.close();

