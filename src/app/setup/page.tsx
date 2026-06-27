'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  
  // Form fields
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [env, setEnv] = useState('sandbox');
  const [aiUrl, setAiUrl] = useState('http://127.0.0.1:8000');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state indicators
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateForm = () => {
    if (!clientId || !secret || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleTestConnection = async () => {
    if (!clientId || !secret) {
      setTestResult({ success: false, message: 'Plaid Client ID and Secret are required to test connection.' });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const res = await fetch('/api/setup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, env })
      });
      
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: 'Connection verified successfully!' });
      } else {
        setTestResult({ success: false, message: `Verification failed: ${data.error}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Request failed: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          secret,
          env,
          ai_url: aiUrl,
          password
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        // Redirect to dashboard page
        router.push('/');
      } else {
        setErrorMsg(data.error || 'Failed to save configurations.');
      }
    } catch (err: any) {
      setErrorMsg(`Request failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: 'var(--bg-dark)',
    color: 'var(--text-main)',
    marginTop: '6px',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90vh', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.2rem', marginBottom: '8px', fontFamily: 'Fira Code, monospace' }}>Dollar Vault Setup</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>Configure your local database, Plaid API access keys, and local AI instance.</p>
        </div>

        <form onSubmit={handleSaveAndLaunch} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Plaid API Keys */}
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', fontSize: '1.2rem', fontFamily: 'Fira Code, monospace' }}>
              Plaid Credentials
            </h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
              Create a free developer account at <strong>dashboard.plaid.com</strong> to fetch your keys.
            </p>
            
            <div className="mb-4">
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Plaid Client ID</label>
              <input
                type="text"
                placeholder="Enter client_id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div className="mb-4" style={{ marginTop: '12px' }}>
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Plaid Secret</label>
              <input
                type="password"
                placeholder="Enter secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Plaid Environment</label>
              <select
                value={env}
                onChange={(e) => setEnv(e.target.value)}
                style={inputStyle}
              >
                <option value="sandbox">Sandbox (Mock data, free 10 items)</option>
                <option value="development">Development (Real bank data, free 10 items)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !clientId || !secret}
              className="btn-secondary"
              style={{ width: '100%', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
            >
              <svg className={testing ? 'animate-spin' : ''} style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {testing ? 'Testing Connection...' : 'Test Plaid Connection'}
            </button>

            {testResult && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                fontSize: '0.85rem',
                backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: testResult.success ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                color: testResult.success ? 'var(--success)' : 'var(--danger)'
              }}>
                {testResult.message}
              </div>
            )}
          </div>

          {/* Local AI Setup */}
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', fontSize: '1.2rem', fontFamily: 'Fira Code, monospace' }}>
              Local AI Host Configuration
            </h3>
            
            <div>
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Local AI API Server URL</label>
              <input
                type="text"
                placeholder="http://127.0.0.1:8000"
                value={aiUrl}
                onChange={(e) => setAiUrl(e.target.value)}
                style={inputStyle}
                required
              />
              <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                Address of your local AI translator server running Ollama.
              </span>
            </div>
          </div>

          {/* Security Password */}
          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px', fontSize: '1.2rem', fontFamily: 'Fira Code, monospace' }}>
              Access Control Security
            </h3>
            
            <div className="mb-4">
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Master App Password</label>
              <input
                type="password"
                placeholder="Create master password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <label className="text-sm text-muted" style={{ fontWeight: 600 }}>Confirm Master Password</label>
              <input
                type="password"
                placeholder="Confirm master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          {/* Validation Errors */}
          {errorMsg && (
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: '6px', 
              fontSize: '0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              textAlign: 'center'
            }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '14px', fontWeight: 600 }}
          >
            {saving ? 'Initializing Database & Saving...' : 'Save & Launch Dashboard'}
          </button>

        </form>
      </div>
    </div>
  );
}
