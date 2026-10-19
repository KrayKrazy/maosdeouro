import { NextResponse } from 'next/server';
import { sendOrderNotifications } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const res = await sendOrderNotifications(payload);
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    console.error('Send OS Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
