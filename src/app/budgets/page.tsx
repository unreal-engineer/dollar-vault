'use client';

import { useState, useEffect, useCallback } from 'react';
import { ALL_CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories';

const RECURRING_DUE_DAYS: Record<string, number> = {
  'Mortgage': 1,
  'Sewer': 3,
  'Elec/Water/Trash': 12,
  'Gas': 12,
  'Phone': 17,
  'Subscriptions': 17,
  'Internet': 27,
  'Insurance': 17,
  'Car Loan': 21,
  'Car Wash': 28,
  'Gym': 1,
  'Investments': 10,
  'Student Loans': 13,
  'Life Insurance': 15,
};

function getGroupForCategory(category: string) {
  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    if (categories.includes(category)) return group;
  }
  return 'OTHER';
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Time Period State
  const currentDate = new Date();
  const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState('#6d5dfc');
  const [dueDate, setDueDate] = useState('');

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<string>('');
  const [editDueDay, setEditDueDay] = useState<string>('');
  const [applyToAllMonths, setApplyToAllMonths] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);



  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budgets?month=${selectedMonth}`);
      const data = await res.json();
      if (data.budgets) {
        setBudgets(data.budgets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          plaidCategoryPrimary: category,
          monthlyLimit: limit,
          color,
          dueDate: dueDate || null,
        }),
      });
      if (res.ok) {
        setName('');
        setLimit('');
        setDueDate('');
        setIsModalOpen(false);
        fetchBudgets();
      }
    } catch (err) {
      console.error('Failed to create budget', err);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const scope = applyToAllMonths ? 'all-months' : 'this-month';
      const res = await fetch(`/api/budgets/${id}?month=${selectedMonth}&scope=${scope}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          monthlyLimit: editLimit,
          dueDate: editDueDay || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        setEditDueDay('');
        setApplyToAllMonths(false);
        fetchBudgets();
      }
    } catch (err) {
      console.error('Failed to update budget limit', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditLimit(b.monthlyLimit.toString());
    setEditDueDay(b.dueDate !== null && b.dueDate !== undefined ? b.dueDate.toString() : '');
    setApplyToAllMonths(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLimit('');
    setEditDueDay('');
    setApplyToAllMonths(false);
  };



  // ZBB Calculations
  const plannedIncome = budgets
    .filter(b => CATEGORY_GROUPS.INCOME?.includes(b.plaidCategoryPrimary))
    .reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);

  const plannedOutflows = budgets
    .filter(b => !CATEGORY_GROUPS.INCOME?.includes(b.plaidCategoryPrimary))
    .reduce((acc, b) => acc + (b.monthlyLimit || 0), 0);

  const zbbBuffer = plannedIncome - plannedOutflows;

  const actualIncome = budgets
    .filter(b => CATEGORY_GROUPS.INCOME?.includes(b.plaidCategoryPrimary))
    .reduce((acc, b) => acc + (b.spent || 0), 0);

  const actualOutflows = budgets
    .filter(b => !CATEGORY_GROUPS.INCOME?.includes(b.plaidCategoryPrimary))
    .reduce((acc, b) => acc + (b.spent || 0), 0);

  const netActualFlow = actualIncome - actualOutflows;

  // Group Budgets
  const groupedBudgets = budgets.reduce((acc, b) => {
    const group = getGroupForCategory(b.plaidCategoryPrimary);
    if (!acc[group]) acc[group] = [];
    acc[group].push(b);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      <div className="header mb-6">
        <div>
          <h1 className="text-gradient">Budgets & Goals</h1>
          <p className="text-muted">Manage your cash flow and spending targets.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-end w-full sm:w-auto mobile-stack">
          <div style={{ flex: 1 }}>
            <label className="text-sm text-muted block mb-1">Time Period</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-dark border-color"
              style={{ 
                padding: '0.6rem 1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-dark)', 
                color: 'var(--text-main)', 
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
            + New Budget
          </button>
        </div>
      </div>

      {/* Zero-Based Budgeting (ZBB) Dashboard */}
      {!loading && budgets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {/* ZBB Allocation Status Bar */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '1rem 1.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              borderLeft: zbbBuffer === 0 
                ? '4px solid var(--success)' 
                : zbbBuffer > 0 
                  ? '4px solid var(--warning)' 
                  : '4px solid var(--danger)'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Zero-Based Budget Balance: 
                {zbbBuffer === 0 ? (
                  <span className="text-success" style={{ fontWeight: 700 }}>Balanced! 🎉</span>
                ) : zbbBuffer > 0 ? (
                  <span className="text-warning" style={{ fontWeight: 700 }}>Under-Allocated</span>
                ) : (
                  <span className="text-danger" style={{ fontWeight: 700 }}>Over-Allocated</span>
                )}
              </h3>
              <p className="text-muted text-xs style-none" style={{ margin: '0.25rem 0 0 0' }}>
                {zbbBuffer === 0 
                  ? 'Every single dollar of planned income has been given a job.' 
                  : zbbBuffer > 0 
                    ? `You have $${zbbBuffer.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining from planned income. Assign it to Savings or Expenses!` 
                    : `You have over-allocated planned income by $${Math.abs(zbbBuffer).toLocaleString(undefined, { minimumFractionDigits: 2 })}. Reduce limits to balance.`
                }
              </p>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className={zbbBuffer === 0 ? 'text-success' : zbbBuffer > 0 ? 'text-warning' : 'text-danger'}>
              {zbbBuffer < 0 ? '-' : ''}${Math.abs(zbbBuffer).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Core ZBB Stats Grid */}
          <div 
            className="glass-panel" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '1.5rem',
              padding: '2rem'
            }}
          >
            <div>
              <p className="text-muted text-xs font-semibold tracking-wider uppercase mb-1">Planned Income vs Allocations</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                ${plannedIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-muted text-xs">Allocated: ${plannedOutflows.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
            </div>
            
            <div>
              <p className="text-muted text-xs font-semibold tracking-wider uppercase mb-1">Actual Income Received</p>
              <p className="text-success" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                ${actualIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-muted text-xs">Target: ${plannedIncome.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
            </div>

            <div>
              <p className="text-muted text-xs font-semibold tracking-wider uppercase mb-1">Actual Outflows (Spent/Saved)</p>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                ${actualOutflows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-muted text-xs">Target Limit: ${plannedOutflows.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
            </div>

            <div>
              <p className="text-muted text-xs font-semibold tracking-wider uppercase mb-1">Net Actual Cash Flow</p>
              <p className={netActualFlow < 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {netActualFlow < 0 ? '-' : '+'}${Math.abs(netActualFlow).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-muted text-xs">Net savings rate progress</span>
            </div>
          </div>
        </div>
      )}



      {/* Budgets By Group - Full Width */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {loading ? (
          <div className="glass-panel text-center text-muted">Loading budgets...</div>
        ) : budgets.length === 0 ? (
          <div className="glass-panel text-center text-muted">No budgets created yet. Click "+ New Budget" to add one!</div>
        ) : (
          Object.entries(CATEGORY_GROUPS).map(([groupName, _]) => {
            const groupBudgets = groupedBudgets[groupName];
            if (!groupBudgets || groupBudgets.length === 0) return null;

            const isIncomeGroup = groupName === 'INCOME';
            const groupPlanned = groupBudgets.reduce((acc: number, b: any) => acc + (b.monthlyLimit || 0), 0);
            const groupSpent = groupBudgets.reduce((acc: number, b: any) => acc + (b.spent || 0), 0);

            return (
              <div key={groupName}>
                {/* Group Header */}
                <div className="flex justify-between items-center mb-4" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', letterSpacing: '0.05em' }}>{groupName}</h2>
                  <div className="text-sm font-medium">
                    <span className="text-muted mr-2">{isIncomeGroup ? 'Total Received:' : 'Total Spent:'}</span>
                    <span className={!isIncomeGroup && groupSpent > groupPlanned ? 'text-danger' : isIncomeGroup && groupSpent >= groupPlanned ? 'text-success' : ''}>
                      ${groupSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted mx-1">/</span>
                    <span className="text-muted">${groupPlanned.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* Group Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {groupBudgets.map((b: any) => {
                    const progress = b.monthlyLimit > 0 ? Math.min((b.spent / b.monthlyLimit) * 100, 100) : 0;
                    const isGoalMet = isIncomeGroup ? b.spent >= b.monthlyLimit : false;
                    const isOver = !isIncomeGroup && b.spent >= b.monthlyLimit;

                    // Recurring Due Date / Overdue Logic
                    const dueDay = b.dueDate !== null && b.dueDate !== undefined ? b.dueDate : RECURRING_DUE_DAYS[b.plaidCategoryPrimary];
                    let isOverdue = false;

                    if (dueDay !== undefined) {
                      const [selYear, selMonth] = selectedMonth.split('-').map(Number);
                      const today = new Date();
                      const curYear = today.getFullYear();
                      const curMonth = today.getMonth() + 1;
                      const curDay = today.getDate();

                      const isPastMonth = (selYear < curYear) || (selYear === curYear && selMonth < curMonth);
                      const isCurrentMonth = (selYear === curYear && selMonth === curMonth);
                      const duePassed = isPastMonth || (isCurrentMonth && curDay >= dueDay);

                      isOverdue = duePassed && b.spent === 0;
                    }

                    return (
                      <div 
                        key={b.id} 
                        className="glass-panel hover-glow" 
                        style={{ 
                          padding: '1.5rem',
                          border: isOverdue ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                          boxShadow: isOverdue ? '0 0 15px rgba(239, 68, 68, 0.25)' : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 style={{ margin: 0, color: b.color, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={b.plaidCategoryPrimary}>
                              {b.plaidCategoryPrimary}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-muted text-xs font-medium uppercase tracking-wider">{groupName}</span>
                              {b.isCustomLimit && (
                                <span 
                                  style={{ 
                                    fontSize: '0.65rem', 
                                    background: 'rgba(34, 197, 94, 0.15)', 
                                    color: 'var(--primary-accent)', 
                                    padding: '1px 5px', 
                                    borderRadius: '4px',
                                    fontWeight: 600
                                  }}
                                  title="This limit was customized for this specific month."
                                >
                                  Custom
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Calendar due date indicator */}
                          {dueDay !== undefined && (
                            <div 
                              style={{ 
                                fontSize: '0.75rem', 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem',
                                fontWeight: 600,
                                background: b.spent > 0 
                                  ? 'rgba(34, 197, 94, 0.15)' 
                                  : isOverdue 
                                    ? 'rgba(239, 68, 68, 0.15)' 
                                    : 'rgba(255, 255, 255, 0.05)',
                                color: b.spent > 0 
                                  ? 'var(--success)' 
                                  : isOverdue 
                                    ? 'var(--danger)' 
                                    : 'var(--text-muted)'
                              }}
                              title={
                                b.spent > 0 
                                  ? 'Recurring bill logged successfully!' 
                                  : isOverdue 
                                    ? `Overdue! Was due on the ${dueDay}th.` 
                                    : `Recurring bill due on the ${dueDay}th.`
                              }
                            >
                              {b.spent > 0 ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.85rem', height: '0.85rem' }}>
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                              ) : isOverdue ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.85rem', height: '0.85rem' }}>
                                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.515 2.63H3.72c-1.345 0-2.188-1.463-1.515-2.63l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.85rem', height: '0.85rem' }}>
                                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-2.25 7v6.25c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25V9H3.5z" clipRule="evenodd" />
                                </svg>
                              )}
                              <span>
                                {b.spent > 0 
                                  ? 'Logged' 
                                  : isOverdue 
                                    ? `Overdue (${dueDay}${getOrdinalSuffix(dueDay)})` 
                                    : `Due ${dueDay}${getOrdinalSuffix(dueDay)}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-baseline mb-3">
                          <span className={`font-bold ${isOver ? 'text-danger' : isIncomeGroup && isGoalMet ? 'text-success' : ''}`} style={{ fontSize: '1.5rem' }}>
                            ${b.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-muted text-sm">/</span>
                            {editingId === b.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span className="text-muted text-sm">$</span>
                                  <input 
                                    type="number" 
                                    value={editLimit}
                                    onChange={e => setEditLimit(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveEdit(b.id);
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    autoFocus
                                    style={{ 
                                      width: '75px', 
                                      padding: '0.25rem 0.5rem', 
                                      background: 'rgba(0,0,0,0.2)', 
                                      border: '1px solid var(--primary-accent)', 
                                      color: 'var(--text-main)',
                                      borderRadius: '4px',
                                      fontSize: '0.9rem',
                                      outline: 'none',
                                      boxShadow: '0 0 0 2px rgba(109, 93, 252, 0.2)'
                                    }}
                                  />
                                  <span className="text-muted text-xs ml-1">Due:</span>
                                  <input 
                                    type="number" 
                                    min="1"
                                    max="31"
                                    placeholder="None"
                                    value={editDueDay}
                                    onChange={e => setEditDueDay(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveEdit(b.id);
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    style={{ 
                                      width: '60px', 
                                      padding: '0.25rem 0.5rem', 
                                      background: 'rgba(0,0,0,0.2)', 
                                      border: '1px solid var(--border-color)', 
                                      color: 'var(--text-main)',
                                      borderRadius: '4px',
                                      fontSize: '0.9rem',
                                      outline: 'none',
                                    }}
                                    title="Due day of the month (1-31)"
                                  />
                                  <button 
                                    onClick={() => handleSaveEdit(b.id)} 
                                    disabled={savingEdit}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button 
                                    onClick={cancelEdit} 
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 4px', fontSize: '1.1rem' }}
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={applyToAllMonths}
                                    onChange={(e) => setApplyToAllMonths(e.target.checked)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  Apply to all months
                                </label>
                              </div>
                            ) : (
                              <span 
                                className="text-muted text-sm hover-text-main" 
                                style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border-color)' }}
                                onClick={() => startEdit(b)}
                                title={isIncomeGroup ? "Click to edit target" : "Click to edit limit"}
                              >
                                ${b.monthlyLimit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar Container */}
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${progress}%`, 
                              backgroundColor: isIncomeGroup ? (isGoalMet ? 'var(--success)' : 'var(--primary-accent)') : (isOver ? 'var(--danger)' : b.color),
                              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} 
                          />
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-muted">
                            {progress.toFixed(0)}%
                          </span>
                          {isIncomeGroup ? (
                            isGoalMet ? (
                              <span className="text-success text-xs font-medium">Target Met! 🎉</span>
                            ) : (
                              <span className="text-warning text-xs font-medium">${(b.monthlyLimit - b.spent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} to go</span>
                            )
                          ) : (
                            <>
                              {isOver && <span className="text-danger text-xs font-medium">Limit Exceeded</span>}
                              {!isOver && <span className="text-success text-xs font-medium">${(b.monthlyLimit - b.spent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} left</span>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Budget Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gradient m-0" style={{ fontSize: '1.5rem' }}>Create Budget</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted block mb-1">Budget Name</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-dark text-main border-color" 
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                  placeholder="e.g. Dining Out"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted block mb-1">Bucket Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-dark text-main border-color"
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                >
                  {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                    <optgroup key={groupName} label={groupName}>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted block mb-1">Monthly Limit ($)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  step="0.01"
                  value={limit} 
                  onChange={e => setLimit(e.target.value)} 
                  className="w-full bg-dark text-main border-color" 
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                  placeholder="400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted block mb-1">Due Day (Optional, 1-31)</label>
                <input 
                  type="number" 
                  min="1"
                  max="31"
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                  className="w-full bg-dark text-main border-color" 
                  style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)' }}
                  placeholder="e.g. 15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wider uppercase text-muted block mb-1">Color Marker</label>
                <div style={{ padding: '4px', background: 'var(--bg-dark)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <input 
                    type="color" 
                    value={color} 
                    onChange={e => setColor(e.target.value)}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="glass-button w-full" style={{ padding: '0.75rem' }}>Cancel</button>
                <button type="submit" className="btn-primary w-full" style={{ padding: '0.75rem' }}>Add Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
