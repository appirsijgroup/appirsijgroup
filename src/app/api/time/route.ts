// API route to provide accurate server time

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return current server time
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    timestamp: Date.now(),
  });
}