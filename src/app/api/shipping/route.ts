import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination');
  const weightInGrams = searchParams.get('weight');
  const courier = searchParams.get('courier') || 'jne';
  
  if (!origin || !destination || !weightInGrams) {
    return NextResponse.json({ error: 'Missing origin, destination, or weight' }, { status: 400 });
  }

  const apiKey = process.env.RAJAONGKIR_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RajaOngkir API key missing' }, { status: 500 });
  }

  try {
    const apiUrl = `https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost`;
    
    // RajaOngkir expects form data
    const formData = new URLSearchParams();
    formData.append('origin', origin);
    formData.append('destination', destination);
    formData.append('weight', weightInGrams);
    formData.append('courier', courier);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.meta?.message || 'Failed to fetch shipping cost' }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
