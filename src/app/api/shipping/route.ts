import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin_village_code = searchParams.get('origin');
  const destination_village_code = searchParams.get('destination');
  const weightInGrams = searchParams.get('weight');
  
  if (!origin_village_code || !destination_village_code || !weightInGrams) {
    return NextResponse.json({ error: 'Missing origin, destination, or weight' }, { status: 400 });
  }

  // Use the api.co.id key (stored in BINDERBYTE_API_KEY based on user history)
  const apiKey = process.env.BINDERBYTE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Api.co.id key missing' }, { status: 500 });
  }

  try {
    // API.co.id expects weight in KG
    const weightInKg = Math.max(0.1, parseFloat(weightInGrams) / 1000);
    
    // Exact endpoint from documentation
    const apiUrl = `https://use.api.co.id/expedition/shipping-cost?origin_village_code=${origin_village_code}&destination_village_code=${destination_village_code}&weight=${weightInKg}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-co-id': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to fetch shipping cost' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
