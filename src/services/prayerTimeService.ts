
const API_BASE_URL = 'https://api.myquran.com/v2';

export interface City {
    id: string;
    lokasi: string;
}

export interface PrayerTimesData {
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
    terbit: string;
}

export const fetchCities = async (): Promise<City[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/sholat/kota/semua`);
        if (!response.ok) {
            throw new Error('Gagal mengambil daftar kota');
        }
        const data = await response.json();
        if (data.status && Array.isArray(data.data)) {
             return data.data;
        }
        throw new Error(data.message || 'Format data kota tidak valid');
    } catch (error) {
        throw error;
    }
};

export const getCityFromCoords = async (lat: number, lon: number): Promise<string | null> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        // Nominatim provides city, town, village, etc. depending on location density. We try them in order.
        const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
        // Remove "Kota " or "Kabupaten " prefix for better search results on myquran API
        return city ? city.replace(/(kota|kabupaten)\s/i, '').trim() : null;
    } catch (error) {
        return null;
    }
};

export const searchCity = async (cityName: string): Promise<City | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/sholat/kota/cari/${encodeURIComponent(cityName)}`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        if (data.status && Array.isArray(data.data) && data.data.length > 0) {
            return data.data[0]; // Return the first, most likely match
        }
        return null;
    } catch (error) {
        return null;
    }
};

export const fetchPrayerTimes = async (locationId: string, date: string): Promise<PrayerTimesData | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/sholat/jadwal/${locationId}/${date}`);
        if (!response.ok) {
            throw new Error(`Gagal mengambil jadwal sholat untuk lokasi ${locationId}`);
        }
        const data = await response.json();
         if (data.status && data.data && data.data.jadwal) {
            return data.data.jadwal;
        }
        return null;
    } catch (error) {
        return null;
    }
};