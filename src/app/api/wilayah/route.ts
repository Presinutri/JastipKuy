import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q || q.length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters' }, { status: 400 });
  }

  // Use the RajaOngkir API key
  const apiKey = process.env.RAJAONGKIR_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RajaOngkir API key missing' }, { status: 500 });
  }

  try {
    const apiUrl = `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(q)}&limit=20&offset=0`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'key': apiKey
      }
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.meta?.message || `Failed to fetch locations: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
