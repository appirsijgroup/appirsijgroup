import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.myquran.com/v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string; date: string }> }
) {
  try {
    const { locationId, date } = await params;

    // Fetch from myquran API (server-side, no CORS issue)
    const response = await fetch(`${API_BASE_URL}/sholat/jadwal/${locationId}/${date}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      // Cache for 1 hour
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch prayer times', status: false },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', status: false },
      { status: 500 }
    );
  }
}