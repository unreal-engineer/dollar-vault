'use client';

import { useState, useEffect, useRef } from 'react';
import PlaidLinkComponent from '@/components/PlaidLink';

export default function AccountsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setLoading(false);
    }
  };

  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAccounts();
    
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        if (data.profiles) setProfiles(data.profiles);
      })
      .catch(err => console.error('Failed to load profiles', err));
  }, []);

  const handleUnlink = async (itemId: string) => {
    if (!confirm('Are you sure you want to unlink this institution?')) return;
    
    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (err) {
      console.error('Failed to unlink', err);
    }
  };

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOwner, setEditOwner] = useState('Joint');

  const handleEditClick = (acc: any) => {
    setEditingAccountId(acc.id);
    setEditName(acc.customName || acc.name);
    setEditOwner(acc.owner || 'Joint');
  };

  const handleSaveEdit = async (accountId: string) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: editName, owner: editOwner }),
      });
      if (res.ok) {
        fetchAccounts();
        setEditingAccountId(null);
      } else {
        console.error('Failed to update account name');
      }
    } catch (err) {
      console.error('Failed to update account name', err);
    }
  };

  const getOwnerIcon = (ownerName: string) => {
    const profile = profiles.find(p => p.name === ownerName);
    return profile ? profile.icon : '👥';
  };

  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient">Linked Accounts</h1>
          <p className="text-muted">Manage your financial institutions</p>
        </div>
        <PlaidLinkComponent onSuccess={fetchAccounts} />
      </div>

      {loading ? (
        <p>Loading accounts...</p>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h3 className="mb-2">No Accounts Linked</h3>
          <p className="text-muted mb-4">Connect your first bank account to start tracking your budget.</p>
        </div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <div key={item.id} className="glass-panel">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ margin: 0 }}>{item.institutionName}</h3>
                <button 
                  onClick={() => handleUnlink(item.id)}
                  className="btn-danger text-sm"
                >
                  Unlink
                </button>
              </div>
              
              {item.accounts?.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {item.accounts.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between items-center" style={{ padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
                      {editingAccountId === acc.id ? (
                        <div className="flex flex-wrap gap-2 w-full pr-4">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="glass-panel"
                            style={{ padding: '0.4rem 0.75rem', width: '100%', fontSize: '0.875rem' }}
                            placeholder={acc.name}
                            autoFocus
                          />
                          <select 
                            value={editOwner} 
                            onChange={(e) => setEditOwner(e.target.value)}
                            className="glass-panel"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', background: 'transparent' }}
                          >
                            {profiles.map(p => (
                              <option key={p.id} value={p.name}>{p.name} {p.icon}</option>
                            ))}
                          </select>
                          <button onClick={() => handleSaveEdit(acc.id)} className="glass-button text-sm" style={{ padding: '0 1rem', background: 'var(--primary)', color: '#fff', border: 'none' }}>Save</button>
                          <button onClick={() => setEditingAccountId(null)} className="glass-button text-sm" style={{ padding: '0 1rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleEditClick(acc)} title="Click to edit">
                            <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span title={`Owner: ${acc.owner || 'Joint'}`}>{getOwnerIcon(acc.owner)}</span>
                              {acc.customName || acc.name}
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>✎</span>
                            </div>
                            <div className="text-muted text-sm">{acc.subtype} •••• {acc.mask}</div>
                          </div>
                          <div className="font-medium">
                            ${acc.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm">No accounts found for this institution.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
