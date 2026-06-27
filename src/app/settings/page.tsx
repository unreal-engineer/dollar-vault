'use client';

import React, { useState, useEffect } from 'react';

interface Rule {
  id: string;
  keyword: string;
  category: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      setRules(data);
    } catch (err: any) {
      setError('Failed to load rules.');
    } finally {
      setLoading(false);
    }
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newKeyword || !newCategory) return;

    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword, category: newCategory }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setRules([{ id: data.id, keyword: newKeyword.toLowerCase(), category: newCategory, createdAt: new Date().toISOString() }, ...rules]);
      setNewKeyword('');
      setNewCategory(''); // or leave it so they can add multiple to same category
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      setRules(rules.filter(r => r.id !== id));
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Profiles State
  interface Profile {
    id: string;
    name: string;
    icon: string;
  }
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileIcon, setNewProfileIcon] = useState('👤');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (err) {
      console.error('Failed to load profiles', err);
    }
  };

  const addProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName || !newProfileIcon) return;
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName, icon: newProfileIcon }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfiles([...profiles, data.profile]);
      setNewProfileName('');
      setNewProfileIcon('👤');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete profile');
      setProfiles(profiles.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (rule: Rule) => {
    setEditingRule(rule);
    setEditKeyword(rule.keyword);
    setEditCategory(rule.category);
    setIsModalOpen(true);
  };

  const saveEdit = async () => {
    if (!editingRule) return;
    try {
      const res = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: editKeyword, category: editCategory }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update rule');
      }
      
      setRules(rules.map(r => r.id === editingRule.id ? { ...r, keyword: editKeyword.toLowerCase(), category: editCategory } : r));
      setIsModalOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group rules by category
  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedRules).sort((a, b) => a.localeCompare(b));

  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">System Settings</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Manage your auto-categorization intelligence.</p>
        </div>
      </header>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Profiles Management */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Household Profiles
        </h2>
        <p className="text-muted text-sm mb-4">Define personas to tag accounts and track who earned or spent what.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {profiles.map(profile => (
            <div key={profile.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{profile.icon}</span>
                <span className="font-medium text-main">{profile.name}</span>
              </div>
              <button onClick={() => deleteProfile(profile.id)} className="text-danger" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete profile">
                ✕
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addProfile} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Profile Name</label>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="e.g. 'Hari' or 'Joint'"
              className="glass-panel"
              style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)' }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '120px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Icon (Emoji)</label>
            <input
              type="text"
              value={newProfileIcon}
              onChange={(e) => setNewProfileIcon(e.target.value)}
              className="glass-panel"
              style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', textAlign: 'center' }}
              required
            />
          </div>
          <button type="submit" className="glass-button" style={{ height: '46px', padding: '0 1.5rem', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 500 }}>
            Add Profile
          </button>
        </form>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2rem 0' }} />

      {/* Global Add Rule Form */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          Auto-Categorization Rules
        </h2>
        <p className="text-muted text-sm mb-4">Map transactions automatically based on keywords.</p>
        
        <form onSubmit={addRule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Target Category Bucket</label>
            <input
              type="text"
              list="category-suggestions"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. 'Restaurants'"
              className="glass-panel"
              style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)' }}
              required
            />
            <datalist id="category-suggestions">
              {sortedCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Transaction Keyword Match</label>
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. 'starbucks'"
              className="glass-panel"
              style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)' }}
              required
            />
          </div>
          <button type="submit" className="glass-button" style={{ height: '46px', padding: '0 2rem', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 500 }}>
            Add Rule
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading rules engine...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {sortedCategories.map((category) => (
            <div key={category} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{category}</h3>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '12px', color: 'var(--text-muted)' }}>
                  {groupedRules[category].length} Rules
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {groupedRules[category].map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => openEditModal(rule)}
                    style={{
                      background: 'rgba(109, 93, 252, 0.1)',
                      border: '1px solid rgba(109, 93, 252, 0.2)',
                      color: 'var(--primary)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '99px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(109, 93, 252, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(109, 93, 252, 0.1)';
                    }}
                  >
                    {rule.keyword}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingRule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem', marginTop: 0 }}>
              Edit Rule
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Category</label>
                <input
                  type="text"
                  list="modal-category-suggestions"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="glass-panel"
                  style={{ padding: '0.75rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)' }}
                />
                <datalist id="modal-category-suggestions">
                  {sortedCategories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Keyword</label>
                <input
                  type="text"
                  value={editKeyword}
                  onChange={(e) => setEditKeyword(e.target.value)}
                  className="glass-panel"
                  style={{ padding: '0.75rem', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => deleteRule(editingRule.id)}
                className="glass-button" 
                style={{ padding: '0.6rem 1rem', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', background: 'transparent' }}
              >
                Delete Rule
              </button>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="glass-button" 
                  style={{ padding: '0.6rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', background: 'transparent' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={saveEdit}
                  className="glass-button" 
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.875rem', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 500 }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
