// Service to get accurate server time

export interface ServerTimeResponse {
  serverTime: Date;
}

export const getServerTime = async (): Promise<Date> => {
  try {
    // Make a request to the server to get accurate time
    const response = await fetch('/api/time', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return new Date(data.serverTime);
  } catch (error) {
    console.error('Failed to get server time:', error);
    // Fallback to current time if server request fails
    return new Date();
  }
};