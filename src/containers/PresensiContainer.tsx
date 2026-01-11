'use client';

import React, { useMemo, useEffect } from 'react';
import { useAppDataStore, useUIStore, useSunnahIbadahStore } from '@/store/store';
import PrayerCard, { PrayerCardSkeleton } from '@/components/PrayerCard';
import AttendanceSummary from '@/components/AttendanceSummary';
import IbadahCard from '@/components/IbadahCard';
import { PRAYERS } from '@/data/prayers';
import { fetchPrayerTimes } from '@/services/prayerTimeService';
import { submitAttendance } from '@/services/attendanceService';

const PresensiContainer: React.FC = () => {
    const { loggedInEmployee, allUsersData } = useAppDataStore();
    const {
        prayerTimes,
        prayerTimesLoading,
        activePrayerId,
        setLateEntryPrayerId,
        setActivePrayerId,
        openModal,
        locationStatus,
        setPrayerTimes,
        setPrayerTimesLoading,
        setLocationStatus,
        addToast
    } = useUIStore();
    const { sunnahIbadahList } = useSunnahIbadahStore();

    // 🔥 Load sunnah ibadah from Supabase on mount
    useEffect(() => {
        const loadSunnahIbadahFromSupabase = async () => {
            try {
                console.log('🕌 Loading sunnah ibadah from Supabase...');
                console.log('🕌 Current sunnahIbadahList in store:', sunnahIbadahList.length, sunnahIbadahList.map(i => i.name));

                const { getAllSunnahIbadah } = await import('@/services/sunnahIbadahService');
                const sunnahIbadahFromDb = await getAllSunnahIbadah();

                console.log('🕌 Data from Supabase:', sunnahIbadahFromDb.length, sunnahIbadahFromDb.map(i => ({ name: i.name, scheduleType: i.scheduleType })));

                // 🔥 If Supabase returns empty data, use defaults
                let finalData = sunnahIbadahFromDb;
                if (sunnahIbadahFromDb.length === 0) {
                    console.warn('⚠️ No data from Supabase, keeping existing store data');
                    // Don't replace with empty data, keep what's in the store (defaults from localStorage)
                    return;
                }

                // 🔥 REPLACE store data with data from Supabase (not merge!)
                const { setSunnahIbadahList } = useSunnahIbadahStore.getState();
                setSunnahIbadahList(finalData);
                console.log(`✅ Replaced sunnah ibadah list with ${finalData.length} items from Supabase`);
            } catch (error) {
                console.error('❌ Failed to load sunnah ibadah from Supabase:', error);
            }
        };

        loadSunnahIbadahFromSupabase();
    }, []); // Run once on mount

    // Fetch prayer times on mount
    useEffect(() => {
        const getLocationAndPrayerTimes = async () => {
            if (!loggedInEmployee) return;

            const userLocationId = loggedInEmployee.locationId;

            if (userLocationId) {
                setLocationStatus(`Menggunakan lokasi tersimpan: ${userLocationId}`);
            } else {
                // Try to get location from geolocation API
                if ('geolocation' in navigator) {
                    try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                timeout: 10000,
                                enableHighAccuracy: false
                            });
                        });

                        const cityId = '1301'; // Default to Jakarta for now
                        setLocationStatus(`Lokasi terdeteksi. Mengambil jadwal sholat...`);

                        // Update user profile with location
                        // Note: In a real app, you might want to match coordinates to city
                        const d = new Date();
                        const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                        try {
                            const times = await fetchPrayerTimes(cityId, today);
                            setPrayerTimes(times);
                        } catch (error) {
                            console.error("Error loading prayer times:", error);
                            setPrayerTimes(null);
                        } finally {
                            setPrayerTimesLoading(false);
                            setTimeout(() => setLocationStatus(null), 5000);
                        }
                        return;
                    } catch (error) {
                        console.error("Geolocation error:", error);
                        setLocationStatus('Tidak dapat mendeteksi lokasi. Menggunakan default: Jakarta (1301)');
                    }
                }
            }

            // Use stored location or default
            const locationId = userLocationId || '1301'; // Default to Jakarta
            const d = new Date();
            const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            try {
                const times = await fetchPrayerTimes(locationId, today);
                setPrayerTimes(times);
            } catch (error) {
                console.error("Error loading prayer times, will use static data.", error);
                setPrayerTimes(null);
            } finally {
                setPrayerTimesLoading(false);
                setTimeout(() => setLocationStatus(null), 5000);
            }
        };

        getLocationAndPrayerTimes();
    }, [loggedInEmployee, setPrayerTimes, setPrayerTimesLoading, setLocationStatus]);

    // Logic to determine prayersToDisplay (merged with prayerTimes)
    const prayersToDisplay = useMemo(() => {
        if (!prayerTimes) return PRAYERS;

        // Map prayer times from API to PRAYERS array
        return PRAYERS.map(p => {
            // Get the time from prayerTimes object by prayer id
            const time = prayerTimes[p.id as keyof typeof prayerTimes];

            if (time) {
                // Update the prayer with dynamic time from API
                return { ...p, time, startTime: time };
            }
            return p;
        });
    }, [prayerTimes]);

    const activeSunnahIbadah = useMemo(() => {
        // 🔥 FIX: Use Jakarta timezone for date filtering
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const dayOfWeek = jakartaTime.getDay();

        // Format date as YYYY-MM-DD in Jakarta timezone
        const year = jakartaTime.getFullYear();
        const month = String(jakartaTime.getMonth() + 1).padStart(2, '0');
        const day = String(jakartaTime.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        console.log('🕌 Filtering sunnah ibadah for today (Jakarta):', {
            jakartaToday: todayStr,
            dayOfWeek,
            dayName: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayOfWeek],
            totalIbadah: sunnahIbadahList.length,
            allIbadah: sunnahIbadahList.map(i => ({ name: i.name, scheduleType: i.scheduleType, daysOfWeek: i.daysOfWeek }))
        });

        const filtered = sunnahIbadahList.filter(ibadah => {
            const isDaily = ibadah.scheduleType === 'daily';
            const isWeekly = ibadah.scheduleType === 'weekly' && ibadah.daysOfWeek?.includes(dayOfWeek);
            const isOneTime = ibadah.scheduleType === 'one-time' && ibadah.date === todayStr;

            console.log(`  Checking ${ibadah.name}:`, {
                scheduleType: ibadah.scheduleType,
                daysOfWeek: ibadah.daysOfWeek,
                isDaily,
                isWeekly,
                isOneTime,
                willShow: isDaily || isWeekly || isOneTime
            });

            return isDaily || isWeekly || isOneTime;
        });

        console.log('✅ Active sunnah ibadah today:', filtered.length, filtered.map(i => i.name));

        return filtered;
    }, [sunnahIbadahList]);

    // Timer to check and update active prayer time based on Jakarta timezone
    useEffect(() => {
        const timer = setInterval(() => {
            // Get current time in Jakarta timezone (WIB/UTC+7)
            const now = new Date();
            const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

            // Debug logging (can be removed later)
            console.log('🕐 Debug Time Info:');
            console.log('  System Time:', now.toLocaleString('id-ID'));
            console.log('  Jakarta Time:', jakartaTime.toLocaleString('id-ID'));
            console.log('  Current Active Prayer:', activePrayerId);

            let newActivePrayerId: string | null = null;

            for (const prayer of prayersToDisplay) {
                const startTime = new Date(jakartaTime);
                const [startHour, startMinute] = prayer.startTime.split(':').map(Number);
                startTime.setHours(startHour, startMinute, 0, 0);

                const endTime = new Date(jakartaTime);
                const [endHour, endMinute] = prayer.endTime.split(':').map(Number);
                endTime.setHours(endHour, endMinute, 0, 0);

                console.log(`  ${prayer.name}: ${prayer.startTime} - ${prayer.endTime} (${startTime.toLocaleString('id-ID')} - ${endTime.toLocaleString('id-ID')})`);

                if (jakartaTime >= startTime && jakartaTime <= endTime) {
                    newActivePrayerId = prayer.id;
                    console.log(`  ✓ ACTIVE: ${prayer.name}`);
                    break;
                }
            }

            if (newActivePrayerId !== activePrayerId) {
                console.log(`  → Setting activePrayerId to: ${newActivePrayerId}`);
                setActivePrayerId(newActivePrayerId);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [prayersToDisplay, setActivePrayerId, activePrayerId]);

    if (!loggedInEmployee) return null;

    // Get attendance data for the logged in user - MUST be reactive to store changes
    const attendance = useMemo(() => {
        const rawAttendance = allUsersData[loggedInEmployee.id]?.attendance || {};

        // 🔥 CRITICAL FIX: Get today's date in Jakarta timezone (WIB/UTC+7)
        const now = new Date();
        const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const jakartaTodayStart = new Date(jakartaNow);
        jakartaTodayStart.setHours(0, 0, 0, 0);
        const jakartaTodayEnd = new Date(jakartaNow);
        jakartaTodayEnd.setHours(23, 59, 59, 999);

        console.log('📅 Today (Jakarta):', {
            now: jakartaNow.toLocaleString('id-ID'),
            start: jakartaTodayStart.toLocaleString('id-ID'),
            end: jakartaTodayEnd.toLocaleString('id-ID')
        });

        // Convert AttendanceRecord from Supabase to AttendanceStatus format
        // AttendanceRecord doesn't have 'submitted' field, so we add it
        // 🔥 CRITICAL: Filter to ONLY show today's attendance
        const convertedAttendance: Record<string, any> = {};

        Object.entries(rawAttendance).forEach(([key, record]: [string, any]) => {
            if (record && record.status) {
                const recordTimestamp = record.timestamp ? new Date(record.timestamp) : null;

                // 🔥 CRITICAL: Check if attendance is from TODAY (Jakarta timezone)
                const isToday = recordTimestamp &&
                                recordTimestamp >= jakartaTodayStart &&
                                recordTimestamp <= jakartaTodayEnd;

                console.log(`🔍 Checking ${key}:`, {
                    timestamp: recordTimestamp?.toLocaleString('id-ID'),
                    isToday,
                    willShow: isToday // Only show if it's today
                });

                // Only include if it's from today
                if (isToday) {
                    convertedAttendance[key] = {
                        status: record.status,
                        reason: record.reason || null,
                        timestamp: recordTimestamp.getTime(),
                        submitted: true,
                        isLateEntry: record.is_late_entry || false
                    };
                    console.log(`✅ Included ${key} (today):`, convertedAttendance[key]);
                } else {
                    console.log(`❌ Skipped ${key} (not today)`);
                }
            }
        });

        console.log('🔄 Attendance useMemo updated in PresensiContainer, converted keys:', Object.keys(convertedAttendance));
        return convertedAttendance;
    }, [allUsersData, loggedInEmployee.id]);

    // Note: Attendance submission is now handled directly with Supabase
    // This local function is kept for direct 'hadir' submissions without reason/lateness
    const handleDirectAttendanceSubmission = async (entityId: string, status: 'hadir' | 'tidak-hadir') => {
        if (!loggedInEmployee || status !== 'hadir') return; // Only handle 'hadir' directly

        // Check geolocation for 'hadir' status
        setLocationStatus('Memeriksa lokasi Anda...');

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 10000,
                    enableHighAccuracy: false
                });
            });

            const { latitude, longitude } = position.coords;
            setLocationStatus(`Lokasi terverifikasi: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

            // 🔥 CRITICAL: Submit to Supabase FIRST
            try {
                await submitAttendance(
                    loggedInEmployee.id,
                    entityId,
                    'hadir',
                    null, // reason
                    false, // isLateEntry
                    { latitude, longitude }
                );
                console.log('✅ Attendance submitted to Supabase');

                // 🔄 AUTO-REFRESH: Reload attendance data from Supabase to ensure sync
                try {
                    const { getEmployeeAttendance } = await import('@/services/attendanceService');
                    const updatedAttendance = await getEmployeeAttendance(loggedInEmployee.id);
                    console.log('🔄 Refreshed attendance data from Supabase');

                    // Update local state with fresh data from Supabase
                    const { setAllUsersData } = useAppDataStore.getState();
                    setAllUsersData(prev => {
                        const allDataCopy = JSON.parse(JSON.stringify(prev));
                        if (!allDataCopy[loggedInEmployee.id]) return prev;

                        // Convert Supabase format to local format
                        const convertedAttendance: Record<string, any> = {};
                        Object.entries(updatedAttendance).forEach(([key, record]: [string, any]) => {
                            if (record && record.status) {
                                convertedAttendance[key] = {
                                    status: record.status,
                                    reason: record.reason || null,
                                    timestamp: record.timestamp ? new Date(record.timestamp).getTime() : null,
                                    submitted: true,
                                    isLateEntry: record.is_late_entry || false
                                };
                            }
                        });

                        allDataCopy[loggedInEmployee.id].attendance = convertedAttendance;
                        return allDataCopy;
                    });
                } catch (refreshError) {
                    console.error('⚠️ Failed to refresh attendance data:', refreshError);
                    // Don't fail the whole flow if refresh fails
                }
            } catch (supabaseError) {
                console.error('❌ Failed to submit to Supabase:', supabaseError);
                addToast('Gagal menyimpan ke database. Silakan coba lagi.', 'error');
                setTimeout(() => setLocationStatus(null), 3000);
                return;
            }

            // This local state update is now redundant but kept as fallback
            const { setAllUsersData } = useAppDataStore.getState();
            setAllUsersData(prev => {
                const allDataCopy = JSON.parse(JSON.stringify(prev));
                const userToUpdateData = allDataCopy[loggedInEmployee.id];
                if (!userToUpdateData) return prev;

                if (!userToUpdateData.attendance) userToUpdateData.attendance = {};
                userToUpdateData.attendance[entityId] = {
                    status: 'hadir',
                    reason: null,
                    timestamp: Date.now(),
                    submitted: true,
                    isLateEntry: false,
                    location: { latitude, longitude }
                };

                return allDataCopy;
            });

            addToast('Presensi berhasil dicatat', 'success');

            // Clear status after delay
            setTimeout(() => setLocationStatus(null), 3000);
        } catch (error) {
            setLocationStatus('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
            setTimeout(() => setLocationStatus(null), 3000);
            return;
        }
    };

    const handleAttendance = (entityId: string, status: 'hadir' | 'tidak-hadir') => {
        if (status === 'tidak-hadir') {
            openModal(entityId, entityId);
        } else {
            handleDirectAttendanceSubmission(entityId, 'hadir');
        }
    };

    return (
        <div>
            {locationStatus && (
                <div className="mb-4 p-3 bg-blue-500/30 text-blue-200 text-center rounded-lg animate-fade-in" role="status">
                    {locationStatus}
                </div>
            )}
            <h2 className="text-xl font-bold text-white mb-4">Sholat Wajib</h2>
            {prayerTimesLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => <PrayerCardSkeleton key={index} />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {prayersToDisplay.map(prayer => {
                        // Use Jakarta timezone for time comparison
                        const now = new Date();
                        const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                        const endTime = new Date(jakartaTime);
                        const [endHour, endMinute] = prayer.endTime.split(':').map(Number);
                        endTime.setHours(endHour, endMinute, 0, 0);

                        return (
                            <PrayerCard
                                key={prayer.id}
                                prayer={prayer}
                                attendanceStatus={attendance[prayer.id]}
                                isActive={activePrayerId === prayer.id}
                                isTimePast={jakartaTime > endTime && !attendance[prayer.id]?.submitted}
                                onHadir={() => handleAttendance(prayer.id, 'hadir')}
                                onTidakHadir={() => openModal(prayer.id, prayer.name)}
                                onUbah={() => { }}
                                onStartLateEntry={() => {
                                    setLateEntryPrayerId(prayer.id);
                                    openModal(prayer.id, prayer.name);
                                }}
                            />
                        );
                    })}
                </div>
            )}
            <AttendanceSummary
                wajibCount={prayersToDisplay.filter(p => p.type === 'wajib').length}
                attendedWajibCount={Object.keys(attendance).filter(id => attendance[id].status === 'hadir' && prayersToDisplay.some(p => p.id === id && p.type === 'wajib')).length}
            />

            {activeSunnahIbadah.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-white mb-4">Ibadah Sunnah Hari Ini</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {activeSunnahIbadah.map(ibadah => (
                            <IbadahCard
                                key={ibadah.id}
                                ibadah={ibadah}
                                attendanceStatus={attendance[ibadah.id]}
                                onHadir={() => handleAttendance(ibadah.id, 'hadir')}
                                onTidakHadir={() => openModal(ibadah.id, ibadah.name)}
                                onUbah={() => { }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PresensiContainer;
