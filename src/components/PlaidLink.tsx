'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface PlaidLinkProps {
  onSuccess?: () => void;
}

export default function PlaidLinkComponent({ onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchLinkToken() {
      try {
        const res = await fetch('/api/plaid/create-link-token', { method: 'POST' });
        const data = await res.json();
        setLinkToken(data.link_token);
      } catch (err) {
        console.error('Error fetching link token', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLinkToken();
  }, []);

  if (loading || !linkToken) {
    return (
      <div className="plaid-link-container">
        <button disabled className="btn-primary">
          Loading...
        </button>
      </div>
    );
  }

  return <PlaidLinkButton token={linkToken} onSuccess={onSuccess} />;
}

function PlaidLinkButton({ token, onSuccess }: { token: string, onSuccess?: () => void }) {
  const handleOnSuccess = useCallback(async (public_token: string, metadata: any) => {
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      });
      const data = await res.json();
      if (data.success && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error exchanging token', err);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: handleOnSuccess,
  });

  return (
    <div className="plaid-link-container">
      <button 
        onClick={() => open()} 
        disabled={!ready}
        className="btn-primary"
      >
        Link Bank Account
      </button>
    </div>
  );
}
