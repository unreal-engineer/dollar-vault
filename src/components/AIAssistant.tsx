'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface AIMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function AIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Define dynamic prompts based on the current page
  const getPrompts = () => {
    if (pathname.startsWith('/budgets')) {
      return [
        "Analyze my zero-based budget balance.",
        "Find missing or unscheduled sinking funds."
      ];
    }
    if (pathname.startsWith('/transactions')) {
      return [
        "Audit my recent spending categories.",
        "Highlight my largest unnecessary expenses."
      ];
    }
    if (pathname.startsWith('/recurring')) {
      return [
        "Analyze my recurring liabilities and burn rate.",
        "Flag rising subscription costs."
      ];
    }
    // Default (Dashboard / Home)
    return [
      "Summarize my net cash flow.",
      "Identify lifestyle creep in the last 3 months."
    ];
  };

  const prompts = getPrompts();

  // Helper to fetch context based on pathname
  const fetchPageContext = async (prompt: string) => {
    const d = new Date();
    const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    let contextData = '';
    
    try {
      if (pathname.startsWith('/budgets')) {
        const res = await fetch(`/api/budgets?month=${currentMonth}`);
        if (res.ok) {
          const data = await res.json();
          contextData = `Budgets Data:\n${JSON.stringify(data.budgets, null, 2)}`;
        }
      } else if (pathname.startsWith('/transactions')) {
        const res = await fetch(`/api/transactions`);
        if (res.ok) {
          const data = await res.json();
          // Limit to recent 50 to avoid huge context
          const recent = data.transactions?.slice(0, 50) || [];
          contextData = `Recent Transactions:\n${JSON.stringify(recent, null, 2)}`;
        }
      } else if (pathname.startsWith('/recurring')) {
        const res = await fetch(`/api/recurring`);
        if (res.ok) {
          const data = await res.json();
          contextData = `Recurring Liabilities:\n${JSON.stringify(data.streams, null, 2)}`;
        }
      } else {
        // Dashboard - Fetch budgets for cashflow context
        const res = await fetch(`/api/budgets?month=${currentMonth}`);
        if (res.ok) {
          const data = await res.json();
          contextData = `Dashboard Cashflow Data (Budgets/Spent):\n${JSON.stringify(data.budgets, null, 2)}`;
        }
      }
    } catch (e) {
      console.error('Failed to fetch context', e);
    }

    return `Context:\n${contextData}\n\nTask: ${prompt}\n\nRemember to act as a Finance Manager (Harvard MBA). Focus on Net Cash Flow, zero-based budgeting, and strict income/expense definitions.`;
  };

  const handlePromptClick = async (promptText: string) => {
    if (loading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: promptText }]);
    setLoading(true);
    setStatus('Gathering context...');
    setError(null);
    
    try {
      const fullPrompt = await fetchPageContext(promptText);
      
      setStatus('Consulting local AI models...');
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fullPrompt })
      });
      
      if (!response.ok) {
        let errMsg = 'Failed to call AI';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errMsg = errorData.error || errMsg;
        } else {
          errMsg = `Server error ${response.status}: ${response.statusText || 'Not Found'}`;
        }
        throw new Error(errMsg);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Response stream not readable');
      
      let accumulatedResponse = '';
      let buffer = '';
      
      // Add empty AI message to append to
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              if (data.chunk) {
                accumulatedResponse += data.chunk;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content = accumulatedResponse;
                  return newMsgs;
                });
                setStatus(''); // clear status once streaming starts
              }
              if (data.status) {
                setStatus(data.status);
              }
            } catch (e) {
              console.error('Failed to parse SSE JSON line:', trimmed, e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with local AI server.');
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="hover-glow"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-accent), #3b82f6)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 15px rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          color: 'white',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'scale(0.9) rotate(90deg)' : 'scale(1) rotate(0deg)',
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        )}
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div 
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.5rem',
            width: 'calc(100vw - 3rem)',
            maxWidth: '400px',
            maxHeight: '600px',
            height: 'calc(100vh - 8rem)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 9, 11, 0.95) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-3">
              <div style={{ 
                width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)',
                boxShadow: '0 0 10px var(--success)'
              }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.02em', color: 'white' }}>AI Assistant</h3>
            </div>
            <p className="text-muted text-xs" style={{ margin: '0.25rem 0 0 0', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Financial Intelligence
            </p>
          </div>

          {/* Chat History */}
          <div className="ai-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 ? (
              <div className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '2rem', lineHeight: '1.6' }}>
                <p>Hello! I'm here to enforce strict financial discipline and analyze your net worth.</p>
                <p style={{ marginTop: '0.5rem' }}>Select an action below to begin.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary-accent), #3b82f6)' : 'rgba(255,255,255,0.03)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '16px',
                  maxWidth: '85%',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-line',
                  border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(59, 130, 246, 0.2)' : 'none'
                }}>
                  {msg.content}
                </div>
              ))
            )}
            
            {status && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'flex-start', padding: '0.5rem 0' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span className="text-muted text-xs font-medium tracking-wide">{status}</span>
              </div>
            )}
            
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', lineHeight: '1.5' }}>
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompts Area */}
          <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="text-muted text-xs font-semibold mb-2 uppercase tracking-widest">Suggested Actions</div>
            {prompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handlePromptClick(prompt)}
                disabled={loading}
                className="ai-prompt-btn"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-main)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.5 : 1,
                  lineHeight: '1.4'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ai-prompt-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.15) !important;
          transform: translateY(-1px);
        }
        .ai-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .ai-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .ai-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}} />
    </>
  );
}
