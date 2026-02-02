// Service to get accurate server time

export interface ServerTimeResponse {
  serverTime: Date;
}

export const getServerTime = async (): Promise<Date> => {
  try {
    // 🔥 FIX: Prevent relative fetch on server-side
    if (typeof window === 'undefined') {
      return new Date();
    }

    // Make a request to the server to get accurate time
    const response = await fetch('/api/time', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Prevent caching
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`HTTP error! status: ${response.status}`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return new Date(data.serverTime);
  } catch (error) {
    console.error('Failed to get server time, using local time as fallback:', error instanceof Error ? error.message : error);
    // Fallback to current time if server request fails
    return new Date();
  }
};