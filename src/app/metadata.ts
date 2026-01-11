/**
 * 📊 Application Metadata
 * Centralized metadata configuration for SEO and social sharing
 */

import type { Metadata } from 'next';

/**
 * Base metadata for the entire application
 */
export const baseMetadata: Metadata = {
  title: {
    template: '%s | Aplikasi APPI',
    default: 'Aplikasi APPI - RSI Group',
  },
  description:
    'Aplikasi manajemen mutaba\'ah, presensi, dan kegiatan harian untuk pegawai RSI Group. Dilengkapi dengan fitur pelacakan ibadah dan pembinaan mentor.',
  keywords: [
    'APPI',
    'RSI Group',
    'Mutabaah',
    'Presensi',
    'Ibadah',
    'Mentor',
    'Pegawai',
  ],
  authors: [{ name: 'RSI Group IT Team' }],
  creator: 'RSI Group',
  publisher: 'RSI Group',

  // Open Graph / Facebook
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://appi.rsi-group.com',
    siteName: 'Aplikasi APPI',
    title: 'Aplikasi APPI - RSI Group',
    description:
      'Aplikasi manajemen mutaba\'ah, presensi, dan kegiatan harian untuk pegawai RSI Group.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aplikasi APPI',
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Aplikasi APPI - RSI Group',
    description:
      'Aplikasi manajemen mutaba\'ah, presensi, dan kegiatan harian untuk pegawai RSI Group.',
    images: ['/twitter-image.png'],
  },

  // Robots
  robots: {
    index: false, // Don't index authenticated pages
    follow: false,
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  // Manifest
  manifest: '/manifest.json',

  // Viewport
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },

  // Theme Color
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

/**
 * Page-specific metadata generators
 */
export const pageMetadata = {
  dashboard: {
    title: 'Dashboard',
    description: 'Dashboard personal untuk melihat aktivitas dan statistik harian.',
  },
  presensi: {
    title: 'Presensi Harian',
    description: 'Catat kehadiran sholat wajib 5 waktu dan aktivitas harian.',
  },
  alquran: {
    title: "Al-Qur'an",
    description: 'Baca Al-Qur\'an online dengan terjemahan dan fitur bookmark.',
  },
  aktivitasBulanan: {
    title: 'Lembar Mutaba\'ah',
    description: 'Lacak aktivitas ibadah sunnah dan bulanan.',
  },
  analytics: {
    title: 'Analytics',
    description: 'Analisis statistik dan performa ibadah.',
  },
  profile: {
    title: 'Profil',
    description: 'Kelola profil dan pengaturan akun.',
  },
  admin: {
    title: 'Admin Dashboard',
    description: 'Dashboard admin untuk mengelola pengguna dan sistem.',
  },
  announcements: {
    title: 'Pengumuman',
    description: 'Informasi dan pengumuman terbaru dari manajemen.',
  },
} as const;

/**
 * Generate metadata for a specific page
 */
export function getPageMetadata(
  page: keyof typeof pageMetadata
): Metadata {
  const meta = pageMetadata[page];
  return {
    title: meta.title,
    description: meta.description,
  };
}
