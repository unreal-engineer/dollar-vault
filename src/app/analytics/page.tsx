'use client';

import SpendingTrendChart from '@/components/SpendingTrendChart';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="header">
        <div>
          <h1 className="text-gradient">Analytics & Trends</h1>
          <p className="text-muted">Analyze your spending habits and compare financial performance over time.</p>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <SpendingTrendChart />
      </div>
    </div>
  );
}
