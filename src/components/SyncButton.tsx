'use client';

import { useState, useEffect } from 'react';

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const fetchLastSynced = async () => {
    try {
      const res = await fetch('/api/sync/status');
      const data = await res.json();
      if (data.lastSyncedAt) setLastSynced(data.lastSyncedAt);
    } catch {
      // Silently ignore — non-critical
    }
  };

  useEffect(() => {
    fetchLastSynced();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const res = await fetch('/api/plaid/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Sync complete!');
        await fetchLastSynced();
        setTimeout(() => {
          setMessage('');
          window.location.reload();
        }, 1500);
      } else {
        setMessage('Sync failed.');
      }
    } catch {
      setMessage('Error syncing.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center">
      <button
        onClick={handleSync}
        disabled={syncing}
        title={message || (lastSynced ? `Synced ${timeAgo(lastSynced)}` : 'Sync Now')}
        className="nav-link"
        style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={syncing ? 'spin' : ''}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

