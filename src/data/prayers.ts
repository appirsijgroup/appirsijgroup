import React from 'react';
import { type Prayer } from '../types';
import { SunIcon, MoonIcon, CloudIcon, SparklesIcon, SunsetIcon, MosqueIcon } from '../components/Icons';

export const PRAYERS: Prayer[] = [
  { id: 'subuh', name: 'Subuh', time: '04:01', icon: React.createElement(MoonIcon), type: 'wajib', startTime: '04:01', endTime: '06:00' },
  { id: 'dzuhur', name: 'Dzuhur', time: '12:00', icon: React.createElement(SunIcon), type: 'wajib', startTime: '12:00', endTime: '14:45' },
  { id: 'jumat', name: 'Jumat', time: '12:00', icon: React.createElement(MosqueIcon), type: 'wajib', startTime: '12:00', endTime: '14:45', isFridayOnly: true },
  { id: 'ashar', name: 'Ashar', time: '15:15', icon: React.createElement(CloudIcon), type: 'wajib', startTime: '15:15', endTime: '17:45' },
  { id: 'maghrib', name: 'Maghrib', time: '18:00', icon: React.createElement(SunsetIcon), type: 'wajib', startTime: '18:00', endTime: '19:00' },
  { id: 'isya', name: 'Isya', time: '19:15', icon: React.createElement(MoonIcon), type: 'wajib', startTime: '19:15', endTime: '23:59' },
];
