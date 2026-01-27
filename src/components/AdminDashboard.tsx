'use client';
// @ts-nocheck
/* eslint-disable react-hooks/set-state-in-effect -- Form state resets in modals are intentional */
import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { type Employee, type Role, type Attendance, type AdminReportRecord, type Activity, type RawEmployee, type AdminView, type SunnahIbadah, type DailyActivity, type JobStructure, type AuditLogEntry, Announcement, FunctionalRole, Hospital, AudienceType, AudienceRules, ManagerScope, FailedOperationRecord, type MutabaahLockingMode } from "../types";
import { PRAYERS } from '../data/prayers';
import * as XLSX from 'xlsx';
import {
    Search,
    FileDown,
    FileSpreadsheet,
    CalendarDays,
    User,
    Upload,
    Pencil,
    X,
    Users,
    BarChart3,
    FileText,
    Sparkles,
    ChevronDown,
    ShieldCheck,
    Megaphone,
    Building2,
    PlusCircle,
    Trash2,
    RefreshCw,
    Check
} from 'lucide-react';
import { availableIconsForSunnah } from './Icons';
import { generateOfficialPdf, type TableConfig, type ReportSection } from './ReportGenerator';
import PdfPreviewModal from './PdfPreviewModal';
import ConfirmationModal from './ConfirmationModal';
import MutabaahReport from './MutabaahReport';
import { getAssignableRoles, getRoleDisplay, validateRoleChange, isSuperAdmin, isAnyAdmin } from '@/lib/rolePermissions';
import { useUIStore } from '@/store/store';

// Lazy load heavy components that are only rendered conditionally
const RelationManagement = lazy(() => import('./RelationManagement'));

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
    hospitals: Hospital[];
    onAddHospital: (data: Omit<Hospital, 'id' | 'isActive'>) => Promise<{ success: boolean, error?: string }>;
    onUpdateHospital: (id: string, data: Partial<Omit<Hospital, 'id'>>) => Promise<{ success: boolean, error?: string }>;
    onDeleteHospital: (id: string) => Promise<{ success: boolean, error?: string }>;
    onToggleHospitalStatus: (id: string) => void;
    mutabaahLockingMode: MutabaahLockingMode;
    onUpdateMutabaahLockingMode: (mode: MutabaahLockingMode) => void;
    onLoadEmployees?: () => Promise<void>;
    onLoadHeavyData?: () => Promise<void>; // 🔥 NEW: On-demand heavy data loading
    isLoadingEmployees?: boolean;
    paginatedEmployees?: Employee[];
    paginationInfo?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } | null;
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        hasNext: boolean;
        hasPrev: boolean;
        onNext: () => void;
        onPrev: () => void;
        onSearch: (term: string) => void;
        onRoleFilter: (role: string) => void;
        onIsActiveFilter: (isActive: boolean | undefined) => void;
        onRefresh: () => void;
        searchTerm: string;
        roleFilter: string;
        isActiveFilter: boolean | undefined;
    };
}

type DestructiveAction = 'delete-user' | 'delete-activity' | 'delete-attendance' | 'delete-sunnah-ibadah' | 'toggle-status' | 'set-role' | 'delete-hospital' | 'toggle-hospital-status';
type DateFilterType = 'range' | 'monthly' | 'yearly' | 'all';

type UserManagementSubView = 'database' | 'relasi' | 'jabatan';
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
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60">
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
                <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                <h3 className="text-xl font-bold mb-4 text-white shrink-0">{existingActivity ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>

                <div className="grow overflow-y-auto pr-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                        <div className="grow overflow-hidden flex flex-col">
                            {audienceType === 'public' && (
                                <div className="grow flex items-center justify-center p-4 bg-black/20 rounded-lg text-center">
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
                                <div className="space-y-2 grow flex flex-col">
                                    <div className="relative shrink-0">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="text" placeholder="Cari nama atau NIP..." value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} className="w-full bg-white/15 border border-white/30 rounded-lg p-2.5 pl-9 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                                    </div>
                                    <div className="grow overflow-y-auto border border-white/20 rounded-lg p-2 space-y-1 bg-black/20">
                                        {filteredEmployees.map(emp => (
                                            <label key={emp.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                                <input type="checkbox" checked={selectedParticipants.has(emp.id)} onChange={() => handleParticipantToggle(emp.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                                <span className="text-white font-medium">{emp.name} <span className="text-xs text-gray-400">({emp.id})</span></span>
                                            </label>
                                        ))}
                                        {filteredEmployees.length === 0 && <p className="text-center text-sm text-gray-400 p-4">Karyawan tidak ditemukan.</p>}
                                    </div>
                                    <p className="text-xs text-blue-200 text-right shrink-0 pt-1">Terpilih: {selectedParticipants.size} orang</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 shrink-0">
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
                    <CalendarDays className="w-5 h-5" />
                    Tambah Kegiatan Baru
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Nama Kegiatan</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Peserta</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Dibuat Oleh</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedActivities.map(activity => (
                            <tr key={activity.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{activity.name}</td>
                                <td className="px-4 py-3">{new Date(activity.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}<br /><span className="text-xs text-gray-400">{activity.startTime} - {activity.endTime}</span></td>
                                <td className="px-4 py-3">
                                    {getAudienceSummary(activity)}
                                </td>
                                <td className="px-4 py-3 text-blue-200 whitespace-nowrap">{activity.createdByName}</td>
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
    loggedInEmployee: Employee | null;
}> = ({ isOpen, onClose, onSave, existingUser, hospitals, loggedInEmployee }) => {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('user');
    const [unit, setUnit] = useState('');
    const [bagian, setBagian] = useState('');
    const [professionCategory, setProfessionCategory] = useState<'MEDIS' | 'NON MEDIS'>('NON MEDIS');
    const [profession, setProfession] = useState('');
    const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
    const [hospitalId, setHospitalId] = useState<string | undefined>('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setError('');
            setLoading(false);
            setShowSuccessModal(false);
            setGeneratedPassword('');
            if (existingUser) {
                setId(existingUser.id);
                setName(existingUser.name);
                setEmail(existingUser.email);
                setRole(existingUser.role);
                setUnit(existingUser.unit);
                setBagian(existingUser.bagian);
                setProfessionCategory(existingUser.professionCategory);
                setProfession(existingUser.profession);
                setGender(existingUser.gender);
                setHospitalId(existingUser.hospitalId);
            } else {
                setId('');
                setName('');
                setEmail('');
                setRole('user');
                setUnit('');
                setBagian('');
                setProfessionCategory('NON MEDIS');
                setProfession('');
                setGender('Laki-laki');
                setHospitalId('');
            }
        }
    }, [isOpen, existingUser]);

    // Function to generate secure random password
    const generateSecurePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
        let password = '';
        const array = new Uint32Array(12);
        crypto.getRandomValues(array);

        for (let i = 0; i < 12; i++) {
            password += chars[array[i] % chars.length];
        }
        return password;
    };

    const handleSubmit = async () => {
        if (!id || !name || !email || !unit || !profession || !bagian || !role) {
            setError('Semua field wajib diisi.');
            return;
        }

        // Clear previous errors
        setError('');
        setLoading(true);

        try {
            // Generate password only for new users
            const newPassword = existingUser ? undefined : generateSecurePassword();

            const result = await onSave(id, {
                name,
                email,
                unit,
                bagian,
                professionCategory,
                profession,
                gender,
                hospitalId
            });

            if (result.success) {
                if (!existingUser && newPassword) {
                    // Show success modal with generated password
                    setGeneratedPassword(newPassword);
                    setShowSuccessModal(true);
                    setLoading(false);
                } else {
                    // For editing, just close
                    setLoading(false);
                    onClose();
                }
            } else {
                setLoading(false);
                setError(result.error || 'Terjadi kesalahan.');
            }
        } catch (err) {
            setLoading(false);
            setError('Terjadi kesalahan tak terduga. Silakan coba lagi.');
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-4xl border border-white/20 max-h-[90vh] flex flex-col">
                <h3 className="text-lg font-bold mb-4 text-white">{existingUser ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h3>

                {/* Two-column layout for desktop */}
                <div className="grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left column - 5 fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">NIP / NOPEG</label>
                                <input
                                    type="text"
                                    value={id}
                                    onChange={e => setId(e.target.value)}
                                    disabled={!!existingUser || loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                />
                                {existingUser && <p className="text-xs text-yellow-400 mt-1">NIP tidak dapat diubah.</p>}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Jenis Kelamin</label>
                                <select
                                    value={gender}
                                    onChange={e => setGender(e.target.value as 'Laki-laki' | 'Perempuan')}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                >
                                    <option value="Laki-laki" className="text-black bg-white">Laki-laki</option>
                                    <option value="Perempuan" className="text-black bg-white">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Kategori Profesi</label>
                                <select
                                    value={professionCategory}
                                    onChange={e => setProfessionCategory(e.target.value as 'MEDIS' | 'NON MEDIS')}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                >
                                    <option value="NON MEDIS" className="text-black bg-white">NON MEDIS</option>
                                    <option value="MEDIS" className="text-black bg-white">MEDIS</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Profesi</label>
                                <input
                                    type="text"
                                    value={profession}
                                    onChange={e => setProfession(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                />
                            </div>
                        </div>

                        {/* Right column - 5 fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Role</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value as Role)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                >
                                    <option value="user" className="text-black bg-white">User</option>
                                    <option value="admin" className="text-black bg-white">Admin</option>
                                    <option value="super-admin" className="text-black bg-white">Super Admin</option>
                                    {/* 🔥 NEW: Only show Owner option if current user is owner */}
                                    {loggedInEmployee?.role === 'owner' && (
                                        <option value="owner" className="text-black bg-white">Owner</option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Rumah Sakit</label>
                                <select
                                    value={hospitalId || ''}
                                    onChange={e => setHospitalId(e.target.value || undefined)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                >
                                    <option value="" className="text-black bg-white">-- Tidak Ada --</option>
                                    {hospitals.map(h => (
                                        <option key={h.id} value={h.id} className="text-black bg-white">{h.brand} - {h.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Unit Kerja</label>
                                <input
                                    type="text"
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Bagian</label>
                                <input
                                    type="text"
                                    value={bagian}
                                    onChange={e => setBagian(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-blue-200 block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white"
                                    placeholder="contoh@rsi.co.id"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Alert - Enterprise Standard */}
                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border-l-4 border-red-500 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-red-400">Terjadi Kesalahan</h4>
                                <p className="mt-1 text-sm text-red-300">{error}</p>
                            </div>
                            <button
                                onClick={() => setError('')}
                                className="shrink-0 text-red-400 hover:text-red-300 transition-colors"
                                title="Tutup pesan error"
                            >
                                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Indicator - Silent */}
                {loading && !error && (
                    <div className="mt-4 p-4 bg-teal-500/10 border-l-4 border-teal-500 rounded-r-lg">
                        <div className="flex items-center justify-center">
                            <svg className="animate-spin h-5 w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end space-x-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                            </>
                        ) : (
                            'Simpan'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );

    // Success Modal with Password Info
    if (showSuccessModal) {
        return createPortal(
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-4">Karyawan Berhasil Ditambahkan!</h3>

                        <div className="bg-black/30 rounded-lg p-4 mb-6 text-left space-y-3">
                            <div>
                                <p className="text-xs text-blue-300 uppercase tracking-wide">Nama Lengkap</p>
                                <p className="text-white font-semibold">{name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-300 uppercase tracking-wide">NIP / NOPEG</p>
                                <p className="text-white font-semibold">{id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-300 uppercase tracking-wide">Email</p>
                                <p className="text-white font-semibold">{email}</p>
                            </div>
                            <div className="bg-teal-500/20 border border-teal-500/50 rounded-lg p-3">
                                <p className="text-xs text-teal-300 uppercase tracking-wide mb-1">Password untuk Login</p>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-teal-100 font-mono font-bold text-lg tracking-wider">{generatedPassword}</p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedPassword);
                                        }}
                                        className="px-3 py-1 bg-teal-500 hover:bg-teal-400 text-white text-sm rounded-lg font-semibold transition-colors"
                                        title="Copy Password"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6">
                            <p className="text-yellow-200 text-sm">
                                ⚠️ <strong>Penting:</strong> User akan diminta mengubah password saat login pertama untuk keamanan.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowSuccessModal(false);
                                onClose();
                            }}
                            className="w-full px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-bold text-lg transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }
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
                    setError(`Header file tidak sesuai. Kolom yang wajib ada: ${missingHeaders.join(', ')}.`);
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
                const getSanitizedRole = (rawRole: unknown): Role => {
                    const roleStr = String(rawRole || '').trim().toLowerCase();
                    if (['owner', 'super-admin', 'admin', 'user'].includes(roleStr)) return roleStr as Role;
                    return 'user';
                };

                const usersToProcess: (RawEmployee & { id: string, role?: Role })[] = json.map(row => ({
                    id: String(row.NIP).trim(),
                    name: String(row.Nama || '').trim(),
                    email: row.Email ? String(row.Email).trim().toLowerCase() : undefined,
                    unit: String(row.Unit || '').trim(),
                    bagian: String(row.Bagian || '').trim(),
                    professionCategory: getSanitizedCategory(row['Kategori Profesi']),
                    profession: String(row.Profesi || '').trim(),
                    gender: getSanitizedGender(row['Jenis Kelamin']),
                    hospitalId: row['RS ID'] ? String(row['RS ID']).trim().toUpperCase() : undefined,
                    role: row.Role ? getSanitizedRole(row.Role) : 'user'
                }));

                const result = await onImport(usersToProcess);
                setImportResult(result);
            } catch (err) {
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
            {
                'RS ID': 'RSIJSP',
                NIP: '12345',
                Nama: 'Contoh Pegawai',
                Email: 'pegawai@rsi.co.id',
                Unit: 'IT',
                Bagian: 'Perkantoran & Umum',
                'Kategori Profesi': 'NON MEDIS',
                Profesi: 'Staff IT',
                'Jenis Kelamin': 'Laki-laki',
                Role: 'user'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData, { header: ['RS ID', 'NIP', 'Nama', 'Email', 'Unit', 'Bagian', 'Kategori Profesi', 'Profesi', 'Jenis Kelamin', 'Role'] });
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
                            <Upload className="w-5 h-5" />
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
    onInitiateToggleStatus: (user: Employee) => void; // 🔥 NEW: Toggle account status
    onInitiateSetRole: (user: Employee, newRole: Role) => void; // 🔥 NEW: Change user role
    onManageAccess: (user: Employee) => void; // 🔥 NEW: Manage hospital access
    onAddUser: AdminDashboardProps['onAddUser'];
    onUpdateUser: AdminDashboardProps['onUpdateUser'];
    onBulkUpdateUsers: AdminDashboardProps['onBulkUpdateUsers'];
    onOpenUserModal: (user?: Employee) => void;
    hospitals: Hospital[];
    pagination?: AdminDashboardProps['pagination'];
    paginatedEmployees?: Employee[];
    isLoading?: boolean;
    loggedInEmployee: Employee; // 🔥 NEW: For role permission checks
}

const DatabaseKaryawan: React.FC<DatabaseKaryawanProps> = ({
    allUsers,
    onInitiateDeleteUser,
    onInitiateToggleStatus, // 🔥 NEW
    onInitiateSetRole, // 🔥 NEW
    onManageAccess, // 🔥 NEW
    onOpenUserModal,
    onBulkUpdateUsers,
    hospitals,
    pagination,
    paginatedEmployees,
    isLoading,
    loggedInEmployee // 🔥 NEW
}) => {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // 🔥 FIX: Use server-side paginated employees if available, fallback to client-side for compatibility
    const displayUsers = useMemo(() => {
        if (paginatedEmployees && paginatedEmployees.length > 0) {
            return paginatedEmployees;
        }
        return allUsers; // Fallback during transitions or if store not updated
    }, [paginatedEmployees, allUsers]);

    const totalPages = pagination?.totalPages || 0;
    const currentPage = pagination?.currentPage || 1;

    const hospitalMap = useMemo(() => new Map(hospitals.map(h => [h.id, h.brand])), [hospitals]);

    // 🔥 Helper function for role display
    const getRoleLabel = (role: Role) => {
        const roleDisplay = getRoleDisplay(role);
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleDisplay.bgColor} ${roleDisplay.color}`}>
                {roleDisplay.label}
            </span>
        );
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={pagination?.searchTerm || ''}
                        onChange={e => pagination?.onSearch(e.target.value)}
                        placeholder="Cari nama atau NIP..."
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white transition-colors"
                    />
                </div>
                <div className="flex justify-end gap-2 w-full sm:w-auto">
                    <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                        <Upload className="w-5 h-5" />
                        Impor
                    </button>
                    <button onClick={() => onOpenUserModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                        <User className="w-5 h-5" />
                        Tambah
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20 relative min-h-[400px]">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">RS ID / BRAND</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">NIP / NOPEG</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">NAMA</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Unit / Bagian</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Profesi</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Status Akun</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Peran Sistem</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Hak Akses & Otorisasi</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className={isLoading ? "opacity-40 transition-opacity duration-300" : "opacity-100 transition-opacity duration-300"}>
                        {displayUsers.map((user) => {
                            const isSelf = user.id === loggedInEmployee.id;
                            const loggedInUserIsScopedSuperAdmin = isSuperAdmin(loggedInEmployee) && Array.isArray(loggedInEmployee.managedHospitalIds) && loggedInEmployee.managedHospitalIds.length > 0;
                            const hideManageButtonForSelf = isSelf && loggedInUserIsScopedSuperAdmin;

                            return (
                                <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {/* 🔥 hospital_id langsung berisi RS ID/BRAND (misal: "RSIJSP", "RSAB") */}
                                        {user.hospitalId || '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono whitespace-nowrap">{user.id}</td>
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {user.name}
                                        <span className="block text-[10px] text-gray-400 font-normal uppercase">{user.gender}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">{user.unit}</div>
                                        <div className="text-[10px] text-blue-300/70">{user.bagian}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-medium">{user.profession}</div>
                                        <div className="text-[10px] text-gray-400">{user.professionCategory}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => onInitiateToggleStatus(user)}
                                                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all ${user.isActive
                                                    ? 'bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30'
                                                    : 'bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30'
                                                    }`}
                                                title={user.isActive ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                                            >
                                                {user.isActive ? '✓ Aktif' : '✗ Nonaktif'}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {getRoleLabel(user.role)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            {/* Hospital Access Section */}
                                            {isAnyAdmin({ ...user, role: user.role } as any) && (
                                                <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded border border-white/5">
                                                    <div className="grow overflow-hidden text-center sm:text-left">
                                                        {(user.role === 'super-admin') && (!user.managedHospitalIds || user.managedHospitalIds.length === 0) ? (
                                                            <span className="text-[10px] font-bold text-purple-300">Global (Semua RS)</span>
                                                        ) : user.managedHospitalIds && user.managedHospitalIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {user.managedHospitalIds.map(id => (
                                                                    <span key={id} className="px-1.5 py-0.5 bg-gray-700 text-gray-200 rounded text-[9px] border border-white/10">{hospitalMap.get(id) || id}</span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-yellow-500 italic">Belum ada akses</span>
                                                        )}
                                                    </div>
                                                    {!hideManageButtonForSelf && (
                                                        <button onClick={() => onManageAccess(user)} className="p-1 rounded bg-gray-600 hover:bg-teal-600 text-white transition-colors" title="Kelola Akses Rumah Sakit">
                                                            <Building2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Role Change Buttons */}
                                            {!isSelf && (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {getAssignableRoles(loggedInEmployee).map((role) => {
                                                        if (user.role === role) return null;
                                                        const validationError = validateRoleChange(loggedInEmployee, user, role);
                                                        if (validationError) return null;

                                                        const buttonStyles = {
                                                            'owner': 'bg-yellow-600/80 hover:bg-yellow-500',
                                                            'super-admin': 'bg-purple-600/80 hover:bg-purple-500',
                                                            'admin': 'bg-blue-600/80 hover:bg-blue-500',
                                                            'user': 'bg-gray-600/80 hover:bg-gray-500'
                                                        };

                                                        return (
                                                            <button
                                                                key={role}
                                                                onClick={() => onInitiateSetRole(user, role)}
                                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-all shadow-sm hover:scale-105 active:scale-95 ${buttonStyles[role]}`}
                                                                title={`Jadikan ${role}`}
                                                            >
                                                                {role === 'user' ? 'Reset User' : `Set ${role.replace('-', ' ')}`}
                                                            </button>
                                                        );

                                                    })}
                                                </div>
                                            )}
                                            {isSelf && <div className="text-[10px] text-gray-500 italic text-center">Akun Anda Sendiri</div>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                            <button onClick={() => onOpenUserModal(user)} className="p-2 rounded-md bg-blue-600/80 hover:bg-blue-500 text-white transition-colors" title="Edit Data Karyawan">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => onInitiateDeleteUser(user)} className="p-2 rounded-md bg-red-600/80 hover:bg-red-500 text-white transition-colors" title="Hapus Karyawan">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => pagination?.onPrev()}
                        disabled={currentPage === 1 || isLoading}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-1">
                        <span className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-white border border-gray-700">
                            Hal {currentPage} dari {totalPages}
                        </span>
                    </div>

                    <button
                        onClick={() => pagination?.onNext()}
                        disabled={currentPage === totalPages || isLoading}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}

            <div className="mt-2 text-center">
                <p className="text-xs text-gray-500">
                    Total {pagination?.totalCount || 0} karyawan
                </p>
            </div>

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
    const ITEMS_PER_BATCH = 15;
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);
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

    const displayUsers = filteredUsers.slice(0, visibleCount);

    const filterButtonClass = (filterType: 'all' | 'active' | 'inactive') =>
        `px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${activationFilter === filterType ? 'bg-teal-500 text-white' : 'bg-white/10 hover:bg-white/20 text-blue-200'
        }`;

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(ITEMS_PER_BATCH);
    }, [activationFilter, searchTerm]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Cari nama atau NIP..."
                        className="w-full bg-white/5 border border-white/20 rounded-lg p-2.5 pl-10 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white transition-colors"
                    />
                </div>
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 min-w-max p-1.5 bg-black/20 rounded-full">
                        <button onClick={() => setActivationFilter('all')} className={filterButtonClass('all')}>
                            Semua Akun
                        </button>
                        <button onClick={() => setActivationFilter('active')} className={filterButtonClass('active')}>
                            Sudah Aktivasi
                        </button>
                        <button onClick={() => setActivationFilter('inactive')} className={filterButtonClass('inactive')}>
                            Belum Aktivasi
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">NIP / NOPEG</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Nama</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Status Akun</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayUsers.map((user) => (
                            <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-mono whitespace-nowrap">{user.id}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{user.name}</td>
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

            {/* Load More Pattern */}
            <div className="mt-8 flex flex-col items-center gap-4">
                {visibleCount < filteredUsers.length ? (
                    <button
                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_BATCH)}
                        className="px-10 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                        <Users className="w-5 h-5 text-teal-400" />
                        Tampilkan Akun Selanjutnya
                    </button>
                ) : filteredUsers.length > 0 && (
                    <p className="text-gray-500 text-sm italic">Semua akun telah ditampilkan</p>
                )}

                <p className="text-xs text-gray-500">
                    Menampilkan {displayUsers.length} dari {filteredUsers.length} akun
                </p>
            </div>
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
    pagination?: AdminDashboardProps['pagination'];
    onRefresh?: () => void;
    isLoading?: boolean;
}

const SelectFilter: React.FC<{ value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: (string | number)[], defaultLabel: string }> = ({ value, onChange, options, defaultLabel }) => (
    <select value={value} onChange={onChange} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none relative z-50" style={{ zIndex: 50 }}>
        <option value="all" className="text-black bg-white">{defaultLabel}</option>
        {options.map(opt => <option key={opt} value={String(opt)} className="text-black bg-white">{opt}</option>)}
    </select>
);

const AttendanceReport: React.FC<AttendanceReportProps> = ({ allUsersData, activities, reportType, onShowPreview, loggedInEmployee, onEditAttendance, onDeleteAttendance, pagination, onRefresh, isLoading }) => {
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

    // Flag to prevent unnecessary re-renders while user is interacting with date inputs
    const isInteractingWithDateInput = useRef(false);

    // 🔥 FIX: Stable activities ID tracking for proper dependency tracking
    // This ensures useMemo re-runs when activities change
    const activityIds = useMemo(() => activities.map(a => a.id).sort(), [activities]);

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

        // 🔥 FIX: Add defensive check for activities
        const reportableEntities = reportType === 'prayer'
            ? PRAYERS.map(p => p.name)
            : activities.length > 0 ? activities.map(a => a.name) : [];

        return {
            allUnits: Array.from(units).sort(),
            allProfessions: Array.from(professions).sort(),
            allYearsWithData: sortedYears,
            allReportableEntities: Array.from(new Set(reportableEntities)).sort(),
        };
    }, [allUsersData, activities, reportType, activityIds]);

    useEffect(() => {
        if (allYearsWithData.length > 0 && !yearFilter) {
            setYearFilter(String(allYearsWithData[0]));
        }
    }, [allYearsWithData, yearFilter]);

    const flattenedHistory: AdminReportRecord[] = useMemo(() => {
        const records: AdminReportRecord[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // 🔥 ORIGINAL: Gunakan allUsersData untuk prayer report atau fallback
        // 🔥 FIX: Build maps inside useMemo to ensure fresh data
        const currentPrayerMap = new Map(PRAYERS.map(p => [p.id, p.name]));
        const currentActivityMap = new Map(activities.map(a => [a.id, a.name]));

        Object.values(allUsersData).forEach(({ employee, attendance, history }) => {
            const processDailyAttendance = (date: string, dailyAttendance: Attendance) => {
                Object.entries(dailyAttendance).forEach(([entityId, att]) => {
                    const isPrayerRecord = currentPrayerMap.has(entityId);
                    const isActivityRecord = currentActivityMap.has(entityId);

                    if (reportType === 'prayer' && !isPrayerRecord) return;
                    if (reportType === 'activity' && isPrayerRecord) return; // Only exclude prayers in activity report

                    // 🔥 FIX: Use entityId as fallback name for dynamic types (KIE, BBQ, etc)
                    const entityName = currentPrayerMap.get(entityId) || currentActivityMap.get(entityId) || entityId;

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
    }, [allUsersData, activities, reportType, activityIds]);

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
                        isMonthActivated,
                    });
                }

                const entry = aggregatedData.get(key)!;
                const prayerKey = prayerNameToKeyMap[record.prayerName as keyof typeof prayerNameToKeyMap];

                if (prayerKey) {
                    entry.prayers[prayerKey] = record.status;
                }
            });

            const tableColumn = ["No", "Tanggal", "NIP", "Nama Karyawan", "Aktivasi", "Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];
            const tableRows = Array.from(aggregatedData.values())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName))
                .map((row, index) => [
                    index + 1,
                    new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                    row.employeeId,
                    row.employeeName,
                    row.isMonthActivated ? 'Sudah' : 'Belum',
                    row.prayers.subuh, row.prayers.dzuhur, row.prayers.ashar, row.prayers.maghrib, row.prayers.isya
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
            const tableColumn = ["Tanggal", "Nama", "Unit", "Kategori Profesi", "Profesi", 'Kegiatan', "Status", "Waktu"];
            const tableRows = filteredData.map(d => [
                new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
                d.employeeName, d.unit, d.professionCategory, d.profession, d.prayerName, d.status, d.timestamp
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
            header = ["No", "Tanggal", "NIP", "Nama Karyawan", "Unit", "Kategori Profesi", "Profesi", "Aktivasi Bulan Ini", "Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];
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
                        prayers: { subuh: '-', dzuhur: '-', ashar: '-', maghrib: '-', isya: '-' }
                    });
                }
                const entry = aggregatedData.get(key)!;
                const prayerKeyName = record.prayerName as PrayerNameKey;
                const prayerKey = prayerNameToKeyMap[prayerKeyName];
                if (prayerKey) {
                    entry.prayers[prayerKey] = record.status;
                }
            });
            data = Array.from(aggregatedData.values())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.employeeName.localeCompare(b.employeeName))
                .map((row, index) => [
                    index + 1, new Date(row.date).toLocaleDateString('id-ID'), row.employeeId, row.employeeName, row.unit, row.professionCategory, row.profession,
                    row.isMonthActivated ? 'Sudah' : 'Belum',
                    row.prayers.subuh, row.prayers.dzuhur, row.prayers.ashar, row.prayers.maghrib, row.prayers.isya
                ]);

        } else {
            header = ["Tanggal", "NIP", "Nama", "Unit", "Kategori Profesi", "Profesi", 'Nama Kegiatan', "Status", "Waktu Presensi"];
            data = filteredData.map(d => [
                new Date(d.date).toLocaleDateString('id-ID'), d.employeeId, d.employeeName, d.unit, d.professionCategory, d.profession,
                d.prayerName, d.status, d.timestamp
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
                            <input type="date" value={startDate} onFocus={() => { isInteractingWithDateInput.current = true; }} onBlur={() => { isInteractingWithDateInput.current = false; setTimeout(() => setCurrentPage(1), 0); }} onChange={e => setStartDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-blue-200 block mb-1">Sampai Tanggal</label>
                            <input type="date" value={endDate} onFocus={() => { isInteractingWithDateInput.current = true; }} onBlur={() => { isInteractingWithDateInput.current = false; setTimeout(() => setCurrentPage(1), 0); }} onChange={e => setEndDate(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                        </div>
                    </div>
                );
            case 'monthly':
                return (
                    <div>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">Pilih Bulan</label>
                        <input type="month" value={monthFilter} onFocus={() => { isInteractingWithDateInput.current = true; }} onBlur={() => { isInteractingWithDateInput.current = false; setTimeout(() => setCurrentPage(1), 0); }} onChange={e => setMonthFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
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
    const ITEMS_PER_BATCH = 15;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_BATCH);

    // Pagination logic
    const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_BATCH, currentPage * ITEMS_PER_BATCH);

    // Reset to first page when filters change
    useEffect(() => {
        if (!isInteractingWithDateInput.current) {
            setCurrentPage(1);
        }
    }, [dateFilterType, monthFilter, yearFilter, startDate, endDate, entityFilter, unitFilter, professionFilter, nameOrNipFilter, activationStatusFilter]);

    return (
        <div className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 bg-black/20 rounded-lg" style={{ position: 'relative', zIndex: 10 }}>
                {/* Row 1 */}
                <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 50 }}>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Jenis Periode</label>
                    <select value={dateFilterType} onChange={handleDateFilterTypeChange} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none relative z-50" style={{ zIndex: 50 }}>
                        <option value="range" className="text-black bg-white">Rentang Tanggal</option>
                        <option value="monthly" className="text-black bg-white">Bulanan</option>
                        <option value="yearly" className="text-black bg-white">Tahunan</option>
                        <option value="all" className="text-black bg-white">Semua</option>
                    </select>
                </div>
                <div className="lg:col-span-3" style={{ position: 'relative', zIndex: 50 }}>
                    <DateFilterInputs />
                </div>
                <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 50 }}>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">{reportType === 'prayer' ? 'Sholat' : 'Kegiatan'}</label>
                    <SelectFilter value={entityFilter} onChange={e => setEntityFilter(e.target.value)} options={allReportableEntities} defaultLabel={reportType === 'prayer' ? 'Semua Sholat' : 'Semua Kegiatan'} />
                </div>
                <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 50 }}>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Unit Kerja</label>
                    <SelectFilter value={unitFilter} onChange={e => setUnitFilter(e.target.value)} options={allUnits} defaultLabel="Semua Unit" />
                </div>
                <div className="lg:col-span-2" style={{ position: 'relative', zIndex: 50 }}>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Profesi</label>
                    <SelectFilter value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} options={allProfessions} defaultLabel="Semua Profesi" />
                </div>

                {/* Row 2 */}
                <div className="lg:col-span-2" style={{ position: 'relative', zIndex: 40 }}>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Cari Nama atau NIP</label>
                    <div className="relative">
                        <input type="text" value={nameOrNipFilter} onChange={e => setNameOrNipFilter(e.target.value)} placeholder="Ketik nama atau NIP..." className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm pl-9 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>
                {reportType === 'prayer' && dateFilterType === 'monthly' && (
                    <div className="lg:col-span-1" style={{ position: 'relative', zIndex: 40 }}>
                        <label className="text-xs font-semibold text-blue-200 block mb-1">Status Aktivasi</label>
                        <select value={activationStatusFilter} onChange={e => setActivationStatusFilter(e.target.value as 'all' | 'activated' | 'not-activated')} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none relative z-50" style={{ zIndex: 50 }}>
                            <option value="all" className="text-black bg-white">Semua Status</option>
                            <option value="activated" className="text-black bg-white">Sudah Aktivasi</option>
                            <option value="not-activated" className="text-black bg-white">Belum Aktivasi</option>
                        </select>
                    </div>
                )}
                <div className={`${reportType === 'prayer' && dateFilterType === 'monthly' ? 'lg:col-span-1' : 'lg:col-span-2'} flex items-center justify-end gap-2`} style={{ position: 'relative', zIndex: 40 }}>
                    <button onClick={handlePreviewPdf} disabled={filteredData.length === 0} className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Download PDF"><FileDown className="w-6 h-6 text-red-500 disabled:text-gray-400" /></button>
                    <button onClick={handleDownloadXlsx} disabled={filteredData.length === 0} className="flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-white transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" title="Download Excel"><FileSpreadsheet className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Nama</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Unit</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Profesi</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">{reportType === 'prayer' ? 'Sholat' : 'Kegiatan'}</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Status</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((record, index) => (
                            <tr key={`${record.employeeId}-${record.date}-${record.entityId}-${index}`} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(record.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{record.employeeName}</td>
                                <td className="px-4 py-3">{record.unit}</td>
                                <td className="px-4 py-3">{record.profession}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{record.prayerName}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === 'Hadir' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {record.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => onEditAttendance(record)} title="Edit Presensi" className="p-1.5 text-blue-300 hover:text-white rounded-md hover:bg-white/10"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteAttendance(record)} title="Hapus Presensi" className="p-1.5 text-red-400 hover:text-red-300 rounded-md hover:bg-white/10"><X className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-12">
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-blue-200 opacity-60">Tidak ada data presensi yang ditemukan untuk filter ini.</p>
                                        <button
                                            onClick={() => pagination?.onRefresh?.() || onRefresh?.()}
                                            className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 rounded-lg border border-teal-500/30 transition-all flex items-center gap-2 text-sm font-semibold"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                            Sinkronisasi Data Sekarang
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-1">
                        <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-white border border-gray-700 shadow-inner">
                            Hal {currentPage} dari {totalPages}
                        </span>
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}

            <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Total {filteredData.length} data laporan {reportType === 'prayer' ? 'sholat' : 'kegiatan'}
                </p>
            </div>
        </div>
    );
};

// --- Activation Report Component (New) ---
const ActivationReport: React.FC<{
    allUsersData: AdminDashboardProps['allUsersData'];
    onShowPreview: (dataUri: string, fileName: string) => void;
    loggedInEmployee: Employee;
}> = ({ allUsersData, onShowPreview, loggedInEmployee }) => {
    const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
    const [statusFilter, setStatusFilter] = useState<'all' | 'activated' | 'not-activated'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [unitFilter, setUnitFilter] = useState<string>('all');

    // Data Preparation
    const processedData = useMemo(() => {
        const users = Object.values(allUsersData).map(d => d.employee);

        // Filter out admin accounts (IDs containing letters, e.g., RSIJSP, RSIJPK)
        // Only include employees with numeric IDs (e.g., 6000, 6446)
        const realEmployees = users.filter(user => /^\d+$/.test(user.id));

        return realEmployees.map(user => ({
            id: user.id,
            name: user.name,
            unit: user.unit,
            profession: user.profession,
            isActivated: user.activatedMonths?.includes(monthFilter) ?? false
        }));
    }, [allUsersData, monthFilter]);

    // Derived Filters options
    const allUnits = useMemo(() => Array.from(new Set(processedData.map(u => u.unit))).sort(), [processedData]);

    // Filtering
    const filteredData = useMemo(() => {
        return processedData.filter(user => {
            // Status Filter
            if (statusFilter === 'activated' && !user.isActivated) return false;
            if (statusFilter === 'not-activated' && user.isActivated) return false;

            // Unit Filter
            if (unitFilter !== 'all' && user.unit !== unitFilter) return false;

            // Search Term
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                return user.name.toLowerCase().includes(lower) || user.id.toLowerCase().includes(lower);
            }

            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [processedData, statusFilter, unitFilter, searchTerm]);

    // Statistics
    const stats = useMemo(() => {
        const total = processedData.length;
        const activated = processedData.filter(u => u.isActivated).length;
        return {
            total,
            activated,
            notActivated: total - activated,
            percentage: total > 0 ? Math.round((activated / total) * 100) : 0
        };
    }, [processedData]);

    // Pagination State
    const ITEMS_PER_BATCH = 15;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_BATCH);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_BATCH;
        return filteredData.slice(start, start + ITEMS_PER_BATCH);
    }, [filteredData, currentPage]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [monthFilter, statusFilter, unitFilter, searchTerm]);

    // Export Handlers
    const handleDownloadXlsx = () => {
        const header = ["No", "NIP", "Nama", "Unit", "Profesi", "Status Aktivasi", "Bulan"];
        const data = filteredData.map((d, i) => [
            i + 1, d.id, d.name, d.unit, d.profession,
            d.isActivated ? "Sudah Aktivasi" : "Belum Aktivasi",
            monthFilter
        ]);

        const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Aktivasi");
        XLSX.writeFile(wb, `laporan_aktivasi_${monthFilter}.xlsx`);
    };

    const handlePreviewPdf = () => {
        const title = `LAPORAN STATUS AKTIVASI KARYAWAN`;
        const subtitle = `Periode: ${new Date(monthFilter + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;

        const tableColumn = ["No", "NIP", "Nama", "Unit", "Status Aktivasi"];
        const tableRows = filteredData.map((d, i) => [
            i + 1, d.id, d.name, d.unit, d.isActivated ? "Sudah Aktivasi" : "Belum Aktivasi"
        ]);

        const tableConfig: TableConfig = {
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const isActivated = data.cell.raw === "Sudah Aktivasi";
                    (data.cell.styles.textColor as any) = isActivated ? [0, 128, 0] : [255, 0, 0];
                }
            }
        };

        const sections: ReportSection[] = [{
            title,
            subtitle,
            tables: [tableConfig],
            orientation: 'portrait',
            pageFormat: 'a4'
        }];

        const fileName = `laporan_aktivasi_${monthFilter}.pdf`;
        const dataUri = generateOfficialPdf(sections, fileName, 'datauristring', loggedInEmployee.name) as string;
        if (dataUri) onShowPreview(dataUri, fileName);
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Total Karyawan</div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                    <div className="text-green-400 text-xs uppercase font-bold tracking-wider mb-1">Sudah Aktivasi</div>
                    <div className="text-2xl font-bold text-green-300">{stats.activated}</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                    <div className="text-red-400 text-xs uppercase font-bold tracking-wider mb-1">Belum Aktivasi</div>
                    <div className="text-2xl font-bold text-red-300">{stats.notActivated}</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                    <div className="text-blue-400 text-xs uppercase font-bold tracking-wider mb-1">Persentase</div>
                    <div className="text-2xl font-bold text-blue-300">{stats.percentage}%</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Periode Bulan</label>
                    <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Status Aktivasi</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                        <option value="all" className="text-black bg-white">Semua Status</option>
                        <option value="activated" className="text-black bg-white">Sudah Aktivasi</option>
                        <option value="not-activated" className="text-black bg-white">Belum Aktivasi</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Unit Kerja</label>
                    <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                        <option value="all" className="text-black bg-white">Semua Unit</option>
                        {allUnits.map(unit => (
                            <option key={unit} value={unit} className="text-black bg-white">{unit}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">Cari Nama/NIP</label>
                    <div className="relative">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari..." className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm pl-8 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
                <button onClick={handlePreviewPdf} disabled={filteredData.length === 0} className="p-2 hover:bg-white/10 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" title="Download PDF"><FileDown className="w-6 h-6 text-red-500 disabled:text-gray-400" /></button>
                <button onClick={handleDownloadXlsx} disabled={filteredData.length === 0} className="flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold text-white transition-all disabled:bg-gray-500 disabled:cursor-not-allowed" title="Download Excel"><FileSpreadsheet className="w-5 h-5" /></button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3 text-center w-16 whitespace-nowrap">No</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[100px]">NIP</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[180px]">Nama</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Unit</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap min-w-[160px]">Status Aktivasi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {paginatedData.map((user, idx) => (
                            <tr key={user.id} className="hover:bg-white/5">
                                <td className="px-4 py-3 text-center whitespace-nowrap">{(currentPage - 1) * ITEMS_PER_BATCH + idx + 1}</td>
                                <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">{user.id}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{user.name}</td>
                                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{user.unit}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${user.isActivated
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                        {user.isActivated ? 'Sudah Aktivasi' : 'Belum Aktivasi'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                    Tidak ada data yang ditemukan.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>

                    <span className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-white border border-gray-700">
                        Hal {currentPage} dari {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}

            <div className="text-center text-xs text-gray-500 mt-2">
                Menampilkan {paginatedData.length} dari {filteredData.length} data karyawan
            </div>
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
    const { addToast } = useUIStore();
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
            addToast('Nama dan Ikon wajib diisi.', 'error');
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
                    <Sparkles className="w-5 h-5" />
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
                        <th className="px-4 py-3 whitespace-nowrap">Waktu</th>
                        <th className="px-4 py-3 whitespace-nowrap">Admin</th>
                        <th className="px-4 py-3 whitespace-nowrap">Aksi</th>
                        <th className="px-4 py-3 whitespace-nowrap">Target</th>
                        <th className="px-4 py-3 whitespace-nowrap">Alasan</th>
                    </tr>
                </thead>
                <tbody>
                    {log.map(entry => (
                        <tr key={entry.id} className="border-b border-gray-700 hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{entry.adminName}</td>
                            <td className="px-4 py-3">{entry.action}</td>
                            <td className="px-4 py-3 text-blue-200 whitespace-nowrap">{entry.target}</td>
                            <td className="px-4 py-3 italic whitespace-nowrap">"{entry.reason}"</td>
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

const FUNCTIONAL_ROLES: FunctionalRole[] = ['BPH', 'DIREKSI', 'MANAJER', 'KEPALA URUSAN', 'KEPALA RUANGAN'];

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
    const ITEMS_PER_BATCH = 15;
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_BATCH);

    const FUNCTIONAL_ROLE_LABELS: Record<FunctionalRole, string> = {
        'BPH': 'BPH',
        'DIREKSI': 'Direksi',
        'MANAJER': 'Manajer',
        'KEPALA URUSAN': 'Ka. Urusan',
        'KEPALA RUANGAN': 'Ka. Ruangan',
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
    const paginatedUsers = sortedUsers.slice(0, visibleCount);

    // Reset to initial batch when search term changes
    useEffect(() => {
        setVisibleCount(ITEMS_PER_BATCH);
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
            <h3 className="text-xl font-bold text-white mb-4">Kelola Peran Fungsional</h3>
            <div className="mb-4 relative max-w-md">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama atau NIP karyawan..."
                    className="w-full bg-white/10 border border-white/20 rounded-md py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                            {FUNCTIONAL_ROLES.map(role => (
                                <th key={role} className="px-4 py-3 text-center whitespace-nowrap">{FUNCTIONAL_ROLE_LABELS[role]}</th>
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

            {/* Load More Pattern */}
            <div className="mt-8 flex flex-col items-center gap-4">
                {visibleCount < sortedUsers.length ? (
                    <button
                        onClick={() => setVisibleCount(prev => prev + ITEMS_PER_BATCH)}
                        className="px-10 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 shadow-lg transition-all transform hover:scale-105 flex items-center gap-3"
                    >
                        <RefreshCw className="w-5 h-5 text-teal-400" />
                        Tampilkan Data Selanjutnya
                    </button>
                ) : sortedUsers.length > 0 && (
                    <p className="text-gray-500 text-sm italic">Semua data telah ditampilkan</p>
                )}

                <p className="text-xs text-gray-500">
                    Menampilkan {paginatedUsers.length} dari {sortedUsers.length} data
                </p>
            </div>

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

// Tab button component for navigation
const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: any }> = ({ active, onClick, label, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 py-3 px-5 rounded-t-lg font-semibold transition-all duration-300 ease-in-out text-base border-b-2 whitespace-nowrap shrink-0
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
    </button>
);

// Sub-tab button component for nested navigation
const SubTabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${active ? 'bg-teal-600 text-white' : 'hover:bg-white/10 text-blue-200'}`}
    >
        {children}
    </button>
);

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
        'owner': { label: 'Owner', className: 'bg-yellow-500/20 text-yellow-300' },
        'super-admin': { label: 'Super Admin', className: 'bg-purple-500/20 text-purple-300' },
        'admin': { label: 'Admin', className: 'bg-blue-500/20 text-blue-300' },
        'user': { label: 'User', className: 'bg-gray-500/20 text-gray-300' },
    };

    const getRoleLabel = (role: Role) => {
        const roleDisplay = getRoleDisplay(role);
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleDisplay.bgColor} ${roleDisplay.color}`}>
                {roleDisplay.label}
            </span>
        );
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Manajemen Peran & Akses Admin</h3>
            <div className="mb-4 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Nama</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">RS ID / BRAND</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Peran Saat Ini</th>
                            <th scope="col" className="px-4 py-3 whitespace-nowrap">Akses Rumah Sakit</th>
                            <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">Aksi Perubahan Peran</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.map((user) => {
                            const isSelf = user.id === loggedInEmployee.id;
                            const loggedInUserIsScopedSuperAdmin = isSuperAdmin(loggedInEmployee) && Array.isArray(loggedInEmployee.managedHospitalIds) && loggedInEmployee.managedHospitalIds.length > 0;
                            const hideManageButtonForSelf = isSelf && loggedInUserIsScopedSuperAdmin;

                            return (
                                <tr key={user.id} className="border-b border-gray-700 hover:bg-white/5">
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {user.name}
                                        <span className="block font-mono text-xs text-gray-400">{user.id}</span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">
                                        {/* 🔥 hospital_id langsung berisi RS ID/BRAND */}
                                        {user.hospitalId || '-'}
                                    </td>
                                    <td className="px-4 py-3">{getRoleLabel(user.role)}</td>
                                    <td className="px-4 py-3">
                                        {isAnyAdmin({ ...user, role: user.role } as any) ? (
                                            <div className="flex items-center gap-2">
                                                <div className="grow">
                                                    {(user.role === 'super-admin') && (!user.managedHospitalIds || user.managedHospitalIds.length === 0) ? (
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
                                                    {/* 🔥 NEW: Use permission-based role assignment */}
                                                    {getAssignableRoles(loggedInEmployee).map((role) => {
                                                        if (user.role === role) return null; // Don't show button for current role

                                                        // Validate if this role change is allowed
                                                        const validationError = validateRoleChange(loggedInEmployee, user, role);
                                                        if (validationError) return null; // Skip if not allowed

                                                        // Button styling based on role
                                                        const buttonStyles = {
                                                            'owner': 'bg-yellow-600 hover:bg-yellow-500 text-white',
                                                            'super-admin': 'bg-purple-600 hover:bg-purple-500 text-white',
                                                            'admin': 'bg-blue-600 hover:bg-blue-500 text-white',
                                                            'user': 'bg-gray-600 hover:bg-gray-500 text-white'
                                                        };

                                                        const labels = {
                                                            'owner': 'Jadikan Owner',
                                                            'super-admin': 'Jadikan Super Admin',
                                                            'admin': 'Jadikan Admin',
                                                            'user': 'Jadikan User'
                                                        };

                                                        return (
                                                            <button
                                                                key={role}
                                                                onClick={() => onInitiateSetRole(user, role)}
                                                                className={`px-3 py-1.5 rounded-md font-semibold text-xs ${buttonStyles[role]} transition-colors`}
                                                            >
                                                                {labels[role]}
                                                            </button>
                                                        );
                                                    })}
                                                    {getAssignableRoles(loggedInEmployee).filter(r => r !== user.role && !validateRoleChange(loggedInEmployee, user, r)).length === 0 && (
                                                        <span className="text-xs text-gray-400 italic">Tidak dapat mengubah peran user ini</span>
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
                <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${currentPage === pageNum
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}

                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                                <span className="text-gray-400 px-2">...</span>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${currentPage === totalPages
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
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
                        className="px-3 py-2 rounded-lg font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Hospital Modal for Add/Edit ---
interface HospitalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Hospital, 'id' | 'isActive'> & { logoFile?: File }, id?: string) => Promise<{ success: boolean, error?: string }>;
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
                logo: logo || null,
                logoFile: logoFile || undefined // 🔥 PASS ACTUAL FILE!
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
                                    <Upload className="w-5 h-5" /> Unggah Logo
                                </button>
                                {logo && (
                                    <button type="button" onClick={() => setLogo(null)} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 font-semibold flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" /> Hapus Logo
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
            {/* Mobile scroll indicator */}
            <div className="sm:hidden text-center text-xs text-blue-200 mb-2 animate-pulse">
                <span>← Geser untuk melihat kolom →</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-white">Manajemen Rumah Sakit</h3>
                <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" />
                    Tambah RS Baru
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/20 -mx-2 sm:mx-0">
                <table className="min-w-[900px] w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[80px]">Logo</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[120px]">Brand (ID)</th>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[200px]">Nama Lengkap</th>
                            <th className="px-4 py-3 min-w-[250px]">Alamat</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap min-w-[100px]">Status</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap min-w-[150px]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedHospitals.map(hospital => (
                            <tr key={hospital.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {hospital.logo ? (
                                        <img src={hospital.logo} alt={`${hospital.brand} logo`} className="h-10 w-10 object-contain rounded-md bg-white p-0.5" />
                                    ) : (
                                        <div className="h-10 w-10 flex items-center justify-center bg-gray-700 rounded-md text-gray-500 text-xs">No Logo</div>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-semibold font-mono whitespace-nowrap">{hospital.id}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{hospital.name}</td>
                                <td className="px-4 py-3 align-top">
                                    <div
                                        className="text-sm leading-relaxed line-clamp-2"
                                        title={hospital.address}
                                    >
                                        {hospital.address}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${hospital.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {hospital.isActive ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleOpenModal(hospital)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 rounded-md">Edit</button>
                                        <button onClick={() => onToggleStatus(hospital)} className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${hospital.isActive ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}>
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
    onSave: (hospitalIds: string[]) => Promise<boolean>;
    user: Employee | null;
    availableHospitals: Hospital[];
}

const ManageAdminAccessModal: React.FC<ManageAdminAccessModalProps> = ({ isOpen, onClose, onSave, user, availableHospitals }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setSelectedIds(new Set(user.managedHospitalIds || []));
            setIsSaving(false);
        }
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const handleToggle = (hospitalId: string) => {
        if (isSaving) return;
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const success = await onSave(Array.from(selectedIds));
            if (success) {
                onClose();
            }
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-teal-400" />
                    Kelola Akses Rumah Sakit
                </h3>
                <p className="text-blue-200 mb-4">Pilih rumah sakit yang dapat dikelola oleh <strong className="text-teal-300">{user.name}</strong>.</p>

                <div className="max-h-[50vh] overflow-y-auto space-y-2 p-2 bg-black/20 rounded-lg custom-scrollbar">
                    {availableHospitals.map(hospital => (
                        <label
                            key={hospital.id}
                            className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedIds.has(hospital.id)
                                ? 'bg-teal-500/20 border-teal-500/50 text-teal-100'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.has(hospital.id)}
                                onChange={() => handleToggle(hospital.id)}
                                disabled={isSaving}
                                className="w-5 h-5 rounded border-gray-500 text-teal-500 focus:ring-teal-500 focus:ring-offset-gray-800 disabled:opacity-50"
                            />
                            <div className="grow">
                                <span className="text-white font-semibold block">{hospital.name}</span>
                                <span className="text-xs opacity-60 block uppercase tracking-wider">{hospital.brand}</span>
                            </div>
                            {selectedIds.has(hospital.id) && <Check className="w-5 h-5 text-teal-400" />}
                        </label>
                    ))}
                    {availableHospitals.length === 0 && <p className="text-center text-gray-400 p-4">Tidak ada rumah sakit yang tersedia untuk dikelola.</p>}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-white transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 font-bold text-gray-900 transition-all flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Menyimpan...
                            </>
                        ) : 'Simpan Akses'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
    /* eslint-disable */
    const {
        allUsersData, loggedInEmployee, onToggleStatus, onSetRole, onAddUser, onUpdateUser,
        onDeleteUser, onBulkUpdateUsers, activities, onAddActivity, onUpdateActivity, onDeleteActivity,
        onAdminUpdateAttendance, sunnahIbadahList, onAddSunnahIbadah, onUpdateSunnahIbadah, onDeleteSunnahIbadah,
        dailyActivitiesConfig, onUpdateDailyActivitiesConfig, jobStructure, onUpdateJobStructure, auditLog, onLogAudit,
        onUpdateProfile, hospitals, onAddHospital, onUpdateHospital, onDeleteHospital, onToggleHospitalStatus,
        mutabaahLockingMode, onUpdateMutabaahLockingMode, onLoadEmployees, onLoadHeavyData, isLoadingEmployees,
        pagination, paginatedEmployees
    } = props;
    /* eslint-enable */

    // 🔥 Load activeView from localStorage to persist across page refreshes
    const [activeView, setActiveView] = useState<AdminView>(() => {
        if (typeof window !== 'undefined') {
            const savedView = localStorage.getItem('adminDashboardActiveView');
            if (savedView && ['manajemen-pengguna', 'manajemen-konten', 'reports', 'manajemen-rs', 'audit-log', 'manajemen-admin'].includes(savedView)) {
                return savedView as AdminView;
            }
        }
        return 'reports'; // Default to Reports tab for first-time visitors
    });

    // 🔥 Save activeView to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('adminDashboardActiveView', activeView);
        }
    }, [activeView]);

    // 🔥 Load employee data on-demand when switching to Manajemen Pengguna or Reports tab
    useEffect(() => {
        if ((activeView === 'manajemen-pengguna' || activeView === 'reports') && onLoadEmployees) {
            const hasEnoughData = Object.keys(allUsersData).length > 1;
            if (!hasEnoughData) {
                onLoadEmployees();
            }
        }
    }, [activeView, allUsersData, onLoadEmployees]);

    // 🔥 NEW: Auto-sync attendance history when entering Reports tab if not already loaded
    useEffect(() => {
        if (activeView === 'reports' && onLoadHeavyData) {
            // Check if we have any attendance history. If not, trigger the heavy sync.
            const hasAnyHistory = Object.values(allUsersData).some(d =>
                (d.history && Object.keys(d.history).length > 0) ||
                (d.attendance && Object.keys(d.attendance).length > 0)
            );

            if (!hasAnyHistory && !isLoadingEmployees) {
                onLoadHeavyData();
            }
        }
    }, [activeView, onLoadHeavyData, allUsersData, isLoadingEmployees]);

    useEffect(() => {
        if (!isSuperAdmin(loggedInEmployee)) {
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
    const [contentManagementSubView, setContentManagementSubView] = useState<ContentManagementSubView>('ibadah-sunnah');
    const [reportSubView, setReportSubView] = useState<'sholat' | 'kegiatan' | 'mutabaah' | 'aktivasi'>('sholat');
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

    const handleUpdateAdminAccess = async (hospitalIds: string[]) => {
        if (!managingAccessFor) return false;
        const success = await onUpdateProfile(managingAccessFor.id, { managedHospitalIds: hospitalIds });

        if (success) {
            onLogAudit({
                adminId: loggedInEmployee.id,
                adminName: loggedInEmployee.name,
                action: 'Perbarui Akses Admin',
                target: `User: ${managingAccessFor.name} (${managingAccessFor.id})`,
                reason: `Mengatur akses ke RS: ${hospitalIds.join(', ') || 'Tidak ada'}`,
            });
            return true;
        }
        return false;
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
                <div className="flex items-center justify-between border-b border-white/20 px-2">
                    <div className="flex items-center gap-2 -mb-px overflow-x-auto min-w-0 pr-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                        <TabButton active={activeView === 'reports'} onClick={() => setActiveView('reports')} label="Laporan" icon={BarChart3} />
                        {isSuperAdmin(loggedInEmployee) && (
                            <TabButton active={activeView === 'manajemen-pengguna'} onClick={() => setActiveView('manajemen-pengguna')} label="Manajemen Pengguna" icon={Users} />
                        )}
                        <TabButton active={activeView === 'manajemen-konten'} onClick={() => setActiveView('manajemen-konten')} label="Konten & Aktivitas" icon={FileText} />
                        {isSuperAdmin(loggedInEmployee) && <TabButton active={activeView === 'manajemen-rs'} onClick={() => setActiveView('manajemen-rs')} label="Manajemen RS" icon={Building2} />}
                    </div>

                    {/* 🔥 Global Refresh Button - Keep only for manually refreshing if needed, but remove 'Sinkronisasi Riwayat' text/emphasis if requested, or just hide for reports if that's the specific request. User said 'Delete Sync History button'. */}
                    {/* User specifically asked to remove the 'Sinkronisasi Riwayat' button and the 'Mode Cepat Aktif' card */}

                    {activeView === 'manajemen-pengguna' && onLoadEmployees && (
                        <button
                            onClick={() => onLoadEmployees?.()}
                            disabled={isLoadingEmployees}
                            title="Refresh Data"
                            className="flex items-center justify-center gap-2 px-4 h-10 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 hover:text-teal-200 rounded-lg transition-all border border-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoadingEmployees ? 'animate-spin' : ''}`} />
                            <span className="text-xs font-bold uppercase hidden sm:inline">Refresh</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                {activeView === 'manajemen-pengguna' && isSuperAdmin(loggedInEmployee) && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-2">
                            <div className="flex items-center gap-2 min-w-max px-1">
                                <SubTabButton active={userManagementSubView === 'database'} onClick={() => setUserManagementSubView('database')}>Database</SubTabButton>
                                <SubTabButton active={userManagementSubView === 'relasi'} onClick={() => setUserManagementSubView('relasi')}>Relasi</SubTabButton>
                                <SubTabButton active={userManagementSubView === 'jabatan'} onClick={() => setUserManagementSubView('jabatan')}>Jabatan</SubTabButton>
                            </div>
                        </div>
                        {userManagementSubView === 'database' && (
                            <DatabaseKaryawan
                                allUsers={allUsers}
                                onInitiateDeleteUser={handleInitiateDeleteUser}
                                onInitiateToggleStatus={handleInitiateToggleStatus}
                                onInitiateSetRole={handleInitiateSetRole}
                                onManageAccess={setManagingAccessFor}
                                onAddUser={onAddUser}
                                onUpdateUser={onUpdateUser}
                                onBulkUpdateUsers={onBulkUpdateUsers}
                                onOpenUserModal={handleOpenUserModal}
                                hospitals={hospitals}
                                pagination={pagination}
                                paginatedEmployees={paginatedEmployees}
                                isLoading={isLoadingEmployees}
                                loggedInEmployee={loggedInEmployee}
                            />
                        )}
                        {userManagementSubView === 'relasi' && (
                            <Suspense fallback={
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                                </div>
                            }>
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
                        <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-2">
                            <div className="flex items-center gap-2 min-w-max px-1">
                                <SubTabButton active={contentManagementSubView === 'ibadah-sunnah'} onClick={() => setContentManagementSubView('ibadah-sunnah')}>Ibadah Sunnah</SubTabButton>
                                <SubTabButton active={contentManagementSubView === 'mutabaah-automation'} onClick={() => setContentManagementSubView('mutabaah-automation')}>Otomatisasi Mutaba&apos;ah</SubTabButton>
                            </div>
                        </div>
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
                        <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-2">
                            <div className="flex items-center gap-2 min-w-max px-1">
                                <SubTabButton active={reportSubView === 'sholat'} onClick={() => setReportSubView('sholat')}>Laporan Sholat</SubTabButton>
                                <SubTabButton active={reportSubView === 'kegiatan'} onClick={() => setReportSubView('kegiatan')}>Laporan Kegiatan</SubTabButton>
                                <SubTabButton active={reportSubView === 'mutabaah'} onClick={() => setReportSubView('mutabaah')}>Laporan Mutaba'ah</SubTabButton>
                                <SubTabButton active={reportSubView === 'aktivasi'} onClick={() => setReportSubView('aktivasi')}>Laporan Aktivasi</SubTabButton>
                            </div>
                        </div>

                        <div className="mt-8">
                            {isLoadingEmployees ? (
                                <div className="flex flex-col items-center justify-center p-20 bg-black/10 rounded-xl">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
                                    <p className="text-teal-200/60 font-medium animate-pulse">Memuat data laporan...</p>
                                </div>
                            ) : (
                                <>
                                    {reportSubView === 'sholat' && (
                                        <AttendanceReport
                                            allUsersData={allUsersData}
                                            activities={activities}
                                            reportType="prayer"
                                            onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }}
                                            loggedInEmployee={loggedInEmployee}
                                            onEditAttendance={setEditingAttendanceRecord}
                                            onDeleteAttendance={handleInitiateDeleteAttendance}
                                            pagination={pagination}
                                            onRefresh={onLoadHeavyData}
                                            isLoading={isLoadingEmployees}
                                        />
                                    )}
                                    {reportSubView === 'kegiatan' && (
                                        <AttendanceReport
                                            allUsersData={allUsersData}
                                            activities={activities}
                                            reportType="activity"
                                            onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }}
                                            loggedInEmployee={loggedInEmployee}
                                            onEditAttendance={setEditingAttendanceRecord}
                                            onDeleteAttendance={handleInitiateDeleteAttendance}
                                            pagination={pagination}
                                            onRefresh={onLoadHeavyData}
                                            isLoading={isLoadingEmployees}
                                        />
                                    )}
                                    {reportSubView === 'mutabaah' && (
                                        <MutabaahReport allUsersData={allUsersData} hospitals={hospitals} onLoadHeavyData={onLoadHeavyData} isLoading={isLoadingEmployees} />
                                    )}
                                    {reportSubView === 'aktivasi' && (
                                        <ActivationReport
                                            allUsersData={allUsersData}
                                            onShowPreview={(uri, name) => { setPdfDataUri(uri); setPdfFileName(name); setIsPdfPreviewOpen(true); }}
                                            loggedInEmployee={loggedInEmployee}
                                        />
                                    )}
                                </>
                            )}

                        </div>
                    </div>
                )}

                {activeView === 'manajemen-rs' && isSuperAdmin(loggedInEmployee) && <HospitalManagement hospitals={hospitals} onAdd={onAddHospital} onUpdate={onUpdateHospital} onDelete={handleInitiateDeleteHospital} onToggleStatus={handleInitiateToggleHospitalStatus} />}
            </div>

            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSave={handleSaveUser}
                existingUser={editingUser}
                hospitals={hospitals}
                loggedInEmployee={loggedInEmployee}
            />
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

export default AdminDashboard;
