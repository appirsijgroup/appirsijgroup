'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppDataStore } from '@/store/store';
import PrayerCard, { PrayerCardSkeleton } from '@/components/PrayerCard';
import AttendanceSummary from '@/components/AttendanceSummary';
import IbadahCard from '@/components/IbadahCard';
import { PRAYERS } from '@/data/prayers';
import { fetchPrayerTimes, type PrayerTimesData } from '@/services/prayerTimeService';
import { submitAttendance, getEmployeeAttendance } from '@/services/attendanceService';

const PresensiComponent: React.FC = () => {
  const { loggedInEmployee, allUsersData, setAllUsersData, setLoggedInEmployee } = useAppDataStore();

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activePrayerId, setActivePrayerId] = useState<string | null>(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    entityId: '',
    entityName: '',
    isLateEntry: false
  });

  // Load attendance from Supabase on mount
  useEffect(() => {
    const loadAttendanceFromSupabase = async () => {
      if (!loggedInEmployee?.id) return;

      try {
        const attendanceData = await getEmployeeAttendance(loggedInEmployee.id);

        // Update store with fresh attendance data
        setAllUsersData(prev => {
          const allDataCopy = JSON.parse(JSON.stringify(prev));
          if (!allDataCopy[loggedInEmployee.id]) {
            allDataCopy[loggedInEmployee.id] = {
              employee: loggedInEmployee,
              attendance: {},
              history: {}
            };
          }
          allDataCopy[loggedInEmployee.id].attendance = attendanceData;
          return allDataCopy;
        });

      } catch (error) {
        // Don't throw - allow page to render with empty attendance
      }
    };

    loadAttendanceFromSupabase();
  }, [loggedInEmployee?.id]); // Only re-run if employee ID changes

  // Fetch prayer times on mount - AUTO DETECT dari timezone browser
  useEffect(() => {
    const loadPrayerTimes = async () => {
      if (!loggedInEmployee) return;

      // 🔥 SIMPLE: Default Jakarta untuk semua (bisa diubah nanti jika perlu)
      const locationId = '1301'; // Jakarta

      const d = new Date();
      const today = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

      try {
        const times = await fetchPrayerTimes(locationId, today);
        setPrayerTimes(times);
      } catch (error) {
        setPrayerTimes(null);
      } finally {
        setPrayerTimesLoading(false);
      }
    };

    loadPrayerTimes();
  }, [loggedInEmployee]);

  // Get attendance data for the logged in user - MUST be reactive to store changes
  const attendance = useMemo(() => {
    const rawAttendance = loggedInEmployee?.id ? (allUsersData[loggedInEmployee.id]?.attendance || {}) : {};

    // 🔥 CRITICAL FIX: Get today's date in Jakarta timezone (WIB/UTC+7)
    const now = new Date();
    const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const jakartaTodayStart = new Date(jakartaNow);
    jakartaTodayStart.setHours(0, 0, 0, 0);
    const jakartaTodayEnd = new Date(jakartaNow);
    jakartaTodayEnd.setHours(23, 59, 59, 999);


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


        // Only include if it's from today
        if (isToday) {
          convertedAttendance[key] = {
            status: record.status,
            reason: record.reason || null,
            timestamp: recordTimestamp.getTime(),
            submitted: true,
            isLateEntry: record.is_late_entry || false
          };
        } else {
        }
      }
    });

    return convertedAttendance;
  }, [loggedInEmployee?.id, allUsersData]);

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

  // Helper function to sync attendance to monthlyActivities
  const syncAttendanceToMonthlyActivities = async (entityId: string, status: 'hadir' | 'tidak-hadir') => {
    if (!loggedInEmployee || status !== 'hadir') return; // Only sync hadir attendance

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const dayKey = now.getDate().toString().padStart(2, '0');

      // Get current monthlyActivities
      const currentActivities = loggedInEmployee.monthlyActivities || {};
      const monthActivities = currentActivities[currentMonth] || {};
      const dayActivities = monthActivities[dayKey] || {};

      // Mark shalat_berjamaah as done
      const updatedDayActivities = {
        ...dayActivities,
        'shalat_berjamaah': true
      };

      // 🔥 FIX: BERSIHKAN data sebelum disimpan!
      // Filter out any foreign fields from monthActivities
      const cleanedMonthActivities: any = {};
      Object.keys(monthActivities).forEach(key => {
        // HANYA simpan jika key adalah 2 digit angka (tanggal 01-31)
        if (key.match(/^\d{2}$/)) {
          cleanedMonthActivities[key] = monthActivities[key];
        }
        // Field asing (kie, doaBersama, dll) akan DIHAPUS!
      });

      const updatedMonthActivities = {
        ...cleanedMonthActivities,
        [dayKey]: updatedDayActivities
      };

      const updatedMonthlyActivities = {
        ...currentActivities,
        [currentMonth]: updatedMonthActivities
      };

      // Save to Supabase
      const { updateMonthlyProgress } = await import('@/services/monthlyActivityService');
      await updateMonthlyProgress(loggedInEmployee.id, currentMonth, updatedMonthActivities);

      // Update employee in store
      const updatedEmployee = {
        ...loggedInEmployee,
        monthlyActivities: updatedMonthlyActivities
      };
      setLoggedInEmployee(updatedEmployee);

      // ALSO UPDATE allUsersData to ensure Dashboard sees the change
      setAllUsersData(prev => {
        const allDataCopy = JSON.parse(JSON.stringify(prev));
        if (allDataCopy[loggedInEmployee.id]) {
          allDataCopy[loggedInEmployee.id].employee = updatedEmployee;
        }
        return allDataCopy;
      });

    } catch (error) {
    }
  };

  // Timer to check and update active prayer time based on Jakarta timezone
  useEffect(() => {
    const timer = setInterval(() => {
      // Get current time in Jakarta timezone (WIB/UTC+7)
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

      let newActivePrayerId: string | null = null;

      for (const prayer of prayersToDisplay) {
        const startTime = new Date(jakartaTime);
        const [startHour, startMinute] = prayer.startTime.split(':').map(Number);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(jakartaTime);
        const [endHour, endMinute] = prayer.endTime.split(':').map(Number);
        endTime.setHours(endHour, endMinute, 0, 0);

        if (jakartaTime >= startTime && jakartaTime <= endTime) {
          newActivePrayerId = prayer.id;
          break;
        }
      }

      // Log HANYA saat active prayer berubah
      if (newActivePrayerId !== activePrayerId) {
        setActivePrayerId(newActivePrayerId);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [prayersToDisplay, activePrayerId]);

  const handleAttendanceSubmission = async (entityId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null, isLateEntry: boolean = false) => {
    if (!loggedInEmployee) return;

    try {
      if (status === 'hadir') {
        setStatusMessage('⏳ Mencatat presensi...');

        // 🔥 SUPER SIMPLE: Langsung submit tanpa location apapun
        const record = await submitAttendance(
          loggedInEmployee.id,
          entityId,
          'hadir',
          null,
          false
          // ❌ Tidak ada location parameter sama sekali
        );


        // 🔄 AUTO-REFRESH: Reload attendance data from Supabase to ensure sync
        try {
          const updatedAttendance = await getEmployeeAttendance(loggedInEmployee.id);

          setAllUsersData(prev => {
            const allDataCopy = JSON.parse(JSON.stringify(prev));
            if (allDataCopy[loggedInEmployee.id]) {
              // Convert Supabase format to local format
              const convertedAttendance: Record<string, any> = {};
              Object.entries(updatedAttendance).forEach(([key, rec]: [string, any]) => {
                if (rec && rec.status) {
                  convertedAttendance[key] = {
                    status: rec.status,
                    reason: rec.reason || null,
                    timestamp: rec.timestamp ? new Date(rec.timestamp).getTime() : null,
                    submitted: true,
                    isLateEntry: rec.is_late_entry || false
                  };
                }
              });
              allDataCopy[loggedInEmployee.id].attendance = convertedAttendance;
            }
            return allDataCopy;
          });
        } catch (refreshError) {
          // Fallback to using the returned record
          setAllUsersData(prev => {
            const allDataCopy = JSON.parse(JSON.stringify(prev));
            if (allDataCopy[loggedInEmployee.id]) {
              if (!allDataCopy[loggedInEmployee.id].attendance) {
                allDataCopy[loggedInEmployee.id].attendance = {};
              }
              allDataCopy[loggedInEmployee.id].attendance[entityId] = record;
            }
            return allDataCopy;
          });
        }

        await syncAttendanceToMonthlyActivities(entityId, 'hadir');
        setStatusMessage('✅ Presensi berhasil!');
        setTimeout(() => setStatusMessage(null), 2000);
      } else {
        // Submit 'tidak-hadir' without location
        const record = await submitAttendance(
          loggedInEmployee.id,
          entityId,
          'tidak-hadir',
          reason,
          isLateEntry
        );

        // 🔄 AUTO-REFRESH: Reload attendance data from Supabase
        try {
          const updatedAttendance = await getEmployeeAttendance(loggedInEmployee.id);

          setAllUsersData(prev => {
            const allDataCopy = JSON.parse(JSON.stringify(prev));
            if (allDataCopy[loggedInEmployee.id]) {
              // Convert Supabase format to local format
              const convertedAttendance: Record<string, any> = {};
              Object.entries(updatedAttendance).forEach(([key, rec]: [string, any]) => {
                if (rec && rec.status) {
                  convertedAttendance[key] = {
                    status: rec.status,
                    reason: rec.reason || null,
                    timestamp: rec.timestamp ? new Date(rec.timestamp).getTime() : null,
                    submitted: true,
                    isLateEntry: rec.is_late_entry || false
                  };
                }
              });
              allDataCopy[loggedInEmployee.id].attendance = convertedAttendance;
            }
            return allDataCopy;
          });
        } catch (refreshError) {
          // Fallback to using the returned record
          setAllUsersData(prev => {
            const allDataCopy = JSON.parse(JSON.stringify(prev));
            if (allDataCopy[loggedInEmployee.id]) {
              if (!allDataCopy[loggedInEmployee.id].attendance) {
                allDataCopy[loggedInEmployee.id].attendance = {};
              }
              allDataCopy[loggedInEmployee.id].attendance[entityId] = record;
            }
            return allDataCopy;
          });
        }

        await syncAttendanceToMonthlyActivities(entityId, 'tidak-hadir');
        setStatusMessage('✅ Berhasil dicatat!');
        setTimeout(() => setStatusMessage(null), 2000);
      }
    } catch (error) {
      setStatusMessage('❌ Gagal. Silakan coba lagi.');
      setTimeout(() => setStatusMessage(null), 2000);
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

  if (!loggedInEmployee) return null;

  return (
    <div>
      {/* Simple status message */}
      {statusMessage && (
        <div className="mb-4 p-3 bg-teal-500/30 text-teal-200 text-center rounded-lg animate-fade-in" role="status">
          {statusMessage}
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

            // 🔥 FIX: Check if attendance exists AND is submitted before showing late entry button
            const attendanceRecord = attendance[prayer.id];
            const isSubmitted = !!attendanceRecord?.submitted;
            const isTimePast = jakartaTime > endTime && !isSubmitted;

            return (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                attendanceStatus={attendanceRecord}
                isActive={activePrayerId === prayer.id}
                isTimePast={isTimePast}
                onHadir={() => handleAttendance(prayer.id, 'hadir')}
                onTidakHadir={() => handleAttendance(prayer.id, 'tidak-hadir')}
                onUbah={() => { }}
                onStartLateEntry={() => handleOpenModal(prayer.id, prayer.name, true)}
              />
            );
          })}
        </div>
      )}
      <AttendanceSummary
        wajibCount={prayersToDisplay.filter(p => p.type === 'wajib').length}
        attendedWajibCount={Object.keys(attendance).filter(id => attendance[id].status === 'hadir' && prayersToDisplay.some(p => p.id === id && p.type === 'wajib')).length}
      />

      {/* Unified Modal for Late Entry and Absence */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">
              {modalState.isLateEntry ? `Presensi Terlambat: ${modalState.entityName}` : `Alasan Tidak Hadir: ${modalState.entityName}`}
            </h3>
            <p className="text-blue-200 mb-6">
              {modalState.isLateEntry
                ? `Silakan tulis alasan Anda terlambat melakukan presensi untuk ${modalState.entityName}:`
                : `Silakan tulis alasan Anda tidak hadir untuk ${modalState.entityName}:`
              }
            </p>
            <textarea
              autoFocus
              className="w-full bg-gray-700 text-white border border-white/20 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
              rows={4}
              placeholder={modalState.isLateEntry ? "Contoh: Terjebat macet, lupa, dll." : "Contoh: Sakit, Izin, Dinas luar, dll"}
              id="attendance-reason"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2 px-4 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-500 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const reasonInput = document.getElementById('attendance-reason') as HTMLTextAreaElement;
                  const reason = reasonInput?.value || (modalState.isLateEntry ? 'Presensi terlambat' : 'Tidak hadir');
                  handleAttendanceSubmission(modalState.entityId, modalState.isLateEntry ? 'hadir' : 'tidak-hadir', reason, modalState.isLateEntry);
                  handleCloseModal();
                }}
                className={`flex-1 py-2 px-4 rounded-lg text-white font-semibold transition-colors ${
                  modalState.isLateEntry ? 'bg-teal-500 hover:bg-teal-400' : 'bg-red-500 hover:bg-red-400'
                }`}
              >
                {modalState.isLateEntry ? 'Ajukan' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresensiComponent;