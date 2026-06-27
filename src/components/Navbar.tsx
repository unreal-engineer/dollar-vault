'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SyncButton from './SyncButton';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Accounts', path: '/accounts' },
    { name: 'Transactions', path: '/transactions' },
    { name: 'Budgets', path: '/budgets' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Forecast', path: '/recurring' },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      <nav className="navbar glass-panel">
        <div className="navbar-content flex justify-between items-center w-full">
          <Link href="/" className="logo text-gradient" onClick={() => setIsOpen(false)}>
            Dollar Vault
          </Link>
          
          <div className="desktop-links flex items-center gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                className={`nav-link ${pathname === link.path ? 'active' : ''}`}
              >
                {link.name}
              </Link>
            ))}
            
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

            <SyncButton />
            
            <Link href="/settings" title="Settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`} style={{ padding: '0.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </Link>

            <button onClick={handleLogout} title="Sign Out" className="nav-link" style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>

          <button className="hamburger" onClick={toggleMenu} aria-label="Menu">
            <div className={`bar ${isOpen ? 'open' : ''}`} />
            <div className={`bar ${isOpen ? 'open' : ''}`} />
            <div className={`bar ${isOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="mobile-menu glass-panel">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              href={link.path}
              className={`mobile-link ${pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div style={{ marginTop: '0.5rem' }}>
            <SyncButton />
          </div>
        </div>
      )}
    </>
  );
}
