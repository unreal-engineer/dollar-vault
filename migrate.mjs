import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'budget.db');
const db = new Database(dbPath);

console.log('Running migration...');
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_rules (
      id text PRIMARY KEY NOT NULL,
      keyword text NOT NULL UNIQUE,
      category text NOT NULL,
      is_active integer DEFAULT true,
      created_at text DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table category_rules created successfully.');
  
  // Seed the table with existing rules
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

  const stmt = db.prepare('INSERT OR IGNORE INTO category_rules (id, keyword, category) VALUES (?, ?, ?)');
  
  let inserted = 0;
  for (const rule of rules) {
    const id = crypto.randomUUID();
    const res = stmt.run(id, rule.k, rule.c);
    if (res.changes > 0) inserted++;
  }
  
  console.log('Seeded ' + inserted + ' rules.');
} catch (e) {
  console.error(e);
}
