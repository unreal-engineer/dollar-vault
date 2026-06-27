import { db } from '@/lib/db';
import { budgets, transactions, budgetSnapshots } from '@/lib/db/schema';
import { CATEGORY_GROUPS } from '@/lib/categories';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    const allBudgets = await db.select().from(budgets);
    
    // Calculate current month's spending for each budget
    const currentDate = new Date();
    const defaultMonthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthPrefix = monthParam || defaultMonthPrefix;
    
    // Get snapshots for the specific month
    const snapshots = await db.select()
      .from(budgetSnapshots)
      .where(eq(budgetSnapshots.month, currentMonthPrefix));

    const snapshotsMap = new Map<string, number>();
    snapshots.forEach(s => {
      if (s.budgetId) {
        snapshotsMap.set(s.budgetId, s.limitAmount);
      }
    });

    const allTransactions = await db.select().from(transactions);
    
    // Group spending by category
    const spendingByCategory: Record<string, number> = {};
    allTransactions.forEach(tx => {
      if (tx.date.startsWith(currentMonthPrefix) && !tx.excluded) {
        const cat = tx.customCategory || tx.categoryPrimary || 'Uncategorized';
        const isIncomeCat = CATEGORY_GROUPS.INCOME?.includes(cat);

        if (isIncomeCat) {
          if (tx.amount < 0) {
            spendingByCategory[cat] = (spendingByCategory[cat] || 0) + Math.abs(tx.amount);
          }
        } else {
          if (tx.amount > 0) {
            spendingByCategory[cat] = (spendingByCategory[cat] || 0) + tx.amount;
          }
        }
      }
    });

    const enrichedBudgets = allBudgets.map(b => {
      const customLimit = snapshotsMap.get(b.id);
      return {
        ...b,
        monthlyLimit: customLimit !== undefined ? customLimit : b.monthlyLimit,
        isCustomLimit: customLimit !== undefined,
        spent: b.plaidCategoryPrimary ? (spendingByCategory[b.plaidCategoryPrimary] || 0) : 0
      };
    });

    return NextResponse.json({ budgets: enrichedBudgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, plaidCategoryPrimary, monthlyLimit, color, dueDate } = body;

    if (!name || !monthlyLimit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newBudget = await db.insert(budgets).values({
      id: crypto.randomUUID(),
      name,
      plaidCategoryPrimary: plaidCategoryPrimary || null,
      monthlyLimit: parseFloat(monthlyLimit),
      color: color || '#6d5dfc',
      dueDate: dueDate ? parseInt(dueDate) : null,
    }).returning();

    return NextResponse.json({ budget: newBudget[0] });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
