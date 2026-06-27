import { db } from '@/lib/db';
import { budgets, budgetSnapshots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const scope = searchParams.get('scope') || 'this-month'; // 'this-month' or 'all-months'

    const body = await request.json();
    const { monthlyLimit, dueDate } = body;

    if (monthlyLimit === undefined && dueDate === undefined) {
      return NextResponse.json({ error: 'Missing fields to update' }, { status: 400 });
    }

    let updatedBudget: any = null;

    if (dueDate !== undefined) {
      const parsedDueDay = dueDate ? parseInt(dueDate) : null;
      await db.update(budgets)
        .set({ dueDate: parsedDueDay })
        .where(eq(budgets.id, id));
    }

    if (monthlyLimit !== undefined) {
      const limitVal = parseFloat(monthlyLimit);

      if (month && scope === 'this-month') {
        // Upsert a month-specific snapshot override
        const existing = await db.select()
          .from(budgetSnapshots)
          .where(and(eq(budgetSnapshots.budgetId, id), eq(budgetSnapshots.month, month)))
          .limit(1);

        if (existing.length > 0) {
          await db.update(budgetSnapshots)
            .set({ limitAmount: limitVal })
            .where(eq(budgetSnapshots.id, existing[0].id));
        } else {
          await db.insert(budgetSnapshots).values({
            id: crypto.randomUUID(),
            budgetId: id,
            month,
            limitAmount: limitVal,
          });
        }
        
        const baseBudget = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
        return NextResponse.json({ 
          budget: { 
            ...baseBudget[0], 
            monthlyLimit: limitVal, 
            isCustomLimit: true,
            dueDate: dueDate !== undefined ? (dueDate ? parseInt(dueDate) : null) : baseBudget[0].dueDate
          } 
        });
      } else {
        // Update the base template budget
        const res = await db.update(budgets)
          .set({ monthlyLimit: limitVal })
          .where(eq(budgets.id, id))
          .returning();
        updatedBudget = res[0];

        // If scope is 'all-months' and month is specified, clean up any specific snapshot override for that month
        // so it falls back to this new default.
        if (month) {
          await db.delete(budgetSnapshots)
            .where(and(eq(budgetSnapshots.budgetId, id), eq(budgetSnapshots.month, month)));
        }
      }
    }

    if (!updatedBudget) {
      const base = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
      updatedBudget = base[0];
    }

    return NextResponse.json({ budget: updatedBudget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}
