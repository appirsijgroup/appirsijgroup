import { type DailyActivity } from '../types';

export const DAILY_ACTIVITIES: DailyActivity[] = [
  // SIDIQ (Integritas)
  { id: 'infaq', category: 'SIDIQ (Integritas)', title: 'Gemar berinfaq', monthlyTarget: 1, automationTrigger: { type: 'MANUAL_USER_REPORT' } },
  { id: 'jujur', category: 'SIDIQ (Integritas)', title: 'Jujur menyampaikan informasi', monthlyTarget: 4, automationTrigger: { type: 'MANUAL_USER_REPORT' } },
  { id: 'tanggung_jawab', category: 'SIDIQ (Integritas)', title: 'Tanggung jawab terhadap pekerjaan', monthlyTarget: 1, automationTrigger: { type: 'MANUAL_USER_REPORT' } },

  // TABLIGH (Teamwork)
  { id: 'persyarikatan', category: 'TABLIGH (Teamwork)', title: 'Aktif dalam kegiatan persyarikatan', monthlyTarget: 1, automationTrigger: { type: 'MANUAL_USER_REPORT' } },
  { id: 'doa_bersama', category: 'TABLIGH (Teamwork)', title: 'Doa bersama mengawali pekerjaan', monthlyTarget: 20, automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'Doa Bersama' } },
  { id: 'lima_s', category: 'TABLIGH (Teamwork)', title: '5S (Salam, Senyum, Sapa, Sopan, Santun)', monthlyTarget: 20, automationTrigger: { type: 'MANUAL_USER_REPORT' } },

  // AMANAH (Disiplin)
  { id: 'shalat_berjamaah', category: 'AMANAH (Disiplin)', title: 'Sholat lima waktu berjamaah', monthlyTarget: 20, automationTrigger: { type: 'PRAYER_WAJIB' } },
  { id: 'penampilan_diri', category: 'AMANAH (Disiplin)', title: 'Menjaga penampilan diri', monthlyTarget: 20, automationTrigger: { type: 'MANUAL_USER_REPORT' } },
  { id: 'tepat_waktu_kie', category: 'AMANAH (Disiplin)', title: 'Tepat waktu menghadiri KIE', monthlyTarget: 1, automationTrigger: { type: 'TEAM_ATTENDANCE', value: 'KIE' } },

  // FATONAH (Belajar)
  { id: 'tadarus', category: 'FATONAH (Belajar)', title: 'RSIJ bertadarus (berkelompok)', monthlyTarget: 3, automationTrigger: { type: 'TADARUS_SESSION' } },
  { id: 'kajian_selasa', category: 'FATONAH (Belajar)', title: 'Kajian Selasa', monthlyTarget: 2, automationTrigger: { type: 'MANUAL_USER_REPORT' } },
  { id: 'baca_alquran_buku', category: 'FATONAH (Belajar)', title: 'Membaca Al-Quran dan buku', monthlyTarget: 20, automationTrigger: { type: 'BOOK_READING_REPORT' } },
];