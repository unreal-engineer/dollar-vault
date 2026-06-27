import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'budget.db');
const db = new Database(dbPath);

function autoCategorize(name, merchantName, plaidPrimary, plaidDetailed) {
  const text = `${name || ''} ${merchantName || ''} ${plaidDetailed || ''}`.toLowerCase();
  
  if (text.includes('salary') || text.includes('direct deposit')) return 'Salary';
  if (text.includes('dividend')) return 'Side Hustle';
  if (text.includes('freelance')) return 'Freelance';
  if (text.includes('bofa') || text.includes('bank of america')) return 'BOFA';
  if (text.includes('pnc')) return 'PNC';
  if (text.includes('cap 1') || text.includes('capital one')) return 'CAP 1';
  if (text.includes('church') || text.includes('tithe')) return 'Church';
  if (text.includes('mortgage') || text.includes('homeloan')) return 'Mortgage';
  if (text.includes('sewer') || text.includes('msd')) return 'Sewer';
  if (text.includes('water') || text.includes('trash') || text.includes('electric') || text.includes('ameren') || text.includes('utility')) return 'Elec/Water/Trash';
  if (text.includes('spire') || text.includes('gas')) return 'Gas';
  if (text.includes('att ') || text.includes('at&t') || text.includes('verizon') || text.includes('t-mobile') || text.includes('phone')) return 'Phone';
  if (text.includes('netflix') || text.includes('spotify') || text.includes('hulu') || text.includes('amazon prime') || text.includes('subscription')) return 'Subscriptions';
  if (text.includes('spectrum') || text.includes('internet') || text.includes('comcast')) return 'Internet';
  if (text.includes('state farm') || text.includes('geico') || text.includes('progressive') || text.includes('allstate')) return 'Insurance';
  if (text.includes('carmax')) return 'Car Loan';
  if (text.includes('carwash') || text.includes('club carwash')) return 'Car Wash';
  if (text.includes('shell') || text.includes('bp ') || text.includes('mobil') || text.includes('quiktrip') || text.includes('qt ') || text.includes('fuel')) return 'Fuel';
  if (text.includes('gym') || text.includes('planet fitness') || text.includes('club fitness') || text.includes('lifetime')) return 'Gym';
  if (text.includes('ybi') || text.includes('young bull investors')) return 'Investments';
  if (text.includes('aidvantage') || text.includes('student loan')) return 'Student Loans';
  if (text.includes('life insurance') || text.includes('mutual of omaha') || text.includes('northwestern mutual')) return 'Life Insurance';
  if (text.includes('petsmart') || text.includes('dog ') || text.includes('pet ') || text.includes('vet ') || text.includes('chewy')) return 'Pets';
  if (text.includes('grocery') || text.includes('schnucks') || text.includes('aldi') || text.includes('dierbergs') || text.includes('walmart') || text.includes('trader joes') || text.includes('costco') || text.includes('sam')) return 'Groceries';
  if (text.includes('restaurant') || text.includes('mcdonald') || text.includes('starbucks') || text.includes('doordash') || text.includes('uber eats')) return 'Restaurants';

  if (plaidPrimary === 'INCOME') return 'Other Income';
  if (plaidPrimary === 'FOOD_AND_DRINK') {
    if (plaidDetailed && plaidDetailed.includes('GROCERIES')) return 'Groceries';
    return 'Restaurants';
  }
  if (plaidPrimary === 'TRANSPORTATION') return 'Fuel';
  if (plaidPrimary === 'ENTERTAINMENT') return 'Events/Entertain';
  
  return null;
}

function isExcludedTransaction(name, merchantName, plaidPrimary, plaidDetailed) {
  const text = `${name || ''} ${merchantName || ''} ${plaidDetailed || ''}`.toLowerCase();
  
  if (plaidPrimary === 'TRANSFER_OUT' || plaidPrimary === 'TRANSFER_IN') return true;
  if (plaidPrimary === 'LOAN_PAYMENTS' || plaidPrimary === 'CREDIT_CARD_PAYMENT') return true;
  
  if (text.includes('credit card payment') || text.includes('payment to credit card') || text.includes('thank you for your payment') || text.includes('payment thank you') || text.includes('storecrd_pmt')) return true;
  if (text.includes('transfer to') || text.includes('transfer from') || text.includes('internal transfer')) return true;
  
  if (text.includes('withdrawal to') || text.includes('deposit from') || text.includes('360 performance')) return true;
  
  if (text.includes('vanguard') || text.includes('ria money transfer') || text.includes('riamoneytransfer') || text.includes('zelle to')) return true;
  
  return false;
}

const txs = db.prepare('SELECT id, name, merchant_name, category_primary, category_detailed FROM transactions').all();

const updateCustomCategory = db.prepare('UPDATE transactions SET custom_category = ? WHERE id = ?');
const updateExcluded = db.prepare('UPDATE transactions SET excluded = ? WHERE id = ?');

let categoryCount = 0;
let excludeCount = 0;
const runUpdate = db.transaction((transactions) => {
  for (const t of transactions) {
    // 1. Categories
    const custom = autoCategorize(t.name, t.merchant_name, t.category_primary, t.category_detailed);
    if (custom) {
      updateCustomCategory.run(custom, t.id);
      categoryCount++;
    }
    
    // 2. Exclusions (internal transfers, CC payments)
    const excluded = isExcludedTransaction(t.name, t.merchant_name, t.category_primary, t.category_detailed);
    if (excluded) {
      // Drizzle boolean mode stores as 0/1 in better-sqlite3
      updateExcluded.run(1, t.id);
      excludeCount++;
    }
  }
});

runUpdate(txs);
console.log(`Auto-categorized ${categoryCount} existing transactions.`);
console.log(`Auto-excluded ${excludeCount} internal transfers and payments.`);
