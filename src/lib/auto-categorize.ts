export function autoCategorize(
  name: string | null, 
  merchantName: string | null, 
  plaidPrimary: string | null, 
  plaidDetailed: string | null,
  rules: { keyword: string; category: string }[] = []
): string | null {
  const text = `${name || ''} ${merchantName || ''} ${plaidDetailed || ''}`.toLowerCase();

  // Dynamic Merchant / Keyword Rules
  for (const rule of rules) {
    if (text.includes(rule.keyword.toLowerCase())) {
      return rule.category;
    }
  }

  // Plaid Category Fallbacks
  if (plaidPrimary === 'INCOME') return 'Other Income';
  if (plaidPrimary === 'FOOD_AND_DRINK') {
    if (plaidDetailed && plaidDetailed.includes('GROCERIES')) return 'Groceries';
    return 'Restaurants';
  }
  if (plaidPrimary === 'TRANSPORTATION') return 'Fuel';
  if (plaidPrimary === 'ENTERTAINMENT') return 'Events/Entertain';

  return null;
}

export function isExcludedTransaction(name: string | null, merchantName: string | null, plaidPrimary: string | null, plaidDetailed: string | null): boolean {
  const text = `${name || ''} ${merchantName || ''} ${plaidDetailed || ''}`.toLowerCase();

  // Plaid categorization
  if (plaidPrimary === 'TRANSFER_OUT' || plaidPrimary === 'TRANSFER_IN') return true;
  if (plaidPrimary === 'LOAN_PAYMENTS' || plaidPrimary === 'CREDIT_CARD_PAYMENT') return true;

  // Keyword fallbacks for credit cards and internal account transfers
  if (text.includes('credit card payment') || text.includes('payment to credit card') || text.includes('thank you for your payment') || text.includes('payment thank you') || text.includes('storecrd_pmt')) return true;
  if (text.includes('transfer to') || text.includes('transfer from') || text.includes('internal transfer')) return true;
  
  // Specific fallbacks for Capital One transfers
  if (text.includes('withdrawal to') || text.includes('deposit from') || text.includes('360 performance')) return true;

  // External missing exclusions
  if (text.includes('vanguard') || text.includes('ria money transfer') || text.includes('riamoneytransfer') || text.includes('zelle to')) return true;

  return false;
}
