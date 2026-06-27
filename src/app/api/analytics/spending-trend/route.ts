import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { sql, and, gte, lte, gt, eq } from 'drizzle-orm';

function formatMonthLabel(period: string): string {
  const [year, month] = period.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(month) - 1]} '${year.slice(2)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || '';
  const endDate   = searchParams.get('endDate')   || '';

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const base = [
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    eq(transactions.excluded, false),
  ];

  // Monthly time series
  const series = await db
    .select({
      period:  sql<string>`strftime('%Y-%m', ${transactions.date})`,
      spending: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END), 0)`,
      income:   sql<number>`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(and(...base))
    .groupBy(sql`strftime('%Y-%m', ${transactions.date})`)
    .orderBy(sql`strftime('%Y-%m', ${transactions.date})`);

  const seriesOut = series.map(r => ({
    period:   r.period,
    label:    formatMonthLabel(r.period),
    spending: Math.round((r.spending || 0) * 100) / 100,
    income:   Math.round((r.income   || 0) * 100) / 100,
  }));

  // Category totals for the whole range (used by Compare tab)
  const cats = await db
    .select({
      category: sql<string>`COALESCE(${transactions.customCategory}, ${transactions.categoryPrimary}, 'OTHER')`,
      spending: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(...base, gt(transactions.amount, 0)))
    .groupBy(sql`COALESCE(${transactions.customCategory}, ${transactions.categoryPrimary}, 'OTHER')`)
    .orderBy(sql`SUM(${transactions.amount}) DESC`);

  const totals = {
    spending: seriesOut.reduce((s, r) => s + r.spending, 0),
    income:   seriesOut.reduce((s, r) => s + r.income,   0),
  };

  return NextResponse.json({
    series: seriesOut,
    categoryTotals: cats.map(r => ({
      category: (r.category || 'OTHER').replace(/_/g, ' '),
      spending: Math.round((r.spending || 0) * 100) / 100,
    })),
    totals,
  });
}
