import { useQuery } from '@tanstack/react-query';
import type { City } from '@/services/prayerTimeService';
import { fetchCities } from '@/services/prayerTimeService';

const CITIES_QUERY_KEY = ['cities'];

/**
 * Hook untuk fetch cities dengan React Query
 * Digunakan untuk location selector di profile page
 *
 * SEBELUM: useState + useEffect di setiap component
 * SEKARANG: Centralized dengan React Query (caching, deduplication)
 */
export function useCities() {
    return useQuery<City[]>({
        queryKey: CITIES_QUERY_KEY,
        queryFn: fetchCities,
        staleTime: 1000 * 60 * 60, // 1 hour - cities data jarang berubah
        gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
    });
}

/**
 * Hook untuk prefetch cities (optimasi navigasi)
 */
export function usePrefetchCities() {
    // Prefetch akan diimplementasikan di Navigation component atau DataInitializer
    // untuk memastikan cities data sudah tersedia sebelum user masuk ke profile page
}
