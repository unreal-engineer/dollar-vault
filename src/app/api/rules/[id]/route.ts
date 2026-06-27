import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categoryRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(categoryRules).where(eq(categoryRules.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { keyword, category } = await req.json();
    
    await db.update(categoryRules)
      .set({ keyword: keyword.toLowerCase(), category })
      .where(eq(categoryRules.id, id));
      
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
