'use client';

import { useState } from 'react';
import { testSupabaseConnection } from '@/lib/testSupabase';

export default function TestSupabasePage() {
    // Block access in production
    if (process.env.NODE_ENV === 'production') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">🚫 Akses Ditolak</h1>
                    <p>Halaman ini hanya tersedia di development mode.</p>
                </div>
            </div>
        );
    }

    const [testResults, setTestResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const runTest = async () => {
        setIsLoading(true);
        const results = await testSupabaseConnection();
        setTestResults(results);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-4">
                    🔧 Supabase Connection Test
                </h1>

                <div className="bg-gray-800 p-6 rounded-lg mb-6">
                    <p className="text-gray-300 mb-4">
                        This page tests your Supabase connection and verifies all tables are accessible.
                    </p>

                    <button
                        onClick={runTest}
                        disabled={isLoading}
                        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
                    >
                        {isLoading ? 'Running Tests...' : '🚀 Run Tests'}
                    </button>
                </div>

                {testResults && (
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>

                        <div className="space-y-3">
                            <TestResult
                                label="Environment Variables"
                                passed={testResults.envConfigured}
                                error={testResults.error}
                            />
                            <TestResult
                                label="Supabase Connection"
                                passed={testResults.connection}
                            />
                            <TestResult
                                label="Employees Table"
                                passed={testResults.employeesTable}
                            />
                            <TestResult
                                label="Announcements Table"
                                passed={testResults.announcementsTable}
                            />
                            <TestResult
                                label="Hospitals Table"
                                passed={testResults.hospitalsTable}
                            />
                            <TestResult
                                label="Daily Activities Table"
                                passed={testResults.dailyActivitiesTable}
                            />
                            <TestResult
                                label="Job Structure Table"
                                passed={testResults.jobStructureTable}
                            />
                        </div>

                        {testResults.error && (
                            <div className="mt-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
                                <p className="text-red-300 font-semibold">Error:</p>
                                <p className="text-red-200 text-sm mt-1">{testResults.error}</p>
                            </div>
                        )}

                        <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500 rounded-lg">
                            <p className="text-blue-300 font-semibold mb-2">Next Steps:</p>
                            <ul className="text-blue-200 text-sm space-y-1">
                                <li>✅ If all tests pass: Your Supabase is ready!</li>
                                <li>📖 Read MIGRATION_GUIDE.md to migrate data from localStorage</li>
                                <li>🔄 Update your stores to use Supabase services</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="mt-8 bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-4">
                        🧪 Browser Console Test
                    </h2>
                    <p className="text-gray-300 mb-4">
                        You can also test from browser console (F12 → Console tab):
                    </p>
                    <pre className="bg-black p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`// Import and run quick test
import { quickTest } from '@/lib/testSupabase';
quickTest();

// Or import full test
import { testSupabaseConnection } from '@/lib/testSupabase';
await testSupabaseConnection();`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

function TestResult({ label, passed, error }: { label: string; passed: boolean; error?: string | null }) {
    return (
        <div className={`flex items-center justify-between p-3 rounded ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
            <span className="text-white">{label}</span>
            <span className={passed ? 'text-green-400' : 'text-red-400'}>
                {passed ? '✅ PASS' : '❌ FAIL'}
            </span>
        </div>
    );
}
