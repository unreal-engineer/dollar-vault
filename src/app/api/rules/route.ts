import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET() {
  try {
    const rules = await db.select().from(categoryRules).where(eq(categoryRules.isActive, true));
    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { keyword, category } = await req.json();
    if (!keyword || !category) {
      return NextResponse.json({ error: 'Keyword and category are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(categoryRules).values({
      id,
      keyword: keyword.toLowerCase(),
      category,
      isActive: true,
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Rule for this keyword already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
