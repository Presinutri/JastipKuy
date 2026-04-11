import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q || q.length < 3) {
    return NextResponse.json({ error: 'Search query must be at least 3 characters' }, { status: 400 });
  }

  // Use the api.co.id key (stored in BINDERBYTE_API_KEY)
  const apiKey = process.env.BINDERBYTE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Api.co.id key missing' }, { status: 500 });
  }

  try {
    // New endpoint for api.co.id village search
    const apiUrl = `https://use.api.co.id/regional/indonesia/villages?search=${encodeURIComponent(q)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-co-id': apiKey
      }
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Failed to fetch villages: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
