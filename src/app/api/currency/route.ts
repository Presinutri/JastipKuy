import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const base = searchParams.get('base') || 'IDR';

  const apiKey = process.env.EXCHANGERATE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'ExchangeRate API key missing' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`, {
      // Revalidate every 1 hour to save API credits as rates don't fluctuate crazily by the second
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
