'use client';

import { useState, useEffect } from 'react';

interface RecurringTx {
  id: string;
  accountId: string;
  accountName: string;
  merchantName: string | null;
  description: string | null;
  amountAverage: number;
  amountLast: number;
  frequency: string;
  isActive: boolean;
  isIncome: boolean;
  nextExpectedDate: string | null;
  lastDate: string | null;
}

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // State for selected subscriptions to cancel
  const [selectedToCancel, setSelectedToCancel] = useState<Set<string>>(new Set());
  
  // State for calendar month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/recurring');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to load recurring transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/recurring/sync', { method: 'POST' });
      if (res.ok) {
        await fetchRecurring();
      }
    } catch (err) {
      console.error('Failed to sync', err);
    } finally {
      setSyncing(false);
    }
  };

  const activeInflows = items.filter(i => i.isIncome && i.isActive);
  const activeOutflows = items.filter(i => !i.isIncome && i.isActive);

  const totalInflow = activeInflows.reduce((sum, i) => sum + (i.amountAverage || 0), 0);
  const totalOutflow = activeOutflows.reduce((sum, i) => sum + (i.amountAverage || 0), 0);
  const netCashFlow = totalInflow - totalOutflow;

  const formatCurrency = (val: number) => val.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  // Get annualized savings multiplier
  const getAnnualMultiplier = (frequency: string) => {
    const freq = (frequency || '').toLowerCase();
    if (freq === 'weekly') return 52;
    if (freq === 'biweekly' || freq === 'bi-weekly') return 26;
    if (freq === 'semi-monthly' || freq === 'semi_monthly') return 24;
    if (freq === 'monthly') return 12;
    if (freq === 'yearly' || freq === 'annual') return 1;
    return 12; // default to monthly
  };

  const getAnnualizedSavings = (tx: RecurringTx) => {
    const mult = getAnnualMultiplier(tx.frequency);
    return tx.amountAverage * mult;
  };

  // Sort outflows by highest annual cost first
  const sortedOutflows = [...activeOutflows].sort((a, b) => {
    return getAnnualizedSavings(b) - getAnnualizedSavings(a);
  });

  const toggleSelectToCancel = (id: string) => {
    const next = new Set(selectedToCancel);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedToCancel(next);
  };

  // Calculate potential savings
  const potentialSavings = Array.from(selectedToCancel).reduce((sum, id) => {
    const tx = activeOutflows.find(i => i.id === id);
    return sum + (tx ? getAnnualizedSavings(tx) : 0);
  }, 0);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to project dates in target month
  const getDaysInMonthForTransaction = (tx: RecurringTx, yearNum: number, monthNum: number): number[] => {
    const days: number[] = [];
    
    // If nextExpectedDate is present and matches the target month/year, add it
    if (tx.nextExpectedDate) {
      const nextDate = new Date(tx.nextExpectedDate + 'T12:00:00');
      if (nextDate.getFullYear() === yearNum && nextDate.getMonth() === monthNum) {
        days.push(nextDate.getDate());
      }
    }
    
    // Fallback projection based on lastDate + frequency
    const lastDateStr = tx.nextExpectedDate || tx.lastDate;
    if (!lastDateStr) return days;
    
    const startDate = new Date(lastDateStr + 'T12:00:00');
    const targetMonthStart = new Date(yearNum, monthNum, 1, 12, 0, 0);
    const targetMonthEnd = new Date(yearNum, monthNum + 1, 0, 12, 0, 0);
    
    if (startDate > targetMonthEnd) return days;
    
    let current = new Date(startDate);
    const freq = (tx.frequency || 'monthly').toLowerCase();
    
    // Safety check to prevent infinite loop
    let safety = 0;
    while (current < targetMonthStart && safety < 1000) {
      safety++;
      if (freq === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (freq === 'biweekly' || freq === 'bi-weekly') {
        current.setDate(current.getDate() + 14);
      } else if (freq === 'semi-monthly' || freq === 'semi_monthly') {
        current.setDate(current.getDate() + 15);
      } else if (freq === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (freq === 'yearly' || freq === 'annual') {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    safety = 0;
    while (current >= targetMonthStart && current <= targetMonthEnd && safety < 10) {
      safety++;
      const dayNum = current.getDate();
      if (!days.includes(dayNum)) {
        days.push(dayNum);
      }
      
      if (freq === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else if (freq === 'biweekly' || freq === 'bi-weekly') {
        current.setDate(current.getDate() + 14);
      } else if (freq === 'semi-monthly' || freq === 'semi_monthly') {
        current.setDate(current.getDate() + 15);
      } else if (freq === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (freq === 'yearly' || freq === 'annual') {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return days;
  };

  // Build the array of calendar cells
  const getCalendarDays = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 6 = Sat
    
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const cells = [];
    
    // Previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Next month's trailing days (to fill 6 rows = 42 cells)
    const totalCells = 42;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return cells;
  };

  const calendarDays = getCalendarDays();
  const today = new Date();

  // Get transactions for a specific date cell
  const getTransactionsForDate = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    
    const dayNum = date.getDate();
    const result: { tx: RecurringTx; type: 'income' | 'bill' }[] = [];
    
    activeInflows.forEach(tx => {
      const days = getDaysInMonthForTransaction(tx, year, month);
      if (days.includes(dayNum)) {
        result.push({ tx, type: 'income' });
      }
    });
    
    activeOutflows.forEach(tx => {
      const days = getDaysInMonthForTransaction(tx, year, month);
      if (days.includes(dayNum)) {
        result.push({ tx, type: 'bill' });
      }
    });
    
    return result;
  };

  // Get all occurrences in this month for mobile view, sorted by day
  const getMonthOccurrences = () => {
    const list: { day: number; tx: RecurringTx; type: 'income' | 'bill' }[] = [];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      activeInflows.forEach(tx => {
        const days = getDaysInMonthForTransaction(tx, year, month);
        if (days.includes(d)) {
          list.push({ day: d, tx, type: 'income' });
        }
      });
      activeOutflows.forEach(tx => {
        const days = getDaysInMonthForTransaction(tx, year, month);
        if (days.includes(d)) {
          list.push({ day: d, tx, type: 'bill' });
        }
      });
    }
    
    return list.sort((a, b) => a.day - b.day);
  };

  const monthOccurrences = getMonthOccurrences();

  if (loading) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
        Loading recurring transactions dashboard…
      </div>
    );
  }

  return (
    <div>
      <div className="header flex justify-between items-center">
        <div>
          <h1 className="text-gradient">Recurring & Forecasting</h1>
          <p className="text-muted">Track subscriptions, bills, and project your cash flow.</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-primary">
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} style={{ marginRight: '6px', width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
          {syncing ? 'Scanning...' : 'Scan for Recurring Transactions'}
        </button>
      </div>

      {/* 4-Card Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 className="mb-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Inflows (Monthly)</h3>
          <p className="text-success" style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {formatCurrency(totalInflow)}
          </p>
        </div>
        
        <div className="glass-panel">
          <h3 className="mb-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Outflows (Monthly)</h3>
          <p className="text-danger" style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {formatCurrency(totalOutflow)}
          </p>
        </div>

        <div className="glass-panel">
          <h3 className="mb-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Net Cash Flow</h3>
          <p className={`text-gradient ${netCashFlow < 0 ? 'text-danger' : ''}`} style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {formatCurrency(netCashFlow)}
          </p>
        </div>

        <div className="glass-panel" style={{ border: potentialSavings > 0 ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid var(--border-color)' }}>
          <h3 className="mb-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cancellation Savings (Annual)</h3>
          <p className={potentialSavings > 0 ? 'text-success animate-pulse' : 'text-muted'} style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formatCurrency(potentialSavings)}
          </p>
          {potentialSavings > 0 ? (
            <span className="text-sm text-success" style={{ display: 'block', marginTop: '4px' }}>
              Save {formatCurrency(potentialSavings / 12)}/mo if cancelled
            </span>
          ) : (
            <span className="text-sm text-muted" style={{ display: 'block', marginTop: '4px' }}>
              Select subscriptions below to calculate savings
            </span>
          )}
        </div>
      </div>

      {/* Bill & Subscription Cards */}
      <h2 className="mb-4">Bills & Subscriptions Tracker</h2>
      {sortedOutflows.length === 0 ? (
        <div className="glass-panel mb-8" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p className="text-muted">No recurring bills or subscriptions detected.</p>
        </div>
      ) : (
        <div className="subscription-grid">
          {sortedOutflows.map(item => {
            const isSelected = selectedToCancel.has(item.id);
            const annualSavings = getAnnualizedSavings(item);
            
            return (
              <div 
                key={item.id} 
                className={`subscription-card ${isSelected ? 'selected-to-cancel' : ''}`}
                onClick={() => toggleSelectToCancel(item.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.merchantName || item.description || 'Subscription'}
                    </h3>
                    <span className="text-muted text-xs">{item.accountName}</span>
                  </div>
                  <div className="cancel-savings-badge">
                    Save {formatCurrency(annualSavings)}/yr
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                  <div>
                    <span className="text-muted text-xs" style={{ display: 'block', textTransform: 'uppercase' }}>Frequency</span>
                    <span className="font-medium text-sm" style={{ textTransform: 'capitalize' }}>
                      {item.frequency ? item.frequency.replace(/_/g, ' ') : 'Monthly'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="text-muted text-xs" style={{ display: 'block', textTransform: 'uppercase' }}>Average Cost</span>
                    <span className="font-bold text-danger" style={{ fontSize: '1.2rem' }}>
                      -{formatCurrency(item.amountAverage)}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-xs text-muted">
                    Next bill: {item.nextExpectedDate || (item.lastDate ? 'Estimated' : 'Unknown')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      id={`cancel-${item.id}`}
                      checked={isSelected}
                      onChange={() => toggleSelectToCancel(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <label htmlFor={`cancel-${item.id}`} style={{ cursor: 'pointer', fontSize: '0.85rem', color: isSelected ? '#ff6b6b' : 'var(--text-muted)' }}>
                      {isSelected ? 'Selected to Cancel' : 'Consider Cancel'}
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill & Subscription Calendar */}
      <div className="calendar-container">
        <div className="calendar-header">
          <div>
            <h2 style={{ marginBottom: '4px' }}>Bill Calendar</h2>
            <p className="text-muted text-sm">Visualize your cash flow schedule for the month.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleToday} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.875rem' }}>
              Today
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={handlePrevMonth} className="calendar-nav-btn" aria-label="Previous Month">
                <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span style={{ minWidth: '130px', textAlign: 'center', fontWeight: 600, fontFamily: 'Fira Code, monospace', fontSize: '0.95rem' }}>
                {monthNames[month]} {year}
              </span>
              <button onClick={handleNextMonth} className="calendar-nav-btn" aria-label="Next Month">
                <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Calendar Grid */}
        <div className="desktop-only">
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
              <div key={dayName} className="calendar-day-label">
                {dayName}
              </div>
            ))}
            
            {calendarDays.map((cell, idx) => {
              const dateTransactions = getTransactionsForDate(cell.date, cell.isCurrentMonth);
              const isToday = cell.isCurrentMonth && 
                              cell.day === today.getDate() && 
                              month === today.getMonth() && 
                              year === today.getFullYear();
              
              return (
                <div 
                  key={idx} 
                  className={`calendar-cell ${!cell.isCurrentMonth ? 'calendar-cell-other-month' : ''} ${isToday ? 'calendar-cell-today' : ''}`}
                >
                  <span className="calendar-cell-number">{cell.day}</span>
                  <div className="calendar-pills-container">
                    {dateTransactions.map(({ tx, type }) => (
                      <div 
                        key={tx.id} 
                        className={`calendar-pill ${type}`}
                        title={`${tx.merchantName || tx.description || 'Transaction'}: ${formatCurrency(tx.amountAverage)} (${tx.frequency})`}
                      >
                        {type === 'income' ? '+' : '-'}{formatCurrency(tx.amountAverage)} {tx.merchantName || tx.description}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Calendar List View */}
        <div className="mobile-only">
          <div className="calendar-list-view">
            {monthOccurrences.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
                No bills or income expected for this month.
              </div>
            ) : (
              monthOccurrences.map(({ day, tx, type }) => (
                <div key={`${tx.id}-${day}`} className="calendar-list-item">
                  <div>
                    <span style={{ 
                      background: type === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: type === 'income' ? 'var(--success)' : '#ff6b6b',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginRight: '8px',
                      display: 'inline-block'
                    }}>
                      {monthNames[month].substring(0, 3)} {day}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {tx.merchantName || tx.description}
                    </span>
                    <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                      {tx.accountName} • <span style={{ textTransform: 'capitalize' }}>{tx.frequency ? tx.frequency.replace(/_/g, ' ') : 'Monthly'}</span>
                    </div>
                  </div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: type === 'income' ? 'var(--success)' : '#ff6b6b'
                  }}>
                    {type === 'income' ? '+' : '-'}{formatCurrency(tx.amountAverage)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Income Streams Section */}
      <h2 className="mb-4" style={{ marginTop: '2.5rem' }}>Recurring Income Streams</h2>
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', marginBottom: '2.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', backgroundColor: 'var(--glass-bg)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Account</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Frequency</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Next Expected</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Avg Amount</th>
            </tr>
          </thead>
          <tbody>
            {activeInflows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recurring income detected.
                </td>
              </tr>
            ) : (
              activeInflows.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    {item.merchantName || item.description}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                    {item.accountName}
                  </td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                    {item.frequency ? item.frequency.replace(/_/g, ' ') : 'Monthly'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {item.nextExpectedDate || 'Estimated'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                    +{formatCurrency(item.amountAverage)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
