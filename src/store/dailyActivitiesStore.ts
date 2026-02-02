import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyActivity } from '@/types';
import { DAILY_ACTIVITIES as DEFAULT_ACTIVITIES } from '@/data/monthlyActivities';

interface DailyActivitiesState {
    dailyActivitiesConfig: DailyActivity[];
    updateDailyActivitiesConfig: (newConfig: DailyActivity[]) => void;
}

export const useDailyActivitiesStore = create<DailyActivitiesState>()(
    persist(
        (set) => ({
            dailyActivitiesConfig: DEFAULT_ACTIVITIES,
            updateDailyActivitiesConfig: (newConfig) => {
                set({ dailyActivitiesConfig: newConfig });
            },
        }),
        {
            name: 'daily-activities-config-storage',
        }
    )
);
