'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDataStore, useUIStore } from '@/store/store';
import { useActivityStore } from '@/store/activityStore';
import PrayerCard, { PrayerCardSkeleton } from '@/components/PrayerCard';
import AttendanceSummary from '@/components/AttendanceSummary';
import { PRAYERS } from '@/data/prayers';
import { fetchPrayerTimes, type PrayerTimesData } from '@/services/prayerTimeService';
import { submitAttendance, getEmployeeAttendance } from '@/services/attendanceService';
import { submitScheduledAttendance, getEmployeeActivitiesAttendance } from '@/services/scheduledActivityService';
import { createTeamAttendanceRecord, getAllTeamAttendanceRecordsForUser } from '@/services/teamAttendanceService';
import { getTodayLocalDateString, getCurrentTime } from '@/utils/dateUtils';
import { useGuidanceStore } from '@/store/guidanceStore';
import { useNotificationStore } from '@/store/notificationStore';
import { UnifiedManualRequestModal } from './UnifiedManualRequestModal';
import { isAnyAdmin } from '@/lib/rolePermissions';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Video,
  Youtube,
  Check,
  X,
  Pencil,
  Users,
  LayoutGrid,
  ListIcon,
  ChevronRight,
  Info,
  PlusCircle
} from 'lucide-react';
import type { Activity, TeamAttendanceSession, Attendance, AttendanceStatus, TadarusRequest, MissedPrayerRequest } from '@/types';

// Helper to check if employee matches rules
const doesEmployeeMatchRules = (employee: any, rules: any): boolean => {
  if (!rules) return true;
  if (rules.hospitalIds && rules.hospitalIds.length > 0 && !rules.hospitalIds.includes(employee.hospitalId || '')) return false;
  if (rules.units && rules.units.length > 0 && !rules.units.includes(employee.unit)) return false;
  if (rules.bagians && rules.bagians.length > 0 && !rules.bagians.includes(employee.bagian)) return false;
  if (rules.professionCategories && rules.professionCategories.length > 0 && !rules.professionCategories.includes(employee.professionCategory)) return false;
  if (rules.professions && rules.professions.length > 0 && !rules.professions.includes(employee.profession)) return false;
  return true;
};

const PresensiComponent: React.FC = () => {
  const { loggedInEmployee, allUsersData, setAllUsersData, setLoggedInEmployee, refreshActivityStats } = useAppDataStore();
  const { activities, teamAttendanceSessions, teamAttendanceRecords, loadActivitiesFromSupabase, loadTeamAttendanceSessionsFromSupabase } = useActivityStore();
  const { addOrUpdateTadarusRequest, addOrUpdateMissedPrayerRequest } = useGuidanceStore();
  const { createNotification } = useNotificationStore();
  const { addToast } = useUIStore();

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimesData | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null);
  const [activePrayerId, setActivePrayerId] = useState<string | null>(null);
  const [activityAttendance, setActivityAttendance] = useState<Attendance>({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    entityId: string;
    entityName: string;
    isLateEntry: boolean;
    type: 'prayer' | 'activity';
  }>({
    isOpen: false,
    entityId: '',
    entityName: '',
    isLateEntry: false,
    type: 'prayer'
  });

  const [isManualRequestModalOpen, setIsManualRequestModalOpen] = useState(false);

  // Load everything on mount
  useEffect(() => {
    const initData = async () => {
      if (!loggedInEmployee?.id) return;

      try {
        // 1. Load Prayer Attendance
        const prayerAtt = await getEmployeeAttendance(loggedInEmployee.id);

        // 2. Load Activities & Team Sessions
        await Promise.all([
          loadActivitiesFromSupabase(loggedInEmployee.id),
          loadTeamAttendanceSessionsFromSupabase()
        ]);

        // 3. Load Activity Attendance
        const actAtt = await getEmployeeActivitiesAttendance(loggedInEmployee.id);
        const teamRecords = await getAllTeamAttendanceRecordsForUser(loggedInEmployee.id);

        const convertedAtt: Attendance = {};

        // Activity Map
        Object.entries(actAtt).forEach(([key, record]) => {
          const entry: AttendanceStatus = {
            status: record.status as 'hadir' | 'tidak-hadir' | null,
            submitted: true,
            isLateEntry: record.isLateEntry,
            timestamp: Date.now()
          };
          convertedAtt[key] = entry;
        });

        // Team Records Map
        teamRecords.forEach(record => {
          const entry: AttendanceStatus = {
            status: 'hadir',
            submitted: true,
            timestamp: record.attendedAt
          };
          convertedAtt[`team-${record.sessionId}`] = entry;
        });

        setActivityAttendance(convertedAtt);
        setIsLoadingActivities(false);

        // Update Global Store for Prayer Attendance
        setAllUsersData(prev => {
          const newState = { ...prev };
          if (!newState[loggedInEmployee.id]) {
            newState[loggedInEmployee.id] = { employee: loggedInEmployee, attendance: {}, history: {} };
          }
          newState[loggedInEmployee.id].attendance = prayerAtt;
          return newState;
        });

      } catch (error) {
        console.error('Error initializing daily attendance:', error);
      }
    };

    initData();
  }, [loggedInEmployee?.id]);

  // Fetch prayer times
  useEffect(() => {
    const loadPrayerTimes = async () => {
      if (!loggedInEmployee) return;
      const locationId = '1301'; // Jakarta Default
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

  // Filtered Today's Schedule for the logged in user
  const todaySchedule = useMemo(() => {
    const todayStr = getTodayLocalDateString();

    const regularActivities = activities
      .filter(act => act.date === todayStr)
      .map(act => ({
        id: act.id,
        name: act.name,
        startTime: act.startTime,
        endTime: act.endTime,
        isTeamSession: false,
        zoomUrl: act.zoomUrl,
        youtubeUrl: act.youtubeUrl,
        status: act.status,
        audienceType: act.audienceType,
        participantIds: act.participantIds,
        audienceRules: act.audienceRules,
        creatorId: act.createdBy
      }));

    const teamSessions = teamAttendanceSessions
      .filter(session => session.date === todayStr)
      .map(session => ({
        id: `team-${session.id}`,
        name: session.type,
        startTime: session.startTime,
        endTime: session.endTime,
        isTeamSession: true,
        zoomUrl: session.zoomUrl,
        youtubeUrl: session.youtubeUrl,
        status: 'scheduled' as const,
        audienceType: session.audienceType,
        participantIds: session.manualParticipantIds || [],
        audienceRules: session.audienceRules,
        creatorId: session.creatorId,
        attendanceMode: session.attendanceMode || 'self'
      }));

    const combined = [...regularActivities, ...teamSessions];

    return combined.filter(item => {
      if (item.creatorId === loggedInEmployee?.id) return true;
      if (!item.audienceType || item.audienceType === 'public') return true;
      if (item.audienceType === 'manual') return item.participantIds.includes(loggedInEmployee?.id || '');
      if (item.audienceType === 'rules') return doesEmployeeMatchRules(loggedInEmployee, item.audienceRules || {});
      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activities, teamAttendanceSessions, loggedInEmployee]);

  // Prayer List with filtered logic (Friday/Gender)
  const prayersToDisplay = useMemo(() => {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentDay = jakartaTime.getDay();
    const isFriday = currentDay === 5;
    const isLakiLaki = loggedInEmployee?.gender === 'Laki-laki';

    const filtered = PRAYERS.filter(p => {
      if (isFriday) {
        if (isLakiLaki) return p.id !== 'dzuhur';
        return p.id !== 'jumat';
      }
      return p.id !== 'jumat';
    });

    if (!prayerTimes) return filtered;

    return filtered.map(p => {
      const time = prayerTimes[p.id as keyof typeof prayerTimes];
      return time ? { ...p, time, startTime: time } : p;
    });
  }, [prayerTimes, loggedInEmployee?.gender]);

  // Prayer Attendance Mapping
  const prayerAttendance = useMemo(() => {
    const rawAtt = loggedInEmployee?.id ? (allUsersData[loggedInEmployee.id]?.attendance || {}) : {};
    const todayStr = getTodayLocalDateString();

    const converted: Record<string, any> = {};
    Object.entries(rawAtt).forEach(([key, record]: [string, any]) => {
      if (record && record.status) {
        // 🔥 REPAIR: Match by dynamic entityId (e.g. "subuh-2026-01-26")
        const parts = key.split('-');
        const prayerId = parts[0];
        const dateInKey = parts.slice(1).join('-');

        let isMatchesToday = false;
        if (dateInKey === todayStr) {
          isMatchesToday = true;
        } else if (!dateInKey) {
          // Fallback for old records: use robust date conversion
          const tsValue = record.timestamp;
          if (tsValue) {
            const date = new Date(tsValue);
            if (!isNaN(date.getTime())) {
              const jakartaDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
              if (jakartaDateStr === todayStr) isMatchesToday = true;
            }
          }
        }

        if (isMatchesToday) {
          converted[prayerId] = {
            status: record.status,
            reason: record.reason || null,
            timestamp: record.timestamp ? new Date(record.timestamp).getTime() : Date.now(),
            submitted: true,
            isLateEntry: record.is_late_entry ?? record.isLateEntry ?? false
          };
        }
      }
    });
    return converted;
  }, [loggedInEmployee?.id, allUsersData]);

  // Unified status message helper
  const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Sync prayer attendance to monthly activities
  const syncPrayerToMonthly = async (status: 'hadir' | 'tidak-hadir') => {
    if (!loggedInEmployee || status !== 'hadir') return;
    try {
      const { timeValidationService } = require('@/services/timeValidationService');
      const now = timeValidationService.getCorrectedTime();
      const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const dayKey = now.getDate().toString().padStart(2, '0');
      const currentActivities = loggedInEmployee.monthlyActivities || {};
      const monthProgress = currentActivities[monthKey] || {};
      const dayProgress = monthProgress[dayKey] || {};

      const updatedDay = { ...dayProgress, 'shalat_berjamaah': true };
      const updatedMonth = { ...monthProgress, [dayKey]: updatedDay };

      const { updateMonthlyProgress } = await import('@/services/monthlyActivityService');
      await updateMonthlyProgress(loggedInEmployee.id, monthKey, updatedMonth);

      const updatedEmp = { ...loggedInEmployee, monthlyActivities: { ...currentActivities, [monthKey]: updatedMonth } };
      setLoggedInEmployee(updatedEmp);
    } catch (e) { }
  };

  // Handle Prayer Submission
  const handlePrayerSubmit = async (prayerId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null, isLate: boolean = false) => {
    if (!loggedInEmployee) return;
    try {
      showMessage(status === 'hadir' ? '⌛ Mencatat kehadiran...' : '⌛ Mencatat alasan...', 'info');

      // 🔥 FIX: Use unique entityId for each date to prevent overwriting records from different days
      const dateStr = getTodayLocalDateString();
      const entityId = `${prayerId}-${dateStr}`;

      await submitAttendance(loggedInEmployee.id, entityId, status, reason, isLate);

      // Update local UI
      setAllUsersData(prev => {
        const newState = { ...prev };
        if (newState[loggedInEmployee.id]) {
          // Initialize attendance map if it doesn't exist
          if (!newState[loggedInEmployee.id].attendance) {
            newState[loggedInEmployee.id].attendance = {};
          }
          // Store with the unique entityId
          newState[loggedInEmployee.id].attendance[entityId] = {
            status,
            reason,
            timestamp: Date.now(),
            isLateEntry: isLate,
            submitted: true // 🔥 FIX: Ensure UI changes immediately
          };
        }
        return newState;
      });

      if (status === 'hadir') await syncPrayerToMonthly('hadir');
      showMessage(status === 'hadir' ? '✅ Presensi sholat berhasil!' : '✅ Alasan tidak hadir dicatat', 'success');
      refreshActivityStats();
    } catch (error: any) {
      showMessage(`❌ Gagal: ${error.message || 'Terjadi kesalahan'}`, 'error');
    }
  };

  // Handle Activity Submission
  const handleActivitySubmit = async (activityId: string, status: 'hadir' | 'tidak-hadir', reason: string | null = null) => {
    if (!loggedInEmployee) return;

    const isTeam = activityId.startsWith('team-');
    showMessage('⌛ Memproses presensi...', 'info');

    try {
      if (isTeam) {
        if (status === 'tidak-hadir') {
          showMessage('Hanya presensi HADIR yang dicatat untuk sesi tim.', 'error');
          return;
        }
        const sessionId = activityId.replace('team-', '');
        const session = teamAttendanceSessions.find(s => s.id === sessionId);
        if (!session) throw new Error('Sesi tidak ditemukan');

        await createTeamAttendanceRecord({
          sessionId: session.id,
          userId: loggedInEmployee.id,
          userName: loggedInEmployee.name,
          attendedAt: Date.now(),
          sessionType: session.type,
          sessionDate: session.date,
          sessionStartTime: session.startTime,
          sessionEndTime: session.endTime
        });
      } else {
        await submitScheduledAttendance(activityId, loggedInEmployee.id, status as any, reason || undefined);
      }

      // Update Local State
      setActivityAttendance(prev => ({
        ...prev,
        [activityId]: { status: status as any, submitted: true, timestamp: Date.now() }
      }));

      showMessage('✅ Presensi berhasil dicatat!', 'success');
      refreshActivityStats();
    } catch (error: any) {
      showMessage(`❌ Gagal: ${error.message}`, 'error');
    }
  };

  // Manual Request Handlers
  const handleTadarusSubmit = async (date: string, category: TadarusRequest['category'], notes: string) => {
    if (!loggedInEmployee || !loggedInEmployee.mentorId) return;

    try {
      const newRequest: TadarusRequest = {
        menteeId: loggedInEmployee.id,
        mentorId: loggedInEmployee.mentorId,
        date,
        category,
        notes,
        id: `${loggedInEmployee.id}-${date}-${category || 'tadarus'}-${Date.now().toString().slice(-4)}`,
        menteeName: loggedInEmployee.name,
        requestedAt: Date.now(),
        status: 'pending',
      };

      await addOrUpdateTadarusRequest(newRequest);

      await createNotification({
        userId: loggedInEmployee.mentorId,
        type: 'tadarus_request',
        title: `Persetujuan ${category || 'Sesi'}`,
        message: `${loggedInEmployee.name} mengajukan kehadiran untuk ${category || 'kegiatan'} tgl ${new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}.`,
        linkTo: '/aktifitas-saya?tab=panel-mentor&subview=persetujuan' as any,
        relatedEntityId: newRequest.id,
      });

      addToast('Permintaan berhasil dikirim', 'success');
    } catch (error) {
      addToast('Gagal mengirim permintaan', 'error');
    }
  };

  const handleMissedPrayerSubmit = async (data: { date: string, prayerId: string, prayerName: string, reason: string }) => {
    if (!loggedInEmployee || !loggedInEmployee.mentorId) return;

    try {
      const newRequest: MissedPrayerRequest = {
        menteeId: loggedInEmployee.id,
        mentorId: loggedInEmployee.mentorId,
        ...data,
        id: `${loggedInEmployee.id}-${data.date}-${data.prayerId}`,
        menteeName: loggedInEmployee.name,
        requestedAt: Date.now(),
        status: 'pending',
      };

      await addOrUpdateMissedPrayerRequest(newRequest);

      await createNotification({
        userId: loggedInEmployee.mentorId,
        type: 'missed_prayer_request',
        title: 'Presensi Terlewat',
        message: `${loggedInEmployee.name} mengajukan persetujuan untuk sholat ${data.prayerName} tgl ${new Date(data.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}.`,
        linkTo: '/aktifitas-saya?tab=panel-mentor&subview=persetujuan' as any,
        relatedEntityId: newRequest.id,
      });

      addToast('Permintaan presensi terlewat berhasil dikirim', 'success');
    } catch (error) {
      addToast('Gagal mengirim permintaan', 'error');
    }
  };

  // Open Modal logic
  const openModal = (id: string, name: string, type: 'prayer' | 'activity', isLate: boolean = false) => {
    setModalState({ isOpen: true, entityId: id, entityName: name, isLateEntry: isLate, type });
  };

  const closeModal = () => setModalState(prev => ({ ...prev, isOpen: false }));

  // Prayer Active Check Timer
  useEffect(() => {
    const { timeValidationService } = require('@/services/timeValidationService');
    const timer = setInterval(() => {
      const jakartaTime = timeValidationService.getCorrectedTime();
      let found: string | null = null;

      for (const p of prayersToDisplay) {
        const start = new Date(jakartaTime);
        const [sh, sm] = p.startTime.split(':').map(Number);
        start.setHours(sh, sm, 0, 0);

        const end = new Date(jakartaTime);
        const [eh, em] = p.endTime.split(':').map(Number);
        end.setHours(eh, em, 0, 0);

        if (jakartaTime >= start && jakartaTime <= end) {
          found = p.id;
          break;
        }
      }
      if (found !== activePrayerId) setActivePrayerId(found);
    }, 1000);
    return () => clearInterval(timer);
  }, [prayersToDisplay, activePrayerId]);

  if (!loggedInEmployee) return null;

  return (
    <div className="space-y-10 animate-fade-in">

      {/* 1. SHOLAT WAJIB SECTION */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <LayoutGrid className="w-6 h-6 text-teal-300" />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Sholat Wajib</h2>
              {isAnyAdmin(loggedInEmployee) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
                  Admin View
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsManualRequestModalOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest mt-2 sm:mt-0"
          >
            <PlusCircle className="w-4 h-4" strokeWidth={3} />
            Ajukan
          </button>
        </div>

        {prayerTimesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <PrayerCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {prayersToDisplay.map(prayer => {
              const { timeValidationService } = require('@/services/timeValidationService');
              const jakartaTime = timeValidationService.getCorrectedTime();
              const endTime = new Date(jakartaTime);
              const [eh, em] = prayer.endTime.split(':').map(Number);
              endTime.setHours(eh, em, 0, 0);

              const att = prayerAttendance[prayer.id];
              const isSubmitted = !!att?.submitted;
              const isPast = jakartaTime > endTime && !isSubmitted;

              return (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  attendanceStatus={att}
                  isActive={activePrayerId === prayer.id}
                  isTimePast={isPast}
                  onHadir={() => handlePrayerSubmit(prayer.id, 'hadir')}
                  onTidakHadir={() => openModal(prayer.id, prayer.name, 'prayer')}
                  onUbah={() => { }}
                  isAdmin={isAnyAdmin(loggedInEmployee)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 2. KEGIATAN TERJADWAL SECTION */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Users className="w-6 h-6 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Kegiatan Terjadwal</h2>
        </div>

        {isLoadingActivities ? (
          <div className="p-12 text-center bg-white/5 rounded-3xl border border-white/10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-400 mx-auto mb-4"></div>
            <p className="text-blue-200 font-medium">Memuat kegiatan hari ini...</p>
          </div>
        ) : todaySchedule.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 text-center shadow-inner">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/5">
              <CalendarClock className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Belum Ada Agenda</h3>
            <p className="text-gray-400 max-w-xs mx-auto">Tidak ada kegiatan atau sesi tim yang dijadwalkan untuk Anda hari ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {todaySchedule.map(item => {
              const att = activityAttendance[item.id];
              const isSubmitted = !!att?.submitted;
              const currentTime = getCurrentTime();

              // Timing logic
              const [ch, cm] = currentTime.split(':').map(Number);
              const cMin = ch * 60 + cm;
              const [sh, sm] = item.startTime.split(':').map(Number);
              const sMin = sh * 60 + sm;
              const [eh, em] = item.endTime.split(':').map(Number);
              const eMin = eh * 60 + em;

              const isOngoing = cMin >= sMin && cMin <= eMin;
              const isWaiting = cMin < sMin;
              const isPast = cMin > eMin;

              const isAdminAccount = isAnyAdmin(loggedInEmployee);
              const isActionable = (isOngoing || (isPast && !isSubmitted) || isAdminAccount) && !isSubmitted;

              const isCreator = item.isTeamSession && item.creatorId === loggedInEmployee.id;
              const leaderOnly = item.isTeamSession && (item as any).attendanceMode === 'leader' && !isCreator && !isAdminAccount;

              // Premium Design Assets
              const cardBg = isSubmitted ? 'bg-green-500/5 border-green-500/20' : isOngoing ? 'bg-indigo-500/10 border-indigo-400/30 shadow-indigo-500/10' : 'bg-white/5 border-white/10';
              const accentColor = isSubmitted ? 'teal' : isOngoing ? 'indigo' : 'blue';

              return (
                <div key={item.id} className={`group relative overflow-hidden rounded-4xl border p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${cardBg}`}>
                  {/* Status & Badge Row */}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${isSubmitted ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                      isOngoing ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30 animate-pulse' :
                        isWaiting ? 'bg-blue-500/20 text-blue-300 border-blue-500/20' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/20 opacity-60'
                      }`}>
                      {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                      {isSubmitted ? 'Presensi Selesai' : isOngoing ? 'Sedang Berjalan' : isWaiting ? 'Akan Datang' : 'Agenda Berakhir'}
                    </div>

                    <div className="flex gap-2.5">
                      {item.zoomUrl && (
                        <a href={item.zoomUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-90">
                          <Video className="w-4.5 h-4.5" />
                        </a>
                      )}
                      {item.youtubeUrl && (
                        <a href={item.youtubeUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-90">
                          <Youtube className="w-4.5 h-4.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Header & Meta */}
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`p-3 rounded-2.5xl bg-${accentColor}-500/20 border border-${accentColor}-500/30 text-${accentColor}-300 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                        {item.isTeamSession ? <Users className="w-6 h-6" /> : <CalendarClock className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-teal-300 transition-colors">{item.name}</h3>
                        <p className={`text-xs font-bold uppercase tracking-wider text-${accentColor}-200/50 mt-0.5`}>
                          {item.isTeamSession ? 'Exclusive Team Session' : 'Public Department Activity'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-blue-100/70 text-sm font-bold">
                        <Clock className="w-4 h-4 text-teal-400" />
                        <span>{item.startTime} - {item.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-blue-100/70 text-sm font-bold">
                        <ListIcon className="w-4 h-4 text-indigo-400" />
                        <span className="capitalize">{item.isTeamSession ? 'Intensive' : 'Reguler'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & CTA */}
                  <div className="relative z-10">
                    {leaderOnly ? (
                      <div className="w-full py-4 bg-gray-800/80 backdrop-blur-md rounded-2xl text-center text-xs font-black uppercase tracking-widest text-gray-400 border border-white/5 shadow-inner">
                        Presensi via Atasan
                      </div>
                    ) : isSubmitted ? (
                      <div className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black tracking-wide border shadow-2xl transition-all duration-300 ${att.status === 'hadir'
                        ? 'bg-green-500/20 text-green-300 border-green-500/40 shadow-green-500/10'
                        : 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/10'
                        }`}>
                        {att.status === 'hadir' ? (
                          <>
                            <div className="p-1 bg-green-500 rounded-full text-black"><Check className="w-3 h-3" strokeWidth={4} /></div>
                            Konfirmasi Hadir
                          </>
                        ) : (
                          <>
                            <div className="p-1 bg-red-500 rounded-full text-black"><X className="w-3 h-3" strokeWidth={4} /></div>
                            Konfirmasi Berhalangan
                          </>
                        )}
                      </div>
                    ) : isActionable ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleActivitySubmit(item.id, 'hadir')}
                          className="group/btn relative flex items-center justify-center gap-2.5 py-4 bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-2.5xl font-black text-sm transition-all shadow-[0_10px_20px_-10px_rgba(20,184,166,0.5)] active:scale-95 active:shadow-none"
                        >
                          <Check className="w-5 h-5 group-hover/btn:scale-125 transition-transform" strokeWidth={2.5} /> HADIR
                        </button>
                        <button
                          onClick={() => {
                            if (item.isTeamSession) {
                              showMessage('Sesi tim eksklusif hanya untuk presensi kehadiran.', 'error');
                            } else {
                              openModal(item.id, item.name, 'activity');
                            }
                          }}
                          className="flex items-center justify-center gap-2.5 py-4 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-300 border border-white/10 hover:border-red-500/40 rounded-2.5xl font-black text-sm transition-all active:scale-95"
                        >
                          <X className="w-5 h-5" strokeWidth={2.5} /> TIDAK
                        </button>
                      </div>
                    ) : (
                      <div className="w-full py-4 bg-white/5 rounded-2xl text-center border border-white/5">
                        <span className="text-xs font-black uppercase tracking-widest text-gray-500 opacity-60">
                          {isWaiting ? `Tunggu: ${item.startTime}` : `Selesai: ${item.endTime}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* High-end decorative lights */}
                  <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-10 transition-all duration-1000 ${isSubmitted ? 'bg-green-400' : isOngoing ? 'bg-indigo-400 animate-pulse' : 'bg-blue-400'
                    }`} />
                  <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full blur-[60px] opacity-5 ${isOngoing ? 'bg-white' : 'transparent'}`} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unified Multi-purpose Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/10 animate-pop-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-teal-400 to-indigo-500" />

            <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
              {modalState.isLateEntry ? <Clock className="text-amber-400" /> : <Info className="text-red-400" />}
              {modalState.isLateEntry ? `Presensi Terlambat` : `Ketidakhadiran`}
            </h3>

            <p className="text-blue-100/70 mb-6 font-medium leading-relaxed">
              Anda akan mencatat status untuk <span className="text-white font-bold">{modalState.entityName}</span>.
              Harap berikan keterangan yang jelas di bawah ini:
            </p>

            <label className="block text-xs font-bold text-teal-400 uppercase tracking-widest mb-2 px-1">
              Alasan / Keterangan
            </label>
            <textarea
              autoFocus
              className="w-full bg-white/5 text-white border border-white/20 rounded-2xl p-4 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 focus:outline-none resize-none transition-all placeholder:text-gray-500 font-medium"
              rows={4}
              placeholder={modalState.isLateEntry ? "Contoh: Terjebat macet, baru selesai tugas, lupa..." : "Contoh: Sakit, Izin dengan bukti, Dinas luar..."}
              id="global-reason-input"
            />

            <div className="flex gap-4 mt-8">
              <button
                onClick={closeModal}
                className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-gray-300 font-bold hover:bg-white/10 transition-all border border-white/10"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('global-reason-input') as HTMLTextAreaElement;
                  const reason = input?.value || (modalState.isLateEntry ? 'Presensi terlambat' : 'Tidak hadir');

                  if (modalState.type === 'prayer') {
                    handlePrayerSubmit(modalState.entityId, modalState.isLateEntry ? 'hadir' : 'tidak-hadir', reason, modalState.isLateEntry);
                  } else {
                    handleActivitySubmit(modalState.entityId, 'tidak-hadir', reason);
                  }
                  closeModal();
                }}
                className={`flex-1 py-4 px-6 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 ${modalState.isLateEntry ? 'bg-teal-500 hover:bg-teal-400 shadow-teal-500/20' : 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                  }`}
              >
                {modalState.isLateEntry ? 'Kirim Pengajuan' : 'Kirim Alasan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Request Modal */}
      <UnifiedManualRequestModal
        isOpen={isManualRequestModalOpen}
        onClose={() => setIsManualRequestModalOpen(false)}
        onTadarusSubmit={handleTadarusSubmit}
        onMissedPrayerSubmit={handleMissedPrayerSubmit}
      />
    </div>
  );
};

export default PresensiComponent;
