'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { CATEGORY_GROUPS, ALL_CATEGORIES } from '@/lib/categories';

interface Transaction {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  accountName: string;
  accountOwner?: string;
  ownerIcon?: string;
  accountId: string;
  amount: number;
  categoryPrimary: string | null;
  customCategory: string | null;
  notes: string | null;
  excluded: boolean;
  pending: boolean;
}

interface Account {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Inline editing — tracks which row is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    customCategory: string;
    notes: string;
    excluded: boolean;
  }>({ customCategory: '', notes: '', excluded: false });
  const [saving, setSaving] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (accountId) params.set('account', accountId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, accountId, startDate, endDate]);

  // Load accounts for the filter dropdown
  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          const allAccounts: Account[] = data.items.flatMap(
            (item: { accounts: Account[] }) => item.accounts,
          );
          setAccounts(allAccounts);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditFields({
      customCategory: tx.customCategory || '',
      notes: tx.notes || '',
      excluded: tx.excluded,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      if (res.ok) {
        setEditingId(null);
        fetchTransactions();
      }
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-dark)',
    color: 'var(--text-main)',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    width: '100%',
  };

  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (accountId) params.set('account', accountId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    const url = `/api/export?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  return (
    <div>
      <div className="header" style={{ position: 'relative' }}>
        <div>
          <h1 className="text-gradient">Transactions</h1>
          <p className="text-muted">View and manage your recent activity.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            disabled={transactions.length === 0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export Data
            <svg style={{ transform: exportDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', width: '12px', height: '12px' }} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          
          {exportDropdownOpen && (
            <>
              <div 
                onClick={() => setExportDropdownOpen(false)} 
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
              />
              <div 
                className="glass-panel" 
                style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: 'calc(100% + 8px)', 
                  zIndex: 20, 
                  padding: '8px', 
                  minWidth: '150px',
                  boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <button
                  onClick={() => handleExport('csv')}
                  className="btn-secondary"
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    padding: '8px 12px', 
                    width: '100%', 
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    color: 'var(--text-main)'
                  }}
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="btn-secondary"
                  style={{ 
                    border: 'none', 
                    background: 'transparent', 
                    padding: '8px 12px', 
                    width: '100%', 
                    textAlign: 'left',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    color: 'var(--text-main)'
                  }}
                >
                  Download JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}
      >
        <div>
          <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
            Search
          </label>
          <input
            type="text"
            placeholder="Merchant or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
              <optgroup key={groupName} label={groupName}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
            Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={inputStyle}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          onClick={() => {
            setSearch('');
            setCategory('');
            setAccountId('');
            setStartDate('');
            setEndDate('');
          }}
          className="btn-secondary text-sm"
          style={{ alignSelf: 'end' }}
        >
          Clear
        </button>
      </div>

      {/* Transaction Table */}
      <div className="glass-panel" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }} className="text-muted">
            Loading transactions…
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <h3 className="mb-2">No Transactions Found</h3>
            <p className="text-muted">
              {search || category || accountId || startDate || endDate
                ? 'No transactions match your filters. Try adjusting or clearing them.'
                : 'Click "Sync Now" in the navigation bar to fetch your latest transactions from Plaid.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--glass-bg)',
                  }}
                >
                  <th className="col-nowrap" style={{ fontWeight: 600, width: '100px', minWidth: '100px' }}>Date</th>
                  <th className="col-nowrap" style={{ fontWeight: 600, width: '140px', minWidth: '140px' }}>Account</th>
                  <th className="col-wrap" style={{ fontWeight: 600, minWidth: '250px' }}>Name</th>
                  <th className="col-nowrap" style={{ fontWeight: 600, width: '140px', minWidth: '140px' }}>Category</th>
                  <th className="col-nowrap" style={{ fontWeight: 600, textAlign: 'right', width: '100px', minWidth: '100px' }}>
                    Amount
                  </th>
                  <th className="col-nowrap" style={{ fontWeight: 600, textAlign: 'center', width: '80px', minWidth: '80px' }}>
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom:
                          editingId === tx.id
                            ? 'none'
                            : '1px solid var(--border-color)',
                        opacity: tx.excluded ? 0.45 : 1,
                      }}
                    >
                      <td className="col-nowrap">{tx.date}</td>
                      <td className="text-muted col-nowrap">
                        <span style={{ marginRight: '6px' }} title={tx.accountOwner || 'Joint'}>{tx.ownerIcon || '👥'}</span>
                        {tx.accountName}
                      </td>
                      <td className="col-wrap">
                        <div>{tx.merchantName || tx.name}</div>
                        {tx.pending && (
                          <span
                            className="text-sm text-warning"
                            style={{ display: 'block' }}
                          >
                            Pending
                          </span>
                        )}
                        {tx.excluded && (
                          <span
                            className="text-sm text-muted"
                            style={{ display: 'block' }}
                          >
                            Excluded from budgets
                          </span>
                        )}
                        {tx.notes && (
                          <span
                            className="text-sm text-muted"
                            style={{ display: 'block', fontStyle: 'italic' }}
                          >
                            {tx.notes}
                          </span>
                        )}
                      </td>
                      <td className="col-nowrap">
                        {tx.customCategory ? (
                          <span style={{ color: 'var(--primary-accent)' }}>
                            {tx.customCategory}
                          </span>
                        ) : (
                          <span className="text-muted">
                            {tx.categoryPrimary?.replace(/_/g, ' ') || '—'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{ textAlign: 'right' }}
                        className={`font-medium col-nowrap ${tx.amount > 0 ? '' : 'text-success'}`}
                      >
                        {tx.amount > 0 ? '-' : '+'}$
                        {Math.abs(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="col-nowrap" style={{ textAlign: 'center' }}>
                        <button
                          onClick={() =>
                            editingId === tx.id ? cancelEdit() : startEdit(tx)
                          }
                          className="btn-secondary text-sm"
                          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                          {editingId === tx.id ? 'Cancel' : 'Edit'}
                        </button>
                      </td>
                    </tr>

                    {/* Inline edit panel */}
                    {editingId === tx.id && (
                      <tr
                        key={`${tx.id}-edit`}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td colSpan={6} style={{ padding: '0.75rem 1rem 1.25rem' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr auto auto',
                              gap: '0.75rem',
                              alignItems: 'end',
                              background: 'var(--glass-bg)',
                              padding: '1rem',
                              borderRadius: '8px',
                            }}
                          >
                            <div>
                              <label
                                className="text-sm text-muted"
                                style={{ display: 'block', marginBottom: '4px' }}
                              >
                                Custom Category
                              </label>
                              <select
                                value={editFields.customCategory}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    customCategory: e.target.value,
                                  }))
                                }
                                style={inputStyle}
                              >
                                <option value="">(None - Use Plaid Default)</option>
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
                              <label
                                className="text-sm text-muted"
                                style={{ display: 'block', marginBottom: '4px' }}
                              >
                                Notes
                              </label>
                              <input
                                type="text"
                                placeholder="Optional note…"
                                value={editFields.notes}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    notes: e.target.value,
                                  }))
                                }
                                style={inputStyle}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '2px' }}>
                              <input
                                id={`exclude-${tx.id}`}
                                type="checkbox"
                                checked={editFields.excluded}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    excluded: e.target.checked,
                                  }))
                                }
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                              <label
                                htmlFor={`exclude-${tx.id}`}
                                className="text-sm text-muted"
                                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Exclude from budgets
                              </label>
                            </div>
                            <button
                              onClick={() => saveEdit(tx.id)}
                              disabled={saving}
                              className="btn-primary text-sm"
                              style={{ padding: '8px 16px' }}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            <div
              className="text-muted text-sm"
              style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)' }}
            >
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
