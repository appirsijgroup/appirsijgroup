'use client';

import { useState } from 'react';
import { migrateEmployeesToSupabase, validateEmployeeCSV } from '@/lib/migrateEmployees';

export default function MigrateEmployeesPage() {
    const [csvText, setCsvText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [validation, setValidation] = useState<any>(null);
    const [useNIPAsPassword, setUseNIPAsPassword] = useState(true);

    const handleFileUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setCsvText(text);

            // Validate
            const validation_result = validateEmployeeCSV(text);
            setValidation(validation_result);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleFileUpload(file);
        } else {
            alert('Please upload a CSV file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setCsvText(text);

        if (text.length > 100) {
            const validation_result = validateEmployeeCSV(text);
            setValidation(validation_result);
        } else {
            setValidation(null);
        }
    };

    const handleMigrate = async (dryRun = false) => {
        if (!csvText.trim()) {
            alert('Please upload or paste CSV data first');
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const migrationResult = await migrateEmployeesToSupabase(csvText, {
                batchSize: 50,
                dryRun
            });
            setResult(migrationResult);
        } catch (error: any) {
            setResult({
                success: false,
                error: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadSampleCSV = () => {
        setCsvText(`RS ID,NIP,Nama,Unit,Bagian,Kategori Profesi,Profesi,Jenis Kelamin
RSIJSP,3565,"Ns.RINI ZUPRIANI, S.Kep",Al Ghifari,Rawat Inap,Medis,Perawat,Perempuan
RSIJSP,6000,"Ns. Edi Heryanto, S.Kep",Poliklinik,Rawat Jalan,Medis,Perawat,Laki-Laki
RSIJSP,4560,NOPI IRAWAN,HUMAS & PEMASARAN,Perkantoran & Umum,Non Medis,Perawat,Laki-Laki`);
        setValidation(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-4">
                    📊 Migrate Employees from CSV
                </h1>

                <div className="bg-gray-800 p-6 rounded-lg mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">1. Upload CSV File</h2>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                            isDragging
                                ? 'border-teal-400 bg-teal-400/10'
                                : 'border-gray-600 hover:border-gray-500'
                        }`}
                    >
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="cursor-pointer">
                            <p className="text-gray-300 mb-2">
                                {isDragging ? 'Drop CSV file here' : 'Drag & drop CSV file here'}
                            </p>
                            <p className="text-gray-500 text-sm">or click to browse</p>
                            <p className="text-gray-500 text-xs mt-2">File: employeesdata.csv</p>
                        </label>
                    </div>

                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gray-700"></div>
                        <span className="text-gray-500 text-sm">OR</span>
                        <div className="flex-1 h-px bg-gray-700"></div>
                    </div>

                    {/* Manual Input */}
                    <div>
                        <label className="text-white font-semibold mb-2 block">
                            Paste CSV Content:
                        </label>
                        <textarea
                            value={csvText}
                            onChange={handleManualInput}
                            placeholder="Paste CSV content here..."
                            className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white text-sm font-mono focus:border-teal-400 focus:outline-none"
                        />
                    </div>

                    <div className="mt-4 flex gap-4">
                        <button
                            onClick={loadSampleCSV}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                        >
                            Load Sample
                        </button>
                        <button
                            onClick={() => {
                                setCsvText('');
                                setValidation(null);
                                setResult(null);
                            }}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* Validation Results */}
                {validation && (
                    <div className={`p-4 rounded-lg mb-6 ${
                        validation.valid
                            ? 'bg-green-500/20 border border-green-500'
                            : 'bg-red-500/20 border border-red-500'
                    }`}>
                        <h3 className={`font-bold mb-2 ${
                            validation.valid ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {validation.valid ? '✅ CSV Valid!' : '❌ CSV Validation Failed'}
                        </h3>

                        {validation.sample.length > 0 && (
                            <div className="mb-4">
                                <p className="text-gray-300 text-sm mb-2">Sample data:</p>
                                <div className="bg-black/30 rounded p-2 text-xs text-gray-300">
                                    {validation.sample.map((emp: any, idx: number) => (
                                        <div key={idx} className="mb-1">
                                            {emp.NIP} - {emp.Nama} - {emp.Unit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!validation.valid && validation.errors.length > 0 && (
                            <div>
                                <p className="text-red-300 text-sm mb-1">Errors:</p>
                                <ul className="text-red-200 text-xs list-disc list-inside">
                                    {validation.errors.slice(0, 5).map((err: string, idx: number) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                                {validation.errors.length > 5 && (
                                    <p className="text-red-300 text-xs mt-1">
                                        ... and {validation.errors.length - 5} more errors
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Password Info */}
                <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6">
                    <h3 className="text-blue-300 font-bold mb-2">🔑 Password Information</h3>
                    <ul className="text-blue-200 text-sm space-y-1">
                        <li>✅ Default password: <strong>NIP (Nomor Induk Pegawai)</strong></li>
                        <li>✅ Password will be hashed before storing</li>
                        <li>✅ Users must change password on first login</li>
                        <li>✅ Email: NIP@rsijsp.co.id (auto-generated)</li>
                        <li>✅ Role: Default 'user'</li>
                    </ul>
                </div>

                {/* Migrate Buttons */}
                {csvText && validation?.valid && (
                    <div className="bg-gray-800 p-6 rounded-lg mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">2. Migrate to Supabase</h2>

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleMigrate(true)}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg disabled:bg-gray-600"
                            >
                                🔍 Test Run (Dry Run)
                            </button>
                            <button
                                onClick={() => handleMigrate(false)}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg disabled:bg-gray-600"
                            >
                                {isLoading ? '⏳ Migrating...' : '🚀 Start Migration'}
                            </button>
                        </div>

                        <p className="text-gray-400 text-xs mt-2">
                            ⚠️ Test Run will NOT insert data. Use Start Migration to actually insert.
                        </p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className={`p-6 rounded-lg ${
                        result.success
                            ? 'bg-green-500/20 border border-green-500'
                            : 'bg-red-500/20 border border-red-500'
                    }`}>
                        <h2 className={`text-xl font-bold mb-4 ${
                            result.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                            {result.success ? '✅ Migration Complete!' : '❌ Migration Failed'}
                        </h2>

                        {result.success && (
                            <div className="space-y-2">
                                <p className="text-white">
                                    Total employees: <span className="font-bold">{result.total}</span>
                                </p>
                                <p className="text-green-400">
                                    ✅ Successfully inserted: <span className="font-bold">{result.inserted}</span>
                                </p>
                                {result.errors.length > 0 && (
                                    <p className="text-red-400">
                                        ❌ Failed: <span className="font-bold">{result.errors.length}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        {result.error && (
                            <p className="text-red-300">Error: {result.error}</p>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-600">
                            <p className="text-gray-300 text-sm mb-2">📖 Next Steps:</p>
                            <ul className="text-gray-400 text-sm space-y-1">
                                <li>1. Check Supabase Dashboard → Table Editor → employees</li>
                                <li>2. Verify data imported correctly</li>
                                <li>3. Test login with NIP as password</li>
                                <li>4. Users should change password on first login</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* CSV Format Guide */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-4">📋 Expected CSV Format</h2>
                    <pre className="bg-black p-4 rounded-lg text-green-400 text-xs overflow-x-auto">
{`RS ID,NIP,Nama,Unit,Bagian,Kategori Profesi,Profesi,Jenis Kelamin
RSIJSP,3565,"Ns.RINI ZUPRIANI, S.Kep",Al Ghifari,Rawat Inap,Medis,Perawat,Perempuan
RSIJSP,6000,"Ns. Edi Heryanto, S.Kep",Poliklinik,Rawat Jalan,Medis,Perawat,Laki-Laki
RSIJSP,4560,NOPI IRAWAN,HUMAS & PEMASARAN,Perkantoran & Umum,Non Medis,Perawat,Laki-Laki`}
                    </pre>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <h3 className="text-white font-semibold mb-2">Required Fields:</h3>
                            <ul className="text-gray-300 space-y-1">
                                <li>• RS ID - Hospital code</li>
                                <li>• NIP - Employee ID (unique)</li>
                                <li>• Nama - Full name</li>
                                <li>• Unit - Department</li>
                                <li>• Bagian - Sub-department</li>
                                <li>• Kategori Profesi - Medis/Non Medis</li>
                                <li>• Profesi - Job title</li>
                                <li>• Jenis Kelamin - Gender</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-2">Auto-generated:</h3>
                            <ul className="text-gray-300 space-y-1">
                                <li>• email: NIP@rsijsp.co.id</li>
                                <li>• password: hashed NIP</li>
                                <li>• role: 'user'</li>
                                <li>• is_active: true</li>
                                <li>• must_change_password: true</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
