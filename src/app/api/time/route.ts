// API route to provide accurate server time

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return current server time
    return NextResponse.json({
      serverTime: new Date().toISOString(),
      timestamp: Date.now(),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Error in /api/time:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}