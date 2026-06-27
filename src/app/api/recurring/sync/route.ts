import { syncRecurringTransactions } from '@/lib/recurring';

export async function POST() {
  try {
    const result = await syncRecurringTransactions();
    return Response.json(result);
  } catch (err: any) {
    console.error('Failed to sync recurring transactions:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
