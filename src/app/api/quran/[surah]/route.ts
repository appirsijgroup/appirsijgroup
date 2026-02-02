import { NextRequest, NextResponse } from 'next/server';

const QURAN_API_BASE_URL = 'https://equran.id/api/v2';
const CACHE_DURATION = 3600; // 1 hour in seconds

// Simple in-memory cache (for production, consider using Redis or similar)
const cache = new Map<string, { data: any; timestamp: number }>();

async function fetchWithRetry(url: string, maxRetries = 3, delay = 1000): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
        try {

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                // Add timeout
                signal: AbortSignal.timeout(15000), // 15 second timeout
            });

            if (response.ok) {
                return response;
            }

            if (response.status === 503 || response.status >= 500) {
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
                    continue;
                }
            }

            return response;
        } catch (error) {
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                continue;
            }
            throw error;
        }
    }

    throw new Error('Max retries exceeded');
}

export async function GET(
    request: NextRequest,
    { params }: { params: { surah: string } }
) {
    try {
        const surahNumber = params.surah;

        // Validate surah number
        const surahNum = parseInt(surahNumber, 10);
        if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
            return NextResponse.json(
                { error: 'Invalid surah number. Must be between 1 and 114.' },
                { status: 400 }
            );
        }

        // Check cache
        const cacheKey = `surah-${surahNum}`;
        const cached = cache.get(cacheKey);

        if (cached) {
            const age = (Date.now() - cached.timestamp) / 1000;
            if (age < CACHE_DURATION) {
                return NextResponse.json(cached.data, {
                    headers: {
                        'X-Cache': 'HIT',
                        'Cache-Control': `public, max-age=${CACHE_DURATION}`,
                    },
                });
            } else {
                // Remove expired cache
                cache.delete(cacheKey);
            }
        }


        // Fetch from equran.id API with retry
        const apiUrl = `${QURAN_API_BASE_URL}/surat/${surahNum}`;
        const response = await fetchWithRetry(apiUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch surah: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Validate response
        if (!data || data.code !== 200 || !data.data) {
            return NextResponse.json(
                { error: 'Invalid API response' },
                { status: 502 }
            );
        }

        // Cache the response
        cache.set(cacheKey, {
            data: data,
            timestamp: Date.now(),
        });


        // Return response with cache headers
        return NextResponse.json(data, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': `public, max-age=${CACHE_DURATION}`,
            },
        });

    } catch (error) {

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
