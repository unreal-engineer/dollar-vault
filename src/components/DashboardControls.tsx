'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DashboardControls({ profiles = [], activeProfile = 'All' }: { profiles?: any[], activeProfile?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentMonthParam = searchParams.get('month');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  
  const currentDate = new Date();
  const defaultMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const [mode, setMode] = useState<'month' | 'custom'>(
    startParam && endParam ? 'custom' : 'month'
  );
  
  const [month, setMonth] = useState(currentMonthParam || defaultMonth);
  const [start, setStart] = useState(startParam || '');
  const [end, setEnd] = useState(endParam || '');
  const [profile, setProfile] = useState(activeProfile);

  const applyChanges = (newMode: 'month' | 'custom', newMonth: string, newStart: string, newEnd: string, newProfile: string) => {
    let url = `/?profile=${encodeURIComponent(newProfile)}`;
    if (newMode === 'month') {
      url += `&month=${newMonth}`;
    } else {
      if (newStart && newEnd) {
        url += `&start=${newStart}&end=${newEnd}`;
      }
    }
    router.push(url);
  };

  const handleModeChange = (newMode: 'month' | 'custom') => {
    setMode(newMode);
    applyChanges(newMode, month, start, end, profile);
  };

  return (
    <div className="flex gap-4 items-center bg-card" style={{ background: 'var(--glass-bg)', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      {profiles.length > 0 && (
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700" style={{ borderRightColor: 'var(--border-color)' }}>
          <select
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value);
              applyChanges(mode, month, start, end, e.target.value);
            }}
            style={{ 
              background: 'var(--bg-dark)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px', 
              padding: '4px 12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Profiles 🌍</option>
            {profiles.map(p => (
              <option key={p.id} value={p.name}>{p.name} {p.icon}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button 
          onClick={() => handleModeChange('month')}
          className={`btn-secondary ${mode === 'month' ? 'btn-primary' : ''}`}
          style={{ padding: '4px 12px', fontSize: '0.85rem' }}
        >
          By Month
        </button>
        <button 
          onClick={() => handleModeChange('custom')}
          className={`btn-secondary ${mode === 'custom' ? 'btn-primary' : ''}`}
          style={{ padding: '4px 12px', fontSize: '0.85rem' }}
        >
          Custom Range
        </button>
      </div>

      <div className="h-6" style={{ width: '1px', background: 'var(--border-color)' }}></div>

      {mode === 'month' ? (
        <input 
          type="month" 
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            applyChanges('month', e.target.value, start, end, profile);
          }}
          style={{ 
            background: 'var(--bg-dark)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '6px', 
            padding: '4px 12px',
            outline: 'none'
          }}
        />
      ) : (
        <div className="flex gap-2 items-center">
          <input 
            type="date" 
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value && end) applyChanges('custom', month, e.target.value, end, profile);
            }}
            style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', outline: 'none' }}
          />
          <span className="text-muted text-sm">to</span>
          <input 
            type="date" 
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              if (start && e.target.value) applyChanges('custom', month, start, e.target.value, profile);
            }}
            style={{ background: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
