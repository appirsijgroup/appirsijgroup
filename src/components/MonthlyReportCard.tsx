'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircleIcon } from './Icons';
import { DailyActivity } from '../types';
import { getTodayLocalDateString } from '../utils/dateUtils';
import { useUIStore, useAppDataStore } from '@/store/store';
import {
    getMonthlyReports,
    addManualReportByDate
} from '../services/monthlyReportService';

interface MonthlyReportCardProps {
    activity: DailyActivity;
    employeeId: string;
    monthKey: string; // Format: "2026-01"
}

const MonthlyReportCard: React.FC<MonthlyReportCardProps> = ({
    activity,
    employeeId,
    monthKey
}) => {
    const { addToast } = useUIStore();
    const { refreshActivityStats } = useAppDataStore();
    const [count, setCount] = useState<number>(0);
    const [reportedDates, setReportedDates] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDateString());
    const isSubmittingRef = React.useRef(false); // Prevent double submission

    // Load current data dari Supabase
    useEffect(() => {
        const loadData = async () => {
            const reports = await getMonthlyReports(employeeId);
            const activityData = reports[monthKey]?.[activity.id];

            // Get count from entries length or fallback to count field
            const entries = activityData?.entries || [];
            const currentCount = activityData?.count || entries.length || 0;

            setCount(currentCount);
            setReportedDates(entries.map((e: any) => e.date));
        };
        loadData();
    }, [employeeId, monthKey, activity.id]);

    const target = activity.monthlyTarget || 1;
    const isTargetMet = count >= target;
    const progress = Math.min((count / target) * 100, 100);

    // Check if selected date is already reported
    const isDateAlreadyReported = reportedDates.includes(selectedDate);

    const handleSubmit = async () => {
        if (isLoading || isSubmittingRef.current) return;

        // Validate: Check if date is already reported
        if (isDateAlreadyReported) {
            addToast(`⚠️ Aktivitas ini sudah dilaporkan untuk tanggal ${selectedDate}. Silakan pilih tanggal lain.`, 'error');
            return;
        }

        setIsLoading(true);
        isSubmittingRef.current = true;

        try {
            const result = await addManualReportByDate(
                employeeId,
                monthKey,
                activity.id,
                selectedDate
            );

            setCount(result.count);
            setReportedDates([...reportedDates, selectedDate]);

            // 🔥 NEW: Refresh activity stats to update dashboard chart
            refreshActivityStats();

            // Show success message
            addToast(`✅ ${activity.title} berhasil dilaporkan untuk tanggal ${selectedDate}!`, 'success');
        } catch (error) {
            console.error('❌ [MonthlyReportCard] Gagal menyimpan laporan:', error);

            // Show detailed error
            const errorMessage = error instanceof Error
                ? error.message
                : JSON.stringify(error);

            addToast(`❌ Gagal menyimpan: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
            isSubmittingRef.current = false;
        }
    };

    const handleDecrement = async () => {
        if (isLoading || count === 0) {
            addToast('⚠️ Tidak bisa mengurangi laporan. Silakan hubungi admin untuk menghapus laporan.', 'error');
            return;
        }
        addToast('⚠️ Fitur pengurangan laporan belum tersedia. Silakan hubungi admin.', 'error');
    };

    return (
        <div className="border border-white/10 p-4 rounded-lg bg-linear-to-br from-gray-800/50 to-gray-900/50">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h4 className="text-base font-bold text-white mb-1">
                        {activity.title}
                    </h4>
                    <p className="text-xs text-blue-200">
                        Target: {target}x per bulan
                    </p>
                </div>

                {/* Status Badge */}
                {isTargetMet ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                            Tercapai!
                        </span>
                    </div>
                ) : (
                    <div className="px-3 py-1 bg-gray-700/50 border border-gray-600/50 rounded-full">
                        <span className="text-xs font-semibold text-gray-400">
                            {count} / {target}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${
                            isTargetMet
                                ? 'bg-linear-to-r from-green-500 to-green-400'
                                : 'bg-linear-to-r from-teal-500 to-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">
                    {progress.toFixed(0)}% tercapai
                </p>
            </div>

            {/* Date Input and Submit Form */}
            <div className="space-y-3">
                {/* Date Picker */}
                <div>
                    <label className="block text-xs text-gray-400 mb-1">
                        Tanggal Pelaporan:
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={getTodayLocalDateString()}
                        className={`w-full bg-white/5 border rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none ${
                            isDateAlreadyReported
                                ? 'border-yellow-500/50 bg-yellow-500/10'
                                : 'border-white/20'
                        }`}
                        disabled={isLoading}
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || isDateAlreadyReported}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                        isLoading || isDateAlreadyReported
                            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                            : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 border border-teal-500/50'
                    }`}
                >
                    {isLoading ? 'Menyimpan...' : 'Lapor Aktivitas'}
                </button>
            </div>
        </div>
    );
};

export default MonthlyReportCard;
