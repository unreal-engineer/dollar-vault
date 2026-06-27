'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface TrendPoint {
  period: string;
  label: string;
  spending: number;
  income: number;
}

interface CategoryTotal {
  category: string;
  spending: number;
}

interface AnalyticsResponse {
  series: TrendPoint[];
  categoryTotals: CategoryTotal[];
  totals: {
    spending: number;
    income: number;
  };
}

import { CATEGORY_GROUPS } from '@/lib/categories';

export default function SpendingTrendChart() {
  const [activeTab, setActiveTab] = useState<'trend' | 'compare'>('trend');
  const [groupingLevel, setGroupingLevel] = useState<'buckets' | 'subcategories'>('buckets');

  // Trend States
  const [trendRange, setTrendRange] = useState<'3M' | '6M' | '12M' | 'ALL' | 'CUSTOM'>('6M');
  const [trendStart, setTrendStart] = useState('');
  const [trendEnd, setTrendEnd] = useState('');
  const [trendData, setTrendData] = useState<AnalyticsResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // Compare States
  const [comparePresetA, setComparePresetA] = useState<string>('this-month');
  const [compareStartA, setCompareStartA] = useState('');
  const [compareEndA, setCompareEndA] = useState('');

  const [comparePresetB, setComparePresetB] = useState<string>('last-month');
  const [compareStartB, setCompareStartB] = useState('');
  const [compareEndB, setCompareEndB] = useState('');

  const [dataA, setDataA] = useState<AnalyticsResponse | null>(null);
  const [dataB, setDataB] = useState<AnalyticsResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const getBucketForCategory = (cat: string) => {
    for (const [bucket, subs] of Object.entries(CATEGORY_GROUPS)) {
      if (subs.includes(cat)) return bucket;
    }
    return 'OTHER';
  };

  // Helper: Get range dates based on preset
  const getDatesForPreset = useCallback((preset: string) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    if (preset === '3M') {
      const d = new Date();
      d.setMonth(today.getMonth() - 3);
      start = d.toISOString().split('T')[0];
    } else if (preset === '6M') {
      const d = new Date();
      d.setMonth(today.getMonth() - 6);
      start = d.toISOString().split('T')[0];
    } else if (preset === '12M') {
      const d = new Date();
      d.setMonth(today.getMonth() - 12);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      start = '2000-01-01'; // Far past
    } else if (preset === 'this-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
    } else if (preset === 'last-month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (preset === 'this-year') {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      start = firstDay.toISOString().split('T')[0];
    } else if (preset === 'last-year') {
      const firstDay = new Date(today.getFullYear() - 1, 0, 1);
      const lastDay = new Date(today.getFullYear() - 1, 11, 31);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    }

    return { start, end };
  }, []);

  // Initialize dates
  useEffect(() => {
    const { start, end } = getDatesForPreset('6M');
    setTrendStart(start);
    setTrendEnd(end);
  }, [getDatesForPreset]);

  useEffect(() => {
    const rangeA = getDatesForPreset('this-month');
    setCompareStartA(rangeA.start);
    setCompareEndA(rangeA.end);

    const rangeB = getDatesForPreset('last-month');
    setCompareStartB(rangeB.start);
    setCompareEndB(rangeB.end);
  }, [getDatesForPreset]);

  // Fetch Trend Data
  const fetchTrendData = useCallback(async () => {
    if (!trendStart || !trendEnd) return;
    setTrendLoading(true);
    try {
      const res = await fetch(`/api/analytics/spending-trend?startDate=${trendStart}&endDate=${trendEnd}`);
      if (res.ok) {
        const data = await res.json();
        setTrendData(data);
      }
    } catch (err) {
      console.error('Failed to fetch trend data', err);
    } finally {
      setTrendLoading(false);
    }
  }, [trendStart, trendEnd]);

  useEffect(() => {
    if (activeTab === 'trend') {
      fetchTrendData();
    }
  }, [fetchTrendData, activeTab]);

  // Fetch Comparison Data
  const fetchCompareData = useCallback(async () => {
    if (!compareStartA || !compareEndA || !compareStartB || !compareEndB) return;
    setCompareLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/analytics/spending-trend?startDate=${compareStartA}&endDate=${compareEndA}`),
        fetch(`/api/analytics/spending-trend?startDate=${compareStartB}&endDate=${compareEndB}`),
      ]);
      if (resA.ok && resB.ok) {
        const dA = await resA.json();
        const dB = await resB.json();
        setDataA(dA);
        setDataB(dB);
      }
    } catch (err) {
      console.error('Failed to fetch comparison data', err);
    } finally {
      setCompareLoading(false);
    }
  }, [compareStartA, compareEndA, compareStartB, compareEndB]);

  useEffect(() => {
    if (activeTab === 'compare') {
      fetchCompareData();
    }
  }, [fetchCompareData, activeTab]);

  // Preset handlers for Trend
  const handleTrendRangeChange = (range: '3M' | '6M' | '12M' | 'ALL' | 'CUSTOM') => {
    setTrendRange(range);
    if (range !== 'CUSTOM') {
      const { start, end } = getDatesForPreset(range);
      setTrendStart(start);
      setTrendEnd(end);
    }
  };

  // Preset handlers for A/B Comparison
  const handlePresetAChange = (preset: string) => {
    setComparePresetA(preset);
    if (preset !== 'CUSTOM') {
      const { start, end } = getDatesForPreset(preset);
      setCompareStartA(start);
      setCompareEndA(end);
    }
  };

  const handlePresetBChange = (preset: string) => {
    setComparePresetB(preset);
    if (preset !== 'CUSTOM') {
      const { start, end } = getDatesForPreset(preset);
      setCompareStartB(start);
      setCompareEndB(end);
    }
  };

  const getPeriodLabel = (preset: string, start: string, end: string) => {
    if (preset !== 'CUSTOM') {
      return preset.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return `${start} to ${end}`;
  };

  const stackedData = React.useMemo(() => {
    if (!dataA || !dataB) return [];

    const periodAObj: any = { name: getPeriodLabel(comparePresetA, compareStartA, compareEndA) };
    const periodBObj: any = { name: getPeriodLabel(comparePresetB, compareStartB, compareEndB) };

    const uniqueCategories = new Set<string>();
    const mapA = new Map<string, number>();
    const mapB = new Map<string, number>();

    dataA.categoryTotals.forEach(c => {
      const key = groupingLevel === 'buckets' ? getBucketForCategory(c.category) : c.category;
      mapA.set(key, (mapA.get(key) || 0) + c.spending);
      uniqueCategories.add(key);
    });

    dataB.categoryTotals.forEach(c => {
      const key = groupingLevel === 'buckets' ? getBucketForCategory(c.category) : c.category;
      mapB.set(key, (mapB.get(key) || 0) + c.spending);
      uniqueCategories.add(key);
    });

    uniqueCategories.forEach(cat => {
      periodAObj[cat] = mapA.get(cat) || 0;
      periodBObj[cat] = mapB.get(cat) || 0;
    });

    return [periodAObj, periodBObj];
  }, [dataA, dataB, comparePresetA, compareStartA, compareEndA, comparePresetB, compareStartB, compareEndB, groupingLevel]);

  const allCategories = React.useMemo(() => {
    if (!dataA || !dataB) return [];
    
    const catTotals: Record<string, number> = {};
    
    dataA.categoryTotals.forEach(c => {
      const key = groupingLevel === 'buckets' ? getBucketForCategory(c.category) : c.category;
      catTotals[key] = (catTotals[key] || 0) + c.spending;
    });
    
    dataB.categoryTotals.forEach(c => {
      const key = groupingLevel === 'buckets' ? getBucketForCategory(c.category) : c.category;
      catTotals[key] = (catTotals[key] || 0) + c.spending;
    });
    
    return Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
  }, [dataA, dataB, groupingLevel]);

  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', 
    '#6366f1', '#14b8a6', '#f43f5e', '#eab308',
    '#64748b', '#84cc16', '#0ea5e9', '#d946ef',
    '#22c55e', '#a855f7', '#facc15', '#f87171'
  ];

  // Comparison card values
  const nameA = getPeriodLabel(comparePresetA, compareStartA, compareEndA);
  const nameB = getPeriodLabel(comparePresetB, compareStartB, compareEndB);

  const totalA = dataA?.totals.spending || 0;
  const totalB = dataB?.totals.spending || 0;
  const compareDiff = totalA - totalB;
  const comparePercent = totalB > 0 ? (compareDiff / totalB) * 100 : 0;

  const currencyFormatter = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      {/* Premium Tab Switcher */}
      <div className="flex gap-2 mb-6" style={{ background: 'var(--glass-bg)', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('trend')}
          className={`nav-link ${activeTab === 'trend' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px' }}
        >
          Spending Trend
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`nav-link ${activeTab === 'compare' ? 'active' : ''}`}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px' }}
        >
          Compare Periods
        </button>
      </div>

      {activeTab === 'trend' ? (
        <div>
          {/* Controls */}
          <div className="glass-panel flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
            <div className="flex gap-2 flex-wrap">
              {(['3M', '6M', '12M', 'ALL', 'CUSTOM'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleTrendRangeChange(r)}
                  className={`btn-secondary ${trendRange === r ? 'btn-primary' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  {r}
                </button>
              ))}
            </div>

            {trendRange === 'CUSTOM' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={trendStart}
                  onChange={(e) => setTrendStart(e.target.value)}
                  style={{
                    background: 'var(--bg-dark)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                  }}
                />
                <span className="text-muted">to</span>
                <input
                  type="date"
                  value={trendEnd}
                  onChange={(e) => setTrendEnd(e.target.value)}
                  style={{
                    background: 'var(--bg-dark)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                  }}
                />
              </div>
            )}
          </div>

          {/* Chart Display */}
          <div className="glass-panel" style={{ height: '60vh', minHeight: '400px', maxHeight: '600px', padding: '1.5rem' }}>
            {trendLoading ? (
              <div className="flex items-center justify-center h-full text-muted">Loading trend data...</div>
            ) : !trendData || !trendData.series.length ? (
              <div className="flex items-center justify-center h-full text-muted">No transactions found for this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={trendData.series} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--success)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--success)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-dark)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                    }}
                    formatter={(val: any) => [currencyFormatter(val), '']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    name="Spending"
                    dataKey="spending"
                    stroke="var(--danger)"
                    fillOpacity={1}
                    fill="url(#colorSpending)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    name="Income"
                    dataKey="income"
                    stroke="var(--success)"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Comparison Controllers */}
          <div className="grid gap-4 mb-6">
            {/* Period A */}
            <div className="glass-panel" style={{ borderTop: '4px solid #14b8a6' }}>
              <h4 className="mb-2 font-bold" style={{ color: '#14b8a6' }}>{nameA}</h4>
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-2 flex-wrap">
                  {['this-month', 'last-month', 'this-year', 'last-year', 'CUSTOM'].map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePresetAChange(p)}
                      className={`btn-secondary ${comparePresetA === p ? 'btn-primary' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {p.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                {comparePresetA === 'CUSTOM' && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={compareStartA}
                      onChange={(e) => setCompareStartA(e.target.value)}
                      style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                      }}
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="date"
                      value={compareEndA}
                      onChange={(e) => setCompareEndA(e.target.value)}
                      style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Period B */}
            <div className="glass-panel" style={{ borderTop: '4px solid #f97316' }}>
              <h4 className="mb-2 font-bold" style={{ color: '#f97316' }}>{nameB}</h4>
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-2 flex-wrap">
                  {['this-month', 'last-month', 'this-year', 'last-year', 'CUSTOM'].map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePresetBChange(p)}
                      className={`btn-secondary ${comparePresetB === p ? 'btn-primary' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {p.replace('-', ' ')}
                    </button>
                  ))}
                </div>
                {comparePresetB === 'CUSTOM' && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={compareStartB}
                      onChange={(e) => setCompareStartB(e.target.value)}
                      style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                      }}
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="date"
                      value={compareEndB}
                      onChange={(e) => setCompareEndB(e.target.value)}
                      style={{
                        background: 'var(--bg-dark)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difference & Percentage Cards */}
          <div className="glass-panel mb-6 stats-grid">
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted text-sm block">{nameA} Total Spending</span>
              <span className="font-bold" style={{ fontSize: '1.75rem', color: '#14b8a6' }}>{currencyFormatter(totalA)}</span>
            </div>
            <div className="stats-card-middle" style={{ textAlign: 'center' }}>
              <span className="text-muted text-sm block">{nameB} Total Spending</span>
              <span className="font-bold" style={{ fontSize: '1.75rem', color: '#f97316' }}>{currencyFormatter(totalB)}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span className="text-muted text-sm block">Change (A vs B)</span>
              <span
                className={`font-bold`}
                style={{
                  fontSize: '1.75rem',
                  color: compareDiff > 0 ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {compareDiff > 0 ? '+' : ''}
                {currencyFormatter(compareDiff)} ({comparePercent > 0 ? '+' : ''}
                {comparePercent.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Stacked Category Bar Chart */}
          <div className="glass-panel flex flex-col" style={{ height: '65vh', minHeight: '450px', maxHeight: '700px', padding: '1.5rem' }}>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h3 className="text-lg font-bold">Spending Breakdown</h3>
              <div className="flex gap-1" style={{ background: 'var(--bg-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setGroupingLevel('buckets')}
                  style={{ border: 'none', background: groupingLevel === 'buckets' ? 'var(--primary)' : 'transparent', color: groupingLevel === 'buckets' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: groupingLevel === 'buckets' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                >
                  Buckets
                </button>
                <button
                  onClick={() => setGroupingLevel('subcategories')}
                  style={{ border: 'none', background: groupingLevel === 'subcategories' ? 'var(--primary)' : 'transparent', color: groupingLevel === 'subcategories' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: groupingLevel === 'subcategories' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                >
                  Subcategories
                </button>
              </div>
            </div>
            {compareLoading ? (
              <div className="flex items-center justify-center h-full text-muted">Loading comparison data...</div>
            ) : !stackedData.length ? (
              <div className="flex items-center justify-center h-full text-muted">No category data found for these periods.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={14} fontWeight={600} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    shared={false}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const dataKey = payload[0].dataKey as string;
                        const fill = payload[0].fill;
                        
                        const nameA = stackedData[0]?.name || 'Period A';
                        const nameB = stackedData[1]?.name || 'Period B';
                        const valA = (stackedData[0] as any)?.[dataKey] || 0;
                        const valB = (stackedData[1] as any)?.[dataKey] || 0;
                        
                        const diff = valA - valB;
                        const percent = valB > 0 ? (diff / valB) * 100 : 0;
                        
                        return (
                          <div style={{
                            backgroundColor: 'var(--bg-dark)',
                            borderColor: 'var(--border-color)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            padding: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                          }}>
                            <h4 style={{ margin: '0 0 8px 0', color: fill, fontWeight: 'bold' }}>{dataKey}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', fontSize: '0.9rem', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{nameA}:</span>
                              <strong>{currencyFormatter(valA)}</strong>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', fontSize: '0.9rem', marginBottom: '8px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{nameB}:</span>
                              <strong>{currencyFormatter(valB)}</strong>
                            </div>
                            
                            <div style={{
                              paddingTop: '8px',
                              borderTop: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              color: diff > 0 ? 'var(--danger)' : (diff < 0 ? 'var(--success)' : 'var(--text-muted)')
                            }}>
                              Change: {diff > 0 ? '+' : ''}{currencyFormatter(diff)} 
                              {valB > 0 ? ` (${percent > 0 ? '+' : ''}${percent.toFixed(1)}%)` : ' (New)'}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{fill: 'var(--border-color)', opacity: 0.1}}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                    onMouseEnter={(e: any) => setActiveCategory(e.dataKey)}
                    onMouseLeave={() => setActiveCategory(null)}
                    onClick={(e: any) => setActiveCategory(activeCategory === e.dataKey ? null : e.dataKey)}
                  />
                  {allCategories.map((cat, index) => (
                    <Bar 
                      key={cat} 
                      dataKey={cat} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                      fillOpacity={activeCategory ? (activeCategory === cat ? 1 : 0.15) : 1}
                      onMouseEnter={() => setActiveCategory(cat)}
                      onMouseLeave={() => setActiveCategory(null)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
