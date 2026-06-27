import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  plaidItemId: text('plaid_item_id').unique().notNull(),
  plaidAccessToken: text('plaid_access_token').notNull(),
  institutionId: text('institution_id'),
  institutionName: text('institution_name'),
  status: text('status').default('active'),
  errorCode: text('error_code'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  plaidAccountId: text('plaid_account_id').unique().notNull(),
  itemId: text('item_id').notNull().references(() => items.id),
  name: text('name').notNull(),
  customName: text('custom_name'),
  officialName: text('official_name'),
  type: text('type').notNull(),
  subtype: text('subtype'),
  mask: text('mask'),
  currentBalance: real('current_balance'),
  availableBalance: real('available_balance'),
  isoCurrencyCode: text('iso_currency_code').default('USD'),
  balanceUpdatedAt: text('balance_updated_at'),
  owner: text('owner').default('Joint'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  plaidTransactionId: text('plaid_transaction_id').unique().notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  datetime: text('datetime'),
  name: text('name').notNull(),
  merchantName: text('merchant_name'),
  pending: integer('pending', { mode: 'boolean' }).default(false),
  categoryPrimary: text('category_primary'),
  categoryDetailed: text('category_detailed'),
  categoryConfidence: text('category_confidence'),
  paymentChannel: text('payment_channel'),
  isoCurrencyCode: text('iso_currency_code').default('USD'),
  customCategory: text('custom_category'),
  notes: text('notes'),
  excluded: integer('excluded', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const syncCursors = sqliteTable('sync_cursors', {
  itemId: text('item_id').primaryKey().references(() => items.id),
  cursor: text('cursor').notNull(),
  lastSyncedAt: text('last_synced_at').default(sql`CURRENT_TIMESTAMP`),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plaidCategoryPrimary: text('plaid_category_primary'),
  plaidCategoryDetailed: text('plaid_category_detailed'),
  monthlyLimit: real('monthly_limit').notNull(),
  color: text('color'),
  icon: text('icon'),
  active: integer('active', { mode: 'boolean' }).default(true),
  dueDate: integer('due_date'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const budgetSnapshots = sqliteTable('budget_snapshots', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id').references(() => budgets.id),
  month: text('month').notNull(),
  spent: real('spent').default(0),
  limitAmount: real('limit_amount').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  unq: uniqueIndex('budget_snapshots_budget_month_unq').on(table.budgetId, table.month)
}));

export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: text('id').primaryKey(),
  plaidStreamId: text('plaid_stream_id').unique(),
  accountId: text('account_id').references(() => accounts.id),
  merchantName: text('merchant_name'),
  description: text('description'),
  amountAverage: real('amount_average'),
  amountLast: real('amount_last'),
  frequency: text('frequency'),
  categoryPrimary: text('category_primary'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isIncome: integer('is_income', { mode: 'boolean' }).default(false),
  lastDate: text('last_date'),
  nextExpectedDate: text('next_expected_date'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const categoryRules = sqliteTable('category_rules', {
  id: text('id').primaryKey(),
  keyword: text('keyword').notNull().unique(),
  category: text('category').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
