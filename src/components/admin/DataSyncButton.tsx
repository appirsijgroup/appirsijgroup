'use client';

import React, { useState } from 'react';
import { syncAllEmployeesToSupabase } from '@/services/employeeService';
import { useAppDataStore } from '@/store/store';

/**
 * Admin component to sync localStorage data to Supabase
 * This button should only be accessible to admin users
 */
export default function DataSyncButton() {
    const { allUsersData } = useAppDataStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{
        success: number;
        failed: number;
        errors: string[];
    } | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const handleSync = async () => {
        if (!confirm('Apakah Anda yakin ingin melakukan sinkronisasi data ke Supabase?')) {
            return;
        }

        setIsSyncing(true);
        setSyncResult(null);

        try {
            console.log('🚀 Starting sync to Supabase...');
            const result = await syncAllEmployeesToSupabase(allUsersData);

            console.log('✅ Sync completed:', result);
            setSyncResult(result);

            if (result.failed === 0) {
                alert(`✅ Sinkronisasi berhasil!\n\n${result.success} karyawan berhasil disinkronkan ke Supabase.`);
            } else {
                alert(`⚠️ Sinkronisasi selesai dengan beberapa error.\n\nSukses: ${result.success}\nGagal: ${result.failed}\n\nLihat detail di console.`);
            }
        } catch (error) {
            console.error('❌ Sync failed:', error);
            alert('❌ Sinkronisasi gagal. Silakan cek console untuk detail error.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-4 max-w-md">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                        ⚙️ Sinkronisasi Data
                    </h3>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                    >
                        {showDetails ? 'Sembunyikan' : 'Detail'}
                    </button>
                </div>

                <p className="text-xs text-gray-600 mb-3">
                    Sinkronkan data localStorage ke database Supabase
                </p>

                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        isSyncing
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {isSyncing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menyinkronkan...
                        </span>
                    ) : (
                        '🔄 Sinkronkan ke Supabase'
                    )}
                </button>

                {syncResult && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                        <div className="flex justify-between mb-1">
                            <span className="text-green-600">✅ Sukses:</span>
                            <span className="font-medium">{syncResult.success}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600">❌ Gagal:</span>
                            <span className="font-medium">{syncResult.failed}</span>
                        </div>
                        {showDetails && syncResult.errors.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="font-medium mb-1">Error Details:</p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {syncResult.errors.map((error, idx) => (
                                        <p key={idx} className="text-red-600 break-words">
                                            {error}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                    <p>📊 Total data di localStorage: <strong>{Object.keys(allUsersData).length}</strong> karyawan</p>
                </div>
            </div>
        </div>
    );
}
