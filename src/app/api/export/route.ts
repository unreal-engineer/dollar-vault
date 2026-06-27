import { db } from '@/lib/db';
import { transactions, accounts } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { desc, eq, and, or, like, gte, lte, SQL, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const accountId = searchParams.get('account')?.trim() || '';
    const startDate = searchParams.get('startDate')?.trim() || '';
    const endDate = searchParams.get('endDate')?.trim() || '';
    const profile = searchParams.get('profile')?.trim() || 'All';
    const format = searchParams.get('format')?.trim() || 'csv';

    // Build dynamic WHERE conditions
    const conditions: SQL[] = [];
    if (search) {
      const searchParam = `%${search}%`;
      conditions.push(or(like(transactions.name, searchParam), like(transactions.merchantName, searchParam))!);
    }
    if (category) {
      conditions.push(or(eq(transactions.customCategory, category), eq(transactions.categoryPrimary, category))!);
    }
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }
    if (startDate) {
      conditions.push(gte(transactions.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, endDate));
    }
    if (profile && profile !== 'All') {
      conditions.push(eq(accounts.owner, profile));
    }

    const allTransactions = await db
      .select({
        date: transactions.date,
        amount: transactions.amount,
        name: transactions.name,
        merchantName: transactions.merchantName,
        customCategory: transactions.customCategory,
        categoryPrimary: transactions.categoryPrimary,
        accountName: sql`COALESCE(${accounts.customName}, ${accounts.name})`.as('accountName'),
        accountOwner: accounts.owner,
        excluded: transactions.excluded,
        notes: transactions.notes,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date));

    if (format === 'json') {
      return NextResponse.json(allTransactions);
    }

    // CSV format
    const escapeCsv = (str: string | null | undefined) => {
      if (!str) return '""';
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = ['Date', 'Account', 'Owner', 'Merchant/Name', 'Category', 'Amount', 'Excluded', 'Notes'];
    const csvRows = allTransactions.map(t => [
      t.date,
      escapeCsv(t.accountName as string),
      escapeCsv(t.accountOwner as string),
      escapeCsv(t.merchantName || t.name),
      escapeCsv(t.customCategory || t.categoryPrimary || ''),
      t.amount.toString(),
      t.excluded ? 'Yes' : 'No',
      escapeCsv(t.notes || '')
    ]);

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...csvRows.map(row => row.join(','))].join('\r\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting transactions:', error);
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 });
  }
}
