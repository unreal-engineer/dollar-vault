'use client';

import React, { useMemo } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { CATEGORY_GROUPS } from '@/lib/categories';

interface Transaction {
  amount: number;
  categoryPrimary: string | null;
  customCategory: string | null;
  excluded: boolean;
  name: string;
}

export default function CashFlowSankey({ transactions }: { transactions: Transaction[] }) {
  const COLORS = [
    '#6d5dfc', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', 
    '#14b8a6', '#6366f1'
  ];

  const data = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    let miscInflows = 0;
    const expensesByCategory: Record<string, number> = {};
    const savingsByCategory: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.excluded) return;
      if (tx.categoryPrimary === 'TRANSFER') return;

      const cat = tx.customCategory || tx.categoryPrimary || 'Uncategorized';

      if (tx.amount < 0) {
        if (CATEGORY_GROUPS.INCOME.includes(cat)) {
          incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Math.abs(tx.amount);
        } else {
          miscInflows += Math.abs(tx.amount);
        }
      } else if (tx.amount > 0) {
        if (CATEGORY_GROUPS.SAVINGS.includes(cat)) {
          savingsByCategory[cat] = (savingsByCategory[cat] || 0) + tx.amount;
        } else {
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + tx.amount;
        }
      }
    });

    const totalIncome = Object.values(incomeByCategory).reduce((a, b) => a + b, 0);
    const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
    const totalSavings = Object.values(savingsByCategory).reduce((a, b) => a + b, 0);
    const totalUses = totalExpenses + totalSavings;
    const totalSources = totalIncome + miscInflows;
    
    // Nodes array
    const cleanNodes: { name: string; color?: string }[] = [];
    const cleanLinks: { source: number; target: number; value: number; color?: string }[] = [];
    
    // Add central hub first (Index 0)
    cleanNodes.push({ name: 'Operating Capital', color: 'var(--text-muted)' });
    
    let colorIndex = 1; // start from 1 to avoid gray for normal buckets
    const getColor = () => COLORS[colorIndex++ % COLORS.length];

    // SOURCES OF FUNDS: Income
    Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        if (amount <= 0) return;
        const c = getColor();
        cleanNodes.push({ name: cat, color: c });
        cleanLinks.push({ source: cleanNodes.length - 1, target: 0, value: amount, color: c });
      });

    // SOURCES OF FUNDS: Misc Refunds
    if (miscInflows > 0) {
      const c = getColor();
      cleanNodes.push({ name: 'Other Deposits / Refunds', color: c });
      cleanLinks.push({ source: cleanNodes.length - 1, target: 0, value: miscInflows, color: c });
    }
    
    if (totalUses > totalSources) {
      const c = getColor();
      cleanNodes.push({ name: 'Cash Reserves Used', color: c });
      cleanLinks.push({ source: cleanNodes.length - 1, target: 0, value: totalUses - totalSources, color: c });
    }
    
    // USES OF FUNDS: True Expenses
    Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        if (amount <= 0) return;
        const c = getColor();
        cleanNodes.push({ name: cat.replace(/_/g, ' '), color: c });
        cleanLinks.push({ source: 0, target: cleanNodes.length - 1, value: amount, color: c });
      });
    
    // USES OF FUNDS: Asset Transfers (Savings)
    Object.entries(savingsByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        if (amount <= 0) return;
        const c = getColor();
        cleanNodes.push({ name: `[Asset] ${cat.replace(/_/g, ' ')}`, color: c });
        cleanLinks.push({ source: 0, target: cleanNodes.length - 1, value: amount, color: c });
      });
    
    // USES OF FUNDS: Unspent Cash
    if (totalSources > totalUses) {
      const c = getColor();
      cleanNodes.push({ name: '[Asset] Unspent Cash', color: c });
      cleanLinks.push({ source: 0, target: cleanNodes.length - 1, value: totalSources - totalUses, color: c });
    }

    return { nodes: cleanNodes, links: cleanLinks };
  }, [transactions]);

  // Custom Node to make it look nice in dark mode
  const CustomNode = ({ x, y, width, height, payload }: any) => {
    const isCenter = payload.name === 'Operating Capital';
    // Recharts Sankey applies a 220px left margin, so left nodes start at x=220
    const isLeft = x < 300 && !isCenter;

    let textX, anchor;
    if (isCenter || isLeft) {
      textX = x - 8;
      anchor = 'end';
    } else {
      textX = x + width + 8;
      anchor = 'start';
    }
    const textY = y + height / 2;

    const nodeColor = payload.color || 'var(--text-muted)';

    return (
      <Layer>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={nodeColor}
          fillOpacity="1"
          rx={4}
        />
        <text
          textAnchor={anchor as any}
          x={textX}
          y={textY}
          fontSize="13"
          fill="var(--text-main)"
          fontWeight={500}
          dominantBaseline="middle"
        >
          {payload.name} ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(payload.value)})
        </text>
      </Layer>
    );
  };

  const CustomLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
    
    // Since we embedded the color directly into the link object during useMemo, we just read it!
    const linkColor = payload?.color || 'rgba(109, 93, 252, 0.4)';

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        stroke={linkColor}
        strokeWidth={Math.max(1, linkWidth)}
        strokeOpacity={0.4}
        fill="none"
        style={{ transition: 'all 0.3s ease' }}
      />
    );
  };

  if (!data.links.length) {
    return <div className="text-muted text-sm" style={{ padding: '2rem 0', textAlign: 'center' }}>Not enough transaction data to generate flow.</div>;
  }

  const dynamicHeight = Math.max(400, data.nodes.length * 40);

  return (
    <div style={{ width: '100%', height: dynamicHeight, marginTop: '1rem', overflowX: 'auto' }}>
      <div style={{ minWidth: '800px', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <Sankey
            data={data}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={40}
            margin={{ top: 20, right: 200, bottom: 20, left: 200 }}
            iterations={64}
            sort={false}
          >
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--text-main)' }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
