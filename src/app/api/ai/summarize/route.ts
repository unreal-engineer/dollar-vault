import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, mode = 'think' } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Query system settings for AI translator URL
    const settings = await db.select().from(systemSettings).where(eq(systemSettings.key, 'ai_api_url'));
    const aiUrl = settings.length > 0 ? settings[0].value : 'http://127.0.0.1:8000';

    // Call local AI server
    const aiRes = await fetch(`${aiUrl}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode
      })
    });

    if (!aiRes.ok) {
      return NextResponse.json({ error: `Failed to communicate with AI server. Make sure it is running at ${aiUrl}` }, { status: 502 });
    }

    // Stream the response back to the client
    const stream = aiRes.body;
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('Error in AI proxy:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
