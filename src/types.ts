import type { ReactNode, FC } from 'react';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error';
  icon: ReactNode;
}

export interface Prayer {
  id: string;
  name: string;
  time: string;
  icon: ReactNode;
  type: 'wajib' | 'sunnah';
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isFridayOnly?: boolean; // If true, only show on Friday
}

export type QuranDimension = 'R' | 'T' | 'H' | 'P';

export interface QuranLevel {
  id: string;
  dimension: QuranDimension;
  code: string;
  label: string;
  order: number;
}

export interface EmployeeQuranCompetency {
  id: string;
  employeeId: string;
  readingLevel: string;
  tajwidLevel: string;
  memorizationLevel: string;
  understandingLevel: string;
  readingChecklist: string[];
  tajwidChecklist: string[];
  memorizationChecklist: string[];
  understandingChecklist: string[];
  assessedAt: string;
  assessorId: string;
}

export interface EmployeeQuranHistory {
  id: string;
  employeeId: string;
  dimension: QuranDimension;
  fromLevel: string | null;
  toLevel: string;
  updatedAt: string;
}

export interface SunnahIbadah {
  id: string;
  name: string;
  type: 'sholat' | 'puasa';
  icon: string; // Icon name as a string key
  scheduleType: 'daily' | 'weekly' | 'one-time';
  // for weekly schedule
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ...
  // for one-time schedule
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  // audit
  createdBy: string; // employee ID
  createdByName: string;
}

export type AudienceType = 'public' | 'rules' | 'manual';

export type MutabaahLockingMode = 'weekly' | 'monthly';

export interface AudienceRules {
  hospitalIds?: string[];
  units?: string[];
  bagians?: string[];
  professionCategories?: string[];
  professions?: string[];
  roles?: string[];
  [key: string]: any;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  createdBy: string; // employee ID
  createdByName?: string; // employee Name for display
  participantIds: string[]; // For 'manual' type, or to see who matched the rules at creation time.
  zoomUrl?: string;
  youtubeUrl?: string;
  activityType: 'UMUM' | 'KAJIAN SELASA' | 'PENGAJIAN PERSYARIKATAN' | 'Umum' | 'Kajian Selasa' | 'Pengajian Persyarikatan';
  status: 'scheduled' | 'postponed' | 'cancelled';
  audienceType: AudienceType;
  audienceRules?: AudienceRules;
  createdAt?: string;
}

export interface RawEmployee {
  hospitalId?: string;
  name: string;
  unit: string;
  bagian: string;
  professionCategory: 'MEDIS' | 'NON MEDIS';
  profession: string;
  gender: 'Laki-laki' | 'Perempuan';
  email?: string;
  role?: Role;
}

// Role hierarchy (from highest to lowest):
// - super-admin: Can manage admins and users, full system access
// - admin: Can manage regular users and content
// - user: Regular employee
export type Role = 'super-admin' | 'admin' | 'user';

// Role hierarchy level for permission checks
export const ROLE_LEVELS: Record<Role, number> = {
  'super-admin': 100,
  'admin': 50,
  'user': 1
};

export type FunctionalRole = 'BPH' | 'DIREKSI' | 'MANAJER' | 'KEPALA URUSAN' | 'KEPALA RUANGAN';

// Common types for bulk operations and API responses
export interface FailedOperationRecord {
  record: RawEmployee & { id: string };
  reason: string;
}

export interface BulkOperationResult {
  added: number;
  updated: number;
  failed: FailedOperationRecord[];
}

export interface BulkOperationResultWithError {
  success: boolean;
  error?: string;
  failed: FailedOperationRecord[];
}

// Type for API import responses
export interface ImportUsersResult {
  added: number;
  updated: number;
  failed: FailedOperationRecord[];
}

// Type for error handling
export type ErrorWithMessage = Error & { message?: string };

export interface ReadingHistory {
  id: string;
  bookTitle: string;
  dateCompleted: string; // YYYY-MM-DD
  pagesRead?: string;
}

export interface QuranReadingHistory {
  id: string;
  surahName: string;
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  date: string; // YYYY-MM-DD
}



export interface Hospital {
  id: string; // Could be the brand name like RSIJSP
  name: string; // Full name: Rumah Sakit Islam Jakarta Sukapura
  brand: string; // Brand/Abbreviation: RSIJSP
  address: string;
  logo: string | null; // Base64 encoded string
  isActive: boolean;
}



export interface Employee extends RawEmployee {
  id: string; // This is the NIP/NOPEG
  email: string;
  password: string;
  lastVisitDate: string; // YYYY-MM-DD
  role: Role;
  isActive: boolean;
  notificationEnabled: boolean;
  profilePicture: string | null;
  monthlyActivities: Record<string, MonthlyActivityProgress>; // monthKey (YYYY-MM) -> progress
  activatedMonths?: string[]; // YYYY-MM keys for months the user has started (camelCase - from client state)
  activated_months?: string[]; // YYYY-MM keys (snake_case - from Supabase)
  monthly_activities?: Record<string, MonthlyActivityProgress>; // snake_case from Supabase
  kaUnitId?: string | null;
  supervisorId?: string | null;
  managerId?: string | null;
  mentorId?: string | null;
  dirutId?: string | null;
  canBeMentor?: boolean;
  canBeSupervisor?: boolean;
  canBeManager?: boolean;
  canBeKaUnit?: boolean; // Added for Ka. Unit role
  canBeDirut?: boolean;
  functionalRoles?: FunctionalRole[];

  locationId?: string;
  locationName?: string;
  readingHistory?: ReadingHistory[];
  quranReadingHistory?: QuranReadingHistory[];
  signature?: string | null;
  lastAnnouncementReadTimestamp?: number;
  managedHospitalIds?: string[];
  achievements?: UserAchievement[];
  mustChangePassword?: boolean;
  isProfileComplete?: boolean;
  emailVerified?: boolean;
  avatarUrl?: string | null;
  authUserId?: string | null;
  quranCompetency?: EmployeeQuranCompetency;
  quranHistory?: EmployeeQuranHistory[];
  _monthlyReportsDataCache?: Record<string, Record<string, Record<string, boolean>>>;
}

export interface AttendanceStatus {
  status: 'hadir' | 'tidak-hadir' | null;
  reason?: string | null;
  timestamp: number | null;
  submitted?: boolean;
  isLateEntry?: boolean;
}

export type Attendance = Record<string, AttendanceStatus>;

export type View = 'presensi' | 'kegiatan' | 'panduan-doa' | 'profile' | 'admin' | 'aktivitas-bulanan' | 'alquran' | 'bookmarks' | 'dashboard-saya' | 'pengumuman' | 'jadwal-sesi' | 'analytics' | 'quran-competency';

export interface City {
  id: string;
  lokasi: string;
}

export interface GuideStep {
  id: number;
  title: string;
  arabic: string;
  latin: string;
  translation: string;
  description?: string;
}

export interface PrayerGuide {
  id: string;
  title: string;
  description: string;
  source: string;
  steps: GuideStep[];
}

export interface DailyPrayer {
  id: number;
  title: string;
  arabic: string;
  latin: string;
  translation: string;
}

export type DailyAttendance = Attendance;
export type History = Record<string, DailyAttendance>;

export interface UserDataV2 {
  employee: Employee;
  attendance: Attendance;
  history: History;
}

export type IconFC = FC<{ className?: string }>;

export interface AdminReportRecord {
  employeeId: string;
  employeeName: string;
  unit: string;
  professionCategory: 'MEDIS' | 'NON MEDIS';
  profession: string;
  hospitalId?: string;
  date: string; // YYYY-MM-DD
  entityId: string;
  prayerName: string;
  status: 'Hadir' | 'Tidak Hadir';
  detail: string;
  timestamp: string;
}

export interface DailyActivity {
  id: string;
  category: 'SIDIQ (Integritas)' | 'TABLIGH (Teamwork)' | 'AMANAH (Disiplin)' | 'FATONAH (Belajar)';
  title: string;
  monthlyTarget: number;
  automationTrigger?: {
    type: 'PRAYER_WAJIB' | 'ACTIVITY_TYPE' | 'QURAN_READING_REPORT' | 'BOOK_READING_REPORT' | 'MANUAL_USER_REPORT' | 'TADARUS_SESSION' | 'TEAM_ATTENDANCE';
    value?: string; // Used for ACTIVITY_TYPE and TEAM_ATTENDANCE
  };
}

// Represents activities checked for a single day
// e.g., { 'infaq': true, 'jujur': false }
export type DailyActivityProgress = Record<string, boolean>;

// Represents all daily progress for a full month
// e.g., { '01': { infaq: true }, '02': ... }
export type MonthlyActivityProgress = Record<string, DailyActivityProgress>;

// Represents monthly report activities (counter-based, not daily checklist)
// e.g., { "2026-01": { infaq: { count: 2, completedAt: "..." }, jujur: { count: 5, ... } } }
export interface MonthlyReportActivity {
  count: number;
  completedAt?: string;
  note?: string;
  entries?: ManualReportEntry[]; // Array untuk aktivitas manual (per-date tracking)
  bookEntries?: BookReadingEntry[]; // Array untuk aktivitas tipe buku (e.g., "Membaca Al-Quran dan buku")
}

export interface ManualReportEntry {
  date: string; // Format: "YYYY-MM-DD"
  completedAt: string; // ISO timestamp
  note?: string;
}

export interface BookReadingEntry {
  bookTitle: string;
  pagesRead: string;
  dateCompleted: string;
  completedAt: string;
}

export type MonthlyReports = Record<string, Record<string, MonthlyReportActivity>>;

export type AdminView = 'manajemen-pengguna' | 'manajemen-konten' | 'reports' | 'pengumuman' | 'manajemen-admin' | 'manajemen-rs';

export type MonthlyReportStatus =
  | 'pending_mentor'
  | 'pending_supervisor'
  | 'pending_manager'
  | 'pending_kaunit'
  | 'approved'
  | 'rejected_mentor'
  | 'rejected_supervisor'
  | 'rejected_manager'
  | 'rejected_kaunit';

export interface MonthlyReportSubmission {
  id: string;
  menteeId: string;
  menteeName: string;
  monthKey: string;
  submittedAt: number;
  status: MonthlyReportStatus;
  mentorId: string;
  supervisorId?: string;
  managerId?: string;
  kaUnitId?: string;
  mentorReviewedAt?: number;
  mentorNotes?: string;
  supervisorReviewedAt?: number;
  supervisorNotes?: string;
  managerReviewedAt?: number;
  managerNotes?: string;
  kaUnitReviewedAt?: number;
  kaUnitNotes?: string;
}

export interface DocumentSubmission {
  id: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  submittedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  documentName: string;
  documentUrl: string;
  notes?: string;
  mentorNotes?: string;
  reviewedAt?: number;
}

// Gamifikasi
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name as a string key
  criteria: {
    type: 'streak'; // Can be expanded later with 'count', etc.
    entityId: string; // e.g., 'tahajud-default' or 'subuh'
    count: number; // consecutive days for streak
  };
}

export interface UserAchievement {
  achievementId: string;
  earnedAt: number;
}

export interface MenteeTarget {
  id: string;
  mentorId: string;
  menteeId: string;
  title: string;
  description?: string;
  monthKey: string; // YYYY-MM
  status: 'in-progress' | 'completed';
  createdAt: number;
  completedAt: number | null;
}

// Team Attendance Session - Jadwal Sesi
export interface TeamAttendanceSession {
  id: string;
  creatorId: string;
  creatorName: string;
  type: 'KIE' | 'DOA BERSAMA' | 'BBQ' | 'UMUM' | 'KAJIAN SELASA' | 'PENGAJIAN PERSYARIKATAN' | 'Doa Bersama' | 'Kajian Selasa' | 'Pengajian Persyarikatan' | 'Pengajian Bulanan';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  audienceType: 'rules' | 'manual';
  audienceRules?: AudienceRules;
  manualParticipantIds?: string[];
  attendanceMode?: 'leader' | 'self'; // leader = by creator, self = by participant
  zoomUrl?: string;
  youtubeUrl?: string;
  createdAt: number;
  updatedAt?: number; // ⚡ Tambahkan untuk tracking update terakhir
  presentCount?: number; // ⚡ Derived dari team_attendance_records (jumlah peserta hadir)
}

// Team Attendance Record - Record Presensi per User di Session
export interface TeamAttendanceRecord {
  id: string;
  sessionId: string; // UUID dari team_attendance_sessions
  userId: string;
  userName: string;
  attendedAt: number; // Unix timestamp - kapan user klik HADIR
  createdAt: number;
  // Metadata dari session (denormalized untuk query performance)
  sessionType: TeamAttendanceSession['type'];
  sessionDate: string; // YYYY-MM-DD
  sessionStartTime: string; // HH:MM
  sessionEndTime: string; // HH:MM
}

export interface MyDashboardViewProps {
  employee: Employee;
  allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance>; }>;
  history: Record<string, Attendance>;
  attendance: Attendance;
  dailyActivitiesConfig: DailyActivity[];
  submissions: MonthlyReportSubmission[];
  onNavigateToReport: (monthKey: string) => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  // Panel Mentor
  onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
  allPrayers: Prayer[];
  activities: Activity[];
  monthlyReportSubmissions: MonthlyReportSubmission[];
  onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit') => void;
  tadarusRequests: TadarusRequest[];
  onCreateTadarusSession: (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => void;
  onUpdateTadarusSession: (sessionId: string, updates: Partial<TadarusSession>) => void;
  onDeleteTadarusSession: (sessionId: string) => void;
  onReviewTadarusRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  missedPrayerRequests: MissedPrayerRequest[];
  onReviewMissedPrayerRequest: (requestId: string, status: 'approved' | 'rejected', mentorNotes?: string) => void;
  onMentorAttendOwnSession: (sessionId: string) => void;
  tadarusSessions: TadarusSession[];
  loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
  // Aktivitas Pribadi
  onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
  onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
  onLogManualActivity: (activityId: string, date: string) => void;

  onCreateAnnouncement: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>, imageFile?: File, documentFile?: File) => Promise<void> | void;
  onDeleteAnnouncement: (announcementId: string) => void;
  // Rapot
  sunnahIbadahList: SunnahIbadah[];
  hospitals: Hospital[];
  // Deep link
  initialTab?: string;
  onTabChange?: () => void;
  // Mentee Targets
  menteeTargets: MenteeTarget[];
  onCreateMenteeTarget: (data: Omit<MenteeTarget, 'id' | 'createdAt' | 'status' | 'completedAt'>) => void;
  onUpdateMenteeTargetStatus: (targetId: string, status: 'completed' | 'in-progress') => void;
  onDeleteMenteeTarget: (targetId: string) => void;
  // Missing handlers
  onActivateMonth?: (userId: string, monthKey: string) => void;
  onUpdateMonthlyActivities?: (userId: string, monthKey: string, monthProgress: any) => void;
  onSubmitReport?: (monthKey: string) => void;
  // Assignment Letter
  onOpenAssignmentLetter?: (notification: any) => void;
  onLoadEmployees?: (limit?: number) => Promise<void>;
  isLoadingEmployees?: boolean;
}

export interface TadarusSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: 'UMUM' | 'BBQ';
  notes?: string;
  isRecurring?: boolean;
  mentorId: string;
  participantIds: string[];
  createdAt: number;
  presentMenteeIds: string[];
  status: 'open' | 'closed';
  mentorPresent?: boolean;
}

export interface TadarusRequest {
  id: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  date: string;
  category?: 'BBQ' | 'UMUM' | 'KIE' | 'Doa Bersama' | 'Kajian Selasa' | 'Pengajian Persyarikatan' | 'Umum';
  notes?: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: number;
}

export interface MissedPrayerRequest {
  id: string;
  menteeId: string;
  menteeName: string;
  mentorId: string;
  date: string;
  prayerId: string;
  prayerName: string;
  reason: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: number;
  mentorNotes?: string;
}

export interface Bookmark {
  id?: string;
  userId: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  timestamp?: number;
  ayahText?: string;
}

export interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<string, string>;
}

export interface Ayah {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
}

export interface SurahDetail extends Surah {
  ayat: Ayah[];
  suratSebelumnya?: { nomor: number, nama: string, namaLatin: string };
  suratSelanjutnya?: { nomor: number, nama: string, namaLatin: string };
}

export interface AICommand {
  command: 'navigateToView' | 'updateDailyActivity' | 'createActivity' | 'deleteActivity' | 'updateActivity' | 'logBookReading' | 'logQuranReading' | 'batch';
  view?: View;
  surahNumber?: number;
  ayahNumber?: number;
  query?: string;
  tab?: 'panduan' | 'doa';
  activityId?: string;
  status?: boolean;
  days?: number[];
  startDate?: string;
  endDate?: string;
  excludeWeekends?: boolean;
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  updates?: Partial<Activity>;
  bookTitle?: string;
  pagesRead?: string;
  surahName?: string;
  startAyah?: number;
  endAyah?: number;
  commands?: AICommand[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface MenteeData {
  id: string;
  name: string;
  monthlyActivities: Employee['monthlyActivities'];
}





export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: number;
  scope: 'alliansi' | 'mentor';
  targetHospitalIds?: string[]; // Optional: if set, only users with these hospitalIds can see
  targetHospitalNames?: string[]; // For display purposes
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
  | 'monthly_report_submitted'
  | 'monthly_report_approved'
  | 'monthly_report_rejected'
  | 'monthly_report_needs_review'
  | 'new_activity_schedule'
  | 'mentor_announcement'
  | 'global_announcement'
  | 'account_role_changed'
  | 'tadarus_request'
  | 'tadarus_approved'
  | 'tadarus_rejected'
  | 'new_tadarus_session_schedule'
  | 'missed_prayer_request'
  | 'missed_prayer_approved'
  | 'missed_prayer_rejected'
  | 'missed_prayer_reminder'
  ;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  relatedEntityId?: string;
  linkTo?: {
    view: View | 'assignment_letter';
    tab?: string;
    params?: Record<string, any>;
  } | string;
  expiresAt?: number;
  dismissOnClick?: boolean;
}
