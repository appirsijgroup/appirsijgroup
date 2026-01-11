/* eslint-disable react-hooks/set-state-in-effect -- Form state resets in modals are intentional */
import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type Role, type Attendance, type AdminReportRecord, type Activity, type RawEmployee, type AdminView, type SunnahIbadah, type DailyActivity, type JobStructure, type AuditLogEntry, Announcement, FunctionalRole, Hospital, AudienceType, AudienceRules, ManagerScope, FailedOperationRecord, type MutabaahLockingMode } from "../types";
import { PRAYERS } from '../data/prayers';
import * as XLSX from 'xlsx';
import { SearchIcon, PdfIcon, ExcelIcon, CalendarDaysIcon, UserIcon, UploadIcon, PencilIcon, XIcon, UserGroupIcon, ChartBarIcon, DocumentTextIcon, SparklesIcon, availableIconsForSunnah, ChevronDownIcon, ShieldCheckIcon, MegaphoneIcon, MosqueIcon, PlusCircleIcon, TrashIcon } from './Icons';
import { generateOfficialPdf, type TableConfig, type ReportSection } from './ReportGenerator';
import PdfPreviewModal from './PdfPreviewModal';
import ConfirmationModal from './ConfirmationModal';

// Lazy load heavy components that are only rendered conditionally
const RelationManagement = lazy(() => import('./RelationManagement'));
const Announcements = lazy(() => import('./Announcements'));

interface AdminDashboardProps {
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }>;
    loggedInEmployee: Employee;
    onToggleStatus: (userId: string) => void;
    onSetRole: (userId: string, newRole: Role) => void;
    onAddUser: (id: string, newEmployeeData: RawEmployee) => Promise<{ success: boolean, error?: string }>;
    onUpdateUser: (id: string, updates: RawEmployee) => Promise<{ success: boolean, error?: string }>;
    onDeleteUser: (userId: string) => void;
    onBulkUpdateUsers: (usersToProcess: (RawEmployee & { id: string; })[]) => Promise<{ added: number, updated: number, failed: { record: RawEmployee & { id: string }, reason: string; }[] }>;
    activities: Activity[];
    onAddActivity: (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdateActivity: (activityId: string, updates: Partial<Activity>) => void;
    onDeleteActivity: (activityId: string) => void;
    onAdminUpdateAttendance: (payload: { userId: string; date: string; entityId: string; status: "hadir" | "tidak-hadir" | null; reason: string | null; }) => void;
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>>) => Promise<boolean>;
    sunnahIbadahList: SunnahIbadah[];
    onAddSunnahIbadah: (ibadahData: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdateSunnahIbadah: (ibadahId: string, updates: Partial<SunnahIbadah>) => void;
    onDeleteSunnahIbadah: (ibadahId: string) => void;
    dailyActivitiesConfig: DailyActivity[];
    onUpdateDailyActivitiesConfig: (newConfig: DailyActivity[]) => void;
    jobStructure: JobStructure;
    onUpdateJobStructure: (newStructure: JobStructure) => void;
    auditLog: AuditLogEntry[];
    onLogAudit: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;
    announcements: Announcement[];
    onCreateAnnouncement: (data: Omit<Announcement, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => void;
    onDeleteAnnouncement: (announcementId: string) => void;
    onMarkAsRead: () => void;
    hospitals: Hospital[];
    onAddHospital: (data: Omit<Hospital, 'id' | 'isActive'>) => Promise<{ success: boolean, error?: string }>;
    onUpdateHospital: (id: string, data: Partial<Omit<Hospital, 'id'>>) => Promise<{ success: boolean, error?: string }>;
    onDeleteHospital: (id: string) => Promise<{ success: boolean, error?: string }>;
    onToggleHospitalStatus: (id: string) => void;
    mutabaahLockingMode: MutabaahLockingMode;
    onUpdateMutabaahLockingMode: (mode: MutabaahLockingMode) => void;
}

type DestructiveAction = 'delete-user' | 'delete-activity' | 'delete-attendance' | 'delete-sunnah-ibadah' | 'toggle-status' | 'set-role' | 'delete-hospital' | 'toggle-hospital-status';
type DateFilterType = 'range' | 'monthly' | 'yearly' | 'all';

type UserManagementSubView = 'database' | 'akun' | 'relasi' | 'jabatan';
type ContentManagementSubView = 'kegiatan' | 'ibadah-sunnah' | 'mutabaah-automation';


const DestructiveConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title: string;
    message: React.ReactNode;
    reasonLabel?: string;
    confirmButtonText?: string;
    isDestructive?: boolean;
}> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    reasonLabel = 'Alasan',
    confirmButtonText = 'Konfirmasi',
    isDestructive = true
}) => {
        const [reason, setReason] = useState('');
        const [error, setError] = useState('');

        useEffect(() => {
            if (isOpen) {
                setReason('');
                setError('');
            }
        }, [isOpen]);

        const handleConfirm = () => {
            if (reason.trim().length < 5) {
                setError('Alasan harus diisi (minimal 5 karakter).');
                return;
            }
            onConfirm(reason);
            onClose();
        };

        if (!isOpen) return null;

        const borderColor = isDestructive ? 'border-red-500/50' : 'border-yellow-500/50';
        const titleColor = isDestructive ? 'text-red-400' : 'text-yellow-300';
        const buttonClass = isDestructive ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500';
        const ringColor = isDestructive ? 'focus:ring-red-400' : 'focus:ring-yellow-400';

        return createPortal(
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                <div className={`bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border ${borderColor}`}>
                    <h3 className={`text-lg font-bold ${titleColor} mb-2`}>{title}</h3>
                    <div className="text-blue-200 mb-4">{message}</div>
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">{reasonLabel}</label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            rows={3}
                            className={`w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 ${ringColor} focus:outline-none text-white`}
                            placeholder="Tuliskan justifikasi Anda di sini..."
                        />
                        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                        <button onClick={handleConfirm} disabled={!reason.trim()} className={`px-4 py-2 rounded-lg font-semibold ${buttonClass} disabled:bg-gray-500 disabled:cursor-not-allowed`}>
                            {confirmButtonText}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

const MultiSelectDropdown: React.FC<{
    label: string;
    options: Array<{ value: string; label: string }>;
    selectedValues: string[];
    onSelectionChange: (newSelected: string[]) => void;
}> = ({ label, options, selectedValues, onSelectionChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onSelectionChange(newSelected);
    };

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const displayLabel = selectedValues.length > 0 ? `${selectedValues.length} terpilih` : `Pilih ${label}...`;

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-blue-100 block mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 text-left flex justify-between items-center"
            >
                <span className="text-white truncate">{displayLabel}</span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-white/20 rounded-md shadow-lg">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Cari..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/20 rounded-md p-2 text-white"
                        />
                    </div>
                    <ul className="py-1 max-h-48 overflow-y-auto">
                        {filteredOptions.map(option => (
                            <li key={option.value}>
                                <label className="flex items-center space-x-3 px-4 py-2 hover:bg-white/10 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedValues.includes(option.value)}
                                        onChange={() => handleToggle(option.value)}
                                        className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-teal-500 focus:ring-teal-500"
                                    />
                                    <span className="text-white text-sm">{option.label}</span>
                                </label>
                            </li>
                        ))}
                        {filteredOptions.length === 0 && <li className="px-4 py-2 text-sm text-gray-400">Tidak ada hasil.</li>}
                    </ul>
                </div>
            )}
        </div>
    );
};


// --- Activity Management Modal ---
const ActivityModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (activityData: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdate: (activityId: string, updates: Partial<Activity>) => void;
    existingActivity: Activity | null;
    allEmployees: Employee[];
    hospitals: Hospital[];
}> = ({ isOpen, onClose, onSave, onUpdate, existingActivity, allEmployees, hospitals }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [zoomUrl, setZoomUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [activityType, setActivityType] = useState<Activity['activityType']>('Umum');
    const [error, setError] = useState('');

    // New state for audience targeting
    const [audienceType, setAudienceType] = useState<AudienceType>('public');
    const [audienceRules, setAudienceRules] = useState<AudienceRules>({});
    const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (existingActivity) {
                setName(existingActivity.name);
                setDescription(existingActivity.description ?? '');
                setDate(existingActivity.date);
                setStartTime(existingActivity.startTime);
                setEndTime(existingActivity.endTime);
                setZoomUrl(existingActivity.zoomUrl || '');
                setYoutubeUrl(existingActivity.youtubeUrl || '');
                setActivityType(existingActivity.activityType || 'Umum');
                setAudienceType(existingActivity.audienceType || 'public');
                setAudienceRules(existingActivity.audienceRules || {});
                setSelectedParticipants(new Set(existingActivity.participantIds || []));
            } else {
                setName('');
                setDescription('');
                const today = new Date().toISOString().split('T')[0];
                setDate(today);
                setStartTime('08:00');
                setEndTime('09:00');
                setZoomUrl('');
                setYoutubeUrl('');
                setActivityType('Umum');
                setAudienceType('public');
                setAudienceRules({});
                setSelectedParticipants(new Set());
            }
            setError('');
            setParticipantSearch('');
        }
    }, [isOpen, existingActivity]);

    const handleParticipantToggle = (employeeId: string) => {
        setSelectedParticipants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        if (!name || !date || !startTime || !endTime) {
            setError('Nama, tanggal, dan waktu mulai/selesai wajib diisi.');
            return;
        }
        if (startTime >= endTime) {
            setError('Waktu mulai harus sebelum waktu selesai.');
            return;
        }
        setError('');

        const participantIds: string[] = audienceType === 'manual' ? [...selectedParticipants] : [];
        const finalAudienceRules: AudienceRules | undefined = audienceType === 'rules' ? audienceRules : undefined;

        const payload: Partial<Activity> = {
            name, description, date, startTime, endTime,
            zoomUrl: zoomUrl.trim(), youtubeUrl: youtubeUrl.trim(), activityType,
            audienceType,
            audienceRules: finalAudienceRules,
            participantIds,
        };

        if (existingActivity) {
            if (existingActivity.status === 'postponed' || existingActivity.status === 'cancelled') {
                payload.status = 'scheduled';
            }
            onUpdate(existingActivity.id, payload);
        } else {
            onSave(payload as Omit<Activity, 'id' | 'createdBy' | 'createdByName'>);
        }
        onClose();
    };

    const filteredEmployees = useMemo(() => {
        if (!participantSearch) return allEmployees;
        const search = participantSearch.toLowerCase();
        return allEmployees.filter(emp => emp.name.toLowerCase().includes(search) || emp.id.includes(search));
    }, [allEmployees, participantSearch]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-pop-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-5xl border border-white/20 h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold mb-4 text-white flex-shrink-0">{existingActivity ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>

                <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Activity Details */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-teal-300 border-b border-white/10 pb-2">Detail Kegiatan</h4>
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-1">Nama Kegiatan</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-1">Deskripsi (Opsional)</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"></textarea>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-blue-100 block mb-1">Jenis Kegiatan</label>
                            <select value={activityType} onChange={e => setActivityType(e.target.value as Activity['activityType'])} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                                <option value="Umum" className="text-black bg-white">Umum</option>
                                <option value="Kajian Selasa" className="text-black bg-white">Kajian Selasa</option>
                                <option value="Pengajian Persyarikatan" className="text-black bg-white">Pengajian Persyarikatan</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-1">Tanggal</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" style={{ colorScheme: 'dark' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Mulai</label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" style={{ colorScheme: 'dark' }} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-blue-100 block mb-1">Selesai</label>
                                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" style={{ colorScheme: 'dark' }} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-1">Tautan Zoom (Opsional)</label>
                                <input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-100 block mb-1">Tautan YouTube (Opsional)</label>
                                <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Audience Targeting */}
                    <div className="space-y-4 flex flex-col">
                        <h4 className="text-lg font-semibold text-teal-300 border-b border-white/10 pb-2">Target Peserta</h4>
                        <div className="flex items-center space-x-2 sm:space-x-4 bg-black/20 p-1.5 rounded-full">
                            <button onClick={() => setAudienceType('public')} className={`flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all duration-300 text-sm ${audienceType === 'public' ? 'bg-teal-500 text-white shadow-md' : 'text-blue-200 hover:bg-white/20'}`}>Publik</button>
                            <button onClick={() => setAudienceType('rules')} className={`flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all duration-300 text-sm ${audienceType === 'rules' ? 'bg-teal-500 text-white shadow-md' : 'text-blue-200 hover:bg-white/20'}`}>Target Atribut</button>
                            <button onClick={() => setAudienceType('manual')} className={`flex-1 text-center py-2 px-4 rounded-full font-semibold transition-all duration-300 text-sm ${audienceType === 'manual' ? 'bg-teal-500 text-white shadow-md' : 'text-blue-200 hover:bg-white/20'}`}>Pilih Manual</button>
                        </div>

                        <div className="flex-grow overflow-hidden flex flex-col">
                            {audienceType === 'public' && (
                                <div className="flex-grow flex items-center justify-center p-4 bg-black/20 rounded-lg text-center">
                                    <p className="text-blue-200">Kegiatan ini akan dapat dilihat oleh <br /> <strong className="text-white">semua karyawan di seluruh rumah sakit</strong>.</p>
                                </div>
                            )}

                            {audienceType === 'rules' && (
                                <div className="p-4 bg-black/20 rounded-lg space-y-4 overflow-y-auto">
                                    <p className="text-xs text-blue-200">Karyawan akan melihat kegiatan ini jika cocok dengan SEMUA kriteria yang dipilih.</p>
                                    <MultiSelectDropdown
                                        label="Rumah Sakit"
                                        options={hospitals.map(h => ({ value: h.id, label: `${h.brand} - ${h.name}` }))}
                                        selectedValues={audienceRules.hospitalIds || []}
                                        onSelectionChange={(newSelected) => setAudienceRules(prev => ({ ...prev, hospitalIds: newSelected }))}
                                    />
                                    <MultiSelectDropdown
                                        label="Unit Kerja"
                                        options={Array.from(new Set(allEmployees.map(e => e.unit))).sort().map(unit => ({ value: unit, label: unit }))}
                                        selectedValues={audienceRules.units || []}
                                        onSelectionChange={(newSelected) => setAudienceRules(prev => ({ ...prev, units: newSelected }))}
                                    />
                                    <MultiSelectDropdown
                                        label="Bagian"
                                        options={Array.from(new Set(allEmployees.map(e => e.bagian))).sort().map(bagian => ({ value: bagian, label: bagian }))}
                                        selectedValues={audienceRules.bagians || []}
                                        onSelectionChange={(newSelected) => setAudienceRules(prev => ({ ...prev, bagians: newSelected }))}
                                    />
                                    <MultiSelectDropdown
                                        label="Kategori Profesi"
                                        options={[{ value: 'MEDIS', label: 'MEDIS' }, { value: 'NON MEDIS', label: 'NON MEDIS' }]}
                                        selectedValues={audienceRules.professionCategories || []}
                                        onSelectionChange={(newSelected) => setAudienceRules(prev => ({ ...prev, professionCategories: newSelected as ('MEDIS' | 'NON MEDIS')[] }))}
                                    />
                                </div>
                            )}

                            {audienceType === 'manual' && (
                                <div className="space-y-2 flex-grow flex flex-col">
                                    <div className="relative flex-shrink-0">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="text" placeholder="Cari nama atau NIP..." value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 pl-9 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                                    </div>
                                    <div className="flex-grow overflow-y-auto border border-white/20 rounded-lg p-2 space-y-1 bg-black/20">
                                        {filteredEmployees.map(emp => (
                                            <label key={emp.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                                <input type="checkbox" checked={selectedParticipants.has(emp.id)} onChange={() => handleParticipantToggle(emp.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                                <span className="text-white font-medium">{emp.name} <span className="text-xs text-gray-400">({emp.id})</span></span>
                                            </label>
                                        ))}
                                        {filteredEmployees.length === 0 && <p className="text-center text-sm text-gray-400 p-4">Karyawan tidak ditemukan.</p>}
                                    </div>
                                    <p className="text-xs text-blue-200 text-right flex-shrink-0 pt-1">Terpilih: {selectedParticipants.size} orang</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex-shrink-0">
                    {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
                    <div className="flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                        <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan Kegiatan</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};


// --- Activity Management Component ---
const ActivityManagement: React.FC<{
    activities: Activity[];
    allEmployees: Employee[];
    onOpenModal: (activity?: Activity | null) => void;
    onInitiateDelete: (activity: Activity) => void;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ activities, allEmployees, onOpenModal, onInitiateDelete }) => {

    const sortedActivities = useMemo(() => {
        return [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.startTime.localeCompare(a.startTime));
    }, [activities]);

    const getAudienceSummary = (activity: Activity) => {
        switch (activity.audienceType) {
            case 'public':
                return <span className="text-green-300">Publik (Semua)</span>;
            case 'manual':
                return <span className="text-yellow-300">{activity.participantIds.length} Orang</span>;
            case 'rules':
                const ruleCount = Object.values(activity.audienceRules || {}).filter(val => Array.isArray(val) && val.length > 0).length;
                return <span className="text-purple-300">Target Aturan ({ruleCount} kriteria)</span>;
            default:
                return (!activity.participantIds || activity.participantIds.length === 0) ?
                    <span className="text-green-300">Publik (Semua)</span> :
                    <span className="text-yellow-300">{activity.participantIds.length} Orang</span>;
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => onOpenModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2">
                    <CalendarDaysIcon className="w-5 h-5" />
                    Tambah Kegiatan Baru
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3">Nama Kegiatan</th>
                            <th scope="col" className="px-4 py-3">Tanggal</th>
                            <th scope="col" className="px-4 py-3">Peserta</th>
                            <th scope="col" className="px-4 py-3">Dibuat Oleh</th>
                            <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedActivities.map(activity => (
                            <tr key={activity.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-semibold">{activity.name}</td>
                                <td className="px-4 py-3">{new Date(activity.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}<br /><span className="text-xs text-gray-400">{activity.startTime} - {activity.endTime}</span></td>
                                <td className="px-4 py-3">
                                    {getAudienceSummary(activity)}
                                </td>
                                <td className="px-4 py-3 text-blue-200">{activity.createdByName}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onOpenModal(activity)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">Edit</button>
                                        <button onClick={() => onInitiateDelete(activity)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors">Hapus</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedActivities.length === 0 && (
                            <tr><td colSpan={5} className="text-center p-8 text-blue-200">Belum ada kegiatan yang dibuat.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Kajian Management Component ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const KajianManagement: React.FC<{
    activities: Activity[];
    onAddActivity: (data: Omit<Activity, 'id' | 'createdBy' | 'createdByName'>) => void;
    onOpenEditModal: (activity: Activity) => void;
    onInitiateUpdateStatus: (activity: Activity, status: 'postponed' | 'cancelled') => void;
}> = ({ activities, onAddActivity, onOpenEditModal, onInitiateUpdateStatus }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const tuesdaysOfMonth = useMemo(() => {
        const tuesdays: Date[] = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const date = new Date(year, month, 1);
        while (date.getMonth() === month) {
            if (date.getDay() === 2) { // 2 is Tuesday
                tuesdays.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
        return tuesdays;
    }, [currentMonth]);

    const handleScheduleKajian = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        onAddActivity({
            name: 'Kajian Selasa Pagi Online',
            description: 'Kajian rutin mingguan yang diadakan setiap hari Selasa.',
            date: dateString,
            startTime: '08:00',
            endTime: '09:00',
            participantIds: [],
            audienceType: 'public',
            zoomUrl: '',
            youtubeUrl: '',
            activityType: 'Kajian Selasa',
            status: 'scheduled',
        });
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid day-of-month issues
            newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
            return newDate;
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6 bg-black/20 p-2 rounded-full">
                <button onClick={() => navigateMonth('prev')} className="px-4 py-2 rounded-full hover:bg-white/10 transition-colors">&larr; Sebelumnya</button>
                <span className="font-bold text-lg text-teal-300">{currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => navigateMonth('next')} className="px-4 py-2 rounded-full hover:bg-white/10 transition-colors">Berikutnya &rarr;</button>
            </div>
            <div className="space-y-3">
                {tuesdaysOfMonth.map(tuesday => {
                    const dateString = tuesday.toISOString().split('T')[0];
                    const existingKajian = activities.find(act => act.date === dateString && act.activityType === 'Kajian Selasa');

                    const statusConfig = {
                        scheduled: { text: "Kajian sudah dijadwalkan", color: "text-green-400" },
                        postponed: { text: "Kajian ditunda", color: "text-yellow-400" },
                        cancelled: { text: "Kajian dibatalkan", color: "text-red-400" },
                    };
                    const currentStatus = existingKajian?.status || 'scheduled';

                    return (
                        <div key={dateString} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-white">{tuesday.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                {existingKajian ? (
                                    <p className={`text-xs font-semibold ${statusConfig[currentStatus].color}`}>{statusConfig[currentStatus].text}</p>
                                ) : (
                                    <p className="text-xs text-gray-400">Belum ada kajian terjadwal</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {existingKajian ? (
                                    <>
                                        <button onClick={() => onOpenEditModal(existingKajian)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                                            {currentStatus === 'scheduled' ? 'Ubah' : 'Aktifkan'}
                                        </button>
                                        {currentStatus === 'scheduled' && (
                                            <button onClick={() => onInitiateUpdateStatus(existingKajian, 'postponed')} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-yellow-600 hover:bg-yellow-500 text-white transition-colors">Tunda</button>
                                        )}
                                        {currentStatus !== 'cancelled' && (
                                            <button onClick={() => onInitiateUpdateStatus(existingKajian, 'cancelled')} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors">Batalkan</button>
                                        )}
                                    </>
                                ) : (
                                    <button onClick={() => handleScheduleKajian(tuesday)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-teal-600 hover:bg-teal-500 text-white transition-colors">
                                        Jadwalkan Kajian
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// --- User Modal for Add/Edit ---
const UserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, data: RawEmployee) => Promise<{ success: boolean, error?: string }>;
    existingUser: Employee | null;
    hospitals: Hospital[];
}> = ({ isOpen, onClose, onSave, existingUser, hospitals }) => {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('');
    const [bagian, setBagian] = useState('');
    const [professionCategory, setProfessionCategory] = useState<'MEDIS' | 'NON MEDIS'>('NON MEDIS');
    const [profession, setProfession] = useState('');
    const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
    const [hospitalId, setHospitalId] = useState<string | undefined>('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (existingUser) {
                setId(existingUser.id);
                setName(existingUser.name);
                setUnit(existingUser.unit);
                setBagian(existingUser.bagian);
                setProfessionCategory(existingUser.professionCategory);
                setProfession(existingUser.profession);
                setGender(existingUser.gender);
                setHospitalId(existingUser.hospitalId);
            } else {
                setId('');
                setName('');
                setUnit('');
                setBagian('');
                setProfessionCategory('NON MEDIS');
                setProfession('');
                setGender('Laki-laki');
                setHospitalId('');
            }
        }
    }, [isOpen, existingUser]);

    const handleSubmit = async () => {
        if (!id || !name || !unit || !profession || !bagian) {
            setError('Semua field wajib diisi.');
            return;
        }
        const result = await onSave(id, { name, unit, bagian, professionCategory, profession, gender, hospitalId });
        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Terjadi kesalahan.');
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">{existingUser ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h3>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">NIP / NOPEG</label>
                        <input type="text" value={id} onChange={e => setId(e.target.value)} disabled={!!existingUser} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white" />
                        {existingUser && <p className="text-xs text-yellow-400 mt-1">NIP tidak dapat diubah.</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Nama Lengkap</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Rumah Sakit (RS ID)</label>
                        <select value={hospitalId || ''} onChange={e => setHospitalId(e.target.value || undefined)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                            <option value="" className="text-black bg-white">-- Tidak Ada --</option>
                            {hospitals.map(h => (
                                <option key={h.id} value={h.id} className="text-black bg-white">{h.brand} - {h.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Unit Kerja</label>
                        <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Bagian</label>
                        <input type="text" value={bagian} onChange={e => setBagian(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Kategori Profesi</label>
                        <select value={professionCategory} onChange={e => setProfessionCategory(e.target.value as 'MEDIS' | 'NON MEDIS')} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                            <option value="NON MEDIS" className="text-black bg-white">NON MEDIS</option>
                            <option value="MEDIS" className="text-black bg-white">MEDIS</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Profesi</label>
                        <input type="text" value={profession} onChange={e => setProfession(e.target.value)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Jenis Kelamin</label>
                        <select value={gender} onChange={e => setGender(e.target.value as 'Laki-laki' | 'Perempuan')} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                            <option value="Laki-laki" className="text-black bg-white">Laki-laki</option>
                            <option value="Perempuan" className="text-black bg-white">Perempuan</option>
                        </select>
                    </div>
                    {!existingUser && <p className="text-xs text-blue-300">Password awal akan sama dengan NIP/NOPEG.</p>}
                    {error && <p className="text-red-400 text-sm mt-2 p-2 bg-red-500/20 border border-red-500 rounded-md">{error}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const UserImportModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onImport: (users: (RawEmployee & { id: string })[]) => Promise<{ added: number, updated: number, failed: FailedOperationRecord[] }>;
}> = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [importResult, setImportResult] = useState<{ added: number, updated: number, failed: FailedOperationRecord[] } | null>(null);

    const resetState = () => {
        setFile(null);
        setIsProcessing(false);
        setError('');
        setImportResult(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        resetState();
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
                setError('Format file tidak didukung. Harap unggah file Excel (.xlsx, .xls) atau CSV.');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleProcessImport = () => {
        if (!file) return;

        setIsProcessing(true);
        setError('');
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    setError('File kosong atau tidak ada data yang dapat dibaca.');
                    setIsProcessing(false);
                    return;
                }

                const expectedHeaders = ['RS ID', 'NIP', 'Nama', 'Unit', 'Bagian', 'Kategori Profesi', 'Profesi', 'Jenis Kelamin'];
                const actualHeaders = Object.keys(json[0]);
                const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));

                if (missingHeaders.length > 0) {
                    setError(`Header file tidak sesuai. Kolom yang hilang: ${missingHeaders.join(', ')}.`);
                    setIsProcessing(false);
                    return;
                }

                const getSanitizedCategory = (rawCategory: unknown): 'MEDIS' | 'NON MEDIS' => {
                    const catStr = String(rawCategory || '').trim().toUpperCase();
                    if (catStr === 'MEDIS') return 'MEDIS';
                    return 'NON MEDIS';
                }
                const getSanitizedGender = (rawGender: unknown): 'Laki-laki' | 'Perempuan' => {
                    const genderStr = String(rawGender || '').trim().toLowerCase();
                    if (genderStr === 'perempuan') return 'Perempuan';
                    return 'Laki-laki'; // Default
                };

                const usersToProcess: (RawEmployee & { id: string })[] = json.map(row => ({
                    id: String(row.NIP).trim(),
                    name: String(row.Nama || '').trim(),
                    unit: String(row.Unit || '').trim(),
                    bagian: String(row.Bagian || '').trim(),
                    professionCategory: getSanitizedCategory(row['Kategori Profesi']),
                    profession: String(row.Profesi || '').trim(),
                    gender: getSanitizedGender(row['Jenis Kelamin']),
                    hospitalId: row['RS ID'] ? String(row['RS ID']).trim().toUpperCase() : undefined
                }));

                const result = await onImport(usersToProcess);
                setImportResult(result);
            } catch (err) {
                console.error("Error parsing file:", err);
                setError('Gagal memproses file. Pastikan formatnya benar.');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setError('Gagal membaca file.');
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { 'RS ID': 'RSIJSP', NIP: '12345', Nama: 'Contoh Pegawai', Unit: 'IT', Bagian: 'Perkantoran & Umum', 'Kategori Profesi': 'NON MEDIS', Profesi: 'Staff IT', 'Jenis Kelamin': 'Laki-laki' }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData, { header: ['RS ID', 'NIP', 'Nama', 'Unit', 'Bagian', 'Kategori Profesi', 'Profesi', 'Jenis Kelamin'] });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Karyawan");
        XLSX.writeFile(wb, "template_import_karyawan.xlsx");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">Impor Data Karyawan Massal</h3>

                {!importResult ? (
                    <div className="space-y-4">
                        <p className="text-sm text-blue-200">Unggah file Excel atau CSV untuk menambah atau memperbarui data karyawan secara massal.</p>
                        <div>
                            <button onClick={handleDownloadTemplate} className="text-sm text-teal-300 hover:underline">
                                Unduh Template File (.xlsx)
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1">Pilih File</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".xlsx, .xls, .csv"
                                className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-400"
                            />
                            {file && <p className="text-xs text-green-300 mt-2">File terpilih: {file.name}</p>}
                        </div>
                        {error && <p className="text-red-400 text-sm mt-2 p-2 bg-red-500/20 border border-red-500 rounded-md">{error}</p>}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-white">Hasil Impor Selesai</h4>
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <p><span className="font-bold text-green-300">{importResult.added}</span> data berhasil ditambahkan.</p>
                            <p><span className="font-bold text-yellow-300">{importResult.updated}</span> data berhasil diperbarui.</p>
                        </div>
                        {importResult.failed.length > 0 && (
                            <div className="p-3 bg-red-500/20 rounded-lg">
                                <p><span className="font-bold text-red-300">{importResult.failed.length}</span> data gagal diproses:</p>
                                <ul className="list-disc list-inside text-sm text-red-200 max-h-32 overflow-y-auto mt-2">
                                    {importResult.failed.map((fail, index) => (
                                        <li key={index}>{fail.reason} - <span className="font-mono text-xs">({JSON.stringify(fail.record)})</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <p className="text-sm text-blue-200">Anda dapat menutup jendela ini sekarang.</p>
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">
                        {importResult ? 'Tutup' : 'Batal'}
                    </button>
                    {!importResult && (
                        <button
                            onClick={handleProcessImport}
                            disabled={!file || isProcessing}
                            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <UploadIcon className="w-5 h-5" />
                            {isProcessing ? 'Memproses...' : 'Impor Data'}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

interface DatabaseKaryawanProps {
    allUsers: Employee[];
    onInitiateDeleteUser: (user: Employee) => void;
    onAddUser: AdminDashboardProps['onAddUser'];
    onUpdateUser: AdminDashboardProps['onUpdateUser'];
    onBulkUpdateUsers: AdminDashboardProps['onBulkUpdateUsers'];
    onOpenUserModal: (user?: Employee) => void;
    hospitals: Hospital[];
}

const DatabaseKaryawan: React.FC<DatabaseKaryawanProps> = ({ allUsers, onInitiateDeleteUser, onOpenUserModal, onBulkUpdateUsers, hospitals }) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20; // Jumlah item per halaman

    const filteredAndSortedUsers = useMemo(() => {
        return allUsers
            .filter(user => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return user.name.toLowerCase().includes(lowerSearch) || user.id.toLowerCase().includes(lowerSearch);
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);

    const hospitalMap = useMemo(() => new Map(hospitals.map(h => [h.id, h.brand])), [hospitals]);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Cari nama atau NIP..."
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white transition-colors"
                    />
                </div>
                <div className="flex justify-end gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                        <UploadIcon className="w-5 h-5" />
                        Impor
                    </button>
                    <button onClick={() => onOpenUserModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                        <UserIcon className="w-5 h-5" />
                        Tambah
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3">RS ID / BRAND</th>
                            <th scope="col" className="px-4 py-3">NIP / NOPEG</th>
                            <th scope="col" className="px-4 py-3">NAMA</th>
                            <th scope="col" className="px-4 py-3">Unit</th>
                            <th scope="col" className="px-4 py-3">Bagian</th>
                            <th scope="col" className="px-4 py-3">Kategori Profesi</th>
                            <th scope="col" className="px-4 py-3">Profesi</th>
                            <th scope="col" className="px-4 py-3">Jenis Kelamin</th>
                            <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-semibold">
                                    {/* 🔥 hospital_id langsung berisi RS ID/BRAND (misal: "RSIJSP", "RSAB") */}
                                    {user.hospitalId || '-'}
                                </td>
                                <td className="px-4 py-3 font-mono">{user.id}</td>
                                <td className="px-4 py-3 font-semibold">{user.name}</td>
                                <td className="px-4 py-3">{user.unit}</td>
                                <td className="px-4 py-3">{user.bagian}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.professionCategory === 'MEDIS' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                                        {user.professionCategory}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{user.profession}</td>
                                <td className="px-4 py-3">{user.gender}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                                        <button onClick={() => onOpenUserModal(user)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">Edit</button>
                                        <button onClick={() => onInitiateDeleteUser(user)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors">Hapus</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length)} dari {filteredAndSortedUsers.length} pengguna
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    // Show all pages if total pages <= 5
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    // Near the end
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {totalPages > 5 && currentPage < totalPages - 2 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}

            <UserImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={onBulkUpdateUsers}
            />
        </div>
    );
};

interface AkunManagementProps {
    allUsers: Employee[];
    onInitiateToggleStatus: (user: Employee) => void;
}

const AkunManagement: React.FC<AkunManagementProps> = ({ allUsers, onInitiateToggleStatus }) => {
    const [activationFilter, setActivationFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman
    const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const filteredUsers = useMemo(() => {
        return allUsers
            .filter(user => {
                if (activationFilter !== 'all') {
                    const isActivated = user.activatedMonths?.includes(currentMonthKey) ?? false;
                    if (activationFilter === 'active' && !isActivated) return false;
                    if (activationFilter === 'inactive' && isActivated) return false;
                }
                if (searchTerm) {
                    const lowerSearch = searchTerm.toLowerCase();
                    if (!user.name.toLowerCase().includes(lowerSearch) && !user.id.toLowerCase().includes(lowerSearch)) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, activationFilter, searchTerm, currentMonthKey]);

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    const filterButtonClass = (filterType: 'all' | 'active' | 'inactive') =>
        `px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${activationFilter === filterType ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-blue-200'
        }`;

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activationFilter, searchTerm]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Cari nama atau NIP..."
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white transition-colors"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-black/20 rounded-full self-start">
                    <button onClick={() => setActivationFilter('all')} className={filterButtonClass('all')}>
                        Semua Akun ({allUsers.length})
                    </button>
                    <button onClick={() => setActivationFilter('active')} className={filterButtonClass('active')}>
                        Sudah Aktivasi Bulan Ini
                    </button>
                    <button onClick={() => setActivationFilter('inactive')} className={filterButtonClass('inactive')}>
                        Belum Aktivasi Bulan Ini
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3">NIP / NOPEG</th>
                            <th scope="col" className="px-4 py-3">Nama</th>
                            <th scope="col" className="px-4 py-3">Status Akun</th>
                            <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-mono">{user.id}</td>
                                <td className="px-4 py-3 font-semibold">{user.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center">
                                        <button
                                            onClick={() => onInitiateToggleStatus(user)}
                                            className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors
                                                ${user.isActive
                                                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                                    : 'bg-green-600 hover:bg-green-500 text-white'
                                                }`}
                                            title={user.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                        >
                                            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-8 text-blue-200">
                                    Tidak ada pengguna yang cocok dengan filter yang dipilih.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredUsers.length)} dari {filteredUsers.length} pengguna
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {/* Display only 2 page numbers at a time */}
                            {Array.from({ length: Math.min(2, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 2) {
                                    // Show all pages if total pages <= 2
                                    pageNum = i + 1;
                                } else if (currentPage <= 2) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 1) {
                                    // Near the end
                                    pageNum = totalPages - 1 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 1 + i;
                                }

                                // Ensure page numbers don't exceed total pages
                                if (pageNum > totalPages) {
                                    pageNum = totalPages - (1 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Show ellipsis and last page if needed */}
                            {totalPages > 2 && currentPage < totalPages - 1 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Attendance Report Component ---
interface AttendanceReportProps {
    allUsersData: AdminDashboardProps['allUsersData'];
    activities: Activity[];
    reportType: 'prayer' | 'activity';
    onShowPreview: (dataUri: string, fileName: string) => void;
    loggedInEmployee: Employee;
    onEditAttendance: (record: AdminReportRecord) => void;
    onDeleteAttendance: (record: AdminReportRecord) => void;
}

const SelectFilter: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: (string | number)[], defaultLabel: string }> = ({ value, onChange, options, defaultLabel }) => (
    <select value={value} onChange={onChange} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
        <option value="all" className="text-black bg-white">{defaultLabel}</option>
        {options.map(opt => <option key={opt} value={String(opt)} className="text-black bg-white">{opt}</option>)}
    </select>
);

const AttendanceReport: React.FC<AttendanceReportProps> = ({ allUsersData, activities, reportType, onShowPreview, loggedInEmployee, onEditAttendance, onDeleteAttendance }) => {
    const [dateFilterType, setDateFilterType] = useState<DateFilterType>('monthly');
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
    const [yearFilter, setYearFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [unitFilter, setUnitFilter] = useState<string>('all');
    const [professionFilter, setProfessionFilter] = useState<string>('all');
    const [nameOrNipFilter, setNameOrNipFilter] = useState<string>('');
    const [activationStatusFilter, setActivationStatusFilter] = useState<'all' | 'activated' | 'not-activated'>('all');


    const prayerMap = useMemo(() => new Map(PRAYERS.map(p => [p.id, p.name])), []);
    const activityMap = useMemo(() => new Map(activities.map(a => [a.id, a.name])), [activities]);

    const { allUnits, allProfessions, allYearsWithData, allReportableEntities } = useMemo(() => {
        const units = new Set<string>();
        const professions = new Set<string>();
        const years = new Set<number>();
        Object.values(allUsersData).forEach(({ employee, history, attendance }) => {
            units.add(employee.unit);
            professions.add(employee.profession);
            Object.keys(history).forEach(dateStr => years.add(new Date(dateStr).getFullYear()));
            if (Object.keys(attendance).length > 0) {
                years.add(new Date().getFullYear());
            }
        });
        const sortedYears = Array.from(years).sort((a, b) => b - a);

        const reportableEntities = reportType === 'prayer'
            ? PRAYERS.map(p => p.name)
            : activities.map(a => a.name);

        return {
            allUnits: Array.from(units).sort(),
            allProfessions: Array.from(professions).sort(),
            allYearsWithData: sortedYears,
            allReportableEntities: Array.from(new Set(reportableEntities)).sort(),
        };
    }, [allUsersData, activities, reportType]);

    useEffect(() => {
        if (allYearsWithData.length > 0 && !yearFilter) {
            setYearFilter(String(allYearsWithData[0]));
        }
    }, [allYearsWithData, yearFilter]);

    const flattenedHistory: AdminReportRecord[] = useMemo(() => {
        const records: AdminReportRecord[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        Object.values(allUsersData).forEach(({ employee, attendance, history }) => {
            const processDailyAttendance = (date: string, dailyAttendance: Attendance) => {
                Object.entries(dailyAttendance).forEach(([entityId, att]) => {
                    const isPrayerRecord = prayerMap.has(entityId);
                    const isActivityRecord = activityMap.has(entityId);

                    if (reportType === 'prayer' && !isPrayerRecord) return;
                    if (reportType === 'activity' && !isActivityRecord) return;

                    const entityName = prayerMap.get(entityId) || activityMap.get(entityId) || 'Data Dihapus';

                    if (att.submitted && att.status && att.timestamp) {
                        records.push({
                            employeeId: employee.id, employeeName: employee.name, unit: employee.unit, professionCategory: employee.professionCategory, profession: employee.profession,
                            date, entityId, prayerName: entityName,
                            status: att.status === 'hadir' ? 'Hadir' : 'Tidak Hadir',
                            detail: att.isLateEntry ? 'Terlambat' : (att.reason || 'Tepat Waktu'),
                            timestamp: new Date(att.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        });
                    }
                });
            };
            // Process historical data
            Object.entries(history).forEach(([date, dailyAttendance]) => processDailyAttendance(date, dailyAttendance));
            // Process today's data
            processDailyAttendance(todayStr, attendance);
        });
        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allUsersData, prayerMap, activityMap, reportType]);

    const filteredData = useMemo(() => {
        const userMap = new Map(Object.values(allUsersData).map((d: { employee: Employee }) => [d.employee.id, d.employee]));

        return flattenedHistory.filter(record => {
            // Date Filter
            if (dateFilterType !== 'all') {
                const recordDate = new Date(record.date);
                recordDate.setHours(0, 0, 0, 0); // Normalize record date to start of day

                if (dateFilterType === 'monthly') {
                    if (!monthFilter) return false;
                    const [year, month] = monthFilter.split('-').map(Number);
                    if (recordDate.getFullYear() !== year || recordDate.getMonth() + 1 !== month) return false;
                } else if (dateFilterType === 'yearly') {
                    if (!yearFilter) return false;
                    const year = Number(yearFilter);
                    if (recordDate.getFullYear() !== year) return false;
                } else if (dateFilterType === 'range') {
                    if (!startDate || !endDate) return false;
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    if (recordDate < start || recordDate > end) return false;
                }
            }

            // Activation Status Filter (only for prayer report and monthly view)
            if (reportType === 'prayer' && dateFilterType === 'monthly' && activationStatusFilter !== 'all') {
                const user = userMap.get(record.employeeId);
                const recordMonthKey = record.date.slice(0, 7);
                const isActivated = user?.activatedMonths?.includes(recordMonthKey) ?? false;

                if (activationStatusFilter === 'activated' && !isActivated) return false;
                if (activationStatusFilter === 'not-activated' && isActivated) return false;
            }

            // Other filters
            if (entityFilter !== 'all' && record.prayerName !== entityFilter) return false;
            if (unitFilter !== 'all' && record.unit !== unitFilter) return false;
            if (professionFilter !== 'all' && record.profession !== professionFilter) return false;
            if (nameOrNipFilter) {
                const searchTerm = nameOrNipFilter.toLowerCase();
                const nameMatch = record.employeeName.toLowerCase().includes(searchTerm);
                const idMatch = record.employeeId.toLowerCase().includes(searchTerm);
                if (!nameMatch && !idMatch) return false;
            }

            return true;
        });
    }, [flattenedHistory, dateFilterType, monthFilter, yearFilter, startDate, endDate, entityFilter, unitFilter, professionFilter, nameOrNipFilter, activationStatusFilter, reportType, allUsersData]);

    const handleDateFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as DateFilterType;
        setDateFilterType(newType);
    };

    const getFileName = (ext: string) => `laporan_presensi_${reportType}_${dateFilterType}_${new Date().toISOString().split('T')[0]}.${ext}`;

    const handlePreviewPdf = () => {
        let subtitle: string;
        switch (dateFilterType) {
            case 'monthly':
                subtitle = `Periode: ${new Date(monthFilter + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
                break;
            case 'yearly':
                subtitle = `Periode: Tahun ${yearFilter}`;
                break;
            case 'range':
                subtitle = `Periode: ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}`;
                break;
            default:
                subtitle = 'Periode: Semua Waktu';
        }

        const sections: ReportSection[] = [];
        const sectionProps = { orientation: 'landscape' as const, pageFormat: 'a4' };


        if (reportType === 'prayer') {
            const reportTitle = `LAPORAN REKAPITULASI PRESENSI SHOLAT`;
            const userMap = new Map(Object.values(allUsersData).map((d: { employee: Employee }) => [d.employee.id, d.employee]));

            const aggregatedData = new Map<string, {
                employeeId: string;
                employeeName: string;
                date: string;
                prayers: Record<string, 'Hadir' | 'Tidak Hadir' | '-'>;
                reasons: string[];
                isMonthActivated: boolean;
            }>();

            const prayerNameToKeyMap = {
                'Subuh': 'subuh', 'Dzuhur': 'dzuhur', 'Jumat': 'dzuhur',
                'Ashar': 'ashar', 'Maghrib': 'maghrib', 'Isya': 'isya'
            };

            filteredData.forEach(record => {
                const key = `${record.employeeId}-${record.date}`;
                if (!aggregatedData.has(key)) {
                    const user = userMap.get(record.employeeId);
                    const recordMonthKey = record.date.slice(0, 7);
                    const isMonthActivated = user?.activatedMonths?.includes(recordMonthKey) ?? false;

                    aggregatedData.set(key, {
                        employeeId: record.employeeId, employeeName: record.employeeName, date: record.date,
                        prayers: { subuh: '-', dzuhur: '-', ashar: '-', maghrib: '-', isya: '-' },
                        reasons: [],
                        isMonthActivated,
                    });
                }

                const entry = aggregatedData.get(key)!;
                const prayerKey = prayerNameToKeyMap[record.prayerName as keyof typeof prayerNameToKeyMap];

                if (prayerKey) {
                    entry.prayers[prayerKey] = record.status;
                    if (record.status === 'Tidak Hadir' && record.detail !== 'Tepat Waktu') {
                        entry.reasons.push(`${record.prayerName}: ${record.detail}`);
                    }
                }
            });

            const tableColumn = ["No", "Tanggal", "NIP", "Nama Karyawan", "Aktivasi", "Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya", "Keterangan"];
            const tableRows = Array.from(aggregatedData.values())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName))
                .map((row, index) => [
                    index + 1,
                    new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                    row.employeeId,
                    row.employeeName,
                    row.isMonthActivated ? 'Sudah' : 'Belum',
                    row.prayers.subuh, row.prayers.dzuhur, row.prayers.ashar, row.prayers.maghrib, row.prayers.isya,
                    row.reasons.join(', ') || '-'
                ]);

            const tableConfig: TableConfig = {
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] }, // Teal color
                didParseCell: (data) => {
                    const aktivasiColumnIndex = 4; // 'Aktivasi' is the 5th column (index 4)
                    if (data.section === 'body' && data.column.index === aktivasiColumnIndex) {
                        const cellText = String(data.cell.raw).toLowerCase();
                        if (cellText === 'sudah') {
                            (data.cell.styles.textColor as [number, number, number]) = [0, 128, 0]; // Green
                        } else if (cellText === 'belum') {
                            (data.cell.styles.textColor as [number, number, number]) = [255, 0, 0]; // Red
                        }
                    }

                    if (data.section === 'body' && data.column.index >= 5 && data.column.index <= 9) {
                        data.cell.styles.halign = 'center';
                    }
                },
            };

            sections.push({ title: reportTitle, subtitle, tables: [tableConfig], ...sectionProps });

        } else { // Activity Report
            const title = `LAPORAN PRESENSI KEGIATAN`;
            const tableColumn = ["Tanggal", "Nama", "Unit", "Kategori Profesi", "Profesi", 'Kegiatan', "Status", "Keterangan", "Waktu"];
            const tableRows = filteredData.map(d => [
                new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
                d.employeeName, d.unit, d.professionCategory, d.profession, d.prayerName, d.status, d.detail, d.timestamp
            ]);

            const tableConfig: TableConfig = {
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] },
            };

            sections.push({ title, subtitle, tables: [tableConfig], ...sectionProps });
        }

        const fileName = getFileName('pdf');
        const dataUri = generateOfficialPdf(sections, fileName, 'datauristring', loggedInEmployee.name) as string;
        if (dataUri) onShowPreview(dataUri, fileName);
    };

    const handleDownloadXlsx = () => {
        let header: string[];
        let data: (string | number)[][];

        if (reportType === 'prayer') {
            header = ["No", "Tanggal", "NIP", "Nama Karyawan", "Unit", "Kategori Profesi", "Profesi", "Aktivasi Bulan Ini", "Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya", "Keterangan"];
            const userMap = new Map(Object.values(allUsersData).map((d: { employee: Employee }) => [d.employee.id, d.employee]));

            const aggregatedData = new Map<string, any>();
            const prayerNameToKeyMap = {
                'Subuh': 'subuh', 'Dzuhur': 'dzuhur', 'Jumat': 'dzuhur',
                'Ashar': 'ashar', 'Maghrib': 'maghrib', 'Isya': 'isya'
            } as const;

            type PrayerNameKey = keyof typeof prayerNameToKeyMap;

            filteredData.forEach(record => {
                const key = `${record.employeeId}-${record.date}`;
                if (!aggregatedData.has(key)) {
                    const user = userMap.get(record.employeeId);
                    const recordMonthKey = record.date.slice(0, 7);
                    const isMonthActivated = user?.activatedMonths?.includes(recordMonthKey) ?? false;

                    aggregatedData.set(key, {
                        employeeId: record.employeeId, employeeName: record.employeeName, date: record.date,
                        unit: record.unit, professionCategory: record.professionCategory, profession: record.profession,
                        isMonthActivated,
                        prayers: { subuh: '-', dzuhur: '-', ashar: '-', maghrib: '-', isya: '-' }, reasons: []
                    });
                }
                const entry = aggregatedData.get(key)!;
                const prayerKeyName = record.prayerName as PrayerNameKey;
                const prayerKey = prayerNameToKeyMap[prayerKeyName];
                if (prayerKey) {
                    entry.prayers[prayerKey] = record.status;
                    if (record.status === 'Tidak Hadir' && record.detail !== 'Tepat Waktu') entry.reasons.push(`${record.prayerName}: ${record.detail}`);
                }
            });
            data = Array.from(aggregatedData.values())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName))
                .map((row, index) => [
                    index + 1, new Date(row.date).toLocaleDateString('id-ID'), row.employeeId, row.employeeName, row.unit, row.professionCategory, row.profession,
                    row.isMonthActivated ? 'Sudah' : 'Belum',
                    row.prayers.subuh, row.prayers.dzuhur, row.prayers.ashar, row.prayers.maghrib, row.prayers.isya,
                    row.reasons.join(', ') || '-'
                ]);

        } else {
            header = ["Tanggal", "NIP", "Nama", "Unit", "Kategori Profesi", "Profesi", 'Nama Kegiatan', "Status", "Keterangan", "Waktu Presensi"];
            data = filteredData.map(d => [
                new Date(d.date).toLocaleDateString('id-ID'), d.employeeId, d.employeeName, d.unit, d.professionCategory, d.profession,
                d.prayerName, d.status, d.detail, d.timestamp
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Presensi");
        XLSX.writeFile(wb, getFileName('xlsx'));
    };

    const DateFilterInputs = () => {
        switch (dateFilterType) {
            case 'range':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-semibold text-blue-200 block mb-1">Dari Tanggal</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-blue-200 block mb-1">Sampai Tanggal</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                        </div>
                    </div>
                );
            case 'monthly':
                return (
                    <div>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">Pilih Bulan</label>
                        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                    </div>
                );
            case 'yearly':
                return (
                    <div>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">Pilih Tahun</label>
                        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            {allYearsWithData.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                        </select>
                    </div>
                );
            case 'all':
            default:
                return <div className="h-[54px] flex items-center justify-center text-sm text-gray-400 italic bg-black/20 rounded-md border border-white/10">Semua data</div>;
        }
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman

    // Pagination logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilterType, monthFilter, yearFilter, startDate, endDate, entityFilter, unitFilter, professionFilter, nameOrNipFilter, activationStatusFilter]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 bg-black/20 rounded-lg">
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Jenis Periode</label>
                    <select value={dateFilterType} onChange={handleDateFilterTypeChange} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                        <option value="range" className="text-black bg-white">Rentang Tanggal</option>
                        <option value="monthly" className="text-black bg-white">Bulanan</option>
                        <option value="yearly" className="text-black bg-white">Tahunan</option>
                        <option value="all" className="text-black bg-white">Semua</option>
                    </select>
                </div>
                <div className="lg:col-span-3">
                    <DateFilterInputs />
                </div>
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">{reportType === 'prayer' ? 'Sholat' : 'Kegiatan'}</label>
                    <SelectFilter value={entityFilter} onChange={e => setEntityFilter(e.target.value)} options={allReportableEntities} defaultLabel={reportType === 'prayer' ? 'Semua Sholat' : 'Semua Kegiatan'} />
                </div>
                <div className="lg:col-span-1">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Unit Kerja</label>
                    <SelectFilter value={unitFilter} onChange={e => setUnitFilter(e.target.value)} options={allUnits} defaultLabel="Semua Unit" />
                </div>
                <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Profesi</label>
                    <SelectFilter value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} options={allProfessions} defaultLabel="Semua Profesi" />
                </div>

                {/* Row 2 */}
                <div className="lg:col-span-2">
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Cari Nama atau NIP</label>
                    <div className="relative">
                        <input type="text" value={nameOrNipFilter} onChange={e => setNameOrNipFilter(e.target.value)} placeholder="Ketik nama atau NIP..." className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm pl-9 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>
                {reportType === 'prayer' && dateFilterType === 'monthly' && (
                    <div className="lg:col-span-1">
                        <label className="text-xs font-semibold text-blue-200 block mb-1">Status Aktivasi</label>
                        <select value={activationStatusFilter} onChange={e => setActivationStatusFilter(e.target.value as 'all' | 'activated' | 'not-activated')} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            <option value="all" className="text-black bg-white">Semua Status</option>
                            <option value="activated" className="text-black bg-white">Sudah Aktivasi</option>
                            <option value="not-activated" className="text-black bg-white">Belum Aktivasi</option>
                        </select>
                    </div>
                )}
                <div className="lg:col-span-1 flex items-end justify-end gap-2">
                    <button onClick={handlePreviewPdf} disabled={filteredData.length === 0} className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold text-white text-xs sm:text-sm transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                        <PdfIcon className="w-5 h-5" />
                        <span>PDF</span>
                    </button>
                    <button onClick={handleDownloadXlsx} disabled={filteredData.length === 0} className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-white text-xs sm:text-sm transition-all disabled:bg-gray-500 disabled:cursor-not-allowed">
                        <ExcelIcon className="w-5 h-5" />
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3">Tanggal</th>
                            <th scope="col" className="px-4 py-3">Nama</th>
                            <th scope="col" className="px-4 py-3">Unit</th>
                            <th scope="col" className="px-4 py-3">Profesi</th>
                            <th scope="col" className="px-4 py-3">Kegiatan</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Keterangan</th>
                            <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((record, index) => (
                            <tr key={`${record.employeeId}-${record.date}-${record.entityId}-${index}`} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-3 font-semibold">{record.employeeName}</td>
                                <td className="px-4 py-3">{record.unit}</td>
                                <td className="px-4 py-3">{record.profession}</td>
                                <td className="px-4 py-3 font-semibold">{record.prayerName}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'Hadir' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {record.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{record.detail}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onEditAttendance(record)} title="Edit Presensi" className="p-1.5 text-blue-300 hover:text-white rounded-md hover:bg-white/10"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteAttendance(record)} title="Hapus Presensi" className="p-1.5 text-red-400 hover:text-red-300 rounded-md hover:bg-white/10"><XIcon className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr><td colSpan={8} className="text-center p-8 text-blue-200">Tidak ada data yang cocok dengan filter yang dipilih.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} catatan
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {/* Display only 2 page numbers at a time */}
                            {Array.from({ length: Math.min(2, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 2) {
                                    // Show all pages if total pages <= 2
                                    pageNum = i + 1;
                                } else if (currentPage <= 2) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 1) {
                                    // Near the end
                                    pageNum = totalPages - 1 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 1 + i;
                                }

                                // Ensure page numbers don't exceed total pages
                                if (pageNum > totalPages) {
                                    pageNum = totalPages - (1 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Show ellipsis and last page if needed */}
                            {totalPages > 2 && currentPage < totalPages - 1 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};




// ... (rest of the components like EditAttendanceModal, SunnahIbadahModal, etc. remain unchanged)

interface EditAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: { userId: string; date: string; entityId: string; status: "hadir" | "tidak-hadir" | null; reason: string | null; }) => void;
    record: AdminReportRecord | null;
}

const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ isOpen, onClose, onSave, record }) => {
    const [status, setStatus] = useState<'hadir' | 'tidak-hadir' | null>(null);
    const [reason, setReason] = useState<string | null>(null);

    useEffect(() => {
        if (record) {
            setStatus(record.status === 'Hadir' ? 'hadir' : 'tidak-hadir');
            setReason(record.detail === 'Tepat Waktu' ? '' : record.detail);
        }
    }, [record]);

    if (!isOpen || !record) return null;

    const handleSave = () => {
        onSave({
            userId: record.employeeId,
            date: record.date,
            entityId: record.entityId,
            status,
            reason: reason || null,
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold mb-1 text-white">Edit Presensi</h3>
                <p className="text-sm text-blue-200 mb-4">{record.employeeName} - {record.prayerName}</p>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Status Kehadiran</label>
                        <select value={status || ''} onChange={e => setStatus(e.target.value as 'hadir' | 'tidak-hadir' | null)} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                            <option value="hadir" className="text-black bg-white">Hadir</option>
                            <option value="tidak-hadir" className="text-black bg-white">Tidak Hadir</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Alasan / Keterangan</label>
                        <input type="text" value={reason || ''} onChange={e => setReason(e.target.value)} placeholder="Misal: Sakit, Dinas Luar, Terlambat" className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan Perubahan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};


const SunnahIbadahModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdate: (id: string, updates: Partial<SunnahIbadah>) => void;
    existingIbadah: SunnahIbadah | null;
}> = ({ isOpen, onClose, onSave, onUpdate, existingIbadah }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'sholat' | 'puasa'>('sholat');
    const [icon, setIcon] = useState('SparklesIcon');
    const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'one-time'>('daily');
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [date, setDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (existingIbadah) {
                setName(existingIbadah.name);
                setType(existingIbadah.type);
                setIcon(existingIbadah.icon);
                setScheduleType(existingIbadah.scheduleType);
                setDaysOfWeek(existingIbadah.daysOfWeek || []);
                setDate(existingIbadah.date || '');
            } else {
                setName('');
                setType('sholat');
                setIcon('SparklesIcon');
                setScheduleType('daily');
                setDaysOfWeek([]);
                setDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, existingIbadah]);

    const handleDayToggle = (dayIndex: number) => {
        setDaysOfWeek(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    const handleSubmit = () => {
        if (!name || !icon) {
            alert('Nama dan Ikon wajib diisi.');
            return;
        }

        const payload: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'> = {
            name, type, icon, scheduleType,
            daysOfWeek: scheduleType === 'weekly' ? daysOfWeek : undefined,
            date: scheduleType === 'one-time' ? date : undefined,
        };

        if (existingIbadah) {
            onUpdate(existingIbadah.id, payload);
        } else {
            onSave(payload);
        }
        onClose();
    };

    if (!isOpen) return null;
    const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">{existingIbadah ? 'Edit Ibadah Sunnah' : 'Tambah Ibadah Sunnah Baru'}</h3>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Ibadah (e.g., Sholat Dhuha)" className="w-full bg-white/10 border-white/30 rounded-lg p-2.5 text-white" />
                    <div className="grid grid-cols-2 gap-4">
                        <select value={type} onChange={e => setType(e.target.value as 'sholat' | 'puasa')} className="w-full bg-white/10 border-white/30 rounded-lg p-2.5 text-white" style={{ colorScheme: 'dark' }}>
                            <option value="sholat" className="bg-white text-black">Sholat</option>
                            <option value="puasa" className="bg-white text-black">Puasa</option>
                        </select>
                        <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-white/10 border-white/30 rounded-lg p-2.5 text-white" style={{ colorScheme: 'dark' }}>
                            {availableIconsForSunnah.map(ic => <option key={ic.name} value={ic.name} className="bg-white text-black">{ic.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-100 block mb-1">Jadwal</label>
                        <select value={scheduleType} onChange={e => setScheduleType(e.target.value as 'daily' | 'weekly' | 'one-time')} className="w-full bg-white/10 border-white/30 rounded-lg p-2.5 text-white" style={{ colorScheme: 'dark' }}>
                            <option value="daily" className="bg-white text-black">Setiap Hari</option>
                            <option value="weekly" className="bg-white text-black">Mingguan</option>
                            <option value="one-time" className="bg-white text-black">Satu Kali</option>
                        </select>
                    </div>
                    {scheduleType === 'weekly' && (
                        <div className="flex justify-around bg-black/20 p-2 rounded-lg">
                            {weekDays.map((day, index) => (
                                <button key={index} onClick={() => handleDayToggle(index)} className={`w-10 h-10 rounded-full font-semibold transition-colors ${daysOfWeek.includes(index) ? 'bg-teal-500 text-white' : 'text-blue-200 hover:bg-white/10'}`}>{day}</button>
                            ))}
                        </div>
                    )}
                    {scheduleType === 'one-time' && (
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/10 border-white/30 rounded-lg p-2.5 text-white" style={{ colorScheme: 'dark' }} />
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};


const MutabaahAutomation: React.FC<{
    dailyActivitiesConfig: DailyActivity[];
    onUpdate: (newConfig: DailyActivity[]) => void;
    mutabaahLockingMode: MutabaahLockingMode;
    onUpdateMutabaahLockingMode: (mode: MutabaahLockingMode) => void;
}> = ({ dailyActivitiesConfig, onUpdate, mutabaahLockingMode, onUpdateMutabaahLockingMode }) => {

    const handleUpdate = (id: string, updates: Partial<DailyActivity>) => {
        const newConfig = dailyActivitiesConfig.map(act => act.id === id ? { ...act, ...updates } : act);
        onUpdate(newConfig);
    };

    const groupedActivities = useMemo(() => {
        return dailyActivitiesConfig.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, typeof dailyActivitiesConfig>);
    }, [dailyActivitiesConfig]);

    return (
        <div className="space-y-6">
            {/* Locking Mode Settings */}
            <div className="bg-black/20 p-5 rounded-lg border border-white/10">
                <h4 className="text-lg font-bold text-teal-300 mb-3">Pengaturan Penguncian Lembar Mutaba&apos;ah</h4>
                <p className="text-sm text-blue-200 mb-4">Pilih mode penguncian untuk lembar mutaba&apos;ah karyawan:</p>

                <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                            type="radio"
                            name="lockingMode"
                            checked={mutabaahLockingMode === 'weekly'}
                            onChange={() => onUpdateMutabaahLockingMode('weekly')}
                            className="mt-1 w-4 h-4 text-teal-500 focus:ring-teal-500 focus:ring-2"
                        />
                        <div>
                            <p className="font-semibold text-white">Perpekan</p>
                            <p className="text-sm text-blue-200 mt-1">
                                Pekan yang sudah terlewat akan dikunci. User tidak dapat mengubah data setelah pekan berakhir.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                            type="radio"
                            name="lockingMode"
                            checked={mutabaahLockingMode === 'monthly'}
                            onChange={() => onUpdateMutabaahLockingMode('monthly')}
                            className="mt-1 w-4 h-4 text-teal-500 focus:ring-teal-500 focus:ring-2"
                        />
                        <div>
                            <p className="font-semibold text-white">Perbulan</p>
                            <p className="text-sm text-blue-200 mt-1">
                                User bebas mengisi data mutaba&apos;ah kapan saja selama bulan berjalan, tanpa penguncian per pekan.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Activities Configuration */}
            {Object.entries(groupedActivities).map(([category, activities]) => (
                <div key={category}>
                    <h4 className="text-lg font-bold text-teal-300 mb-2">{category}</h4>
                    <div className="space-y-3">
                        {activities.map(activity => (
                            <div key={activity.id} className="bg-black/20 p-4 rounded-lg border border-white/10">
                                <p className="font-semibold text-white">{activity.title}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="text-xs font-medium text-blue-100 block mb-1">Target Bulanan</label>
                                        <input
                                            type="number"
                                            value={activity.monthlyTarget}
                                            onChange={e => handleUpdate(activity.id, { monthlyTarget: parseInt(e.target.value, 10) || 0 })}
                                            className="w-full bg-white/10 border-white/30 rounded-lg p-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-blue-100 block mb-1">Pengisian Otomatis</label>
                                        <p className="p-2 h-10 flex items-center text-sm bg-gray-700/50 rounded-lg border border-white/20 text-yellow-300">
                                            {activity.automationTrigger?.type?.replace(/_/g, ' ') || 'MANUAL USER REPORT'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


const SunnahIbadahManagement: React.FC<{
    sunnahIbadahList: SunnahIbadah[];
    onAdd: (data: Omit<SunnahIbadah, 'id' | 'createdBy' | 'createdByName'>) => void;
    onUpdate: (id: string, updates: Partial<SunnahIbadah>) => void;
    onDelete: (id: string) => void;
}> = ({ sunnahIbadahList, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIbadah, setEditingIbadah] = useState<SunnahIbadah | null>(null);

    const handleOpenModal = (ibadah?: SunnahIbadah) => {
        setEditingIbadah(ibadah || null);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5" />
                    Tambah Ibadah Sunnah
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sunnahIbadahList.map(ibadah => (
                    <div key={ibadah.id} className="bg-black/20 p-4 rounded-lg border border-white/10">
                        <h4 className="font-semibold text-white">{ibadah.name}</h4>
                        <p className="text-sm text-blue-200 capitalize">{ibadah.type} - {ibadah.scheduleType.replace('-', ' ')}</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => handleOpenModal(ibadah)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md">Edit</button>
                            <button onClick={() => onDelete(ibadah.id)} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md">Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
            <SunnahIbadahModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={onAdd}
                onUpdate={onUpdate}
                existingIbadah={editingIbadah}
            />
        </div>
    );
};


const AuditLogView: React.FC<{ log: AuditLogEntry[] }> = ({ log }) => {
    return (
        <div className="overflow-x-auto rounded-lg border border-white/20">
            <table className="min-w-full text-sm text-left text-white">
                <thead className="bg-white/10 text-xs uppercase text-blue-200">
                    <tr>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3">Aksi</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Alasan</th>
                    </tr>
                </thead>
                <tbody>
                    {log.map(entry => (
                        <tr key={entry.id} className="border-b border-gray-700 hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 font-semibold">{entry.adminName}</td>
                            <td className="px-4 py-3">{entry.action}</td>
                            <td className="px-4 py-3 text-blue-200">{entry.target}</td>
                            <td className="px-4 py-3 italic">"{entry.reason}"</td>
                        </tr>
                    ))}
                    {log.length === 0 && (
                        <tr><td colSpan={5} className="text-center p-8 text-blue-200">Tidak ada aktivitas audit yang tercatat.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const FUNCTIONAL_ROLES: FunctionalRole[] = ['BPH', 'DIREKSI', 'MANAJER', 'KEPALA URUSAN', 'KEPALA RUANGAN', 'BINROH'];

// A simple reusable toggle switch component
const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
            <span className={`${checked ? 'bg-teal-500' : 'bg-gray-600'} absolute w-full h-full rounded-full`} />
            <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`} />
        </button>
    );
};

interface JabatanManagementProps {
    allUsers: Employee[];
    onUpdateProfile: (userId: string, updates: Partial<Employee>) => void;
    onOpenScopeModal: (user: Employee) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const JabatanManagement: React.FC<JabatanManagementProps> = ({ allUsers, onUpdateProfile, onOpenScopeModal }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        isAdding: boolean;
    } | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman

    const FUNCTIONAL_ROLE_LABELS: Record<FunctionalRole, string> = {
        'BPH': 'BPH',
        'DIREKSI': 'Direksi',
        'MANAJER': 'Manajer',
        'KEPALA URUSAN': 'Ka. Urusan',
        'KEPALA RUANGAN': 'Ka. Ruangan',
        'BINROH': 'Binroh',
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(lowerSearchTerm) ||
            user.id.toLowerCase().includes(lowerSearchTerm)
        );
    }, [allUsers, searchTerm]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredUsers]);

    // Pagination logic
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleRoleToggle = (user: Employee, role: FunctionalRole) => {
        const currentRoles = user.functionalRoles || [];
        const isAddingRole = !currentRoles.includes(role);
        const actionText = isAddingRole ? 'memberikan' : 'mencabut';
        const titleText = isAddingRole ? 'Konfirmasi Pemberian Peran Fungsional' : 'Konfirmasi Pencabutan Peran Fungsional';

        setConfirmation({
            isOpen: true,
            title: titleText,
            message: (
                <>
                    Apakah Anda yakin ingin {actionText} peran <strong>{role}</strong> untuk karyawan <strong>{user.name}</strong>?
                </>
            ),
            onConfirm: () => {
                const newRoles = isAddingRole
                    ? [...currentRoles, role]
                    : currentRoles.filter(r => r !== role);

                const updates: Partial<Employee> = { functionalRoles: newRoles };
                if (role === 'MANAJER' && !isAddingRole) {
                    updates.managerScope = undefined; // Clear scope when role is removed
                }

                onUpdateProfile(user.id, updates);
                setConfirmation(null);
            },
            isAdding: isAddingRole,
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getScopeSummary = (scope?: ManagerScope) => {
        if (!scope) return "Belum diatur";
        const parts: string[] = [];
        if (scope.managedBagians.length > 0) parts.push(`${scope.managedBagians.length} Bagian`);
        if (scope.managedUnits.length > 0) parts.push(`${scope.managedUnits.length} Unit`);
        if (scope.additionalManagedUserIds.length > 0) parts.push(`${scope.additionalManagedUserIds.length} Karyawan`);
        if (parts.length === 0) return "Belum diatur";
        return parts.join(', ');
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-2">Kelola Peran Fungsional</h3>
            <p className="text-blue-200 mb-4 text-sm">Berikan peran fungsional kepada karyawan untuk memberikan akses ke Laporan Analytics.</p>
            <div className="mb-4 relative max-w-md">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NIP karyawan..."
                    className="w-full bg-white/10 border border-white/20 rounded-md py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3">Nama Karyawan</th>
                            {FUNCTIONAL_ROLES.map(role => (
                                <th key={role} className="px-4 py-3 text-center">{FUNCTIONAL_ROLE_LABELS[role]}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-gray-400 font-mono">{user.id}</p>
                                </td>
                                {FUNCTIONAL_ROLES.map(role => (
                                    <td key={role} className="px-4 py-3 text-center align-middle">
                                        <div className="flex items-center justify-center gap-2">
                                            <ToggleSwitch
                                                checked={user.functionalRoles?.includes(role) || false}
                                                onChange={() => handleRoleToggle(user, role)}
                                            />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {sortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={FUNCTIONAL_ROLES.length + 1} className="text-center p-8 text-blue-200">
                                    Tidak ada karyawan yang cocok dengan pencarian.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, sortedUsers.length)} dari {sortedUsers.length} karyawan
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {/* Display only 2 page numbers at a time */}
                            {Array.from({ length: Math.min(2, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 2) {
                                    // Show all pages if total pages <= 2
                                    pageNum = i + 1;
                                } else if (currentPage <= 2) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 1) {
                                    // Near the end
                                    pageNum = totalPages - 1 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 1 + i;
                                }

                                // Ensure page numbers don't exceed total pages
                                if (pageNum > totalPages) {
                                    pageNum = totalPages - (1 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Show ellipsis and last page if needed */}
                            {totalPages > 2 && currentPage < totalPages - 1 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}

            {confirmation && (
                <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText={confirmation.isAdding ? "Ya, Berikan Peran" : "Ya, Cabut Peran"}
                    confirmColorClass={confirmation.isAdding ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}
                />
            )}
        </div>
    );
};


export type BinrohDashboardProps = Pick<AdminDashboardProps,
    'allUsersData' |
    'loggedInEmployee' |
    'activities' |
    'onAddActivity' |
    'onUpdateActivity' |
    'onDeleteActivity' |
    'onAdminUpdateAttendance' |
    'sunnahIbadahList' |
    'onAddSunnahIbadah' |
    'onUpdateSunnahIbadah' |
    'onDeleteSunnahIbadah' |
    'dailyActivitiesConfig' |
    'onUpdateDailyActivitiesConfig' |
    'onLogAudit' |
    'announcements' |
    'onCreateAnnouncement' |
    'onDeleteAnnouncement' |
    'onMarkAsRead' |
    'onUpdateProfile' |
    'hospitals' |
    'mutabaahLockingMode' |
    'onUpdateMutabaahLockingMode'
>;

// Tab button component for navigation
const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: React.FC<{ className: string }> }> = ({ active, onClick, label, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-5 rounded-t-lg font-semibold transition-all duration-300 ease-in-out text-base border-b-2
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);

// Sub-tab button component for nested navigation
const SubTabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${active ? 'bg-teal-600 text-white' : 'hover:bg-white/10 text-blue-200'}`}
    >
        {children}
    </button>
);

export const BinrohDashboard: React.FC<BinrohDashboardProps> = (props) => {
    /* eslint-disable */
    const {
        allUsersData, loggedInEmployee, activities, onAddActivity, onUpdateActivity, onDeleteActivity, onAdminUpdateAttendance,
        sunnahIbadahList, onAddSunnahIbadah, onUpdateSunnahIbadah, onDeleteSunnahIbadah,
        dailyActivitiesConfig, onUpdateDailyActivitiesConfig, onLogAudit, announcements,
        onCreateAnnouncement, onDeleteAnnouncement, onMarkAsRead, onUpdateProfile, hospitals,
        mutabaahLockingMode, onUpdateMutabaahLockingMode
    } = props;
    /* eslint-enable */

    type BinrohAdminView = 'manajemen-konten' | 'reports' | 'pengumuman';

    const [activeView, setActiveView] = useState<BinrohAdminView>('manajemen-konten');
    const [contentManagementSubView, setContentManagementSubView] = useState<ContentManagementSubView>('kegiatan');
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [confirmingDestructiveAction, setConfirmingDestructiveAction] = useState<{ action: DestructiveAction, data: unknown, title: string, message: React.ReactNode } | null>(null);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AdminReportRecord | null>(null);
    const [reportSubView, setReportSubView] = useState<'sholat' | 'kegiatan'>('sholat');

    const allUsers = useMemo(() => Object.values(allUsersData).map((d: { employee: Employee }) => d.employee), [allUsersData]);

    const handleOpenActivityModal = (activity: Activity | null = null) => {
        setEditingActivity(activity);
        setIsActivityModalOpen(true);
    };

    const handleInitiateDeleteActivity = (activity: Activity) => {
        setConfirmingDestructiveAction({
            action: 'delete-activity',
            data: activity.id,
            title: `Hapus Kegiatan "${activity.name}"`,
            message: <p>Apakah Anda yakin? Semua data presensi terkait kegiatan ini juga akan dihapus secara permanen.</p>
        });
    };

    const handleInitiateDeleteAttendance = (record: AdminReportRecord) => {
        setConfirmingDestructiveAction({
            action: 'delete-attendance',
            data: { userId: record.employeeId, date: record.date, entityId: record.entityId },
            title: `Hapus Presensi`,
            message: <p>Anda akan menghapus data presensi untuk <strong>{record.employeeName}</strong> pada kegiatan <strong>{record.prayerName}</strong> tanggal {record.date}.</p>
        });
    };

    const handleInitiateDeleteSunnahIbadah = (ibadahId: string) => {
        const ibadah = sunnahIbadahList.find(i => i.id === ibadahId);
        if (!ibadah) return;
        setConfirmingDestructiveAction({
            action: 'delete-sunnah-ibadah',
            data: ibadah.id,
            title: `Hapus Ibadah Sunnah "${ibadah.name}"`,
            message: <p>Apakah Anda yakin? Ini akan menghapus ibadah dari daftar dan semua data presensi terkait.</p>
        });
    };

    const handleConfirmDestructiveAction = (reason: string) => {
        if (!confirmingDestructiveAction) return;

        const { action, data } = confirmingDestructiveAction;
        switch (action) {
            case 'delete-activity': {
                const activityId = data as string;
                const activity = activities.find(a => a.id === activityId);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Kegiatan', target: `ID: ${activityId}, Nama: ${activity?.name || 'N/A'}`, reason });
                onDeleteActivity(activityId);
                break;
            }
            case 'delete-attendance': {
                const attendanceData = data as { entityId: string; userId: string; date: string };
                const activityName = activities.find(a => a.id === attendanceData.entityId)?.name || PRAYERS.find(p => p.id === attendanceData.entityId)?.name || 'N/A';
                const userName = allUsersData[attendanceData.userId]?.employee.name || 'N/A';
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Presensi', target: `User: ${userName}, Entity: ${activityName}, Date: ${attendanceData.date}`, reason });
                onAdminUpdateAttendance({ ...attendanceData, status: null, reason: null });
                break;
            }
            case 'delete-sunnah-ibadah': {
                const ibadahId = data as string;
                const ibadah = sunnahIbadahList.find(i => i.id === ibadahId);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Ibadah Sunnah', target: `ID: ${ibadahId}, Nama: ${ibadah?.name || 'N/A'}`, reason });
                onDeleteSunnahIbadah(ibadahId);
                break;
            }
        }

        setConfirmingDestructiveAction(null);
    };

    return (
        <div>
            <div className="mb-6">
                <nav className="flex items-center gap-2 -mb-px flex-wrap border-b border-white/20">
                    <TabButton active={activeView === 'manajemen-konten'} onClick={() => setActiveView('manajemen-konten')} label="Konten & Aktivitas" icon={DocumentTextIcon} />
                    <TabButton active={activeView === 'reports'} onClick={() => setActiveView('reports')} label="Laporan" icon={ChartBarIcon} />
                    <TabButton active={activeView === 'pengumuman'} onClick={() => setActiveView('pengumuman')} label="Pengumuman" icon={MegaphoneIcon} />
                </nav>
            </div>

            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                {activeView === 'manajemen-konten' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-lg self-start">
                            <SubTabButton active={contentManagementSubView === 'kegiatan'} onClick={() => setContentManagementSubView('kegiatan')}>Manajemen Kegiatan</SubTabButton>
                            <SubTabButton active={contentManagementSubView === 'ibadah-sunnah'} onClick={() => setContentManagementSubView('ibadah-sunnah')}>Ibadah Sunnah</SubTabButton>
                            <SubTabButton active={contentManagementSubView === 'mutabaah-automation'} onClick={() => setContentManagementSubView('mutabaah-automation')}>Otomatisasi Mutaba&apos;ah</SubTabButton>
                        </div>
                        {contentManagementSubView === 'kegiatan' && (
                            <ActivityManagement activities={activities} allEmployees={allUsers} onOpenModal={handleOpenActivityModal} onInitiateDelete={handleInitiateDeleteActivity} />
                        )}
                        {contentManagementSubView === 'ibadah-sunnah' && (
                            <SunnahIbadahManagement sunnahIbadahList={sunnahIbadahList} onAdd={onAddSunnahIbadah} onUpdate={onUpdateSunnahIbadah} onDelete={handleInitiateDeleteSunnahIbadah} />
                        )}
                        {contentManagementSubView === 'mutabaah-automation' && (
                            <MutabaahAutomation
                                dailyActivitiesConfig={dailyActivitiesConfig}
                                onUpdate={onUpdateDailyActivitiesConfig}
                                mutabaahLockingMode={mutabaahLockingMode}
                                onUpdateMutabaahLockingMode={onUpdateMutabaahLockingMode}
                            />
                        )}
                    </div>
                )}

                {activeView === 'reports' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-lg self-start">
                            <SubTabButton active={reportSubView === 'sholat'} onClick={() => setReportSubView('sholat')}>Laporan Sholat</SubTabButton>
                            <SubTabButton active={reportSubView === 'kegiatan'} onClick={() => setReportSubView('kegiatan')}>Laporan Kegiatan</SubTabButton>
                        </div>
                        {reportSubView === 'sholat' && (
                            <AttendanceReport allUsersData={allUsersData} activities={activities} reportType="prayer" onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }} loggedInEmployee={loggedInEmployee} onEditAttendance={setEditingAttendanceRecord} onDeleteAttendance={handleInitiateDeleteAttendance} />
                        )}
                        {reportSubView === 'kegiatan' && (
                            <AttendanceReport allUsersData={allUsersData} activities={activities} reportType="activity" onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }} loggedInEmployee={loggedInEmployee} onEditAttendance={setEditingAttendanceRecord} onDeleteAttendance={handleInitiateDeleteAttendance} />
                        )}
                    </div>
                )}

                {activeView === 'pengumuman' && (
                    <Announcements
                        announcements={announcements}
                        loggedInEmployee={loggedInEmployee}
                        allUsers={allUsers}
                        onCreate={onCreateAnnouncement}
                        onDelete={onDeleteAnnouncement}
                        onMarkAsRead={onMarkAsRead}
                    />
                )}
            </div>

            <ActivityModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} onSave={onAddActivity} onUpdate={onUpdateActivity} existingActivity={editingActivity} allEmployees={allUsers} hospitals={hospitals} />
            <DestructiveConfirmationModal isOpen={!!confirmingDestructiveAction} onClose={() => setConfirmingDestructiveAction(null)} onConfirm={handleConfirmDestructiveAction} title={confirmingDestructiveAction?.title || ''} message={confirmingDestructiveAction?.message} />
            <PdfPreviewModal isOpen={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} pdfDataUri={pdfDataUri} fileName={pdfFileName} />
            <EditAttendanceModal isOpen={!!editingAttendanceRecord} onClose={() => setEditingAttendanceRecord(null)} onSave={onAdminUpdateAttendance} record={editingAttendanceRecord} />
        </div>
    );
};

interface AdminManagementProps {
    allUsers: Employee[];
    loggedInEmployee: Employee;
    onInitiateSetRole: (user: Employee, newRole: Role) => void;
    onManageAccess: (user: Employee) => void;
    hospitals: Hospital[];
}

const AdminManagement: React.FC<AdminManagementProps> = ({ allUsers, loggedInEmployee, onInitiateSetRole, onManageAccess, hospitals }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // Jumlah item per halaman

    const hospitalMap = useMemo(() => new Map(hospitals.map(h => [h.id, h.brand])), [hospitals]);

    const filteredAndSortedUsers = useMemo(() => {
        return allUsers
            .filter(user => {
                if (!searchTerm) return true;
                const lowerSearch = searchTerm.toLowerCase();
                return user.name.toLowerCase().includes(lowerSearch) || user.id.toLowerCase().includes(lowerSearch);
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, searchTerm]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const roleConfig: Record<Role, { label: string; className: string }> = {
        'super-admin': { label: 'Super Admin', className: 'bg-purple-500/20 text-purple-300' },
        'admin': { label: 'Admin', className: 'bg-blue-500/20 text-blue-300' },
        'user': { label: 'User', className: 'bg-gray-500/20 text-gray-300' },
    };

    const getRoleLabel = (role: Role) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleConfig[role].className}`}>
            {roleConfig[role].label}
        </span>
    );

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-2">Manajemen Peran & Akses Admin</h3>
            <p className="text-blue-200 mb-4 text-sm">Tetapkan pengguna mana yang memiliki hak akses sebagai Admin atau Super Admin, dan kelola rumah sakit yang dapat mereka akses.</p>
            <div className="mb-4 relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NIP..."
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white transition-colors"
                />
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3">Nama</th>
                            <th scope="col" className="px-4 py-3">RS ID / BRAND</th>
                            <th scope="col" className="px-4 py-3">Peran Saat Ini</th>
                            <th scope="col" className="px-4 py-3">Akses Rumah Sakit</th>
                            <th scope="col" className="px-4 py-3 text-center">Aksi Perubahan Peran</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => {
                            const isSelf = user.id === loggedInEmployee.id;
                            const loggedInUserIsScopedSuperAdmin = loggedInEmployee.role === 'super-admin' && Array.isArray(loggedInEmployee.managedHospitalIds) && loggedInEmployee.managedHospitalIds.length > 0;
                            const hideManageButtonForSelf = isSelf && loggedInUserIsScopedSuperAdmin;

                            return (
                                <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                    <td className="px-4 py-3 font-semibold">
                                        {user.name}
                                        <span className="block font-mono text-xs text-gray-400">{user.id}</span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                        {/* 🔥 hospital_id langsung berisi RS ID/BRAND */}
                                        {user.hospitalId || '-'}
                                    </td>
                                    <td className="px-4 py-3">{getRoleLabel(user.role)}</td>
                                    <td className="px-4 py-3">
                                        {(user.role === 'admin' || user.role === 'super-admin') ? (
                                            <div className="flex items-center gap-2">
                                                <div className="grow">
                                                    {user.role === 'super-admin' && (!user.managedHospitalIds || user.managedHospitalIds.length === 0) ? (
                                                        <span className="font-semibold text-purple-300">Global (Semua RS)</span>
                                                    ) : user.managedHospitalIds && user.managedHospitalIds.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.managedHospitalIds.map(id => (
                                                                <span key={id} className="px-2 py-0.5 bg-gray-600 text-gray-200 rounded-full text-xs">{hospitalMap.get(id) || id}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-yellow-400 italic">Akses belum diatur</span>
                                                    )}
                                                </div>
                                                {!hideManageButtonForSelf && (
                                                    <button onClick={() => onManageAccess(user)} className="px-3 py-1 rounded-md font-semibold text-xs bg-gray-600 hover:bg-gray-500 text-white transition-colors">Kelola</button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            {isSelf ? (
                                                <span className="text-xs text-gray-400 italic">Tidak dapat mengubah peran diri sendiri</span>
                                            ) : (
                                                <>
                                                    {user.role !== 'super-admin' && (
                                                        <button onClick={() => onInitiateSetRole(user, 'super-admin')} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-purple-600 hover:bg-purple-500 text-white">Jadikan Super Admin</button>
                                                    )}
                                                    {user.role !== 'admin' && (
                                                        <button onClick={() => onInitiateSetRole(user, 'admin')} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white">Jadikan Admin</button>
                                                    )}
                                                    {user.role !== 'user' && (
                                                        <button onClick={() => onInitiateSetRole(user, 'user')} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-gray-600 hover:bg-gray-500 text-white">Jadikan User</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredAndSortedUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-blue-200">
                                    Tidak ada pengguna yang cocok dengan pencarian.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-blue-200">
                        Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length)} dari {filteredAndSortedUsers.length} pengguna
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {/* Display only 2 page numbers at a time */}
                            {Array.from({ length: Math.min(2, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 2) {
                                    // Show all pages if total pages <= 2
                                    pageNum = i + 1;
                                } else if (currentPage <= 2) {
                                    // Near the beginning
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 1) {
                                    // Near the end
                                    pageNum = totalPages - 1 + i;
                                } else {
                                    // Somewhere in the middle
                                    pageNum = currentPage - 1 + i;
                                }

                                // Ensure page numbers don't exceed total pages
                                if (pageNum > totalPages) {
                                    pageNum = totalPages - (1 - i);
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === pageNum
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Show ellipsis and last page if needed */}
                            {totalPages > 2 && currentPage < totalPages - 1 && (
                                <>
                                    <span className="mx-1 text-gray-400">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`w-8 h-8 rounded-full text-sm font-semibold ${
                                            currentPage === totalPages
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                                        }`}
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md font-semibold text-sm bg-gray-600 hover:bg-gray-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Hospital Modal for Add/Edit ---
interface HospitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Hospital, 'id' | 'isActive'>, id?: string) => Promise<{ success: boolean, error?: string }>;
    existingHospital: Hospital | null;
}

const HospitalModal: React.FC<HospitalModalProps> = ({ isOpen, onClose, onSave, existingHospital }) => {
    const [brand, setBrand] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [logo, setLogo] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null); // Store actual file
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setError('');
            if (existingHospital) {
                setBrand(existingHospital.brand);
                setName(existingHospital.name);
                setAddress(existingHospital.address);
                setLogo(existingHospital.logo);
                setLogoFile(null); // Reset file on edit
            } else {
                setBrand('');
                setName('');
                setAddress('');
                setLogo(null);
                setLogoFile(null);
            }
        }
    }, [isOpen, existingHospital]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setLogoFile(file); // Store file for upload
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string); // Preview
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!brand || !name || !address) {
            setError('Semua field wajib diisi.');
            return;
        }
        const result = await onSave(
            {
                brand,
                name,
                address,
                logo: logo || null
            },
            existingHospital?.id
        );
        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Terjadi kesalahan.');
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">{existingHospital ? 'Edit Data Rumah Sakit' : 'Tambah Rumah Sakit Baru'}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Brand / Singkatan (ID)</label>
                        <input type="text" value={brand} onChange={e => setBrand(e.target.value)} disabled={!!existingHospital} placeholder="e.g., RSIJSP" className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white" />
                        {existingHospital && <p className="text-xs text-yellow-400 mt-1">ID tidak dapat diubah.</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Nama Lengkap Rumah Sakit</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., RS Islam Jakarta Sukapura" className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Alamat</label>
                        <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"></textarea>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Logo Rumah Sakit</label>
                        <div className="mt-1 flex items-center gap-4">
                            {logo ? (
                                <img src={logo} alt="Logo preview" className="h-20 w-20 object-contain rounded-md bg-white p-1 shadow-md" />
                            ) : (
                                <div className="h-20 w-20 flex items-center justify-center bg-gray-700 rounded-md text-gray-400 text-xs text-center p-2">Logo Belum Diunggah</div>
                            )}
                            <div className="flex flex-col gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/png, image/jpeg" className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold flex items-center gap-2">
                                    <UploadIcon className="w-5 h-5" /> Unggah Logo
                                </button>
                                {logo && (
                                    <button type="button" onClick={() => setLogo(null)} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 font-semibold flex items-center gap-2">
                                        <TrashIcon className="w-5 h-5" /> Hapus Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2 p-2 bg-red-500/20 border border-red-500 rounded-md">{error}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};


// --- Hospital Management ---
interface HospitalManagementProps {
    hospitals: Hospital[];
    onAdd: (data: Omit<Hospital, 'id' | 'isActive'>) => Promise<{ success: boolean, error?: string }>;
    onUpdate: (id: string, data: Partial<Omit<Hospital, 'id'>>) => Promise<{ success: boolean, error?: string }>;
    onDelete: (hospital: Hospital) => void;
    onToggleStatus: (hospital: Hospital) => void;
}

const HospitalManagement: React.FC<HospitalManagementProps> = ({ hospitals, onAdd, onUpdate, onDelete, onToggleStatus }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

    const handleOpenModal = (hospital: Hospital | null = null) => {
        setEditingHospital(hospital);
        setIsModalOpen(true);
    };

    const handleSave = async (data: Omit<Hospital, 'id' | 'isActive'>, id?: string) => {
        if (id) {
            return await onUpdate(id, data);
        } else {
            return await onAdd(data);
        }
    };

    const sortedHospitals = useMemo(() => {
        return [...hospitals].sort((a, b) => a.brand.localeCompare(b.brand));
    }, [hospitals]);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white">Manajemen Rumah Sakit</h3>
                    <p className="text-sm text-blue-200">Kelola daftar rumah sakit dalam grup.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" />
                    Tambah RS Baru
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3">Logo</th>
                            <th className="px-4 py-3">Brand (ID)</th>
                            <th className="px-4 py-3">Nama Lengkap</th>
                            <th className="px-4 py-3">Alamat</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedHospitals.map(hospital => (
                            <tr key={hospital.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3">
                                    {hospital.logo ? (
                                        <img src={hospital.logo} alt={`${hospital.brand} logo`} className="h-10 w-10 object-contain rounded-md bg-white p-0.5" />
                                    ) : (
                                        <div className="h-10 w-10 flex items-center justify-center bg-gray-700 rounded-md text-gray-500 text-xs">No Logo</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-semibold font-mono">{hospital.id}</td>
                                <td className="px-4 py-3">{hospital.name}</td>
                                <td className="px-4 py-3 max-w-xs truncate">{hospital.address}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${hospital.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {hospital.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleOpenModal(hospital)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-md">Edit</button>
                                        <button onClick={() => onToggleStatus(hospital)} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${hospital.isActive ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                            {hospital.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                        <button onClick={() => onDelete(hospital)} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 rounded-md">Hapus</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedHospitals.length === 0 && (
                            <tr><td colSpan={6} className="text-center p-8 text-blue-200">Belum ada data rumah sakit.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <HospitalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                existingHospital={editingHospital}
            />
        </div>
    );
};

interface ManageAdminAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (hospitalIds: string[]) => void;
    user: Employee | null;
    availableHospitals: Hospital[];
}

const ManageAdminAccessModal: React.FC<ManageAdminAccessModalProps> = ({ isOpen, onClose, onSave, user, availableHospitals }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && user) {
            setSelectedIds(new Set(user.managedHospitalIds || []));
        }
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleToggle = (hospitalId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(hospitalId)) {
                newSet.delete(hospitalId);
            } else {
                newSet.add(hospitalId);
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(selectedIds));
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold text-white">Kelola Akses Rumah Sakit</h3>
                <p className="text-blue-200 mb-4">Pilih rumah sakit yang dapat dikelola oleh <strong className="text-teal-300">{user.name}</strong>.</p>

                <div className="max-h-80 overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg">
                    {availableHospitals.map(hospital => (
                        <label key={hospital.id} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-white/10 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.has(hospital.id)}
                                onChange={() => handleToggle(hospital.id)}
                                className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"
                            />
                            <div>
                                <span className="text-white font-medium">{hospital.name}</span>
                                <span className="text-xs text-gray-400 block">({hospital.brand})</span>
                            </div>
                        </label>
                    ))}
                    {availableHospitals.length === 0 && <p className="text-center text-gray-400 p-4">Tidak ada rumah sakit yang tersedia untuk dikelola.</p>}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan Akses</button>
                </div>
            </div>
        </div>,
        document.body
    );
};


export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
    /* eslint-disable */
    const {
        allUsersData, loggedInEmployee, onToggleStatus, onSetRole, onAddUser, onUpdateUser,
        onDeleteUser, onBulkUpdateUsers, activities, onAddActivity, onUpdateActivity, onDeleteActivity,
        onAdminUpdateAttendance, sunnahIbadahList, onAddSunnahIbadah, onUpdateSunnahIbadah, onDeleteSunnahIbadah,
        dailyActivitiesConfig, onUpdateDailyActivitiesConfig, jobStructure, onUpdateJobStructure, auditLog, onLogAudit,
        announcements, onCreateAnnouncement, onDeleteAnnouncement, onMarkAsRead, onUpdateProfile, hospitals, onAddHospital, onUpdateHospital, onDeleteHospital, onToggleHospitalStatus,
        mutabaahLockingMode, onUpdateMutabaahLockingMode
    } = props;
    /* eslint-enable */

    const [activeView, setActiveView] = useState<AdminView>(
        loggedInEmployee.role === 'super-admin' ? 'manajemen-pengguna' : 'manajemen-konten'
    );

    useEffect(() => {
        if (loggedInEmployee.role !== 'super-admin') {
            if (['manajemen-pengguna', 'manajemen-rs', 'audit-log', 'manajemen-admin'].includes(activeView)) {
                setActiveView('manajemen-konten');
            }
        }
    }, [loggedInEmployee.role, activeView]);

    // States for modals
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Employee | null>(null);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [confirmingDestructiveAction, setConfirmingDestructiveAction] = useState<{
        action: DestructiveAction,
        data: unknown,
        title: string,
        message: React.ReactNode,
        reasonLabel?: string;
        confirmButtonText?: string;
        isDestructive?: boolean;
    } | null>(null);
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
    const [pdfFileName, setPdfFileName] = useState('');
    const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AdminReportRecord | null>(null);
    const [userManagementSubView, setUserManagementSubView] = useState<UserManagementSubView>('database');
    const [contentManagementSubView, setContentManagementSubView] = useState<ContentManagementSubView>('kegiatan');
    const [reportSubView, setReportSubView] = useState<'sholat' | 'kegiatan'>('sholat');
    const [managingAccessFor, setManagingAccessFor] = useState<Employee | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [managingScopeForUser, setManagingScopeForUser] = useState<Employee | null>(null);

    const allUsers = useMemo(() => Object.values(allUsersData).map((d: { employee: Employee }) => d.employee), [allUsersData]);

    const handleOpenUserModal = (user: Employee | null = null) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleOpenActivityModal = (activity: Activity | null = null) => {
        setEditingActivity(activity);
        setIsActivityModalOpen(true);
    };
    const handleInitiateToggleStatus = (user: Employee) => {
        setConfirmingDestructiveAction({
            action: 'toggle-status',
            data: user.id,
            title: `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} Akun Pengguna`,
            message: <>Apakah Anda yakin ingin {user.isActive ? 'menonaktifkan' : 'mengaktifkan'} akun untuk <strong>{user.name}</strong>?</>,
            isDestructive: !user.isActive,
            confirmButtonText: user.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
        });
    };

    const handleInitiateSetRole = (user: Employee, newRole: Role) => {
        setConfirmingDestructiveAction({
            action: 'set-role',
            data: { userId: user.id, newRole },
            title: `Ubah Peran Pengguna`,
            message: <>Apakah Anda yakin ingin mengubah peran <strong>{user.name}</strong> menjadi <strong>{newRole}</strong>?</>,
            isDestructive: false,
            confirmButtonText: 'Ya, Ubah Peran',
        });
    };

    const handleInitiateDeleteUser = (user: Employee) => {
        setConfirmingDestructiveAction({
            action: 'delete-user',
            data: user.id,
            title: `Hapus Pengguna "${user.name}"`,
            message: <p>Tindakan ini akan menghapus pengguna dan semua data terkait secara permanen. Ini tidak dapat diurungkan.</p>
        });
    };

    const handleInitiateDeleteActivity = (activity: Activity) => {
        setConfirmingDestructiveAction({
            action: 'delete-activity',
            data: activity.id,
            title: `Hapus Kegiatan "${activity.name}"`,
            message: <p>Apakah Anda yakin? Semua data presensi terkait kegiatan ini juga akan dihapus secara permanen.</p>
        });
    };

    const handleInitiateDeleteAttendance = (record: AdminReportRecord) => {
        setConfirmingDestructiveAction({
            action: 'delete-attendance',
            data: { userId: record.employeeId, date: record.date, entityId: record.entityId },
            title: `Hapus Presensi`,
            message: <p>Anda akan menghapus data presensi untuk <strong>{record.employeeName}</strong> pada kegiatan <strong>{record.prayerName}</strong> tanggal {record.date}.</p>
        });
    };

    const handleInitiateDeleteSunnahIbadah = (ibadahId: string) => {
        const ibadah = sunnahIbadahList.find(i => i.id === ibadahId);
        if (!ibadah) return;
        setConfirmingDestructiveAction({
            action: 'delete-sunnah-ibadah',
            data: ibadah.id,
            title: `Hapus Ibadah Sunnah "${ibadah.name}"`,
            message: <p>Apakah Anda yakin? Ini akan menghapus ibadah dari daftar dan semua data presensi terkait.</p>
        });
    };

    const handleInitiateDeleteHospital = (hospital: Hospital) => {
        setConfirmingDestructiveAction({
            action: 'delete-hospital',
            data: hospital.id,
            title: `Hapus Rumah Sakit "${hospital.brand}"`,
            message: <p>Apakah Anda yakin? Ini akan menghapus data rumah sakit. Pastikan tidak ada karyawan yang terhubung dengan RS ini.</p>
        });
    };

    const handleInitiateToggleHospitalStatus = (hospital: Hospital) => {
        setConfirmingDestructiveAction({
            action: 'toggle-hospital-status',
            data: hospital.id,
            title: `${hospital.isActive ? 'Nonaktifkan' : 'Aktifkan'} Rumah Sakit`,
            message: <p>Apakah Anda yakin ingin {hospital.isActive ? 'menonaktifkan' : 'mengaktifkan'} rumah sakit <strong>{hospital.brand}</strong>?</p>,
            confirmButtonText: hospital.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan',
            isDestructive: hospital.isActive,
        });
    };

    const handleConfirmDestructiveAction = (reason: string) => {
        if (!confirmingDestructiveAction) return;
        const { action, data } = confirmingDestructiveAction;
        switch (action) {
            case 'toggle-status': {
                const userId = data as string;
                const user = allUsersData[userId].employee;
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: user.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun', target: `User: ${user.name} (${user.id})`, reason });
                onToggleStatus(userId);
                break;
            }
            case 'set-role': {
                const roleData = data as { userId: string; newRole: string };
                const user = allUsersData[roleData.userId].employee;
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Ubah Peran', target: `User: ${user.name} (${user.id}) to ${roleData.newRole}`, reason });
                onSetRole(roleData.userId, roleData.newRole as Role);
                break;
            }
            case 'delete-user': {
                const user = allUsersData[data as string].employee;
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Pengguna', target: `User: ${user.name} (${user.id})`, reason });
                onDeleteUser(data as string);
                break;
            }
            case 'delete-activity': {
                const activity = activities.find(a => a.id === data);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Kegiatan', target: `Activity: ${activity?.name || 'N/A'} (${data})`, reason });
                onDeleteActivity(data as string);
                break;
            }
            case 'delete-attendance': {
                const activityName = activities.find(a => a.id === (data as AdminReportRecord).entityId)?.name || PRAYERS.find(p => p.id === (data as AdminReportRecord).entityId)?.name || 'N/A';
                const userName = allUsersData[(data as AdminReportRecord).employeeId]?.employee.name || 'N/A';
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Presensi', target: `User: ${userName}, Entity: ${activityName}, Date: ${(data as AdminReportRecord).date}`, reason });
                onAdminUpdateAttendance({ userId: (data as AdminReportRecord).employeeId, date: (data as AdminReportRecord).date, entityId: (data as AdminReportRecord).entityId, status: null, reason: null });
                break;
            }
            case 'delete-sunnah-ibadah': {
                const ibadah = sunnahIbadahList.find(i => i.id === data);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Ibadah Sunnah', target: `Ibadah: ${ibadah?.name || 'N/A'} (${data})`, reason });
                onDeleteSunnahIbadah(data as string);
                break;
            }
            case 'delete-hospital': {
                const hospital = hospitals.find(h => h.id === data);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: 'Hapus Rumah Sakit', target: `RS: ${hospital?.brand || 'N/A'} (${data})`, reason });
                onDeleteHospital(data as string);
                break;
            }
            case 'toggle-hospital-status': {
                const hospital = hospitals.find(h => h.id === data);
                onLogAudit({ adminId: loggedInEmployee.id, adminName: loggedInEmployee.name, action: `Ubah Status RS: ${hospital?.isActive ? 'Nonaktif' : 'Aktif'}`, target: `RS: ${hospital?.brand || 'N/A'} (${data})`, reason });
                onToggleHospitalStatus(data as string);
                break;
            }
        }
        setConfirmingDestructiveAction(null);
    };

    const handleSaveUser = (id: string, data: RawEmployee) => {
        if (editingUser) {
            return onUpdateUser(id, data);
        } else {
            return onAddUser(id, data);
        }
    };

    const handleUpdateAdminAccess = (hospitalIds: string[]) => {
        if (!managingAccessFor) return;
        onUpdateProfile(managingAccessFor.id, { managedHospitalIds: hospitalIds });
        onLogAudit({
            adminId: loggedInEmployee.id,
            adminName: loggedInEmployee.name,
            action: 'Perbarui Akses Admin',
            target: `User: ${managingAccessFor.name} (${managingAccessFor.id})`,
            reason: `Mengatur akses ke RS: ${hospitalIds.join(', ') || 'Tidak ada'}`,
        });
        setManagingAccessFor(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleSaveManagerScope = (userId: string, newScope: ManagerScope) => {
        onUpdateProfile(userId, { managerScope: newScope });
        onLogAudit({
            adminId: loggedInEmployee.id,
            adminName: loggedInEmployee.name,
            action: 'Perbarui Lingkup Manajer',
            target: `User: ${allUsersData[userId]?.employee.name} (${userId})`,
            reason: `Mengatur lingkup ke: ${JSON.stringify(newScope)}`,
        });
        setManagingScopeForUser(null);
    };

    return (
        <div>
            <div className="mb-6">
                <nav className="flex items-center gap-2 -mb-px flex-wrap border-b border-white/20">
                    {loggedInEmployee.role === 'super-admin' && (
                        <TabButton active={activeView === 'manajemen-pengguna'} onClick={() => setActiveView('manajemen-pengguna')} label="Manajemen Pengguna" icon={UserGroupIcon} />
                    )}
                    <TabButton active={activeView === 'manajemen-konten'} onClick={() => setActiveView('manajemen-konten')} label="Konten & Aktivitas" icon={DocumentTextIcon} />
                    <TabButton active={activeView === 'reports'} onClick={() => setActiveView('reports')} label="Laporan" icon={ChartBarIcon} />
                    <TabButton active={activeView === 'pengumuman'} onClick={() => setActiveView('pengumuman')} label="Pengumuman" icon={MegaphoneIcon} />
                    {loggedInEmployee.role === 'super-admin' && <TabButton active={activeView === 'manajemen-rs'} onClick={() => setActiveView('manajemen-rs')} label="Manajemen RS" icon={MosqueIcon} />}
                    {loggedInEmployee.role === 'super-admin' && <TabButton active={activeView === 'audit-log'} onClick={() => setActiveView('audit-log')} label="Log Audit" icon={ShieldCheckIcon} />}
                    {loggedInEmployee.role === 'super-admin' && <TabButton active={activeView === 'manajemen-admin'} onClick={() => setActiveView('manajemen-admin')} label="Manajemen Admin" icon={ShieldCheckIcon} />}
                </nav>
            </div>

            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                {activeView === 'manajemen-pengguna' && loggedInEmployee.role === 'super-admin' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-lg self-start flex-wrap">
                            <SubTabButton active={userManagementSubView === 'database'} onClick={() => setUserManagementSubView('database')}>Database</SubTabButton>
                            <SubTabButton active={userManagementSubView === 'akun'} onClick={() => setUserManagementSubView('akun')}>Akun</SubTabButton>
                            <SubTabButton active={userManagementSubView === 'relasi'} onClick={() => setUserManagementSubView('relasi')}>Relasi</SubTabButton>
                            <SubTabButton active={userManagementSubView === 'jabatan'} onClick={() => setUserManagementSubView('jabatan')}>Jabatan</SubTabButton>
                        </div>
                        {userManagementSubView === 'database' && (
                            <DatabaseKaryawan allUsers={allUsers} onInitiateDeleteUser={handleInitiateDeleteUser} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onBulkUpdateUsers={onBulkUpdateUsers} onOpenUserModal={handleOpenUserModal} hospitals={hospitals} />
                        )}
                        {userManagementSubView === 'akun' && (
                            <AkunManagement allUsers={allUsers} onInitiateToggleStatus={handleInitiateToggleStatus} />
                        )}
                        {userManagementSubView === 'relasi' && (
                            <Suspense fallback={<div className="text-center py-10 text-blue-200">Memuat Relasi Management...</div>}>
                                <RelationManagement allUsers={allUsers} onUpdateProfile={onUpdateProfile} />
                            </Suspense>
                        )}
                        {userManagementSubView === 'jabatan' && (
                            <JabatanManagement allUsers={allUsers} onUpdateProfile={onUpdateProfile} onOpenScopeModal={setManagingScopeForUser} />
                        )}
                    </div>
                )}

                {activeView === 'manajemen-konten' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-lg self-start">
                            <SubTabButton active={contentManagementSubView === 'kegiatan'} onClick={() => setContentManagementSubView('kegiatan')}>Manajemen Kegiatan</SubTabButton>
                            <SubTabButton active={contentManagementSubView === 'ibadah-sunnah'} onClick={() => setContentManagementSubView('ibadah-sunnah')}>Ibadah Sunnah</SubTabButton>
                            <SubTabButton active={contentManagementSubView === 'mutabaah-automation'} onClick={() => setContentManagementSubView('mutabaah-automation')}>Otomatisasi Mutaba&apos;ah</SubTabButton>
                        </div>
                        {contentManagementSubView === 'kegiatan' && (
                            <ActivityManagement activities={activities} allEmployees={allUsers} onOpenModal={handleOpenActivityModal} onInitiateDelete={handleInitiateDeleteActivity} />
                        )}
                        {contentManagementSubView === 'ibadah-sunnah' && (
                            <SunnahIbadahManagement sunnahIbadahList={sunnahIbadahList} onAdd={onAddSunnahIbadah} onUpdate={onUpdateSunnahIbadah} onDelete={handleInitiateDeleteSunnahIbadah} />
                        )}
                        {contentManagementSubView === 'mutabaah-automation' && (
                            <MutabaahAutomation
                                dailyActivitiesConfig={dailyActivitiesConfig}
                                onUpdate={onUpdateDailyActivitiesConfig}
                                mutabaahLockingMode={mutabaahLockingMode}
                                onUpdateMutabaahLockingMode={onUpdateMutabaahLockingMode}
                            />
                        )}
                    </div>
                )}

                {activeView === 'reports' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-lg self-start">
                            <SubTabButton active={reportSubView === 'sholat'} onClick={() => setReportSubView('sholat')}>Laporan Sholat</SubTabButton>
                            <SubTabButton active={reportSubView === 'kegiatan'} onClick={() => setReportSubView('kegiatan')}>Laporan Kegiatan</SubTabButton>
                        </div>
                        {reportSubView === 'sholat' && (
                            <AttendanceReport allUsersData={allUsersData} activities={activities} reportType="prayer" onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }} loggedInEmployee={loggedInEmployee} onEditAttendance={setEditingAttendanceRecord} onDeleteAttendance={handleInitiateDeleteAttendance} />
                        )}
                        {reportSubView === 'kegiatan' && (
                            <AttendanceReport allUsersData={allUsersData} activities={activities} reportType="activity" onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }} loggedInEmployee={loggedInEmployee} onEditAttendance={setEditingAttendanceRecord} onDeleteAttendance={handleInitiateDeleteAttendance} />
                        )}
                    </div>
                )}

                {activeView === 'pengumuman' && (
                    <Announcements
                        announcements={announcements}
                        loggedInEmployee={loggedInEmployee}
                        allUsers={allUsers}
                        onCreate={onCreateAnnouncement}
                        onDelete={onDeleteAnnouncement}
                        onMarkAsRead={onMarkAsRead}
                    />
                )}
                {activeView === 'audit-log' && loggedInEmployee.role === 'super-admin' && <AuditLogView log={auditLog} />}
                {activeView === 'manajemen-admin' && loggedInEmployee.role === 'super-admin' && <AdminManagement allUsers={allUsers} loggedInEmployee={loggedInEmployee} onInitiateSetRole={handleInitiateSetRole} onManageAccess={setManagingAccessFor} hospitals={hospitals} />}
                {activeView === 'manajemen-rs' && loggedInEmployee.role === 'super-admin' && <HospitalManagement hospitals={hospitals} onAdd={onAddHospital} onUpdate={onUpdateHospital} onDelete={handleInitiateDeleteHospital} onToggleStatus={handleInitiateToggleHospitalStatus} />}
            </div>

            <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} existingUser={editingUser} hospitals={hospitals} />
            <ActivityModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} onSave={onAddActivity} onUpdate={onUpdateActivity} existingActivity={editingActivity} allEmployees={allUsers} hospitals={hospitals} />
            <DestructiveConfirmationModal
                isOpen={!!confirmingDestructiveAction}
                onClose={() => setConfirmingDestructiveAction(null)}
                onConfirm={handleConfirmDestructiveAction}
                title={confirmingDestructiveAction?.title || ''}
                message={confirmingDestructiveAction?.message}
                reasonLabel={confirmingDestructiveAction?.reasonLabel}
                confirmButtonText={confirmingDestructiveAction?.confirmButtonText}
                isDestructive={confirmingDestructiveAction?.isDestructive}
            />
            <PdfPreviewModal isOpen={isPdfPreviewOpen} onClose={() => setIsPdfPreviewOpen(false)} pdfDataUri={pdfDataUri} fileName={pdfFileName} />
            <EditAttendanceModal isOpen={!!editingAttendanceRecord} onClose={() => setEditingAttendanceRecord(null)} onSave={onAdminUpdateAttendance} record={editingAttendanceRecord} />
            <ManageAdminAccessModal
                isOpen={!!managingAccessFor}
                onClose={() => setManagingAccessFor(null)}
                onSave={handleUpdateAdminAccess}
                user={managingAccessFor}
                availableHospitals={hospitals}
            />
        </div>
    );
};