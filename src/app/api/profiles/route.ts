import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

export async function GET() {
  try {
    const allProfiles = await db.select().from(profiles);
    return NextResponse.json({ profiles: allProfiles });
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, icon } = await req.json();
    if (!name || !icon) {
      return NextResponse.json({ error: 'Name and icon are required' }, { status: 400 });
    }

    const newProfile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      icon: icon.trim(),
    };

    await db.insert(profiles).values(newProfile);

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
