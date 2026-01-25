'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDataStore } from '@/store/store';
import PrayerCard, { PrayerCardSkeleton } from '@/components/PrayerCard';
import AttendanceSummary from '@/components/AttendanceSummary';
import IbadahCard from '@/components/IbadahCard';
import { PRAYERS } from '@/data/prayers';
import { fetchPrayerTimes, PrayerTimesData } from '@/services/prayerTimeService';
import AttendanceModalSimple from '@/components/AttendanceModalSimple';
import { submitAttendance } from '@/services/attendanceService';
import { getTodayLocalDateString } from '@/utils/dateUtils';

const PresensiComponent: React.FC = () => {
  const { loggedInEmployee } = useAppDataStore();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, any>>({});
  const [modalState, setModalState] = useState({
    isOpen: false,
    entityId: '',
    entityName: '',
    isLateEntry: false
  });

  // Fetch attendance records for the logged-in employee
  useEffect(() => {
    if (!loggedInEmployee) return;

    const fetchAttendance = async () => {
      try {
        // In a real implementation, you would fetch from Supabase
        // For now, we'll simulate with an empty object
        setAttendance({});
      } catch (error) {
      }
    };

    fetchAttendance();
  }, [loggedInEmployee]);

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
              setPrayerTimes(null);
            } finally {
              setPrayerTimesLoading(false);
              setTimeout(() => setLocationStatus(null), 5000);
            }
            return;
          } catch (error) {
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
        setPrayerTimes(null);
      } finally {
        setPrayerTimesLoading(false);
        setTimeout(() => setLocationStatus(null), 5000);
      }
    };

    getLocationAndPrayerTimes();
  }, [loggedInEmployee]);

  // Logic to determine prayersToDisplay (merged with prayerTimes)
  const prayersToDisplay = useMemo(() => {
    // Get current day in Jakarta timezone
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentDay = jakartaTime.getDay(); // 0=Sunday, 5=Friday, 6=Saturday

    // Filter prayers based on day (Friday prayer only on Friday)
    const filteredPrayers = PRAYERS.filter(p => {
      // If it's a Friday-only prayer, only show on Friday (day 5)
      if (p.isFridayOnly) {
        return currentDay === 5; // 5 = Friday
      }
      return true;
    });

    if (!prayerTimes) return filteredPrayers;

    // Map prayer times from API to filtered prayers array
    return filteredPrayers.map(p => {
      // Get the time from prayerTimes object by prayer id
      const time = prayerTimes[p.id as keyof typeof prayerTimes];

      if (time) {
        // Update the prayer with dynamic time from API
        return { ...p, time, startTime: time };
      }
      return p;
    });
  }, [prayerTimes]);

  const handleAttendanceSubmission = async (entityId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null, isLateEntry: boolean = false) => {
    if (!loggedInEmployee) return;

    if (status === 'hadir') {
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

        // 🔥 FIX: Use unique entityId for each date to prevent overwriting
        const dateStr = getTodayLocalDateString();
        const fullEntityId = `${entityId}-${dateStr}`;

        // Submit to Supabase
        await submitAttendance(
          loggedInEmployee.id,
          fullEntityId,
          'hadir',
          null,
          false,
          { latitude, longitude }
        );

        // Update local state
        setAttendance(prev => ({
          ...prev,
          [entityId]: { // Keep key as entityId (sholat id) for UI mapping
            status: 'hadir',
            reason: null,
            timestamp: Date.now(),
            submitted: true,
            isLateEntry: false,
            location: { latitude, longitude }
          }
        }));

        // Clear status after delay
        setTimeout(() => setLocationStatus(null), 3000);
      } catch (error) {
        setLocationStatus('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
        setTimeout(() => setLocationStatus(null), 3000);
        return;
      }
    } else {
      // 🔥 FIX: Use unique entityId for each date to prevent overwriting
      const dateStr = getTodayLocalDateString();
      const fullEntityId = `${entityId}-${dateStr}`;

      // Submit to Supabase for 'tidak-hadir'
      await submitAttendance(
        loggedInEmployee.id,
        fullEntityId,
        'tidak-hadir',
        reason,
        isLateEntry
      );

      // Update local state
      setAttendance(prev => ({
        ...prev,
        [entityId]: { // Keep key as entityId (sholat id) for UI mapping
          status,
          reason,
          timestamp: Date.now(),
          submitted: true,
          isLateEntry
        }
      }));
    }
  };

  const handleAttendance = (entityId: string, status: 'hadir' | 'tidak-hadir') => {
    if (status === 'tidak-hadir') {
      setModalState({
        isOpen: true,
        entityId,
        entityName: entityId, // In a real implementation, you'd want to find the actual name
        isLateEntry: false
      });
    } else {
      handleAttendanceSubmission(entityId, 'hadir', null, false);
    }
  };

  const handleOpenModal = (entityId: string, entityName: string, isLateEntry: boolean = false) => {
    setModalState({
      isOpen: true,
      entityId,
      entityName,
      isLateEntry
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      entityId: '',
      entityName: '',
      isLateEntry: false
    });
  };

  const handleModalSubmit = async (status: 'hadir' | 'tidak-hadir', reason: string | null, isLateEntry: boolean) => {
    if (modalState.entityId) {
      await handleAttendanceSubmission(modalState.entityId, status, reason, isLateEntry);
    }
  };

  if (!loggedInEmployee) return null;

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
            const now = new Date();
            const endTime = new Date();
            const [endHour, endMinute] = prayer.endTime.split(':').map(Number);
            endTime.setHours(endHour, endMinute, 0, 0);

            // 🔥 FIX: Check if attendance exists AND is submitted before showing late entry button
            const attendanceRecord = attendance[prayer.id];
            const isSubmitted = !!attendanceRecord?.submitted;
            const isTimePast = now > endTime && !isSubmitted;

            return (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                attendanceStatus={attendanceRecord}
                isActive={false} // Simplified for demo purposes
                isTimePast={isTimePast}
                onHadir={() => handleAttendance(prayer.id, 'hadir')}
                onTidakHadir={() => handleAttendance(prayer.id, 'tidak-hadir')}
                onUbah={() => { }}
              />
            );
          })}
        </div>
      )}
      <AttendanceSummary
        wajibCount={prayersToDisplay.filter(p => p.type === 'wajib').length}
        attendedWajibCount={Object.keys(attendance).filter(id => attendance[id].status === 'hadir' && prayersToDisplay.some(p => p.id === id && p.type === 'wajib')).length}
      />

      {/* Attendance Modal */}
      <AttendanceModalSimple
        isOpen={modalState.isOpen}
        entityId={modalState.entityId}
        entityName={modalState.entityName}
        isLateEntry={modalState.isLateEntry}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default PresensiComponent;