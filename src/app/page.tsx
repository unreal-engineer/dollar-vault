import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { CATEGORY_GROUPS } from '@/lib/categories';
import CashFlowSankey from '@/components/CashFlowSankey';
import DashboardControls from '@/components/DashboardControls';

// Next.js config to ensure the dashboard reloads dynamically
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;
  
  // Fetch profiles
  const { profiles } = await import('@/lib/db/schema');
  const allProfiles = await db.select().from(profiles);
  const activeProfile = (searchParams.profile as string) || 'All';

  // Fetch all accounts from DB
  const allAccounts = await db.select().from(accounts);
  const filteredAccounts = activeProfile === 'All' ? allAccounts : allAccounts.filter(acc => acc.owner === activeProfile);
  
  // Calculate net worth
  let netWorth = 0;
  
  filteredAccounts.forEach(acc => {
    const balance = acc.currentBalance || 0;
    
    // Depository (Checking/Savings) and Investment add to net worth
    if (acc.type === 'depository' || acc.type === 'investment') {
      netWorth += balance;
    } 
    // Credit and Loan subtract from net worth (since outstanding balance is positive)
    else if (acc.type === 'credit' || acc.type === 'loan') {
      netWorth -= balance;
    }
  });

  const validAccountIds = new Set(filteredAccounts.map(a => a.id));

  const formattedNetWorth = netWorth.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'USD'
  });

  // Date Parsing Logic for Filters
  const currentDate = new Date();
  const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  let startStr = '';
  let endStr = '';
  let periodLabel = '';
  
  let prevStartStr = '';
  let prevEndStr = '';
  let prevPeriodLabel = '';
  
  if (searchParams.start && searchParams.end) {
    startStr = searchParams.start as string;
    endStr = searchParams.end as string;
    periodLabel = `${startStr} to ${endStr}`;
    
    // Calculate prev period
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diff = e.getTime() - s.getTime();
    
    const pE = new Date(s.getTime() - 86400000);
    const pS = new Date(pE.getTime() - diff);
    
    prevStartStr = pS.toISOString().split('T')[0];
    prevEndStr = pE.toISOString().split('T')[0];
    prevPeriodLabel = `${prevStartStr} to ${prevEndStr}`;
  } else {
    const month = (searchParams.month as string) || defaultMonth;
    startStr = `${month}-01`;
    const [y, m] = month.split('-');
    const end = new Date(parseInt(y), parseInt(m), 0);
    endStr = `${month}-${String(end.getDate()).padStart(2, '0')}`;
    periodLabel = end.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Calculate prev month
    const pE = new Date(parseInt(y), parseInt(m) - 1, 0);
    prevStartStr = `${pE.getFullYear()}-${String(pE.getMonth() + 1).padStart(2, '0')}-01`;
    prevEndStr = `${pE.getFullYear()}-${String(pE.getMonth() + 1).padStart(2, '0')}-${String(pE.getDate()).padStart(2, '0')}`;
    prevPeriodLabel = pE.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  // Calculate Monthly Spending and Net Flow
  const allTransactions = await db.select().from(transactions);
  
  let periodSpending = 0;
  let periodIncome = 0;
  let prevPeriodSpending = 0;
  
  const periodTransactions: any[] = [];

  allTransactions.forEach(tx => {
    if (tx.excluded) return;
    if (!validAccountIds.has(tx.accountId)) return;

    const cat = tx.customCategory || tx.categoryPrimary || 'Uncategorized';
    
    // Current Period
    if (tx.date >= startStr && tx.date <= endStr) {
      periodTransactions.push(tx);
      
      if (tx.amount > 0) {
        if (!CATEGORY_GROUPS.SAVINGS?.includes(cat)) {
          periodSpending += tx.amount;
        }
      } else if (tx.amount < 0) {
        // Income is negative amount in Plaid
        periodIncome += Math.abs(tx.amount);
      }
    }
    
    // Previous Period
    if (tx.date >= prevStartStr && tx.date <= prevEndStr) {
      if (tx.amount > 0 && !CATEGORY_GROUPS.SAVINGS?.includes(cat)) {
        prevPeriodSpending += tx.amount;
      }
    }
  });

  const formattedMonthlySpending = periodSpending.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: 'currency',
    currency: 'USD'
  });

  // Net Worth Delta Calculation (Current Period Flow)
  const netWorthDelta = periodIncome - periodSpending;
  const prevNetWorth = netWorth - netWorthDelta;
  const netWorthDeltaPct = prevNetWorth !== 0 ? (netWorthDelta / Math.abs(prevNetWorth)) * 100 : 0;
  
  const nwSign = netWorthDelta >= 0 ? '+' : '';
  const nwColor = netWorthDelta >= 0 ? 'text-success' : 'text-danger';

  // Spending Delta Calculation
  const spendDelta = periodSpending - prevPeriodSpending;
  const spendDeltaPct = prevPeriodSpending !== 0 ? (spendDelta / prevPeriodSpending) * 100 : 0;
  
  const spSign = spendDelta >= 0 ? '+' : '';
  // For spending, going UP is bad (danger), going DOWN is good (success)
  const spColor = spendDelta > 0 ? 'text-danger' : 'text-success';

  return (
    <div>
      <div className="header mb-6">
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Dashboard</h1>
          <p className="text-muted">Welcome to Dollar Vault</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
          <DashboardControls profiles={allProfiles} activeProfile={activeProfile} />
        </div>
      </div>

      <div className="grid">
        <div className="glass-panel">
          <h3 className="mb-2">Net Worth</h3>
          <p className={`text-gradient ${netWorth < 0 ? 'text-danger' : ''}`} style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {formattedNetWorth}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`font-medium ${nwColor}`}>
              {nwSign}{netWorthDelta.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </span>
            <span className={`text-sm ${nwColor}`}>
              ({nwSign}{netWorthDeltaPct.toFixed(1)}%)
            </span>
            <span className="text-muted text-sm ml-1">in {periodLabel}</span>
          </div>
        </div>
        
        <div className="glass-panel">
          <h3 className="mb-2">{periodLabel} Spending</h3>
          <p className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            {formattedMonthlySpending}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`font-medium ${spColor}`}>
              {spSign}{spendDelta.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
            </span>
            <span className={`text-sm ${spColor}`}>
              ({spSign}{spendDeltaPct.toFixed(1)}%)
            </span>
            <span className="text-muted text-sm ml-1">vs {prevPeriodLabel}</span>
          </div>
        </div>
      </div>

      {periodTransactions.length > 0 ? (
        <div className="glass-panel mt-4" style={{ paddingBottom: '1rem' }}>
          <h3 className="mb-2">Cash Flow Breakdown</h3>
          <p className="text-muted text-sm mb-4">Where your money went during {periodLabel}.</p>
          <CashFlowSankey transactions={periodTransactions} />
        </div>
      ) : (
        <div className="glass-panel mt-4 text-center text-muted py-12">
          No transactions found for {periodLabel}.
        </div>
      )}
    </div>
  );
}
