import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if the profile is being used by any account
    const profile = await db.select().from(profiles).where(eq(profiles.id, id));
    if (profile.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileName = profile[0].name;
    
    // Optional: we could prevent deletion or re-assign accounts
    const linkedAccounts = await db.select().from(accounts).where(eq(accounts.owner, profileName));
    if (linkedAccounts.length > 0) {
      return NextResponse.json({ error: `Cannot delete profile. ${linkedAccounts.length} account(s) are currently assigned to this profile.` }, { status: 400 });
    }

    await db.delete(profiles).where(eq(profiles.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
